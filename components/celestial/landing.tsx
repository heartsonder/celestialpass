'use client'

import {
  DownloadCloud,
  KeyRound,
  Plus,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/celestial/primitives'
import { CreateVaultFlow } from '@/components/celestial/create-vault-flow'
import { ImportVaultFlow } from '@/components/celestial/import-vault-flow'
import { ShieldLogo, Wordmark } from '@/components/celestial/logo'

type Screen = 'home' | 'create' | 'import'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Zero-knowledge by design',
    body: 'Your vault is encrypted on your device. Nothing is ever sent to a server.',
  },
  {
    icon: KeyRound,
    title: 'Strong password generator',
    body: 'Cryptographically secure passwords with full control over length and characters.',
  },
  {
    icon: ScanLine,
    title: 'Breach monitoring',
    body: 'Check passwords against known data breaches without exposing them.',
  },
]

export function Landing() {
  const [screen, setScreen] = useState<Screen>('home')

  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Wordmark />
        <span className="text-xs text-muted-foreground">
          Local · Encrypted · Open
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-10">
        {screen === 'create' ? (
          <CreateVaultFlow onBack={() => setScreen('home')} />
        ) : screen === 'import' ? (
          <ImportVaultFlow onBack={() => setScreen('home')} />
        ) : (
          <div className="grid w-full items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <ShieldLogo className="size-3.5" />
                Your keys. Your vault.
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Passwords that never leave your device.
              </h1>
              <p className="mt-4 max-w-md text-base text-muted-foreground text-pretty leading-relaxed">
                CelestialPass encrypts your vault locally with a 24-word
                recovery phrase. No accounts, no cloud, no compromise.
              </p>

              <dl className="mt-8 space-y-4">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <f.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <dt className="text-sm font-medium">{f.title}</dt>
                      <dd className="text-sm text-muted-foreground text-pretty">
                        {f.body}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setScreen('create')}
                className="group text-left outline-none"
              >
                <Card className="p-5 transition-colors hover:border-ring/60 group-focus-visible:border-ring">
                  <div className="flex items-center gap-4">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Plus className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">
                        Create new vault
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Generate a fresh 24-word recovery phrase.
                      </p>
                    </div>
                  </div>
                </Card>
              </button>

              <button
                onClick={() => setScreen('import')}
                className="group text-left outline-none"
              >
                <Card className="p-5 transition-colors hover:border-ring/60 group-focus-visible:border-ring">
                  <div className="flex items-center gap-4">
                    <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
                      <DownloadCloud className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">Import vault</h2>
                      <p className="text-sm text-muted-foreground">
                        Restore access with your recovery phrase.
                      </p>
                    </div>
                  </div>
                </Card>
              </button>

              <p className="mt-1 px-1 text-xs text-muted-foreground/70 text-pretty">
                Your recovery phrase is the only way to unlock your vault. Keep
                it secret and offline — it cannot be reset.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
