"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import type { Asset } from "@/types/api";
import { assetDownloadUrl, formatBytes } from "@/lib/utils-app";

interface AssetGridProps {
  assets: Asset[];
  /** Show skeleton placeholders while loading */
  loading?: boolean;
}

export function AssetGrid({ assets, loading = false }: AssetGridProps) {
  const [selected, setSelected] = useState<Asset | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {assets.map((asset) => (
          <div
            key={asset.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(asset)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(asset)}
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

      {selected && (
        <AssetDetailSheet
          asset={selected}
          open={Boolean(selected)}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </>
  );
}
