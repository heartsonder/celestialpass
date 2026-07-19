import { cn } from '@/lib/utils'

export function ShieldLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6', className)}
      aria-hidden="true"
    >
      <path d="M12 2.5 4 5.5v6c0 4.6 3.2 7.9 8 10 4.8-2.1 8-5.4 8-10v-6l-8-3Z" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ShieldLogo className="size-6 text-primary" />
      <span className="text-[15px] font-semibold tracking-tight">
        Celestial<span className="text-muted-foreground">Pass</span>
      </span>
    </div>
  )
}
