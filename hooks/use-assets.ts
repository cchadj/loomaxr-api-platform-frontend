import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { Asset, ValidationStatus } from "@/types/api";

interface AssetFilters {
  mine?: boolean;
  workflow_id?: string;
  job_id?: string;
  user_id?: string;
}

export function useAssets(filters?: AssetFilters) {
  const params = new URLSearchParams();
  // Always send mine param explicitly — backend defaults to mine=true
  params.set("mine", filters?.mine !== false ? "true" : "false");
  if (filters?.workflow_id) params.set("workflow_id", filters.workflow_id);
  if (filters?.job_id) params.set("job_id", filters.job_id);
  if (filters?.user_id) params.set("user_id", filters.user_id);
  const qs = params.toString();

  return useQuery<Asset[]>({
    queryKey: ["assets", filters],
    queryFn: () => apiGet(`/api/assets${qs ? `?${qs}` : ""}`),
  });
}

export function useAsset(id: string) {
  return useQuery<Asset>({
    queryKey: ["assets", id],
    queryFn: () => apiGet(`/api/assets/${id}`),
    enabled: Boolean(id),
  });
}

export function useReviewAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ValidationStatus; notes?: string }) =>
      apiPost(`/api/assets/${id}/review`, { status, notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useTogglePublic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_public }: { id: string; is_public: boolean }) =>
      apiPatch(`/api/assets/${id}/visibility`, { is_public }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
