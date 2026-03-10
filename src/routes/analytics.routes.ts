import { Router } from 'express';
import { getDashboardStats, getWeeklyReport, downloadWeeklyReportPDF } from '../controllers/analytics.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Protected routes

router.get('/dashboard', getDashboardStats);
router.get('/weekly', getWeeklyReport);
router.get('/weekly/pdf', downloadWeeklyReportPDF);

export default router;
