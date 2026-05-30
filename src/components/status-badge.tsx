import type { Status } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  Applied: "bg-muted text-muted-foreground border-border",
  "Under Review": "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  "OA Received": "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  Interview: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  Rejected: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  Offer: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
