import { Response } from 'express';
import PomodoroSession from '../models/PomodoroSession';
import Task, { TaskStatus } from '../models/Task';
import Subject from '../models/Subject';
import { AuthRequest } from '../middlewares/auth.middleware';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

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

export const getWeeklyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const oneWeekAgo = new Date();
    oneWeekAgo.setHours(0, 0, 0, 0);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6); // Last 7 days including today

    const tasks = await Task.find({
      userId: userObjectId,
      dueDate: { $gte: oneWeekAgo }
    });

    const dailyStats = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        completed: 0,
        pending: 0,
      };
    });

    tasks.forEach(task => {
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      const dayStat = dailyStats.find(d => d.date === taskDate);
      if (dayStat) {
        if (task.status === TaskStatus.COMPLETED) {
          dayStat.completed += 1;
        } else {
          dayStat.pending += 1;
        }
      }
    });

    res.json({ dailyStats });
  } catch (error) {
    console.error('getWeeklyReport error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
};

export const downloadWeeklyReportPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const tasks = await Task.find({
      userId: userObjectId,
      dueDate: { $gte: oneWeekAgo }
    });

    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const pending = tasks.length - completed;

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-report.pdf');

    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').fillColor('#0f172a').text('Weekly Study Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#64748b').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#334155');
    doc.text(`Total Tasks: ${tasks.length}`);
    doc.text(`Completed Tasks: ${completed}`);
    doc.text(`Pending Tasks: ${pending}`);
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b').text('Task Details', { underline: true });
    doc.moveDown();

    tasks.forEach((task: any, index) => {
      const statusColor = task.status === TaskStatus.COMPLETED ? '#10b981' : '#f59e0b';
      doc.fontSize(12).font('Helvetica-Bold').fillColor(statusColor).text(`[${task.status}] `, { continued: true });
      doc.font('Helvetica').fillColor('#334155').text(`${task.topic} - ${new Date(task.dueDate).toLocaleDateString()}`);
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    console.error('downloadWeeklyReportPDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
