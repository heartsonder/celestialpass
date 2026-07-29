'use client'

import { Eye, EyeOff, Fingerprint, KeyRound, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/celestial/primitives'
import { ShieldLogo, Wordmark } from '@/components/celestial/logo'
import { useVault } from '@/components/celestial/vault-provider'

export function QuickUnlock({
  onUseRecoveryPhrase,
}: {
  onUseRecoveryPhrase: () => void
}) {
  const {
    security,
    quickUnlockMaster,
    quickUnlockBiometric,
    quickUnlockRecovery,
  } = useVault()

  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canBiometric = security.biometricSupported && security.hasBiometric

  async function run(fn: () => Promise<void>, fallback: string) {
    setError(null)
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : fallback)
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Wordmark />
        <span className="text-xs text-muted-foreground">
          Local · Encrypted · Open
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldLogo className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            This device is trusted. Unlock your vault with a quick method below.
          </p>
        </div>

        <Card className="p-4">
          {canBiometric ? (
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(
                  quickUnlockBiometric,
                  'Biometric authentication failed. Try again.',
                )
              }
            >
              <Fingerprint /> Unlock with biometrics
            </Button>
          ) : null}

          {canBiometric && security.hasMaster ? (
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground/70">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          {security.hasMaster ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!password) return
                run(
                  () => quickUnlockMaster(password),
                  'Incorrect master password.',
                )
              }}
            >
              <label
                htmlFor="master"
                className="text-xs font-medium text-muted-foreground"
              >
                Master password
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
                <Lock className="size-4 shrink-0 text-muted-foreground" />
                <input
                  id="master"
                  type={reveal ? 'text' : 'password'}
                  value={password}
                  autoFocus={!canBiometric}
                  onChange={(e) => {
                    setError(null)
                    setPassword(e.target.value)
                  }}
                  autoComplete="current-password"
                  className="h-10 w-full bg-transparent text-sm outline-none"
                  placeholder="Enter master password"
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                >
                  {reveal ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <Button
                type="submit"
                className="mt-3 w-full"
                size="lg"
                disabled={busy || !password}
              >
                {busy ? 'Unlocking…' : 'Unlock'}
              </Button>
            </form>
          ) : null}

          {security.recoveryRemaining > 0 ? (
            showCode ? (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!code.trim()) return
                  run(
                    () => quickUnlockRecovery(code),
                    'That recovery code is not valid.',
                  )
                }}
              >
                <label
                  htmlFor="code"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Recovery code
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => {
                    setError(null)
                    setCode(e.target.value)
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="xxxxx-xxxxx"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/25"
                />
                <Button
                  type="submit"
                  className="mt-3 w-full"
                  size="lg"
                  variant="outline"
                  disabled={busy || !code.trim()}
                >
                  Use recovery code
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowCode(true)
                  setError(null)
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <KeyRound className="size-4" /> Use a recovery code
              </button>
            )
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </Card>

        <button
          type="button"
          onClick={onUseRecoveryPhrase}
          className="mx-auto mt-5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Use recovery phrase instead
        </button>
      </main>
    </div>
  )
}
