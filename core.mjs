export const MAX_LOG_CHARS = 50 * 1024 * 1024;
export const MAX_LOG_LINES = 500_000;
export const CATEGORIES = ["syntax", "reference", "localization", "map", "assets", "duplicate", "other"];

const RULES = [
  ["syntax", /(?:parse|syntax|token|unexpected|unterminated|failed to parse|could not parse|expected .* got)/i],
  ["localization", /(?:locali[sz]ation|localisation|locali[sz]ed|loc key|missing key|could not find localisation)/i],
  ["map", /(?:province|provinces|state history|strategic region|map error|terrain|supply node|adjacency|impassable|has no state)/i],
  ["assets", /(?:texture|sprite|mesh|shader|gfx|graphic|sound|audio|font|asset)/i],
  ["duplicate", /(?:already exists|duplicate|defined more than once|redefinition|overwrit(?:e|ten))/i],
  ["reference", /(?:missing|not found|cannot find|could not find|unknown (?:effect|trigger|scope|modifier|variable|file)|invalid path|failed to load|unable to load|no such file)/i],
];

const DIAGNOSTIC = /(?:\b(?:error|warning|warn|failed|failure|invalid|missing|cannot|could not|unable|unknown|duplicate|unexpected|not found|does not exist)\b|exception|assertion)/i;
const SEVERITY_ERROR = /(?:\berror\b|exception|assertion|fatal|failed to parse|could not parse)/i;
const SEVERITY_WARNING = /(?:\bwarn(?:ing)?\b|deprecated|will be ignored)/i;

function stripPrefix(line) {
  return line
    .replace(/^\uFEFF/, "")
    .replace(/^\s*(?:\[[^\]]{1,40}\]\s*)+/, "")
    .replace(/^\s*\d{1,4}[./-]\d{1,2}[./-]\d{1,4}[, T ]+\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s*/, "")
    .replace(/^\s*(?:ERROR|WARNING|WARN|INFO|DEBUG)\s*[:\]-]\s*/i, "")
    .trim();
}

function classify(message) {
  for (const [category, pattern] of RULES) {
    if (pattern.test(message)) return category;
  }
  return "other";
}

function severityOf(message, originalLine) {
  if (/^\s*(?:\[\s*error\s*\]|error\s*[:\]-]|fatal\b)/i.test(originalLine)) return "error";
  if (/^\s*(?:\[\s*warn(?:ing)?\s*\]|warn(?:ing)?\s*[:\]-])/i.test(originalLine)) return "warning";
  if (SEVERITY_ERROR.test(message)) return "error";
  if (SEVERITY_WARNING.test(message)) return "warning";
  return "notice";
}

function isDiagnostic(message, originalLine) {
  return /^\s*(?:\[\s*(?:error|warn(?:ing)?|fatal)\s*\]|(?:error|warn(?:ing)?|fatal)\s*[:\]-])/i.test(originalLine)
    || DIAGNOSTIC.test(message);
}

function stableMessage(message) {
  return message
    .replace(/\b(line|column|col)\s*[:#]?\s*\d+\b/gi, "$1 <n>")
    .replace(/\b\d+\s*:\s*\d+\b/g, "<n>:<n>")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function analyzeLog(text) {
  if (typeof text !== "string") throw new TypeError("Log content must be text.");
  if (text.length > MAX_LOG_CHARS) throw new RangeError("Log exceeds the 50 MiB text limit.");
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.length > MAX_LOG_LINES) throw new RangeError("Log exceeds the 500,000 line limit.");

  const groups = new Map();
  let diagnosticLines = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const message = stripPrefix(lines[index]);
    if (!message || !isDiagnostic(message, lines[index])) continue;
    diagnosticLines += 1;
    const category = classify(message);
    const severity = severityOf(message, lines[index]);
    const key = `${category}\0${stableMessage(message)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.lines.push(index + 1);
      if (severity === "error") existing.severity = "error";
    } else {
      groups.set(key, { id: groups.size, category, severity, message, count: 1, lines: [index + 1] });
    }
  }
  const findings = [...groups.values()].sort((a, b) => a.lines[0] - b.lines[0]);
  const byCategory = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  let errors = 0;
  let warnings = 0;
  for (const finding of findings) {
    byCategory[finding.category] += finding.count;
    if (finding.severity === "error") errors += finding.count;
    if (finding.severity === "warning") warnings += finding.count;
  }
  return {
    totalLines: lines.length,
    diagnosticLines,
    uniqueFindings: findings.length,
    repeatedLines: diagnosticLines - findings.length,
    errors,
    warnings,
    byCategory,
    findings,
  };
}

export function toMarkdown(report, sourceName = "log") {
  const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  const rows = report.findings.map((item) => `| ${item.severity} | ${item.category} | ${item.count} | ${item.lines.join(", ")} | ${escapeCell(item.message)} |`);
  return [
    `# Clausewitz log report: ${sourceName}`,
    "",
    `- Lines: ${report.totalLines}`,
    `- Diagnostic lines: ${report.diagnosticLines}`,
    `- Unique findings: ${report.uniqueFindings}`,
    `- Repeated lines grouped: ${report.repeatedLines}`,
    `- Errors: ${report.errors}; warnings: ${report.warnings}`,
    "",
    "This is a heuristic, local report. Categories are clues, not a verified root cause.",
    "",
    "| Severity | Category | Count | Source lines | Message |",
    "|---|---|---:|---|---|",
    ...rows,
    "",
  ].join("\n");
}

export function toJson(report, sourceName = "log") {
  return `${JSON.stringify({ schema_version: 1, source_name: sourceName, ...report }, null, 2)}\n`;
}
