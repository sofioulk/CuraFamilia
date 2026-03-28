function capitalizeChunk(chunk) {
  if (!chunk) return chunk;
  return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
}

function capitalizeWord(word) {
  // Keep separators and capitalize each lexical chunk (ex: "ben-ali", "d'alaoui").
  return String(word)
    .split(/([-'])/)
    .map((part) => (part === "-" || part === "'" ? part : capitalizeChunk(part)))
    .join("");
}

export function formatDisplayName(name, fallback = "") {
  const raw = String(name || "").trim();
  if (!raw) return fallback;

  return raw
    .split(/\s+/)
    .map(capitalizeWord)
    .join(" ");
}

export function formatDisplayFirstName(name, fallback = "") {
  const formatted = formatDisplayName(name, "");
  if (!formatted) return fallback;
  const [first] = formatted.split(" ");
  return first || fallback;
}

