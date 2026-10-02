const mongoose = require('mongoose');

// Admin, teacher, and therapist are all a User with a role. Auth and
// permission logic is identical across the three, so one collection
// with a role field avoids duplicating that logic three times.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'therapist'], required: true },
    // Only meaningful when role === 'therapist'. Free text on purpose:
    // we don't know this program's exact specialty taxonomy up front.
    specialty: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
