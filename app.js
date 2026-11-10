"use strict";

(() => {
  const STORAGE_KEY = "lineflow.v1";
  const SHIFTS = { "1": "I · Ranna", "2": "II · Popołudniowa", "3": "III · Nocna", off: "Wolne" };
  const SHIFT_CLASS = { "1": "purple", "2": "orange", "3": "blue" };
  const PAGES = {
    dashboard: ["Podsumowanie", "Podsumowanie kontroli", "Wyniki kontroli w wybranym okresie.", "dashboard"],
    records: ["Rejestr kontroli", "Rejestr kontroli", "Archiwum wpisów według daty, pracownika, zmiany i referencji.", "clipboard"],
    analytics: ["Zestawienia", "Zestawienia jakości", "Pareto, dopuszczenia i porównanie wyników kontroli.", "chart"],
    schedule: ["Grafik zmian", "Grafik zmian", "Ręczne przypisania pracowników na wybrany tydzień i poszczególne dni.", "calendar"],
    employees: ["Pracownicy", "Pracownicy", "ID pieczątki identyfikuje pracownika, niezależnie od jego zmiany.", "users"],
    defects: ["Katalog wad", "Katalog wad", "Kody i nazwy wad stosowane w kontrolach.", "tag"],
    references: ["Referencje części", "Referencje części", "Numery referencji kontrolowanych części.", "box"],
    settings: ["Ustawienia", "Ustawienia", "Kopie zapasowe, eksport i zarządzanie danymi.", "settings"]
  };
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="m9 13 2 2 4-4M9 18h6"/>',
    chart: '<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m3 0h1m3 0h1m-9 3h1m3 0h1"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
    tag: '<path d="M3 4h8l10 10-7 7L3 10Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    box: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5M7.5 4.5l9 5"/>',
    settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 2 4 4-1 1-3 4-2-1-4-3-1-1-4Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    edit: '<path d="m14 5 5 5M3 21l5-1L21 7l-5-5L3 15Z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
    rotate: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = name => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.clipboard}</svg>`;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const normalizeSearch = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pl");
  const defectMatchesSearch = (item, query) => {
    const normalizedQuery = normalizeSearch(query.trim());
    return !normalizedQuery || normalizeSearch(`${item.name} ${item.code}`).includes(normalizedQuery);
  };
  const num = value => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);
  const dateStr = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const addDays = (value, amount) => { const date = parseDate(value); date.setDate(date.getDate() + amount); return dateStr(date); };
  const monday = value => { const day = parseDate(value).getDay(); return addDays(value, -(day === 0 ? 6 : day - 1)); };
  const workingDay = value => ![0, 6].includes(parseDate(value).getDay());
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateStr(parseDate(value)) === value;
  const today = () => dateStr(new Date());
  const workingToday = () => workingDay(today()) ? today() : addDays(monday(today()), 4);
  const fmtDate = value => parseDate(value).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const blankState = () => ({ version: 3, employees: [], defects: [], references: [], records: [], overrides: {}, allowances: [], providedDefectsAdded: true });
  let state = blankState();
  let storageBroken = false;
  let page = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
  let filters = { start: monday(today()), end: addDays(monday(today()), 4), shift: "", employee: "", brigade: "", reference: "", defect: "" };
  let week = monday(today());
  let search = "";
  let recordPage = 1;
  let modal = null;
  let defectPage = 0;
  let defectSearch = "";
  let confirmationAction = null;
  let toastTimer;
  const employee = id => state.employees.find(item => item.id === id);
  const defect = id => state.defects.find(item => item.id === id);
  const reference = id => state.references.find(item => item.id === id);
  const employeeLabel = item => `#${item.stamp}${item.name ? ` · ${item.name}` : ""}`;
  const active = list => list.filter(item => item.active);
  const sumDefects = record => record.defects.reduce((sum, item) => sum + (!filters.defect || filters.defect === item.defectId ? item.quantity : 0), 0);
  const modeLabel = record => record.defectMode === "shared" ? "Wady wspólne" : "Wady osobno";
  const teamLabel = record => record.employeeIds.map(id => employeeLabel(employee(id))).join(" + ");

  function notify(message, error = false) {
    clearTimeout(toastTimer);
    const element = $("#toast");
    element.textContent = message;
    element.classList.toggle("error", error);
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, error ? 9000 : 4000);
  }

  function persist(next, message) {
    if (storageBroken) {
      notify("Zapis jest zablokowany. Najpierw przywróć poprawną kopię w Ustawieniach.", true);
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Rejestr kontroli: nie udało się zapisać danych.", error);
      notify("Nie udało się zapisać danych. Pamięć przeglądarki jest pełna lub niedostępna. Wykonaj kopię i sprawdź ustawienia przeglądarki.", true);
      return false;
    }
    state = next;
    if (message) notify(message);
    return true;
  }

  function validateState(data) {
    const fail = message => { throw new Error(message); };
    const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const text = (value, max = 120) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
    const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000;
    if (!isObject(data) || ![1, 2, 3].includes(data.version)) fail("Nieobsługiwany format kopii (obsługiwane wersje: 1, 2 i 3).");
    for (const key of ["employees", "defects", "references", "records"]) {
      if (!Array.isArray(data[key])) fail(`Brakuje listy: ${key}.`);
      if (data[key].length > 200000) fail(`Lista ${key} przekracza limit 200 000 wpisów.`);
      const ids = new Set();
      for (const item of data[key]) {
        if (!isObject(item) || !text(item.id) || ids.has(item.id)) fail(`Nieprawidłowy lub powielony identyfikator w ${key}.`);
        ids.add(item.id);
      }
    }
    if (data.version === 1 && (!isObject(data.settings) || !validDate(data.settings.anchor) || monday(data.settings.anchor) !== data.settings.anchor || ![1, 2].includes(data.settings.rotationStep))) fail("Nieprawidłowe ustawienia starej kopii.");
    if (data.demo === true) fail("Plik zawiera dane demonstracyjne, a nie rzeczywistą ewidencję.");
    if (data.providedDefectsAdded !== undefined && typeof data.providedDefectsAdded !== "boolean") fail("Nieprawidłowy znacznik aktualizacji katalogu wad.");
    if (data.allowances !== undefined && (!Array.isArray(data.allowances) || data.allowances.length > 10000)) fail("Nieprawidłowa lista dopuszczeń.");
    for (const key of ["employees", "defects", "references"]) {
      const codes = new Set();
      for (const item of data[key]) {
        const code = key === "employees" ? item.stamp : item.code;
        if (!text(code, 60) || codes.has(code.toLocaleLowerCase("pl")) || typeof item.active !== "boolean") fail(`Nieprawidłowy lub powielony kod w ${key}.`);
        codes.add(code.toLocaleLowerCase("pl"));
        if (key !== "references" && (typeof item.name !== "string" || item.name.length > 120 || (key !== "employees" && !item.name.trim()))) fail(`Nieprawidłowa nazwa w ${key}.`);
        if (data.version === 1 && key === "employees" && !["1", "2", "3"].includes(item.baseShift)) fail("Nieprawidłowa zmiana pracownika w starej kopii.");
      }
    }
    const employeeIds = new Set(data.employees.map(item => item.id));
    const referenceIds = new Set(data.references.map(item => item.id));
    const defectIds = new Set(data.defects.map(item => item.id));
    const allowanceIds = new Set(), allowanceKeys = new Set();
    for (const allowance of data.allowances || []) {
      if (!isObject(allowance) || !text(allowance.id) || allowanceIds.has(allowance.id) ||
        !["1", "2", "3"].includes(allowance.shift) || !defectIds.has(allowance.defectId) ||
        (allowance.employeeId !== null && !employeeIds.has(allowance.employeeId)) ||
        !Number.isSafeInteger(allowance.quantity) || allowance.quantity < 1 || allowance.quantity > 10000000) fail("Nieprawidłowe dopuszczenie w zestawieniach.");
      const key = JSON.stringify([allowance.shift, allowance.defectId, allowance.employeeId]);
      if (allowanceKeys.has(key)) fail("Powielone dopuszczenie dla tej samej zmiany, wady i pracownika.");
      allowanceIds.add(allowance.id);
      allowanceKeys.add(key);
    }
    for (const record of data.records) {
      if (!validDate(record.date) || !workingDay(record.date) || !["1", "2", "3"].includes(record.shift) || !["A", "B", "C", "D"].includes(record.brigade)) fail("Rekord ma nieprawidłową datę, zmianę lub brygadę.");
      const participants = data.version < 3 ? [record.employeeId] : record.employeeIds;
      const mode = data.version < 3 ? "individual" : record.defectMode;
      if (!Array.isArray(participants) || participants.length < 1 || participants.length > 2 || new Set(participants).size !== participants.length || participants.some(id => !employeeIds.has(id)) || !referenceIds.has(record.referenceId)) fail("Kontrola musi mieć jednego lub dwóch różnych pracowników i istniejącą referencję.");
      if (!["shared", "individual"].includes(mode)) fail("Nieprawidłowy sposób rozliczania wad.");
      if (!integer(record.inspected) || record.inspected === 0 || !Array.isArray(record.defects)) fail("Nieprawidłowa liczba sprawdzonych sztuk lub lista wad.");
      if (typeof record.notes !== "string" || record.notes.length > 500) fail("Nieprawidłowa notatka w rekordzie.");
      if (typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt))) fail("Nieprawidłowa data aktualizacji rekordu.");
      const used = new Set();
      for (const item of record.defects) {
        if (!isObject(item) || !defectIds.has(item.defectId) || !integer(item.quantity) || item.quantity === 0) fail("Nieprawidłowa pozycja wady.");
        const owner = data.version < 3 ? record.employeeId : item.employeeId;
        if (mode === "shared" ? owner !== null : !participants.includes(owner)) fail("Wady wspólne nie mogą mieć właściciela, a indywidualne muszą należeć do uczestnika kontroli.");
        const key = JSON.stringify([item.defectId, owner]);
        if (used.has(key)) fail("Powielona wada dla tej samej osoby lub zespołu.");
        used.add(key);
      }
    }
    if (!isObject(data.overrides)) fail("Nieprawidłowy grafik.");
    for (const [date, assignments] of Object.entries(data.overrides)) {
      if (!validDate(date) || !workingDay(date) || !isObject(assignments)) fail("Nieprawidłowa data w grafiku.");
      for (const [id, shift] of Object.entries(assignments)) {
        if (!employeeIds.has(id) || !["1", "2", "3", "off"].includes(shift)) fail("Nieprawidłowy pracownik lub zmiana w grafiku.");
      }
    }
    // Version 1 migration preserves explicit assignments, never generated rotations.
    return {
      version: 3,
      providedDefectsAdded: data.providedDefectsAdded === true,
      employees: data.employees.map(({ id, stamp, name, active: enabled }) => ({ id, stamp, name, active: enabled })),
      defects: data.defects.map(({ id, code, name, active: enabled }) => ({ id, code, name, active: enabled })),
      references: data.references.map(({ id, code, active: enabled }) => ({ id, code, active: enabled })),
      records: data.records.map(record => ({
        id: record.id, date: record.date, shift: record.shift, brigade: record.brigade,
        employeeIds: data.version < 3 ? [record.employeeId] : [...record.employeeIds],
        defectMode: data.version < 3 ? "individual" : record.defectMode,
        referenceId: record.referenceId, inspected: record.inspected,
        defects: record.defects.map(item => ({ defectId: item.defectId, quantity: item.quantity, employeeId: data.version < 3 ? record.employeeId : item.employeeId })),
        notes: record.notes, updatedAt: record.updatedAt
      })),
      overrides: Object.fromEntries(Object.entries(data.overrides).map(([date, assignments]) => [date, Object.fromEntries(Object.entries(assignments))])),
      allowances: (data.allowances || []).map(({ id, shift, defectId, employeeId, quantity }) => ({ id, shift, defectId, employeeId, quantity }))
    };
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        state = validateState(data);
        if (data.version < 3) {
          if (persist(state)) notify(data.version === 1
            ? "Zachowano kontrole i ręczny grafik. Wyłączono automatyczną rotację. Starsze kontrole pozostają indywidualne."
            : "Zachowano dane. Starsze kontrole pozostają indywidualne; nowe wpisy mogą obejmować dwie osoby.");
        }
      }
    } catch (error) {
      console.error("Rejestr kontroli: błąd odczytu danych.", error);
      storageBroken = true;
      const banner = $("#storage-error");
      banner.textContent = `Nie można odczytać zapisanych danych: ${error.message} Nie nadpisano pamięci. Przejdź do Ustawień, pobierz zapis awaryjny i przywróć poprawną kopię.`;
      banner.hidden = false;
    }
  }

  function scheduledShift(item, date) {
    return state.overrides[date]?.[item.id] || "";
  }

  function assignSchedule(next, id, date, shift) {
    if (shift) {
      if (!next.overrides[date]) next.overrides[date] = {};
      next.overrides[date][id] = shift;
    } else if (next.overrides[date]) {
      delete next.overrides[date][id];
      if (!Object.keys(next.overrides[date]).length) delete next.overrides[date];
    }
  }

  function weeklyShift(item, start) {
    const values = Array.from({ length: 5 }, (_, index) => scheduledShift(item, addDays(start, index)));
    return values.every(value => value === values[0]) ? values[0] : "mixed";
  }

  function saveScheduleAssignment(id, start, shift, wholeWeek = false) {
    if (!employee(id) || !validDate(start) || !workingDay(start) || !["", "1", "2", "3", "off"].includes(shift)) {
      notify("Nieprawidłowe przypisanie w grafiku.", true);
      return false;
    }
    const next = clone(state);
    const firstDay = wholeWeek ? monday(start) : start;
    for (let index = 0; index < (wholeWeek ? 5 : 1); index++) assignSchedule(next, id, addDays(firstDay, index), shift);
    return persist(next, wholeWeek ? "Zapisano przypisanie od poniedziałku do piątku." : "Zapisano przypisanie dnia.");
  }

  function options(list, valueKey, label, selected = "", emptyLabel = "") {
    return `${emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : ""}${list.map(item => `<option value="${esc(item[valueKey])}"${item[valueKey] === selected ? " selected" : ""}>${esc(label(item))}</option>`).join("")}`;
  }
  function shiftOptions(selected, allowOff = false, emptyLabel = "") {
    return `${emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : ""}${Object.entries(SHIFTS).filter(([key]) => allowOff || key !== "off").map(([key, label]) => `<option value="${key}"${selected === key ? " selected" : ""}>${label}</option>`).join("")}`;
  }
  function actionButton(text, action, iconName, style = "secondary") {
    return `<button class="button ${style}" data-action="${action}">${icon(iconName)}${text}</button>`;
  }
  function empty(title, description = "", action = "") {
    return `<div class="empty">${icon("clipboard")}<strong>${esc(title)}</strong>${esc(description)}${action ? `<div style="margin-top:16px">${action}</div>` : ""}</div>`;
  }
  function shiftPill(shift) {
    return `<span class="pill ${SHIFT_CLASS[shift]}">${esc(SHIFTS[shift])}</span>`;
  }

  function renderNavigation() {
    $("#navigation").innerHTML = Object.entries(PAGES).map(([key, item], index) => `${index === 4 ? '<div class="nav-divider"></div><div class="nav-label">ZARZĄDZANIE</div>' : ""}<a href="#${key}" class="${page === key ? "active" : ""}" title="${item[0]}"${page === key ? ' aria-current="page"' : ""}>${icon(item[3])}<span>${item[0]}</span></a>`).join("");
    $("#today-label").textContent = new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  }

  function renderFilters() {
    const element = $("#filters");
    element.hidden = !["dashboard", "records", "analytics"].includes(page);
    if (element.hidden) return;
    element.innerHTML = `<span class="filter-icon">${icon("filter")}</span>
      <label class="date-filter">DATA OD<input aria-label="Data od" type="date" data-filter="start" value="${filters.start}"></label>
      <label class="date-filter">DATA DO<input aria-label="Data do" type="date" data-filter="end" value="${filters.end}"></label>
      <label>ZMIANA<select data-filter="shift">${shiftOptions(filters.shift, false, "Wszystkie zmiany")}</select></label>
      <label>PRACOWNIK<select data-filter="employee">${options(state.employees, "id", employeeLabel, filters.employee, "Wszyscy pracownicy")}</select></label>
      <label>BRYGADA LINII<select data-filter="brigade"><option value="">Wszystkie brygady</option>${["A", "B", "C", "D"].map(value => `<option${filters.brigade === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>REFERENCJA<select data-filter="reference">${options(state.references, "id", item => item.code, filters.reference, "Wszystkie referencje")}</select></label>
      ${page !== "dashboard" ? `<label>WADA<select data-filter="defect">${options(state.defects, "id", item => `${item.code} · ${item.name}`, filters.defect, "Wszystkie wady")}</select></label>` : ""}
      <button class="filter-reset" data-action="reset-filters" title="Bieżący tydzień i wszystkie filtry" aria-label="Zresetuj filtry">${icon("rotate")}</button>`;
  }

  function filteredRecords() {
    return state.records.filter(record =>
      record.date >= filters.start && record.date <= filters.end &&
      (!filters.shift || record.shift === filters.shift) &&
      (!filters.employee || record.employeeIds.includes(filters.employee)) &&
      (!filters.brigade || record.brigade === filters.brigade) &&
      (!filters.reference || record.referenceId === filters.reference) &&
      (!filters.defect || record.defects.some(item => item.defectId === filters.defect))
    ).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
  }

  function summary(records) {
    return {
      defects: records.reduce((sum, record) => sum + sumDefects(record), 0),
      inspected: records.reduce((sum, record) => sum + record.inspected, 0),
      sharedDefects: records.filter(record => record.defectMode === "shared").reduce((sum, record) => sum + sumDefects(record), 0),
      people: new Set(records.flatMap(record => record.employeeIds)).size
    };
  }

  function statsHtml(records) {
    const totals = summary(records);
    return `<div class="stats-grid">
      ${[
        ["Sprawdzone sztuki", num(totals.inspected), "szt.", `${num(records.length)} kontroli · wspólne sztuki liczone raz`, "clipboard", "purple"],
        ["Wykryte wady", num(totals.defects), "wad", `W tym ${num(totals.sharedDefects)} wspólnych, bez przypisania osobie`, "tag", "orange"],
        ["Wady / 100 szt.", totals.inspected ? num(totals.defects / totals.inspected * 100) : "-", "", "Liczba wystąpień wad; nie oznacza odsetka wadliwych części", "chart", "green"],
        ["Aktywni w kontroli", num(totals.people), "os.", "Pracownicy we wskazanym okresie", "users", "blue"]
      ].map(([title, value, unit, note, image, color]) => `<article class="stat"><div class="stat-top">${title}<span class="stat-icon ${color}">${icon(image)}</span></div><div class="stat-value">${value} <small>${unit}</small></div><div class="stat-note">${note}</div></article>`).join("")}
    </div>`;
  }

  function analyticsKpisHtml(records) {
    const allowances = allowanceTotals(records);
    const rules = state.allowances || [];
    return `<div class="stats-grid analytics-kpis">
      ${[
        ["Reguły dopuszczeń", num(rules.length), "limitów", "Osobno dla zmiany i rodzaju wady, opcjonalnie pracownika.", "filter", "blue"],
        ["Dopuszczone wady", num(allowances.approved), "wad", "Tylko do wysokości ustawionych limitów i liczby wykrytych wad.", "check", "green"],
        ["Ponad limit", num(allowances.overLimit), "wad", "Przekroczenia tylko tam, gdzie istnieje reguła dopuszczeń.", "info", "orange"],
        ["Bez dopuszczenia", num(allowances.uncovered), "wad", "Wady, dla których nie ustawiono limitu.", "tag", "purple"]
      ].map(([title, value, unit, note, image, color]) => `<article class="stat"><div class="stat-top">${title}<span class="stat-icon ${color}">${icon(image)}</span></div><div class="stat-value">${value} <small>${unit}</small></div><div class="stat-note">${note}</div></article>`).join("")}
    </div>`;
  }

  function defectTotals(records) {
    const totals = new Map();
    for (const record of records) {
      for (const item of record.defects) {
        if (!filters.defect || filters.defect === item.defectId) totals.set(item.defectId, (totals.get(item.defectId) || 0) + item.quantity);
      }
    }
    return [...totals].map(([id, quantity]) => ({ ...defect(id), quantity })).sort((a, b) => b.quantity - a.quantity || a.code.localeCompare(b.code));
  }

  function paretoHtml(records) {
    const all = defectTotals(records);
    const total = all.reduce((sum, item) => sum + item.quantity, 0);
    // Aggregate the tail instead of dropping it: the cumulative curve must end at 100%.
    const data = all.length > 8 ? [...all.slice(0, 7), { code: "Pozostałe", name: `${all.length - 7} pozostałych wad`, quantity: all.slice(7).reduce((sum, item) => sum + item.quantity, 0) }] : all;
    let chart = empty("Jeszcze bez wykresu", "Wykres Pareto pojawi się po zapisaniu wykrytych wad.");
    if (data.length) {
      const W = 640, H = 263, left = 42, right = 42, top = 22, bottom = 46;
      const width = W - left - right, height = H - top - bottom;
      const max = Math.max(...data.map(item => item.quantity));
      const step = width / data.length, barWidth = Math.min(44, step * .55);
      let cumulative = 0;
      const points = data.map((item, index) => {
        cumulative += item.quantity;
        return { x: left + step * (index + .5), y: top + height * (1 - cumulative / total), percentage: cumulative / total * 100 };
      });
      chart = `<div class="chart-legend"><span><i class="legend-square"></i>Liczba wad</span><span><i class="legend-line"></i>Udział skumulowany</span></div><div class="pareto-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pareto: ${esc(all.map(item => `${item.code}: ${item.quantity}`).join(", "))}. Linia: skumulowany udział procentowy.">
        ${[0, 1, 2, 3, 4].map(index => { const y = top + height * index / 4; return `<line x1="${left}" y1="${y}" x2="${W - right}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="3 4"/><text x="${left - 10}" y="${y + 3}" text-anchor="end" fill="var(--chart-label)" font-size="9">${num(max * (1 - index / 4))}</text><text x="${W - right + 9}" y="${y + 3}" fill="var(--chart-label)" font-size="9">${100 - index * 25}%</text>`; }).join("")}
        <line x1="${left}" y1="${top + height * .2}" x2="${W - right}" y2="${top + height * .2}" stroke="#e8cfa4" stroke-dasharray="4 4"/>
        ${data.map((item, index) => { const h = height * item.quantity / max; return `<g><title>${esc(item.code)} · ${esc(item.name)}: ${num(item.quantity)} wad</title><rect x="${points[index].x - barWidth / 2}" y="${top + height - h}" width="${barWidth}" height="${h}" rx="4" fill="${index === 0 ? "#8970df" : index < 3 ? "#a18ae9" : "#c6b8f1"}"/><text x="${points[index].x}" y="${H - 25}" text-anchor="middle" fill="#8c94a7" font-size="9">${esc(item.code.length > 13 ? item.code.slice(0, 11) + "…" : item.code)}</text></g>`; }).join("")}
        <polyline points="${points.map(point => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#e1ad63" stroke-width="2"/>
        ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="3" fill="var(--chart-point)" stroke="#e1ad63" stroke-width="1.6"><title>${num(point.percentage)}%</title></circle>`).join("")}
      </svg></div>`;
    }
    let running = 0;
    let vitalCount = 0;
    for (const item of all) { running += item.quantity; vitalCount++; if (running >= total * .8) break; }
    return `<article class="card"><div class="card-head"><div><h2>Pareto wad</h2><p>Liczba wystąpień i skumulowany udział procentowy</p></div><span class="pill purple">${all.length} typów wad</span></div>${chart}<div class="chart-foot">${icon("info")}${total ? `<span><strong>${vitalCount} z ${all.length} typów wad</strong> odpowiada za co najmniej 80% wystąpień.</span>` : "<span>Wady są sortowane malejąco według liczby wystąpień.</span>"}</div></article>`;
  }

  function employeeTotals(records) {
    const map = new Map();
    for (const record of records) {
      for (const id of record.employeeIds) {
        if (filters.employee && filters.employee !== id) continue;
        if (!map.has(id)) map.set(id, { ...employee(id), quantity: 0, individualControls: 0, sharedControls: 0 });
        const item = map.get(id);
        if (record.defectMode === "shared") item.sharedControls++;
        else {
          item.individualControls++;
          item.quantity += record.defects.reduce((sum, entry) => sum + (entry.employeeId === id && (!filters.defect || entry.defectId === filters.defect) ? entry.quantity : 0), 0);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.stamp.localeCompare(b.stamp));
  }

  function teamTotals(records) {
    const map = new Map();
    for (const record of records) {
      const key = JSON.stringify([...record.employeeIds].sort());
      if (!map.has(key)) map.set(key, { label: teamLabel(record), controls: 0, inspected: 0, quantity: 0, shared: 0 });
      const item = map.get(key);
      item.controls++;
      item.inspected += record.inspected;
      item.quantity += sumDefects(record);
      if (record.defectMode === "shared") item.shared += sumDefects(record);
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label));
  }

  function employeeAnalytics(records, includePartners = false) {
    const map = new Map();
    for (const record of records) {
      for (const id of record.employeeIds) {
        if (!includePartners && filters.employee && filters.employee !== id) continue;
        if (!map.has(id)) map.set(id, { ...employee(id), controls: 0, individualControls: 0, sharedControls: 0, inspected: 0, individualInspected: 0, quantity: 0 });
        const item = map.get(id);
        item.controls++;
        if (record.defectMode === "shared") item.sharedControls++;
        else {
          item.individualControls++;
          item.individualInspected += record.inspected;
          item.quantity += record.defects.reduce((sum, entry) => sum + (entry.employeeId === id && (!filters.defect || entry.defectId === filters.defect) ? entry.quantity : 0), 0);
        }
        item.inspected += record.inspected;
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.stamp.localeCompare(b.stamp));
  }

  function employeeDefectTotals(records, defectId) {
    const totals = new Map();
    let shared = 0;
    for (const record of records) {
      for (const entry of record.defects) {
        if (entry.defectId !== defectId || (filters.defect && filters.defect !== entry.defectId)) continue;
        if (entry.employeeId) totals.set(entry.employeeId, (totals.get(entry.employeeId) || 0) + entry.quantity);
        else shared += entry.quantity;
      }
    }
    return { totals, shared };
  }

  function allowanceAnalysis(records) {
    const groups = new Map();
    const groupFor = (shift, defectId) => {
      const key = JSON.stringify([shift, defectId]);
      if (!groups.has(key)) groups.set(key, { shift, defectId, observed: 0, shared: 0, assigned: new Map(), allowances: [], approved: 0, hasAllowance: false });
      return groups.get(key);
    };
    for (const record of records) {
      for (const entry of record.defects) {
        if (filters.defect && filters.defect !== entry.defectId) continue;
        const group = groupFor(record.shift, entry.defectId);
        group.observed += entry.quantity;
        if (entry.employeeId) group.assigned.set(entry.employeeId, (group.assigned.get(entry.employeeId) || 0) + entry.quantity);
        else group.shared += entry.quantity;
      }
    }
    for (const rule of state.allowances || []) {
      if (filters.shift && filters.shift !== rule.shift) continue;
      if (filters.defect && filters.defect !== rule.defectId) continue;
      const group = groupFor(rule.shift, rule.defectId);
      group.allowances.push(rule);
      group.hasAllowance = true;
    }
    for (const group of groups.values()) {
      let available = group.observed;
      let employeeExcess = 0;
      const employeeRules = group.allowances.filter(rule => rule.employeeId);
      const shiftRules = group.allowances.filter(rule => !rule.employeeId);
      for (const rule of employeeRules) {
        const observed = group.assigned.get(rule.employeeId) || 0;
        const approved = Math.min(observed, rule.quantity);
        group.approved += approved;
        available -= approved;
        employeeExcess += Math.max(0, observed - rule.quantity);
      }
      let shiftApproved = 0;
      for (const rule of shiftRules) {
        const approved = Math.min(available, rule.quantity);
        group.approved += approved;
        shiftApproved += approved;
        available -= approved;
      }
      group.overLimit = shiftRules.length ? available : employeeExcess;
      group.remaining = group.observed - group.approved;
      group.uncovered = Math.max(0, group.remaining - group.overLimit);
      group.employeeExcess = employeeExcess;
      group.shiftApproved = shiftApproved;
    }
    return [...groups.values()].sort((a, b) => a.shift.localeCompare(b.shift) || (defect(a.defectId)?.code || "").localeCompare(defect(b.defectId)?.code || "", "pl"));
  }

  function allowanceTotals(records) {
    return allowanceAnalysis(records).reduce((totals, item) => {
      totals.approved += item.approved;
      totals.remaining += item.remaining;
      totals.overLimit += item.overLimit;
      totals.uncovered += item.uncovered;
      return totals;
    }, { approved: 0, remaining: 0, overLimit: 0, uncovered: 0 });
  }

  function allowanceRuleRow(rule = {}) {
    return `<div class="allowance-editor-row" data-allowance-id="${esc(rule.id || "")}">
      <label>Zmiana<select data-allowance-shift>${shiftOptions(rule.shift || "1")}</select></label>
      <label>Rodzaj wady<select data-allowance-defect>${options(state.defects, "id", item => `${item.code} · ${item.name}`, rule.defectId || "", "Wybierz wadę")}</select></label>
      <label>Dotyczy<select data-allowance-employee>${options(state.employees, "id", employeeLabel, rule.employeeId || "", "Cała zmiana")}</select></label>
      <label>Dopuszczone wystąpienia<input data-allowance-quantity type="number" min="1" max="10000000" step="1" value="${rule.quantity ?? ""}" placeholder="np. 5"></label>
      <button type="button" class="icon-button" data-action="remove-allowance" aria-label="Usuń dopuszczenie">×</button>
    </div>`;
  }

  function allowancesHtml(records) {
    const rows = allowanceAnalysis(records).filter(item => item.hasAllowance);
    const totals = allowanceTotals(records);
    const observedTotal = rows.reduce((sum, item) => sum + item.observed, 0);
    const allowanceRules = state.allowances || [];
    return `<article class="card table-card allowance-card"><div class="card-head"><div><h2>Dopuszczenia i limity wad</h2><p>Porównanie liczby wykrytych wad z ustalonymi limitami dla bieżącego zakresu raportu.</p></div><span class="pill blue">${num((state.allowances || []).length)} aktywnych reguł</span></div>
      <div class="allowance-overview"><span>Wady objęte analizą <strong>${num(observedTotal)}</strong></span><span>W granicach limitu <strong>${num(totals.approved)}</strong></span><span>Ponad limit <strong>${num(totals.overLimit)}</strong></span><span>Bez ustawionego limitu <strong>${num(totals.uncovered)}</strong></span></div>
      <div class="allowance-help"><strong>Limit oznacza łączną liczbę akceptowanych wad</strong> tej zmiany w wybranym okresie, nie limit na pojedynczą kontrolę. Najpierw rozliczany jest limit pracownika (tylko jego wady indywidualne); limit całej zmiany obejmuje pozostałe wady, także wspólne. Wpisy kontroli pozostają bez zmian.</div>
      <div class="table-wrap"><table><thead><tr><th>ZMIANA</th><th>RODZAJ WADY</th><th>LIMIT PRACOWNIKA</th><th>LIMIT ZMIANY</th><th>WYKRYTO</th><th>W GRANICACH LIMITU</th><th>PONAD LIMIT</th><th>BEZ LIMITU</th></tr></thead><tbody>${rows.length ? rows.map(item => {
        const type = defect(item.defectId);
          const employeeLimit = item.allowances.filter(rule => rule.employeeId).reduce((sum, rule) => sum + rule.quantity, 0);
          const shiftLimit = item.allowances.filter(rule => !rule.employeeId).reduce((sum, rule) => sum + rule.quantity, 0);
          const employeeScope = item.allowances.filter(rule => rule.employeeId).map(rule => `${employeeLabel(employee(rule.employeeId))}: ${num(rule.quantity)}`);
          const shiftScope = item.allowances.find(rule => !rule.employeeId);
          return `<tr><td>${shiftPill(item.shift)}</td><td><strong>${esc(type?.code || "-")}</strong><span class="table-meta">${esc(type?.name || "")}</span></td><td>${employeeScope.length ? employeeScope.map(esc).join("<br>") : "-"}</td><td>${shiftScope ? num(shiftScope.quantity) : "-"}</td><td>${num(item.observed)}</td><td>${num(item.approved)}</td><td>${item.hasAllowance ? `<span class="pill ${item.overLimit ? "orange" : "green"}">${num(item.overLimit)}</span>` : "-"}</td><td>${num(item.uncovered)}</td></tr>`;
      }).join("") : `<tr><td colspan="8">${allowanceRules.length ? "Brak wykrytych wad pasujących do ustawionych limitów w wybranym zakresie." : "Nie ustawiono jeszcze limitów dopuszczeń."}</td></tr>`}</tbody></table></div>
      <details class="allowance-settings"${allowanceRules.length ? "" : " open"}><summary>Konfiguruj limity dopuszczeń <span>${num(allowanceRules.length)} reguł</span></summary>
        <div class="allowance-editor"><div class="allowance-editor-heading"><div><h3>Limity wad</h3><p>Jedna reguła na zmianę, wadę i zakres odpowiedzialności.</p></div><button type="button" class="button secondary" data-action="add-allowance">Dodaj limit</button></div>
          <div id="allowance-editor-rows">${allowanceRules.map(rule => allowanceRuleRow(rule)).join("")}</div>
          <div class="actions allowance-actions"><button type="button" class="button primary" data-action="save-allowances">Zapisz limity</button></div>
        </div>
      </details>
    </article>`;
  }

  function recordsForPeriod(start, end) {
    return state.records.filter(record =>
      record.date >= start && record.date <= end &&
      (!filters.shift || record.shift === filters.shift) &&
      (!filters.employee || record.employeeIds.includes(filters.employee)) &&
      (!filters.brigade || record.brigade === filters.brigade) &&
      (!filters.reference || record.referenceId === filters.reference) &&
      (!filters.defect || record.defects.some(item => item.defectId === filters.defect))
    );
  }

  function periodComparison(records) {
    if (!validDate(filters.start) || !validDate(filters.end) || filters.start > filters.end) return null;
    const days = Math.round((parseDate(filters.end) - parseDate(filters.start)) / 86400000) + 1;
    const previousEnd = addDays(filters.start, -1);
    const previousStart = addDays(previousEnd, -(days - 1));
    const previous = recordsForPeriod(previousStart, previousEnd);
    return { days, previousStart, previousEnd, current: summary(records), previous: summary(previous) };
  }

  function analysisBreakdown(records, keyFor, labelFor) {
    const groups = new Map();
    for (const record of records) {
      const key = keyFor(record);
      if (!groups.has(key)) groups.set(key, { label: labelFor(record), controls: 0, inspected: 0, defects: 0, shared: 0, defectFree: 0 });
      const group = groups.get(key), quantity = sumDefects(record);
      group.controls++;
      group.inspected += record.inspected;
      group.defects += quantity;
      group.shared += record.defectMode === "shared" ? quantity : 0;
      group.defectFree += quantity === 0 ? 1 : 0;
    }
    return [...groups.values()].sort((a, b) => b.defects - a.defects || b.controls - a.controls || a.label.localeCompare(b.label, "pl"));
  }

  function trendPeriods(records) {
    if (!validDate(filters.start) || !validDate(filters.end) || filters.start > filters.end) return [];
    const days = Math.round((parseDate(filters.end) - parseDate(filters.start)) / 86400000) + 1;
    const grouping = days <= 31 ? "day" : days <= 370 ? "week" : days <= 3650 ? "month" : "year";
    const groups = new Map();
    for (const record of records) {
      const date = parseDate(record.date);
      const key = grouping === "day" ? record.date
        : grouping === "week" ? monday(record.date)
          : grouping === "month" ? `${record.date.slice(0, 7)}-01` : `${date.getFullYear()}-01-01`;
      if (!groups.has(key)) groups.set(key, { key, controls: 0, inspected: 0, defects: 0 });
      const period = groups.get(key);
      period.controls++;
      period.inspected += record.inspected;
      period.defects += sumDefects(record);
    }
    const labels = { day: "dzień", week: "tydzień (od poniedziałku)", month: "miesiąc", year: "rok" };
    return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item, index, all) => {
      return {
        ...item,
        label: grouping === "day" ? fmtDate(item.key)
          : grouping === "week" ? `Tydz. ${fmtDate(item.key)}`
            : grouping === "month" ? parseDate(item.key).toLocaleDateString("pl-PL", { month: "long", year: "numeric" })
              : item.key.slice(0, 4),
        rate: item.inspected ? item.defects / item.inspected * 100 : 0,
        previousDefects: index ? all[index - 1].defects : null,
        change: index ? item.defects - all[index - 1].defects : null,
        grouping: labels[grouping]
      };
    });
  }

  function trendHtml(records) {
    const periods = trendPeriods(records);
    if (!periods.length) return `<article class="card table-card"><div class="card-head"><div><h2>Trend wad w czasie</h2><p>Brak kontroli w wybranym okresie.</p></div></div>${empty("Brak danych do trendu")}</article>`;
    const maxDefects = Math.max(1, ...periods.map(item => item.defects));
    const W = 760, H = 260, left = 48, right = 48, top = 24, bottom = 52;
    const width = W - left - right, height = H - top - bottom, step = width / periods.length;
    const labelStride = Math.max(1, Math.ceil(periods.length / 12));
    const maxRate = Math.max(1, ...periods.map(item => item.rate));
    const points = periods.map((item, index) => ({
      x: left + step * (index + .5),
      y: top + height * (1 - item.rate / maxRate),
      item
    }));
    const chart = `<div class="chart-legend"><span><i class="legend-square"></i>Liczba wad</span><span><i class="legend-line"></i>Wady / 100 szt.</span></div><div class="trend-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(periods.map(item => `${item.label}: ${item.defects} wad, ${num(item.rate)} wad na 100 sztuk`).join(". "))}">
      ${[0, 1, 2, 3, 4].map(index => { const y = top + height * index / 4; return `<line x1="${left}" y1="${y}" x2="${W - right}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y + 3}" text-anchor="end" fill="var(--chart-label)" font-size="9">${num(maxDefects * (1 - index / 4))}</text><text x="${W - right + 8}" y="${y + 3}" fill="var(--chart-label)" font-size="9">${num(maxRate * (1 - index / 4))}</text>`; }).join("")}
      ${periods.map((item, index) => { const barHeight = height * item.defects / maxDefects; const showLabel = index % labelStride === 0 || index === periods.length - 1; const label = periods[0].grouping === "dzień" ? item.key.slice(5) : periods[0].grouping.startsWith("tydzień") ? fmtDate(item.key) : periods[0].grouping === "miesiąc" ? parseDate(item.key).toLocaleDateString("pl-PL", { month: "short", year: "2-digit" }) : item.label; return `<g><title>${esc(item.label)}: ${num(item.defects)} wad, ${num(item.inspected)} szt., ${num(item.rate)} wad / 100 szt.</title><rect x="${points[index].x - Math.min(24, step * .32)}" y="${top + height - barHeight}" width="${Math.min(48, step * .64)}" height="${barHeight}" rx="3" fill="#8970df"/>${showLabel ? `<text x="${points[index].x}" y="${H - 25}" text-anchor="middle" fill="var(--chart-label)" font-size="9">${esc(label)}</text>` : ""}</g>`; }).join("")}
      ${points.length > 1 ? `<polyline points="${points.map(point => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#e1ad63" stroke-width="2"/>` : ""}
      ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="3" fill="var(--chart-point)" stroke="#e1ad63" stroke-width="1.6"><title>${num(point.item.rate)} wad / 100 szt.</title></circle>`).join("")}
    </svg></div>`;
    return `<article class="card table-card"><div class="card-head"><div><h2>Trend wad w czasie</h2><p>Grupowanie: ${periods[0].grouping}. Zmiana liczby wad względem poprzedniego okresu z kontrolami.</p></div></div>${chart}
      <div class="table-wrap"><table><thead><tr><th>OKRES</th><th>KONTROLE</th><th>SPRAWDZONE SZTUKI</th><th>WADY</th><th>WADY / 100 SZT.</th><th>ZMIANA WAD</th><th>TREND</th></tr></thead><tbody>${periods.map(item => {
      const direction = item.change === null ? "-" : item.change > 0 ? "Wzrost" : item.change < 0 ? "Spadek" : "Bez zmian";
      return `<tr><td><strong>${esc(item.label)}</strong></td><td>${num(item.controls)}</td><td>${num(item.inspected)}</td><td>${num(item.defects)}</td><td>${num(item.rate)}</td><td>${item.change === null ? "-" : `${item.change > 0 ? "+" : ""}${num(item.change)}`}</td><td><span class="pill ${item.change > 0 ? "orange" : item.change < 0 ? "green" : "gray"}">${direction}</span></td></tr>`;
    }).join("")}</tbody></table></div></article>`;
  }

  function comparisonHtml(records) {
    const comparison = periodComparison(records);
    if (!comparison) return "";
    const previousRecords = recordsForPeriod(comparison.previousStart, comparison.previousEnd);
    const currentAllowanceTotals = allowanceTotals(records);
    const previousAllowanceTotals = allowanceTotals(previousRecords);
    const currentDefectFree = records.filter(record => sumDefects(record) === 0).length;
    const previousDefectFree = previousRecords.filter(record => sumDefects(record) === 0).length;
    const values = [
      ["Wady", comparison.current.defects, comparison.previous.defects, "wad"],
      ["Dopuszczone wady", currentAllowanceTotals.approved, previousAllowanceTotals.approved, "wad"],
      ["Wady ponad limity", currentAllowanceTotals.overLimit, previousAllowanceTotals.overLimit, "wad"],
      ["Wady po dopuszczeniach", currentAllowanceTotals.remaining, previousAllowanceTotals.remaining, "wad"],
      ["Sprawdzone sztuki", comparison.current.inspected, comparison.previous.inspected, "szt."],
      ["Liczba kontroli", records.length, previousRecords.length, "kontroli"],
      ["Kontrole bez wad", currentDefectFree, previousDefectFree, "kontroli"]
    ];
    return `<section class="comparison-section"><div class="section-title"><div><h2>Porównanie z poprzednim okresem</h2><p>${fmtDate(filters.start)}–${fmtDate(filters.end)} vs ${fmtDate(comparison.previousStart)}–${fmtDate(comparison.previousEnd)} · okresy po ${num(comparison.days)} dni</p></div></div><div class="comparison-grid">${values.map(([label, current, previous, unit]) => {
      const delta = current - previous, percent = previous ? delta / previous * 100 : null;
      const direction = delta > 0 ? "Wzrost" : delta < 0 ? "Spadek" : "Bez zmian";
      const qualityMetric = label === "Wady" || label === "Wady ponad limity" || label === "Wady po dopuszczeniach";
      const changeClass = !qualityMetric || delta === 0 ? "neutral" : delta < 0 ? "favorable" : "unfavorable";
      return `<article class="card comparison-card"><span>${label}</span><strong>${num(current)} <small>${unit}</small></strong><div>Poprzednio: ${num(previous)}${unit ? ` ${unit}` : ""}</div><div class="comparison-change ${changeClass}">${direction} ${delta > 0 ? "+" : ""}${num(delta)}${percent === null ? " (brak bazy)" : ` · ${percent > 0 ? "+" : ""}${num(percent)}%`}</div></article>`;
    }).join("")}</div></section>`;
  }

  function breakdownTable(title, description, rows) {
    return `<article class="card table-card"><div class="card-head"><div><h2>${title}</h2><p>${description}</p></div></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>GRUPA</th><th>KONTROLE</th><th>SPRAWDZONE SZTUKI</th><th>WADY</th><th>W TYM WSPÓLNE</th><th>WADY / 100 SZT.</th><th>KONTROLE BEZ WAD</th><th>ODSETEK KONTROLI BEZ WAD</th></tr></thead><tbody>${rows.map(item => `<tr><td><strong>${esc(item.label)}</strong></td><td>${num(item.controls)}</td><td>${num(item.inspected)}</td><td>${num(item.defects)}</td><td>${num(item.shared)}</td><td>${item.inspected ? num(item.defects / item.inspected * 100) : "-"}</td><td>${num(item.defectFree)}</td><td>${item.controls ? `${num(item.defectFree / item.controls * 100)}%` : "-"}</td></tr>`).join("")}</tbody></table></div>` : empty("Brak danych")}</article>`;
  }

  function saveAllowances() {
    const rows = $$(".allowance-editor-row", $("#allowance-editor-rows"));
    const allowances = [], keys = new Set();
    for (const row of rows) {
      const shift = $("[data-allowance-shift]", row).value;
      const defectId = $("[data-allowance-defect]", row).value;
      const employeeId = $("[data-allowance-employee]", row).value || null;
      const quantity = Number($("[data-allowance-quantity]", row).value);
      if (!["1", "2", "3"].includes(shift) || !defect(defectId) ||
        (employeeId && !employee(employeeId)) ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000000) {
        notify("Każda reguła wymaga zmiany, istniejącej wady oraz całkowitego limitu od 1 do 10 000 000.", true);
        return;
      }
      const key = JSON.stringify([shift, defectId, employeeId]);
      if (keys.has(key)) {
        notify("Nie można zapisać dwóch limitów dla tej samej zmiany, wady i pracownika.", true);
        return;
      }
      keys.add(key);
      allowances.push({ id: row.dataset.allowanceId || uid(), shift, defectId, employeeId, quantity });
    }
    const next = clone(state);
    next.allowances = allowances;
    if (persist(next, "Zapisano dopuszczenia. Wpisy kontroli i dane katalogów pozostały bez zmian.")) render();
  }

  function exportAnalyticsCSV() {
    const records = filteredRecords();
    if (!records.length) { notify("Brak kontroli do eksportu zestawień w wybranym zakresie.", true); return; }
    const rows = [["Sekcja", "Wymiar", "Wartość", "Jednostka", "Opis"]];
    const totals = summary(records), allowances = allowanceTotals(records);
    rows.push(["Podsumowanie", "Kontrole", records.length, "kontroli", "Liczba kontroli po zastosowaniu filtrów"]);
    rows.push(["Podsumowanie", "Sprawdzone sztuki", totals.inspected, "szt.", "Sztuki liczone raz na kontrolę"]);
    rows.push(["Podsumowanie", "Wady wykryte", totals.defects, "wad", "Wady wspólne i indywidualne"]);
    rows.push(["Podsumowanie", "Dopuszczone", allowances.approved, "wad", "Ograniczone do rzeczywiście wykrytej liczby wad"]);
    rows.push(["Podsumowanie", "Ponad limit", allowances.overLimit, "wad", "Liczba wykrytych wad powyżej ustalonych limitów"]);
    rows.push(["Podsumowanie", "Wady po dopuszczeniach", allowances.remaining, "wad", "Wady wykryte pomniejszone o dopuszczone wystąpienia"]);
    rows.push(["Podsumowanie", "Średnio sprawdzone", totals.inspected / records.length, "szt. / kontrolę", "Wskaźnik przepustowości, nie produktywność na roboczogodzinę"]);
    for (const item of allowanceAnalysis(records).filter(item => item.hasAllowance)) {
      const type = defect(item.defectId);
      rows.push(["Dopuszczenia", `${SHIFTS[item.shift]} · ${type?.code || item.defectId}`, item.observed, "wad wykrytych", `Limit: ${item.allowances.reduce((sum, rule) => sum + rule.quantity, 0)}; dopuszczone: ${item.approved}; poza limitem: ${item.overLimit}; po dopuszczeniu: ${item.remaining}`]);
    }
    for (const item of defectTotals(records)) {
      const assigned = employeeDefectTotals(records, item.id);
      rows.push(["Pareto", item.code, item.quantity, "wad", `${item.name}; udział: ${num(item.quantity / totals.defects * 100)}%; skumulowany udział liczony w tabeli raportu`]);
      rows.push(["Pareto - wady wspólne", item.code, assigned.shared, "wad", `${item.quantity ? num(assigned.shared / item.quantity * 100) : 0}% danej wady`]);
      for (const [id, quantity] of assigned.totals) rows.push(["Pareto - pracownik", `${item.code} · ${employeeLabel(employee(id))}`, quantity, "wad", `${item.quantity ? num(quantity / item.quantity * 100) : 0}% danej wady`]);
    }
    for (const item of trendPeriods(records)) rows.push(["Trend", item.label, item.defects, "wad", `Wady / 100 szt.: ${num(item.rate)}; zmiana wad: ${item.change === null ? "brak poprzedniego okresu" : item.change}`]);
    for (const [title, groups] of [
      ["Zmiana", analysisBreakdown(records, record => record.shift, record => SHIFTS[record.shift])],
      ["Brygada", analysisBreakdown(records, record => record.brigade, record => `Brygada ${record.brigade}`)],
      ["Referencja", analysisBreakdown(records, record => record.referenceId, record => reference(record.referenceId).code)],
      ["Zespół", teamTotals(records)]
    ]) {
      for (const item of groups) rows.push([title, item.label, item.defects ?? item.quantity, "wad", `Kontrole: ${item.controls}; sztuki: ${item.inspected}; wady / 100 szt.: ${num((item.defects ?? item.quantity) / item.inspected * 100)}`]);
    }
    download("\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n"), `zestawienia-${today()}.csv`, "text/csv;charset=utf-8");
    notify("Wyeksportowano szczegółowe zestawienia do CSV.");
  }
  function rankingHtml(records) {
    const people = employeeTotals(records).filter(item => item.individualControls > 0);
    const top = people.slice(0, 5);
    const max = Math.max(1, ...top.map(item => item.quantity));
    return `<article class="card"><div class="card-head"><div><h2>Wady przypisane pracownikom</h2><p>Malejąco · tylko kontrole z wadami rozpisanymi osobno</p></div><span class="pill green">TOP 5</span></div>
      <div class="rank-list">${top.length ? top.map((item, index) => `<div class="rank-row"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span class="rank-avatar">${esc(item.stamp.slice(0, 3))}</span><div class="rank-name"><strong>Pieczątka #${esc(item.stamp)}</strong><small>${esc(item.name || `${num(item.individualControls)} kontroli rozpisanych osobno`)}</small></div><div class="rank-value">${num(item.quantity)}<small>przypisanych wad</small><div class="rank-bar"><span style="width:${item.quantity / max * 100}%"></span></div></div></div>`).join("") : empty("Brak indywidualnych rozliczeń", "Wady wspólne znajdziesz w wynikach zespołów, nie w rankingu osób.")}</div>
      <div class="ranking-note">Wspólne wady i sztuki nie są dzielone między osoby. Brak indywidualnego wskaźnika wad / 100 szt. Liczba wad nie jest oceną skuteczności.</div></article>`;
  }

  function recordsTable(records, recent = false) {
    const rows = recent ? records.slice(0, 5) : records.slice((recordPage - 1) * 20, recordPage * 20);
    const pages = Math.max(1, Math.ceil(records.length / 20));
    return `<article class="card table-card"><div class="card-head"><div><h2>${recent ? "Ostatnie kontrole" : "Zapisane kontrole"}</h2><p>${recent ? "Najnowsze wpisy w wybranym okresie" : `${num(records.length)} rekordów pasujących do filtrów`}</p></div>${recent ? '<a href="#records" class="button ghost">Cały rejestr →</a>' : `<span class="pill purple">${num(records.length)} wpisów</span>`}</div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>DATA</th><th>PRACOWNICY</th><th>ZMIANA</th><th>BRYGADA LINII</th><th>NR REFERENCJI</th><th>SPRAWDZONO ŁĄCZNIE</th><th>WADY</th><th aria-label="Akcje"></th></tr></thead><tbody>${rows.map(record => {
      const ref = reference(record.referenceId);
      const details = record.defects.filter(item => !filters.defect || item.defectId === filters.defect).map(item => `${defect(item.defectId).code}: ${item.quantity} (${item.employeeId ? employeeLabel(employee(item.employeeId)) : "wspólnie"})`).join(", ");
      return `<tr><td>${fmtDate(record.date)}</td><td>${record.employeeIds.map(id => `<div class="table-person"><span class="mini-avatar">${esc(employee(id).stamp.slice(0, 3))}</span><strong>${esc(employeeLabel(employee(id)))}</strong></div>`).join("")}<span class="table-meta">${modeLabel(record)}</span></td><td>${shiftPill(record.shift)}</td><td><span class="pill gray">Brygada ${esc(record.brigade)}</span></td><td><strong>${esc(ref.code)}</strong></td><td>${num(record.inspected)} <span class="muted">szt.</span></td><td title="${esc(details || "Brak wad")}"><strong style="color:${sumDefects(record) ? "#b38c5d" : "#5eaa8e"}">${num(sumDefects(record))}</strong><span class="table-meta">${modeLabel(record)}</span></td><td><div class="table-actions"><button class="icon-button" data-action="edit-record" data-id="${esc(record.id)}" aria-label="Edytuj kontrolę ${fmtDate(record.date)}: ${esc(teamLabel(record))}">${icon("edit")}</button><button class="icon-button" data-action="delete-record" data-id="${esc(record.id)}" aria-label="Usuń kontrolę: ${esc(teamLabel(record))}">${icon("trash")}</button></div></td></tr>`;
    }).join("")}</tbody></table></div>` : empty("Brak kontroli w tym okresie", state.records.length ? "Zmień daty lub filtry, aby zobaczyć pozostałe wpisy." : "Dodaj pracowników, referencje i pierwszą kontrolę.", actionButton("Dodaj kontrolę", "new-record", "plus", "primary"))}<div class="table-footer"><span>${recent ? `Pokazano ${rows.length} z ${num(records.length)} kontroli` : `Strona ${recordPage} z ${pages} · do 20 wpisów na stronę`}</span>${recent ? '<span>Zmiany I / II / III</span>' : `<div class="actions"><button class="button ghost" data-action="prev-records"${recordPage <= 1 ? " disabled" : ""}>← Poprzednia</button><button class="button ghost" data-action="next-records"${recordPage >= pages ? " disabled" : ""}>Następna →</button></div>`}</div></article>`;
  }

  function analyticsHtml(records) {
    const defects = defectTotals(records);
    const total = defects.reduce((sum, item) => sum + item.quantity, 0);
    let cumulative = 0;
    const people = employeeAnalytics(records);
    const individualTotal = people.reduce((sum, item) => sum + item.quantity, 0);
    const peopleWithIndividualDefects = people.filter(item => item.individualControls > 0);
    const paretoEmployees = employeeAnalytics(records, true).sort((a, b) => a.stamp.localeCompare(b.stamp, "pl"));
    const shifts = analysisBreakdown(records, record => record.shift, record => SHIFTS[record.shift]);
    const brigades = analysisBreakdown(records, record => record.brigade, record => `Brygada ${record.brigade}`);
    const references = analysisBreakdown(records, record => record.referenceId, record => reference(record.referenceId).code);
    return `${statsHtml(records)}${analyticsKpisHtml(records)}<div class="shift-cards">${["1", "2", "3"].map(shift => {
      const matching = records.filter(record => record.shift === shift), sums = summary(matching);
      const allowance = allowanceTotals(matching);
      return `<article class="card shift-card">${shiftPill(shift)}<div class="stat-value">${num(sums.defects)} <small>wad</small></div><p>${num(sums.inspected)} sprawdzonych sztuk · ${matching.length} kontroli</p><div class="shift-metrics"><span class="pill gray">${sums.inspected ? num(sums.defects / sums.inspected * 100) : "-"} wad / 100 szt.</span><span class="pill ${allowance.overLimit ? "orange" : "green"}">${num(allowance.approved)} dopuszczone</span><span class="pill ${allowance.overLimit ? "orange" : "green"}">${num(allowance.overLimit)} ponad limit</span></div></article>`;
    }).join("")}</div>${comparisonHtml(records)}${trendHtml(records)}${allowancesHtml(records)}<div class="dashboard-grid">${paretoHtml(records)}${rankingHtml(records)}</div>
      <div class="analytics-grid">
        <article class="card table-card"><div class="card-head"><div><h2>Wyniki zespołów</h2><p>Wspólna liczba sztuk, wszystkie wady i wskaźnik dla całej obsady</p></div></div>
          ${records.length ? `<div class="table-wrap"><table><thead><tr><th>OBSADA</th><th>KONTROLE</th><th>SPRAWDZONO ŁĄCZNIE</th><th>WSZYSTKIE WADY</th><th>W TYM WSPÓLNE</th><th>WADY / 100 SZT.</th></tr></thead><tbody>${teamTotals(records).map(item => `<tr><td><strong>${esc(item.label)}</strong></td><td>${num(item.controls)}</td><td>${num(item.inspected)}</td><td>${num(item.quantity)}</td><td>${num(item.shared)}</td><td>${num(item.quantity / item.inspected * 100)}</td></tr>`).join("")}</tbody></table></div>` : empty("Brak danych zespołów")}
        </article>
        <article class="card table-card"><div class="card-head"><div><h2>Szczegółowe Pareto</h2><p>Wady wspólne i indywidualne liczone po jednym razie</p></div></div>
          <p class="section-note pareto-note">Udział przy pracowniku oznacza procent liczby danej wady przypisany tej osobie. Wady wspólne pozostają osobno i nie są rozdzielane.</p>
          ${defects.length ? `<div class="table-wrap"><table class="wide-table"><thead><tr><th>KOD</th><th>NAZWA WADY</th><th>LICZBA</th><th>UDZIAŁ WADY</th><th>SKUMULOWANY</th><th>WSPÓLNE</th>${paretoEmployees.map(item => `<th>#${esc(item.stamp)}<span class="table-meta">% tej wady</span></th>`).join("")}</tr></thead><tbody>${defects.map(item => {
      cumulative += item.quantity;
      const attribution = employeeDefectTotals(records, item.id);
      return `<tr><td><strong>${esc(item.code)}</strong></td><td>${esc(item.name)}</td><td>${num(item.quantity)}</td><td>${num(item.quantity / total * 100)}%</td><td>${num(cumulative / total * 100)}%</td><td>${num(attribution.shared)}${item.quantity ? `<span class="table-meta">${num(attribution.shared / item.quantity * 100)}% tej wady</span>` : ""}</td>${paretoEmployees.map(person => {
        const quantity = attribution.totals.get(person.id) || 0;
        return `<td>${num(quantity)}<span class="table-meta">${item.quantity ? `${num(quantity / item.quantity * 100)}% tej wady` : "-"}</span></td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody></table></div>` : empty("Brak wad w wybranym okresie")}
        </article>
        <article class="card table-card"><div class="card-head"><div><h2>Porównanie pracowników</h2><p>Tylko wady przypisane do osoby. Wspólne sztuki nie są dzielone na pracowników.</p></div></div>
          ${people.length ? `<div class="table-wrap"><table><thead><tr><th>PRACOWNIK</th><th>UDZIAŁ W KONTROLACH</th><th>KONTROLE INDYWIDUALNE</th><th>KONTROLE WSPÓLNE</th><th>SPRAWDZONE SZTUKI W JEGO KONTROLACH INDYWIDUALNYCH</th><th>PRZYPISANE WADY</th><th>% WSZYSTKICH WAD</th><th>ŚREDNIO WAD / KONTROLĘ INDYWIDUALNĄ</th></tr></thead><tbody>${people.map(item => `<tr><td><strong>${esc(employeeLabel(item))}</strong></td><td>${records.length ? `${num(item.controls / records.length * 100)}%` : "-"}</td><td>${num(item.individualControls)}</td><td>${num(item.sharedControls)}</td><td>${num(item.individualInspected)}</td><td>${item.individualControls ? num(item.quantity) : "-"}</td><td>${total && item.individualControls ? `${num(item.quantity / total * 100)}%` : "-"}</td><td>${item.individualControls ? num(item.quantity / item.individualControls) : "-"}</td></tr>`).join("")}</tbody></table></div>` : empty("Brak danych do porównania")}
          <div class="ranking-note">Udział w kontrolach liczy udział pracownika we wszystkich wpisach (dwie osoby w kontroli oznaczają udział obu). Wspólne wady pozostają bez przypisania. „% wszystkich wad” ma jako mianownik wszystkie wady, także wspólne. Sztuki są liczbą sztuk w kontrolach z jego udziałem, nie indywidualnym wynikiem produkcji. Produktywności na osobę nie wyliczamy bez osobnej liczby sztuk i czasu pracy.</div>
        </article>
        ${breakdownTable("Porównanie zmian", "Pełna liczba kontroli, wad, udział kontroli bez wad i wskaźnik na 100 sztuk.", shifts)}
        ${breakdownTable("Porównanie brygad linii", "Wyniki każdej brygady w wybranym zakresie.", brigades)}
        ${breakdownTable("Porównanie referencji", "Wyniki dla każdej kontrolowanej referencji.", references)}
        <article class="card table-card"><div class="card-head"><div><h2>Udział pracowników w sumie wad</h2><p>Udział indywidualnych rozliczeń w łącznej liczbie wad; wady wspólne są wydzielone.</p></div></div>
          ${peopleWithIndividualDefects.length ? `<div class="table-wrap"><table><thead><tr><th>PRACOWNIK</th><th>WADY INDYWIDUALNE</th><th>% WSZYSTKICH WAD</th><th>% WAD INDYWIDUALNYCH</th><th>KONTROLE Z WADAMI WSPÓLNYMI</th></tr></thead><tbody>${peopleWithIndividualDefects.map(item => `<tr><td><strong>${esc(employeeLabel(item))}</strong></td><td>${num(item.quantity)}</td><td>${total ? `${num(item.quantity / total * 100)}%` : "-"}</td><td>${individualTotal ? `${num(item.quantity / individualTotal * 100)}%` : "-"}</td><td>${num(item.sharedControls)}</td></tr>`).join("")}</tbody></table></div>` : empty("Brak indywidualnie przypisanych wad")}
          <div class="ranking-note">Wartości procentowe pracowników nie sumują się do 100%, jeśli występują wady wspólne albo nieprzypisane.</div>
        </article>
      </div>`;
  }

  function catalogHtml(type) {
    const isPeople = type === "employees";
    const isReference = type === "references";
    const items = state[type].filter(item => `${isPeople ? item.stamp : item.code} ${isReference ? "" : item.name}`.toLocaleLowerCase("pl").includes(search.toLocaleLowerCase("pl")));
    return `<div class="search-bar"><input id="catalog-search" aria-label="Szukaj w katalogu" placeholder="${isReference ? "Szukaj po numerze referencji…" : isPeople ? "Szukaj po pieczątce lub nazwie…" : "Szukaj po kodzie lub nazwie…"}" value="${esc(search)}"><span class="section-note" style="margin:0">${items.length} pozycji</span></div>
      <p class="section-note">${isPeople ? "Pracowników przypisujesz ręcznie w Grafiku zmian, osobno na każdy tydzień. Nie ma automatycznej rotacji. Archiwizacja zachowuje historię kontroli." : isReference ? "Każda referencja ma tylko unikalny numer. Archiwizacja zachowuje historię i ukrywa numer w nowych kontrolach." : "Archiwalne pozycje pozostają w historii i raportach, ale nie są proponowane w nowych kontrolach. Kod musi być unikalny."}</p>
      <article class="card table-card">${items.length ? `<div class="table-wrap"><table><thead><tr><th>${isReference ? "NR REFERENCJI" : isPeople ? "ID PIECZĄTKI" : "KOD"}</th>${isReference ? "" : `<th>${isPeople ? "NAZWA / IMIĘ (OPCJONALNIE)" : "NAZWA"}</th>`}<th>STATUS</th><th>AKCJE</th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${isPeople ? "#" : ""}${esc(isPeople ? item.stamp : item.code)}</strong></td>${isReference ? "" : `<td>${esc(item.name || "-")}</td>`}<td><span class="pill ${item.active ? "green" : "gray"}">${item.active ? "Aktywny" : "Archiwalny"}</span></td><td><div class="table-actions"><button class="button ghost" data-action="edit-catalog" data-id="${esc(item.id)}">Edytuj</button><button class="button ghost" data-action="archive-catalog" data-id="${esc(item.id)}">${item.active ? "Archiwizuj" : "Przywróć"}</button></div></td></tr>`).join("")}</tbody></table></div>` : empty(search ? "Nie znaleziono pozycji" : "Katalog jest jeszcze pusty", "Dodaj pierwszą pozycję przyciskiem w prawym górnym rogu.")}</article>`;
  }

  function scheduleHtml() {
    const days = Array.from({ length: 5 }, (_, index) => addDays(week, index));
    const people = active(state.employees);
    return `<div class="schedule-tools"><div class="week-nav"><button class="button secondary" data-action="prev-week" aria-label="Poprzedni tydzień">←</button><input id="schedule-week" type="date" aria-label="Wybierz tydzień" value="${week}"><button class="button secondary" data-action="next-week" aria-label="Następny tydzień">→</button><button class="button ghost" data-action="current-week">Bieżący tydzień</button></div>${actionButton("Wyczyść tydzień", "reset-week", "trash")}</div>
      <p class="section-note">Tydzień ${fmtDate(week)} – ${fmtDate(days[4])}. <strong>Grafik ustawiasz ręcznie, niezależnie dla każdego tygodnia.</strong> Kolumna „Cały tydzień” ustawia pięć dni i zastępuje ich wcześniejsze przypisania. Pojedyncze dni możesz potem zmienić osobno. „Nieprzypisany” oznacza brak ustalenia, a „Wolne” - zaplanowany dzień wolny. Grafik nie zmienia zapisanych kontroli.</p>
      <article class="card table-card">${people.length ? `<div class="table-wrap"><table><thead><tr><th>PRACOWNIK</th><th>CAŁY TYDZIEŃ<span class="table-meta">Ustaw pon. – pt.</span></th>${days.map(date => `<th>${parseDate(date).toLocaleDateString("pl-PL", { weekday: "long" }).toLocaleUpperCase("pl")}<span class="table-meta">${fmtDate(date)}</span></th>`).join("")}</tr></thead><tbody>${people.map(item => {
      const wholeWeek = weeklyShift(item, week);
      return `<tr><td><strong>#${esc(item.stamp)}</strong><span class="table-meta">${esc(item.name)}</span></td><td class="weekly-assignment"><select class="schedule-select" data-weekly="${esc(item.id)}" data-shift="${wholeWeek}" aria-label="Cały tydzień pracownika ${esc(item.stamp)}">${wholeWeek === "mixed" ? '<option value="mixed" selected disabled>Różne zmiany</option>' : ""}${shiftOptions(wholeWeek, true, "Nieprzypisany")}</select></td>${days.map(date => {
      const shift = scheduledShift(item, date);
      return `<td><select class="schedule-select" data-schedule="${esc(item.id)}" data-date="${date}" data-shift="${shift}" aria-label="Zmiana pracownika ${esc(item.stamp)} ${date}">${shiftOptions(shift, true, "Nieprzypisany")}</select></td>`;
    }).join("")}</tr>`;
    }).join("")}</tbody></table></div>` : empty("Najpierw dodaj pracowników", "Po dodaniu pracowników przypisz im zmiany w wybranym tygodniu.", '<a class="button primary" href="#employees">Przejdź do pracowników</a>')}</article><div class="alert info" style="margin-top:20px">Brygada linii A–D jest niezależna od zmiany pracownika. Wskazujesz ją osobno w każdej kontroli. Nocna należy do dnia rozpoczęcia zmiany.</div>`;
  }

  function settingsHtml() {
    return `<div class="settings-grid">
      <article class="card"><div class="card-head"><div><h2>Kopie zapasowe</h2><p>Kontrole, katalogi, grafik i ustawienia</p></div></div><div class="settings-body">
        <p>Dane są przechowywane w tej przeglądarce. Wyczyszczenie danych witryny lub tryb prywatny może je usunąć. Regularnie pobieraj kopię JSON. Import <strong>zastępuje wszystkie dane</strong>, nie scala ich.</p>
        <div class="actions">${actionButton("Pobierz kopię JSON", "backup", "download")}${actionButton("Przywróć kopię", "import", "upload")}</div>
        ${storageBroken ? `<div class="actions" style="margin-top:15px">${actionButton("Pobierz uszkodzony zapis", "raw-backup", "download")}</div>` : ""}
        <p style="margin:20px 0 0">Kontrole: <strong>${num(state.records.length)}</strong> · Pracownicy: <strong>${num(state.employees.length)}</strong> · Wady: <strong>${num(state.defects.length)}</strong> · Referencje: <strong>${num(state.references.length)}</strong></p>
      </div></article>
      <article class="card"><div class="card-head"><h2>Eksport danych</h2></div><div class="settings-body">
        <p>CSV zawiera obu pracowników, sposób rozliczania i właściciela każdej ilości wad (albo „Wspólnie”). W trybie osobnym ta sama wada ma osobny wiersz dla każdej osoby. Wspólna liczba sprawdzonych sztuk jest podana tylko w pierwszym wierszu kontroli.</p>
        <div class="actions">${actionButton("Eksport wszystkich kontroli", "export-all", "download")}<a href="#analytics" class="button secondary">Zestawienia →</a></div>
      </div></article>
      <article class="card"><div class="card-head"><h2>Zasady zestawień</h2></div><div class="settings-body">
        <p>W formularzu kontroli pełny aktywny katalog wad jest po lewej, a dane operatorów i partii po prawej. Wpisuj tylko ilości. Puste pola i zera nie tworzą pozycji wad. Podczas edycji widoczne są także archiwalne wady użyte we wpisie.</p>
        <p>Jedna część może mieć kilka wad. Wskaźnik „wady / 100 szt.” liczy wystąpienia wad, nie odsetek odrzuconych części.</p>
        <p>Jedna kontrola obejmuje jedną lub dwie osoby i jedną wspólną liczbę sprawdzonych sztuk. Wszystkie wady w danym wpisie są wspólne albo rozpisane osobno. Wspólne wady nie trafiają do rankingu osób. Nie wyliczamy indywidualnego wskaźnika wad / 100 szt., bo nie znamy indywidualnej liczby sprawdzonych sztuk.</p>
        <p>Dopuszczenia są osobnymi regułami zestawień, ustawianymi dla zmiany i rodzaju wady, opcjonalnie dla pracownika. Limit obowiązuje łącznie dla sumy kontroli w wybranym okresie i zgodnie z pozostałymi filtrami, a nie osobno na każdą kontrolę. Najpierw rozliczane są limity pracownika na jego wady indywidualne, a następnie limit całej zmiany na pozostałe wady, w tym wspólne. Raport rozróżnia dopuszczone wady, liczbę ponad limit oraz wady bez dopuszczenia. Reguły nie zmieniają kontroli ani katalogów.</p>
        <p>Produktywność szt./roboczogodzinę nie jest wyliczana, ponieważ wpis kontroli nie zawiera czasu pracy. Raport pokazuje średnią liczbę sprawdzonych sztuk na kontrolę jako wskaźnik przepustowości; nie jest to produktywność na godzinę ani indywidualny wynik operatora.</p>
        <p>Filtr pracownika wybiera całe kontrole z jego udziałem: sumy i Pareto obejmują całą parę, także wady partnera. Tabela porównania osób pokazuje tylko wady przypisane wybranemu pracownikowi. Filtr wady wybiera kontrole zawierające tę wadę; sztuki nadal dotyczą całych kontroli.</p>
        <p>Zmiana nocna należy do dnia jej rozpoczęcia, także w piątek.</p>
      </div></article>
      <article class="card"><div class="card-head"><h2>Usuwanie danych</h2></div><div class="settings-body">
        <p>Usunięcie obejmuje wszystkie kontrole, katalogi i grafik. Przed kontynuacją pobierz kopię zapasową. Operacja wymaga dodatkowego potwierdzenia.</p>
        <button class="button danger-button" data-action="clear-data">${icon("trash")}Usuń wszystkie dane</button>
      </div></article>
      <article class="card"><div class="card-head"><h2>Przechowywanie danych</h2></div><div class="settings-body">
        <p>Rejestr działa lokalnie, bez wysyłania danych do internetu. Nie korzystaj z niego równocześnie w kilku kartach przeglądarki.</p>
        <p>Praca na kilku komputerach wymaga wspólnej bazy danych. Kopia JSON pozwala przenieść archiwum do innej przeglądarki lub na inny komputer.</p>
      </div></article>
    </div>`;
  }

  function setupHtml() {
    const steps = [
      ["employees", "Pracownicy", "Dodaj identyfikatory pieczątek i nazwiska."],
      ["references", "Referencje części", "Wprowadź numery kontrolowanych części."],
      ["defects", "Katalog wad", "Zdefiniuj kody i nazwy wad."]
    ];
    const ready = steps.every(([key]) => active(state[key]).length);
    return `<article class="card setup-card" aria-labelledby="setup-title">
      <div class="setup-heading"><span class="eyebrow">KONFIGURACJA REJESTRU</span><h2 id="setup-title">${ready ? "Rejestr gotowy do pracy" : "Przygotuj pierwszą kontrolę"}</h2><p>${ready ? "Dodaj pierwszy wpis, aby zobaczyć wyniki i zestawienia." : "Uzupełnij trzy słowniki. Wyniki pojawią się po zapisaniu kontroli."}</p></div>
      <div class="setup-steps">${steps.map(([key, title, description], index) => {
        const count = active(state[key]).length;
        return `<a class="setup-step" href="#${key}"><span class="setup-number">${count ? icon("check") : `0${index + 1}`}</span><div><h3>${title}</h3><p>${description}</p><small>${count ? `${num(count)} aktywnych pozycji` : "Do uzupełnienia"}</small></div>${icon("arrow")}</a>`;
      }).join("")}</div>
      <div class="setup-footer"><span>Dane pozostają w tej przeglądarce. Kopie JSON są dostępne w ustawieniach.</span>${ready ? actionButton("Dodaj kontrolę", "new-record", "plus", "primary") : '<a class="button secondary" href="#settings">Przywróć kopię JSON</a>'}</div>
    </article>`;
  }

  function render() {
    renderNavigation();
    const config = PAGES[page];
    $("#breadcrumb").textContent = config[0];
    $("#page-title").textContent = config[1];
    $("#page-subtitle").textContent = config[2];
    let actions = "";
    if (["dashboard", "records", "analytics"].includes(page)) actions += actionButton("Eksport CSV", "export", "download");
    if (["dashboard", "records"].includes(page)) actions += actionButton("Dodaj kontrolę", "new-record", "plus", "primary");
    if (page === "analytics") actions += actionButton("Eksport analizy CSV", "export-analytics", "download") + actionButton("Drukuj raport", "print", "clipboard", "primary");
    if (["employees", "defects", "references"].includes(page)) actions += actionButton({ employees: "Dodaj pracownika", defects: "Dodaj wadę", references: "Dodaj referencję" }[page], "new-catalog", "plus", "primary");
    if (page === "schedule") actions += actionButton("Dodaj kontrolę", "new-record", "plus", "primary");
    $("#page-actions").innerHTML = actions;
    renderFilters();
    const records = filteredRecords();
    let html = "";
    if (filters.start > filters.end && ["dashboard", "records", "analytics"].includes(page)) html += '<div class="alert danger">Data „od” nie może być późniejsza niż data „do”. Popraw zakres.</div>';
    if (filters.employee && ["dashboard", "records", "analytics"].includes(page)) html += '<div class="alert info">Wybrano kontrole z udziałem wskazanego pracownika. Sztuki, suma wad i Pareto dotyczą całej obsady, także partnera i wad wspólnych. Zestawienie osób uwzględnia tylko wady przypisane wybranemu pracownikowi.</div>';
    if (page === "dashboard") html += `${statsHtml(records)}${state.records.length || storageBroken ? `<div class="dashboard-grid">${paretoHtml(records)}${rankingHtml(records)}</div>${recordsTable(records, true)}` : setupHtml()}`;
    if (page === "records") html += recordsTable(records);
    if (page === "analytics") html += analyticsHtml(records);
    if (page === "schedule") html += scheduleHtml();
    if (["employees", "defects", "references"].includes(page)) html += catalogHtml(page);
    if (page === "settings") html += settingsHtml();
    $("#content").innerHTML = html;
  }

  function openDialog(title, body, data) {
    modal = data;
    $("#editor").classList.toggle("inspection-editor", data.type === "record");
    $("#dialog-title").textContent = title;
    $("#dialog-body").innerHTML = body;
    $("#form-error").hidden = true;
    $("#save-dialog").textContent = "Zapisz";
    $("#editor").showModal();
    $("#editor").classList.remove("show-inspection-details");
  }
  function closeDialog() { $("#editor").close(); modal = null; }
  function formError(message) { $("#form-error").textContent = message; $("#form-error").hidden = false; }

  function catalogEditor(id) {
    const type = page;
    const item = id ? state[type].find(entry => entry.id === id) : null;
    const isPeople = type === "employees";
    const isReference = type === "references";
    openDialog(`${item ? "Edytuj" : "Dodaj"} ${isPeople ? "pracownika" : type === "defects" ? "wadę" : "referencję"}`, `<div class="form-grid">
      <label class="field${isReference ? " full" : ""}">${isReference ? "Nr referencji" : isPeople ? "ID pieczątki" : "Kod"}<input name="code" value="${esc(item ? isPeople ? item.stamp : item.code : "")}" maxlength="60" required placeholder="${isPeople ? "np. 042" : type === "defects" ? "np. W-01" : "Wpisz numer referencji"}"><small>${isReference ? "Numer jest unikalny. Zera na początku są zachowywane." : isPeople ? "ID zachowuje zera na początku, np. 007." : "Unikalny kod używany w raportach."}</small></label>
      ${isReference ? "" : `<label class="field">${isPeople ? "Nazwa / imię (opcjonalnie)" : "Nazwa"}<input name="name" maxlength="120" value="${esc(item?.name || "")}"${isPeople ? "" : " required"} placeholder="${isPeople ? "np. Anna K." : "np. Zarysowanie powierzchni"}"></label>`}
      <label class="checkbox-field"><input name="active" type="checkbox"${!item || item.active ? " checked" : ""}>Pozycja aktywna, dostępna w nowych kontrolach</label>
    </div>`, { type: "catalog", catalog: type, id });
  }

  function recordEditor(id) {
    const record = id ? state.records.find(item => item.id === id) : null;
    const missing = [];
    if (!active(state.employees).length && !record) missing.push("pracownika");
    if (!active(state.references).length && !record) missing.push("referencję części");
    if (missing.length) {
      notify(`Najpierw dodaj ${missing.join(" i ")} w menu Zarządzanie.`, true);
      return;
    }
    const date = record?.date || workingToday();
    const people = state.employees.filter(item => item.active || record?.employeeIds.includes(item.id));
    const refs = state.references.filter(item => item.active || item.id === record?.referenceId);
    const person = record ? employee(record.employeeIds[0]) : people[0];
    const secondId = record?.employeeIds[1] || "";
    const defectMode = record?.defectMode || "individual";
    const scheduled = scheduledShift(person, date);
    const shift = record?.shift || (scheduled === "off" ? "" : scheduled);
    defectSearch = "";
    openDialog(record ? "Edytuj kontrolę" : "Nowa kontrola", `<div class="inspection-view-tabs"><button type="button" class="button secondary" data-action="show-defects">Ilości wad</button><button type="button" class="button secondary" data-action="show-details">Dane kontroli</button></div><div class="inspection-layout">
      <section class="defects-panel" aria-label="Ilości wad">
        <div class="inspection-section-heading"><div><h3>Wady</h3><p>Suma każdej wady obejmuje obie osoby. Łączna suma kontroli aktualizuje się na bieżąco.</p></div><span id="defect-entry-total" aria-live="polite">Łącznie: 0 wad</span></div>
        <label class="defect-search">Szukaj wady po nazwie lub kodzie<input id="defect-search" type="search" value="" placeholder="Wpisz nazwę lub kod wady" autocomplete="off"></label>
        <div id="defect-columns" class="defect-columns"></div>
        <div class="defect-catalog"><div id="defect-rows"></div><p id="defect-no-results" class="section-note" hidden>Nie znaleziono wad pasujących do wyszukiwania.</p></div>
        <div class="defect-pagination" id="defect-pagination"><button type="button" class="button ghost" data-action="prev-defect-page">←</button><span id="defect-page-label"></span><button type="button" class="button ghost" data-action="next-defect-page">→</button></div>
        <div class="defect-summary" id="defect-mode-note"></div>
      </section>
      <section class="inspection-details" aria-label="Dane kontroli">
        <div class="inspection-section-heading"><div><h3>Dane kontroli</h3><p>Obsada, zmiana i kontrolowana partia</p></div></div>
        <div class="form-grid">
      <label class="field">Dzień kontroli<input type="date" name="date" value="${date}" required><small>Pon.–pt. · Nocna: data rozpoczęcia zmiany.</small></label>
      <label class="field">Zmiana<select name="shift" required>${shiftOptions(shift, false, "Wybierz zmianę")}</select></label>
      <label class="field">Pracownik 1 / ID pieczątki<select name="employeeId" required>${options(people, "id", employeeLabel, person.id)}</select></label>
      <label class="field">Pracownik 2 / ID pieczątki<select name="secondEmployeeId">${options(people, "id", employeeLabel, secondId, "Brak - kontrola jednej osoby")}</select></label>
      <div class="field full"><small id="schedule-hint"></small></div>
      <label class="field">Brygada linii<select name="brigade"><option value="">Wybierz brygadę</option>${["A", "B", "C", "D"].map(value => `<option value="${value}"${record?.brigade === value ? " selected" : ""}>Brygada ${value}</option>`).join("")}</select><small>Niezależna od zmiany pracownika.</small></label>
      <label class="field">Nr referencji<select name="referenceId">${options(refs, "id", item => item.code, record?.referenceId || refs[0].id)}</select></label>
      <label class="field full">Sprawdzone sztuki - łącznie<input type="number" name="inspected" min="1" max="10000000" step="1" value="${record?.inspected || ""}" placeholder="np. 500" required><small>Jedna wspólna ilość dla całej obsady.</small></label>
      <label class="field full">Rozliczanie wad w całej kontroli<select name="defectMode"><option value="shared"${defectMode === "shared" ? " selected" : ""}>Wady wspólne - bez przypisania do osoby</option><option value="individual"${defectMode === "individual" ? " selected" : ""}>Wady osobno - ilości dla każdego pracownika</option></select></label>
      <label class="field full">Notatka (opcjonalnie)<input name="notes" maxlength="500" value="${esc(record?.notes || "")}" placeholder="np. Przebudowa linii o 11:30"></label>
    </div></section></div>`, {
      type: "record", id, originalDefects: record?.defects.map(item => item.defectId) || [],
      participants: [person.id, secondId].filter(Boolean), defectMode
    });
    const entries = [];
    if (record) {
      for (const defectId of new Set(record.defects.map(item => item.defectId))) {
        const items = record.defects.filter(item => item.defectId === defectId);
        entries.push({ defectId, quantities: defectMode === "shared"
          ? [String(items[0].quantity)]
          : record.employeeIds.map(id => String(items.find(item => item.employeeId === id)?.quantity || "")) });
      }
    }
    renderDefectRows(entries);
    updateScheduleHint(false);
    requestAnimationFrame(layoutDefectPages);
  }

  function renderDefectRows(entries = []) {
    const available = state.defects.filter(entry => entry.active || modal.originalDefects.includes(entry.id));
    const labels = modal.defectMode === "shared" ? ["Wspólnie"] : modal.participants.map(id => employeeLabel(employee(id)));
    const quantitiesById = new Map(entries.map(entry => [entry.defectId, entry.quantities]));
    $("#defect-rows").innerHTML = "";
    for (const entry of available) {
      const quantities = quantitiesById.get(entry.id) || [];
      const row = document.createElement("div");
      row.className = `defect-row catalog-defect${labels.length === 2 ? " two-people" : ""}`;
      row.dataset.defectId = entry.id;
      row.dataset.defectName = entry.name;
      row.dataset.defectCode = entry.code;
      row.innerHTML = `<div class="defect-description"><span>${esc(entry.name)}</span><small>${esc(entry.code)}${entry.active ? "" : " · archiwalna"}</small></div>${labels.map((label, index) => `<input type="number" inputmode="numeric" aria-label="${esc(entry.name)} - ${esc(label)}" min="0" max="10000000" step="1" placeholder="0" value="${esc(quantities[index] || "")}">`).join("")}<span class="defect-row-total" data-defect-total aria-label="Suma wady ${esc(entry.name)}" title="Suma ilości tej wady ze wszystkich osób">0</span>`;
      $("#defect-rows").append(row);
    }
    if (!available.length) $("#defect-rows").innerHTML = '<p class="section-note">Katalog wad jest pusty. Dodaj pozycje w Katalogu wad. Kontrolę bez wad możesz zapisać już teraz.</p>';
    renderDefectColumns();
    updateDefectEntryTotal();
    defectPage = 0;
    requestAnimationFrame(layoutDefectPages);
  }

  function renderDefectColumns() {
    const labels = modal.defectMode === "shared" ? ["Wspólnie"] : modal.participants.map(id => employeeLabel(employee(id)));
    $("#defect-columns").className = "defect-column-groups";
    const heading = `<div class="defect-columns${labels.length === 2 ? " two-people" : ""}"><span>Wada / kod</span>${labels.map(label => `<span title="${esc(label)}">${esc(label)}</span>`).join("")}<span class="defect-total-heading" title="Suma wady dla wszystkich osób">Suma</span></div>`;
    $("#defect-columns").innerHTML = heading + heading;
    $("#defect-mode-note").textContent = modal.defectMode === "shared"
      ? "Ilości wspólne dla całej obsady - bez przypisania do osób."
      : "Ilości osobno przy każdej pieczątce. Puste pole lub 0 = brak wady.";
  }

  function updateDefectEntryTotal() {
    const rows = $$(".defect-row", $("#editor-form"));
    const total = rows.reduce((sum, row) => {
      const rowTotal = $$("input", row).reduce((rowSum, input) =>
        rowSum + (Number.isSafeInteger(Number(input.value)) && Number(input.value) > 0 ? Number(input.value) : 0), 0);
      const totalElement = row.querySelector("[data-defect-total]");
      if (totalElement) totalElement.textContent = num(rowTotal);
      return sum + rowTotal;
    }, 0);
    $("#defect-entry-total").textContent = `Łącznie: ${num(total)} wad`;
  }

  function layoutDefectPages() {
    if (modal?.type !== "record") return;
    const catalog = $(".defect-catalog");
    if (!catalog || !catalog.clientHeight) return;
    const rows = $$(".catalog-defect", $("#editor-form"));
    const matchingRows = rows.filter(row => defectMatchesSearch({ name: row.dataset.defectName, code: row.dataset.defectCode }, defectSearch));
    const columns = window.innerWidth >= 1100 ? 2 : 1;
    const rowCount = Math.max(1, Math.floor(catalog.clientHeight / 42));
    const capacity = rowCount * columns;
    const pages = Math.max(1, Math.ceil(matchingRows.length / capacity));
    defectPage = Math.min(Math.max(0, defectPage), pages - 1);
    $("#defect-rows").style.setProperty("--defect-rows-count", String(Math.min(rowCount, Math.max(1, Math.ceil(matchingRows.length / columns)))));
    const matchingIndexes = new Map(matchingRows.map((row, index) => [row, index]));
    rows.forEach(row => {
      const index = matchingIndexes.get(row);
      row.hidden = index === undefined || index < defectPage * capacity || index >= (defectPage + 1) * capacity;
    });
    $("#defect-no-results").hidden = matchingRows.length !== 0;
    $("#defect-pagination").hidden = matchingRows.length === 0;
    $("#defect-page-label").textContent = pages === 1 ? `${matchingRows.length} pozycji · wszystkie widoczne` : `Pozycje ${defectPage * capacity + 1}–${Math.min(matchingRows.length, (defectPage + 1) * capacity)} z ${matchingRows.length}`;
    $('[data-action="prev-defect-page"]').disabled = defectPage === 0;
    $('[data-action="next-defect-page"]').disabled = defectPage >= pages - 1;
  }

  function updateRecordSetup(target) {
    const form = $("#editor-form");
    const previous = target.name === "defectMode" ? modal.defectMode
      : modal.participants[target.name === "employeeId" ? 0 : 1] || "";
    const value = target.value;
    const participantIds = [form.elements.employeeId.value, form.elements.secondEmployeeId.value].filter(Boolean);
    if (new Set(participantIds).size !== participantIds.length) {
      target.value = previous;
      formError("Wybierz dwie różne osoby. Ta sama pieczątka nie może wystąpić dwa razy.");
      return;
    }
    const rows = $$(".defect-row", form).map(row => ({ defectId: row.dataset.defectId, quantities: $$("input", row).map(input => input.value) }));
    const switchingMode = target.name === "defectMode";
    const slot = target.name === "secondEmployeeId" ? 1 : 0;
    const clearAll = switchingMode || modal.defectMode === "shared";
    const hasAffectedQuantities = rows.some(row => row.quantities.some((quantity, index) => (clearAll || index === slot) && Number(quantity) !== 0));
    target.value = previous;
    const apply = () => {
      target.value = value;
      modal.participants = participantIds;
      modal.defectMode = form.elements.defectMode.value;
      for (const row of rows) row.quantities = row.quantities.map((quantity, index) => clearAll || index === slot ? "" : quantity);
      renderDefectRows(rows);
      $("#form-error").hidden = true;
      renderDefectColumns();
      updateScheduleHint(!switchingMode);
    };
    if (hasAffectedQuantities) confirmAction("Zmienić sposób rozliczania lub obsadę?", clearAll
      ? "Aby nie przypisać wad niewłaściwej osobie, ilości wad zostaną wyczyszczone. Lista wybranych kodów i wspólna liczba sprawdzonych sztuk pozostaną. Wpisz ilości ponownie po zmianie."
      : "Ilości wad zmienianego lub usuwanego pracownika zostaną wyczyszczone. Ilości drugiej osoby i wspólna liczba sprawdzonych sztuk pozostaną. Wpisz ilości nowej osoby ponownie.", apply);
    else apply();
  }

  function updateScheduleHint(changeShift) {
    if (modal?.type !== "record") return;
    const form = $("#editor-form");
    const people = [form.elements.employeeId.value, form.elements.secondEmployeeId.value].filter(Boolean).map(employee);
    const date = form.elements.date.value;
    if (!validDate(date) || people.some(person => !person)) return;
    const shifts = people.map(person => scheduledShift(person, date));
    $("#schedule-hint").textContent = !workingDay(date) ? "Kontrole są dostępne tylko od poniedziałku do piątku."
      : people.map((person, index) => `${employeeLabel(person)}: ${SHIFTS[shifts[index]] || "nieprzypisany"}`).join(" · ") + ". W razie zastępstwa wybierz zmianę ręcznie.";
    if (changeShift) form.elements.shift.value = shifts.length && shifts.every(shift => shift === shifts[0]) && ["1", "2", "3"].includes(shifts[0]) ? shifts[0] : "";
  }

  function saveEditor(event) {
    event.preventDefault();
    if (!modal) return;
    const form = event.currentTarget;
    const next = clone(state);
    if (modal.type === "catalog") {
      const isReference = modal.catalog === "references";
      const code = form.elements.code.value.trim(), name = isReference ? "" : form.elements.name.value.trim();
      const codeKey = modal.catalog === "employees" ? "stamp" : "code";
      if (!code || (modal.catalog === "defects" && !name)) { formError(isReference ? "Wpisz numer referencji." : "Wpisz kod i nazwę pozycji."); return; }
      if (next[modal.catalog].some(item => item.id !== modal.id && item[codeKey].toLocaleLowerCase("pl") === code.toLocaleLowerCase("pl"))) { formError(isReference ? "Ten numer referencji już istnieje, również w archiwum." : "Ten kod / ID pieczątki już istnieje, również w archiwum."); return; }
      const item = { id: modal.id || uid(), [codeKey]: code, ...(!isReference ? { name } : {}), active: form.elements.active.checked };
      const index = next[modal.catalog].findIndex(entry => entry.id === item.id);
      if (index === -1) next[modal.catalog].push(item); else next[modal.catalog][index] = item;
    } else {
      const values = new FormData(form);
      const date = values.get("date");
      if (!validDate(date) || !workingDay(date)) { formError("Wybierz dzień od poniedziałku do piątku. Dla nocki wpisz dzień jej rozpoczęcia."); return; }
      if (!["1", "2", "3"].includes(values.get("shift"))) { formError("Wybierz zmianę kontroli."); return; }
      if (!values.get("brigade")) { formError("Wybierz brygadę linii A, B, C lub D."); return; }
      const inspected = Number(values.get("inspected"));
      if (!Number.isSafeInteger(inspected) || inspected < 1 || inspected > 10000000) { formError("Liczba sprawdzonych sztuk musi być całkowita i wynosić od 1 do 10 000 000."); return; }
      const employeeIds = [values.get("employeeId"), values.get("secondEmployeeId")].filter(Boolean);
      const defectMode = values.get("defectMode");
      if (employeeIds.length < 1 || employeeIds.length > 2 || new Set(employeeIds).size !== employeeIds.length || employeeIds.some(id => !employee(id))) { formError("Wybierz jednego lub dwóch różnych pracowników."); return; }
      if (!["shared", "individual"].includes(defectMode)) { formError("Wybierz sposób rozliczania wad."); return; }
      if (!reference(values.get("referenceId"))) { formError("Wybierz istniejący numer referencji."); return; }
      const defects = [], used = new Set();
      for (const row of $$(".defect-row", form)) {
        const id = row.dataset.defectId;
        const quantities = $$("input", row).map(input => Number(input.value));
        if (quantities.some(quantity => !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000000)) { formError("Ilości wad muszą być całkowite, od 0 do 10 000 000. Puste pole oznacza 0."); return; }
        if (quantities.length !== (defectMode === "shared" ? 1 : employeeIds.length)) { formError("Kolumny wad nie odpowiadają obsadzie. Zamknij i otwórz formularz ponownie."); return; }
        if (!id && quantities.every(quantity => quantity === 0)) continue;
        if (!defect(id)) { formError("Wybierz kod wady dla wpisanych ilości."); return; }
        if (used.has(id)) { formError("Ta sama wada występuje dwa razy. Zsumuj ilości w jednym wierszu."); return; }
        used.add(id);
        quantities.forEach((quantity, index) => {
          if (quantity > 0) defects.push({ defectId: id, quantity, employeeId: defectMode === "shared" ? null : employeeIds[index] });
        });
      }
      const record = {
        id: modal.id || uid(), date, shift: values.get("shift"), brigade: values.get("brigade"),
        employeeIds, defectMode, referenceId: values.get("referenceId"), inspected, defects,
        notes: values.get("notes").trim(), updatedAt: new Date().toISOString()
      };
      const index = next.records.findIndex(item => item.id === record.id);
      if (index === -1) next.records.push(record); else next.records[index] = record;
    }
    if (persist(next, "Zapisano zmiany.")) { closeDialog(); recordPage = 1; render(); }
    else formError("Nie zapisano zmian. Sprawdź komunikat o pamięci przeglądarki.");
  }

  function confirmAction(title, message, callback) {
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    confirmationAction = callback;
    $("#confirmation").showModal();
  }

  function download(content, filename, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function csvCell(value) {
    let text = String(value ?? "");
    // Spreadsheet applications can execute formulas even inside quoted CSV cells.
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }
  function exportCSV(all = false) {
    const records = all ? [...state.records].sort((a, b) => a.date.localeCompare(b.date)) : filteredRecords();
    if (!records.length) { notify("Brak kontroli do eksportu w wybranym zakresie.", true); return; }
    const rows = [["ID kontroli", "Data", "Zmiana", "ID pieczątki 1", "Pracownik 1", "ID pieczątki 2", "Pracownik 2", "Brygada linii", "Nr referencji", "Sprawdzone sztuki łącznie (raz na kontrolę)", "Rozliczanie wad", "Kod wady", "Nazwa wady", "Liczba wad", "Przypisanie wad - ID pieczątki / wspólnie", "Notatka"]];
    for (const record of records) {
      const items = record.defects.filter(item => all || !filters.defect || item.defectId === filters.defect);
      const details = items.length ? items : [{ defectId: "", quantity: 0 }];
      details.forEach((item, index) => {
        const first = employee(record.employeeIds[0]), second = employee(record.employeeIds[1]), ref = reference(record.referenceId), type = defect(item.defectId);
        rows.push([record.id, record.date, SHIFTS[record.shift], first.stamp, first.name, second?.stamp || "", second?.name || "", record.brigade, ref.code, index === 0 ? record.inspected : "", modeLabel(record), type?.code || "", type?.name || "", item.quantity, record.defectMode === "shared" ? "Wspólnie" : item.employeeId ? employee(item.employeeId).stamp : "", record.notes]);
      });
    }
    download("\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n"), `kontrole-${today()}.csv`, "text/csv;charset=utf-8");
    notify(`Wyeksportowano ${records.length} kontroli do CSV.`);
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { notify("Kopia przekracza limit importu 30 MB.", true); return; }
    let imported, legacy = false, oldRecords = false;
    try {
      const data = JSON.parse(await file.text());
      imported = validateState(data);
      legacy = data.version === 1;
      oldRecords = data.version < 3;
    } catch (error) {
      console.error("Rejestr kontroli: nieprawidłowa kopia.", error);
      notify(`Nie udało się wczytać kopii: ${error.message}`, true);
      return;
    }
    confirmAction("Przywrócić kopię zapasową?", `Plik zawiera ${imported.records.length} kontroli, ${imported.employees.length} pracowników i ${imported.defects.length} wad. Zastąpi wszystkie bieżące dane, katalogi i grafik.${oldRecords ? " Starsze kontrole zostaną zachowane jako wpisy jednej osoby z wadami indywidualnymi. Nie scalamy ich ani nie dzielimy ilości." : ""}${legacy ? " Zachowano ręczne przypisania dni, ale nie automatyczną rotację. Pozostały grafik trzeba uzupełnić ręcznie." : ""} Najpierw pobierz kopię bieżących danych, jeśli są potrzebne.`, () => {
      const wasBroken = storageBroken;
      storageBroken = false;
      if (persist(imported, "Przywrócono kopię zapasową.")) {
        $("#storage-error").hidden = true;
        resetFilters();
        render();
      } else storageBroken = wasBroken;
    });
  }

  function resetFilters() {
    filters = { start: monday(today()), end: addDays(monday(today()), 4), shift: "", employee: "", brigade: "", reference: "", defect: "" };
    recordPage = 1;
  }

  function handleAction(action, target) {
    if (action === "add-allowance") {
      if (!state.defects.length) { notify("Najpierw dodaj co najmniej jedną wadę do katalogu.", true); return; }
      $("#allowance-editor-rows").insertAdjacentHTML("beforeend", allowanceRuleRow());
      const rows = $$(".allowance-editor-row", $("#allowance-editor-rows"));
      rows[rows.length - 1].scrollIntoView({ block: "nearest" });
    }
    else if (action === "remove-allowance") target.closest(".allowance-editor-row").remove();
    else if (action === "save-allowances") saveAllowances();
    else if (action === "prev-defect-page" || action === "next-defect-page") {
      defectPage += action === "next-defect-page" ? 1 : -1;
      layoutDefectPages();
    }
    else if (action === "show-defects" || action === "show-details") {
      $("#editor").classList.toggle("show-inspection-details", action === "show-details");
      requestAnimationFrame(layoutDefectPages);
    }
    else if (action === "new-record") recordEditor();
    else if (action === "edit-record") recordEditor(target.dataset.id);
    else if (action === "delete-record") confirmAction("Usunąć kontrolę?", "Ten rekord zostanie trwale usunięty. Pozostałe kontrole i grafik pozostaną bez zmian.", () => {
      const next = clone(state);
      next.records = next.records.filter(item => item.id !== target.dataset.id);
      if (persist(next, "Usunięto kontrolę.")) { recordPage = Math.max(1, Math.min(recordPage, Math.ceil(filteredRecords().length / 20))); render(); }
    });
    else if (action === "new-catalog") catalogEditor();
    else if (action === "edit-catalog") catalogEditor(target.dataset.id);
    else if (action === "archive-catalog") {
      const next = clone(state), item = next[page].find(entry => entry.id === target.dataset.id);
      item.active = !item.active;
      if (persist(next, item.active ? "Przywrócono pozycję." : "Zarchiwizowano pozycję. Historia została zachowana.")) render();
    }
    else if (action === "reset-filters") { resetFilters(); render(); }
    else if (action === "prev-records" || action === "next-records") { recordPage += action === "next-records" ? 1 : -1; render(); }
    else if (action === "prev-week" || action === "next-week") { week = addDays(week, action === "next-week" ? 7 : -7); render(); }
    else if (action === "current-week") { week = monday(today()); render(); }
    else if (action === "reset-week") confirmAction("Wyczyścić grafik tygodnia?", `Usuniesz wszystkie przypisania zmian w tygodniu ${fmtDate(week)} – ${fmtDate(addDays(week, 4))}, także dla archiwalnych pracowników. Pracownicy pozostaną nieprzypisani. Zapisane kontrole i inne tygodnie nie zmienią się.`, () => {
      const next = clone(state);
      for (let index = 0; index < 5; index++) delete next.overrides[addDays(week, index)];
      if (persist(next, "Wyczyszczono grafik wybranego tygodnia.")) render();
    });
    else if (action === "export" || action === "export-all") exportCSV(action === "export-all");
    else if (action === "export-analytics") exportAnalyticsCSV();
    else if (action === "backup") {
      if (storageBroken) { notify("Zapis jest uszkodzony. Pobierz zapis awaryjny zamiast pustej kopii.", true); return; }
      download(JSON.stringify(state, null, 2), `kopia-kontroli-${today()}.json`, "application/json");
      notify("Pobrano pełną kopię zapasową.");
    }
    else if (action === "raw-backup") {
      try { download(localStorage.getItem(STORAGE_KEY) || "", `kontrole-zapis-awaryjny-${today()}.txt`, "text/plain"); }
      catch (error) { console.error("Rejestr kontroli: błąd kopii awaryjnej.", error); notify("Nie można odczytać pamięci przeglądarki.", true); }
    }
    else if (action === "import") { $("#import-file").value = ""; $("#import-file").click(); }
    else if (action === "print") window.print();
    else if (action === "clear-data") {
      if (storageBroken) { notify("Zapis jest zablokowany. Najpierw pobierz zapis awaryjny i przywróć poprawną kopię.", true); return; }
      confirmAction("Usunąć wszystkie dane?", "Nie można tego cofnąć. Usunięte zostaną kontrole, pracownicy, wady, referencje, grafik i dopuszczenia. Przed kontynuacją pobierz kopię JSON.", () => {
        if (persist(blankState(), "Usunięto dane rejestru.")) { resetFilters(); render(); }
      });
    }
  }

  load();
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (target) handleAction(target.dataset.action, target);
    const link = event.target.closest("[data-page]");
    if (link) location.hash = link.dataset.page;
  });
  document.addEventListener("change", event => {
    const target = event.target;
    if (target.dataset.filter) {
      if ((target.dataset.filter === "start" || target.dataset.filter === "end") && !validDate(target.value)) { notify("Wprowadź poprawną datę.", true); renderFilters(); return; }
      filters[target.dataset.filter] = target.value;
      recordPage = 1;
      render();
    }
    if (target.id === "schedule-week") {
      if (!validDate(target.value)) { notify("Wybierz poprawną datę tygodnia.", true); render(); return; }
      week = monday(target.value);
      render();
    }
    if (target.dataset.schedule) {
      saveScheduleAssignment(target.dataset.schedule, target.dataset.date, target.value);
      render();
    }
    if (target.dataset.weekly) {
      saveScheduleAssignment(target.dataset.weekly, week, target.value, true);
      render();
    }
    if (modal?.type === "record" && target.closest("#editor-form")) {
      if (["employeeId", "secondEmployeeId", "defectMode"].includes(target.name)) updateRecordSetup(target);
      else if (target.name === "date") updateScheduleHint(true);
    }
  });
  document.addEventListener("input", event => {
    if (modal?.type === "record" && event.target.closest("#defect-rows")) updateDefectEntryTotal();
    if (modal?.type === "record" && event.target.id === "defect-search") {
      defectSearch = event.target.value;
      defectPage = 0;
      layoutDefectPages();
    }
    if (event.target.id === "catalog-search") {
      const position = event.target.selectionStart;
      search = event.target.value;
      render();
      $("#catalog-search").focus();
      $("#catalog-search").setSelectionRange(position, position);
    }
  });
  $("#editor-form").addEventListener("submit", saveEditor);
  $("#editor-form").addEventListener("invalid", event => {
    if (modal?.type !== "record") return;
    const inDetails = Boolean(event.target.closest(".inspection-details"));
    $("#editor").classList.toggle("show-inspection-details", inDetails);
    if (!inDetails && event.target.closest(".catalog-defect")) {
      const rows = $$(".catalog-defect", $("#editor-form"));
      const visible = rows.filter(row => !row.hidden).length;
      defectPage = Math.floor(rows.indexOf(event.target.closest(".catalog-defect")) / Math.max(1, visible));
      layoutDefectPages();
    }
  }, true);
  window.addEventListener("resize", () => requestAnimationFrame(layoutDefectPages));
  $("#close-dialog").addEventListener("click", closeDialog);
  $("#cancel-dialog").addEventListener("click", closeDialog);
  $("#editor").addEventListener("cancel", () => { modal = null; });
  $("#confirm-cancel").addEventListener("click", () => { $("#confirmation").close(); confirmationAction = null; });
  $("#confirmation").addEventListener("cancel", () => { confirmationAction = null; });
  $("#confirm-ok").addEventListener("click", () => {
    $("#confirmation").close();
    const action = confirmationAction;
    confirmationAction = null;
    if (action) action();
  });
  $("#import-file").addEventListener("change", event => importFile(event.target.files[0]));
  window.addEventListener("hashchange", () => {
    page = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
    search = "";
    recordPage = 1;
    if (page === "dashboard") filters.defect = "";
    render();
    window.scrollTo(0, 0);
  });
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      // Do not let an old tab silently overwrite changes made in another tab.
      storageBroken = true;
      $("#storage-error").textContent = "Dane zmieniły się w innej karcie. Zapis w tej karcie został zablokowany. Skopiuj ewentualne niezapisane wartości i odśwież stronę, aby pobrać aktualny stan.";
      $("#storage-error").hidden = false;
      notify("Wykryto zmianę danych w innej karcie. Odśwież stronę przed dalszą pracą.", true);
    }
  });
  render();
})();
