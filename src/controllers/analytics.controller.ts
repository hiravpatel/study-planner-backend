import { Response } from 'express';
import PomodoroSession from '../models/PomodoroSession';
import Task, { TaskStatus } from '../models/Task';
import Subject from '../models/Subject';
import { AuthRequest } from '../middlewares/auth.middleware';
import mongoose from 'mongoose';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Total Completed Tasks
    const completedTasksCount = await Task.countDocuments({ 
      userId: userObjectId, 
      status: TaskStatus.COMPLETED 
    });

    // 2. Tasks Due Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasksToday = await Task.countDocuments({
      userId: userObjectId,
      status: TaskStatus.PENDING,
      dueDate: { $gte: todayStart, $lte: todayEnd }
    });

    // 3. Total Pomodoro Time (in minutes)
    const pomodoroStats = await PomodoroSession.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, totalMinutes: { $sum: '$duration' } } }
    ]);
    const totalStudyMinutes = pomodoroStats.length > 0 ? pomodoroStats[0].totalMinutes : 0;

    // 4. Study Hours Per Subject (Analytics Chart Data)
    // First, join Pomodoro Sessions with Tasks to get Subject ID
    // Note: Since PomodoroSession taskId is optional, we aggregate those with taskIds
    const subjectStats = await PomodoroSession.aggregate([
      { $match: { userId: userObjectId, taskId: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task'
        }
      },
      { $unwind: '$task' },
      {
        $group: {
          _id: '$task.subjectId',
          totalMinutes: { $sum: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: '$subject' },
      {
        $project: {
          _id: 0,
          subjectId: '$_id',
          subjectName: '$subject.name',
          color: '$subject.color',
          totalMinutes: 1,
          hours: { $divide: ['$totalMinutes', 60] }
        }
      }
    ]);

    res.json({
      completedTasksCount,
      tasksToday,
      totalStudyMinutes,
      subjectStats
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
