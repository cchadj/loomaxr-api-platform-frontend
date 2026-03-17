"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  path: string; // e.g. "/workflows/abc123"
  className?: string;
}

export function ShareButton({ path, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = window.location.origin + path;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", className)}
      onClick={handleShare}
      title="Copy link"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Link2 className="h-3 w-3" />}
    </Button>
  );
}
