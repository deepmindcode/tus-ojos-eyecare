"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
  Copy,
  KeyRound,
  UserX,
  UserCheck,
  X,
} from "lucide-react";
import {
  createStaff,
  setStaffLocations,
  setStaffActive,
  resetStaffPassword,
  type StaffMember,
} from "@/app/(admin)/admin/(protected)/users/actions";

const ROLE_OPTIONS = [
  { value: "FRONT_DESK", label: "Front desk", hint: "Sees only their assigned offices" },
  { value: "MANAGER", label: "Manager", hint: "Sees all offices, manages content" },
  { value: "OWNER", label: "Owner", hint: "Full access except system settings" },
  { value: "CONTENT_EDITOR", label: "Content editor", hint: "Website content only" },
] as const;

interface Office {
  readonly slug: string;
  readonly city: string;
}

const MESSAGES: Record<string, string> = {
  forbidden: "You don't have permission to do this.",
  invalidRole: "Choose a valid role.",
  weakPassword: "Password must be at least 12 characters.",
  invalidEmail: "Enter a valid email address.",
  emailTaken: "That email already has an account.",
  cannotSelf: "You cannot deactivate your own account.",
  lastOwner:
    "This is the only active owner left. Promote or reactivate someone else first — otherwise nobody could manage the practice.",
  server: "Something went wrong. Try again.",
};

