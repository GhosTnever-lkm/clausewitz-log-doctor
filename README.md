# Clausewitz Log Doctor

Offline analyzer for `error.log` files from Hearts of Iron IV, Crusader Kings III, Europa Universalis IV, Stellaris, Victoria 3, and other Clausewitz games.

## What it does

- Groups repeated diagnostic lines and retains every original one-based line number.
- Shows findings in 100-item pages so large reports do not fill the page at once.
- Sorts likely syntax, reference/file, localization, map, asset, and duplicate messages into filters.
- Filters findings by severity, category, message text, or line number.
- Exports grouped reports as Markdown or JSON.
- Processes logs entirely in the current browser tab. It sends no log data to a server.

Categories are text-based hints, not verified diagnoses. The tool does not rewrite logs, game files, or mods.

## Run it

Open the [live app](https://ghostnever-lkm.github.io/clausewitz-log-doctor/), then drop an `error.log` file or select it. You can also paste a short excerpt. Local copies use JavaScript modules, so serve the folder over HTTP instead of opening `index.html` with `file://`:

```sh
npx --yes http-server .
```

Then open the address printed by the server. No build step or runtime service is required after the page loads.

## Example

Input:

```text
[error] Missing file: common/ideas/example.txt
[error] Missing file: common/ideas/example.txt
[warning] Localization key EXAMPLE_TITLE is missing
```

The report groups the first two lines into one finding with count `2` and source lines `1, 2`, and keeps the localization warning as a separate group.

## Development

Requires Node.js 20 or newer. There are no runtime or development dependencies.

```sh
npm test
npm run check
```

## ☕ Support / Pro Version

Clausewitz Log Doctor is free and open source under MIT. No separate Pro features are currently sold. Support helps fund maintenance; it does not unlock closed functionality. [Buy Me a Coffee](https://buymeacoffee.com/azizazimov8) · [Boosty](https://boosty.to/azizazim).

## License

MIT. See [LICENSE](LICENSE).
