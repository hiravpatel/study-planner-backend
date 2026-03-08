import { Response } from 'express';
import Subject from '../models/Subject';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const subjects = await Subject.find({ userId });
    res.json(subjects);
  } catch (error) {
    console.error('getSubjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, color } = req.body;

    const existing = await Subject.findOne({ userId, name });
    if (existing) {
      res.status(400).json({ error: 'Subject with this name already exists' });
      return;
    }

    const subject = new Subject({ userId, name, color });
    await subject.save();
    
    res.status(201).json(subject);
  } catch (error) {
    console.error('createSubject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, color } = req.body;

    const subject = await Subject.findOneAndUpdate(
      { _id: id, userId },
      { name, color },
      { new: true }
    );

    if (!subject) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }

    res.json(subject);
  } catch (error) {
    console.error('updateSubject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const subject = await Subject.findOneAndDelete({ _id: id, userId });
    if (!subject) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }

    // Note: We might want to cascade delete or mark tasks as orphaned,
    // but for simplicity, we'll just delete the subject here.

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('deleteSubject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};
