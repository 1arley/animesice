import Link from "next/link";

/**
 * Visão geral do hub de cosméticos. Serve de mapa: cada tipo tem sub-rota
 * própria; coisa nova começa como DRAFT (experimento) e só entra no catálogo
 * quando é publicada.
 */
const AREAS = [
  {
    href: "/admin/gacha/cosmeticos/capas",
    title: "Capas (versos)",
    desc: "O verso opaco da carta. Arte de referência atrás do SVG para conferir medida.",
  },
  {
    href: "/admin/gacha/cosmeticos/molduras",
    title: "Molduras (bordas)",
    desc: "Desenhadas sobre a arte da carta. Canvas com sangria e anel fora da janela.",
  },
  {
    href: "/admin/gacha/cosmeticos/destaques",
    title: "Destaques",
    desc: "Adornos sobre a carta, também com sangria de canvas.",
  },
  {
    href: "/admin/gacha/cosmeticos/skins",
    title: "Skins",
    desc: "Artes alternativas vinculadas a cartas específicas, com raridade e status.",
  },
];

export default function CosmeticosOverviewPage() {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-body-sm text-mist">
        Tudo que muda a aparência das cartas vive aqui. Para experimentar algo
        novo (capa, borda, destaque), abra a área correspondente e salve com
        status <strong className="text-amber-300">DRAFT</strong>: nada em
        rascunho aparece no catálogo até ser publicado.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="block border border-hairline bg-panel p-4 transition-colors hover:border-ice/60"
          >
            <h2 className="font-display text-body-lg text-snow">{area.title}</h2>
            <p className="mt-1 text-caption text-mist">{area.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
