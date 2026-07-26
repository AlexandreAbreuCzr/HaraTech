interface BrandLogoProps {
  compact?: boolean
  inverse?: boolean
  className?: string
}

/** Renders the approved Hara Tech logo in full or as a compact navigation lockup. */
export function BrandLogo({ compact = false, inverse = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="brand-paper flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-0.5">
          <img
            src="/logo.jpeg"
            alt="Símbolo Hara Tech"
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0 leading-none">
          <p className={`text-sm font-black tracking-[0.18em] ${inverse ? 'text-white' : 'text-[var(--text-primary)]'}`}>HARA</p>
          <p className="mt-1 text-[0.65rem] font-semibold tracking-[0.24em] text-[var(--accent-leaf)]">TECH</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`brand-paper overflow-hidden rounded-2xl p-2 ${className}`}>
      <img
        src="/logo.jpeg"
        alt="Hara Tech — irrigação automática, futuro sustentável"
        className="h-52 w-full object-contain"
      />
    </div>
  )
}
