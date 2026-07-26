'use client'

import { Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/celestial/primitives'
import { SecuritySettings } from '@/components/celestial/settings-security'
import { useTheme, type Theme } from '@/components/celestial/use-theme'
import { useVault } from '@/components/celestial/vault-provider'
import { cn } from '@/lib/utils'

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const { reset } = useVault()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Personalize the app and manage your vault on this device.
      </p>

      <Card className="mt-5 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Appearance</span>
          <span className="text-xs text-muted-foreground">
            Choose a color theme. System follows your device preference.
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Color theme"
          className="mt-4 grid grid-cols-3 gap-2"
        >
          {THEMES.map((t) => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                  active
                    ? 'border-primary bg-secondary text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mt-3">
        <SecuritySettings />
      </div>

      <Card className="mt-3 border-destructive/30 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Danger zone</span>
          <span className="text-xs text-muted-foreground">
            Permanently remove the encrypted vault from this device. Your seed
            phrase is the only way to restore it.
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {confirmReset ? (
            <>
              <Button variant="destructive" size="lg" onClick={reset}>
                <Trash2 /> Confirm delete
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setConfirmReset(true)}
            >
              <Trash2 /> Delete vault
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
