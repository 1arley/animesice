import type { ReactNode } from "react";
import { GachaNav } from "@/components/gacha/GachaNav";

export default function GachaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[96rem] gap-6 lg:px-4">
      <GachaNav />
      <div className="min-w-0 flex-1 pb-8 sm:pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
