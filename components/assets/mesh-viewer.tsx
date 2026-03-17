"use client";

import { useEffect, useRef, useState } from "react";
import { Box, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/lib/utils-app";

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
}

export function MeshViewer({ src, alt, sizeBytes }: MeshViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [scriptReady, setScriptReady] = useState(false);
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

      <div className="relative overflow-hidden rounded-md border bg-muted" style={{ height: 320 }}>
        {/* Loading spinner overlay */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <span className="text-xs text-muted-foreground">Loading model…</span>
          </div>
        )}

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
    </div>
  );
}
