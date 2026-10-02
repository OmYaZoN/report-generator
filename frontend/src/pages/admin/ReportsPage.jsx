import { useEffect, useState } from 'react';
import { api } from '../../api';

const STATUSES = ['submitted', 'approved', 'revision_requested', 'draft', ''];

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}` : '';
    setReports(await api.get(`/submissions${query}`));
    setLoading(false);
  }

  useEffect(() => {
    load();
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function openReport(id) {
    setError('');
    setFeedback('');
    setSelected(await api.get(`/submissions/${id}`));
  }

  async function approve() {
    setError('');
    try {
      await api.post(`/submissions/${selected._id}/approve`);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestRevision() {
    if (!feedback.trim()) {
      setError('Add a note explaining what needs to change.');
      return;
    }
    setError('');
    try {
      await api.post(`/submissions/${selected._id}/request-revision`, { feedback });
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Reports</h1>

      <div className="filter-row">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`chip ${statusFilter === s ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="split-view">
        <div className="card list-panel">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="muted">Nothing here right now.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id} onClick={() => openReport(r._id)} className="clickable-row">
                    <td>{r.student?.name}</td>
                    <td>{r.staff?.name}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>{r.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card detail-panel">
            <h2>{selected.templateTitle}</h2>
            <p className="muted">
              {selected.student?.name} · filled by {selected.staff?.name} ({selected.staffRole})
            </p>
            {error && <div className="alert-error">{error}</div>}

            {selected.questions.map((q, i) => (
              <div className="answer-block" key={i}>
                <strong>
                  {i + 1}. {q.text}
                </strong>
                <ul>
                  {q.options.filter((o) => o.selected).map((o, oi) => (
                    <li key={oi}>{o.text}</li>
                  ))}
                  {q.options.every((o) => !o.selected) && <li className="muted">No option selected</li>}
                </ul>
              </div>
            ))}

            {selected.comments && (
              <div className="answer-block">
                <strong>Comments</strong>
                <p>{selected.comments}</p>
              </div>
            )}

            {selected.adminFeedback && (
              <div className="answer-block">
                <strong>Feedback given</strong>
                <p>{selected.adminFeedback}</p>
              </div>
            )}

            {selected.status === 'submitted' && (
              <div className="review-actions">
                <button type="button" onClick={approve}>
                  Approve
                </button>
                <textarea
                  placeholder="Feedback for the revision request"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <button type="button" className="btn-secondary" onClick={requestRevision}>
                  Send back for revision
                </button>
              </div>
            )}

            {selected.status === 'approved' && (
              <a
                className="btn-secondary"
                href={api.downloadUrl(`/submissions/${selected._id}/pdf`)}
                target="_blank"
                rel="noreferrer"
              >
                Download PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
