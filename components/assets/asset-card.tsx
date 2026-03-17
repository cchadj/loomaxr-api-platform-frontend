"use client";

import { useState } from "react";
import { Music, Video, Box, File } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { MeshGridPreview } from "@/components/assets/mesh-grid-preview";
import type { Asset } from "@/types/api";
import { assetDownloadUrl, assetFilename } from "@/lib/utils-app";

export function AssetCard({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const url = assetDownloadUrl(asset.id);
  const [hovering, setHovering] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative aspect-square overflow-hidden rounded-md border bg-muted text-left w-full"
    >
      {asset.type === "IMAGE" ? (
        <img
          src={url}
          alt={assetFilename(asset)}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1">
          {asset.type === "AUDIO" ? <Music className="h-8 w-8 text-muted-foreground" />
            : asset.type === "VIDEO" ? <Video className="h-8 w-8 text-muted-foreground" />
            : asset.type === "MESH" ? <Box className="h-8 w-8 text-muted-foreground" />
            : <File className="h-8 w-8 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{asset.type}</span>
        </div>
      )}
      {asset.type === "MESH" && (
        <MeshGridPreview src={url} alt={assetFilename(asset)} hovered={hovering} />
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col items-start justify-end bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 p-2">
        <p className="text-xs text-white truncate w-full">
          {asset.author ?? "unknown"} · {asset.workflow_name ?? ""}
        </p>
        {asset.created_at && (
          <p className="text-xs text-white/70"><RelativeTime value={asset.created_at} /></p>
        )}
      </div>
      {/* Validation badge */}
      <div className="absolute top-1 right-1">
        {asset.validation_status && <StatusBadge status={asset.validation_status} className="text-xs py-0" />}
      </div>
    </button>
  );
}
