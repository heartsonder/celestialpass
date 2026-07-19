'use client'

import { Check, Copy, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Field, Slider, Toggle } from '@/components/celestial/primitives'
import {
  buildPool,
  estimateStrength,
  generatePassword,
  type GeneratorOptions,
} from '@/lib/password-generator'

const DEFAULTS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

const STRENGTH_COLORS = [
  'bg-destructive',
  'bg-destructive',
  'bg-muted-foreground',
  'bg-primary',
  'bg-primary',
]

export function GeneratorView() {
  const [opts, setOpts] = useState<GeneratorOptions>(DEFAULTS)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const regenerate = useCallback(() => {
    setPassword(generatePassword(opts))
  }, [opts])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const poolSize = useMemo(() => buildPool(opts).length, [opts])
  const strength = useMemo(
    () => estimateStrength(password, poolSize),
    [password, poolSize],
  )

  const noCharset = poolSize === 0

  function set<K extends keyof GeneratorOptions>(
    key: K,
    value: GeneratorOptions[K],
  ) {
    setOpts((prev) => ({ ...prev, [key]: value }))
  }

  async function copy() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">
        Password generator
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create strong, unique passwords with cryptographically secure
        randomness.
      </p>

      <Card className="mt-5 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2 pl-3">
          <span className="min-h-6 flex-1 break-all font-mono text-sm">
            {noCharset ? (
              <span className="text-muted-foreground">
                Select at least one character set
              </span>
            ) : (
              password
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={regenerate}
            aria-label="Regenerate password"
          >
            <RefreshCw />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={copy}
            disabled={noCharset}
            aria-label="Copy password"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Strength</span>
            <span className="font-medium">
              {strength.label} · {strength.entropyBits} bits
            </span>
          </div>
          <div className="mt-1.5 flex gap-1">
            {[0, 1, 2, 3].map((seg) => (
              <div
                key={seg}
                className={`h-1.5 flex-1 rounded-full ${
                  seg < strength.score ? STRENGTH_COLORS[strength.score] : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <Field label={`Length — ${opts.length} characters`} htmlFor="length">
          <div className="flex items-center gap-3">
            <Slider
              id="length"
              value={opts.length}
              min={8}
              max={64}
              onChange={(v) => set('length', v)}
            />
            <span className="w-8 text-right font-mono text-sm tabular-nums">
              {opts.length}
            </span>
          </div>
        </Field>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle
            id="uppercase"
            label="Uppercase (A–Z)"
            checked={opts.uppercase}
            onChange={(v) => set('uppercase', v)}
          />
          <Toggle
            id="lowercase"
            label="Lowercase (a–z)"
            checked={opts.lowercase}
            onChange={(v) => set('lowercase', v)}
          />
          <Toggle
            id="numbers"
            label="Numbers (0–9)"
            checked={opts.numbers}
            onChange={(v) => set('numbers', v)}
          />
          <Toggle
            id="symbols"
            label="Symbols (!@#$)"
            checked={opts.symbols}
            onChange={(v) => set('symbols', v)}
          />
          <Toggle
            id="ambiguous"
            label="Exclude look-alikes"
            checked={opts.excludeAmbiguous}
            onChange={(v) => set('excludeAmbiguous', v)}
          />
        </div>
      </Card>
    </div>
  )
}
