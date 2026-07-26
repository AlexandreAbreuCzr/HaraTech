interface BrandLogoProps {
  compact?: boolean
  className?: string
}

/** Uses the approved Hara Tech mark instead of a generic dashboard monogram. */
export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <div className={`brand-paper overflow-hidden rounded-xl ${className}`}>
      <img
        src="/logo.jpeg"
        alt="Hara Tech — irrigação automática, futuro sustentável"
        className={compact ? 'h-14 w-28 object-contain' : 'h-52 w-full object-contain'}
      />
    </div>
  )
}
