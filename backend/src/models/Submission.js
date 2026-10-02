const mongoose = require('mongoose');

// The submission copies its questions and options from the template at
// the moment it's created, rather than referencing the live template.
// That copy is what freezes: editing the template later can never
// reword or orphan a report that's already been started or sent.
const answeredOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    selected: { type: Boolean, default: false },
  },
  { _id: false }
);

const answeredQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    category: { type: String },
    options: [answeredOptionSchema],
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffRole: { type: String, enum: ['teacher', 'therapist'], required: true },

    // Kept for audit/reference (e.g. "which template was this based on"),
    // not for reconstructing content, the snapshot below is the source of truth.
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
    templateTitle: { type: String },

    questions: {
      type: [answeredQuestionSchema],
      required: true,
    },

    comments: { type: String, trim: true },

    // draft: staff is still editing.
    // submitted: staff is done, waiting on admin.
    // revision_requested: admin sent it back with feedback.
    // approved: signed off, PDF is generatable/shareable.
    status: {
      type: String,
      enum: ['draft', 'submitted', 'revision_requested', 'approved'],
      default: 'draft',
    },
    adminFeedback: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    submittedAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
