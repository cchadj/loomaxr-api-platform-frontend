"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkflows } from "@/hooks/use-workflows";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { WorkflowModelRequirement, WorkflowRequirementsResponse } from "@/types/api";
import { CheckSquare } from "lucide-react";

interface PendingRequirement extends WorkflowModelRequirement {
  workflow_name?: string;
  workflow_key?: string;
}

function PendingQueue() {
  const { data: pending, isLoading, refetch } = useQuery<PendingRequirement[]>({
    queryKey: ["admin", "model-requirements", "pending"],
    queryFn: () => apiGet("/api/admin/model-requirements/pending"),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function handleApprove(id: string) {
    try {
      await apiPost(`/api/admin/model-requirements/${id}/approve`);
      toast.success("Approved");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleReject(id: string) {
    try {
      await apiPost(`/api/admin/model-requirements/${id}/reject`);
      toast.success("Rejected & URL cleared");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleBatchApprove() {
    for (const id of selected) {
      await handleApprove(id);
    }
    setSelected(new Set());
  }

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!pending?.length) return (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <CheckSquare className="h-4 w-4 text-green-600" /> All model URLs have been reviewed ✓
    </p>
  );

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <Button size="sm" onClick={() => void handleBatchApprove()}>
          Approve {selected.size} selected
        </Button>
      )}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={selected.size === pending.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(pending.map((r) => r.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-3 py-2 text-left">Workflow</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Folder</th>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((req) => (
              <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(req.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(req.id);
                      else next.delete(req.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{req.workflow_name ?? "—"}</span>
                  {req.workflow_key && <code className="ml-1 text-xs text-muted-foreground">{req.workflow_key}</code>}
                </td>
                <td className="px-3 py-2"><code className="font-mono text-xs">{req.model_name}</code></td>
                <td className="px-3 py-2 text-muted-foreground">{req.folder}</td>
                <td className="px-3 py-2 max-w-xs">
                  <a href={req.download_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline truncate block">
                    {req.download_url}
                  </a>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-6 text-xs" onClick={() => void handleApprove(req.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-700 border-red-300 h-6 text-xs" onClick={() => void handleReject(req.id)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkflowRequirementsPanel() {
  const { data: workflows } = useWorkflows();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery<WorkflowRequirementsResponse>({
    queryKey: ["workflows", selectedWorkflowId, "requirements"],
    queryFn: () => apiGet(`/api/workflows/${selectedWorkflowId!}/requirements`),
    enabled: Boolean(selectedWorkflowId),
  });

  async function handleSetUrl(reqId: string) {
    try {
      await apiPatch(`/api/workflows/${selectedWorkflowId}/requirements/${reqId}`, {
        download_url: editingUrl[reqId],
      });
      toast.success("URL saved");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDownload(reqId: string) {
    setDownloading((prev) => ({ ...prev, [reqId]: true }));
    try {
      await apiPost(`/api/admin/model-requirements/${reqId}/download`);
      toast.success("Download started");
      let polls = 0;
      const interval = setInterval(async () => {
        polls++;
        await refetch();
        if (polls > 40) {
          clearInterval(interval);
          setDownloading((prev) => ({ ...prev, [reqId]: false }));
        }
      }, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setDownloading((prev) => ({ ...prev, [reqId]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <Select value={selectedWorkflowId ?? ""} onValueChange={setSelectedWorkflowId}>
            <SelectTrigger>
              <SelectValue placeholder="Select workflow…" />
            </SelectTrigger>
            <SelectContent>
              {(workflows ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedWorkflowId && (
          <Button size="sm" variant="outline" onClick={() => void refetch()}>Check availability</Button>

        )}
      </div>

      {selectedWorkflowId && isLoading && (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      )}

      {data && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-left">Folder</th>
                <th className="px-3 py-2 text-left">Available</th>
                <th className="px-3 py-2 text-left">URL</th>
                <th className="px-3 py-2 text-left">Approval</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.requirements.map((req) => (
                <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2"><code className="font-mono text-xs">{req.model_name}</code></td>
                  <td className="px-3 py-2 text-muted-foreground">{req.folder}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={req.available === true ? "AVAILABLE" : req.available === false ? "MISSING" : "UNKNOWN"} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Input
                        value={editingUrl[req.id] ?? req.download_url ?? ""}
                        onChange={(e) => setEditingUrl((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="text-xs w-48"
                        placeholder="https://…"
                      />
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => void handleSetUrl(req.id)}>Set</Button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {req.url_approved ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Approved</Badge>
                    ) : req.download_url ? (
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pending</Badge>
                    ) : (
                      <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs">No URL</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {req.url_approved && !req.available && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        disabled={downloading[req.id]}
                        onClick={() => void handleDownload(req.id)}
                      >
                        {downloading[req.id] ? "Downloading…" : "Download"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminModelsPage() {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-semibold">Model Requirements</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingQueue />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Requirements by Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowRequirementsPanel />
        </CardContent>
      </Card>
    </div>
  );
}
