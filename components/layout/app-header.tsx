"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import type { Job } from "@/types/api";

const ACTIVE_STATUSES = ["QUEUED", "SUBMITTED", "RUNNING"];

export function AppHeader({ title }: { title?: string }) {
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["jobs", "active"],
    queryFn: () => apiGet("/api/jobs"),
    refetchInterval: 5000,
    select: (jobs) => jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)),
  });

  const activeCount = jobs?.length ?? 0;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b px-6">
      {title && <h1 className="text-base font-semibold">{title}</h1>}
      {activeCount > 0 && (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
          {activeCount} running
        </Badge>
      )}
    </header>
  );
}
