import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Job } from "@/types/api";

const ACTIVE_STATUSES = ["QUEUED", "SUBMITTED", "RUNNING"];

interface JobFilters {
  status?: string;
  mine?: boolean;
}

function getRefetchInterval(jobs: Job[] | undefined) {
  if (!jobs) return 5000;
  const hasActive = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));
  return hasActive ? 5000 : 30_000;
}

export function useJobs(filters?: JobFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.mine) params.set("mine", "true");
  const qs = params.toString();

  return useQuery<Job[]>({
    queryKey: ["jobs", filters],
    queryFn: () => apiGet(`/api/jobs${qs ? `?${qs}` : ""}`),
    refetchInterval: (query) => getRefetchInterval(query.state.data),
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["jobs", id],
    queryFn: () => apiGet(`/api/jobs/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || ACTIVE_STATUSES.includes(status)) return 5000;
      return false;
    },
    enabled: Boolean(id),
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/jobs/${id}/cancel`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { workflow_id: string; workflow_version_id?: string; params: Record<string, unknown> }) =>
      apiPost<Job>("/api/jobs", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
