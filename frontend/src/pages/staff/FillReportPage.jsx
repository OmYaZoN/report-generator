import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

export default function FillReportPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setReport(await api.get(`/submissions/${reportId}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const editable = report && ['draft', 'revision_requested'].includes(report.status);

  function toggleOption(qi, oi) {
    if (!editable) return;
    setReport((r) => {
      const questions = r.questions.map((q, i) => {
        if (i !== qi) return q;
        return { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, selected: !o.selected } : o)) };
      });
      return { ...r, questions };
    });
  }

  async function save(thenSubmit) {
    setError('');
    setSaving(true);
    try {
      await api.patch(`/submissions/${reportId}`, { questions: report.questions, comments: report.comments });
      if (thenSubmit) {
        await api.post(`/submissions/${reportId}/submit`);
        navigate(-1);
      } else {
        await load();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!report) return <p className="muted">Loading…</p>;

  return (
    <div className="page">
      <h1>{report.templateTitle}</h1>
      <p className="muted">
        {report.student?.name} · <span className={`badge badge-${report.status}`}>{report.status.replace('_', ' ')}</span>
      </p>

      {report.adminFeedback && (
        <div className="alert-warning">
          <strong>Revision requested:</strong> {report.adminFeedback}
        </div>
      )}
      {error && <div className="alert-error">{error}</div>}

      {report.questions.map((q, qi) => (
        <div className="question-block card" key={qi}>
          {q.category && <div className="question-category">{q.category}</div>}
          <p className="question-text">
            {qi + 1}. {q.text}
          </p>
          <div className="option-grid">
            {q.options.map((o, oi) => (
              <label
                key={oi}
                className={`option-pill ${o.selected ? 'option-pill-selected' : ''} ${!editable ? 'option-pill-readonly' : ''}`}
              >
                <input type="checkbox" checked={o.selected} onChange={() => toggleOption(qi, oi)} disabled={!editable} />
                {o.text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <label>
          Additional comments
          <textarea
            value={report.comments || ''}
            onChange={(e) => setReport({ ...report, comments: e.target.value })}
            disabled={!editable}
            rows={4}
          />
        </label>
      </div>

      {editable ? (
        <div className="button-row">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => save(false)}>
            Save draft
          </button>
          <button type="button" disabled={saving} onClick={() => save(true)}>
            Submit report
          </button>
        </div>
      ) : report.status === 'approved' ? (
        <a className="btn-secondary" href={api.downloadUrl(`/submissions/${reportId}/pdf`)} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      ) : (
        <p className="muted">Waiting on admin review.</p>
      )}
    </div>
  );
}
