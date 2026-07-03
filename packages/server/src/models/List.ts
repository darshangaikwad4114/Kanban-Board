import mongoose, { Document, Schema } from 'mongoose';

export interface IList extends Document {
  title: string;
  boardId: mongoose.Types.ObjectId;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

listSchema.index({ boardId: 1, position: 1 });

listSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
});

export const List = mongoose.model<IList>('List', listSchema);