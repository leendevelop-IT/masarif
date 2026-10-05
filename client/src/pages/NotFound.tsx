import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { Compass } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="card mt-10">
      <EmptyState
        icon={Compass}
        title={t.notFound.title}
        body={t.notFound.body}
        action={
          <Button
            asChild
            className="h-10 bg-primary px-5 text-primary-foreground hover:bg-primary-strong"
          >
            <Link href="/">{t.notFound.home}</Link>
          </Button>
        }
      />
    </div>
  );
}
