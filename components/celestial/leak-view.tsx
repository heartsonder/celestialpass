'use client'

import {
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/celestial/primitives'
import { estimateStrength } from '@/lib/password-generator'
import { checkPasswordPwned } from '@/lib/pwned'
import { useVault } from '@/components/celestial/vault-provider'

type SingleState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'safe' }
  | { kind: 'breached'; count: number }
  | { kind: 'error'; message: string }

interface AuditRow {
  id: string
  name: string
  breached: boolean
  count: number
  reused: boolean
  weak: boolean
}

export function LeakView() {
  const { entries } = useVault()
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [single, setSingle] = useState<SingleState>({ kind: 'idle' })

  const [auditing, setAuditing] = useState(false)
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)

  async function checkSingle() {
    if (!password) return
    setSingle({ kind: 'loading' })
    try {
      const res = await checkPasswordPwned(password)
      setSingle(
        res.breached
          ? { kind: 'breached', count: res.count }
          : { kind: 'safe' },
      )
    } catch (e) {
      setSingle({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Something went wrong.',
      })
    }
  }

  async function auditVault() {
    setAuditing(true)
    setAuditError(null)
    try {
      const counts = new Map<string, number>()
      for (const e of entries) {
        counts.set(e.password, (counts.get(e.password) ?? 0) + 1)
      }
      const results: AuditRow[] = []
      for (const e of entries) {
        const pwned = e.password
          ? await checkPasswordPwned(e.password)
          : { breached: false, count: 0 }
        results.push({
          id: e.id,
          name: e.name || e.url || 'Untitled',
          breached: pwned.breached,
          count: pwned.count,
          reused: (counts.get(e.password) ?? 0) > 1,
          weak: estimateStrength(e.password, 0).score <= 1,
        })
      }
      setRows(results)
    } catch (e) {
      setAuditError(
        e instanceof Error ? e.message : 'Could not complete the scan.',
      )
    } finally {
      setAuditing(false)
    }
  }

  const issues = rows?.filter((r) => r.breached || r.reused || r.weak) ?? []

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">Data leak check</h1>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        Passwords are checked against the Have I Been Pwned database using
        k-anonymity — only the first 5 characters of a hash are ever sent, never
        your password.
      </p>

      <Card className="mt-5 p-4">
        <Field label="Check a password" htmlFor="pw">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="pw"
                type={reveal ? 'text' : 'password'}
                value={password}
                placeholder="Enter a password to check"
                autoComplete="off"
                className="pr-10 font-mono"
                onChange={(e) => {
                  setPassword(e.target.value)
                  setSingle({ kind: 'idle' })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                    checkSingle()
                }}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {reveal ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <Button
              size="lg"
              onClick={checkSingle}
              disabled={!password || single.kind === 'loading'}
            >
              {single.kind === 'loading' ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Check
            </Button>
          </div>
        </Field>

        {single.kind === 'safe' ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            <span>
              Good news — this password wasn&apos;t found in any known breach.
            </span>
          </div>
        ) : null}
        {single.kind === 'breached' ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <ShieldAlert className="size-4 text-destructive" />
            <span>
              This password appeared in{' '}
              <span className="font-semibold">
                {single.count.toLocaleString()}
              </span>{' '}
              breaches. Do not use it.
            </span>
          </div>
        ) : null}
        {single.kind === 'error' ? (
          <p className="mt-3 text-sm text-destructive">{single.message}</p>
        ) : null}
      </Card>

      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Vault security audit</h2>
            <p className="text-sm text-muted-foreground">
              Scan every saved password for breaches, reuse, and weakness.
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={auditVault}
            disabled={auditing || entries.length === 0}
          >
            {auditing ? <Loader2 className="animate-spin" /> : null}
            {auditing ? 'Scanning…' : 'Scan vault'}
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Add some logins to your vault to run an audit.
          </p>
        ) : null}

        {auditError ? (
          <p className="mt-3 text-sm text-destructive">{auditError}</p>
        ) : null}

        {rows ? (
          issues.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              <span>
                All {rows.length} passwords passed. No breaches, reuse, or weak
                entries found.
              </span>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {issues.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 bg-background/40 px-3 py-2.5"
                >
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {r.breached ? (
                      <Badge tone="danger">
                        Breached ×{r.count.toLocaleString()}
                      </Badge>
                    ) : null}
                    {r.reused ? <Badge tone="warn">Reused</Badge> : null}
                    {r.weak ? <Badge tone="warn">Weak</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Card>
    </div>
  )
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'danger' | 'warn'
}) {
  return (
    <span
      className={
        tone === 'danger'
          ? 'rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'
          : 'rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground'
      }
    >
      {children}
    </span>
  )
}
