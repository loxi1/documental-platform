import { getDocumentStatus } from "@/constants/status";
import { cn } from "@/lib/utils";

type DocumentStatusBadgeProps = {
  estado?: string | null;
  className?: string;
  showIcon?: boolean;
};

export function DocumentStatusBadge({ estado, className, showIcon = true }: DocumentStatusBadgeProps) {
  const visual = getDocumentStatus(estado);
  const Icon = visual.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full", visual.className, className)}>
      {showIcon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {visual.label}
    </span>
  );
}
