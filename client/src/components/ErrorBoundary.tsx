import { AlertCircle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Last line of defence: a readable screen instead of a blank page. Copy is bilingual because locale context may be unavailable. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[UI] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center text-ink">
        <div className="card max-w-md p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-6" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">
            حدث خطأ غير متوقع · Something went wrong
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            حدّث الصفحة للمتابعة. · Refresh the page to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-strong"
          >
            تحديث · Refresh
          </button>
        </div>
      </div>
    );
  }
}
