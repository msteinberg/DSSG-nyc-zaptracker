export const AFFORDABLE_KEYWORDS = [
  "affordable",
  "income-restricted",
  "income restricted",
  "mandatory inclusionary",
  "mih",
  "hdfc",
  "supportive housing",
  "workforce housing",
  "income-eligible",
  "low-income",
  "low income",
  "deep affordability",
  "permanently affordable"
];

/**
 * Returns all affordable housing keywords found in the given text.
 */
export function getAffordableKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return AFFORDABLE_KEYWORDS.filter((kw) => lower.includes(kw));
}

/**
 * Determines whether the text is relevant to affordable housing.
 */
export function isAffordableProject(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return AFFORDABLE_KEYWORDS.some((kw) => lower.includes(kw));
}
