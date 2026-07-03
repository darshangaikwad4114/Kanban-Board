import mongoose, { Document, Schema } from 'mongoose';

export interface IBoard extends Document {
  title: string;
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