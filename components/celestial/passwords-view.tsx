'use client'

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  Field,
  Input,
  Textarea,
} from '@/components/celestial/primitives'
import { generatePassword } from '@/lib/password-generator'
import { copyToClipboard } from '@/lib/clipboard'
import type { VaultEntry } from '@/lib/vault-store'
import { useVault } from '@/components/celestial/vault-provider'

type Draft = Omit<VaultEntry, 'id' | 'updatedAt'>

const EMPTY_DRAFT: Draft = {
  name: '',
  username: '',
  password: '',
  url: '',
  notes: '',
}

export function PasswordsView() {
  const { entries, addEntry, updateEntry, deleteEntry } = useVault()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<VaultEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) =>
      [e.name, e.username, e.url].some((v) => v.toLowerCase().includes(q)),
    )
  }, [entries, query])

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copyPassword(entry: VaultEntry) {
    const ok = await copyToClipboard(entry.password)
    if (!ok) return
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'login' : 'logins'} stored
            securely.
          </p>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus /> Add login
        </Button>
      </div>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logins"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center gap-2 p-10 text-center">
          <Globe className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {entries.length === 0 ? 'Your vault is empty' : 'No matches'}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground text-pretty">
            {entries.length === 0
              ? 'Add your first login to start building your encrypted vault.'
              : 'Try a different search term.'}
          </p>
        </Card>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {filtered.map((entry) => {
            const isRevealed = revealed.has(entry.id)
            return (
              <li key={entry.id}>
                <Card className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold uppercase">
                      {(entry.name || entry.url || '?').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entry.name || 'Untitled'}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {entry.username || 'No username'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {isRevealed
                            ? entry.password || '—'
                            : '•'.repeat(Math.min(entry.password.length, 12) || 3)}
                        </code>
                        <button
                          onClick={() => toggleReveal(entry.id)}
                          aria-label={isRevealed ? 'Hide' : 'Reveal'}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isRevealed ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyPassword(entry)}
                        aria-label="Copy password"
                      >
                        {copiedId === entry.id ? <Check /> : <Copy />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(entry)}
                        aria-label="Edit"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteEntry(entry.id)}
                        aria-label="Delete"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {(creating || editing) && (
        <EntryDialog
          initial={editing ?? EMPTY_DRAFT}
          title={editing ? 'Edit login' : 'Add login'}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) await updateEntry(editing.id, draft)
            else await addEntry(draft)
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EntryDialog({
  initial,
  title,
  onClose,
  onSave,
}: {
  initial: Draft
  title: string
  onClose: () => void
  onSave: (draft: Draft) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>({
    name: initial.name,
    username: initial.username,
    password: initial.password,
    url: initial.url,
    notes: initial.notes,
  })
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    await onSave(draft)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md p-5 shadow-2xl"
        // Prevent overlay click from closing when interacting with the form.
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="contents"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Name" htmlFor="e-name">
              <Input
                id="e-name"
                value={draft.name}
                placeholder="e.g. GitHub"
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>
            <Field label="Username or email" htmlFor="e-user">
              <Input
                id="e-user"
                value={draft.username}
                autoComplete="off"
                onChange={(e) => set('username', e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="e-pass">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="e-pass"
                    type={reveal ? 'text' : 'password'}
                    value={draft.password}
                    autoComplete="off"
                    className="pr-10 font-mono"
                    onChange={(e) => set('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? 'Hide' : 'Show'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {reveal ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon-lg"
                  onClick={() => set('password', generatePassword({
                    length: 20,
                    uppercase: true,
                    lowercase: true,
                    numbers: true,
                    symbols: true,
                    excludeAmbiguous: false,
                  }))}
                  aria-label="Generate password"
                >
                  <RefreshCw />
                </Button>
              </div>
            </Field>
            <Field label="Website" htmlFor="e-url">
              <Input
                id="e-url"
                value={draft.url}
                placeholder="https://"
                autoComplete="off"
                onChange={(e) => set('url', e.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="e-notes">
              <Textarea
                id="e-notes"
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button size="lg" onClick={save} disabled={saving || !draft.name}>
              {saving ? 'Saving…' : 'Save login'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
