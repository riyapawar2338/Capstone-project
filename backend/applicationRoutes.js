// routes/applicationRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./applicationController');
const { protect }                               = require('./auth');
const { applicationRules, mongoIdParam, validate } = require('./validate');

// Public: submit application
router.post('/', applicationRules, validate, ctrl.createApplication);

// Admin protected
router.get   ('/'                , protect, ctrl.getAllApplications);
router.get   ('/analytics'       , protect, ctrl.getAnalytics);
router.get   ('/:id'             , protect, mongoIdParam(), validate, ctrl.getApplicationById);
router.patch ('/:id/status'      , protect, mongoIdParam(), validate, ctrl.updateStatus);
router.delete('/:id'             , protect, mongoIdParam(), validate, ctrl.deleteApplication);

module.exports = router;