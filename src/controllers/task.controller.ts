import { Response } from 'express';
import Task, { TaskStatus } from '../models/Task';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    // Optional filters could be added here (e.g. by date, subject)
    const tasks = await Task.find({ userId }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    console.error('getTasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { subjectId, topic, studyTime, startTime, endTime, priority, dueDate, spacedRepetitionDays, offlineId } = req.body;

    const task = new Task({
      userId,
      subjectId,
      topic,
      studyTime,
      startTime,
      endTime,
      priority,
      dueDate,
      spacedRepetitionDays: spacedRepetitionDays || [1, 3, 7, 30],
      offlineId
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('createTask error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('updateTask error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status, note } = req.body || {};

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status, ...(note !== undefined && { note }) } },
      { new: true }
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ message: 'Task status updated', task });
  } catch (error) {
    console.error('updateTaskStatus error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const extendTaskTime = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { additionalMinutes } = req.body || {};

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const extraMins = additionalMinutes || 15;

    if (task.endTime) {
      const [hours, minutes] = task.endTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes, 0, 0);
      endDate.setMinutes(endDate.getMinutes() + extraMins);
      
      const newHours = endDate.getHours().toString().padStart(2, '0');
      const newMinutes = endDate.getMinutes().toString().padStart(2, '0');
      task.endTime = `${newHours}:${newMinutes}`;
    }

    task.isExtended = true;
    task.studyTime += extraMins;
    await task.save();

    res.json({ message: 'Task time extended', task });
  } catch (error) {
    console.error('extendTaskTime error:', error);
    res.status(500).json({ error: 'Failed to extend task time' });
  }
};

export const generateRevisions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Generate Spaced Repetition Revisions
    const generatedTasks = [];
    if (task.spacedRepetitionDays && task.spacedRepetitionDays.length > 0) {
      const completionDate = new Date();
      
      for (const days of task.spacedRepetitionDays) {
        const nextDate = new Date(completionDate);
        nextDate.setDate(completionDate.getDate() + days);

        const revisionTask = new Task({
          userId,
          subjectId: task.subjectId,
          topic: `${task.topic} (Revision Day ${days})`,
          studyTime: Math.max(15, Math.floor(task.studyTime / 2)), // Revisions are usually shorter
          priority: task.priority,
          dueDate: nextDate,
          spacedRepetitionDays: [], // Revision tasks don't generate their own revisions
          parentTaskId: task._id
        });

        generatedTasks.push(revisionTask);
      }
      
      if (generatedTasks.length > 0) {
        await Task.insertMany(generatedTasks);
      }
    }

    res.json({ message: 'Revisions scheduled successfully', task, generatedRevisions: generatedTasks.length });
  } catch (error) {
    console.error('generateRevisions error:', error);
    res.status(500).json({ error: 'Failed to schedule revisions' });
  }
};

export const carryOverTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    // Default to 'tomorrow' if no targetDate is passed
    const { targetDate } = req.body || {}; 

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    let nextDate: Date;
    if (targetDate) {
      nextDate = new Date(targetDate);
    } else {
      nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // We simply update the current task's dueDate to the next date
    // and mark it carriedOver
    task.dueDate = nextDate;
    task.carriedOver = true;
    task.status = TaskStatus.TODO; // Reset it to TODO usually
    await task.save();

    res.json({ message: 'Task carried over successfully', task });
  } catch (error) {
    console.error('carryOverTask error:', error);
    res.status(500).json({ error: 'Failed to carry over task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('deleteTask error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
