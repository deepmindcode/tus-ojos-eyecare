"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, KeyRound, Loader2 } from "lucide-react";
import { changeOwnPassword } from "@/app/(admin)/admin/(protected)/users/actions";

/**
 * src/components/admin/change-password-form.tsx
 *
 * Cambiar la contraseña propia. Lo usa cualquiera del equipo, no solo
 * dirección: una recepcionista debe poder cambiar la suya sin pedirle
 * permiso a nadie.
 *
 * Pide la actual a propósito. Sin eso, una sesión robada bastaría para
 * quedarse con la cuenta: el ladrón pondría su propia contraseña y el
 * dueño quedaría fuera.
 */

const MESSAGES: Record<string, string> = {
  forbidden: "Your session expired. Sign in again.",
  weakPassword: "The new password must be at least 12 characters.",
  wrongPassword: "That is not your current password.",
  samePassword: "The new password has to be different from the current one.",
  mismatch: "The two new passwords do not match.",
  server: "Something went wrong. Try again.",
};

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (next !== repeat) {
      setError("mismatch");
      return;
    }

    startTransition(async () => {
      const res = await changeOwnPassword(current, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setRepeat("");
    });
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 outline-none focus:border-brand-primary";
  const label = "block text-sm font-semibold";

  return (
    <form onSubmit={submit} className="max-w-[440px]">
      <div className="grid gap-4">
        <div>
          <label htmlFor="current" className={label}>
            Current password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={field}
            required
          />
        </div>

        <div>
          <label htmlFor="next" className={label}>
            New password
          </label>
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={field}
            required
          />
          <p className="mt-1 text-xs text-text-secondary">
            At least 12 characters. Three or four unrelated words are easier to remember and
            harder to guess than one word with symbols.
          </p>
        </div>

        <div>
          <label htmlFor="repeat" className={label}>
            Repeat the new password
          </label>
          <input
            id="repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={field}
            required
          />
        </div>
      </div>

      {error && (
        <p
          className="mt-4 flex items-start gap-2 rounded-xl bg-[#FDF0F0] p-3 text-sm text-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {MESSAGES[error] ?? MESSAGES.server}
        </p>
      )}

      {done && (
        <p
          className="mt-4 flex items-center gap-2 rounded-xl bg-brand-secondary-tint p-3 text-sm text-brand-secondary-deep"
          role="status"
        >
          <Check className="size-4 shrink-0" aria-hidden="true" />
          Password changed. Use the new one next time you sign in.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-6 font-bold text-white hover:bg-brand-primary-deep disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <KeyRound className="size-4" aria-hidden="true" />
        )}
        Change password
      </button>
    </form>
  );
}