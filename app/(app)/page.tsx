"use client";

import Link from "next/link";
import { useJobs } from "@/hooks/use-jobs";
import { useAssets } from "@/hooks/use-assets";
import { useComfyHealth } from "@/hooks/use-health";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { assetDownloadUrl } from "@/lib/utils-app";
import {
  Activity,
  Image as ImageIcon,
  BriefcaseBusiness,
  ShieldAlert,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs({ mine: true });
  const { data: assets, isLoading: assetsLoading } = useAssets({ mine: true });
  const { data: health } = useComfyHealth();

  const runningJobs = jobs?.filter((j) => ["QUEUED", "SUBMITTED", "RUNNING"].includes(j.status)) ?? [];
  const recentJobs = jobs?.slice(0, 5) ?? [];
  const recentAssets = assets?.slice(0, 8) ?? [];
  const pendingAssets = assets?.filter((a) => a.validation_status === "PENDING") ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {health ? (
            <Badge
              variant="outline"
              className={health.healthy ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
            >
              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${health.healthy ? "bg-green-500" : "bg-red-500"} inline-block`} />
              ComfyUI {health.healthy ? "healthy" : "unreachable"}
            </Badge>
          ) : (
            <Skeleton className="h-6 w-32" />
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BriefcaseBusiness className="h-3 w-3" /> Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? <Skeleton className="h-7 w-12" /> : <span className="text-2xl font-bold">{jobs?.length ?? 0}</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" /> Running Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? <Skeleton className="h-7 w-12" /> : (
              <span className={`text-2xl font-bold ${runningJobs.length > 0 ? "text-blue-600 animate-pulse" : ""}`}>
                {runningJobs.length}
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetsLoading ? <Skeleton className="h-7 w-12" /> : <span className="text-2xl font-bold">{assets?.length ?? 0}</span>}
          </CardContent>
        </Card>

        {(hasRole("MODERATOR") || hasRole("ADMIN")) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assetsLoading ? <Skeleton className="h-7 w-12" /> : (
                <span className={`text-2xl font-bold ${pendingAssets.length > 0 ? "text-amber-600" : ""}`}>
                  {pendingAssets.length}
                </span>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Jobs</h2>
          <LinkButton href="/jobs" variant="ghost" size="sm" className="text-xs">View all →</LinkButton>
        </div>
        {jobsLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : recentJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs yet.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Workflow</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link href={`/jobs/${job.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {job.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/workflows/${job.workflow_id}`} className="hover:underline">
                        {job.workflow_name ?? job.workflow_id.slice(0, 8)}
                      </Link>
                      {job.version_number && (
                        <Badge variant="outline" className="ml-1 text-xs">v{job.version_number}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                    <td className="px-3 py-2"><RelativeTime value={job.submitted_at} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent assets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Assets</h2>
          <LinkButton href="/assets" variant="ghost" size="sm" className="text-xs">View all →</LinkButton>
        </div>
        {assetsLoading ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
          </div>
        ) : recentAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {recentAssets.map((asset) => (
              <Link key={asset.id} href={`/assets?selected=${asset.id}`} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                {asset.type === "IMAGE" ? (
                  <img
                    src={assetDownloadUrl(asset.id)}
                    alt={asset.filename ?? "asset"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {hasRole("JOB_CREATOR") && (
          <LinkButton href="/workflows" variant="outline" size="sm">
            <Zap className="mr-1 h-3 w-3" /> Run a workflow
          </LinkButton>
        )}
        <LinkButton href="/assets" variant="outline" size="sm">View all assets</LinkButton>
        {(hasRole("MODERATOR") || hasRole("ADMIN")) && pendingAssets.length > 0 && (
          <LinkButton href="/assets?filter=PENDING" variant="outline" size="sm" className="border-amber-300 text-amber-700">
            Review {pendingAssets.length} pending →
          </LinkButton>
        )}
      </div>
    </div>
  );
}
