'use client'

import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/celestial/primitives'
import { emptyVault } from '@/lib/vault-store'
import { useVault } from '@/components/celestial/vault-provider'

export function CreateVaultFlow({ onBack }: { onBack: () => void }) {
  const { unlock } = useVault()
  const [mnemonic] = useState(() => generateMnemonic(wordlist, 256))
  const [revealed, setRevealed] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const words = useMemo(() => mnemonic.split(' '), [mnemonic])

  async function copy() {
    await navigator.clipboard.writeText(mnemonic)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    const blob = new Blob(
      [
        `CelestialPass recovery phrase\nKeep this secret and offline.\n\n${words
          .map((w, i) => `${i + 1}. ${w}`)
          .join('\n')}\n`,
      ],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'celestialpass-recovery-phrase.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function enter() {
    setBusy(true)
    await unlock(mnemonic, emptyVault)
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
        Your recovery phrase
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        These 24 words are the only key to your vault. Write them down in order
        and store them offline. Anyone with this phrase can unlock your vault,
        and losing it means losing access forever.
      </p>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <span className="text-muted-foreground">
          CelestialPass is zero-knowledge. We never see or store your phrase, so
          it cannot be recovered or reset.
        </span>
      </div>

      <Card className="relative mt-5 p-4">
        <div
          className={
            revealed ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'blur-sm select-none grid grid-cols-2 gap-2 sm:grid-cols-3'
          }
          aria-hidden={!revealed}
        >
          {words.map((word, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5"
            >
              <span className="w-5 text-right text-xs tabular-nums text-muted-foreground/60">
                {i + 1}
              </span>
              <span className="font-mono text-sm">{word}</span>
            </div>
          ))}
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/40 text-sm font-medium text-foreground backdrop-blur-[2px]"
          >
            <Eye className="size-5" />
            Tap to reveal your phrase
          </button>
        ) : null}
      </Card>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="lg" onClick={copy} disabled={!revealed}>
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={download}
          disabled={!revealed}
        >
          <Download /> Download
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? <EyeOff /> : <Eye />}
          {revealed ? 'Hide' : 'Reveal'}
        </Button>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="text-muted-foreground">
          I have saved my 24-word recovery phrase in a safe place.
        </span>
      </label>

      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={!confirmed || busy}
        onClick={enter}
      >
        {busy ? 'Opening vault…' : 'Open my vault'}
      </Button>
    </div>
  )
}
