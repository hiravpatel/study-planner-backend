import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import subjectRoutes from './routes/subject.routes';
import taskRoutes from './routes/task.routes';
import pomodoroRoutes from './routes/pomodoro.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Study Planner API is running' });
});

export default app;
