// routes/studentRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./studentController');
const { protect }                        = require('./auth');
const { studentRules, mongoIdParam, validate } = require('./validate');
const upload  = require('./upload');

// Public: browse students (admin also uses this)
router.get ('/'                    , ctrl.getAllStudents);
router.get ('/:id'                 , mongoIdParam(), validate, ctrl.getStudentById);
router.get ('/:id/recommendations' , mongoIdParam(), validate, ctrl.getRecommendationsForStudent);
router.get ('/:id/applications'    , mongoIdParam(), validate, ctrl.getStudentApplications);
router.get ('/:id/resume'          , mongoIdParam(), validate, ctrl.downloadResume);

// Mutations — protected (admin)
router.post ('/'    , protect, upload.single('resume'), studentRules, validate, ctrl.createStudent);
router.put  ('/:id' , protect, mongoIdParam(), validate, upload.single('resume'), ctrl.updateStudent);
router.delete('/:id', protect, mongoIdParam(), validate, ctrl.deleteStudent);

module.exports = router;