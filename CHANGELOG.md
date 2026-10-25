# Changelog

## 0.2.1 - 2026-10-25

- Keep the complete source log out of JSON exports; include only report summaries and grouped findings.
- Bump the app version and asset URLs so browsers load the privacy fix after deployment.

## 0.2.0 - 2026-10-13

- Paginate diagnostic groups so a large log does not create an unbounded results DOM on first render.
- Reset pagination when the report or filters change and add accessible load-more controls.
- Add regression tests for result paging and a GitHub Actions check for pull requests and main.
- Version the app and stylesheet URLs to avoid serving stale release assets from browser caches.

## 0.1.0 - 2026-10-10

- Initial offline Clausewitz / Paradox log analyzer with category filters, duplicate grouping, source-line navigation, and Markdown/JSON export.
