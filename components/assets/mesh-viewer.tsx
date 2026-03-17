"use client";

import { useEffect, useRef, useState } from "react";
import { Box, AlertTriangle, Maximize2 } from "lucide-react";
import { formatBytes } from "@/lib/utils-app";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        "auto-rotate"?: boolean | string;
        "camera-controls"?: boolean | string;
        "shadow-intensity"?: string;
        loading?: "auto" | "lazy" | "eager";
        reveal?: "auto" | "manual";
        ar?: boolean | string;
      };
    }
  }
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

interface MeshViewerProps {
  src: string;
  alt?: string;
  sizeBytes?: number;
  onExpandChange?: (expanded: boolean) => void;
  autoExpand?: boolean;
}

export function MeshViewer({ src, alt, sizeBytes, onExpandChange, autoExpand = false }: MeshViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [scriptReady, setScriptReady] = useState(false);
  const [expanded, setExpanded] = useState(autoExpand);

  useEffect(() => {
    onExpandChange?.(expanded);
  }, [expanded, onExpandChange]);
  const ref = useRef<HTMLElement>(null);

  // Detect WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
      if (!gl) setWebGLAvailable(false);
    } catch {
      setWebGLAvailable(false);
    }
  }, []);

  // Dynamically load @google/model-viewer (registers the custom element)
  useEffect(() => {
    if (!webGLAvailable) return;
    import("@google/model-viewer")
      .then(() => setScriptReady(true))
      .catch(() => setWebGLAvailable(false));
  }, [webGLAvailable]);

  // Listen for model-viewer load events
  useEffect(() => {
    const el = ref.current;
    if (!el || !scriptReady) return;
    const onLoad = () => setLoaded(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [scriptReady]);

  if (!webGLAvailable) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border bg-muted text-muted-foreground">
        <Box className="h-10 w-10" />
        <span className="text-sm">{alt ?? "3D mesh"}</span>
        <span className="text-xs">WebGL unavailable — cannot preview</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {sizeBytes && sizeBytes > LARGE_FILE_BYTES && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Large file ({formatBytes(sizeBytes)}) — viewer may be slow
        </div>
      )}

      <div className="relative overflow-hidden rounded-md border bg-white" style={{ height: 320 }}>
        {/* Loading spinner overlay */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <span className="text-xs text-muted-foreground">Loading model…</span>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-2 right-2 z-20 rounded-md bg-background/70 p-1.5 hover:bg-background transition-colors"
          title="Expand"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        {scriptReady && (
          // @ts-expect-error – model-viewer is a custom element registered at runtime
          <model-viewer
            ref={ref}
            src={src}
            alt={alt ?? "3D model"}
            auto-rotate
            camera-controls
            shadow-intensity="1"
            loading="eager"
            style={{
              width: "100%",
              height: "100%",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          />
        )}
      </div>

      <p className="mt-1 text-center text-xs text-muted-foreground">
        Drag to rotate · Scroll to zoom
      </p>

      {/* Expanded dialog */}
      <DialogPrimitive.Root open={expanded} onOpenChange={setExpanded}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          {/* Clickable overlay sits above backdrop, below popup, to reliably catch outside clicks */}
          <div className="fixed inset-0 z-[61] cursor-pointer" onClick={() => setExpanded(false)} />
          <DialogPrimitive.Popup
            className="fixed top-1/2 left-1/2 z-[62] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            style={{ width: "85vmin", height: "85vmin" }}
            aria-label={alt ?? "3D model viewer"}
          >
            {scriptReady && (
              // @ts-expect-error – model-viewer is a custom element registered at runtime
              <model-viewer
                src={src}
                alt={alt ?? "3D model"}
                auto-rotate
                camera-controls
                shadow-intensity="1"
                loading="eager"
                style={{ width: "100%", height: "100%" }}
              />
            )}
            <DialogPrimitive.Close
              className="absolute top-2 right-2 z-10 rounded-md bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
