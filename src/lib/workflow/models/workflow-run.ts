import mongoose, { Model, Document } from 'mongoose';

// Workflow Run Result Interface
export interface IWorkflowRunResult {
  nodeId: string;
  nodeName?: string;
  success: boolean;
  message: string;
  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

// Workflow Run Interface
export interface IWorkflowRun {
  workflowId: string;
  userId: string;
  status: 'running' | 'completed' | 'failed';
  input?: unknown;
  nodesSnapshot?: unknown[]; // Snapshot of workflow nodes at the time of execution
  results: IWorkflowRunResult[];
  summary: {
    totalNodes: number;
    successfulNodes: number;
    failedNodes: number;
    successRate: number;
  };
  startedAt: Date;
  completedAt?: Date;
  executionTime?: number; // in milliseconds
  error?: string;
}

// Document type
export type IWorkflowRunDocument = Document<unknown, object, IWorkflowRun> &
  IWorkflowRun & {
    _id: mongoose.Types.ObjectId;
  };

// Workflow Run Result Schema
const workflowRunResultSchema = new mongoose.Schema<IWorkflowRunResult>(
  {
    nodeId: {
      type: String,
      required: true,
    },
    nodeName: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      message: String,
      code: String,
      details: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

// Main Workflow Run Schema
const workflowRunSchema = new mongoose.Schema<IWorkflowRun>(
  {
    workflowId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
      index: true,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    nodesSnapshot: {
      type: [mongoose.Schema.Types.Mixed],
    },
    results: {
      type: [workflowRunResultSchema],
      default: [],
    },
    summary: {
      totalNodes: {
        type: Number,
        required: true,
        default: 0,
      },
      successfulNodes: {
        type: Number,
        required: true,
        default: 0,
      },
      failedNodes: {
        type: Number,
        required: true,
        default: 0,
      },
      successRate: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      index: true,
    },
    executionTime: {
      type: Number, // in milliseconds
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
workflowRunSchema.index({ workflowId: 1, startedAt: -1 });
workflowRunSchema.index({ status: 1, startedAt: -1 });
workflowRunSchema.index({ userId: 1, startedAt: -1 });

export const WorkflowRun =
  (mongoose.models.WorkflowRun as Model<IWorkflowRun>) || mongoose.model<IWorkflowRun>('WorkflowRun', workflowRunSchema);

