import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function MyStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students').then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page">
      <h1>My students</h1>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : students.length === 0 ? (
        <p className="muted">No students assigned to you yet. Ask your administrator to add you to a student.</p>
      ) : (
        <div className="card-grid">
          {students.map((s) => (
            <Link className="card student-card" key={s._id} to={`/students/${s._id}/reports`}>
              <h2>{s.name}</h2>
              <p className="muted">View and fill reports</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
