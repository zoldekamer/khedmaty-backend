const express = require('express');
const {
    getDashboard,
    getUsers,
    getRequests,
    getProviders,
    updateRequestStatus,
    updateProviderStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/requests', getRequests);
router.get('/providers', getProviders);
router.patch('/requests/:id/status', updateRequestStatus);
router.patch('/providers/:id/status', updateProviderStatus);

module.exports = router;
