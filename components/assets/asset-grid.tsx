"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
import { AuthImage } from "@/components/ui/auth-image";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import type { Asset } from "@/types/api";
import { assetDownloadUrl, formatBytes } from "@/lib/utils-app";

interface AssetGridProps {
  assets: Asset[];
  /** Show skeleton placeholders while loading */
  loading?: boolean;
  /** Pre-open the detail sheet for an asset with this ID (e.g. from URL ?selected=) */
  selectedId?: string;
  /** Called when the detail sheet is closed */
  onSheetClose?: () => void;
  /** Called when an asset is selected */
  onAssetSelect?: (id: string) => void;
}

export function AssetGrid({ assets, loading = false, selectedId, onSheetClose, onAssetSelect }: AssetGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selected = selectedIndex !== null ? (assets[selectedIndex] ?? null) : null;

  useEffect(() => {
    if (!selectedId || assets.length === 0) return;
    const idx = assets.findIndex((a) => a.id === selectedId);
    if (idx !== -1) setSelectedIndex(idx);
  }, [selectedId, assets]);

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
        {assets.map((asset, i) => (
          <div
            key={asset.id}
            role="button"
            tabIndex={0}
            onClick={() => { setSelectedIndex(i); onAssetSelect?.(asset.id); }}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (setSelectedIndex(i), onAssetSelect?.(asset.id))}
            className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-pointer"
          >
            {asset.type === "IMAGE" || asset.thumbnail_url ? (
              <AuthImage
                src={asset.type === "IMAGE" ? assetDownloadUrl(asset.id) : asset.thumbnail_url!}
                alt={asset.filename ?? "asset"}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
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
          onOpenChange={(o) => {
            if (!o) {
              setSelectedIndex(null);
              onSheetClose?.();
            }
          }}
          hasPrev={selectedIndex !== null && selectedIndex > 0}
          hasNext={selectedIndex !== null && selectedIndex < assets.length - 1}
          onPrev={() => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedIndex((i) => (i !== null && i < assets.length - 1 ? i + 1 : i))}
        />
      )}
    </>
  );
}
