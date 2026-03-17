"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAssets } from "@/hooks/use-assets";
import { useWorkflows } from "@/hooks/use-workflows";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/lib/auth";
import { AssetGrid } from "@/components/assets/asset-grid";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Images, Music, Video, Box, File } from "lucide-react";
import { AuthImage } from "@/components/ui/auth-image";
import type { Asset } from "@/types/api";
import { assetDownloadUrl, formatBytes, assetFilename } from "@/lib/utils-app";

const TYPE_TABS: { value: string; label: string; icon: typeof Images }[] = [
  { value: "ALL", label: "All", icon: Images },
  { value: "IMAGE", label: "Images", icon: Images },
  { value: "AUDIO", label: "Audio", icon: Music },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "MESH", label: "Meshes", icon: Box },
  { value: "OTHER", label: "Other", icon: File },
];

function AssetListRow({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const url = assetDownloadUrl(asset.id);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
        {asset.type === "IMAGE" || asset.thumbnail_url ? (
          <AuthImage src={asset.type === "IMAGE" ? url : asset.thumbnail_url!} alt="" className="h-full w-full object-cover" />
        ) : asset.type === "AUDIO" ? <Music className="h-full w-full p-2 text-muted-foreground" />
          : asset.type === "VIDEO" ? <Video className="h-full w-full p-2 text-muted-foreground" />
          : asset.type === "MESH" ? <Box className="h-full w-full p-2 text-muted-foreground" />
          : <File className="h-full w-full p-2 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{assetFilename(asset)}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-xs">{asset.type}</Badge>
          {asset.workflow_name && (
            <span className="text-xs text-muted-foreground">{asset.workflow_name}</span>
          )}
          <span className="text-xs text-muted-foreground">{formatBytes(asset.size_bytes)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {asset.validation_status && <StatusBadge status={asset.validation_status} />}
        {asset.created_at && <RelativeTime value={asset.created_at} />}
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mine, setMine] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [validationFilter, setValidationFilter] = useState("ALL");
  const [workflowFilter, setWorkflowFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [listSelected, setListSelected] = useState<Asset | null>(null);

  const isAdmin = hasRole("ADMIN");
  const canFilterUsers = hasRole("ADMIN") || hasRole("MODERATOR");

  const effectiveMine = userFilter !== "ALL" ? false : mine && !isAdmin;
  const { data: assets, isLoading } = useAssets({
    mine: effectiveMine,
    workflow_id: workflowFilter !== "ALL" ? workflowFilter : undefined,
    user_id: userFilter !== "ALL" ? userFilter : undefined,
  });
  const { data: workflows } = useWorkflows();
  const { data: users } = useUsers();

  const selectedId = searchParams.get("selected") ?? undefined;

  const setSelectedParam = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const clearSelectedParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, router, pathname]);

  const filtered = (assets ?? [])
    .filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (validationFilter !== "ALL" && a.validation_status !== validationFilter) return false;
      if (search && !assetFilename(a).toLowerCase().includes(search.toLowerCase()) &&
          !(a.workflow_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "largest") return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      return 0;
    });

  const typeCounts = (assets ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full">
      {/* Sidebar filters */}
      <aside className="hidden w-48 shrink-0 border-r p-4 space-y-4 lg:block overflow-y-auto">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Owner</p>
          <div className="flex flex-col gap-1">
            <Button size="sm" variant={mine ? "default" : "ghost"} className="justify-start" onClick={() => setMine(true)}>Mine</Button>
            {isAdmin && (
              <Button size="sm" variant={!mine ? "default" : "ghost"} className="justify-start" onClick={() => setMine(false)}>All</Button>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Type</p>
          <div className="flex flex-col gap-1">
            {TYPE_TABS.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={typeFilter === value ? "default" : "ghost"}
                className="justify-between"
                onClick={() => setTypeFilter(value)}
              >
                <span>{label}</span>
                {value !== "ALL" && typeCounts[value] ? <Badge variant="outline" className="text-xs">{typeCounts[value]}</Badge> : null}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</p>
          <div className="flex flex-col gap-1">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
              <Button key={s} size="sm" variant={validationFilter === s ? "default" : "ghost"} className="justify-start" onClick={() => setValidationFilter(s)}>
                {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Workflow</p>
          <Select value={workflowFilter} onValueChange={(v) => v && setWorkflowFilter(v)}>
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All workflows</SelectItem>
              {(workflows ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canFilterUsers && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">User</p>
            <Select value={userFilter} onValueChange={(v) => v && setUserFilter(v)}>
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All users</SelectItem>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by filename or workflow…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={sort} onValueChange={(v) => v && setSort(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="largest">Largest first</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => setViewMode("grid")}>Grid</Button>
            <Button size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>List</Button>
          </div>
        </div>

        {!isLoading && filtered.length === 0 && (assets?.length ?? 0) > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">No results for these filters.{" "}
              <button className="underline" onClick={() => { setSearch(""); setTypeFilter("ALL"); setValidationFilter("ALL"); }}>
                Clear filters
              </button>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
          </div>
        ) : filtered.length === 0 && (assets?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Images}
            title="No assets yet"
            description="Your generated files will appear here once you run a workflow."
            actionLabel="Browse workflows →"
            actionHref="/workflows"
          />
        ) : viewMode === "grid" ? (
          <AssetGrid assets={filtered} selectedId={selectedId} onAssetSelect={setSelectedParam} onSheetClose={clearSelectedParam} />
        ) : (
          <>
            <div className="space-y-2">
              {filtered.map((asset) => (
                <AssetListRow key={asset.id} asset={asset} onClick={() => { setListSelected(asset); setSelectedParam(asset.id); }} />
              ))}
            </div>
            {listSelected && (
              <AssetDetailSheet
                asset={listSelected}
                open={Boolean(listSelected)}
                onOpenChange={(o) => { if (!o) { setListSelected(null); clearSelectedParam(); } }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
