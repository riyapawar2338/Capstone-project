// models/Internship.js
const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Internship title is required'],
      trim: true,
      maxlength: [150, 'Title too long'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
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
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      // e.g. "3 months", "6 months"
    },
    stipend: {
      type: String,
      default: 'Unpaid',
      // e.g. "₹15,000/mo"
    },
    stipendAmount: {
      type: Number,
      default: 0,   // numeric value for sorting
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    minCgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    seats: {
      type: Number,
      required: [true, 'Number of seats is required'],
      min: [1, 'At least 1 seat required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description too long'],
    },
    tags: {
      type: [String],
      default: [],
    },
    deadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },

    // Statistics (updated when applications are processed)
    applicationCount: {
      type: Number,
      default: 0,
    },
    acceptedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
InternshipSchema.index({ domain: 1 });
InternshipSchema.index({ isActive: 1 });
InternshipSchema.index({ deadline: 1 });
InternshipSchema.index({ minCgpa: 1 });
InternshipSchema.index({ title: 'text', company: 'text', description: 'text' });

// ── Virtual: seatsLeft ────────────────────────────────────────
InternshipSchema.virtual('seatsLeft').get(function () {
  return Math.max(0, this.seats - this.acceptedCount);
});

// ── Virtual: isExpired ────────────────────────────────────────
InternshipSchema.virtual('isExpired').get(function () {
  return this.deadline && new Date(this.deadline) < new Date();
});

module.exports =
  mongoose.models.Internship ||
  mongoose.model('Internship', InternshipSchema);