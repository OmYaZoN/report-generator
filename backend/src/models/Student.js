const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    guardianName: { type: String, trim: true },
    guardianContact: { type: String, trim: true },
    // Not a consent workflow, just a flag so it doesn't get forgotten.
    guardianConsentOnFile: { type: Boolean, default: false },

    // One teacher per student.
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Many therapists per student (speech, OT, behavioral, etc. can all
    // be assigned at once). If a program only ever assigns one, this
    // still works fine, it just never uses the "many" part.
    therapists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
