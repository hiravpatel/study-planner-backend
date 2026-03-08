import { Response } from 'express';
import PomodoroSession from '../models/PomodoroSession';
import Task from '../models/Task';
import { AuthRequest } from '../middlewares/auth.middleware';

export const logSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { taskId, duration, offlineId } = req.body;

    const session = new PomodoroSession({
      userId,
      taskId,
      duration: duration || 25,
      completedAt: new Date(),
      offlineId
    });

    await session.save();

    // Optionally update task study time or progress

    res.status(201).json(session);
  } catch (error) {
    console.error('logSession error:', error);
    res.status(500).json({ error: 'Failed to log pomodoro session' });
  }
};

export const getRecentSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get last N sessions
    const sessions = await PomodoroSession.find({ userId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .populate('taskId', 'topic subjectId'); // Populate specific fields of the task
      
    res.json(sessions);
  } catch (error) {
    console.error('getRecentSessions error:', error);
    res.status(500).json({ error: 'Failed to fetch pomodoro sessions' });
  }
};
