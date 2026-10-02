# Student report generator

A web app for a small autism-support program: admin manages staff,
students, and report templates; teachers and therapists fill and
submit reports against those templates; admin signs off; an approved
report gets an on-demand PDF that staff share with the student's
guardian directly.

Status: this is a working prototype, backend and frontend both, meant
to be run, tested, and reshaped. It is not hardened for a large public
deployment (see "What this prototype does not do" near the bottom
before you rely on it for anything beyond the program it was built
for).

## Project structure

```
report-generator/
  backend/
    server.js                Express entry point; serves the built
                              frontend too, once it exists (see Part 6)
    src/config/db.js          Mongo connection
    src/models/                User, Student, Template, Submission
    src/middleware/auth.js     JWT cookie auth + role guard
    src/utils/asyncHandler.js  wraps async routes so errors don't hang
    src/utils/generatePDF.js   builds the report PDF on demand
    src/routes/
      auth.js         login / logout / me / change password
      staff.js         admin: create/edit/deactivate teachers & therapists
      students.js       admin: create/edit/deactivate + mapping; staff: read own
      templates.js       admin: build/edit report templates per role
      submissions.js     the report flow: start, save, submit, approve,
                          request revision, download PDF
    scripts/seedAdmin.js  creates the first admin account
  frontend/
    src/
      api.js                  fetch wrapper (cookie-based auth)
      context/AuthContext.jsx
      components/              NavBar, ProtectedRoute
      pages/
        LoginPage.jsx
        admin/                 StaffPage, StudentsPage, TemplatesPage, ReportsPage
        staff/                 MyStudentsPage, StudentReportsPage, FillReportPage
      index.css
```

## Prerequisites

- Node.js 18 or later (`node -v` to check).
- A free MongoDB Atlas account. No local Mongo install needed.
- A code editor. That's it, no other paid services required to run
  this locally or to deploy the free version described in Part 6.

## Part 1: Set up MongoDB Atlas (free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create an
   account.
2. Build a database, choose the **M0 (Free)** tier, pick any region
   close to you.
3. Under Database Access, add a new database user with a username and
   password. Use this app's own user, not your Atlas account login.
4. Under Network Access, add an IP entry. For local development, add
   your current IP. You'll revisit this in Part 6 when deploying.
5. Click Connect on your cluster, choose "Drivers", copy the
   connection string. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`
   Add a database name at the end, e.g.
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/report-generator`

## Part 2: Backend setup

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:

```
MONGO_URI=<the connection string from Part 1>
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
SEED_ADMIN_EMAIL=<your email>
SEED_ADMIN_PASSWORD=<a real password, you'll change it after first login>
```

Then:

```bash
npm install
npm run seed:admin      # creates the one admin account, run this once
npm run dev             # starts the API on http://localhost:5000
```

Check it's alive: `curl http://localhost:5000/api/health` should
return `{"ok":true}`.

## Part 3: Frontend setup

Open a second terminal, leave the backend running in the first one.

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

This starts the app on `http://localhost:5173`. The default
`.env.local` already points it at `http://localhost:5000/api`, which
matches the backend you just started.

## Part 4: Walkthrough

1. Open `http://localhost:5173`, log in with the `SEED_ADMIN_EMAIL`
   and `SEED_ADMIN_PASSWORD` you set in Part 2.
2. **Staff** tab: add a teacher and a therapist. The password you type
   in is their real login, for now, there's no email step, so tell
   them what it is directly.
3. **Students** tab: add a student, assign the teacher, tick the
   therapist you just made.
4. **Templates** tab: build one template with role "Teacher" (a
   couple of questions, a few options each) and one with role
   "Therapist".
5. Log out, log back in as the teacher account. Under "My students",
   open the student, start a report, tick some options, save as
   draft, then submit.
6. Log back in as admin. Under **Reports**, filter to "submitted",
   open the report, either Approve or send it back with a note.
7. If approved: log back in as the teacher and download the PDF from
   that report. That PDF is generated fresh from the submission's own
   stored answers every time, nothing is cached or stored as a file.

## Design notes worth knowing before extending this

