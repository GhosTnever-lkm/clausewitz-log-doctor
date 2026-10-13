import { analyzeLog, toJson, toMarkdown } from "./core.mjs";
import { FINDINGS_PAGE_SIZE, pageFindings } from "./results-page.mjs";

const $ = (selector) => document.querySelector(selector);
const fileInput = $("#file-input");
const dropzone = $("#dropzone");
const results = $("#results");
const findingsEl = $("#findings");
let report = null;
let sourceName = "log";
let findingsPage = 1;

const categoryNames = {
  syntax: "Синтаксис", reference: "Ссылки и файлы", localization: "Локализация",
  map: "Карта", assets: "Ресурсы", duplicate: "Дубли", other: "Другое",
};
const severityNames = { error: "Ошибка", warning: "Предупреждение", notice: "Уведомление" };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function render(resetPage = true) {
  if (!report) return;
  if (resetPage) findingsPage = 1;
  const query = $("#search").value.trim().toLocaleLowerCase();
  const category = $("#category-filter").value;
  const severity = $("#severity-filter").value;
  const filtered = report.findings.filter((finding) => {
    if (category !== "all" && finding.category !== category) return false;
    if (severity !== "all" && finding.severity !== severity) return false;
    if (!query) return true;
    return finding.message.toLocaleLowerCase().includes(query)
      || finding.lines.some((line) => String(line).includes(query));
  });
  const { items, shown, total, remaining } = pageFindings(filtered, findingsPage);
  findingsEl.innerHTML = filtered.length ? items.map((finding) => `
    <article class="finding">
      <div class="finding-top"><span class="pill ${finding.severity}">${severityNames[finding.severity]}</span><span class="pill cat">${categoryNames[finding.category]}</span><span class="count">× ${finding.count}</span></div>
      <p>${escapeHtml(finding.message)}</p>
      <div class="line-links">${finding.lines.slice(0, 12).map((line) => `<button class="line-link" data-line="${line}">строка ${line}</button>`).join("")}${finding.lines.length > 12 ? `<span class="pill">+${finding.lines.length - 12}</span>` : ""}</div>
    </article>`).join("") : '<div class="empty">Ничего не найдено. Измени фильтры или поисковый запрос.</div>';
  if (remaining > 0) {
    findingsEl.insertAdjacentHTML("beforeend", `<div class="load-more-row"><p class="muted">Показано ${shown.toLocaleString("ru-RU")} из ${total.toLocaleString("ru-RU")} групп</p><button class="button button-secondary" type="button" data-load-more>Показать ещё ${Math.min(FINDINGS_PAGE_SIZE, remaining).toLocaleString("ru-RU")}</button></div>`);
    findingsEl.querySelector("[data-load-more]").addEventListener("click", () => {
      findingsPage += 1;
      render(false);
    });
  } else if (total > FINDINGS_PAGE_SIZE) {
    findingsEl.insertAdjacentHTML("beforeend", `<p class="muted load-more-status">Показаны все ${total.toLocaleString("ru-RU")} групп</p>`);
  }
  findingsEl.querySelectorAll("[data-line]").forEach((button) => button.addEventListener("click", () => openSourceAt(Number(button.dataset.line))));
}

function openSourceAt(line) {
  const start = Math.max(1, line - 5);
  const end = Math.min(report.totalLines, line + 5);
  $("#source-title").textContent = `Строка ${line} из ${report.totalLines.toLocaleString("ru-RU")}`;
  $("#source-context").innerHTML = report.sourceLines.slice(start - 1, end).map((text, index) => {
    const number = start + index;
    return `<span class="source-line${number === line ? " target" : ""}" id="source-line-${number}">${String(number).padStart(String(end).length, " ")}  ${escapeHtml(text)}</span>`;
  }).join("");
  $("#source-dialog").showModal();
}

function download(content, filename, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function analyze(text, name) {
  try {
    const parsed = analyzeLog(text);
    findingsPage = 1;
    sourceName = name || "pasted-log";
    report = { ...parsed, sourceLines: text.split(/\r\n|\n|\r/) };
    $("#file-title").textContent = sourceName;
    $("#report-meta").textContent = `${parsed.totalLines.toLocaleString("ru-RU")} строк · ${parsed.uniqueFindings.toLocaleString("ru-RU")} уникальных находок · ${parsed.repeatedLines.toLocaleString("ru-RU")} повторов сгруппировано`;
    $("#stats").innerHTML = `
      <div class="stat"><strong>${parsed.diagnosticLines.toLocaleString("ru-RU")}</strong><span>СТРОК-СООБЩЕНИЙ</span></div>
      <div class="stat"><strong>${parsed.uniqueFindings.toLocaleString("ru-RU")}</strong><span>УНИКАЛЬНЫХ ГРУПП</span></div>
      <div class="stat danger"><strong>${parsed.errors.toLocaleString("ru-RU")}</strong><span>ОШИБКИ</span></div>
      <div class="stat warning"><strong>${parsed.warnings.toLocaleString("ru-RU")}</strong><span>ПРЕДУПРЕЖДЕНИЯ</span></div>`;
    results.hidden = false;
    render();
  } catch (error) {
    alert(error.message || "Не удалось разобрать журнал.");
  }
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) { alert("Файл больше лимита 50 МБ."); fileInput.value = ""; return; }
  analyze(await file.text(), file.name);
});
$("#choose-file").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
$("#analyze-paste").addEventListener("click", () => analyze($("#paste-input").value, "pasted-log"));
$("#search").addEventListener("input", () => render());
$("#category-filter").addEventListener("change", () => render());
$("#severity-filter").addEventListener("change", () => render());
$("#export-md").addEventListener("click", () => report && download(toMarkdown(report, sourceName), "clausewitz-log-report.md", "text/markdown;charset=utf-8"));
$("#export-json").addEventListener("click", () => report && download(toJson(report, sourceName), "clausewitz-log-report.json", "application/json;charset=utf-8"));
$("#close-source").addEventListener("click", () => $("#source-dialog").close());

for (const event of ["dragenter", "dragover"]) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
for (const event of ["dragleave", "drop"]) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); });
dropzone.addEventListener("drop", async (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) { alert("Файл больше лимита 50 МБ."); return; }
  analyze(await file.text(), file.name);
});
