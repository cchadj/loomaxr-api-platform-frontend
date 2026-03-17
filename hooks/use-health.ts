import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

export function useComfyHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["health", "comfyui"],
    queryFn: () => apiGet("/api/health/comfyui"),
    refetchInterval: 30_000,
    retry: 0,
  });
}
