import { type LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-12 w-12 text-muted-foreground/40" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {actionLabel && actionHref && (
        <LinkButton href={actionHref} className="mt-4" variant="outline">{actionLabel}</LinkButton>
      )}
    </div>
  );
}
