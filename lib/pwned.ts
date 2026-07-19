// Checks a password against Have I Been Pwned's Pwned Passwords range API using
// k-anonymity: we SHA-1 the password and only send the first 5 hash characters
// to the API. The full password and full hash never leave the browser.

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export interface PwnedResult {
  breached: boolean
  count: number
}

export async function checkPasswordPwned(
  password: string,
): Promise<PwnedResult> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const res = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    { headers: { 'Add-Padding': 'true' } },
  )
  if (!res.ok) {
    throw new Error(`Breach service returned ${res.status}`)
  }
  const body = await res.text()

  for (const line of body.split('\n')) {
    const [lineSuffix, countStr] = line.trim().split(':')
    if (lineSuffix === suffix) {
      const count = Number.parseInt(countStr, 10) || 0
      // Padded entries report a count of 0 and should be treated as safe.
      if (count > 0) return { breached: true, count }
    }
  }
  return { breached: false, count: 0 }
}
