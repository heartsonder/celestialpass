// Persistence layer for the encrypted vault. We only ever write the encrypted
// blob to localStorage — the decrypted contents live in memory while unlocked.
import {
  decryptJSON,
  encryptJSON,
  type EncryptedPayload,
} from '@/lib/crypto'

const STORAGE_KEY = 'celestialpass.vault'

export type VaultItemType = 'login' | 'card' | 'note' | 'identity' | 'file'

export interface VaultEntry {
  id: string
  type: VaultItemType
  name: string
  username: string
  password: string
  url: string
  notes: string
  updatedAt: number
}

export interface VaultData {
  entries: VaultEntry[]
}

export const emptyVault: VaultData = { entries: [] }

export function hasStoredVault(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null
}

export function readEncryptedVault(): EncryptedPayload | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as EncryptedPayload
  } catch {
    return null
  }
}

export async function saveVault(
  mnemonic: string,
  data: VaultData,
): Promise<void> {
  const payload = await encryptJSON(mnemonic, data)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function loadVault(mnemonic: string): Promise<VaultData> {
  const payload = readEncryptedVault()
  if (!payload) return emptyVault
  return decryptJSON<VaultData>(mnemonic, payload)
}

export function destroyVault(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
