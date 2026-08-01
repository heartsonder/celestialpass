// Device-local "quick unlock" layer.
//
// The vault itself is only ever unlockable with the 24-word recovery phrase.
// Quick unlock lets a device that has ALREADY opened the vault re-open it
// without retyping the whole phrase, by storing the recovery phrase wrapped
// (re-encrypted) under a second factor that lives only on this device:
//   - a master password (PBKDF2 + AES-GCM, same primitives as the vault)
//   - single-use recovery codes
//   - a platform passkey credential (WebAuthn PRF), when supported
//
// None of these secrets ever leave the device, and the wrapped phrase is
// useless without the corresponding factor.

import { decryptJSON, encryptJSON, type EncryptedPayload } from '@/lib/crypto'

const STORAGE_KEY = 'celestialpass.quickunlock'
const enc = new TextEncoder()

interface PasskeyWrap {
  credentialId: string // base64url
  prfSalt: string // base64, PRF eval input
  payload: EncryptedPayload // phrase encrypted with the PRF-derived secret
}

interface RecoveryEntry {
  hash: string // sha-256 of the normalized code
  payload: EncryptedPayload // phrase encrypted with the code
}

interface QuickUnlockData {
  master?: EncryptedPayload
  passkey?: PasskeyWrap
  recovery?: RecoveryEntry[]
}

interface ViewPasswordData {
  hash: string // PBKDF2 hash of the view password
}

// ---------------------------------------------------------------- storage ---

function read(): QuickUnlockData {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as QuickUnlockData
  } catch {
    return {}
  }
}

function write(data: QuickUnlockData): void {
  if (typeof window === 'undefined') return
  const isEmpty = !data.master && !data.passkey && !data.recovery?.length
  if (isEmpty) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearQuickUnlock(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export interface SecuritySnapshot {
  hasMaster: boolean
  hasPasskey: boolean
  recoveryRemaining: number
  hasAny: boolean
}

export function getSecuritySnapshot(): SecuritySnapshot {
  const data = read()
  const recoveryRemaining = data.recovery?.length ?? 0
  const hasMaster = !!data.master
  const hasPasskey = !!data.passkey
  return {
    hasMaster,
    hasPasskey,
    recoveryRemaining,
    hasAny: hasMaster || hasPasskey || recoveryRemaining > 0,
  }
}

// ------------------------------------------------------------------ utils ---

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value))
  return toBase64(new Uint8Array(digest))
}

// ------------------------------------------------------- master password ---

export async function setMasterPassword(
  mnemonic: string,
  password: string,
): Promise<void> {
  const payload = await encryptJSON(password, mnemonic)
  write({ ...read(), master: payload })
}

export function removeMasterPassword(): void {
  const data = read()
  delete data.master
  write(data)
}

export async function unlockWithMaster(password: string): Promise<string> {
  const { master } = read()
  if (!master) throw new Error('No master password set on this device.')
  // Throws if the password is wrong (AES-GCM auth tag mismatch).
  return decryptJSON<string>(password, master)
}

