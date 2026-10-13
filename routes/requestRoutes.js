const express = require('express');
const router = express.Router();
const { createRequest, getUserRequests } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createRequest)
    .get(protect, getUserRequests);

module.exports = router;
