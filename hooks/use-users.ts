import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { User } from "@/types/api";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet("/api/users"),
  });
}
