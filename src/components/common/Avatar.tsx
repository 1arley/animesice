interface AvatarProps {
  name: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

/**
 * Avatar do usuário: imagem (se houver) ou fallback com a inicial do nome.
 * Usa <img> cru de propósito — avatares vêm de hosts arbitrários (Supabase
 * Storage) e previews blob:; o otimizador do next/image não lida bem com ambos.
 */
export function Avatar({ name, src, size = 32, className = "" }: AvatarProps) {
  const fallback = (name ?? "?")[0]?.toUpperCase() || "?";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-mist ${className}`}
      style={{ width: size, height: size, borderRadius: "9999px" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.max(Math.round(size * 0.4), 10) }}>
          {fallback}
        </span>
      )}
    </div>
  );
}
