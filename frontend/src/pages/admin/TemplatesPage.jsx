import { useEffect, useState } from 'react';
import { api } from '../../api';

function emptyQuestion() {
  return { text: '', category: '', options: [{ text: '' }, { text: '' }] };
}

function emptyForm() {
  return { title: '', role: 'teacher', questions: [emptyQuestion()] };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setTemplates(await api.get('/templates'));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateQuestion(i, patch) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[i] = { ...questions[i], ...patch };
      return { ...f, questions };
    });
  }

  function updateOption(qi, oi, text) {
    setForm((f) => {
      const questions = [...f.questions];
      const options = [...questions[qi].options];
      options[oi] = { text };
      questions[qi] = { ...questions[qi], options };
      return { ...f, questions };
    });
  }

  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  }

  function removeQuestion(i) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  }

  function addOption(qi) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[qi] = { ...questions[qi], options: [...questions[qi].options, { text: '' }] };
      return { ...f, questions };
    });
  }

  function removeOption(qi, oi) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[qi] = { ...questions[qi], options: questions[qi].options.filter((_, idx) => idx !== oi) };
      return { ...f, questions };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/templates', form);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(t) {
    if (t.isActive) await api.delete(`/templates/${t._id}`);
    else await api.patch(`/templates/${t._id}`, { isActive: true });
    load();
  }

  return (
    <div className="page">
      <h1>Report templates</h1>

      <form className="card" onSubmit={handleCreate}>
        <h2>Build a template</h2>
        {error && <div className="alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            For
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="teacher">Teacher</option>
              <option value="therapist">Therapist</option>
            </select>
          </label>
        </div>

        {form.questions.map((q, qi) => (
          <div className="question-builder" key={qi}>
            <div className="question-builder-header">
              <input
                className="question-text-input"
                placeholder={`Question ${qi + 1}`}
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                required
              />
              <input
                className="category-input"
                placeholder="Category (e.g. Behaviour)"
                value={q.category}
                onChange={(e) => updateQuestion(qi, { category: e.target.value })}
              />
              {form.questions.length > 1 && (
                <button type="button" className="btn-link btn-danger" onClick={() => removeQuestion(qi)}>
                  Remove question
                </button>
              )}
            </div>
            <div className="option-list">
              {q.options.map((o, oi) => (
                <div className="option-row" key={oi}>
                  <input
                    placeholder={`Option ${oi + 1}`}
                    value={o.text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    required
                  />
                  {q.options.length > 1 && (
                    <button type="button" className="btn-link btn-danger" onClick={() => removeOption(qi, oi)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-link" onClick={() => addOption(qi)}>
                + Add option
              </button>
            </div>
          </div>
        ))}

        <div className="button-row" style={{ marginTop: '0.9rem' }}>
          <button type="button" className="btn-secondary" onClick={addQuestion}>
            + Add question
          </button>
          <button type="submit">Save template</button>
        </div>
      </form>

      <div className="card">
        <h2>All templates</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="muted">No templates yet. Build one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>For</th>
                <th>Questions</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t._id}>
                  <td>{t.title}</td>
                  <td>{t.role}</td>
                  <td>{t.questions.length}</td>
                  <td>
                    <span className={`badge badge-${t.isActive ? 'approved' : 'draft'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => toggleActive(t)}>
                      {t.isActive ? 'Deactivate' : 'Reactivate'}
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
