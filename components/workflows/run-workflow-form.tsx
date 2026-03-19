"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateJob } from "@/hooks/use-jobs";
import { apiPostFormData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Workflow, InputSchema, Job } from "@/types/api";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface RunWorkflowFormProps {
  workflow: Workflow;
  onSuccess?: (job: Job) => void;
}

export function RunWorkflowForm({ workflow, onSuccess }: RunWorkflowFormProps) {
  const router = useRouter();
  const createJob = useCreateJob();
  // The list endpoint returns `versions[]` but not `current_version` directly.
  // Fall back through all possible locations.
  const currentVersion =
    workflow.versions?.find((v) => v.id === workflow.current_version_id) ??
    workflow.versions?.[0];
  const schema: InputSchema[] = currentVersion?.inputs_schema_json ?? [];

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const input of schema) {
      if (input.default !== undefined) initial[input.id] = input.default;
    }
    return initial;
  });
  const [files, setFiles] = useState<Record<string, File>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingModels, setMissingModels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const input of schema) {
      if (input.required) {
        if (input.type === "image" && !files[input.id]) {
          errs[input.id] = "Please select an image";
        } else if (input.type !== "image" && (values[input.id] === undefined || values[input.id] === "")) {
          errs[input.id] = "Required";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setMissingModels([]);
    try {
      const params: Record<string, unknown> = { ...values };

      // Upload images first
      for (const input of schema) {
        if (input.type === "image" && files[input.id]) {
          const fd = new FormData();
          fd.append("file", files[input.id]);
          const result = await apiPostFormData<{ name: string }>("/api/jobs/upload-image", fd);
          params[input.id] = result.name;
        }
      }

      // Remove empty optional image params
      for (const input of schema) {
        if (input.type === "image" && !files[input.id]) {
          delete params[input.id];
        }
      }

      const job = await createJob.mutateAsync({
        workflow_id: workflow.id,
        params,
      });

      toast.success("Job created");
      if (onSuccess) {
        onSuccess(job);
      } else {
        router.push(`/jobs/${job.id}`);
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 422) {
        const data = (e as { data?: { detail?: string | Array<{ msg: string }> } }).data;
        const detail = data?.detail;
        if (typeof detail === "string" && detail.includes("model")) {
          setMissingModels([detail]);
        }
        toast.error("Missing required models — see Requirements tab");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to create job");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileChange(inputId: string, file: File | null) {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [inputId]: file }));
    const url = URL.createObjectURL(file);
    setFilePreviews((prev) => ({ ...prev, [inputId]: url }));
    setErrors((prev) => ({ ...prev, [inputId]: "" }));
  }

  if (schema.length === 0) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">No inputs — this workflow runs with no parameters.</p>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting…" : "Run Workflow"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {schema.map((input) => (
        <div key={input.id} className="space-y-1">
          <Label>
            {input.label}
            {input.required && <span className="ml-1 text-red-500">*</span>}
          </Label>

          {input.type === "image" ? (
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(input.id, e.target.files?.[0] ?? null)}
              />
              {filePreviews[input.id] && (
                <img
                  src={filePreviews[input.id]}
                  alt="preview"
                  className="h-32 w-auto rounded border object-contain"
                />
              )}
            </div>
          ) : input.type === "number" ? (
            <Input
              type="number"
              value={String(values[input.id] ?? "")}
              onChange={(e) => setValues((prev) => ({ ...prev, [input.id]: e.target.value ? Number(e.target.value) : "" }))}
            />
          ) : input.type === "boolean" ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={input.id}
                checked={Boolean(values[input.id])}
                onChange={(e) => setValues((prev) => ({ ...prev, [input.id]: e.target.checked }))}
              />
              <label htmlFor={input.id} className="text-sm">Enabled</label>
            </div>
          ) : (
            <Textarea
              value={String(values[input.id] ?? "")}
              onChange={(e) => setValues((prev) => ({ ...prev, [input.id]: e.target.value }))}
              rows={3}
            />
          )}

          {errors[input.id] && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{errors[input.id]}
            </p>
          )}
        </div>
      ))}

      {missingModels.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Missing required models:</p>
          <ul className="ml-4 mt-1 list-disc">{missingModels.map((m) => <li key={m}>{m}</li>)}</ul>
          <Link href={`/workflows/${workflow.id}?tab=requirements`} className="mt-1 underline text-xs">
            View Requirements →
          </Link>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting…" : "Run Workflow"}
      </Button>
    </form>
  );
}