/** Contraseña larga y legible en voz alta, para entregarla en persona. */
function suggestPassword(): string {
  const words = [
    "camden", "lehigh", "cherry", "atlantic", "vision", "lens", "frame",
    "cornea", "retina", "amber", "harbor", "market",
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)]!;
  const n = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${pick()}-${pick()}-${n}`;
}

/** Caja que enseña una contraseña UNA vez. Nunca se envía por correo. */
function PasswordOnce({
  password,
  title,
  onDone,
}: {
  readonly password: string;
  readonly title: string;
  readonly onDone: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-brand-secondary bg-brand-secondary-tint p-4">
      <h3 className="flex items-center gap-2 font-display font-bold text-brand-secondary-deep">
        <Check className="size-5" aria-hidden="true" />
        {title}
      </h3>
      <p className="mt-2 text-sm">
        Write it down now and give it to them in person. It won&apos;t be shown again, and it
        is not emailed anywhere.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-surface px-4 py-2 font-mono text-base font-bold">
          {password}
        </code>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(password)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border-subtle bg-surface px-4 text-sm font-bold"
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 px-4 text-sm font-bold text-brand-primary"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function TeamManager({
  staff,
  offices,
  currentUserId,
}: {
  readonly staff: readonly StaffMember[];
  readonly offices: readonly Office[];
  readonly currentUserId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState(suggestPassword);
  const [role, setRole] = useState<string>("FRONT_DESK");
  const [selected, setSelected] = useState<string[]>([]);

  function toggleOffice(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createStaff({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
        role: role as never,
        locationSlugs: selected,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCreatedPassword(password);
      setShowForm(false);
      setEmail("");
      setDisplayName("");
      setSelected([]);
      setPassword(suggestPassword());
    });
  }

  return (
    <>
      {createdPassword && (
        <div className="mb-6">
          <PasswordOnce
            password={createdPassword}
            title="Account created"
            onDone={() => setCreatedPassword(null)}
          />
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 font-bold text-white hover:bg-brand-primary-deep"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Add team member
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-6">
          <h2 className="font-display text-lg font-bold">New team member</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold">
                Full name
              </label>
              <input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-subtle px-4 py-3 outline-none focus:border-brand-primary"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Shown in the follow-up history of every appointment they work.
              </p>
            </div>
            <div>
              <label htmlFor="staffEmail" className="block text-sm font-semibold">
                Email
              </label>
              <input
                id="staffEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-subtle px-4 py-3 outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="pw" className="block text-sm font-semibold">
              Temporary password
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input
                id="pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-[260px] flex-1 rounded-xl border border-border-subtle px-4 py-3 font-mono outline-none focus:border-brand-primary"
              />
              <button
                type="button"
                onClick={() => setPassword(suggestPassword())}
                className="min-h-11 rounded-full border-2 border-border-subtle px-4 text-sm font-bold"
              >
                Generate
              </button>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Role</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer gap-3 rounded-xl border border-border-subtle p-3 has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-1 size-4 accent-[var(--color-brand-primary)]"
                  />
                  <span>
                    <span className="block font-semibold">{r.label}</span>
                    <span className="block text-xs text-text-secondary">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {role === "FRONT_DESK" && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Offices they handle</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {offices.map((o) => (
                  <label
                    key={o.slug}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(o.slug)}
                      onChange={() => toggleOffice(o.slug)}
                      className="size-4 accent-[var(--color-brand-primary)]"
                    />
                    {o.city}
                  </label>
                ))}
              </div>
              {selected.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-warning">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  Without an office assigned they will see no appointments at all.
                </p>
              )}
            </fieldset>
          )}

          {error && (
            <p
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#FDF0F0] p-3 text-sm text-error"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {MESSAGES[error] ?? MESSAGES.server}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-6 font-bold text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Create account
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 px-4 font-bold text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="mt-6 grid gap-2">
        {staff.map((m) => (
          <StaffRow
            key={m.userId}
            member={m}
            offices={offices}
            isSelf={m.userId === currentUserId}
          />
        ))}
      </ul>
    </>
  );
}

function StaffRow({
  member,
  offices,
  isSelf,
}: {
  readonly member: StaffMember;
  readonly offices: readonly Office[];
  readonly isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(
    offices.filter((o) => member.locations.includes(o.city)).map((o) => o.slug),
  );
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(member.active);
  const [confirmOff, setConfirmOff] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFrontDesk = member.roles.includes("FRONT_DESK");
  const seesAll = member.roles.some((r) => ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(r));

  function toggle(slug: string) {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function save() {
    startTransition(async () => {
      await setStaffLocations(member.userId, selected);
      setSaved(true);
    });
  }

  function toggleActive(next: boolean) {
    setError(null);
    setConfirmOff(false);
    startTransition(async () => {
      const res = await setStaffActive(member.userId, next);
      if (res.ok) setActive(next);
      else setError(res.error);
    });
  }

  function resetPassword() {
    setError(null);
    const generated = suggestPassword();
    startTransition(async () => {
      const res = await resetStaffPassword(member.userId, generated);
      if (res.ok) setNewPassword(generated);
      else setError(res.error);
    });
  }

  return (
    <li
      className={`rounded-2xl border bg-surface p-4 ${
        active ? "border-border-subtle" : "border-dashed border-border-subtle opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display font-bold">{member.displayName}</span>

        {isSelf && (
          <span className="rounded bg-brand-secondary-tint px-2 py-0.5 text-[0.65rem] font-bold uppercase text-brand-secondary-deep">
            you
          </span>
        )}

        {!active && (
          <span className="rounded bg-[#FDF0F0] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-error">
            deactivated
          </span>
        )}

        <span className="text-sm text-text-secondary">{member.email}</span>

        <span className="ml-auto flex flex-wrap gap-1.5">
          {member.roles.map((r) => (
            <span
              key={r}
              className="rounded bg-brand-primary-tint px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-primary"
            >
              {r.replace(/_/g, " ").toLowerCase()}
            </span>
          ))}
        </span>
      </div>

      {active &&
        (seesAll ? (
          <p className="mt-2 text-sm text-text-secondary">Sees all offices.</p>
        ) : isFrontDesk ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {offices.map((o) => (
              <label
                key={o.slug}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle px-3 py-1.5 text-sm font-semibold has-checked:border-brand-primary has-checked:bg-brand-primary-tint"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.slug)}
                  onChange={() => toggle(o.slug)}
                  className="size-4 accent-[var(--color-brand-primary)]"
                />
                {o.city}
              </label>
            ))}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-9 rounded-full bg-brand-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : saved ? "Saved" : "Save offices"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">No appointment access.</p>
        ))}

      {/* Acciones sobre la cuenta */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
        {pending && (
          <Loader2 className="size-4 animate-spin text-brand-primary" aria-hidden="true" />
        )}

        {active && (
          <button
            type="button"
            onClick={resetPassword}
            disabled={pending}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-subtle px-3.5 text-sm font-semibold hover:border-brand-primary disabled:opacity-50"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            Reset password
          </button>
        )}

        {!isSelf &&
          (active ? (
            confirmOff ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleActive(false)}
                  disabled={pending}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-error px-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <UserX className="size-4" aria-hidden="true" />
                  Yes, revoke access
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOff(false)}
                  className="inline-flex min-h-9 items-center rounded-full px-2 text-sm"
                  aria-label="Cancel"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOff(true)}
                disabled={pending}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-error px-3.5 text-sm font-semibold text-error hover:bg-[#FDF0F0] disabled:opacity-50"
              >
                <UserX className="size-4" aria-hidden="true" />
                Deactivate
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => toggleActive(true)}
              disabled={pending}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-secondary px-3.5 text-sm font-semibold text-brand-secondary-deep hover:bg-brand-secondary-tint disabled:opacity-50"
            >
              <UserCheck className="size-4" aria-hidden="true" />
              Reactivate
            </button>
          ))}

        {isSelf && (
          <span className="text-xs text-text-secondary">
            You cannot deactivate your own account.
          </span>
        )}
      </div>

      {confirmOff && (
        <p className="mt-2 text-sm text-error">
          They will be signed out and will not be able to log in. Their name stays on every
          appointment they worked, so the history is kept.
        </p>
      )}

      {newPassword && (
        <PasswordOnce
          password={newPassword}
          title="New password set"
          onDone={() => setNewPassword(null)}
        />
      )}

      {error && (
        <p
          className="mt-2 flex items-start gap-2 rounded-xl bg-[#FDF0F0] p-3 text-sm text-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {MESSAGES[error] ?? MESSAGES.server}
        </p>
      )}
    </li>
  );
}