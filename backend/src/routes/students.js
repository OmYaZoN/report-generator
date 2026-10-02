const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

// Admin sees every student. A teacher sees only their own class. A
// therapist sees only students they're on the therapist list for.
function scopeFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'teacher') return { teacher: user._id };
  if (user.role === 'therapist') return { therapists: user._id };
  return { _id: null };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const students = await Student.find({ ...scopeFilter(req.user), isActive: true })
      .populate('teacher', 'name email')
      .populate('therapists', 'name email specialty')
      .sort({ name: 1 });
    res.json(students);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const student = await Student.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
      .populate('teacher', 'name email')
      .populate('therapists', 'name email specialty');
    // Same 404 whether the id doesn't exist or just isn't this person's
    // to see, so guessing an id can't distinguish the two cases.
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  })
);

router.use(requireRole('admin'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, dateOfBirth, guardianName, guardianContact, guardianConsentOnFile, teacher, therapists } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    if (teacher && !(await User.exists({ _id: teacher, role: 'teacher', isActive: true }))) {
      return res.status(400).json({ error: 'teacher must reference an active teacher account' });
    }
    if (therapists?.length) {
      const count = await User.countDocuments({ _id: { $in: therapists }, role: 'therapist', isActive: true });
      if (count !== therapists.length) {
        return res.status(400).json({ error: 'therapists must all reference active therapist accounts' });
      }
    }

    const student = await Student.create({
      name,
      dateOfBirth,
      guardianName,
      guardianContact,
      guardianConsentOnFile: !!guardianConsentOnFile,
      teacher: teacher || undefined,
      therapists: therapists || [],
    });
    res.status(201).json(student);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const allowed = ['name', 'dateOfBirth', 'guardianName', 'guardianContact', 'guardianConsentOnFile', 'teacher', 'therapists', 'isActive'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.teacher && !(await User.exists({ _id: updates.teacher, role: 'teacher', isActive: true }))) {
      return res.status(400).json({ error: 'teacher must reference an active teacher account' });
    }
    if (updates.therapists?.length) {
      const count = await User.countDocuments({ _id: { $in: updates.therapists }, role: 'therapist', isActive: true });
      if (count !== updates.therapists.length) {
        return res.status(400).json({ error: 'therapists must all reference active therapist accounts' });
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('teacher', 'name email')
      .populate('therapists', 'name email specialty');
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const student = await Student.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deactivated', student });
  })
);

module.exports = router;
