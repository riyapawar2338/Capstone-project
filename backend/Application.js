// models/Application.js
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship reference is required'],
    },

    // AI-computed match score at time of application
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    matchBreakdown: {
      skillScore:   { type: Number, default: 0 },
      domainScore:  { type: Number, default: 0 },
      cgpaScore:    { type: Number, default: 0 },
      interestScore:{ type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ['Pending', 'Shortlisted', 'Accepted', 'Rejected', 'Withdrawn'],
      default: 'Pending',
    },

    // Admin notes
    adminNotes: {
      type: String,
      default: '',
      maxlength: [500, 'Notes too long'],
    },

    // Timeline
    statusHistory: [
      {
        status:    { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: 'System' },
        note:      { type: String, default: '' },
      },
    ],

    // Cover letter / message from student
    coverLetter: {
      type: String,
      default: '',
      maxlength: [1000, 'Cover letter too long'],
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

// ── Compound unique index: one application per student per internship ──
ApplicationSchema.index({ student: 1, internship: 1 }, { unique: true });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ matchScore: -1 });
ApplicationSchema.index({ student: 1 });
ApplicationSchema.index({ internship: 1 });

// ── Pre-save: push to status history when status changes ──────
ApplicationSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model('Application', ApplicationSchema);