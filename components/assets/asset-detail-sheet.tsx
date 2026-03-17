"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useReviewAsset, useTogglePublic } from "@/hooks/use-assets";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { AuthImage } from "@/components/ui/auth-image";
import { Lightbox } from "@/components/shared/lightbox";
import type { Asset, ValidationStatus } from "@/types/api";
import { assetDownloadUrl, formatBytes, shortId, assetFilename } from "@/lib/utils-app";
import { AuthDownloadButton, LinkButton } from "@/components/ui/link-button";
import { MeshViewer } from "@/components/assets/mesh-viewer";
import { Download, Music, File, ExternalLink } from "lucide-react";

interface AssetDetailSheetProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ImagePreview({ asset }: { asset: Asset }) {
  const url = assetDownloadUrl(asset.id);
  const [lightbox, setLightbox] = useState(true);
  return (
    <>
      <AuthImage
        src={url}
        alt={asset.filename ?? "asset"}
        className="max-h-64 w-full object-contain rounded-md cursor-zoom-in"
        onClick={() => setLightbox(true)}
      />
      <Lightbox src={url} alt={asset.filename ?? undefined} open={lightbox} onOpenChange={setLightbox} />
    </>
  );
}

function AssetPreview({ asset }: { asset: Asset }) {
  const url = assetDownloadUrl(asset.id);
  switch (asset.type) {
    case "IMAGE":
      return <ImagePreview asset={asset} />;
    case "AUDIO":
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 w-full">
          <Music className="h-16 w-16 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{asset.filename}</span>
          <audio controls className="w-full max-w-sm" src={url} preload="none" />
        </div>
      );
    case "VIDEO":
      return <video controls className="max-h-64 w-full rounded-md bg-muted" src={url} preload="none" />;
    case "MESH":
      return (
        <MeshViewer
          src={url}
          alt={assetFilename(asset)}
          sizeBytes={asset.size_bytes}
          autoExpand
        />
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <File className="h-16 w-16 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{asset.filename ?? asset.type}</span>
        </div>
      );
  }
}

export function AssetDetailSheet({ asset, open, onOpenChange }: AssetDetailSheetProps) {
  const { hasRole } = useAuth();
  const reviewMutation = useReviewAsset();
  const togglePublicMutation = useTogglePublic();
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReviewInput, setShowReviewInput] = useState<"approve" | "reject" | null>(null);

  async function handleReview(status: ValidationStatus) {
    try {
      await reviewMutation.mutateAsync({ id: asset.id, status, notes: reviewNotes || undefined });
      toast.success(`Asset ${status.toLowerCase()}`);
      setShowReviewInput(null);
      setReviewNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleTogglePublic() {
    try {
      await togglePublicMutation.mutateAsync({ id: asset.id, is_public: !asset.is_public });
      toast.success(asset.is_public ? "Made private" : "Made public");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const downloadUrl = assetDownloadUrl(asset.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl overflow-y-auto px-8"
        showCloseButton
      >
        <div className="flex flex-col gap-6 py-6">
          {/* Asset type + filename */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{asset.type}</Badge>
            <span className="text-sm truncate">{assetFilename(asset)}</span>
          </div>

          {/* Preview */}
          <AssetPreview asset={asset} />

          {/* Download */}
          <div className="flex gap-2 flex-wrap">
            <AuthDownloadButton href={downloadUrl} filename={assetFilename(asset)} size="sm">
              <Download className="mr-1 h-3 w-3" /> Download
            </AuthDownloadButton>
            {asset.is_public && asset.validation_status === "APPROVED" && (
              <LinkButton
                href={`/api/public/assets/${asset.id}/download`}
                size="sm"
                variant="outline"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Public link
              </LinkButton>
            )}
          </div>

          {/* Provenance */}
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provenance</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {asset.author && (
                <>
                  <dt className="text-muted-foreground">Created by</dt>
                  <dd>{asset.author}</dd>
                </>
              )}
              {asset.workflow_name && (
                <>
                  <dt className="text-muted-foreground">Workflow</dt>
                  <dd>
                    <Link href={`/workflows/${asset.workflow_id}`} className="hover:underline">
                      {asset.workflow_name}
                    </Link>
                    {asset.workflow_version && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        v{asset.workflow_version}
                      </Badge>
                    )}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Job</dt>
              <dd>
                <Link href={`/jobs/${asset.job_id}`} className="font-mono text-xs hover:underline">
                  #{shortId(asset.job_id)}
                </Link>
                {asset.job_submitted_at && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    <RelativeTime value={asset.job_submitted_at} />
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>
                <RelativeTime value={asset.created_at} />
              </dd>
            </dl>
          </div>

          {/* File metadata */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Size: {formatBytes(asset.size_bytes)}</p>
            {asset.media_type && <p>Type: {asset.media_type}</p>}
          </div>

          {/* Validation */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validation</p>
              <StatusBadge status={asset.validation_status ?? "PENDING"} />
            </div>
            {asset.moderator_notes && (
              <p className="text-sm text-muted-foreground">{asset.moderator_notes}</p>
            )}
            {(hasRole("MODERATOR") || hasRole("ADMIN")) && (
              <div className="space-y-2 pt-1">
                {showReviewInput ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Notes (optional)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => void handleReview("APPROVED")}
                        disabled={reviewMutation.isPending}
                      >
                        Confirm Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleReview("REJECTED")}
                        disabled={reviewMutation.isPending}
                      >
                        Confirm Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowReviewInput(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300"
                      onClick={() => setShowReviewInput("approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-300"
                      onClick={() => setShowReviewInput("reject")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin: public toggle */}
          {hasRole("ADMIN") && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Public access</p>
                <p className="text-xs text-muted-foreground">
                  Accessible without login via /api/public/assets
                </p>
              </div>
              <Button
                size="sm"
                variant={asset.is_public ? "default" : "outline"}
                onClick={() => void handleTogglePublic()}
                disabled={togglePublicMutation.isPending}
              >
                {asset.is_public ? "Make private" : "Make public"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
