import mongoose, { Document, Schema } from 'mongoose';

export interface ICard extends Document {
  title: string;
  listId: mongoose.Types.ObjectId;
  boardId: mongoose.Types.ObjectId;
  description: string;
  position: number;
  assigneeId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<ICard>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    listId: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

cardSchema.index({ listId: 1, position: 1 });
cardSchema.index({ boardId: 1 });
cardSchema.index({ updatedAt: 1 });

cardSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
});

export const Card = mongoose.model<ICard>('Card', cardSchema);