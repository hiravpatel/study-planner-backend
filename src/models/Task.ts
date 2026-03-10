import mongoose, { Schema, Document } from 'mongoose';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  TODO = 'TODO',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  topic: string;
  studyTime: number; // in minutes
  startTime?: string; // e.g., "10:00"
  endTime?: string; // e.g., "12:00"
  priority: TaskPriority;
  dueDate: Date;
  status: TaskStatus;
  note?: string; // Optional reasoning or log for completions
  carriedOver: boolean; // Flag if moved from a previous day
  isExtended: boolean;
  spacedRepetitionDays: number[]; // e.g., [1, 3, 7, 30]
  parentTaskId?: mongoose.Types.ObjectId; // If this is a revision task
  offlineId?: string; // For offline sync queue
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topic: { type: String, required: true },
    studyTime: { type: Number, required: true, default: 60 },
    startTime: { type: String },
    endTime: { type: String },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
    note: { type: String },
    carriedOver: { type: Boolean, default: false },
    isExtended: { type: Boolean, default: false },
    spacedRepetitionDays: { type: [Number], default: [1, 3, 7, 30] },
    parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    offlineId: { type: String }, // Provided by frontend when created offline
  },
  { timestamps: true }
);

// Index to quickly query tasks by user or offline sync
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ offlineId: 1 }, { sparse: true });

export default mongoose.model<ITask>('Task', TaskSchema);
