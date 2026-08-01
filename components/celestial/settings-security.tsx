'use client'

import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  TimerReset,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/celestial/primitives'
import { copyToClipboard } from '@/lib/clipboard'
import { useVault } from '@/components/celestial/vault-provider'
import { cn } from '@/lib/utils'

const AUTO_LOCK_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Never' },
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
]

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Lock
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground text-pretty">
          {description}
        </span>
      </div>
    </div>
  )
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        enabled
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-secondary text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          enabled ? 'bg-primary' : 'bg-muted-foreground/50',
        )}
      />
      {enabled ? 'Enabled' : 'Off'}
    </span>
  )
}

function AutoLockSection() {
  const { settings, setAutoLockMinutes } = useVault()
  return (
    <Card className="p-4">
      <SectionHeader
        icon={TimerReset}
        title="Auto-lock"
        description="Automatically lock the vault after a period of inactivity."
      />
      <div
        role="radiogroup"
        aria-label="Auto-lock timer"
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {AUTO_LOCK_OPTIONS.map((opt) => {
          const active = settings.autoLockMinutes === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAutoLockMinutes(opt.value)}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                active
                  ? 'border-primary bg-secondary text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function MasterPasswordSection() {
  const { security, enableMasterPassword, disableMasterPassword } = useVault()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await enableMasterPassword(password)
      setOpen(false)
      setPassword('')
      setConfirm('')
      setError(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          icon={Lock}
          title="Master password"
          description="Re-open your vault on this device with a password instead of the full recovery phrase."
        />
        <StatusPill enabled={security.hasMaster} />
      </div>

      <div className="mt-4">
        {security.hasMaster ? (
          <Button
            variant="outline"
            size="lg"
            onClick={disableMasterPassword}
          >
            Remove master password
          </Button>
        ) : open ? (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setError(null)
                setPassword(e.target.value)
              }}
              autoComplete="new-password"
              placeholder="New master password"
              className="h-10 w-full rounded-lg border border-border bg-background/60 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/25"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setError(null)
                setConfirm(e.target.value)
              }}
              autoComplete="new-password"
              placeholder="Confirm master password"
              className="h-10 w-full rounded-lg border border-border bg-background/60 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/25"
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <Button size="lg" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save password'}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setOpen(false)
                  setPassword('')
                  setConfirm('')
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
            Set master password
          </Button>
        )}
      </div>
    </Card>
  )
}

function PasskeySection() {
  const { security, enablePasskeyUnlock, disablePasskeyUnlock } = useVault()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function enable() {
    setError(null)
    setBusy(true)
    try {
      await enablePasskeyUnlock()
      setBusy(false)
      setError(null)
    } catch {
      setError(
        security.hasPasskey
          ? 'Could not remove passkey.'
          : 'Could not set up passkey.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          icon={Fingerprint}
          title="Passkey unlock"
          description="Use your device&apos;s passkey to quickly unlock your vault."
        />
        <StatusPill enabled={security.hasPasskey} />
      </div>
      <div>
        {!security.passkeySupported ? (
          <p className="text-xs text-muted-foreground">
            Passkey unlock isn&apos;t available on this device or browser.
          </p>
        ) : security.hasPasskey ? (
          <Button variant="outline" size="lg" onClick={disablePasskeyUnlock}>
            Remove passkey unlock
          </Button>
        ) : (
          <Button
            onClick={enable}
            disabled={busy}
            className="gap-2"
          >
            <Fingerprint /> {busy ? 'Waiting for device…' : 'Enable passkey'}
          </Button>
        )}
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </Card>
  )
}

function RecoveryCodesSection() {
  const { security, createRecoveryCodes, removeRecoveryCodes } = useVault()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    try {
      const next = await createRecoveryCodes()
      setCodes(next)
    } finally {
      setBusy(false)
    }
  }

  async function copyAll() {
    if (!codes) return
    const ok = await copyToClipboard(codes.join('\n'))
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    if (!codes) return
    const blob = new Blob(
      [
        `CelestialPass recovery codes\nEach code works once to unlock this device.\n\n${codes.join(
          '\n',
        )}\n`,
      ],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'celestialpass-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          icon={KeyRound}
          title="Recovery codes"
          description="Single-use backup codes to unlock this device if you can't use your other methods."
        />
        {security.recoveryRemaining > 0 ? (
          <span className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {security.recoveryRemaining} left
          </span>
        ) : null}
      </div>

      {codes ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground text-pretty">
            Save these now — they won&apos;t be shown again. Each code works
            once.
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {codes.map((code) => (
              <li
                key={code}
                className="rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-center font-mono text-sm tracking-wide"
              >
                {code}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={copyAll}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button variant="outline" size="lg" onClick={download}>
              <Download /> Download
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setCodes(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="lg" onClick={generate} disabled={busy}>
            {security.recoveryRemaining > 0 ? <RefreshCw /> : <KeyRound />}
            {busy
              ? 'Generating…'
              : security.recoveryRemaining > 0
                ? 'Regenerate codes'
                : 'Generate codes'}
          </Button>
          {security.recoveryRemaining > 0 ? (
            <Button variant="ghost" size="lg" onClick={removeRecoveryCodes}>
              Remove
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  )
}

function ViewPasswordSection() {
  const { hasViewPassword, setViewPassword, clearViewPassword } = useVault()
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSetPassword = async () => {
    setError('')
    if (!password) {
      setError('Password cannot be empty')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsSaving(true)
    try {
      await setViewPassword(password)
      setPassword('')
      setConfirm('')
      setIsOpen(false)
    } catch {
      setError('Failed to set view password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsSaving(true)
    try {
      await clearViewPassword()
    } catch {
      setError('Failed to remove view password')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen && !hasViewPassword) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <SectionHeader
            icon={Eye}
            title="View password"
            description="Protect your vault contents with an additional password."
          />
          <Button variant="ghost" size="lg" onClick={() => setIsOpen(true)}>
            Set up
          </Button>
        </div>
      </Card>
    )
  }

  if (!isOpen && hasViewPassword) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <SectionHeader
            icon={Eye}
            title="View password"
            description="Vault contents are protected by a view password."
          />
          <div className="flex gap-2">
            <StatusPill enabled={true} />
            <Button
              variant="ghost"
              size="lg"
              onClick={handleRemove}
              disabled={isSaving}
            >
              Remove
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between">
        <SectionHeader
          icon={Eye}
          title="Set view password"
          description="Enter a password to protect your vault contents."
        />
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            setIsOpen(false)
            setPassword('')
            setConfirm('')
            setError('')
          }}
          disabled={isSaving}
        >
          <EyeOff className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="vp-pwd" className="mb-1 block text-xs font-medium">
            Password
          </label>
          <input
            id="vp-pwd"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="vp-confirm" className="mb-1 block text-xs font-medium">
            Confirm password
          </label>
          <input
            id="vp-confirm"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSetPassword}
            disabled={!password || !confirm || isSaving}
            className="flex-1"
          >
            {isSaving ? 'Setting...' : 'Set password'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIsOpen(false)
              setPassword('')
              setConfirm('')
              setError('')
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function SecuritySettings() {
  return (
    <div className="flex flex-col gap-3">
      <div className="mt-2 flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">
          Security &amp; unlock
        </h2>
      </div>
      <AutoLockSection />
      <MasterPasswordSection />
      <PasskeySection />
      <RecoveryCodesSection />
      <ViewPasswordSection />
    </div>
  )
}
