'use client'

import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { loadVault } from '@/lib/vault-store'
import { useVault } from '@/components/celestial/vault-provider'

const EMPTY = Array.from({ length: 24 }, () => '')

export function ImportVaultFlow({ onBack }: { onBack: () => void }) {
  const { unlock } = useVault()
  const [values, setValues] = useState<string[]>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function setWord(index: number, value: string) {
    setError(null)
    setValues((prev) => {
      const next = [...prev]
      next[index] = value.trim().toLowerCase()
      return next
    })
  }

  function handlePaste(index: number, e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').trim()
    const parts = text.split(/[\s,]+/).filter(Boolean)
    if (parts.length <= 1) return
    e.preventDefault()
    setError(null)
    setValues((prev) => {
      const next = [...prev]
      for (let i = 0; i < parts.length && index + i < 24; i++) {
        next[index + i] = parts[i].trim().toLowerCase()
      }
      return next
    })
  }

  async function submit() {
    const phrase = values.map((v) => v.trim()).join(' ').trim()
    if (values.some((v) => !v)) {
      setError('Please fill in all 24 words.')
      return
    }
    if (!validateMnemonic(phrase, wordlist)) {
      setError('That recovery phrase is not valid. Check the words and order.')
      return
    }
    setBusy(true)
    try {
      // Decrypting with the wrong phrase throws — surface it as an error.
      const data = await loadVault(phrase)
      await unlock(phrase, data)
    } catch {
      setError(
        "This recovery phrase doesn't match the vault stored on this device.",
      )
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="text-xl font-semibold tracking-tight text-balance">
        Import your vault
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        Enter your 24-word recovery phrase to unlock your vault. You can paste
        the whole phrase into the first field.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {values.map((value, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25"
          >
            <span className="w-5 text-right text-xs tabular-nums text-muted-foreground/60">
              {i + 1}
            </span>
            <input
              value={value}
              onChange={(e) => setWord(i, e.target.value)}
              onPaste={(e) => handlePaste(i, e)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Word ${i + 1}`}
              className="h-9 w-full bg-transparent font-mono text-sm outline-none"
            />
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setValues(EMPTY)}
          disabled={busy}
        >
          Clear
        </Button>
        <Button className="flex-1" size="lg" onClick={submit} disabled={busy}>
          {busy ? 'Unlocking…' : 'Unlock vault'}
        </Button>
      </div>
    </div>
  )
}
