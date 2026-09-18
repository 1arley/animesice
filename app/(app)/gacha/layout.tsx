import type { ReactNode } from "react";
import { GachaNav } from "@/components/gacha/GachaNav";

export default function GachaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GachaNav />
      {children}
    </>
  );
}
