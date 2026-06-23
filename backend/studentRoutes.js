const express = require('express');
const router = express.Router();

const ctrl = require('./studentController');
const { protect, protectStudent } = require('./auth'); // ← add protectStudent
const { studentRules, mongoIdParam, validate } = require('./validate');
const upload = require('./upload');

/* ============================================================
   PUBLIC ROUTES
   ============================================================ */
router.post('/register', ctrl.registerStudent);

router.get('/', ctrl.getAllStudents);
router.get('/:id/recommendations', mongoIdParam(), validate, ctrl.getRecommendationsForStudent);
router.get('/:id/applications', mongoIdParam(), validate, ctrl.getStudentApplications);
router.get('/:id/resume', mongoIdParam(), validate, ctrl.downloadResume);
router.get('/:id', mongoIdParam(), validate, ctrl.getStudentById);

/* ============================================================
   STUDENT SELF-UPDATE (student token allowed)
   ============================================================ */
router.put(
  '/:id/self',
  protectStudent,
  mongoIdParam(),
  validate,
  upload.single('resume'),
  ctrl.updateStudent
);

/* ============================================================
   PROTECTED ADMIN ROUTES
   ============================================================ */
router.post(
  '/',
  protect,
  upload.single('resume'),
  studentRules,
  validate,
  ctrl.createStudent
);

router.put(
  '/:id',
  protect,
  mongoIdParam(),
  validate,
  upload.single('resume'),
  ctrl.updateStudent
);

router.delete(
  '/:id',
  protect,
  mongoIdParam(),
  validate,
  ctrl.deleteStudent
);

module.exports = router;