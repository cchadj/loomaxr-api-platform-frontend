import { AlertCircle } from "lucide-react";

interface QueryErrorProps {
  error: unknown;
}

export function QueryError({ error }: QueryErrorProps) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
