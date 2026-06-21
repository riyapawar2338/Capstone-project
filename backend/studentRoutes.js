const express = require('express');
const router = express.Router();

const ctrl = require('./studentController');
const { protect } = require('./auth');
const { studentRules, mongoIdParam, validate } = require('./validate');
const upload = require('./upload');

/* ============================================================
   PUBLIC ROUTES
   ============================================================ */

// Public registration for students
router.post('/register', ctrl.registerStudent);

// Public browse / read routes
router.get('/', ctrl.getAllStudents);
router.get('/:id', mongoIdParam(), validate, ctrl.getStudentById);
router.get('/:id/recommendations', mongoIdParam(), validate, ctrl.getRecommendationsForStudent);
router.get('/:id/applications', mongoIdParam(), validate, ctrl.getStudentApplications);
router.get('/:id/resume', mongoIdParam(), validate, ctrl.downloadResume);

/* ============================================================
   PROTECTED ADMIN ROUTES
   ============================================================ */

// Admin creates student manually
router.post(
  '/',
  protect,
  upload.single('resume'),
  studentRules,
  validate,
  ctrl.createStudent
);

// Admin updates student
router.put(
  '/:id',
  protect,
  mongoIdParam(),
  validate,
  upload.single('resume'),
  ctrl.updateStudent
);

// Admin deletes student
router.delete(
  '/:id',
  protect,
  mongoIdParam(),
  validate,
  ctrl.deleteStudent
);

module.exports = router;