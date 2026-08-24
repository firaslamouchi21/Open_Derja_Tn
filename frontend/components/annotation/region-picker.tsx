"use client";

import { useEffect } from "react";
import { REGIONS, type Region } from "@open-derja/shared";
import type { RegionSet } from "@open-derja/shared";
import { cn } from "../../lib/utils";

export type RegionPickerProps = {
  value: RegionSet;
  onChange: (value: RegionSet) => void;
  onUnclear?: () => void;
  className?: string;
};

const REGION_LABELS: Record<Region, string> = {
  northwest: "Northwest",
  north: "North",
  sahel: "Sahel",
  south: "South",
};

export function RegionPicker({ value, onChange, onUnclear, className }: RegionPickerProps) {
  function toggleRegion(region: Region) {
    const isSelected = value.scope === "regional" && value.region.includes(region);
    const nextRegions = isSelected
      ? value.region.filter((r) => r !== region)
      : [...value.region, region];

    onChange(
      nextRegions.length === 0
        ? { scope: "pan_tunisian", region: [] }
        : { scope: "regional", region: nextRegions },
    );
  }

  function selectPanTunisian() {
    onChange({ scope: "pan_tunisian", region: [] });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key >= "1" && event.key <= "4") {
        const region = REGIONS[Number(event.key) - 1];
        if (region) toggleRegion(region);
      } else if (event.key === "5") {
        selectPanTunisian();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {REGIONS.map((region, index) => {
        const selected = value.scope === "regional" && value.region.includes(region);
        return (
          <button
            key={region}
            type="button"
            aria-pressed={selected}
            onClick={() => toggleRegion(region)}
            className={cn(
              "rounded-[var(--radius)] border border-border px-3 py-2 text-sm",
              selected && "border-primary bg-primary/10",
            )}
          >
            {index + 1}. {REGION_LABELS[region]}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={value.scope === "pan_tunisian"}
        onClick={selectPanTunisian}
        className={cn(
          "rounded-[var(--radius)] border border-border px-3 py-2 text-sm",
          value.scope === "pan_tunisian" && "border-primary bg-primary/10",
        )}
      >
        5. Pan-Tunisian
      </button>
      {onUnclear ? (
        <button
          type="button"
          onClick={onUnclear}
          className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm text-muted-foreground"
        >
          Not sure
        </button>
      ) : null}
    </div>
  );
}
