import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  preferences?: {
    dailyStudyGoal?: number; // in minutes
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    preferences: {
      dailyStudyGoal: { type: Number, default: 240 }, // Default 4 hours
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
