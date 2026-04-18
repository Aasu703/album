const AVATAR_COLORS = [
  "#FF6B6B",
  "#FF8E53",
  "#FFC93C",
  "#6BCB77",
  "#4D96FF",
  "#C77DFF",
  "#FF6FD8",
  "#00C9A7",
  "#F72585",
  "#4361EE",
  "#FB5607",
  "#3A86FF",
];

/** Deterministically maps an email string to one of the predefined avatar colors. */
export function generateAvatarColor(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();

  let hash = 0;
  for (let index = 0; index < normalizedEmail.length; index += 1) {
    hash = normalizedEmail.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Returns initials from a display name, e.g. "John Doe" -> "JD", "Alice" -> "AL". */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return (parts[0] ?? "")
    .slice(0, 2)
    .toUpperCase();
}
