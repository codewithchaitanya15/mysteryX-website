import { useState } from 'react';
import { api } from '../api.js';

export default function InvestigationTools({ id, data, inv, setInv }) {
  const [evidenceId, setEvidenceId] = useState('');
  const [suspectId, setSuspectId] = useState('');
  const [question, setQuestion] = useState('');
  const [chatSuspect, setChatSuspect] = useState(data.suspects[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const links = inv?.boardLinks || [];
  const interviews = inv?.interrogations || [];

  async function connect() {
    if (!evidenceId || !suspectId) return;
    setError('');
    try {
      setInv(await api(`/mysteries/${id}/investigation/board`, {
        method: 'POST', body: JSON.stringify({ evidenceId, suspectId })
      }));
    } catch (e) { setError(e.message); }
  }

  async function ask(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true); setError('');
    try {
      const result = await api(`/mysteries/${id}/interrogations`, {
        method: 'POST', body: JSON.stringify({ suspectId: chatSuspect, question })
      });
      setInv(current => ({ ...current, interrogations: result.interrogations }));
      setQuestion('');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <section className="investigation-tools">
    <div id="detective-board" className="tool-panel">
      <span className="tiny-label">DETECTIVE BOARD</span><h2>Connect the clues</h2>
      <p>Link evidence to a person of interest. Your connections stay with this case.</p>
      <div className="board-controls">
        <select aria-label="Evidence for board link" value={evidenceId} onChange={e => setEvidenceId(e.target.value)}>
          <option value="">Choose evidence</option>{data.evidence.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select><span>↔</span>
        <select aria-label="Suspect for board link" value={suspectId} onChange={e => setSuspectId(e.target.value)}>
          <option value="">Choose suspect</option>{data.suspects.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button className="button outline" onClick={connect} disabled={!evidenceId || !suspectId}>Pin connection</button>
      </div>
      <div className="board-links">{links.length ? links.map(x => <div className="board-link" key={`${x.evidenceId}-${x.suspectId}`}>
        <span>{data.evidence.find(e => e.id === x.evidenceId)?.title || x.evidenceId}</span><b>↔</b>
        <span>{data.suspects.find(s => s.id === x.suspectId)?.name || x.suspectId}</span>
      </div>) : <p className="tool-empty">No connections pinned yet.</p>}</div>
    </div>
    <div id="suspect-interrogation" className="tool-panel">
      <span className="tiny-label">AI SUSPECT INTERROGATION</span><h2>Ask a question</h2>
      <form className="interview-form" onSubmit={ask}>
        <select aria-label="Choose suspect to question" value={chatSuspect} onChange={e => setChatSuspect(e.target.value)}>
          {data.suspects.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <textarea aria-label="Question for suspect" maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Where were you when the incident happened?" />
        <button className="button primary" disabled={busy || question.trim().length < 2}>{busy ? 'Asking…' : 'Ask suspect'}</button>
      </form>
      {error && <div className="error-box">{error}</div>}
      <div className="interview-history">{interviews.filter(x => x.suspectId === chatSuspect).slice().reverse().map((x, i) => <article key={`${x.createdAt}-${i}`}>
        <b>You asked: {x.question}</b><p>{x.answer}</p>
      </article>)}</div>
    </div>
  </section>;
}
