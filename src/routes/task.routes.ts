import { Router } from 'express';
import { getTasks, createTask, updateTask, updateTaskStatus, generateRevisions, deleteTask, extendTaskTime, carryOverTask } from '../controllers/task.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Protected routes

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.put('/:id/status', updateTaskStatus);
router.put('/:id/extend', extendTaskTime);
router.put('/:id/carry', carryOverTask);
router.post('/:id/revisions', generateRevisions);
router.delete('/:id', deleteTask);

export default router;
