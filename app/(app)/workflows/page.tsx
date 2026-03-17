"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useWorkflows, useDuplicateWorkflow, useDeleteWorkflow } from "@/hooks/use-workflows";
import { apiGet } from "@/lib/api";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { RelativeTime } from "@/components/shared/relative-time";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RunWorkflowSheet } from "@/components/workflows/run-workflow-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Workflow, Play, Pencil, Copy, Trash2 } from "lucide-react";
import type { Workflow as WorkflowType, WorkflowRequirementsResponse } from "@/types/api";
import { shortId } from "@/lib/utils-app";

function useWorkflowStatus(workflowId: string) {
  return useQuery<WorkflowRequirementsResponse>({
    queryKey: ["workflows", workflowId, "requirements"],
    queryFn: () => apiGet(`/api/workflows/${workflowId}/requirements`),
    staleTime: 30_000,
  });
}

function WorkflowStatusBadge({ workflowId }: { workflowId: string }) {
  const { data, isLoading } = useWorkflowStatus(workflowId);
  if (isLoading) return <Skeleton className="h-5 w-16" />;
  if (!data) return <StatusBadge status="UNKNOWN" />;
  if (data.all_available) return <StatusBadge status="AVAILABLE" />;
  return <StatusBadge status="MISSING" />;
}

export default function WorkflowsPage() {
  const { hasRole } = useAuth();
  const { data: workflows, isLoading } = useWorkflows();
  const deleteMutation = useDeleteWorkflow();
  const duplicateMutation = useDuplicateWorkflow();

  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkflowType | null>(null);
  const [dupTarget, setDupTarget] = useState<WorkflowType | null>(null);
  const [dupKey, setDupKey] = useState("");
  const [dupName, setDupName] = useState("");
  const [runTarget, setRunTarget] = useState<WorkflowType | null>(null);

  const filtered = (workflows ?? []).filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.key.toLowerCase().includes(search.toLowerCase())
  );

  function openDuplicate(w: WorkflowType) {
    setDupTarget(w);
    setDupKey(`${w.key}_copy`);
    setDupName(`${w.name} (Copy)`);
  }

  async function handleDuplicate() {
    if (!dupTarget) return;
    try {
      await duplicateMutation.mutateAsync({ id: dupTarget.id, body: { key: dupKey, name: dupName } });
      toast.success("Workflow duplicated");
      setDupTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Workflow deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Workflows</h1>
        {hasRole("WORKFLOW_CREATOR") && (
          <LinkButton href="/workflows/new" size="sm">
            <Plus className="mr-1 h-4 w-4" /> New Workflow
          </LinkButton>
        )}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name or key…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description={hasRole("WORKFLOW_CREATOR") ? "Create your first workflow to get started." : "No workflows available."}
          actionLabel={hasRole("WORKFLOW_CREATOR") ? "Create workflow" : undefined}
          actionHref={hasRole("WORKFLOW_CREATOR") ? "/workflows/new" : undefined}
        />
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Key</th>
                <th className="px-3 py-2 text-left">Ver</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/workflows/${w.id}`)}>
                  <td className="px-3 py-2 font-medium">{w.name}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs">{w.key}</code>
                      <CopyButton value={w.key} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-xs">
                      v{(w.versions?.find(v => v.id === w.current_version_id) ?? w.versions?.[0])?.version_number ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{w.author ?? shortId(w.author_id ?? "")}</td>
                  <td className="px-3 py-2"><WorkflowStatusBadge workflowId={w.id} /></td>
                  <td className="px-3 py-2"><RelativeTime value={w.created_at} /></td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {hasRole("JOB_CREATOR") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => setRunTarget(w)}
                        >
                          <Play className="h-3 w-3" /> Run
                        </Button>
                      )}
                      {hasRole("WORKFLOW_CREATOR") && (
                        <LinkButton
                          href={`/workflows/${w.id}/edit`}
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </LinkButton>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7")}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasRole("WORKFLOW_CREATOR") && (
                            <DropdownMenuItem onClick={() => openDuplicate(w)}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                            </DropdownMenuItem>
                          )}
                          {hasRole("WORKFLOW_CREATOR") && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteTarget(w)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Duplicate dialog */}
      <Dialog open={Boolean(dupTarget)} onOpenChange={(o) => !o && setDupTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duplicate Workflow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New Key</Label>
              <Input value={dupKey} onChange={(e) => setDupKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>New Name</Label>
              <Input value={dupName} onChange={(e) => setDupName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupTarget(null)}>Cancel</Button>
            <Button onClick={() => void handleDuplicate()} disabled={duplicateMutation.isPending}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Workflow"
        description="This will delete all versions. Jobs and assets from this workflow will also be deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
      />

      {/* Run sheet */}
      {runTarget && (
        <RunWorkflowSheet
          workflow={runTarget}
          open={Boolean(runTarget)}
          onOpenChange={(o) => !o && setRunTarget(null)}
        />
      )}
    </div>
  );
}
