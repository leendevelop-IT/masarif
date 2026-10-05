import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/hooks/useAuth";
import { describeError } from "@/lib/errors";
import { toAsciiDigits } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function PinGate({ onUnlocked }: { onUnlocked: () => void }) {
  const { t, dir } = useLocale();
  const { logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const verify = trpc.finance.verifyPin.useMutation({
    onSuccess: onUnlocked,
    onError: mutationError => {
      setPin("");
      setError(describeError(mutationError, t));
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      setError(t.pin.invalid);
      return;
    }
    setError(null);
    verify.mutate({ pin });
  };

  return (
    <main
      dir={dir}
      className="login-shell grid min-h-dvh place-items-center p-5"
    >
      <form onSubmit={submit} className="card w-full max-w-sm p-8 text-center">
        <BrandMark className="mx-auto" />
        <span className="mx-auto mt-6 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-strong dark:text-primary">
          <LockKeyhole className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">{t.pin.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{t.pin.body}</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={pin}
          onChange={event =>
            setPin(
              toAsciiDigits(event.target.value).replace(/\D/g, "").slice(0, 8)
            )
          }
          placeholder={t.pin.placeholder}
          aria-label={t.settings.security.newPin}
          aria-invalid={Boolean(error)}
          dir="ltr"
          className="field mt-6 h-14 text-center text-2xl tracking-[0.5em]"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={verify.isPending}
          className="mt-4 h-11 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary-strong"
        >
          {verify.isPending && <Loader2 className="size-4 animate-spin" />}
          {t.pin.unlock}
        </Button>
        <button
          type="button"
          onClick={() => {
            logout()
              .then(() => toast.success(t.auth.signedOut))
              .catch(() => {
                // The local session is cleared regardless.
              });
          }}
          className="mt-5 text-sm text-ink-3 hover:text-ink"
        >
          {t.pin.signOutInstead}
        </button>
      </form>
    </main>
  );
}
