import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

export default function StudentReportsPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [studentData, reportsData, templatesData] = await Promise.all([
      api.get(`/students/${studentId}`),
      api.get(`/submissions?student=${studentId}`),
      api.get('/templates'),
    ]);
    setStudent(studentData);
    setReports(reportsData);
    setTemplates(templatesData);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function startReport(templateId) {
    setError('');
    try {
      const submission = await api.post('/submissions', { studentId, templateId });
      navigate(`/reports/${submission._id}/fill`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div className="page">
      <h1>{student?.name}</h1>
      {error && <div className="alert-error">{error}</div>}

      <div className="card">
        <h2>Start a new report</h2>
        {templates.length === 0 ? (
          <p className="muted">No active template for your role yet. Ask your administrator to build one.</p>
        ) : (
          <div className="button-row">
            {templates.map((t) => (
              <button key={t._id} type="button" onClick={() => startReport(t._id)}>
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Report history</h2>
        {reports.length === 0 ? (
          <p className="muted">No reports yet for {student?.name}.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{r.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => navigate(`/reports/${r._id}/fill`)}>
                      {['draft', 'revision_requested'].includes(r.status) ? 'Continue' : 'View'}
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
