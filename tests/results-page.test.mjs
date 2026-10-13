import test from "node:test";
import assert from "node:assert/strict";
import { FINDINGS_PAGE_SIZE, pageFindings } from "../results-page.mjs";

test("shows only the first page and reports how many groups remain", () => {
  const findings = Array.from({ length: 1_000 }, (_, index) => ({ id: index }));
  const result = pageFindings(findings);

  assert.equal(FINDINGS_PAGE_SIZE, 100);
  assert.equal(result.items.length, 100);
  assert.equal(result.shown, 100);
  assert.equal(result.total, 1_000);
  assert.equal(result.remaining, 900);
});

test("adds later pages without exceeding the total", () => {
  const findings = Array.from({ length: 250 }, (_, index) => index);

  assert.deepEqual(pageFindings(findings, 2), {
    items: findings.slice(0, 200), shown: 200, total: 250, remaining: 50,
  });
  assert.deepEqual(pageFindings(findings, 3), {
    items: findings, shown: 250, total: 250, remaining: 0,
  });
});

test("handles an empty result list", () => {
  assert.deepEqual(pageFindings([]), { items: [], shown: 0, total: 0, remaining: 0 });
});

test("rejects invalid pagination input", () => {
  assert.throws(() => pageFindings(null), TypeError);
  assert.throws(() => pageFindings([], 0), RangeError);
  assert.throws(() => pageFindings([], 1, 0), RangeError);
});
