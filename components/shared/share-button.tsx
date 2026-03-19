"use client";

import { useState } from "react";
import { Link2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/shared/share-dialog";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Path relative to origin, e.g. "/workflows/abc123/run" */
  path: string;
  title?: string;
  description?: string;
  author?: string;
  className?: string;
  /** Render as a full button with label instead of an icon-only ghost button */
  variant?: "icon" | "button";
  label?: string;
  icon?: LucideIcon;
}

export function ShareButton({
  path,
  title = "Share",
  description,
  author,
  className,
  variant = "icon",
  label = "Share",
  icon: Icon = Link2,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(true);
  }

  const url = typeof window !== "undefined" ? window.location.origin + path : path;

  return (
    <>
      {variant === "button" ? (
        <Button variant="outline" size="sm" className={className} onClick={handleClick}>
          <Icon className="mr-1 h-3 w-3" />
          {label}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", className)}
          onClick={handleClick}
          title={label}
        >
          <Icon className="h-3 w-3" />
        </Button>
      )}

      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        url={url}
        title={title}
        description={description}
        author={author}
      />
    </>
  );
}
