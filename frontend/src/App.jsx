import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import StaffPage from './pages/admin/StaffPage';
import StudentsPage from './pages/admin/StudentsPage';
import TemplatesPage from './pages/admin/TemplatesPage';
import ReportsPage from './pages/admin/ReportsPage';
import MyStudentsPage from './pages/staff/MyStudentsPage';
import StudentReportsPage from './pages/staff/StudentReportsPage';
import FillReportPage from './pages/staff/FillReportPage';

function Home() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/students" replace />;
  return <Navigate to="/my-students" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <BrowserRouter>
      {user && <NavBar />}
      <main className="main">
        <Routes>
          <Route path="/login" element={user ? <Home /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          <Route path="/admin/staff" element={<ProtectedRoute roles={['admin']}><StaffPage /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><StudentsPage /></ProtectedRoute>} />
          <Route path="/admin/templates" element={<ProtectedRoute roles={['admin']}><TemplatesPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><ReportsPage /></ProtectedRoute>} />

          <Route path="/my-students" element={<ProtectedRoute roles={['teacher', 'therapist']}><MyStudentsPage /></ProtectedRoute>} />
          <Route path="/students/:studentId/reports" element={<ProtectedRoute roles={['teacher', 'therapist']}><StudentReportsPage /></ProtectedRoute>} />
          <Route path="/reports/:reportId/fill" element={<ProtectedRoute roles={['teacher', 'therapist']}><FillReportPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
