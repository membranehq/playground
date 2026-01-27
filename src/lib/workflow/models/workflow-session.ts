import mongoose, { Model, Document } from 'mongoose';

export interface IWorkflowSession {
  sessionId: string;
  workflowId: string;
  customerId: string;
  label: string;
  createdAt: Date;
}

export type IWorkflowSessionDocument = Document<unknown, object, IWorkflowSession> &
  IWorkflowSession & {
    _id: mongoose.Types.ObjectId;
  };

export interface IWorkflowSessionModel extends Model<IWorkflowSession> {
  findByWorkflow(workflowId: string, customerId: string): Promise<IWorkflowSessionDocument[]>;
}

const workflowSessionSchema = new mongoose.Schema<IWorkflowSession>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    workflowId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

workflowSessionSchema.index({ workflowId: 1, customerId: 1, createdAt: -1 });

workflowSessionSchema.statics = {
  findByWorkflow: function (workflowId: string, customerId: string) {
    return this.find({ workflowId, customerId }).sort({ createdAt: -1 });
  },
};

export const WorkflowSession =
  (mongoose.models.WorkflowSession as IWorkflowSessionModel) ||
  mongoose.model<IWorkflowSession, IWorkflowSessionModel>('WorkflowSession', workflowSessionSchema);
