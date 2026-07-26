'use client'

import { useState } from 'react'
import { Dashboard } from '@/components/celestial/dashboard'
import { Landing } from '@/components/celestial/landing'
import { QuickUnlock } from '@/components/celestial/quick-unlock'
import {
  useVault,
  VaultProvider,
} from '@/components/celestial/vault-provider'

function Screen() {
  const { status, hasQuickUnlock } = useVault()
  const [useFullUnlock, setUseFullUnlock] = useState(false)

  if (status === 'unlocked') return <Dashboard />
  if (hasQuickUnlock && !useFullUnlock) {
    return <QuickUnlock onUseRecoveryPhrase={() => setUseFullUnlock(true)} />
  }
  return <Landing />
}

export function CelestialPassApp() {
  return (
    <VaultProvider>
      <Screen />
    </VaultProvider>
  )
}
