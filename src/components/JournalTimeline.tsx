import { JournalEntry } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * Chronological list of the actions recorded on a package (its `journal`),
 * newest first. Shared by the employee's delivery page and the "Contrôle des
 * retours" station so both show the exact same history.
 */
export function JournalTimeline({
  entries,
  emptyText = "Aucune action enregistrée pour ce colis.",
  className,
}: {
  entries?: JournalEntry[];
  emptyText?: string;
  className?: string;
}) {
  const sorted = [...(entries ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <p className={cn("text-sm text-ink-500", className)}>{emptyText}</p>;
  }

  return (
    <ol className={cn("space-y-0", className)}>
      {sorted.map((entry, i) => {
        const isLatest = i === 0;
        const isLast = i === sorted.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", isLatest ? "bg-brand-600 ring-4 ring-brand-500/15" : "bg-ink-300")} />
              {!isLast && <span className="w-px flex-1 bg-ink-300" />}
            </div>
            <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
              <p className={cn("text-sm text-ink-900", isLatest && "font-semibold")}>{entry.text}</p>
              <p className="text-xs text-ink-500">{formatDateTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
