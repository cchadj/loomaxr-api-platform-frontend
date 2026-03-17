"use client";

import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString();
}

function parseDate(value: string | Date): Date {
  if (typeof value !== "string") return value;
  // Backend returns UTC timestamps without timezone suffix — append Z so JS
  // parses them as UTC rather than local time.
  const s = /[Z+\-]\d*$/.test(value) ? value : value + "Z";
  return new Date(s);
}

export function RelativeTime({ value }: { value: string | Date | undefined | null }) {
  const date = value ? parseDate(value) : null;
  const isValid = date instanceof Date && !isNaN(date.getTime());
  const [label, setLabel] = useState(() => isValid ? formatRelative(date!) : "—");

  useEffect(() => {
    if (!isValid) return;
    const interval = setInterval(() => setLabel(formatRelative(date!)), 30_000);
    return () => clearInterval(interval);
  }, [date, isValid]);

  if (!isValid) return <span className="tabular-nums">—</span>;

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="cursor-default tabular-nums">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{formatAbsolute(date!)}</TooltipContent>
    </Tooltip>
  );
}
