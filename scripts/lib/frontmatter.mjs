// Minimal YAML frontmatter reader for agent, skill and eval files: top-level
// `key: value` pairs only (enough for names, descriptions, tools and flags).

/** Splits a leading `---` block from the body. Returns null data when there is none. */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return { data: null, body: normalized };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) data[kv[1]] = unquote(kv[2].trim());
  }
  return { data, body: normalized.slice(m[0].length) };
}

function unquote(value) {
  if (value === '') return true;
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\"/g, '"');
  return value;
}
