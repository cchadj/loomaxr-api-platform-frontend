"use client";

import { useEffect, useRef, useState } from "react";

interface MeshGridPreviewProps {
  src: string;
  alt?: string;
  hovered: boolean;
}

export function MeshGridPreview({ src, alt, hovered }: MeshGridPreviewProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Load @google/model-viewer once on first hover
  useEffect(() => {
    if (!hovered || scriptReady) return;
    import("@google/model-viewer")
      .then(() => setScriptReady(true))
      .catch(() => {/* WebGL unavailable — stay hidden */});
  }, [hovered, scriptReady]);

  // Reset loaded state when src changes
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // Listen for model load event
  useEffect(() => {
    const el = ref.current;
    if (!el || !scriptReady) return;
    const onLoad = () => setLoaded(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [scriptReady]);

  if (!hovered && !scriptReady) return null;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-300"
      style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? "auto" : "none" }}
    >
      {/* Spinner shown until model loads */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
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
          shadow-intensity="0"
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
  );
}
