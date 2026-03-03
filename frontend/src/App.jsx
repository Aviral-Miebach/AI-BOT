import { useEffect, useMemo, useRef, useState } from "react";
 
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
 
      <section className="hero">
        <p className="eyebrow">Miebach Consulting</p>
        <h1>Supply Chain Intelligence Chat</h1>
        <p className="hero-copy">
          Ask questions about your PostgreSQL data. The assistant translates your request into safe SQL and explains
          the result.
        </p>
      </section>
 
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
 
              <div className="avatar">M</div>
 
              <div className="title-text">
                <h2>Miebach Consulting Bot</h2>
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
 
 