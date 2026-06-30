export interface Workflow {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
}

export interface WorkflowStep {
    id: string;
    name: string;
    type: StepType;
    config: Record<string, unknown>;
    positionX: number;
    positionY: number;
}

export interface WorkflowEdge {
    id: string;
    sourceStepId: string;
    targetStepId: string;
}

export type StepType = 'http_request' | 'db_query' | 'transform_json' | 'csv_process';
export interface Execution {
    id: string;
    workflowId: string;
    status: ExecutionStatus;
    startedAt: string;
    finishedAt?: string;
    errorMessage?: string;
    createdAt: string;
    steps: StepExecution[];
    logs: ExecutionLog[];
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';


export interface StepExecution {
    id: string;
    stepId: string;
    status: ExecutionStatus;
    output?: unknown;
    errorMessage?: string;
    retryCount: number;
}

export interface StepExecution {
    id: string;
    stepId: string;
    status: ExecutionStatus;
    output?: unknown;
    errorMessage?: string;
    retryCount: number;
}

export interface ExecutionLog {
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    createdAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  steps: CreateStepRequest[];
  edges: CreateEdgeRequest[];
  trigger?: CreateTriggerRequest;
}

export interface CreateStepRequest {
  tempId: string;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface CreateEdgeRequest {
  sourceTempId: string;
  targetTempId: string;
}

export interface CreateTriggerRequest {
  type: 'manual' | 'cron' | 'webhook';
  config: Record<string, unknown>;
}