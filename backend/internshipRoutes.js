// routes/internshipRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./internshipController');
const { protect }                              = require('./auth');
const { internshipRules, mongoIdParam, validate } = require('./validate');

// Public
router.get('/meta/filters'        , ctrl.getFilterMeta);
router.get('/'                    , ctrl.getAllInternships);
router.get('/:id'                 , mongoIdParam(), validate, ctrl.getInternshipById);
router.get('/:id/applications'    , protect, mongoIdParam(), validate, ctrl.getInternshipApplications);

// Admin only
router.post  ('/'    , protect, internshipRules, validate, ctrl.createInternship);
router.put   ('/:id' , protect, mongoIdParam(), validate, ctrl.updateInternship);
router.delete('/:id' , protect, mongoIdParam(), validate, ctrl.deleteInternship);

module.exports = router;