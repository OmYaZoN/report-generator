const express = require('express');
const mongoose = require('mongoose');
const Template = require('../models/Template');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'At least one question is required';
  }
  for (const q of questions) {
    if (!q.text || !q.text.trim()) return 'Every question needs text';
    if (!Array.isArray(q.options) || q.options.length === 0) {
      return `"${q.text}" needs at least one option`;
    }
    for (const opt of q.options) {
      if (!opt.text || !opt.text.trim()) return `An option under "${q.text}" is missing text`;
    }
  }
  return null;
}

// Any authenticated staff member can read active templates for their
// own role, they need this to know what questions they'll be filling.
// Admin can see everything, including inactive ones, for editing.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.role = req.user.role;
      filter.isActive = true;
    } else {
      if (req.query.role) filter.role = req.query.role;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    }
    const templates = await Template.find(filter).sort({ title: 1 });
    res.json(templates);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && (template.role !== req.user.role || !template.isActive)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(template);
  })
);

router.use(requireRole('admin'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, role, questions } = req.body;
    if (!title || !role) return res.status(400).json({ error: 'title and role are required' });
    if (!['teacher', 'therapist'].includes(role)) {
      return res.status(400).json({ error: "role must be 'teacher' or 'therapist'" });
    }
    const questionError = validateQuestions(questions);
    if (questionError) return res.status(400).json({ error: questionError });

    const template = await Template.create({ title, role, questions, createdBy: req.user._id });
    res.status(201).json(template);
  })
);

// Editing never touches submissions already made from this template:
// Submission.js copies the questions into itself at creation time.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const updates = {};
    const { title, questions, isActive } = req.body;
    if (title !== undefined) updates.title = title;
    if (isActive !== undefined) updates.isActive = isActive;
    if (questions !== undefined) {
      const questionError = validateQuestions(questions);
      if (questionError) return res.status(400).json({ error: questionError });
      updates.questions = questions;
    }

    const template = await Template.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const template = await Template.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deactivated', template });
  })
);

module.exports = router;
