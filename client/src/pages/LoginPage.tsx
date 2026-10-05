import { Field } from "@/components/common/Field";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { describeError } from "@/lib/errors";
import { MIN_PASSWORD_LENGTH } from "@shared/const";
import { Check, Eye, EyeOff, Globe, Loader2, Moon, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

type Mode = "login" | "register";
type Errors = Partial<
  Record<"name" | "email" | "password" | "confirm" | "form", string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t, language, setLanguage, dir } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const pending = login.isPending || register.isPending;
  const isRegister = mode === "register";

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setConfirm("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (isRegister && !name.trim()) next.name = t.auth.errors.nameRequired;
    if (!EMAIL_PATTERN.test(trimmedEmail))
      next.email = t.auth.errors.emailInvalid;
    if (password.length < MIN_PASSWORD_LENGTH)
      next.password = t.auth.errors.passwordShort(MIN_PASSWORD_LENGTH);
    if (isRegister && confirm !== password)
      next.confirm = t.auth.errors.passwordMismatch;
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const user = isRegister
        ? await register.mutateAsync({
            name: name.trim(),
            email: trimmedEmail,
            password,
            language,
          })
        : await login.mutateAsync({ email: trimmedEmail, password });
      toast.success(t.auth.welcome(user.name || user.email));
    } catch (error) {
      setErrors({ form: describeError(error, t) });
    }
  };

  return (
    <main dir={dir} className="login-shell min-h-dvh">
      <div className="absolute end-4 top-4 flex items-center gap-1 sm:end-6 sm:top-6">
        <button
          type="button"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink"
        >
          <Globe className="size-4" />
          {t.common.switchLanguage}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t.common.toggleTheme}
          className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink"
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
      </div>

      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[1.05fr_1fr]">
        <section className="brand-panel relative m-4 hidden flex-col justify-between overflow-hidden rounded-3xl p-12 text-white lg:flex">
          <div className="flex items-center gap-3">
            <BrandMark inverse />
            <div>
              <p className="text-lg font-semibold leading-tight">
                {t.app.name}
              </p>
              <p className="text-sm text-white/70">{t.app.tagline}</p>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-[44px] font-semibold leading-[1.15] tracking-tight">
              {t.auth.brandHeadline}
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/80">
              {t.auth.brandBody}
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              {t.auth.brandPoints.map(point => (
                <li key={point} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-white/15">
                    <Check className="size-3.5" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {t.app.name}
          </p>
        </section>

        <section className="flex items-center justify-center px-4 py-20 sm:px-8">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <div>
                <p className="font-semibold leading-tight text-ink">
                  {t.app.name}
                </p>
                <p className="text-xs text-ink-3">{t.app.tagline}</p>
              </div>
            </div>

            <div className="card p-6 sm:p-8">
              <div
                className="segmented grid w-full grid-cols-2"
                role="group"
                aria-label={t.auth.modeLabel}
              >
                <button
                  type="button"
                  aria-pressed={!isRegister}
                  onClick={() => switchMode("login")}
                >
                  {t.auth.signInTitle}
                </button>
                <button
                  type="button"
                  aria-pressed={isRegister}
                  onClick={() => switchMode("register")}
                >
                  {t.auth.registerTitle}
                </button>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                {isRegister ? t.auth.registerTitle : t.auth.signInTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                {isRegister ? t.auth.registerSubtitle : t.auth.signInSubtitle}
              </p>

              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={submit}
                noValidate
              >
                {isRegister && (
                  <Field
                    label={t.auth.name}
                    htmlFor="auth-name"
                    error={errors.name}
                  >
                    <input
                      id="auth-name"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                      className="field"
                    />
                  </Field>
                )}
                <Field
                  label={t.auth.email}
                  htmlFor="auth-email"
                  error={errors.email}
                >
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    aria-invalid={Boolean(errors.email)}
                    className="field text-start"
                  />
                </Field>
                <Field
                  label={t.auth.password}
                  htmlFor="auth-password"
                  error={errors.password}
                  hint={
                    isRegister
                      ? t.auth.passwordHint(MIN_PASSWORD_LENGTH)
                      : undefined
                  }
                >
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      autoComplete={
                        isRegister ? "new-password" : "current-password"
                      }
                      dir="ltr"
                      aria-invalid={Boolean(errors.password)}
                      className="field pe-11 text-start"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={
                        showPassword ? t.auth.hidePassword : t.auth.showPassword
                      }
                      className="absolute inset-y-0 end-1 my-auto grid size-9 place-items-center rounded-md text-ink-3 hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </Field>
                {isRegister && (
                  <Field
                    label={t.auth.confirmPassword}
                    htmlFor="auth-confirm"
                    error={errors.confirm}
                  >
                    <input
                      id="auth-confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={event => setConfirm(event.target.value)}
                      autoComplete="new-password"
                      dir="ltr"
                      aria-invalid={Boolean(errors.confirm)}
                      className="field text-start"
                    />
                  </Field>
                )}

                {errors.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
                  >
                    {errors.form}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={pending}
                  className="mt-1 h-11 w-full gap-2 bg-primary text-base text-primary-foreground hover:bg-primary-strong"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {isRegister ? t.auth.register : t.auth.signIn}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-2">
                {isRegister ? t.auth.haveAccount : t.auth.noAccount}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(isRegister ? "login" : "register")}
                  className="font-semibold text-primary-strong hover:underline dark:text-primary"
                >
                  {isRegister ? t.auth.signInInstead : t.auth.createOne}
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
