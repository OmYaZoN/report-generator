import { useEffect, useState } from 'react';
import { api } from '../../api';

const emptyForm = { name: '', email: '', password: '', role: 'teacher', specialty: '' };

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setStaff(await api.get('/staff'));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/staff', form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(person) {
    if (person.isActive) await api.delete(`/staff/${person._id}`);
    else await api.patch(`/staff/${person._id}`, { isActive: true });
    load();
  }

  return (
    <div className="page">
      <h1>Staff</h1>

      <form className="card form-grid" onSubmit={handleCreate}>
        <h2 style={{ gridColumn: '1 / -1' }}>Add teacher or therapist</h2>
        {error && <div className="alert-error" style={{ gridColumn: '1 / -1' }}>{error}</div>}
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Temporary password
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </label>
        <label>
          Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="teacher">Teacher</option>
            <option value="therapist">Therapist</option>
          </select>
        </label>
        {form.role === 'therapist' && (
          <label>
            Specialty (optional)
            <input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="e.g. Speech, OT, Behavioral"
            />
          </label>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">Add account</button>
        </div>
      </form>

      <div className="card">
        <h2>All staff</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="muted">No staff yet. Add one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Specialty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.role}</td>
                  <td>{s.specialty || 'Not set'}</td>
                  <td>
                    <span className={`badge badge-${s.isActive ? 'approved' : 'draft'}`}>
                      {s.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => toggleActive(s)}>
                      {s.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
