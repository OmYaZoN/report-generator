import { useEffect, useState } from 'react';
import { api } from '../../api';

const emptyForm = {
  name: '',
  dateOfBirth: '',
  guardianName: '',
  guardianContact: '',
  guardianConsentOnFile: false,
  teacher: '',
  therapists: [],
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [studentsData, teachersData, therapistsData] = await Promise.all([
      api.get('/students'),
      api.get('/staff?role=teacher'),
      api.get('/staff?role=therapist'),
    ]);
    setStudents(studentsData);
    setTeachers(teachersData);
    setTherapists(therapistsData);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/students', { ...form, teacher: form.teacher || undefined });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleTherapist(id) {
    setForm((f) => ({
      ...f,
      therapists: f.therapists.includes(id) ? f.therapists.filter((t) => t !== id) : [...f.therapists, id],
    }));
  }

  async function deactivate(student) {
    await api.delete(`/students/${student._id}`);
    load();
  }

  return (
    <div className="page">
      <h1>Students</h1>

      <form className="card" onSubmit={handleCreate}>
        <h2>Add a student</h2>
        {error && <div className="alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </label>
          <label>
            Guardian name
            <input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
          </label>
          <label>
            Guardian contact
            <input value={form.guardianContact} onChange={(e) => setForm({ ...form, guardianContact: e.target.value })} />
          </label>
          <label>
            Teacher
            <select value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
              <option value="">Not assigned</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.guardianConsentOnFile}
              onChange={(e) => setForm({ ...form, guardianConsentOnFile: e.target.checked })}
            />
            Guardian consent on file
          </label>
        </div>

        <fieldset style={{ marginTop: '0.9rem' }}>
          <legend>Therapists</legend>
          {therapists.length === 0 && <p className="muted">Add a therapist account first.</p>}
          {therapists.map((t) => (
            <label key={t._id} className="checkbox-row">
              <input type="checkbox" checked={form.therapists.includes(t._id)} onChange={() => toggleTherapist(t._id)} />
              {t.name}
              {t.specialty ? ` (${t.specialty})` : ''}
            </label>
          ))}
        </fieldset>

        <button type="submit" style={{ marginTop: '0.9rem' }}>
          Add student
        </button>
      </form>

      <div className="card">
        <h2>All students</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : students.length === 0 ? (
          <p className="muted">No students yet. Add one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Teacher</th>
                <th>Therapists</th>
                <th>Consent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.teacher?.name || 'Unassigned'}</td>
                  <td>{s.therapists?.length ? s.therapists.map((t) => t.name).join(', ') : 'Unassigned'}</td>
                  <td>{s.guardianConsentOnFile ? 'Yes' : 'Not on file'}</td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => deactivate(s)}>
                      Deactivate
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
