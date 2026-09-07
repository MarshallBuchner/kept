/** Kept mark from GPT mockups: sage tile + white dog-eared page + dark K */
export function LogoMark({ size = 64 }: { size?: number }) {
  const radius = Math.max(14, size * 0.22);
  return (
    <div
      className="relative flex items-center justify-center shadow-sm"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(180deg, #5d7862 0%, #516a57 55%, #455c4a 100%)",
      }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.72} viewBox="0 0 62 72" fill="none">
        <path
          d="M10 4h32l14 14v46c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4V8c0-2.2 1.8-4 4-4Z"
          fill="white"
        />
        <path d="M42 4v10c0 2.2 1.8 4 4 4h14L42 4Z" fill="#d7e2d9" />
        <path
          d="M22 20h6.2v12.1L41.4 20H48l-13.8 14.2L49.2 52h-6.8L28.2 36.8V52H22V20Z"
          fill="#3f5544"
        />
      </svg>
    </div>
  );
}

export function BrandWord({ className = "" }: { className?: string }) {
  return <span className={`font-semibold tracking-tight text-ink ${className}`}>Kept</span>;
}
