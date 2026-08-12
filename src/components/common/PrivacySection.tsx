"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PrivacySettings } from "@/types";

const FIELDS: Array<{
  key: keyof Omit<PrivacySettings, "privateAnimeLists">;
  label: string;
  hint: string;
}> = [
  {
    key: "profilePublic",
    label: "Perfil público",
    hint: "Permite que outros usuários vejam seu perfil. Desligado = página 404.",
  },
  {
    key: "showActivity",
    label: "Mostrar atividade",
    hint: "Comentários e episódios assistidos visíveis no perfil.",
  },
  {
    key: "showFavorites",
    label: "Mostrar favoritos e biblioteca",
    hint: "Animes curtidos e sua lista (itens marcados como privados ficam ocultos).",
  },
  {
    key: "showRatings",
    label: "Mostrar avaliações",
    hint: "Notas que você deu para os animes.",
  },
];

export function PrivacySection() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .getPrivacySettings()
      .then(setSettings)
      .catch((e) => setErr(e?.message || "Erro ao carregar privacidade."));
  }, []);

  async function toggle(key: keyof Omit<PrivacySettings, "privateAnimeLists">, value: boolean) {
    setMsg("");
    setErr("");
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      const next = await api.updatePrivacySettings({ [key]: value });
      setSettings(next);
      setMsg("Privacidade atualizada.");
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar.");
      api
        .getPrivacySettings()
        .then(setSettings)
        .catch(() => {});
    }
  }

  if (!settings && !err) {
    return (
      <section className="border border-hairline bg-panel p-6">
        <h2 className="font-display text-display-lg text-snow">Privacidade</h2>
        <p className="mt-2 text-body-sm text-mist">Carregando...</p>
      </section>
    );
  }

  return (
    <section className="border border-hairline bg-panel p-6">
      <div className="mb-4">
        <h2 className="font-display text-display-lg text-snow">Privacidade</h2>
        <p className="text-body-sm text-mist">
          Controle o que aparece no seu perfil público.
        </p>
      </div>

      {msg && (
        <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {err}
        </div>
      )}

      <ul className="space-y-4">
        {FIELDS.map((f) => {
          const value = settings ? settings[f.key] : true;
          return (
            <li key={f.key} className="flex items-start justify-between gap-4">
              <div>
                <div className="font-sans text-body text-snow">{f.label}</div>
                <div className="text-body-sm text-mist">{f.hint}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => toggle(f.key, !value)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  value ? "bg-ice" : "bg-hairline"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
                    value ? "left-[calc(100%-1.25rem)]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {typeof settings?.privateAnimeLists === "number" &&
        settings.privateAnimeLists > 0 && (
          <p className="mt-4 border-t border-hairline pt-3 text-caption text-mist/70">
            {settings.privateAnimeLists} anime(s) da sua biblioteca estão marcados
            como privados e não aparecem para outros usuários.
          </p>
        )}
    </section>
  );
}
