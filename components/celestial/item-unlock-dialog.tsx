'use client'

import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/celestial/primitives'

interface ItemUnlockDialogProps {
  itemName: string
  onUnlock: (password: string) => void
  onCancel: () => void
}

export function ItemUnlockDialog({
  itemName,
  onUnlock,
  onCancel,
}: ItemUnlockDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!password) {
      setError('Please enter the password')
      return
    }
    onUnlock(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Item Protected</h2>
            <p className="text-sm text-muted-foreground">
              {itemName} is protected by a password
            </p>
          </div>
        </div>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && password) {
              handleSubmit()
            }
          }}
          className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!password}
            className="flex-1"
          >
            Unlock
          </Button>
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}
