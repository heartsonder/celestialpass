'use client'

import { Dashboard } from '@/components/celestial/dashboard'
import { Landing } from '@/components/celestial/landing'
import {
  useVault,
  VaultProvider,
} from '@/components/celestial/vault-provider'

function Screen() {
  const { status } = useVault()
  return status === 'unlocked' ? <Dashboard /> : <Landing />
}

export function CelestialPassApp() {
  return (
    <VaultProvider>
      <Screen />
    </VaultProvider>
  )
}
