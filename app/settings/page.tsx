"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { NotificationPreferencesSection } from "@/components/common/NotificationPreferencesSection";
import { ProfileDashboard } from "@/components/common/ProfileDashboard";
import { PrivacySection } from "@/components/common/PrivacySection";
import { passwordError } from "@/lib/password";
import { displayName } from "@/lib/displayName";
import { Avatar } from "@/components/common/Avatar";

const AVATAR_MAX_BYTES = 50 * 1024;
const AVATAR_ACCEPT = ["image/jpeg", "image/jpg", "image/png"];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();

  const [newName, setNewName] = useState(user?.name ?? "");
  const [newUserName, setNewUserName] = useState(user?.userName ?? "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [avatarErr, setAvatarErr] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(user?.bio ?? "");
  const [bioMsg, setBioMsg] = useState("");
  const [bioErr, setBioErr] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-body-sm text-mist">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm border border-hairline bg-panel p-8 text-center">
          <p className="text-body mb-4 text-mist">
            Você precisa estar logado para acessar as configurações.
          </p>
          <Link href="/login" className="btn-ice w-full justify-center">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setProfileLoading(true);
    try {
      await api.updateProfile({
        name: newName,
        ...(newUserName ? { userName: newUserName } : {}),
      });
      await refreshUser();
      setProfileMsg("Perfil atualizado com sucesso.");
    } catch (err) {
      setProfileErr(
        err instanceof ApiError ? err.message : "Erro ao atualizar.",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarMsg("");
    setAvatarErr("");
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    if (!AVATAR_ACCEPT.includes(mime)) {
      setAvatarErr("Formato inválido. Aceitos: JPG ou PNG.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarErr("Imagem muito grande. Máximo: 50KB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAvatarUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile) return;
    setAvatarMsg("");
    setAvatarErr("");
    setAvatarLoading(true);
    try {
      await api.uploadAvatar(avatarFile);
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAvatarMsg("Avatar atualizado com sucesso.");
    } catch (err) {
      setAvatarErr(
        err instanceof ApiError ? err.message : "Erro ao enviar a imagem.",
      );
    } finally {
      setAvatarLoading(false);
    }
  }

  function cancelAvatarPreview() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAvatarRemove() {
    setAvatarMsg("");
    setAvatarErr("");
    setAvatarLoading(true);
    try {
      await api.deleteAvatar();
      await refreshUser();
      setAvatarMsg("Avatar removido.");
    } catch (err) {
      setAvatarErr(
        err instanceof ApiError ? err.message : "Erro ao remover a imagem.",
      );
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleBioSave(e: React.FormEvent) {
    e.preventDefault();
    setBioMsg("");
    setBioErr("");
    setBioLoading(true);
    try {
      await api.updateProfileMeta({ bio });
      await refreshUser();
      setBioMsg("Bio atualizada com sucesso.");
    } catch (err) {
      setBioErr(
        err instanceof ApiError ? err.message : "Erro ao salvar a bio.",
      );
    } finally {
      setBioLoading(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg("");
    setEmailErr("");
    setEmailLoading(true);
    try {
      const res = await api.changeEmail(newEmail, emailPassword);
      setEmailMsg(
        res.message ||
          "Email de confirmação enviado. Verifique sua caixa de entrada.",
      );
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      setEmailErr(err instanceof ApiError ? err.message : "Erro ao solicitar troca de email.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");

    const pwErr = passwordError(newPassword, confirmNewPassword);
    if (pwErr) {
      setPwErr(pwErr);
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPwMsg(res.message || "Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPwErr(err instanceof ApiError ? err.message : "Erro ao alterar senha.");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main id="body-content">
        <div className="mx-auto max-w-shelf px-4 py-8">
          <h1 className="shelf-label">
            Configurações{" "}
            <span className="shelf-label-data">{user.email}</span>
          </h1>

          <div className="mb-6">
            <ProfileDashboard user={user} />
          </div>

          <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
            {/* ── Profile ── */}
            <section className="border border-hairline bg-panel p-6">
              <div className="mb-4">
                <h2 className="font-display text-display-lg text-snow">Perfil</h2>
                <p className="text-body-sm text-mist">
                  Nome de exibição e apelido público.
                </p>
              </div>

              {profileMsg && (
                <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                  {profileMsg}
                </div>
              )}
              {profileErr && (
                <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                  {profileErr}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Nome
                  </span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    autoComplete="name"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Apelido{" "}
                    <span className="normal-case text-mist/70">(opcional)</span>
                  </span>
                  <input
                    type="text"
                    placeholder="ex: john_doe"
                    value={newUserName}
                    onChange={(e) =>
                      setNewUserName(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      )
                    }
                    autoComplete="username"
                    className="field"
                  />
                  <span className="mt-1 block font-mono text-caption text-mist/70">
                    3-20 caracteres: minúsculas, números, _ ou -.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="btn-ice w-full justify-center"
                >
                  {profileLoading ? "Salvando..." : "Salvar"}
                </button>
              </form>
            </section>

            {/* ── Avatar ── */}
            <section className="border border-hairline bg-panel p-6">
              <div className="mb-4">
                <h2 className="font-display text-display-lg text-snow">Avatar</h2>
                <p className="text-body-sm text-mist">
                  JPG ou PNG, até 50KB. Sem foto, usamos a inicial do seu
                  nome.
                </p>
              </div>

              {avatarMsg && (
                <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                  {avatarMsg}
                </div>
              )}
              {avatarErr && (
                <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                  {avatarErr}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Avatar
                  name={displayName(user)}
                  src={avatarPreview ?? user.avatar}
                  size={72}
                />
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                  {avatarPreview && avatarFile ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarLoading}
                        className="btn-ice"
                      >
                        {avatarLoading ? "Enviando..." : "Salvar nova foto"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelAvatarPreview}
                        disabled={avatarLoading}
                        className="btn-ghost"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost"
                    >
                      Alterar foto
                    </button>
                  )}
                  {user.avatar && !avatarPreview && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={avatarLoading}
                      className="btn-ghost"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* ── Bio ── */}
            <section className="border border-hairline bg-panel p-6">
              <div className="mb-4">
                <h2 className="font-display text-display-lg text-snow">Bio</h2>
                <p className="text-body-sm text-mist">
                  Sobre você — aparece no seu perfil público.
                </p>
              </div>

              {bioMsg && (
                <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                  {bioMsg}
                </div>
              )}
              {bioErr && (
                <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                  {bioErr}
                </div>
              )}

              <form onSubmit={handleBioSave} className="space-y-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={4}
                  placeholder="Fale um pouco sobre você..."
                  className="field resize-none"
                />
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-caption text-mist/70">
                    {bio.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={bioLoading}
                    className="btn-ice"
                  >
                    {bioLoading ? "Salvando..." : "Salvar bio"}
                  </button>
                </div>
              </form>
            </section>

            {/* ── Change Email ── */}
            <section className="border border-hairline bg-panel p-6">
              <div className="mb-4">
                <h2 className="font-display text-display-lg text-snow">Email</h2>
                <p className="text-body-sm text-mist">
                  Email atual: <span className="text-ice">{user.email}</span>
                  <br />
                  A troca requer confirmação no novo email.
                </p>
              </div>

              {emailMsg && (
                <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                  {emailMsg}
                </div>
              )}
              {emailErr && (
                <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                  {emailErr}
                </div>
              )}

              <form onSubmit={handleEmailChange} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Novo email
                  </span>
                  <input
                    type="email"
                    placeholder="novo@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Senha atual
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="field"
                  />
                </label>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="btn-ice w-full justify-center"
                >
                  {emailLoading ? "Enviando..." : "Enviar confirmação"}
                </button>
              </form>
            </section>

            {/* ── Change Password ── */}
            <section className="border border-hairline bg-panel p-6 md:col-span-2">
              <div className="mb-4">
                <h2 className="font-display text-display-lg text-snow">Senha</h2>
                <p className="text-body-sm text-mist">
                  Altere sua senha. Após a troca, você será deslogado de outras
                  sessões.
                </p>
              </div>

              {pwMsg && (
                <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                  {pwMsg}
                </div>
              )}
              {pwErr && (
                <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                  {pwErr}
                </div>
              )}

              <form
                onSubmit={handlePasswordChange}
                className="space-y-4 md:grid md:grid-cols-3 md:gap-4"
              >
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Senha atual
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Nova senha
                  </span>
                  <input
                    type="password"
                    placeholder="Mín. 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                    Confirmar nova senha
                  </span>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="field"
                  />
                </label>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="btn-ice w-full justify-center md:w-auto"
                  >
                    {pwLoading ? "Alterando..." : "Alterar senha"}
                  </button>
                </div>
              </form>
            </section>

            <NotificationPreferencesSection />

            <PrivacySection />

            {/* ── Account info ── */}
            <section className="border border-hairline bg-panel p-6 md:col-span-2">
              <div className="mb-2">
                <h2 className="font-display text-display-lg text-snow">Conta</h2>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-body-sm">
                <div>
                  <dt className="text-caption uppercase tracking-wider text-mist">
                    ID
                  </dt>
                  <dd className="text-mist">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-caption uppercase tracking-wider text-mist">
                    Papel
                  </dt>
                  <dd className="text-ice">{user.role}</dd>
                </div>
                <div>
                  <dt className="text-caption uppercase tracking-wider text-mist">
                    Criado em
                  </dt>
                  <dd className="text-mist">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption uppercase tracking-wider text-mist">
                    Atualizado em
                  </dt>
                  <dd className="text-mist">
                    {new Date(user.updatedAt).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-hairline pt-4">
                <button
                  onClick={async () => {
                    if (loggingOut) return;
                    setLoggingOut(true);
                    try {
                      await logout();
                      router.push("/");
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                  disabled={loggingOut}
                  className="btn-ghost"
                >
                  {loggingOut ? "Encerrando…" : "Encerrar sessão"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
