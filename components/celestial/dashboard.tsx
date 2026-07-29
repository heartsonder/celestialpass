'use client'

import { Heart, KeyRound, Lock, ScanLine, Settings, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GeneratorView } from '@/components/celestial/generator-view'
import { LeakView } from '@/components/celestial/leak-view'
import { Wordmark } from '@/components/celestial/logo'
import { PasswordsView } from '@/components/celestial/passwords-view'
import { SettingsView } from '@/components/celestial/settings-view'
import { useVault } from '@/components/celestial/vault-provider'

type Tab = 'vault' | 'generator' | 'leak' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'vault', label: 'Vault', icon: Wallet },
  { id: 'generator', label: 'Generator', icon: KeyRound },
  { id: 'leak', label: 'Data leak', icon: ScanLine },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Dashboard() {
  const { lock } = useVault()
  const [tab, setTab] = useState<Tab>('vault')

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <Wordmark />
          <div className="flex items-center gap-1">
            <nav className="mr-2 hidden items-center gap-1 sm:flex">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === t.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </nav>
            <Button
              variant="ghost"
              size="lg"
              render={
                <a
                  href="https://nowpayments.io/donation/celestialpass"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Heart /> Donate
            </Button>
            <Button variant="outline" size="lg" onClick={lock}>
              <Lock /> Lock
            </Button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <nav className="flex items-center gap-1 border-t border-border px-3 py-2 sm:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        {tab === 'vault' ? <PasswordsView /> : null}
        {tab === 'generator' ? <GeneratorView /> : null}
        {tab === 'leak' ? <LeakView /> : null}
        {tab === 'settings' ? <SettingsView /> : null}
      </main>
    </div>
  )
}
