import { Badge } from "@/components/ui/badge";
import type { JobStatus, ValidationStatus } from "@/types/api";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: JobStatus | ValidationStatus | "AVAILABLE" | "MISSING" | "UNKNOWN" | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  QUEUED: { label: "Queued", className: "bg-gray-100 text-gray-700 border-gray-200" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse" },
  RUNNING: { label: "Running", className: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse" },
  GENERATED: { label: "Generated", className: "bg-green-100 text-green-700 border-green-200" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
  AVAILABLE: { label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
  MISSING: { label: "Missing", className: "bg-red-100 text-red-700 border-red-200" },
  UNKNOWN: { label: "Unknown", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
