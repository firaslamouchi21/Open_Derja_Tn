import type { TagKind } from "@open-derja/shared";
import { cn } from "../../lib/utils";

const KIND_COLORS: Record<TagKind, string> = {
  scope: "bg-blue-500/15 text-blue-700",
  region: "bg-emerald-500/15 text-emerald-700",
  era: "bg-amber-500/15 text-amber-700",
  setting: "bg-violet-500/15 text-violet-700",
  register: "bg-pink-500/15 text-pink-700",
  code_switch: "bg-cyan-500/15 text-cyan-700",
  sense: "bg-orange-500/15 text-orange-700",
  quality: "bg-red-500/15 text-red-700",
};

export type TagChipProps = {
  kind: TagKind;
  value: string;
  annotatorName?: string;
  onRemove?: () => void;
  className?: string;
};

export function TagChip({ kind, value, annotatorName, onRemove, className }: TagChipProps) {
  return (
    <span
      title={annotatorName}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        KIND_COLORS[kind],
        className,
      )}
    >
      {value}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${kind} tag`}
          className="ms-1 opacity-70 hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
