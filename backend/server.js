require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const staffRoutes = require('./src/routes/staff');
const studentRoutes = require('./src/routes/students');
const templateRoutes = require('./src/routes/templates');
const submissionRoutes = require('./src/routes/submissions');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/submissions', submissionRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// If ../frontend has been built (npm run build), serve it from here so
// the whole app is one service on one origin, no CORS, and the auth
// cookie stays same-site instead of needing SameSite=None across two
// separately hosted services. In local dev, run the Vite dev server
// separately instead (npm run dev in frontend/) and this block is
// simply skipped since dist/ won't exist yet.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Anything an asyncHandler-wrapped route passed to next(err) lands here
// instead of hanging the request or crashing the process.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