- **No public registration.** Every account is created by an admin
  from inside the app. `seedAdmin.js` only ever creates the first one.
- **Submissions freeze by copying, not by versioning the template.**
  When a report is started, the current template's questions and
  options are copied into the submission itself. Editing the template
  later can't reword or orphan a report that's already in progress,
  submitted, or approved.
- **Therapist-to-student is many-to-many; teacher-to-student is
  one-to-many.** A student can have several therapists assigned at
  once (speech, OT, behavioral, etc.) but only one teacher.
- **The auth token lives in an httpOnly cookie, not localStorage.**
  Keep it that way, localStorage is readable by any script that runs
  on the page, which matters more than usual for the data this app
  holds.
- **PDFs are never stored.** `GET /api/submissions/:id/pdf` builds one
  from the submission's frozen answers and streams it straight to the
  response. Nothing sits on disk or in MongoDB eating into the free
  tier for no reason.
- **Every async route is wrapped in `asyncHandler`.** Express 4
  doesn't catch rejected promises on its own; without the wrapper, an
  unexpected error would hang the request instead of returning a
  clean 500.

## Part 5: A note on the compliance conversation we already had

This still applies regardless of how the app is hosted: role-scoped
queries (a teacher's account cannot pull another teacher's students,
enforced in the database query, not just hidden in the UI), and no
generated PDF is ever written to disk. Encryption of data in transit
comes from Atlas and from your host both defaulting to TLS, encryption
at rest is on by default on Atlas's M0 tier. None of this is a
substitute for actually keeping guardian consent on file at
enrollment, this app only gives you a field to record that it's done.

## Part 6: Deploying for free

The backend can serve the built frontend itself, so you only need to
host **one service**, not two. That also sidesteps a real cookie
problem: if the frontend and backend were on two different domains,
the browser's cross-site cookie rules would block the auth cookie
from being sent on API calls unless you loosened it to
`SameSite=None`. One service on one origin avoids that entirely.

1. Push this project to a GitHub repository (backend/ and frontend/
   both, from the same repo root).
2. On [Render](https://render.com) (or Railway, or Fly.io, any of them
   have a comparable free tier), create a new Web Service from that
   repo.
   - Root directory: leave at the repo root.
   - Build command:
     `cd frontend && npm install && npm run build && cd ../backend && npm install`
   - Start command: `node backend/server.js`
   - Add the same environment variables from your backend `.env`
     (`MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`). You don't
     need `CLIENT_URL` in this single-service setup since the
     frontend is served from the same origin.
3. Back in MongoDB Atlas, Network Access: since a free-tier host's
   outbound IP isn't fixed, add `0.0.0.0/0` (allow from anywhere).
   That's a real widening of who can attempt to connect, the database
   itself is still protected by the username and password, but it's
   worth knowing you're trading network-level restriction for
   convenience here. Tighten it later if the host you move to gives
   you a fixed IP.
4. Run `npm run seed:admin` once against the production `MONGO_URI`
   (you can do this from your own machine, pointed at the Atlas
   connection string, before or after first deploy) to create the
   first admin account for the live database.
5. Visit the Render URL. Free-tier instances spin down after
   inactivity, so the first request after a quiet period can take
   fifteen to thirty seconds to wake back up. That's the trade for
   free hosting; it goes away the moment the school moves this to a
   paid instance.

## What this prototype does not do

Worth knowing before treating it as finished:

- No automated tests. Everything above was verified by hand (syntax
  checks, a clean build, and loading every module) but not by a real
  test suite against a real database.
- No password reset flow. Admin sets the initial password; the
  `PATCH /api/auth/password` route lets someone change their own once
  logged in, but there's no "forgot password" email step, because
  there's no email service wired in at all.
- No rate limiting on login. Fine for a small program, worth adding
  before this handles a large user base.
- No automated backups beyond whatever Atlas's free tier gives you by
  default. Worth checking that, not assuming it.

## Coming next, if you want it

A parent-facing view (right now delivery is entirely manual, the
teacher downloads and sends the PDF themselves), email notifications
when a report needs revision or is approved, and audit logging of who
viewed or downloaded which report, the kind of thing worth having for
this data even though nothing here requires it yet.
