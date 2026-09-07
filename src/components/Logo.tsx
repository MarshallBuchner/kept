export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-accent text-white shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 4h4.2c3.4 0 5.8 2.1 5.8 5.3 0 2.2-1.1 3.9-3 4.7L18 20h-3.2l-3.6-5.4H10V20H7V4Zm3 7.3h1.1c1.8 0 2.9-1 2.9-2.5S12.9 6.4 11.1 6.4H10v4.9Z"
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
