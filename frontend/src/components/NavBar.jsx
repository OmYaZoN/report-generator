import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">Student Reports</div>
      <nav className="navbar-links">
        {user.role === 'admin' && (
          <>
            <NavLink to="/admin/students">Students</NavLink>
            <NavLink to="/admin/staff">Staff</NavLink>
            <NavLink to="/admin/templates">Templates</NavLink>
            <NavLink to="/admin/reports">Reports</NavLink>
          </>
        )}
        {user.role !== 'admin' && <NavLink to="/my-students">My students</NavLink>}
      </nav>
      <div className="navbar-user">
        <span>{user.name} · {user.role}</span>
        <button type="button" className="btn-link" onClick={logout}>Log out</button>
      </div>
    </header>
  );
}
