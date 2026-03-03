import { useEffect, useMemo, useRef, useState } from "react";
 
const MIEBACH_LOGO_URL =
  "data:image/png;base64,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";
 
function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
 
function createWelcomeMessage() {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    text: "Hi there! Great to see you. Ask me about your tasks and projects, and I will help with clear, data-backed answers.",
    createdAt: new Date().toISOString()
  };
}
 
function buildErrorMessage(payload) {
  const base = payload?.error || "Failed to fetch answer";
  const details = payload?.details ? `: ${payload.details}` : "";
  return `${base}${details}`;
}
 
function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Object.keys(rows[0] || {});
  const escapeCell = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
    return text;
  };
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCell(row?.[key])).join(","));
  }
  return lines.join("\n");
}
 
function downloadRowsCsv(rows, fileName = "query_result.csv") {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
 
function MaximizeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="9 3 3 3 3 9" />
      <line x1="3" y1="3" x2="10" y2="10" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <polyline points="3 15 3 21 9 21" />
      <line x1="3" y1="21" x2="10" y2="14" />
      <polyline points="21 15 21 21 15 21" />
      <line x1="21" y1="21" x2="14" y2="14" />
    </svg>
  );
}
 
function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}
 
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
 
function RobotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <circle cx="10" cy="13" r="1.3" />
      <circle cx="14" cy="13" r="1.3" />
      <path d="M10 16.2h4" />
      <path d="M12 5v3" />
      <circle cx="12" cy="4" r="1.2" />
      <path d="M5 12H3.5" />
      <path d="M20.5 12H19" />
    </svg>
  );
}
export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const messagesEndRef = useRef(null);
  const todayLabel = useMemo(() => formatDateLabel(new Date()), []);
 
  useEffect(() => {
    if (!chatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, chatOpen]);
 
  async function askQuestion(inputQuestion) {
    const trimmed = inputQuestion.trim();
    if (!trimmed || loading) return;
 
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString()
      }
    ]);
    setQuestion("");
    setLoading(true);
 
    try {
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
 
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(buildErrorMessage(data));
      }
 
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: String(data?.answer || "No answer returned.").trim(),
          rows: Array.isArray(data?.rows) ? data.rows : [],
          rowCount: Number(data?.rowCount || 0),
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "error",
          text: String(error?.message || "Failed to fetch answer"),
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }
 
  function handleSubmit(event) {
    event.preventDefault();
    askQuestion(question);
  }
 
  function handleTextareaKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askQuestion(question);
    }
  }
 
  function refreshChat() {
    setQuestion("");
    setMessages([createWelcomeMessage()]);
  }
 
  function closeChat() {
    setChatOpen(false);
    setMaximized(false);
  }
 
  function openChat() {
    setChatOpen(true);
  }
 
  return (
    <main className={`page ${maximized ? "chat-maximized" : ""}`}>
      <div className="glow glow-left" />
      <div className="glow glow-center" />
      <div className="glow glow-right" />
 
      {!chatOpen && (
        <aside className="open-chat-slot">
          <div className="open-chat-cta">
            <button type="button" className="open-chat-btn" onClick={openChat}>
              <span className="open-chat-icon-inline" aria-hidden="true">
                <RobotIcon />
              </span>
              <span>Open Chat</span>
            </button>
          </div>
        </aside>
      )}
 
      {chatOpen && (
        <section className={`chat-shell ${maximized ? "maximized" : "docked"}`}>
          <header className="chat-header">
            <div className="chat-title-wrap">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setMaximized((current) => !current)}
                aria-label={maximized ? "Minimize chat" : "Maximize chat"}
              >
                {maximized ? <MinimizeIcon /> : <MaximizeIcon />}
              </button>
 
              <div className="avatar" aria-hidden="true">
                <img src={MIEBACH_LOGO_URL} alt="Miebach logo" />
              </div>
 
              <div className="title-text">
                <h2>WMS chatbot</h2>
                <p>We're online</p>
              </div>
            </div>
 
            <div className="header-actions">
              <button type="button" className="refresh-btn" onClick={refreshChat}>
                Refresh
              </button>
              <button type="button" className="icon-btn close-btn" onClick={closeChat} aria-label="Close chat">
                <CloseIcon />
              </button>
            </div>
          </header>
 
          <div className="chat-date">{todayLabel}</div>
 
          <div className="messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`message ${message.role}`}>
                <p>{message.text}</p>
                {message.role === "assistant" && Array.isArray(message.rows) && message.rows.length > 0 && (
                  <div className="data-card">
                    <div className="data-toolbar">
                      <span>{message.rowCount || message.rows.length} row(s)</span>
                      <button
                        type="button"
                        className="csv-btn"
                        onClick={() => downloadRowsCsv(message.rows, `result_${message.id}.csv`)}
                      >
                        Download CSV
                      </button>
                    </div>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {Object.keys(message.rows[0] || {}).map((key) => (
                              <th key={key}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.rows.map((row, idx) => (
                            <tr key={`${message.id}-row-${idx}`}>
                              {Object.keys(message.rows[0] || {}).map((key) => (
                                <td key={`${message.id}-cell-${idx}-${key}`}>{String(row?.[key] ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            ))}
 
            {loading && (
              <article className="message assistant loading-bubble" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </article>
            )}
 
            <div ref={messagesEndRef} />
          </div>
 
          <form onSubmit={handleSubmit} className="composer">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              rows={1}
              placeholder="Enter message"
            />
            <button type="submit" disabled={loading || !question.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
 
 
 
 