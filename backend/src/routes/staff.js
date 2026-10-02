const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All staff management is admin-only. Teachers and therapists never
// create or edit their own accounts, or anyone else's.
router.use(requireAuth, requireRole('admin'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, specialty } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!['teacher', 'therapist'].includes(role)) {
      return res.status(400).json({ error: "role must be 'teacher' or 'therapist'" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailLower = String(email).toLowerCase();
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const staff = await User.create({
      name,
      email: emailLower,
      passwordHash,
      role,
      specialty: role === 'therapist' ? specialty : undefined,
    });

    res.status(201).json({
      id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      specialty: staff.specialty,
      isActive: staff.isActive,
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { role: { $in: ['teacher', 'therapist'] } };
    if (req.query.role && ['teacher', 'therapist'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    const staff = await User.find(filter).select('-passwordHash').sort({ name: 1 });
    res.json(staff);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const staff = await User.findOne({
      _id: req.params.id,
      role: { $in: ['teacher', 'therapist'] },
    }).select('-passwordHash');
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json(staff);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const updates = {};
    const { name, email, specialty, isActive } = req.body;
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = String(email).toLowerCase();
    if (specialty !== undefined) updates.specialty = specialty;
    if (isActive !== undefined) updates.isActive = isActive;

    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['teacher', 'therapist'] } },
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json(staff);
  })
);

// Deactivate, not delete. A hard delete would orphan every Student and
// Submission that references this person; isActive:false blocks their
// login (see requireAuth) without touching history.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['teacher', 'therapist'] } },
      { isActive: false },
      { new: true }
    ).select('-passwordHash');
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deactivated', staff });
  })
);

module.exports = router;
