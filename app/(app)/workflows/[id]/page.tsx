"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkflow } from "@/hooks/use-workflows";
import { useAssets } from "@/hooks/use-assets";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { CopyButton } from "@/components/shared/copy-button";
import { QueryError } from "@/components/shared/query-error";
import { RunWorkflowForm } from "@/components/workflows/run-workflow-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Edit, ExternalLink, Images } from "lucide-react";
import type { WorkflowRequirementsResponse, Asset } from "@/types/api";
import { shortId, assetDownloadUrl } from "@/lib/utils-app";
import { AssetCard } from "@/components/assets/asset-card";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";

function ModelRequirementsPanel({ workflowId }: { workflowId: string }) {
  const { hasRole } = useAuth();
  const { data, isLoading, refetch } = useQuery<WorkflowRequirementsResponse>({
    queryKey: ["workflows", workflowId, "requirements"],
    queryFn: () => apiGet(`/api/workflows/${workflowId}/requirements`),
  });

  const [editingUrl, setEditingUrl] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  async function handleSetUrl(reqId: string) {
    try {
      await apiPatch(`/api/workflows/${workflowId}/requirements/${reqId}`, {
        download_url: editingUrl[reqId],
      });
      toast.success("URL saved");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save URL");
    }
  }

  async function handleApprove(reqId: string) {
    try {
      await apiPost(`/api/admin/model-requirements/${reqId}/approve`);
      toast.success("Approved");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleReject(reqId: string) {
    try {
      await apiPost(`/api/admin/model-requirements/${reqId}/reject`);
      toast.success("Rejected & URL cleared");
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
      // Poll every 3s for up to 2 min
      let polls = 0;
      const interval = setInterval(async () => {
        polls++;
        await refetch();
        const req = data?.requirements.find((r) => r.id === reqId);
        if (req?.available || polls > 40) {
          clearInterval(interval);
          setDownloading((prev) => ({ ...prev, [reqId]: false }));
        }
      }, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setDownloading((prev) => ({ ...prev, [reqId]: false }));
    }
  }

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!data?.requirements?.length) return <p className="text-sm text-muted-foreground">No model requirements for this workflow.</p>;

  return (
    <div className="space-y-3">
      {!data.all_available && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Missing models: {data.missing.join(", ")}
        </div>
      )}
      {data.requirements.map((req) => (
        <Card key={req.id}>
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <code className="text-sm font-mono font-medium">{req.model_name}</code>
                <span className="ml-2 text-xs text-muted-foreground">{req.folder}</span>
              </div>
              <StatusBadge status={req.available === true ? "AVAILABLE" : req.available === false ? "MISSING" : "UNKNOWN"} />
            </div>

            {(hasRole("WORKFLOW_CREATOR") || hasRole("ADMIN")) && (
              <div className="flex gap-2">
                <Input
                  placeholder="https://huggingface.co/…"
                  value={editingUrl[req.id] ?? req.download_url ?? ""}
                  onChange={(e) => setEditingUrl((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => void handleSetUrl(req.id)}>
                  Set URL
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {req.url_approved ? (
                <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Approved{req.approved_at ? ` on ${new Date(req.approved_at).toLocaleDateString()}` : ""}
                </Badge>
              ) : req.download_url ? (
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pending approval</Badge>
              ) : (
                <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs">No URL</Badge>
              )}

              {(hasRole("MODERATOR") || hasRole("ADMIN")) && req.download_url && !req.url_approved && (
                <>
                  <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => void handleApprove(req.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => void handleReject(req.id)}>
                    Reject
                  </Button>
                </>
              )}

              {hasRole("ADMIN") && req.url_approved && !req.available && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloading[req.id]}
                  onClick={() => void handleDownload(req.id)}
                >
                  {downloading[req.id] ? "Downloading…" : "Download"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkflowAssetsPanel({ workflowId }: { workflowId: string }) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { data: assets, isLoading } = useAssets({ mine: false, workflow_id: workflowId });

  if (isLoading) return <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}</div>;
  if (!assets?.length) return <EmptyState icon={Images} title="No assets yet" description="Assets generated by jobs for this workflow will appear here." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
        ))}
      </div>
      {selectedAsset && (
        <AssetDetailSheet
          asset={selectedAsset}
          open={Boolean(selectedAsset)}
          onOpenChange={(o) => !o && setSelectedAsset(null)}
        />
      )}
    </>
  );
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const { data: workflow, isLoading, error } = useWorkflow(id);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  if (isLoading) return <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>;
  if (error) return <div className="p-6"><QueryError error={error} /></div>;
  if (!workflow) return null;

  const currentVersion = workflow.versions?.find(v => v.id === workflow.current_version_id) ?? workflow.versions?.[0];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{workflow.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground">{workflow.key}</code>
            <CopyButton value={workflow.key} />
            {currentVersion && <Badge variant="outline">v{currentVersion.version_number}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {hasRole("JOB_CREATOR") && null /* Run is in the tab */}
          {hasRole("WORKFLOW_CREATOR") && (
            <LinkButton href={`/workflows/${id}/edit`} size="sm" variant="outline">
              <Edit className="mr-1 h-3 w-3" /> Edit
            </LinkButton>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasRole("JOB_CREATOR") && <TabsTrigger value="run">Run</TabsTrigger>}
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4 max-w-2xl">
            {workflow.description && <p className="text-sm text-muted-foreground">{workflow.description}</p>}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Created by</dt>
              <dd>{workflow.author ?? shortId(workflow.author_id ?? "")}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd><RelativeTime value={workflow.created_at} /></dd>
              <dt className="text-muted-foreground">Version</dt>
              <dd>v{currentVersion?.version_number ?? "—"}</dd>
              {currentVersion?.change_note && (
                <>
                  <dt className="text-muted-foreground">Change note</dt>
                  <dd>{currentVersion.change_note}</dd>
                </>
              )}
            </dl>
          </div>
        </TabsContent>

        {hasRole("JOB_CREATOR") && (
          <TabsContent value="run">
            <div className="max-w-xl">
              <RunWorkflowForm workflow={workflow} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="versions">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Change note</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Inputs</th>
                </tr>
              </thead>
              <tbody>
                {(workflow.versions ?? []).map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Badge variant="outline">v{v.version_number}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{v.change_note ?? "—"}</td>
                    <td className="px-3 py-2"><RelativeTime value={v.created_at} /></td>
                    <td className="px-3 py-2">{v.inputs_schema_json?.length ?? 0} inputs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="requirements">
          <ModelRequirementsPanel workflowId={id} />
        </TabsContent>

        <TabsContent value="assets">
          <WorkflowAssetsPanel workflowId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
