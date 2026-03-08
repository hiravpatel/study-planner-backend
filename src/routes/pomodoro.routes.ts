import { Router } from 'express';
import { logSession, getRecentSessions } from '../controllers/pomodoro.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Protected routes

router.post('/', logSession);
router.get('/', getRecentSessions);

export default router;
