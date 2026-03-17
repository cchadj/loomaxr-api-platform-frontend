"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useAuthBlobUrl(src: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    setBlobUrl(null);

    apiFetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});

    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [src]);

  return blobUrl;
}

interface AuthImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export function AuthImage({ src, ...props }: AuthImageProps) {
  const blobUrl = useAuthBlobUrl(src);
  if (!blobUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img src={blobUrl} {...props} />;
}
