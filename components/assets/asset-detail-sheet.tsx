"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useAuth } from "@/lib/auth";
import { useReviewAsset, useTogglePublic } from "@/hooks/use-assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { useAuthBlobUrl } from "@/components/ui/auth-image";
import { Lightbox } from "@/components/shared/lightbox";
import type { Asset, ValidationStatus } from "@/types/api";
import { useJob } from "@/hooks/use-jobs";
import { assetDownloadUrl, assetMeshProxyUrl, formatBytes, shortId, assetFilename } from "@/lib/utils-app";
import { AuthDownloadButton, LinkButton } from "@/components/ui/link-button";
import { MeshViewer } from "@/components/assets/mesh-viewer";
import { Download, Music, File, ExternalLink, ChevronLeft, ChevronRight, X } from "lucide-react";

interface AssetDetailSheetProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function ImagePreview({ asset }: { asset: Asset }) {
  const url = assetDownloadUrl(asset.id);
  const blobUrl = useAuthBlobUrl(url);
  const [lightbox, setLightbox] = useState(false);

  if (!blobUrl) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={blobUrl}
        alt={asset.filename ?? "asset"}
        className="max-h-[85vh] max-w-full object-contain rounded-lg cursor-zoom-in shadow-2xl"
        onClick={() => setLightbox(true)}
      />
      <Lightbox src={blobUrl} alt={asset.filename ?? undefined} open={lightbox} onOpenChange={setLightbox} />
    </>
  );
}

function CenterPreview({ asset }: { asset: Asset }) {
  const url = assetDownloadUrl(asset.id);
  const meshUrl = assetMeshProxyUrl(asset.id);
  switch (asset.type) {
    case "IMAGE":
      return <ImagePreview asset={asset} />;
    case "AUDIO":
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-white">
          <Music className="h-24 w-24 opacity-70" />
          <span className="text-sm opacity-70">{asset.filename}</span>
          <audio controls className="w-full max-w-sm" src={url} preload="none" />
        </div>
      );
    case "VIDEO":
      return (
        <video
          controls
          className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
          src={url}
          preload="none"
        />
      );
    case "MESH":
      return (
        <div className="w-full max-w-2xl aspect-square">
          <MeshViewer
            src={meshUrl}
            alt={assetFilename(asset)}
            sizeBytes={asset.size_bytes}
            autoExpand
          />
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-white">
          <File className="h-24 w-24 opacity-70" />
          <span className="text-sm opacity-70">{asset.filename ?? asset.type}</span>
        </div>
      );
  }
}

function JobInputsSection({ jobId }: { jobId: string }) {
  const { data: job } = useJob(jobId);
  const inputs = job?.inputs_schema ?? [];
  const values = job?.input_values ?? [];
  if (inputs.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inputs</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {inputs.map((schema) => {
          const val = values.find((v) => v.input_id === schema.id);
          const display = val !== undefined
            ? String(val.value_json ?? "")
            : schema.default !== undefined && schema.default !== null
              ? String(schema.default)
              : "—";
          return (
            <React.Fragment key={schema.id}>
              <dt className="text-muted-foreground">{schema.label}</dt>
              <dd className="truncate">{display}</dd>
            </React.Fragment>
          );
        })}
      </dl>
    </div>
  );
}

export function AssetDetailSheet({ asset, open, onOpenChange, onPrev, onNext, hasPrev, hasNext }: AssetDetailSheetProps) {
  const { hasRole } = useAuth();
  const reviewMutation = useReviewAsset();
  const togglePublicMutation = useTogglePublic();
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReviewInput, setShowReviewInput] = useState<"approve" | "reject" | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Steal focus from the grid item as soon as the dialog opens
  useEffect(() => {
    if (open) popupRef.current?.focus();
  }, [open]);

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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Blur backdrop */}
        {/* Plain div backdrop — DialogPrimitive.Backdrop ignores pointer events */}
        <div
          className="fixed inset-0 z-50 bg-black/60 supports-backdrop-filter:backdrop-blur-sm cursor-pointer"
          onClick={() => onOpenChange(false)}
        />

        {/* Center: large preview + nav arrows — hidden on mobile where sheet takes full width */}
        <div className="fixed inset-y-0 left-0 right-0 sm:right-[42rem] z-50 hidden sm:flex flex-col p-8 pointer-events-none">
          {/* X button — top-right of the center area */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-events-auto self-end text-white hover:bg-white/20 hover:text-white shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Image area — fills all space between X button and nav */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0">
            <CenterPreview asset={asset} />
          </div>

          {/* Nav buttons — always at the bottom */}
          {(onPrev || onNext) && (
            <div className="pointer-events-auto flex items-center justify-center gap-4 shrink-0 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={!hasPrev}
                className="gap-1 bg-background/80 backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={!hasNext}
                className="gap-1 bg-background/80 backdrop-blur-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right side panel — details sheet */}
        <DialogPrimitive.Popup
          ref={popupRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { e.preventDefault(); onPrev?.(); }
            if (e.key === "ArrowRight") { e.preventDefault(); onNext?.(); }
          }}
          className="fixed inset-y-0 right-0 z-50 h-full w-full sm:max-w-[42rem] bg-background border-l shadow-xl overflow-y-auto transition duration-200 ease-in-out data-starting-style:translate-x-10 data-starting-style:opacity-0 data-ending-style:translate-x-10 data-ending-style:opacity-0 outline-none"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="fixed top-3 right-3 z-[51]"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="flex flex-col gap-6 px-8 py-6">
            {/* Asset type + filename */}
            <div className="flex items-center gap-2 pr-8">
              <Badge variant="outline">{asset.type}</Badge>
              <span className="text-sm truncate">{assetFilename(asset)}</span>
            </div>

            {/* Mobile-only preview (shown only when sheet is full-width) */}
            <div className="sm:hidden">
              <CenterPreview asset={asset} />
              {(onPrev || onNext) && (
                <div className="flex items-center justify-between gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext} className="gap-1">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

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

            {/* Inputs */}
            <JobInputsSection jobId={asset.job_id} />

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
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
