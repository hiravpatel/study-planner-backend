import { Router } from 'express';
import { getDashboardStats } from '../controllers/analytics.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Protected routes

router.get('/dashboard', getDashboardStats);

export default router;
