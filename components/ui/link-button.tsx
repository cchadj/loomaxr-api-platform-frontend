import Link from "next/link";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";
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
