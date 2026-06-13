// routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./adminController');
const { protect } = require('./auth');

// All admin routes are protected
router.use(protect);

router.get ('/dashboard'           , ctrl.getDashboard);
router.get ('/allocation'          , ctrl.getAllocationReport);
router.get ('/reports/students'    , ctrl.reportStudents);
router.get ('/reports/recommendations', ctrl.reportRecommendations);
router.put ('/profile'             , ctrl.updateProfile);
router.put ('/change-password'     , ctrl.changePassword);

module.exports = router;