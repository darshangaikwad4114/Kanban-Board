import mongoose, { Document, Schema } from 'mongoose';

export interface IBoard extends Document {
  title: string;
  description?: string;
  color?: string;
  templateId?: string;
  ownerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const boardSchema = new Schema<IBoard>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      maxlength: 20,
      default: 'lavender',
    },
    templateId: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

boardSchema.index({ ownerId: 1 });
boardSchema.index({ memberIds: 1 });

boardSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
});

export const Board = mongoose.model<IBoard>('Board', boardSchema);