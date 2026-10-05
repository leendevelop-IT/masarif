import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const { dir } = useLocale();

  return (
    <Sonner
      theme={theme}
      dir={dir}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "font-sans",
          title: "font-medium",
          actionButton: "font-medium",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--primary-soft)",
          "--success-text": "var(--deposit-text)",
          "--success-border": "var(--border)",
          "--error-bg": "var(--danger-soft)",
          "--error-text": "var(--danger)",
          "--error-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
