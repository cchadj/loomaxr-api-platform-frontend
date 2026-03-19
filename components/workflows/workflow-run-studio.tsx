"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Images, Loader2 } from "lucide-react";
import { RunWorkflowForm } from "@/components/workflows/run-workflow-form";
import { AssetGrid } from "@/components/assets/asset-grid";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/shared/share-button";
import { EmptyState } from "@/components/shared/empty-state";
import { useJob } from "@/hooks/use-jobs";
import { useAssets } from "@/hooks/use-assets";
import type { Workflow, Job } from "@/types/api";
import { shortId } from "@/lib/utils-app";

// Polls one active job and fires callbacks on terminal status
function ActiveJobMonitor({
  jobId,
  onDone,
  onFailed,
}: {
  jobId: string;
  onDone: (jobId: string) => void;
  onFailed: (jobId: string, msg?: string) => void;
}) {
  const { data: job } = useJob(jobId);

  useEffect(() => {
    if (!job) return;
    if (job.status === "GENERATED") onDone(jobId);
    else if (job.status === "FAILED") onFailed(jobId, job.error_message ?? undefined);
    else if (job.status === "CANCELLED") onFailed(jobId, "Job was cancelled");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  return null;
}

interface WorkflowRunStudioProps {
  workflow: Workflow;
}

export function WorkflowRunStudio({ workflow }: WorkflowRunStudioProps) {
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading: assetsLoading } = useAssets({
    mine: false,
    workflow_id: workflow.id,
  });

  function handleJobCreated(job: Job) {
    setActiveJobIds((prev) => [...prev, job.id]);
  }

  function handleJobDone(jobId: string) {
    void queryClient.invalidateQueries({ queryKey: ["assets"] });
    setActiveJobIds((prev) => prev.filter((id) => id !== jobId));
    toast.success("Done!");
  }

  function handleJobFailed(jobId: string, msg?: string) {
    setActiveJobIds((prev) => prev.filter((id) => id !== jobId));
    toast.error(msg ?? "Job failed");
  }

  const totalCount = assets.length + activeJobIds.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Thin header */}
      <div className="flex items-center gap-3 border-b px-4 py-2 shrink-0">
        <Link
          href={`/workflows/${workflow.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="font-semibold text-sm truncate">{workflow.name}</span>
          {workflow.description && (
            <span className="hidden truncate text-sm text-muted-foreground sm:block">
              {workflow.description}
            </span>
          )}
        </div>
        <ShareButton
          path={`/workflows/${workflow.id}/run`}
          title={workflow.name}
          description={workflow.description}
          author={workflow.author}
          variant="button"
        />
      </div>

      {/* Split body */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel — form (~400px) */}
        <div className="w-[400px] shrink-0 overflow-y-auto border-r p-5">
          <RunWorkflowForm workflow={workflow} onSuccess={handleJobCreated} />
        </div>

        {/* Right panel — gallery */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
          {/* Gallery header */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold">Outputs</span>
            {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
          </div>

          {/* Monitor each active job (renders nothing visible) */}
          {activeJobIds.map((id) => (
            <ActiveJobMonitor
              key={id}
              jobId={id}
              onDone={handleJobDone}
              onFailed={handleJobFailed}
            />
          ))}

          {/* Pending tiles + asset grid share the same column structure */}
          {activeJobIds.length > 0 && (
            <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {activeJobIds.map((id) => (
                <div key={id} className="aspect-square animate-pulse rounded-md border bg-muted flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Generating…</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{shortId(id)}</span>
                </div>
              ))}
            </div>
          )}

          <AssetGrid assets={assets} loading={assetsLoading} />

          {activeJobIds.length === 0 && !assetsLoading && assets.length === 0 && (
            <EmptyState
              icon={Images}
              title="No outputs yet"
              description="Run the workflow to generate your first result."
            />
          )}
        </div>
      </div>
    </div>
  );
}
