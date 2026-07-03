import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  boardId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  entityType: 'card' | 'list' | 'board';
  entityId: string;
  details?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['card', 'list', 'board'],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    details: {
      type: String,
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ boardId: 1, createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
});

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);