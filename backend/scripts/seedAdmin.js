// Run once with: npm run seed:admin
// Creates the first admin account from SEED_ADMIN_* in .env. Every other
// account (teachers, therapists, and any further admins) gets created
// from inside the app by an existing admin, not by another script.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function seed() {
  const { MONGO_URI, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI) throw new Error('MONGO_URI is not set in .env');
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding');
  }

  await mongoose.connect(MONGO_URI);

  const email = SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists for ${email}, nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
  await User.create({
    name: SEED_ADMIN_NAME || 'Admin',
    email,
    passwordHash,
    role: 'admin',
  });

  console.log(`Admin account created for ${email}. Change the password after first login.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
