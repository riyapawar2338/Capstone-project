// /validate.js
const { validationResult, body, param, query } = require('express-validator');

// ── Run validations & return errors ──────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Student validation rules ──────────────────────────────────
const studentRules = [
  body('fullName')
    .trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 chars'),
  body('rollNo')
    .trim().notEmpty().withMessage('Roll number is required'),
  body('department')
    .notEmpty().withMessage('Department is required')
    .isIn([
      'Computer Engineering','Information Technology',
      'Electronics & Telecom','Electrical Engineering',
      'Mechanical Engineering','Civil Engineering','AI & Data Science',
    ]).withMessage('Invalid department'),
  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isIn(['Semester 1','Semester 2','Semester 3','Semester 4','Semester 5','Semester 6'])
    .withMessage('Invalid semester'),
  body('cgpa')
    .notEmpty().withMessage('CGPA is required')
    .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10'),
  body('percentage')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0–100'),
  body('technicalSkills')
    .isArray({ min: 1 }).withMessage('At least one technical skill is required'),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('preferredDomain')
    .notEmpty().withMessage('Preferred domain is required'),
];

// ── Internship validation rules ───────────────────────────────
const internshipRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('company').trim().notEmpty().withMessage('Company is required'),
  body('domain').notEmpty().withMessage('Domain is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('duration').trim().notEmpty().withMessage('Duration is required'),
  body('seats')
    .isInt({ min: 1 }).withMessage('Seats must be at least 1'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('deadline')
    .notEmpty().withMessage('Deadline is required')
    .isISO8601().withMessage('Invalid date format'),
  body('minCgpa')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('Min CGPA must be 0–10'),
];

// ── Application validation rules ──────────────────────────────
const applicationRules = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID'),
  body('internshipId')
    .notEmpty().withMessage('Internship ID is required')
    .isMongoId().withMessage('Invalid internship ID'),
  body('coverLetter')
    .optional()
    .isLength({ max: 1000 }).withMessage('Cover letter max 1000 chars'),
];

// ── Login validation rules ────────────────────────────────────
const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── MongoId param ─────────────────────────────────────────────
const mongoIdParam = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
];

module.exports = {
  validate,
  studentRules,
  internshipRules,
  applicationRules,
  loginRules,
  mongoIdParam,
};