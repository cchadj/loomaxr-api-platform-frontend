"use client";

import { use } from "react";
import { useWorkflow } from "@/hooks/use-workflows";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";

export default function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: workflow, isLoading, error } = useWorkflow(id);

  if (isLoading) return <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>;
  if (error) return <div className="p-6"><QueryError error={error} /></div>;
  if (!workflow) return null;

  return <WorkflowBuilder existingWorkflow={workflow} />;
}
