import mongoose from 'mongoose';

export interface IWorkflowEvent {
  workflowId: string;
  userId: string;
  eventData: Record<string, unknown>;
  receivedAt: Date;
  processed?: boolean;
  runId?: string; // Link to workflow run if event triggered a run
}

export type IWorkflowEventDocument = mongoose.Document<unknown, object, IWorkflowEvent> &
  IWorkflowEvent & {
    _id: mongoose.Types.ObjectId;
  };

// Workflow Event Schema
const workflowEventSchema = new mongoose.Schema<IWorkflowEvent>(
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
    eventData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    runId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
workflowEventSchema.index({ workflowId: 1, receivedAt: -1 });
workflowEventSchema.index({ userId: 1, receivedAt: -1 });

export const WorkflowEvent =
  (mongoose.models.WorkflowEvent as mongoose.Model<IWorkflowEvent>) ||
  mongoose.model<IWorkflowEvent>('WorkflowEvent', workflowEventSchema);
