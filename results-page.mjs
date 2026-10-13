export const FINDINGS_PAGE_SIZE = 100;

export function pageFindings(findings, page = 1, pageSize = FINDINGS_PAGE_SIZE) {
  if (!Array.isArray(findings)) throw new TypeError("Findings must be an array.");
  if (!Number.isInteger(page) || page < 1) throw new RangeError("Page must be a positive integer.");
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("Page size must be a positive integer.");

  const shown = Math.min(findings.length, page * pageSize);
  return {
    items: findings.slice(0, shown),
    shown,
    total: findings.length,
    remaining: findings.length - shown,
  };
}
