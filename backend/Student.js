// models/Student.js
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // ── Academic ──────────────────────────────────────────────
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: [
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecom',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'AI & Data Science',
      ],
    },
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      enum: [
        'Semester 1','Semester 2','Semester 3',
        'Semester 4','Semester 5','Semester 6',
      ],
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
      default: null,
    },

    // ── Skills & Profile ──────────────────────────────────────
    technicalSkills: {
      type: [String],
      default: [],
      validate: {
        validator: arr => arr.length > 0,
        message: 'At least one technical skill is required',
      },
    },
    softSkills: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    projects: {
      type: String,
      default: '',
      maxlength: [2000, 'Projects description too long'],
    },
    areasOfInterest: {
      type: [String],
      default: [],
    },
    preferredDomain: {
      type: String,
      required: [true, 'Preferred domain is required'],
      enum: [
        'Artificial Intelligence',
        'Web Development',
        'Data Science',
        'Mobile Development',
        'Cybersecurity',
        'Cloud Computing',
        'UI/UX Design',
        'Internet of Things',
        'Embedded Systems',
        'DevOps',
      ],
    },

    // ── Contact ────────────────────────────────────────────────
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Resume ─────────────────────────────────────────────────
    resumeFile: {
      type: String,   // stored filename
      default: '',
    },
    resumeOriginalName: {
      type: String,
      default: '',
    },

    // ── Profile completeness (computed on save) ──────────────
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ── Status ─────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,   // adds createdAt & updatedAt
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
StudentSchema.index({ rollNo: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ department: 1 });
StudentSchema.index({ preferredDomain: 1 });
StudentSchema.index({ cgpa: -1 });
StudentSchema.index({ fullName: 'text', rollNo: 'text' }); // text search

// ── Pre-save: compute profile completeness ─────────────────────
StudentSchema.pre('save', function (next) {
  const fields = [
    this.fullName, this.rollNo, this.department, this.semester,
    this.cgpa, this.email, this.preferredDomain,
    this.technicalSkills?.length,
    this.certifications?.length,
    this.projects,
    this.resumeFile,
  ];
  const filled = fields.filter(Boolean).length;
  this.profileCompleteness = Math.round((filled / fields.length) * 100);
  next();
});

// ── Virtual: initials ──────────────────────────────────────────
StudentSchema.virtual('initials').get(function () {
  return this.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

module.exports = mongoose.model('Student', StudentSchema);