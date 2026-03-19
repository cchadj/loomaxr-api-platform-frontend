"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useWorkflow } from "@/hooks/use-workflows";
import { useAuth } from "@/lib/auth";
import { WorkflowRunStudio } from "@/components/workflows/workflow-run-studio";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";

export default function WorkflowRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, hasRole, loading: authLoading } = useAuth();
  const { data: workflow, isLoading, error } = useWorkflow(id);

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <QueryError error={error} />
      </div>
    );
  }

  if (!workflow) return null;

  const canRun =
    hasRole("JOB_CREATOR") ||
    hasRole("ADMIN") ||
    (user?.id != null && user.id === workflow.author_id);

  if (!canRun) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-lg font-semibold">Access denied</p>
        <p className="text-sm text-muted-foreground">
          You need the <code>job_creator</code> role to run workflows.
        </p>
        <Link
          href={`/workflows/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workflow
        </Link>
      </div>
    );
  }

  return <WorkflowRunStudio workflow={workflow} />;
}
