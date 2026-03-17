"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { VariantProps } from "class-variance-authority";

interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
}

export function LinkButton({ href, children, variant, size, className, target, rel, download }: LinkButtonProps) {
  if (href.startsWith("http") || href.startsWith("/api") || download) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        className={cn(buttonVariants({ variant, size }), className)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}

interface AuthDownloadButtonProps extends VariantProps<typeof buttonVariants> {
  href: string;
  filename?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthDownloadButton({ href, filename, children, variant, size, className }: AuthDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await apiFetch(href);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? extractFilename(res, href);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {loading ? "Downloading…" : children}
    </button>
  );
}

function extractFilename(res: Response, fallbackUrl: string): string {
  const cd = res.headers.get("content-disposition");
  if (cd) {
    const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
    if (match) return decodeURIComponent(match[1]);
  }
  return fallbackUrl.split("/").pop() ?? "download";
}
