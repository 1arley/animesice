"use client";

import { useState } from "react";
import Image from "next/image";
import { safeImageSrc } from "@/lib/url";

/** Miniatura 64px com recado curto quando a arte falha ou está ausente. */
export function GachaItemThumbnail({
  image,
  className,
}: {
  image: string | null;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = safeImageSrc(image);

  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden bg-panel ${className}`}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="64px"
          onError={() => setFailed(true)}
          aria-hidden="true"
          className="object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="px-1 text-center text-[10px] text-mist"
        >
          Sem arte
        </span>
      )}
    </span>
  );
}
