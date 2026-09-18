interface AvatarProps {
  name: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 32, className = "" }: AvatarProps) {
  const fallback = (name ?? "?")[0]?.toUpperCase() || "?";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-mist ${className}`}
      style={{ width: size, height: size, borderRadius: "9999px" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: Math.max(Math.round(size * 0.4), 10) }}>
          {fallback}
        </span>
      )}
    </div>
  );
}
