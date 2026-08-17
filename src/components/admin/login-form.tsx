"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";

/**
 * Login del panel.
 *
 * La sesión la establece Supabase Auth y viaja en cookies HTTP-only
 * escritas por el middleware. En ningún momento se guarda un token en
 * localStorage.
 *
 * El mensaje de error es siempre el mismo tanto si el correo no existe
 * como si la contraseña es incorrecta: distinguirlos permitiría averiguar
 * qué direcciones tienen cuenta.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    // refresh() fuerza que el servidor vuelva a leer la cookie de sesión
    // antes de navegar; si no, el layout protegido aún vería null.
    router.refresh();
    router.push("/admin");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border-subtle bg-surface p-8"
      noValidate
    >
      <LogoMark className="h-10 w-auto" />
      <h1 className="mt-5 font-display text-2xl font-bold text-brand-primary">Tus Ojos Admin</h1>
      <p className="mt-1 text-sm text-text-secondary">Sign in to continue.</p>

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border-subtle px-4 py-3 outline-none focus:border-brand-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border-subtle px-4 py-3 outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#FDF0F0] p-3 text-sm text-error" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-primary font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
