export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-accent text-white shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6.5 4h3.2v6.35L16.4 4h3.9l-7.15 7.2L20.8 20h-3.95l-6.15-7.55V20H6.5V4Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function BrandWord({ className = "" }: { className?: string }) {
  return (
    <span className={`font-[family-name:var(--font-display)] tracking-tight text-ink ${className}`}>
      Kept
    </span>
  );
}
