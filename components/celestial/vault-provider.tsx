'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  destroyVault,
  emptyVault,
  loadVault,
  normalizeVault,
  saveVault,
  type VaultData,
  type VaultEntry,
  type VaultSettings,
} from '@/lib/vault-store'
import {
  clearQuickUnlock,
  clearRecoveryCodes,
  clearViewPassword,
  disableBiometric,
  enableBiometric,
  generateRecoveryCodes,
  getSecuritySnapshot,
  hasViewPassword,
  isBiometricSupported,
  removeMasterPassword,
  setMasterPassword,
  setViewPassword,
  unlockWithBiometric,
  unlockWithMaster,
  unlockWithRecoveryCode,
  verifyViewPassword,
  type SecuritySnapshot,
} from '@/lib/device-unlock'

type Status = 'locked' | 'unlocked'
type ViewStatus = 'hidden' | 'visible'

interface Security extends SecuritySnapshot {
  biometricSupported: boolean
}

interface VaultContextValue {
  status: Status
  viewStatus: ViewStatus
  entries: VaultEntry[]
  settings: VaultSettings
  security: Security
  hasQuickUnlock: boolean
  hasViewPassword: boolean
  // Unlock an existing (or brand-new) vault with a seed phrase.
  unlock: (mnemonic: string, data?: VaultData) => Promise<void>
  lock: () => void
  addEntry: (entry: Omit<VaultEntry, 'id' | 'updatedAt'>) => Promise<void>
  updateEntry: (
    id: string,
    entry: Omit<VaultEntry, 'id' | 'updatedAt'>,
  ) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  reset: () => void
  // Settings
  setAutoLockMinutes: (minutes: number) => Promise<void>
  // Security management (requires the vault to be unlocked)
  enableMasterPassword: (password: string) => Promise<void>
  disableMasterPassword: () => void
  enableBiometricUnlock: () => Promise<void>
  disableBiometricUnlock: () => void
  createRecoveryCodes: () => Promise<string[]>
  removeRecoveryCodes: () => void
  // View password (requires vault to be unlocked, controls visibility of entries)
  setViewPassword: (password: string) => Promise<void>
  clearViewPassword: () => Promise<void>
  verifyViewPassword: (password: string) => Promise<boolean>
  hideEntries: () => void
  // Quick unlock (used from the locked screen, no phrase needed)
  quickUnlockMaster: (password: string) => Promise<void>
  quickUnlockBiometric: () => Promise<void>
  quickUnlockRecovery: (code: string) => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

const NO_SECURITY: Security = {
  hasMaster: false,
  hasBiometric: false,
  recoveryRemaining: 0,
  hasAny: false,
  biometricSupported: false,
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('locked')
  const [viewStatus, setViewStatus] = useState<ViewStatus>('visible')
  const [mnemonic, setMnemonic] = useState<string>('')
  const [data, setData] = useState<VaultData>(emptyVault)
  const [security, setSecurity] = useState<Security>(NO_SECURITY)

  const mnemonicRef = useRef('')

  const refreshSecurity = useCallback(() => {
    setSecurity((prev) => ({
      ...getSecuritySnapshot(),
      biometricSupported: prev.biometricSupported,
    }))
  }, [])

  // Detect capabilities and any existing device unlock methods on mount.
  // This runs only on client and sets the actual security state after hydration.
  useEffect(() => {
    let active = true
    isBiometricSupported().then((supported) => {
      if (!active) return
      setSecurity({ ...getSecuritySnapshot(), biometricSupported: supported })
    })
    return () => {
      active = false
    }
  }, [])

  const persist = useCallback(
    async (next: VaultData) => {
      setData(next)
      if (mnemonicRef.current) await saveVault(mnemonicRef.current, next)
    },
    [],
  )

  // Shared unlock path used by both full unlock and quick unlock.
  const openVault = useCallback((phrase: string, loaded: VaultData) => {
    mnemonicRef.current = phrase
    setMnemonic(phrase)
    setData(normalizeVault(loaded))
    setStatus('unlocked')
  }, [])

  const unlock = useCallback(
    async (phrase: string, initial?: VaultData) => {
      const loaded = initial ?? (await loadVault(phrase))
      if (initial) await saveVault(phrase, initial)
      // A fresh full unlock re-establishes device trust — drop any stale
      // quick-unlock secrets that were wrapping a previous phrase.
      clearQuickUnlock()
      refreshSecurity()
      openVault(phrase, loaded)
    },
    [openVault, refreshSecurity],
  )

  const lock = useCallback(() => {
    mnemonicRef.current = ''
    setMnemonic('')
    setData(emptyVault)
    setStatus('locked')
  }, [])

  const addEntry = useCallback(
    async (entry: Omit<VaultEntry, 'id' | 'updatedAt'>) => {
      const newEntry: VaultEntry = {
        ...entry,
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
      }
      await persist({ ...data, entries: [newEntry, ...data.entries] })
    },
    [data, persist],
  )

  const updateEntry = useCallback(
    async (id: string, entry: Omit<VaultEntry, 'id' | 'updatedAt'>) => {
      await persist({
        ...data,
        entries: data.entries.map((e) =>
          e.id === id ? { ...e, ...entry, updatedAt: Date.now() } : e,
        ),
      })
    },
    [data, persist],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      await persist({
        ...data,
        entries: data.entries.filter((e) => e.id !== id),
      })
    },
    [data, persist],
  )

