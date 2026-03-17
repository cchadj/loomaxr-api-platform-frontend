// Auth
export interface User {
  id: string;
  username: string;
  roles: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in_seconds: number;
  user: User;
}

export interface DevModeInfo {
  auth_dev_mode: boolean;
  default_user_id: string;
  default_roles: string[];
}

// Roles
export type Role = "ADMIN" | "WORKFLOW_CREATOR" | "JOB_CREATOR" | "VIEWER" | "MODERATOR";

// Workflows
export interface InputMapping {
  node_id: string;
  path: string;
}

export interface InputSchema {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "image";
  required: boolean;
  default?: unknown;
  mapping: InputMapping[];
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  prompt_json: Record<string, unknown>;
  inputs_schema_json: InputSchema[];
  is_published: boolean;
  change_note?: string;
  created_at: string;
  created_by_user_id?: string;
}

export interface WorkflowModelRequirement {
  id: string;
  workflow_version_id: string;
  model_name: string;
  folder: string;
  model_type?: string;
  download_url?: string;
  url_approved: boolean;
  approved_by_user_id?: string;
  approved_at?: string;
  available?: boolean;
}

export interface Workflow {
  id: string;
  key: string;
  name: string;
  description?: string;
  current_version_id?: string;
  author_id?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  versions?: WorkflowVersion[];
}

export interface WorkflowRequirementsResponse {
  requirements: WorkflowModelRequirement[];
  all_available: boolean;
  missing: string[];
}

export interface CandidateInput {
  node_id: string;
  path: string;
  node_type: string;
  value_type: string;
  default?: unknown;
}

export interface ParseResponse {
  candidate_inputs: CandidateInput[];
}

// Jobs
export type JobStatus = "QUEUED" | "SUBMITTED" | "RUNNING" | "GENERATED" | "FAILED" | "CANCELLED";

export interface JobInputValue {
  job_id: string;
  input_id: string;
  value_json: unknown;
}

export interface Job {
  id: string;
  workflow_id: string;
  workflow_version_id?: string;
  user_id: string;
  username?: string;
  status: JobStatus;
  start_time?: string;
  end_time?: string;
  error_message?: string;
  submitted_at: string;
  workflow_name?: string;
  workflow_key?: string;
  version_number?: number;
  input_values?: JobInputValue[];
  asset_count?: number;
}

// Assets
export type AssetType = "IMAGE" | "AUDIO" | "VIDEO" | "MODEL" | "MESH" | "OTHER";
export type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AssetValidation {
  id: string;
  asset_id: string;
  moderator_user_id: string;
  moderator_username?: string;
  status: ValidationStatus;
  notes?: string;
  validated_at: string;
}

export interface Asset {
  id: string;
  job_id: string;
  workflow_id?: string;
  workflow_version_id?: string;
  type: AssetType;
  file_path: string;
  size_bytes?: number;
  media_type?: string;
  is_public: boolean;
  validation_status: ValidationStatus | null;
  created_at?: string;
  // Provenance — joined from job/workflow/user
  author?: string;
  workflow_name?: string;
  workflow_version?: number;
  job_submitted_at?: string;
  // Frontend-derived
  filename?: string;
  validation_history?: AssetValidation[];
  moderator_notes?: string;
}

// Health
export interface HealthResponse {
  comfyui_url: string;
  healthy: boolean;
}

// API error
export interface ApiError {
  detail: string | { msg: string; type: string }[];
  status?: number;
}
