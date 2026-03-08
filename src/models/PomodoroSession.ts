import mongoose, { Schema, Document } from 'mongoose';

export interface IPomodoroSession extends Document {
  userId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  duration: number; // in minutes, usually 25
  completedAt: Date;
  offlineId?: string;
}

const PomodoroSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  duration: { type: Number, required: true, default: 25 },
  completedAt: { type: Date, required: true, default: Date.now },
  offlineId: { type: String },
});

export default mongoose.model<IPomodoroSession>('PomodoroSession', PomodoroSessionSchema);
