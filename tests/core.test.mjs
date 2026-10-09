import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLog, MAX_LOG_CHARS, MAX_LOG_LINES, toJson, toMarkdown } from "../core.mjs";

test("groups repeated messages and preserves every one-based source line", () => {
  const report = analyzeLog("[error] Missing file common/foo.txt\r\nLoading complete\n[error] Missing file common/foo.txt");
  assert.equal(report.totalLines, 3);
  assert.equal(report.diagnosticLines, 2);
  assert.equal(report.uniqueFindings, 1);
  assert.equal(report.repeatedLines, 1);
  assert.deepEqual(report.findings[0].lines, [1, 3]);
  assert.equal(report.findings[0].category, "reference");
});

test("classifies representative Clausewitz log categories and severity", () => {
  const report = analyzeLog([
    "[error] Unexpected token in common/ideas.txt",
    "[warning] Missing localization key: EXAMPLE_TITLE",
    "[error] Province 42 has no state",
    "[error] Texture file not found gfx/interface/icon.dds",
    "[error] Duplicate definition: example_modifier",
  ].join("\n"));
  assert.deepEqual(report.findings.map((item) => item.category), ["syntax", "localization", "map", "assets", "duplicate"]);
  assert.equal(report.errors, 4);
  assert.equal(report.warnings, 1);
});

test("ignores routine lines and handles an empty file", () => {
  const report = analyzeLog("Loading database\nChecksum: 12345\n");
  assert.equal(report.diagnosticLines, 0);
  assert.deepEqual(report.findings, []);
});

test("exports grouped findings without losing their source line references", () => {
  const report = analyzeLog("ERROR: Could not load file x.txt\nERROR: Could not load file x.txt");
  const json = JSON.parse(toJson(report, "error.log"));
  assert.equal(json.source_name, "error.log");
  assert.deepEqual(json.findings[0].lines, [1, 2]);
  assert.match(toMarkdown(report, "error.log"), /\| 2 \| 1, 2 \|/);
});

test("rejects inputs that exceed documented bounds", () => {
  assert.throws(() => analyzeLog("x".repeat(MAX_LOG_CHARS + 1)), RangeError);
  assert.throws(() => analyzeLog(Array(MAX_LOG_LINES + 2).join("\n")), RangeError);
});

test("rejects non-text content explicitly", () => {
  assert.throws(() => analyzeLog(null), TypeError);
});
