import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' }, // Default primary blue
  },
  { timestamps: true }
);

// Prevent duplicate subject names for the same user
SubjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ISubject>('Subject', SubjectSchema);
