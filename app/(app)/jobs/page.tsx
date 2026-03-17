"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJobs, useCancelJob } from "@/hooks/use-jobs";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefcaseBusiness } from "lucide-react";
import type { Job } from "@/types/api";
import { formatDuration, shortId } from "@/lib/utils-app";
import { toast } from "sonner";

const STATUS_TABS = ["ALL", "QUEUED", "RUNNING", "GENERATED", "FAILED", "CANCELLED"] as const;
const ACTIVE_STATUSES = ["QUEUED", "SUBMITTED", "RUNNING"];

function ElapsedTimer({ startTime }: { startTime?: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  if (!startTime) return null;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="text-xs text-muted-foreground tabular-nums">{m}m {s}s</span>;
}

export default function JobsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null);

  const { data: jobs, isLoading } = useJobs({ mine: mine && !hasRole("ADMIN") ? true : mine });
  const cancelMutation = useCancelJob();

  const filtered = (jobs ?? []).filter((j) => {
    const matchStatus = statusFilter === "ALL" || j.status === statusFilter || (statusFilter === "RUNNING" && ACTIVE_STATUSES.includes(j.status));
    const matchSearch = !search || (j.workflow_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const activeCount = (jobs ?? []).filter((j) => ACTIVE_STATUSES.includes(j.status)).length;

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      toast.success("Job cancelled");
      setCancelTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Jobs</h1>
        {activeCount > 0 && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
            {activeCount} running
          </Badge>
        )}
        {hasRole("ADMIN") && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant={mine ? "default" : "outline"} onClick={() => setMine(true)}>My jobs</Button>
            <Button size="sm" variant={!mine ? "default" : "outline"} onClick={() => setMine(false)}>All jobs</Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-3 flex-wrap items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by workflow…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No jobs yet"
          description="Pick a workflow and run it to see your jobs here."
          actionLabel="Browse workflows →"
          actionHref="/workflows"
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Workflow</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Progress</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Duration</th>
                <th className="px-3 py-2 text-left">Assets</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/jobs/${job.id}`)}>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link href={`/jobs/${job.id}`} className="font-mono text-xs hover:underline">
                        {shortId(job.id)}
                      </Link>
                      <CopyButton value={job.id} />
                    </div>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/workflows/${job.workflow_id}`} className="hover:underline">
                      {job.workflow_name ?? shortId(job.workflow_id)}
                    </Link>
                    {job.version_number && (
                      <Badge variant="outline" className="ml-1 text-xs">v{job.version_number}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                  <td className="px-3 py-2">
                    {ACTIVE_STATUSES.includes(job.status) ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-full animate-[shimmer_1.5s_infinite] bg-blue-400 opacity-70" />
                        </div>
                        <ElapsedTimer startTime={job.start_time ?? job.submitted_at} />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2"><RelativeTime value={job.submitted_at} /></td>
                  <td className="px-3 py-2 tabular-nums">
                    {job.end_time ? formatDuration(job.start_time, job.end_time) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {job.status === "GENERATED" && job.asset_count ? (
                      <Badge variant="outline" className="text-xs">{job.asset_count}</Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {ACTIVE_STATUSES.includes(job.status) && (
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setCancelTarget(job)}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel Job"
        description="Cancel this job? It may already be running in ComfyUI."
        confirmLabel="Cancel Job"
        destructive
        onConfirm={() => void handleCancel()}
      />
    </div>
  );
}
