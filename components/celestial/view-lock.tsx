'use client'

import { Eye, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Input } from '@/components/celestial/primitives'
import { useVault } from '@/components/celestial/vault-provider'

export function ViewLock() {
  const { verifyViewPassword } = useVault()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsChecking(true)

    try {
      const valid = await verifyViewPassword(password)
      if (!valid) {
        setError('Incorrect view password')
        setPassword('')
      }
    } catch (err) {
      setError('Failed to verify password')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <header className="border-b border-border bg-background px-5 py-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-primary" aria-hidden="true" />
          <h1 className="text-base font-semibold">View locked</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Eye className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Enter view password</h2>
          <p className="text-sm text-muted-foreground">
            Your vault contents are locked behind a view password.
          </p>
        </div>

        <Card className="p-4">
          <form onSubmit={handleUnlock} className="space-y-3">
            <div>
              <label htmlFor="view-pw" className="mb-2 block text-xs font-medium">
                View password
              </label>
              <Input
                id="view-pw"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isChecking}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!password || isChecking}
              className="w-full"
            >
              {isChecking ? 'Verifying...' : 'View vault'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