// -------------------------------------------------------- recovery codes ---

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`.toUpperCase()
}

function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, '').toLowerCase()
}

// Generates a fresh set of single-use codes, replacing any existing ones.
// Returns the plaintext codes so the caller can show them exactly once.
export async function generateRecoveryCodes(
  mnemonic: string,
  count = 10,
): Promise<string[]> {
  const codes: string[] = []
  const entries: RecoveryEntry[] = []
  for (let i = 0; i < count; i++) {
    const code = randomCode()
    codes.push(code)
    const normalized = normalizeCode(code)
    entries.push({
      hash: await sha256(normalized),
      payload: await encryptJSON(normalized, mnemonic),
    })
  }
  write({ ...read(), recovery: entries })
  return codes
}

export function clearRecoveryCodes(): void {
  const data = read()
  delete data.recovery
  write(data)
}

// Consumes a matching code (single use) and returns the recovery phrase.
export async function unlockWithRecoveryCode(code: string): Promise<string> {
  const data = read()
  const entries = data.recovery ?? []
  const normalized = normalizeCode(code)
  const hash = await sha256(normalized)
  const match = entries.find((e) => e.hash === hash)
  if (!match) throw new Error('That recovery code is not valid.')
  const mnemonic = await decryptJSON<string>(normalized, match.payload)
  data.recovery = entries.filter((e) => e.hash !== hash)
  write(data)
  return mnemonic
}

// -------------------------------------------------------------- passkeys ---

const PRF_SALT = 'celestialpass.prf.v1'

export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

function prfEval(): { first: BufferSource } {
  return { first: enc.encode(PRF_SALT) as BufferSource }
}

// Registers a platform credential and derives a stable secret from the WebAuthn
// PRF extension, then wraps the recovery phrase under that secret.
export async function enablePasskey(mnemonic: string): Promise<void> {
  const userId = crypto.getRandomValues(new Uint8Array(16))
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge as BufferSource,
      rp: { name: 'CelestialPass' },
      user: {
        id: userId as BufferSource,
        name: 'celestialpass-device',
        displayName: 'CelestialPass device',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      timeout: 60_000,
      extensions: { prf: { eval: prfEval() } },
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Passkey setup was cancelled.')

  const credentialId = toBase64(new Uint8Array(credential.rawId))

  // Some platforms return the PRF output on create; if not, fetch it with a
  // follow-up assertion so we always have a secret to wrap the phrase with.
  let secret = extractPrf(credential)
  if (!secret) secret = await assertPrf(credentialId)
  if (!secret) {
    throw new Error('This device did not return a passkey (PRF).')
  }

  const payload = await encryptJSON(secret, mnemonic)
  write({
    ...read(),
    passkey: { credentialId, prfSalt: PRF_SALT, payload },
  })
}

export function disablePasskey(): void {
  const data = read()
  delete data.passkey
  write(data)
}

export async function unlockWithPasskey(): Promise<string> {
  const { passkey } = read()
  if (!passkey) throw new Error('Passkey unlock is not set up.')
  const secret = await assertPrf(passkey.credentialId)
  if (!secret) throw new Error('Passkey authentication failed.')
  return decryptJSON<string>(secret, passkey.payload)
}

function extractPrf(credential: PublicKeyCredential): string | null {
  const results = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } }
  }
  const first = results.prf?.results?.first
  return first ? toBase64(new Uint8Array(first)) : null
}

async function assertPrf(credentialIdB64: string): Promise<string | null> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const rawId = Uint8Array.from(atob(credentialIdB64), (c) => c.charCodeAt(0))
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge as BufferSource,
      allowCredentials: [{ type: 'public-key', id: rawId as BufferSource }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: prfEval() } },
    },
  })) as PublicKeyCredential | null
  if (!assertion) return null
  return extractPrf(assertion)
}

// ----------------------------------------------------------------- view pw ---

const VIEW_PASSWORD_STORAGE_KEY = 'celestialpass.viewpassword'

function readViewPassword(): ViewPasswordData | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(VIEW_PASSWORD_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ViewPasswordData
  } catch {
    return null
  }
}

function writeViewPassword(data: ViewPasswordData | null): void {
  if (typeof window === 'undefined') return
  if (!data) {
    window.localStorage.removeItem(VIEW_PASSWORD_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(VIEW_PASSWORD_STORAGE_KEY, JSON.stringify(data))
}

async function hashPassword(password: string): Promise<string> {
  // Use PBKDF2 with 100k iterations, same as master password
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('view-salt'), iterations: 100_000, hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  return toBase64(new Uint8Array(exported))
}

export async function setViewPassword(password: string): Promise<void> {
  if (!password) throw new Error('View password cannot be empty.')
  const hash = await hashPassword(password)
  writeViewPassword({ hash })
}

export async function clearViewPassword(): Promise<void> {
  writeViewPassword(null)
}

export async function verifyViewPassword(password: string): Promise<boolean> {
  const stored = readViewPassword()
  if (!stored) return true // No view password set, allow access
  const hash = await hashPassword(password)
  return hash === stored.hash
}

export function hasViewPassword(): boolean {
  return readViewPassword() !== null
}
