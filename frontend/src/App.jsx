import { useState } from "react";

const starterExamples = ["what are task names for project tci", "show tasks for this week", "count all tasks"];

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleAsk(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const data = await response.json();
      if (!response.ok) {
        const details = data.details ? `: ${data.details}` : "";
        const hint = data.hint ? ` | ${data.hint}` : "";
        throw new Error(`${data.error || "Failed to fetch answer"}${details}${hint}`);
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Ask PostgreSQL</h1>
        <p className="muted">Type any question. Backend uses LLM to generate safe SQL and returns a human answer.</p>

        <form onSubmit={handleAsk} className="ask-form">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g., what are task names for project tci"
          />
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? "Asking..." : "Ask"}
          </button>
        </form>

        <div className="examples">
          {starterExamples.map((example) => (
            <button key={example} onClick={() => setQuestion(example)} type="button" className="pill">
              {example}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="result">
            <p className="answer-label">
              <strong>Answer:</strong> {result.answer}
            </p>
            <p className="muted">
              {result.rowCount} row(s)
            </p>
            <pre>{result.sql}</pre>
            <pre>{JSON.stringify(result.rows, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
