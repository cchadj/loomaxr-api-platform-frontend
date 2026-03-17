"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useParseWorkflow, useCreateWorkflow, useUpdateWorkflow } from "@/hooks/use-workflows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { CandidateInput, InputSchema, Workflow } from "@/types/api";
import { slugify } from "@/lib/utils-app";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";

interface WorkflowBuilderProps {
  existingWorkflow?: Workflow;
}

interface ExposedInput {
  candidate: CandidateInput;
  exposed: boolean;
  label: string;
  required: boolean;
  default: string;
  type: "string" | "number" | "boolean" | "image";
}

const STEPS = ["Paste JSON", "Configure Inputs", "Metadata", "Review & Save"];

// ---------------------------------------------------------------------------
// JsonDropZone — wraps a Textarea with drag-and-drop + file-paste support
// ---------------------------------------------------------------------------
function JsonDropZone({
  value, onChange, placeholder, rows, id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}) {
  const [dragging, setDragging] = useState(false);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => onChange((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = e.clipboardData.files[0];
    if (file) {
      e.preventDefault();
      readFile(file);
    }
    // plain-text paste falls through to the textarea naturally
  }

  return (
    <div
      className={`relative rounded-md transition-colors ${dragging ? "ring-2 ring-primary ring-offset-1" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={rows ?? 12}
        className="font-mono text-xs"
      />
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-primary/10 text-sm font-medium text-primary">
          <UploadCloud className="h-6 w-6" />
          Drop JSON file to load
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowBuilder
// ---------------------------------------------------------------------------
export function WorkflowBuilder({ existingWorkflow }: WorkflowBuilderProps) {
  const router = useRouter();
  const parseMutation = useParseWorkflow();
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow(existingWorkflow?.id ?? "");

  const [step, setStep] = useState(0);
  const [promptJson, setPromptJson] = useState("");
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "ok" | "error">("idle");
  const [parseError, setParseError] = useState("");
  const [candidates, setCandidates] = useState<ExposedInput[]>([]);
  const [name, setName] = useState(existingWorkflow?.name ?? "");
  const [key, setKey] = useState(existingWorkflow?.key ?? "");
  const [description, setDescription] = useState(existingWorkflow?.description ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [uiJson, setUiJson] = useState("");
  const [keyManuallySet, setKeyManuallySet] = useState(Boolean(existingWorkflow));

  // Debounced auto-parse whenever promptJson changes
  const parseAbortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (parseAbortRef.current) clearTimeout(parseAbortRef.current);

    const trimmed = promptJson.trim();
    if (!trimmed) {
      setParseStatus("idle");
      setParseError("");
      return;
    }

    // Quick syntax check before hitting the server
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setParseStatus("error");
      setParseError("Invalid JSON");
      return;
    }

    setParseStatus("parsing");
    setParseError("");

    parseAbortRef.current = setTimeout(() => {
      parseMutation.mutateAsync({ prompt_json: parsed })
        .then((result) => {
          setCandidates(
            result.candidate_inputs.map((c) => ({
              candidate: c,
              exposed: false,
              label: c.path.split(".").pop() ?? c.path,
              required: false,
              default: String(c.default ?? ""),
              type: c.value_type === "INT" || c.value_type === "FLOAT" ? "number"
                : c.value_type === "BOOLEAN" ? "boolean"
                : "string",
            }))
          );
          setParseStatus("ok");
        })
        .catch((e) => {
          setParseStatus("error");
          setParseError(e instanceof Error ? e.message : "Parse failed");
        });
    }, 500);

    return () => {
      if (parseAbortRef.current) clearTimeout(parseAbortRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptJson]);

  function updateCandidate(idx: number, update: Partial<ExposedInput>) {
    setCandidates((prev) => prev.map((c, i) => (i === idx ? { ...c, ...update } : c)));
  }

  function handleNameChange(v: string) {
    setName(v);
    if (!keyManuallySet) setKey(slugify(v));
  }

  function buildInputsSchema(): InputSchema[] {
    return candidates
      .filter((c) => c.exposed)
      .map((c, i) => ({
        id: `input_${i}`,
        label: c.label,
        type: c.type,
        required: c.required,
        default: c.type === "number" ? Number(c.default) : c.default || undefined,
        mapping: [{ node_id: c.candidate.node_id, path: c.candidate.path }],
      }));
  }

  async function handleSave() {
    let promptParsed: Record<string, unknown>;
    try {
      promptParsed = JSON.parse(promptJson);
    } catch {
      toast.error("Invalid prompt JSON");
      return;
    }

    const body: Record<string, unknown> = {
      key,
      name,
      description: description || undefined,
      prompt_json: promptParsed,
      inputs_schema_json: buildInputsSchema(),
      change_note: changeNote || undefined,
    };

    if (uiJson) {
      try {
        body.ui_json = JSON.parse(uiJson);
      } catch {
        toast.error("Invalid UI JSON");
        return;
      }
    }

    try {
      if (existingWorkflow) {
        const updated = await updateMutation.mutateAsync(body);
        toast.success("Workflow updated");
        router.push(`/workflows/${updated.id}`);
      } else {
        const created = await createMutation.mutateAsync(body);
        toast.success("Workflow created");
        router.push(`/workflows/${created.id}`);
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 409) {
        toast.error("This key is already taken");
      } else {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-3xl">
      {/* Step indicator */}
      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-muted" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Paste / drop JSON ── */}
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold">Paste or drop ComfyUI API-format JSON</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste JSON text, or drag-and-drop / paste a <code>.json</code> file. Inputs are detected automatically.
            </p>
          </div>

          <JsonDropZone
            id="prompt-json"
            value={promptJson}
            onChange={setPromptJson}
            placeholder={'{"1": {"class_type": "KSampler", "inputs": {...}}, ...}'}
            rows={14}
          />

          {/* Parse status indicator */}
          <div className="flex items-center gap-2 min-h-[20px]">
            {parseStatus === "parsing" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Detecting inputs…</span>
              </>
            )}
            {parseStatus === "ok" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">
                  Found {candidates.length} candidate input{candidates.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {parseStatus === "error" && (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-600">{parseError}</span>
              </>
            )}
          </div>

          <Button
            onClick={() => setStep(1)}
            disabled={parseStatus !== "ok" || !promptJson.trim()}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Step 1: Configure inputs ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Configure Inputs ({candidates.length} candidates)</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setCandidates((p) => p.map((c) => ({ ...c, exposed: true })))}>
                Expose all
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCandidates((p) => p.map((c) => ({ ...c, exposed: false })))}>
                Expose none
              </Button>
            </div>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidate inputs found in this workflow.</p>
          ) : (
            <div className="space-y-3">
              {candidates.map((c, i) => (
                <Card key={i} className={c.exposed ? "border-primary" : ""}>
                  <CardContent className="pt-3 pb-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 items-end">
                      <div className="flex items-center gap-2 sm:col-span-1">
                        <input
                          type="checkbox"
                          checked={c.exposed}
                          onChange={(e) => updateCandidate(i, { exposed: e.target.checked })}
                          id={`expose-${i}`}
                        />
                        <label htmlFor={`expose-${i}`} className="text-xs font-mono truncate max-w-[100px]" title={`${c.candidate.node_id}.${c.candidate.path}`}>
                          {c.candidate.path.split(".").slice(-2).join(".")}
                        </label>
                      </div>
                      <Input
                        placeholder="Label"
                        value={c.label}
                        onChange={(e) => updateCandidate(i, { label: e.target.value })}
                        className="sm:col-span-1 text-xs"
                        disabled={!c.exposed}
                      />
                      <Select
                        value={c.type}
                        onValueChange={(v) => updateCandidate(i, { type: v as ExposedInput["type"] })}
                        disabled={!c.exposed}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">string</SelectItem>
                          <SelectItem value="number">number</SelectItem>
                          <SelectItem value="boolean">boolean</SelectItem>
                          <SelectItem value="image">image</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Default"
                        value={c.default}
                        onChange={(e) => updateCandidate(i, { default: e.target.value })}
                        className="text-xs"
                        disabled={!c.exposed}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={c.required}
                          onChange={(e) => updateCandidate(i, { required: e.target.checked })}
                          id={`req-${i}`}
                          disabled={!c.exposed}
                        />
                        <label htmlFor={`req-${i}`} className="text-xs">Required</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Metadata ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Workflow Metadata</h2>
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Key *</Label>
            <Input value={key} onChange={(e) => { setKey(e.target.value); setKeyManuallySet(true); }} />
            <p className="text-xs text-muted-foreground">Used to identify this workflow in API calls</p>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Change note {existingWorkflow && "(required for new version)"}</Label>
            <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="e.g. Updated sampler settings" />
          </div>
          <div className="space-y-1">
            <Label>
              ComfyUI UI-format JSON{" "}
              <span className="text-xs font-normal text-muted-foreground">
                optional — used to extract model download URLs
              </span>
            </Label>
            <JsonDropZone
              id="ui-json"
              value={uiJson}
              onChange={setUiJson}
              rows={5}
              placeholder="Paste or drop UI-format JSON to auto-detect HuggingFace/Civitai model URLs"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!name || !key}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Save ── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Review & Save</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{name}</dd>
            <dt className="text-muted-foreground">Key</dt>
            <dd><code className="font-mono">{key}</code></dd>
            <dt className="text-muted-foreground">Exposed inputs</dt>
            <dd>{candidates.filter((c) => c.exposed).length}</dd>
          </dl>

          <div>
            <p className="mb-2 text-sm font-medium">inputs_schema_json preview</p>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(buildInputsSchema(), null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Saving…" : existingWorkflow ? "Update Workflow" : "Create Workflow"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