  const reset = useCallback(() => {
    destroyVault()
    clearQuickUnlock()
    refreshSecurity()
    lock()
  }, [lock, refreshSecurity])

  const setAutoLockMinutes = useCallback(
    async (minutes: number) => {
      await persist({
        ...data,
        settings: { ...data.settings, autoLockMinutes: minutes },
      })
    },
    [data, persist],
  )

  // --- Security management -------------------------------------------------

  const enableMasterPassword = useCallback(
    async (password: string) => {
      if (!mnemonicRef.current) throw new Error('Vault is locked.')
      await setMasterPassword(mnemonicRef.current, password)
      refreshSecurity()
    },
    [refreshSecurity],
  )

  const disableMasterPassword = useCallback(() => {
    removeMasterPassword()
    refreshSecurity()
  }, [refreshSecurity])

  const enableBiometricUnlock = useCallback(async () => {
    if (!mnemonicRef.current) throw new Error('Vault is locked.')
    await enableBiometric(mnemonicRef.current)
    refreshSecurity()
  }, [refreshSecurity])

  const disableBiometricUnlock = useCallback(() => {
    disableBiometric()
    refreshSecurity()
  }, [refreshSecurity])

  const createRecoveryCodes = useCallback(async () => {
    if (!mnemonicRef.current) throw new Error('Vault is locked.')
    const codes = await generateRecoveryCodes(mnemonicRef.current)
    refreshSecurity()
    return codes
  }, [refreshSecurity])

  const removeRecoveryCodes = useCallback(() => {
    clearRecoveryCodes()
    refreshSecurity()
  }, [refreshSecurity])

  // --- Quick unlock --------------------------------------------------------

  const quickUnlockMaster = useCallback(
    async (password: string) => {
      const phrase = await unlockWithMaster(password)
      const loaded = await loadVault(phrase)
      refreshSecurity()
      openVault(phrase, loaded)
    },
    [openVault, refreshSecurity],
  )

  const quickUnlockBiometric = useCallback(async () => {
    const phrase = await unlockWithBiometric()
    const loaded = await loadVault(phrase)
    refreshSecurity()
    openVault(phrase, loaded)
  }, [openVault, refreshSecurity])

  const quickUnlockRecovery = useCallback(
    async (code: string) => {
      const phrase = await unlockWithRecoveryCode(code)
      const loaded = await loadVault(phrase)
      refreshSecurity()
      openVault(phrase, loaded)
    },
    [openVault, refreshSecurity],
  )

  // --- Auto-lock on inactivity --------------------------------------------

  const autoLockMinutes = data.settings.autoLockMinutes
  useEffect(() => {
    if (status !== 'unlocked' || !autoLockMinutes) return
    const ms = autoLockMinutes * 60_000
    let timer: ReturnType<typeof setTimeout>

    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(lock, ms)
    }

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))

    const onVisibility = () => {
      if (document.visibilityState === 'visible') arm()
    }
    document.addEventListener('visibilitychange', onVisibility)

    arm()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, autoLockMinutes, lock])

  // View password management
  const setViewPasswordHandler = useCallback(async (password: string) => {
    if (status !== 'unlocked') throw new Error('Vault must be unlocked to set view password')
    await setViewPassword(password)
    refreshSecurity()
  }, [status, refreshSecurity])

  const clearViewPasswordHandler = useCallback(async () => {
    if (status !== 'unlocked') throw new Error('Vault must be unlocked to clear view password')
    await clearViewPassword()
    refreshSecurity()
  }, [status, refreshSecurity])

  const verifyViewPasswordHandler = useCallback(async (password: string) => {
    const valid = await verifyViewPassword(password)
    if (valid) {
      setViewStatus('visible')
    }
    return valid
  }, [])

  const hideEntriesHandler = useCallback(() => {
    if (hasViewPassword()) {
      setViewStatus('hidden')
    }
  }, [])

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      viewStatus,
      entries: data.entries,
      settings: data.settings,
      security,
      hasQuickUnlock: security.hasAny,
      hasViewPassword: hasViewPassword(),
      unlock,
      lock,
      addEntry,
      updateEntry,
      deleteEntry,
      reset,
      setAutoLockMinutes,
      enableMasterPassword,
      disableMasterPassword,
      enableBiometricUnlock,
      disableBiometricUnlock,
      createRecoveryCodes,
      removeRecoveryCodes,
      setViewPassword: setViewPasswordHandler,
      clearViewPassword: clearViewPasswordHandler,
      verifyViewPassword: verifyViewPasswordHandler,
      hideEntries: hideEntriesHandler,
      quickUnlockMaster,
      quickUnlockBiometric,
      quickUnlockRecovery,
    }),
    [
      status,
      viewStatus,
      data.entries,
      data.settings,
      security,
      unlock,
      lock,
      addEntry,
      updateEntry,
      deleteEntry,
      reset,
      setAutoLockMinutes,
      enableMasterPassword,
      disableMasterPassword,
      enableBiometricUnlock,
      disableBiometricUnlock,
      createRecoveryCodes,
      removeRecoveryCodes,
      setViewPasswordHandler,
      clearViewPasswordHandler,
      verifyViewPasswordHandler,
      hideEntriesHandler,
      quickUnlockMaster,
      quickUnlockBiometric,
      quickUnlockRecovery,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
