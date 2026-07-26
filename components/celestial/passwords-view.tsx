'use client'

import {
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  File,
  Globe,
  IdCard,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
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
import { cn } from '@/lib/utils'
import { generatePassword } from '@/lib/password-generator'
import { copyToClipboard } from '@/lib/clipboard'
import type { VaultEntry, VaultItemType } from '@/lib/vault-store'
import { useVault } from '@/components/celestial/vault-provider'

type Draft = Omit<VaultEntry, 'id' | 'updatedAt'>
type Filter = 'all' | VaultItemType

type FieldSpec = {
  key: 'username' | 'password' | 'url'
  label: string
  placeholder?: string
  secret?: boolean
  generate?: boolean
  mono?: boolean
}

type CategoryConfig = {
  label: string
  plural: string
  icon: typeof Globe
  addLabel: string
  fields: FieldSpec[]
}

const CATEGORIES: Record<VaultItemType, CategoryConfig> = {
  login: {
    label: 'Login',
    plural: 'Logins',
    icon: Globe,
    addLabel: 'Add login',
    fields: [
      { key: 'username', label: 'Username or email' },
      { key: 'password', label: 'Password', secret: true, generate: true, mono: true },
      { key: 'url', label: 'Website', placeholder: 'https://' },
    ],
  },
  card: {
    label: 'Card',
    plural: 'Cards',
    icon: CreditCard,
    addLabel: 'Add card',
    fields: [
      { key: 'username', label: 'Cardholder name' },
      { key: 'password', label: 'Card number', secret: true, mono: true, placeholder: '•••• •••• •••• ••••' },
      { key: 'url', label: 'Expiry (MM/YY)', placeholder: 'MM/YY' },
    ],
  },
  note: {
    label: 'Note',
    plural: 'Notes',
    icon: StickyNote,
    addLabel: 'Add note',
    fields: [],
  },
  identity: {
    label: 'Identity',
    plural: 'Identities',
    icon: IdCard,
    addLabel: 'Add identity',
    fields: [
      { key: 'username', label: 'Full name' },
      { key: 'url', label: 'Email' },
    ],
  },
  file: {
    label: 'File',
    plural: 'Files',
    icon: File,
    addLabel: 'Add file',
    fields: [
      { key: 'url', label: 'File link or reference', placeholder: 'https:// or path' },
    ],
  },
}

const FILTERS: Filter[] = ['all', 'login', 'card', 'note', 'identity', 'file']

function entryType(entry: VaultEntry): VaultItemType {
  return entry.type ?? 'login'
}

function emptyDraft(type: VaultItemType): Draft {
  return { type, name: '', username: '', password: '', url: '', notes: '' }
}

export function PasswordsView() {
  const { entries, addEntry, updateEntry, deleteEntry } = useVault()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<VaultEntry | null>(null)
  const [creating, setCreating] = useState<VaultItemType | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: entries.length,
      login: 0,
      card: 0,
      note: 0,
      identity: 0,
      file: 0,
    }
    for (const e of entries) map[entryType(e)] += 1
    return map
  }, [entries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (filter !== 'all' && entryType(e) !== filter) return false
      if (!q) return true
      return [e.name, e.username, e.url].some((v) =>
        v.toLowerCase().includes(q),
      )
    })
  }, [entries, query, filter])

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copySecret(entry: VaultEntry) {
    const ok = await copyToClipboard(entry.password)
    if (!ok) return
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const addType: VaultItemType = filter === 'all' ? 'login' : filter

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'item' : 'items'} stored
            securely.
          </p>
        </div>
        <Button size="lg" onClick={() => setCreating(addType)}>
          <Plus /> {CATEGORIES[addType].addLabel}
        </Button>
      </div>

      <div className="-mx-1 mt-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const Icon = f === 'all' ? null : CATEGORIES[f].icon
          const label = f === 'all' ? 'All' : CATEGORIES[f].plural
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon ? <Icon className="size-3.5" /> : null}
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active
                    ? 'bg-primary-foreground/20'
                    : 'bg-background/60 text-muted-foreground',
                )}
              >
                {counts[f]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vault"
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
              ? 'Add your first item to start building your encrypted vault.'
              : 'Try a different search term or filter.'}
          </p>
        </Card>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {filtered.map((entry) => {
            const type = entryType(entry)
            const config = CATEGORIES[type]
            const Icon = config.icon
            const isRevealed = revealed.has(entry.id)
            const hasSecret = Boolean(entry.password)
            const secondary =
              entry.username ||
              (type === 'note' ? entry.notes : entry.url) ||
              `No details`
            return (
              <li key={entry.id}>
                <Card className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entry.name || 'Untitled'}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {secondary}
                      </p>
                      {hasSecret ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {isRevealed
                              ? entry.password || '—'
                              : '•'.repeat(
                                  Math.min(entry.password.length, 12) || 3,
                                )}
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
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {hasSecret ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copySecret(entry)}
                          aria-label="Copy"
                        >
                          {copiedId === entry.id ? <Check /> : <Copy />}
                        </Button>
                      ) : null}
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
          initial={editing ?? emptyDraft(creating ?? 'login')}
          isEdit={Boolean(editing)}
          onClose={() => {
            setCreating(null)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) await updateEntry(editing.id, draft)
            else await addEntry(draft)
            setCreating(null)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EntryDialog({
  initial,
  isEdit,
  onClose,
  onSave,
}: {
  initial: Draft
  isEdit: boolean
  onClose: () => void
  onSave: (draft: Draft) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>({
    type: initial.type,
    name: initial.name,
    username: initial.username,
    password: initial.password,
    url: initial.url,
    notes: initial.notes,
  })
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)

  const config = CATEGORIES[draft.type]

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
      aria-label={isEdit ? 'Edit item' : 'Add item'}
      onClick={onClose}
    >
      <Card className="w-full max-w-md p-5 shadow-2xl">
        <div onClick={(e) => e.stopPropagation()} className="contents">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isEdit ? `Edit ${config.label.toLowerCase()}` : config.addLabel}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>

          {!isEdit ? (
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {(Object.keys(CATEGORIES) as VaultItemType[]).map((t) => {
                const Icon = CATEGORIES[t].icon
                const active = draft.type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                      active
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {CATEGORIES[t].label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Name" htmlFor="e-name">
              <Input
                id="e-name"
                value={draft.name}
                placeholder={
                  draft.type === 'card'
                    ? 'e.g. Personal Visa'
                    : draft.type === 'identity'
                      ? 'e.g. Passport'
                      : draft.type === 'file'
                        ? 'e.g. Tax return 2025'
                        : draft.type === 'note'
                          ? 'e.g. Wifi password'
                          : 'e.g. GitHub'
                }
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>

            {config.fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`e-${f.key}`}>
                {f.secret ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`e-${f.key}`}
                        type={reveal ? 'text' : 'password'}
                        value={draft[f.key]}
                        placeholder={f.placeholder}
                        autoComplete="off"
                        className={cn('pr-10', f.mono && 'font-mono')}
                        onChange={(e) => set(f.key, e.target.value)}
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
                    {f.generate ? (
                      <Button
                        variant="outline"
                        size="icon-lg"
                        onClick={() =>
                          set(
                            f.key,
                            generatePassword({
                              length: 20,
                              uppercase: true,
                              lowercase: true,
                              numbers: true,
                              symbols: true,
                              excludeAmbiguous: false,
                            }),
                          )
                        }
                        aria-label="Generate password"
                      >
                        <RefreshCw />
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <Input
                    id={`e-${f.key}`}
                    value={draft[f.key]}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </Field>
            ))}

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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : config.addLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
