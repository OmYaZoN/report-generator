const express = require('express');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const Template = require('../models/Template');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { generateSubmissionPDF } = require('../utils/generatePDF');

const router = express.Router();

router.use(requireAuth);

function isAssigned(student, staff) {
  if (staff.role === 'teacher') return String(student.teacher) === String(staff._id);
  if (staff.role === 'therapist') return student.therapists.some((id) => String(id) === String(staff._id));
  return false;
}

function scopeFilter(user, query) {
  const filter = {};
  if (user.role !== 'admin') filter.staff = user._id;
  if (query.student && mongoose.isValidObjectId(query.student)) filter.student = query.student;
  if (query.status) filter.status = query.status;
  return filter;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const submissions = await Submission.find(scopeFilter(req.user, req.query))
      .populate('student', 'name')
      .populate('staff', 'name role')
      .select('-questions')
      .sort({ createdAt: -1 });
    res.json(submissions);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name dateOfBirth')
      .populate('staff', 'name role')
      .populate('reviewedBy', 'name');
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && String(submission.staff._id) !== String(req.user._id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(submission);
  })
);

// Teacher or therapist starts a new report for one of their own
// students, using an active template that matches their own role.
// This is the freeze: questions and options are copied in now, the
// submission never reads the template again for content.
router.post(
  '/',
  requireRole('teacher', 'therapist'),
  asyncHandler(async (req, res) => {
    const { studentId, templateId } = req.body;
    if (!studentId || !templateId) {
      return res.status(400).json({ error: 'studentId and templateId are required' });
    }
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(templateId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const student = await Student.findOne({ _id: studentId, isActive: true });
    if (!student || !isAssigned(student, req.user)) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    const template = await Template.findOne({ _id: templateId, role: req.user.role, isActive: true });
    if (!template) return res.status(404).json({ error: 'Template not found for your role' });

    const questions = template.questions.map((q) => ({
      text: q.text,
      category: q.category,
      options: q.options.map((o) => ({ text: o.text, selected: false })),
    }));

    const submission = await Submission.create({
      student: student._id,
      staff: req.user._id,
      staffRole: req.user.role,
      template: template._id,
      templateTitle: template.title,
      questions,
      status: 'draft',
    });

    res.status(201).json(submission);
  })
);

// Own submission only, only while it's actually editable. The client
// sends back the full questions array as edited in the UI, but only
// the selected flags are ever applied, matched by position against
// what's already stored. Question and option text can't be rewritten
// through this endpoint even by a buggy or tampered client.
router.patch(
  '/:id',
  requireRole('teacher', 'therapist'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const submission = await Submission.findOne({ _id: req.params.id, staff: req.user._id });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'revision_requested'].includes(submission.status)) {
      return res.status(409).json({ error: `Cannot edit a submission with status "${submission.status}"` });
    }

    const { questions, comments } = req.body;
    if (questions) {
      if (!Array.isArray(questions) || questions.length !== submission.questions.length) {
        return res.status(400).json({ error: 'questions must match the original form structure' });
      }
      for (let i = 0; i < questions.length; i++) {
        const incoming = questions[i];
        const existing = submission.questions[i];
        if (!incoming.options || incoming.options.length !== existing.options.length) {
          return res.status(400).json({ error: 'questions must match the original form structure' });
        }
        incoming.options.forEach((opt, j) => {
          existing.options[j].selected = !!opt.selected;
        });
      }
    }
    if (comments !== undefined) submission.comments = comments;

    await submission.save();
    res.json(submission);
  })
);

router.post(
  '/:id/submit',
  requireRole('teacher', 'therapist'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const submission = await Submission.findOne({ _id: req.params.id, staff: req.user._id });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'revision_requested'].includes(submission.status)) {
      return res.status(409).json({ error: `Cannot submit from status "${submission.status}"` });
    }
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();
    res.json(submission);
  })
);

router.post(
  '/:id/approve',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (submission.status !== 'submitted') {
      return res.status(409).json({ error: 'Only a submitted report can be approved' });
    }
    submission.status = 'approved';
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.user._id;
    await submission.save();
    res.json(submission);
  })
);

router.post(
  '/:id/request-revision',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { feedback } = req.body;
    if (!feedback) return res.status(400).json({ error: 'feedback is required' });
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (submission.status !== 'submitted') {
      return res.status(409).json({ error: 'Only a submitted report can be sent back' });
    }
    submission.status = 'revision_requested';
    submission.adminFeedback = feedback;
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.user._id;
    await submission.save();
    res.json(submission);
  })
);

router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const submission = await Submission.findById(req.params.id).populate('student').populate('staff');
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && String(submission.staff._id) !== String(req.user._id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (submission.status !== 'approved') {
      return res.status(409).json({ error: 'Only an approved report has a PDF' });
    }
    generateSubmissionPDF(submission, submission.student, submission.staff, res);
  })
);

module.exports = router;
