"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const plain = value => JSON.parse(JSON.stringify(value));
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attr = (html, key) => decode(html.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1] || "");

function harness(saved) {
  const nodes = new Map();
  const storage = new Map(saved ? [["lineflow.v1", JSON.stringify(saved)]] : []);
  const errors = [];
  let failWrite = false;

  class Element {
    constructor(key = "") {
      this.key = key;
      this.children = [];
      this.handlers = {};
      this.elements = {};
      this.dataset = {};
      this.clientHeight = 420;
      this.style = { setProperty() {} };
      this.classList = { toggle() {}, remove() {} };
      this.hidden = false;
      this.textContent = "";
    }
    set innerHTML(value) {
      this.html = value;
      this.children = [];
      this.inputs = [...value.matchAll(/<input\b([^>]*)>/g)].map(match => ({ name: attr(match[1], "name"), value: attr(match[1], "value"), checked: /\bchecked\b/.test(match[1]) }));
      this.outputs = value.includes("data-defect-total") ? [{ textContent: "0" }] : [];
      this.selects = [...value.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)].map(match => {
        const options = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];
        const selected = options.find(option => /\bselected\b/.test(option[1])) || options[0];
        return { name: attr(match[1], "name"), value: selected ? attr(selected[1], "value") || (selected[1].includes('value=""') ? "" : decode(selected[2])) : "" };
      });
      if (this.key === "#dialog-body") {
        get("#editor-form").elements = Object.fromEntries([...this.inputs, ...this.selects].filter(item => item.name).map(item => [item.name, item]));
      }
    }
    get innerHTML() { return this.html || ""; }
    querySelector(selector) {
      if (selector === "select") return this.selects[0];
      if (selector === "[data-defect-total]") return this.outputs[0];
      return this.querySelectorAll(selector)[0];
    }
    querySelectorAll(selector) {
      if (selector === ".defect-row") return get("#defect-rows").children;
      if (selector === ".catalog-defect") return get("#defect-rows").children;
      if (selector === "input") return this.inputs;
      return [];
    }
    append(child) { this.children.push(child); }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const get = key => {
    if (!nodes.has(key)) nodes.set(key, new Element(key));
    return nodes.get(key);
  };
  const context = {
    document: { querySelector: get, querySelectorAll: () => [], addEventListener() {}, createElement: () => new Element() },
    location: { hash: "" }, window: { innerWidth: 1200, addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { if (failWrite) throw new Error("Storage full"); storage.set(key, value); }
    },
    crypto: webcrypto, console: { error: (...args) => errors.push(args) },
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame() {}, Intl, Date, Set, Map,
    FormData: class {
      constructor(form) { this.elements = form.elements; }
      get(name) { return this.elements[name]?.value ?? null; }
    }
  };
  const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8").replace(/  render\(\);\s*\}\)\(\);\s*$/, `  render();
    globalThis.api = { blankState, validateState, filteredRecords, summary, defectTotals, employeeTotals, teamTotals,
      employeeAnalytics, employeeDefectTotals, periodComparison, trendPeriods, analyticsHtml,
      allowanceAnalysis, allowanceTotals, allowanceRuleRow, saveAllowances, exportAnalyticsCSV,
      recordEditor, renderDefectRows, layoutDefectPages, defectMatchesSearch, updateDefectEntryTotal, saveEditor, updateRecordSetup, updateScheduleHint, render, persist, handleAction,
      exportCSV, recordsTable, rankingHtml, saveScheduleAssignment, scheduledShift,
      getState: () => state, setState: value => { state = value; }, setPage: value => { page = value; },
      setDefectSearch: value => { defectSearch = value; defectPage = 0; layoutDefectPages(); },
      setFilters: value => { filters = { ...filters, ...value }; },
      captureCSV: () => { download = content => { globalThis.csv = content; }; } };
  })();`);
  vm.runInNewContext(source, context);
  assert.ok(context.api, "Test hooks attached");
  return {
    t: context.api, get, storage, context, errors,
    failWrites() { failWrite = true; },
    save() { context.api.saveEditor({ preventDefault() {}, currentTarget: get("#editor-form") }); },
    change(name, value, confirm = true) {
      const target = get("#editor-form").elements[name];
      target.value = value;
      context.api.updateRecordSetup(target);
      if (get("#confirmation").open) get(confirm ? "#confirm-ok" : "#confirm-cancel").handlers.click();
    },
    row(index = 0) { return get("#defect-rows").children[index]; }
  };
}

function fixture() {
  return {
    version: 3, providedDefectsAdded: true,
    employees: [
      { id: "a", stamp: "007", name: "A", active: true },
      { id: "b", stamp: "008", name: "B", active: true },
      { id: "c", stamp: "009", name: "C", active: true }
    ],
    defects: [{ id: "d", code: "D1", name: "Defect", active: true }],
    references: [{ id: "r", code: "00123", active: true }],
    overrides: {},
    records: [
      { id: "shared", date: "2026-10-12", shift: "1", brigade: "A", employeeIds: ["a", "b"], defectMode: "shared", referenceId: "r", inspected: 1000, defects: [{ defectId: "d", quantity: 10, employeeId: null }], notes: "", updatedAt: "2026-10-12T12:00:00Z" },
      { id: "individual", date: "2026-10-13", shift: "1", brigade: "A", employeeIds: ["b", "a"], defectMode: "individual", referenceId: "r", inspected: 500, defects: [{ defectId: "d", quantity: 3, employeeId: "a" }, { defectId: "d", quantity: 7, employeeId: "b" }], notes: "", updatedAt: "2026-10-13T12:00:00Z" }
    ]
  };
}

function withData() {
  const h = harness(fixture());
  h.t.setFilters({ start: "2026-10-12", end: "2026-10-16" });
  return h;
}

test("application sources contain no em dashes", () => {
  for (const file of ["app.js", "app.test.cjs", "index.html", "styles.css"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, file), "utf8"), /\u2014/, file);
  }
});

test("shared pieces and defects count once; individual defects belong only to their owner", () => {
  const { t } = withData();
  assert.deepEqual(plain(t.summary(t.filteredRecords())), { inspected: 1500, defects: 20, sharedDefects: 10, people: 2 });
  const totals = plain(t.employeeTotals(t.filteredRecords()));
  assert.deepEqual(totals.map(item => [item.id, item.quantity, item.individualControls, item.sharedControls]), [["b", 7, 1, 1], ["a", 3, 1, 1]]);
  assert.equal(totals.some(item => "rate" in item || "inspected" in item), false);
  assert.equal(t.defectTotals(t.filteredRecords())[0].quantity, 20);
  const teams = t.teamTotals(t.filteredRecords());
  assert.equal(teams.length, 1, "Order of participants must not create another team");
  assert.equal(teams[0].inspected, 1500);
  assert.equal(teams[0].quantity, 20);
  assert.equal(teams[0].shared, 10);
});

test("employee filter includes participation, but ranking does not credit the partner's defects", () => {
  const { t } = withData();
  t.setFilters({ employee: "a", defect: "d" });
  assert.equal(t.filteredRecords().length, 2);
  assert.equal(t.summary(t.filteredRecords()).defects, 20);
  assert.deepEqual(plain(t.employeeTotals(t.filteredRecords())).map(item => [item.id, item.quantity]), [["a", 3]]);
  t.setFilters({ employee: "c" });
  assert.equal(t.filteredRecords().length, 0);
});

test("shared-only employees are not ranked as zero detections", () => {
  const { t } = withData();
  assert.equal(t.employeeTotals([t.getState().records[0]])[0].individualControls, 0);
  assert.doesNotMatch(t.rankingHtml([t.getState().records[0]]), /rank-row/);
});

test("analytics reports per-defect employee shares without assigning shared defects", () => {
  const { t } = withData();
  const records = t.filteredRecords();
  const report = t.analyticsHtml(records);
  const attribution = t.employeeDefectTotals(records, "d");
  assert.equal(attribution.totals.get("a"), 3);
  assert.equal(attribution.totals.get("b"), 7);
  assert.equal(attribution.shared, 10);
  assert.match(report, /#007<span class="table-meta">% tej wady<\/span>/);
  assert.match(report, /15% tej wady/);
  assert.match(report, /35% tej wady/);
  assert.match(report, /50% tej wady/);
});

test("analytics includes employee participation metrics and same-length previous-period comparison", () => {
  const { t } = withData();
  const records = t.filteredRecords();
  const people = plain(t.employeeAnalytics(records));
  assert.deepEqual(people.map(item => [item.id, item.controls, item.individualInspected, item.quantity]), [
    ["b", 2, 500, 7], ["a", 2, 500, 3]
  ]);
  const comparison = plain(t.periodComparison(records));
  assert.equal(comparison.days, 5);
  assert.equal(comparison.current.defects, 20);
  assert.equal(comparison.previous.defects, 0);
  assert.equal(comparison.previous.inspected, 0);
});

test("trend statistics identify increasing and declining defect counts over time", () => {
  const { t } = withData();
  const records = t.getState().records;
  const periods = plain(t.trendPeriods(records));
  assert.equal(periods.length, 2);
  assert.equal(periods[0].defects, 10);
  assert.equal(periods[0].change, null);
  assert.equal(periods[1].defects, 10);
  assert.equal(periods[1].change, 0);

  records[1].defects[0].quantity = 2;
  const declining = plain(t.trendPeriods(records));
  assert.equal(declining[1].change, -1);
  assert.match(t.analyticsHtml(records), /Spadek/);
});

test("allowances preserve all original records and apply employee and shift limits without double-counting", () => {
  const data = fixture();
  const { t, context } = withData();
  const originalRecords = plain(data.records);
  const employeeRule = { id: "allow-b", shift: "1", defectId: "d", employeeId: "b", quantity: 5 };
  t.setState({ ...data, allowances: [employeeRule] });
  const totals = plain(t.allowanceTotals(t.filteredRecords()));
  assert.deepEqual(totals, { approved: 5, remaining: 15, overLimit: 2, uncovered: 13 });
  assert.deepEqual(plain(t.getState().records), originalRecords);

  t.setState({ ...data, allowances: [
    employeeRule,
    { id: "allow-shift", shift: "1", defectId: "d", employeeId: null, quantity: 2 }
  ] });
  assert.deepEqual(plain(t.allowanceTotals(t.filteredRecords())), { approved: 7, remaining: 13, overLimit: 13, uncovered: 0 });
  assert.match(t.analyticsHtml(t.filteredRecords()), /Dopuszczenia i limity wad/);
  assert.match(t.analyticsHtml(t.filteredRecords()), /Ponad limit/);
  t.captureCSV();
  t.exportAnalyticsCSV();
  assert.doesNotMatch(context.csv, /PPM/i);
  assert.match(context.csv, /Wady po dopuszczeniach/);
  assert.match(context.csv, /Pareto - pracownik/);
  assert.doesNotMatch(t.analyticsHtml(t.filteredRecords()), /PPM/);
  assert.match(t.analyticsHtml(t.filteredRecords()), /LIMIT PRACOWNIKA/);
  assert.match(t.analyticsHtml(t.filteredRecords()), /LIMIT ZMIANY/);
  assert.match(t.analyticsHtml(t.filteredRecords()), /Konfiguruj limity dopuszczeń/);
});

test("allowance migration defaults to none and validates unique, bounded rules", () => {
  const data = fixture();
  const { t } = withData();
  const migrated = plain(t.validateState(data));
  assert.deepEqual(migrated.allowances, []);
  assert.deepEqual(migrated.employees, data.employees);
  assert.deepEqual(migrated.defects, data.defects);
  assert.deepEqual(migrated.records, data.records);

  const valid = { ...data, allowances: [{ id: "rule", shift: "2", defectId: "d", employeeId: "a", quantity: 3 }] };
  assert.deepEqual(plain(t.validateState(valid)).allowances, valid.allowances);
  assert.throws(() => t.validateState({ ...valid, allowances: [...valid.allowances, { ...valid.allowances[0], id: "duplicate" }] }), /Powielone dopuszczenie/);
  assert.throws(() => t.validateState({ ...valid, allowances: [{ ...valid.allowances[0], quantity: 0 }] }), /Nieprawidłowe dopuszczenie/);
});

test("version 1 and 2 migration preserve one-person quantities, IDs, notes and explicit schedules", () => {
  for (const version of [1, 2]) {
    const data = fixture();
    data.version = version;
    if (version === 1) {
      data.settings = { anchor: "2026-10-12", rotationStep: 1 };
      data.employees.forEach(person => { person.baseShift = "1"; });
    }
    data.records = [{ ...data.records[0], employeeId: "a", defects: [{ defectId: "d", quantity: 10 }], notes: "Original" }];
    delete data.records[0].employeeIds;
    delete data.records[0].defectMode;
    data.overrides = { "2026-10-12": { a: "3" } };
    const { t, storage } = harness(data);
    const record = t.getState().records[0];
    assert.deepEqual(plain(record.employeeIds), ["a"]);
    assert.equal(record.defectMode, "individual");
    assert.equal(record.defects[0].employeeId, "a");
    assert.equal(record.defects[0].quantity, 10);
    assert.equal(record.inspected, 1000);
    assert.equal(record.notes, "Original");
    assert.equal(t.scheduledShift(t.getState().employees[0], "2026-10-12"), "3");
    assert.equal(JSON.parse(storage.get("lineflow.v1")).version, 3);
  }
});

test("backup validation rejects wrong attribution, duplicate participants and duplicate quantities", () => {
  const { t } = withData();
  const badCases = [
    d => { d.records[0].employeeIds = ["a", "a"]; },
    d => { d.records[0].employeeIds = []; },
    d => { d.records[0].employeeIds = ["a", "b", "c"]; },
    d => { d.records[0].defectMode = "invalid"; },
    d => { d.records[0].defects[0].employeeId = "a"; },
    d => { d.records[1].defects[0].employeeId = null; },
    d => { d.records[1].defects[0].employeeId = "c"; },
    d => { d.records[1].defects.push({ ...d.records[1].defects[0] }); },
    d => { d.records[0].defects[0].quantity = 0; },
    d => { d.records[0].date = "2026-10-17"; }
  ];
  for (const change of badCases) { const data = fixture(); change(data); assert.throws(() => t.validateState(data)); }
  assert.doesNotThrow(() => t.validateState(fixture()));
});

test("editing individual quantities round-trips in participant column order without doubling pieces", () => {
  const h = withData();
  h.t.recordEditor("individual");
  assert.deepEqual(h.row().inputs.map(input => input.value), ["7", "3"]);
  h.row().inputs[0].value = "8";
  h.save();
  const record = h.t.getState().records.find(item => item.id === "individual");
  assert.equal(record.inspected, 500);
  assert.equal(record.defects.find(item => item.employeeId === "b").quantity, 8);
  assert.equal(record.defects.find(item => item.employeeId === "a").quantity, 3);
  assert.equal(h.t.getState().records.length, 2);
  assert.doesNotThrow(() => h.t.validateState(JSON.parse(h.storage.get("lineflow.v1"))));
});

test("shared mode edits a single total and survives reload", () => {
  const h = withData();
  h.t.recordEditor("shared");
  assert.equal(h.row().inputs.length, 1);
  h.row().inputs[0].value = "12";
  h.save();
  const reloaded = harness(JSON.parse(h.storage.get("lineflow.v1")));
  const record = reloaded.t.getState().records.find(item => item.id === "shared");
  assert.equal(record.defects[0].quantity, 12);
  assert.equal(record.defects[0].employeeId, null);
  assert.equal(record.inspected, 1000);
});

test("mode changes require confirmation; cancel preserves entered quantities; confirm clears rather than guessing attribution", () => {
  const h = withData();
  h.t.recordEditor("shared");
  h.change("defectMode", "individual", false);
  assert.equal(h.get("#editor-form").elements.defectMode.value, "shared");
  assert.equal(h.row().inputs[0].value, "10");
  h.change("defectMode", "individual");
  assert.deepEqual(h.row().inputs.map(input => input.value), ["", ""]);
  h.row().inputs[0].value = "4";
  h.row().inputs[1].value = "6";
  h.save();
  const record = h.t.getState().records.find(item => item.id === "shared");
  assert.equal(record.defectMode, "individual");
  assert.deepEqual(plain(record.defects).map(item => [item.employeeId, item.quantity]), [["a", 4], ["b", 6]]);
});

test("changing a participant clears only their counts, never credits an incoming person, rejects same stamp twice", () => {
  const h = withData();
  h.t.recordEditor("individual");
  h.change("secondEmployeeId", "b");
  assert.equal(h.get("#editor-form").elements.secondEmployeeId.value, "a");
  assert.equal(h.get("#form-error").hidden, false);
  h.change("secondEmployeeId", "c", false);
  assert.deepEqual(h.row().inputs.map(input => input.value), ["7", "3"]);
  h.change("secondEmployeeId", "c");
  assert.deepEqual(h.row().inputs.map(input => input.value), ["7", ""]);
  h.get("#editor-form").elements.shift.value = "1";
  h.save();
  const record = h.t.getState().records.find(item => item.id === "individual");
  assert.deepEqual(plain(record.employeeIds), ["b", "c"]);
  assert.deepEqual(plain(record.defects).map(item => [item.employeeId, item.quantity]), [["b", 7]]);
});

test("removing a participant and no-defect records are supported", () => {
  const h = withData();
  h.t.recordEditor("individual");
  h.change("secondEmployeeId", "");
  assert.equal(h.row().inputs.length, 1);
  h.row().inputs[0].value = "0";
  h.get("#editor-form").elements.shift.value = "1";
  h.save();
  const record = h.t.getState().records.find(item => item.id === "individual");
  assert.deepEqual(plain(record.employeeIds), ["b"]);
  assert.equal(record.defects.length, 0);
  assert.equal(record.inspected, 500);
});

test("new pair creates one record with shared inspected quantity and individually assigned defects", () => {
  const h = withData();
  h.t.recordEditor();
  h.change("secondEmployeeId", "b");
  const form = h.get("#editor-form");
  Object.assign(form.elements.date, { value: "2026-10-14" });
  Object.assign(form.elements.shift, { value: "1" });
  Object.assign(form.elements.brigade, { value: "D" });
  Object.assign(form.elements.inspected, { value: "900" });
  h.row().inputs[0].value = "4";
  h.row().inputs[1].value = "5";
  h.save();
  assert.equal(h.t.getState().records.length, 3);
  const record = h.t.getState().records[2];
  assert.equal(record.inspected, 900);
  assert.equal(record.defects.reduce((sum, item) => sum + item.quantity, 0), 9);
  assert.equal(record.employeeIds.length, 2);
});

test("invalid quantities and duplicate defect rows are rejected without saving", () => {
  for (const value of ["-1", "1.5", "10000001", "not-a-number"]) {
    const h = withData();
    h.t.recordEditor("individual");
    h.row().inputs[0].value = value;
    h.save();
    assert.equal(h.get("#form-error").hidden, false);
    assert.equal(h.t.getState().records[1].defects[1].quantity, 7);
  }
  const h = withData();
  h.t.recordEditor("individual");
  h.get("#defect-rows").append(h.row());
  h.save();
  assert.equal(h.get("#form-error").hidden, false);
  assert.equal(h.t.getState().records[1].defects.length, 2);
});

test("different schedules do not silently assign the pair to either employee's shift", () => {
  const h = withData();
  h.t.saveScheduleAssignment("a", "2026-10-12", "1");
  h.t.saveScheduleAssignment("b", "2026-10-12", "2");
  h.t.recordEditor("shared");
  h.t.updateScheduleHint(true);
  assert.equal(h.get("#editor-form").elements.shift.value, "");
  h.t.saveScheduleAssignment("b", "2026-10-12", "1");
  h.t.updateScheduleHint(true);
  assert.equal(h.get("#editor-form").elements.shift.value, "1");
});

test("changing to shared mode does not silently add or divide the previous personal counts", () => {
  const h = withData();
  h.t.recordEditor("individual");
  h.change("defectMode", "shared", false);
  assert.deepEqual(h.row().inputs.map(input => input.value), ["7", "3"]);
  h.change("defectMode", "shared");
  assert.deepEqual(h.row().inputs.map(input => input.value), [""]);
  h.row().inputs[0].value = "11";
  h.save();
  const record = h.t.getState().records[1];
  assert.equal(record.defectMode, "shared");
  assert.deepEqual(plain(record.defects), [{ defectId: "d", quantity: 11, employeeId: null }]);
});

test("zero defects have one CSV row; defect filtering keeps totals consistent with Pareto", () => {
  const h = withData();
  const data = fixture();
  data.records[1].defects = [];
  h.t.setState(data);
  h.t.captureCSV();
  h.t.exportCSV(true);
  const rows = h.context.csv.trim().split("\r\n");
  assert.equal(rows.length, 3);
  h.t.setFilters({ defect: "d" });
  assert.equal(h.t.filteredRecords().length, 1);
  assert.equal(h.t.summary(h.t.filteredRecords()).inspected, 1000);
  assert.equal(h.t.defectTotals(h.t.filteredRecords())[0].quantity, 10);
});

test("CSV exports both participants, individual attribution, and inspected quantity just once per record", () => {
  const h = withData();
  h.t.captureCSV();
  h.t.exportCSV(true);
  const rows = h.context.csv.trim().split("\r\n").map(row => row.replace(/^\uFEFF/, "").slice(1, -1).split('";"'));
  assert.ok(rows.every(row => row.length === 16));
  const data = rows.slice(1);
  assert.equal(data.reduce((sum, row) => sum + Number(row[9]), 0), 1500);
  assert.equal(data.reduce((sum, row) => sum + Number(row[13]), 0), 20);
  assert.equal(data.filter(row => row[14] === "007")[0][13], "3");
  assert.equal(data.filter(row => row[14] === "008")[0][13], "7");
  assert.equal(data.find(row => row[0] === "shared")[14], "Wsp\u00f3lnie");
  assert.equal(data.find(row => row[0] === "shared")[3], "007");
  assert.equal(data.find(row => row[0] === "shared")[5], "008");
});

test("all views render both modes without stale single-employee or rate accesses", () => {
  const h = withData();
  for (const page of ["dashboard", "records", "analytics", "schedule", "employees", "defects", "references", "settings"]) {
    h.t.setPage(page);
    assert.doesNotThrow(() => h.t.render(), page);
    assert.doesNotMatch(h.get("#content").innerHTML, /undefined|NaN|Infinity/);
  }
});

test("a failed write preserves the old state and reports the failure", () => {
  const h = withData();
  h.t.recordEditor("shared");
  h.row().inputs[0].value = "99";
  h.failWrites();
  h.save();
  assert.equal(h.t.getState().records[0].defects[0].quantity, 10);
  assert.equal(h.get("#editor").open, true);
  assert.equal(h.get("#form-error").hidden, false);
  assert.equal(h.errors.length, 1);
});

test("a fresh installation starts empty and remains empty after reload", () => {
  const h = harness();
  assert.deepEqual(plain(h.t.getState()), plain(h.t.blankState()));
  assert.equal(h.storage.size, 0, "Opening the app must not seed or overwrite storage");
  assert.match(h.get("#content").innerHTML, /Przygotuj pierwszą kontrolę/);
  for (const key of ["employees", "references", "defects", "settings"]) {
    assert.match(h.get("#content").innerHTML, new RegExp(`href="#${key}"`));
  }
  assert.deepEqual(plain(harness(h.t.getState()).t.getState()), plain(h.t.blankState()));
});

test("loading an older catalogue never adds defects or overwrites saved data", () => {
  const data = fixture();
  delete data.providedDefectsAdded;
  const h = harness(data);
  assert.deepEqual(plain(h.t.getState().defects), data.defects);
  assert.deepEqual(JSON.parse(h.storage.get("lineflow.v1")), data);
});

test("setup shows readiness only with active entries in all three catalogues", () => {
  const data = fixture();
  data.records = [];
  const h = harness(data);
  assert.match(h.get("#content").innerHTML, /Rejestr gotowy do pracy/);
  h.t.getState().defects[0].active = false;
  h.t.render();
  assert.match(h.get("#content").innerHTML, /Przygotuj pierwszą kontrolę/);
  assert.doesNotMatch(h.get("#content").innerHTML, /Rejestr gotowy do pracy/);
});

test("reset requires confirmation and clears all data permanently without reseeding", () => {
  const data = fixture();
  data.overrides = { "2026-10-12": { a: "1" } };
  data.allowances = [{ id: "limit", shift: "1", defectId: "d", employeeId: null, quantity: 5 }];
  const h = harness(data);
  h.t.handleAction("clear-data");
  assert.equal(h.get("#confirmation").open, true);
  h.get("#confirm-cancel").handlers.click();
  assert.deepEqual(plain(h.t.getState()), data);
  h.t.handleAction("clear-data");
  h.get("#confirm-ok").handlers.click();
  assert.deepEqual(plain(h.t.getState()), plain(h.t.blankState()));
  const saved = JSON.parse(h.storage.get("lineflow.v1"));
  assert.deepEqual(saved, plain(h.t.blankState()));
  assert.deepEqual(plain(harness(saved).t.getState()), saved);
});

test("failed reset preserves all existing data and reports an error", () => {
  const h = withData();
  const before = plain(h.t.getState());
  const savedBefore = h.storage.get("lineflow.v1");
  h.failWrites();
  h.t.handleAction("clear-data");
  h.get("#confirm-ok").handlers.click();
  assert.deepEqual(plain(h.t.getState()), before);
  assert.equal(h.storage.get("lineflow.v1"), savedBefore);
  assert.equal(h.errors.length, 1);
  assert.match(h.get("#toast").textContent, /Nie udało się zapisać/);
});

test("all configured defects appear immediately; only entered nonzero quantities are saved", () => {
  const h = harness();
  const data = plain(h.t.getState());
  data.employees = fixture().employees;
  data.references = fixture().references;
  data.defects = Array.from({ length: 26 }, (_, index) => ({
    id: `defect-${index}`, code: `D${index + 1}`, name: `Wada testowa ${index + 1}`, active: true
  }));
  h.t.setState(data);
  h.t.recordEditor();
  assert.equal(h.get("#defect-rows").children.length, 26);
  assert.doesNotMatch(h.get("#dialog-body").innerHTML, /add-defect-row|remove-defect-row/);
  assert.match(h.get("#dialog-body").innerHTML, /inspection-layout/);
  for (const row of h.get("#defect-rows").children) {
    assert.equal(row.selects.length, 0, "Defects are listed, not selected");
    assert.equal(row.inputs[0].value, "");
    assert.match(row.innerHTML, /defect-description/);
  }
  h.change("secondEmployeeId", "b");
  const form = h.get("#editor-form");
  form.elements.date.value = "2026-10-14";
  form.elements.shift.value = "2";
  form.elements.brigade.value = "A";
  form.elements.inspected.value = "600";
  h.row(0).inputs[0].value = "2";
  h.row(25).inputs[1].value = "5";
  h.t.updateDefectEntryTotal();
  assert.equal(h.get("#defect-entry-total").textContent, "Łącznie: 7 wad");
  assert.equal(h.row(0).querySelector("[data-defect-total]").textContent, "2");
  assert.equal(h.row(25).querySelector("[data-defect-total]").textContent, "5");
  h.save();
  const record = h.t.getState().records[0];
  assert.equal(record.inspected, 600);
  assert.equal(record.defects.length, 2);
  assert.equal(record.defects[0].employeeId, "a");
  assert.equal(record.defects[1].employeeId, "b");
  assert.equal(h.t.getState().defects.length, 26);
});

test("each defect row shows a live sum across both employees without saving", () => {
  const h = withData();
  const originalRecords = plain(h.t.getState().records);
  h.t.recordEditor("individual");
  const row = h.row(0);
  row.inputs[0].value = "4";
  row.inputs[1].value = "6";

  h.t.updateDefectEntryTotal();

  assert.equal(row.querySelector("[data-defect-total]").textContent, "10");
  assert.equal(h.get("#defect-entry-total").textContent, "Łącznie: 10 wad");
  assert.deepEqual(plain(h.t.getState().records), originalRecords);
});

test("inspection defect search matches name and code without case or Polish diacritics and preserves quantities", () => {
  const data = fixture();
  data.defects = [
    { id: "d1", code: "A-100", name: "Rysa średnicy", active: true },
    { id: "d2", code: "C300 0235", name: "Pęknięcie profilu", active: true },
    { id: "d3", code: "KOD-XYZ", name: "Inna wada", active: true }
  ];
  data.records = [];
  const h = harness(data);
  h.t.recordEditor();
  assert.match(h.get("#dialog-body").innerHTML, /Szukaj wady po nazwie lub kodzie/);
  h.row(0).inputs[0].value = "4";

  h.t.setDefectSearch("c300 0235");
  assert.deepEqual(h.get("#defect-rows").children.map(row => row.hidden), [true, false, true]);
  h.t.setDefectSearch("pekniecie");
  assert.deepEqual(h.get("#defect-rows").children.map(row => row.hidden), [true, false, true]);
  h.t.setDefectSearch("rysA srednicy");
  assert.deepEqual(h.get("#defect-rows").children.map(row => row.hidden), [false, true, true]);
  assert.equal(h.row(0).inputs[0].value, "4");

  h.t.setDefectSearch("brak");
  assert.equal(h.get("#defect-no-results").hidden, false);
  assert.equal(h.get("#defect-pagination").hidden, true);
  h.t.setDefectSearch("");
  assert.ok(h.get("#defect-rows").children.every(row => !row.hidden));
  assert.equal(h.get("#defect-no-results").hidden, true);
});

test("archived defects appear only when already used in the edited record, preserving historical quantities", () => {
  const data = fixture();
  data.defects[0].active = false;
  data.defects.push({ id: "unused", code: "ARCH", name: "Unused archive", active: false });
  const h = harness(data);
  h.t.recordEditor("individual");
  assert.equal(h.get("#defect-rows").children.length, 1);
  assert.equal(h.row().dataset.defectId, "d");
  assert.deepEqual(h.row().inputs.map(input => input.value), ["7", "3"]);
  h.save();
  assert.equal(h.t.getState().records[1].defects.length, 2);
  h.t.recordEditor();
  assert.equal(h.get("#defect-rows").children.length, 0);
});
