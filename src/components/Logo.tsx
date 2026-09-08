/** Exact Kept mark from GPT phones: sage tile + white dog-eared page + dark K */
export function LogoMark({ size = 64 }: { size?: number }) {
  const radius = Math.round(size * 0.22);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#516a57",
        boxShadow: "0 1px 2px rgba(18, 20, 18, 0.12)",
      }}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.68)}
        viewBox="0 0 58 68"
        fill="none"
      >
        {/* page */}
        <path
          d="M8 2.5h30.5L52 16v46.5c0 1.9-1.6 3.5-3.5 3.5h-37C9.6 66 8 64.4 8 62.5V6A3.5 3.5 0 0 1 11.5 2.5"
          fill="#ffffff"
        />
        {/* dog-ear */}
        <path d="M38.5 2.5V13c0 1.9 1.6 3.5 3.5 3.5h10.5L38.5 2.5Z" fill="#d9e4db" />
        <path d="M38.5 2.5 52 16h-10c-1.9 0-3.5-1.6-3.5-3.5V2.5Z" fill="#c8d6cb" />
        {/* K */}
        <path
          d="M19 18h7.2v13.2L40.2 18H48L33.4 33.6 49 52h-8.1L26.2 36.2V52H19V18Z"
          fill="#3f5544"
        />
      </svg>
    </div>
  );
}

export function BrandWord({ className = "" }: { className?: string }) {
  return <span className={`font-semibold tracking-tight text-ink ${className}`}>Kept</span>;
}
