function normalize(input) {
  return String(input || "").trim().toLowerCase();
}

export function mapQuestionToQuery(question) {
  const q = normalize(question);

  if (!q) {
    return { error: "Question is required." };
  }

  if (q.includes("show tables") || q.includes("list tables") || q.includes("tables")) {
    return {
      sql: "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name",
      params: [],
      description: "Available tables"
    };
  }

  if (q.includes("total users") || q.includes("count users") || q === "users") {
    return {
      sql: "SELECT COUNT(*)::int AS total_users FROM users",
      params: [],
      description: "Total users"
    };
  }

  if (q.includes("latest users") || q.includes("recent users")) {
    return {
      sql: "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10",
      params: [],
      description: "Latest 10 users"
    };
  }

  return {
    error: "I do not know this question yet. Add a rule in queryMapper.js."
  };
}
