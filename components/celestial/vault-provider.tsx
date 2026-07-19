'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  destroyVault,
  emptyVault,
  loadVault,
  saveVault,
  type VaultData,
  type VaultEntry,
} from '@/lib/vault-store'

type Status = 'locked' | 'unlocked'

interface VaultContextValue {
  status: Status
  entries: VaultEntry[]
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
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('locked')
  const [mnemonic, setMnemonic] = useState<string>('')
  const [data, setData] = useState<VaultData>(emptyVault)

  const persist = useCallback(
    async (next: VaultData) => {
      setData(next)
      if (mnemonic) await saveVault(mnemonic, next)
    },
    [mnemonic],
  )

  const unlock = useCallback(
    async (phrase: string, initial?: VaultData) => {
      const loaded = initial ?? (await loadVault(phrase))
      setMnemonic(phrase)
      setData(loaded)
      if (initial) await saveVault(phrase, initial)
      setStatus('unlocked')
    },
    [],
  )

  const lock = useCallback(() => {
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
    lock()
  }, [lock])

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      entries: data.entries,
      unlock,
      lock,
      addEntry,
      updateEntry,
      deleteEntry,
      reset,
    }),
    [status, data.entries, unlock, lock, addEntry, updateEntry, deleteEntry, reset],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
