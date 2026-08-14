import Image from "next/image";
import { blur } from "@/lib/blur";

interface AvatarProps {
  name: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 32, className = "" }: AvatarProps) {
  const fallback = (name ?? "?")[0]?.toUpperCase() || "?";

  const canUseNextImage = !!src && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/"));

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-mist ${className}`}
      style={{ width: size, height: size, borderRadius: "9999px" }}
    >
      {src ? (
        canUseNextImage ? (
          <Image
            src={src as string}
            alt="avatar"
            width={size}
            height={size}
            placeholder="blur"
            blurDataURL={blur.square}
            className="h-full w-full object-cover"
            quality={80}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <span style={{ fontSize: Math.max(Math.round(size * 0.4), 10) }}>
          {fallback}
        </span>
      )}
    </div>
  );
}
