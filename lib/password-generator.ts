// Cryptographically secure password + passphrase generation.

export interface GeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

const SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
}

// Characters that are easy to confuse with one another.
const AMBIGUOUS = new Set('Il1O0oB8S5Z2G6'.split(''))

function randomInt(max: number): number {
  // Rejection sampling to avoid modulo bias.
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

export function buildPool(opts: GeneratorOptions): string {
  let pool = ''
  if (opts.uppercase) pool += SETS.uppercase
  if (opts.lowercase) pool += SETS.lowercase
  if (opts.numbers) pool += SETS.numbers
  if (opts.symbols) pool += SETS.symbols
  if (opts.excludeAmbiguous) {
    pool = pool
      .split('')
      .filter((c) => !AMBIGUOUS.has(c))
      .join('')
  }
  return pool
}

export function generatePassword(opts: GeneratorOptions): string {
  const pool = buildPool(opts)
  if (pool.length === 0) return ''
  let out = ''
  for (let i = 0; i < opts.length; i++) {
    out += pool[randomInt(pool.length)]
  }
  return out
}

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  entropyBits: number
}

export function estimateStrength(
  password: string,
  poolSize: number,
): StrengthResult {
  const effectivePool = poolSize > 0 ? poolSize : guessPool(password)
  const entropyBits =
    password.length > 0 ? password.length * Math.log2(effectivePool || 1) : 0

  let score: StrengthResult['score'] = 0
  if (entropyBits >= 120) score = 4
  else if (entropyBits >= 90) score = 3
  else if (entropyBits >= 60) score = 2
  else if (entropyBits >= 35) score = 1

  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']
  return { score, label: labels[score], entropyBits: Math.round(entropyBits) }
}

function guessPool(password: string): number {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 30
  return pool
}
