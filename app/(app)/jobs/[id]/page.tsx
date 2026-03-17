"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useJob, useCancelJob, useCreateJob } from "@/hooks/use-jobs";
import { useAssets } from "@/hooks/use-assets";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { CopyButton } from "@/components/shared/copy-button";
import { QueryError } from "@/components/shared/query-error";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Image as ImageIcon } from "lucide-react";
import { assetDownloadUrl, formatBytes, formatDuration, shortId } from "@/lib/utils-app";
import type { Asset } from "@/types/api";

const ACTIVE_STATUSES = ["QUEUED", "SUBMITTED", "RUNNING"];

function JobTimeline({ job }: { job: ReturnType<typeof useJob>["data"] }) {
  if (!job) return null;
  const events: Array<{ label: string; time: string }> = [
    { label: "Created / Queued", time: job.submitted_at },
  ];
  if (job.start_time) events.push({ label: "Running", time: job.start_time });
  if (job.end_time) events.push({ label: job.status, time: job.end_time });

  return (
    <div className="space-y-2">
      {events.map((ev, i) => {
        const prev = i > 0 ? new Date(events[i - 1].time) : null;
        const curr = new Date(ev.time);
        const delta = prev ? Math.floor((curr.getTime() - prev.getTime()) / 1000) : null;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{ev.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(ev.time).toLocaleTimeString()}
                {delta !== null && <span className="ml-1">(+{delta}s)</span>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: job, isLoading, error } = useJob(id);
  const { data: assets } = useAssets({ mine: false });
  const cancelMutation = useCancelJob();
  const createJobMutation = useCreateJob();

  const [showCancel, setShowCancel] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const jobAssets = (assets ?? []).filter((a) => a.job_id === id);
  const isActive = job && ACTIVE_STATUSES.includes(job.status);

  // Refetch assets as soon as the job transitions to GENERATED
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = job?.status;
    if (job?.status === "GENERATED" && prev !== undefined && prev !== "GENERATED") {
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  }, [job?.status, queryClient]);

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Job cancelled");
      setShowCancel(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    }
  }

  async function handleRerun() {
    if (!job) return;
    const params: Record<string, unknown> = {};
    for (const iv of job.input_values ?? []) {
      params[iv.input_id] = iv.value_json;
    }
    try {
      const newJob = await createJobMutation.mutateAsync({
        workflow_id: job.workflow_id,
        params,
      });
      toast.success("Job requeued");
      window.location.href = `/jobs/${newJob.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rerun");
    }
  }

  if (isLoading) return <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (error) return <div className="p-6"><QueryError error={error} /></div>;
  if (!job) return null;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Job</h1>
        <code className="font-mono text-sm text-muted-foreground">{shortId(id)}</code>
        <CopyButton value={id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column — Status */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} className="text-sm px-3 py-1" />
              {isActive && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatDuration(job.start_time ?? job.submitted_at)}
                </span>
              )}
              {!isActive && job.start_time && (
                <span className="text-sm text-muted-foreground">
                  {formatDuration(job.start_time, job.end_time)}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Workflow</dt>
              <dd>
                <Link href={`/workflows/${job.workflow_id}`} className="hover:underline">
                  {job.workflow_name ?? shortId(job.workflow_id)}
                </Link>
                {job.version_number && <Badge variant="outline" className="ml-1 text-xs">v{job.version_number}</Badge>}
              </dd>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd><RelativeTime value={job.submitted_at} /></dd>
              <dt className="text-muted-foreground">By</dt>
              <dd>{job.username ?? shortId(job.user_id)}</dd>
            </dl>

            {job.status === "FAILED" && job.error_message && (
              <details className="rounded-md border border-red-200">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-700 bg-red-50">
                  Error details
                </summary>
                <pre className="overflow-auto p-3 text-xs text-red-700">{job.error_message}</pre>
              </details>
            )}

            <div className="flex gap-2 flex-wrap">
              {isActive && (
                <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => setShowCancel(true)}>
                  Cancel
                </Button>
              )}
              {hasRole("JOB_CREATOR") && !isActive && (
                <Button size="sm" variant="outline" onClick={() => void handleRerun()} disabled={createJobMutation.isPending}>
                  Rerun with same inputs
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column — Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <JobTimeline job={job} />
            {(job.input_values ?? []).length > 0 && (
              <div className="mt-4 space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">Inputs</p>
                {(job.input_values ?? []).map((iv) => (
                  <div key={iv.input_id} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-muted-foreground">{iv.input_id}:</span>
                    <span className="truncate">{String(iv.value_json)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assets — full-width below both cards */}
      {(job.status === "GENERATED" || jobAssets.length > 0) && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Generated Assets</h2>
          {jobAssets.length === 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {jobAssets.map((asset) => (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedAsset(asset)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedAsset(asset)}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-pointer"
                >
                  {asset.type === "IMAGE" ? (
                    <img
                      src={assetDownloadUrl(asset.id)}
                      alt={asset.filename ?? "asset"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{asset.type}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {formatBytes(asset.size_bytes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel Job"
        description="Cancel this job? It may already be running in ComfyUI."
        confirmLabel="Cancel Job"
        destructive
        onConfirm={() => void handleCancel()}
      />

      {selectedAsset && (
        <AssetDetailSheet
          asset={selectedAsset}
          open={Boolean(selectedAsset)}
          onOpenChange={(o) => !o && setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
