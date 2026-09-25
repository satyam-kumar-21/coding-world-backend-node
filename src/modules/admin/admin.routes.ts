import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireAdmin } from '../../middlewares/authenticate';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', (req, res, next) => adminController.dashboard(req, res, next));

// Users
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.patch('/users/:userId/role', (req, res, next) => adminController.updateRole(req, res, next));
router.post('/users/:userId/suspend', (req, res, next) => adminController.suspend(req, res, next));
router.post('/users/:userId/restore', (req, res, next) => adminController.restore(req, res, next));

// Reports
router.get('/reports', (req, res, next) => adminController.listReports(req, res, next));
router.post('/reports/:reportId/moderate', (req, res, next) => adminController.moderateReport(req, res, next));

// Transactions
router.get('/transactions', (req, res, next) => adminController.listTransactions(req, res, next));

export default router;
