import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import { CosmeticsSubNav } from "@/components/admin/gacha/CosmeticsSubNav";

/**
 * Hub de cosméticos: uma sub-rota por tipo (capa, moldura, destaque, skins),
 * todas alimentadas pelo mesmo editor de autoria e pela mesma API.
 */
export default function CosmeticosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.18em] text-ice">
            Gacha / cosméticos
          </p>
          <h1 className="font-display text-display-xl text-snow">Cosméticos</h1>
        </div>
        <GachaAdminTabs current="/admin/gacha/cosmeticos" />
      </div>
      <CosmeticsSubNav />
      {children}
    </div>
  );
}
