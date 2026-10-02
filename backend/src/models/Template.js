const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // e.g. behaviour, learning, eating, socializing
    // Any number of options, each written specifically for this question.
    // No fixed count, no shared/reused option bank.
    options: {
      type: [optionSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
  },
  { _id: true }
);

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    // Teacher and therapist templates are separate objects, same builder,
    // different audience.
    role: { type: String, enum: ['teacher', 'therapist'], required: true },
    isActive: { type: Boolean, default: true },
    questions: {
      type: [questionSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
