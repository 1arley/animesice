"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { SiteSettings } from "@/lib/api";

export default function AdminConfigPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    api
      .adminGetSiteSettings()
      .then((data) => setSettings(data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar configurações."),
      )
      .finally(() => setLoading(false));
  }, [user]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.adminUpdateSiteSettings({
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        registrationOpen: settings.registrationOpen,
        maintenanceMode: settings.maintenanceMode,
      });
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-body-sm text-mist">Carregando configurações...</p>;
  }

  if (error && !settings) {
    return (
      <div className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
        {error}
      </div>
    );
  }

  if (!settings) return null;

  return (
    <>
      <h1 className="font-display text-display-xl text-snow">Configurações do Site</h1>
      <p className="mt-1 text-body-sm text-mist">
        Configurações globais do site — nome, descrição, registro e manutenção.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          Configurações salvas com sucesso.
        </div>
      )}

      <div className="mt-6 max-w-lg space-y-5">
        <div>
          <label className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
            Nome do site
          </label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
            Descrição do site
          </label>
          <textarea
            value={settings.siteDescription}
            onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
            rows={3}
            className="field"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.registrationOpen}
              onChange={(e) => setSettings({ ...settings, registrationOpen: e.target.checked })}
              className="h-4 w-4 accent-ice"
            />
            <div>
              <span className="text-body-sm text-snow">Registro aberto</span>
              <p className="text-caption text-mist">Permitir novos cadastros de usuários</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="h-4 w-4 accent-signal"
            />
            <div>
              <span className="text-body-sm text-snow">Modo de manutenção</span>
              <p className="text-caption text-mist">Bloqueia o acesso ao site para usuários comuns</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-ice">
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </div>
    </>
  );
}