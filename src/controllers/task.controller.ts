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
    const { subjectId, topic, studyTime, priority, dueDate, spacedRepetitionDays, offlineId } = req.body;

    const task = new Task({
      userId,
      subjectId,
      topic,
      studyTime,
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
    const { status } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status } },
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
    console.error('completeTask error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
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
