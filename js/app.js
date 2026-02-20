const APP_VERSION = 2;
const STORAGE_KEY = "andre_coach_state_v1";

// Seed data based on your message + the latest InBody sheet photo you shared.
// Note: This is not medical advice; it’s a structured log + basic trend summaries.
const SEED_STATE = {
  version: APP_VERSION,
  profile: {
    name: "Andre",
    sex: "Man",
    birthdate: "1968-07-12",
    heightCm: 183,
    // Default target based on your InBody printout (recommended calories).
    calorieTargetKcal: 2220
  },
  ui: {
    selectedDate: isoDateToday(),
    calendarMonth: isoDateToday().slice(0, 7) // YYYY-MM
  },
  templates: {
    // weekly[0..6] (0=Monday) -> { training: TemplateTask[], voeding: TemplateTask[] }
    weekly: {}
  },
  plans: {
    // dateKey -> DayPlan
    byDate: {}
  },
  inbody: {
    scheduleStartDate: "2026-04-01",
    intervalDays: 42,
    measurements: [
      {
        date: "2026-02-18",
        time: "20:31",
        device: "InBody570",
        heightCm: 183,
        ageYears: 57,
        sex: "Man",

        inbodyScore: 80,

        weightKg: 85.2,
        bmi: 25.4,
        bodyFatPercent: 20.0,
        bodyFatMassKg: 17.1,
        skeletalMuscleMassKg: 38.3,

        totalBodyWaterL: 50.1,
        proteinKg: 13.4,
        mineralsKg: 4.6,

        bmrKcal: 1842,
        waistHipRatio: 0.93,
        visceralFatLevel: 8,
        obesityDegreePercent: 116,
        boneMineralContentKg: 3.89,
        bodyCellMassKg: 44.3,
        armCircumferenceCm: 34.1,
        armMuscleCircumferenceCm: 31.4,
        skeletalMuscleIndexKgM2: 8.6,
        recommendedCaloriesKcal: 2220,
        ecwRatio: 0.384,

        weightControl: {
          targetWeightKg: 80.2,
          weightControlKg: -5.0,
          fatControlKg: -5.0,
          muscleControlKg: 0.0
        },

        segmentalLeanKg: {
          rightArm: 4.10,
          leftArm: 4.07,
          trunk: 30.7,
          rightLeg: 10.36,
          leftLeg: 10.23
        },
        segmentalLeanPercent: {
          rightArm: 112.2,
          leftArm: 111.5,
          trunk: 105.3,
          rightLeg: 102.0,
          leftLeg: 100.7
        },
        segmentalFatKg: {
          rightArm: 0.8,
          leftArm: 0.8,
          trunk: 9.6,
          rightLeg: 2.3,
          leftLeg: 2.3
        },
        segmentalFatPercent: {
          rightArm: 125.2,
          leftArm: 126.0,
          trunk: 204.9,
          rightLeg: 120.6,
          leftLeg: 118.6
        },

        historyFromSheet: {
          // Values shown in the small trend table on the printout (dates not fully readable in the photo).
          // You can optionally add exact dates later.
          weightKg: [83.8, 84.1, 83.8, 85.1, 85.1, 85.2],
          skeletalMuscleMassKg: [35.8, 36.6, 37.4, 38.9, 38.4, 38.3],
          bodyFatPercent: [23.7, 22.2, 20.4, 18.8, 20.0, 20.0],
          ecwRatio: [0.383, 0.386, 0.385, 0.382, 0.380, 0.384]
        }
      }
    ]
  }
};

// ----------------------------
// Boot
// ----------------------------

const els = {
  content: document.getElementById("content"),
  topbarTitle: document.getElementById("topbarTitle"),
  topbarRight: document.getElementById("topbarRight"),
  toast: document.getElementById("toast"),
  tabs: Array.from(document.querySelectorAll(".tab"))
};

let state = loadState();

registerServiceWorker();
window.addEventListener("hashchange", render);
window.addEventListener("visibilitychange", () => {
  // If user changes system date/time or returns later, keep "Vandaag" sensible.
  if (document.visibilityState === "visible") {
    if (state.ui.selectedDate === isoDateToday()) return;
  }
});

// Default route.
if (!location.hash) location.hash = "#/vandaag";
render();

// ----------------------------
// Rendering
// ----------------------------

function render() {
  const route = parseRoute(location.hash);
  setActiveTab(route.name);

  const selectedDate = state.ui.selectedDate || isoDateToday();

  els.topbarRight.textContent = "";
  els.content.textContent = "";

  if (route.name === "vandaag") {
    els.topbarTitle.textContent = "Vandaag";
    els.topbarRight.appendChild(datePicker(selectedDate, (d) => {
      state.ui.selectedDate = d;
      state.ui.calendarMonth = d.slice(0, 7);
      saveState();
      render();
    }));
    els.content.appendChild(viewVandaag(selectedDate));
    return;
  }

  if (route.name === "training") {
    els.topbarTitle.textContent = "Training";
    els.topbarRight.appendChild(datePicker(selectedDate, (d) => {
      state.ui.selectedDate = d;
      state.ui.calendarMonth = d.slice(0, 7);
      saveState();
      render();
    }));
    els.content.appendChild(viewPlanList(selectedDate, "training"));
    return;
  }

  if (route.name === "voeding") {
    els.topbarTitle.textContent = "Voeding";
    els.topbarRight.appendChild(datePicker(selectedDate, (d) => {
      state.ui.selectedDate = d;
      state.ui.calendarMonth = d.slice(0, 7);
      saveState();
      render();
    }));
    els.content.appendChild(viewPlanList(selectedDate, "voeding"));
    return;
  }

  if (route.name === "inbody") {
    els.topbarTitle.textContent = "InBody";
    els.content.appendChild(viewInBody());
    return;
  }

  if (route.name === "profiel") {
    els.topbarTitle.textContent = "Profiel";
    els.content.appendChild(viewProfiel());
    return;
  }

  // Fallback
  els.topbarTitle.textContent = "Andre Coach";
  els.content.appendChild(card("Niet gevonden", [
    p("Deze pagina bestaat niet.")
  ]));
}

function viewVandaag(dateKey) {
  const wrap = document.createElement("div");

  const calCard = card("Agenda", []);
  calCard.appendChild(p(`${state.profile.name} • ${formatDateNL(dateKey)}`));
  calCard.appendChild(divSpacer(10));
  calCard.appendChild(calendarWidget(dateKey));
  wrap.appendChild(calCard);

  wrap.appendChild(dayPlanCard(dateKey));
  wrap.appendChild(dayScoreCard(dateKey));
  wrap.appendChild(dayLogCard(dateKey));

  const due = inbodyDueCard();
  if (due) wrap.appendChild(due);

  return wrap;
}

function viewPlanList(dateKey, kind /* "training" | "voeding" */) {
  const wrap = document.createElement("div");
  const day = ensureDay(dateKey);

  const title = kind === "training" ? "Training" : "Voeding";
  const tasks = day[kind];

  const listCard = card(`${title} • ${formatDateNL(dateKey)}`, []);
  listCard.appendChild(sectionProgress("Voortgang", tasks));

  const list = document.createElement("div");
  for (const task of tasks) {
    list.appendChild(taskRow(dateKey, kind, task));
  }
  if (tasks.length === 0) {
    list.appendChild(p("Nog geen items voor deze dag. Voeg er eentje toe met de knop hieronder."));
  }

  listCard.appendChild(list);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";
  actions.style.marginTop = "12px";

  const addBtn = button("Item toevoegen", "primary", () => openAddTaskSheet(dateKey, kind));
  const clearBtn = button("Alles wissen", "danger", () => {
    if (!confirm(`Alles wissen voor ${title} op ${formatDateNL(dateKey)}?`)) return;
    day[kind] = [];
    saveState();
    toast("Gewist.");
    render();
  });

  actions.appendChild(addBtn);
  actions.appendChild(clearBtn);
  listCard.appendChild(actions);

  wrap.appendChild(listCard);
  return wrap;
}

function viewInBody() {
  const wrap = document.createElement("div");

  const m = state.inbody.measurements.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = m[0];

  const schedule = card("Schema", []);
  const next = nextInbodyDate();
  if (next) {
    schedule.appendChild(p(`Volgende meting: ${formatDateNL(next)} (elke ${state.inbody.intervalDays || 42} dagen).`));
    const upcoming = upcomingInbodyDates(4);
    const s = document.createElement("div");
    s.className = "small";
    s.style.marginTop = "8px";
    s.textContent = `Komend: ${upcoming.map(formatDateNL).join(" • ")}`;
    schedule.appendChild(s);
  } else {
    schedule.appendChild(p("Stel een startdatum in onder Profiel."));
  }

  const summary = card("Laatste meting", []);
  if (latest) {
    const header = document.createElement("div");
    header.className = "card__title";
    header.textContent = `${formatDateNL(latest.date)}${latest.time ? " • " + latest.time : ""}`;
    summary.appendChild(header);

    summary.appendChild(kpiGrid([
      { label: "Gewicht", value: fmt(latest.weightKg, 1) + " kg" },
      { label: "Vet %", value: fmt(latest.bodyFatPercent, 1) + "%" },
      { label: "SMM", value: fmt(latest.skeletalMuscleMassKg, 1) + " kg" },
      { label: "InBody score", value: String(latest.inbodyScore ?? "—") }
    ]));

    summary.appendChild(divSpacer(10));
    summary.appendChild(insightsFor(latest, previousMeasurement(latest.date)));
  } else {
    summary.appendChild(p("Nog geen metingen."));
  }

  const charts = card("Trends (printout)", []);
  if (latest?.historyFromSheet) {
    const h = latest.historyFromSheet;
    charts.appendChild(p("Gebaseerd op de kleine trend-tabel op je printout (zonder exacte datums)."));
    charts.appendChild(divSpacer(10));
    charts.appendChild(chartCard("Gewicht (kg)", h.weightKg));
    charts.appendChild(divSpacer(10));
    charts.appendChild(chartCard("SMM (kg)", h.skeletalMuscleMassKg));
    charts.appendChild(divSpacer(10));
    charts.appendChild(chartCard("Vet %", h.bodyFatPercent));
    charts.appendChild(divSpacer(10));
    charts.appendChild(chartCard("ECW ratio", h.ecwRatio));
  } else {
    charts.appendChild(p("Nog geen trenddata."));
  }

  const add = card("Nieuwe meting toevoegen", []);
  add.appendChild(p("Upload je InBody foto('s) en/of vul de belangrijkste waarden in."));
  add.appendChild(divSpacer(10));
  add.appendChild(inbodyForm());

  const list = card("Metingen", []);
  if (m.length === 0) {
    list.appendChild(p("Nog geen metingen."));
  } else {
    for (const meas of m) {
      list.appendChild(inbodyMeasurementCard(meas));
    }
  }

  wrap.appendChild(schedule);
  wrap.appendChild(summary);
  wrap.appendChild(charts);
  wrap.appendChild(list);
  wrap.appendChild(add);

  return wrap;
}

function viewProfiel() {
  const wrap = document.createElement("div");

  const card1 = card("Persoon", []);
  card1.appendChild(kpiGrid([
    { label: "Naam", value: state.profile.name },
    { label: "Geslacht", value: state.profile.sex },
    { label: "Geboortedatum", value: formatDateNL(state.profile.birthdate) },
    { label: "Lengte", value: `${state.profile.heightCm} cm` }
  ]));

  const goals = card("Doelen", []);
  goals.appendChild(p("Stel je calorie target in (wordt gebruikt voor de dagscore)."));
  goals.appendChild(divSpacer(10));
  const g = document.createElement("div");
  g.className = "grid2";
  const calTarget = field("Calorie target (kcal)", inputInt(state.profile.calorieTargetKcal));
  calTarget.querySelector("input").addEventListener("change", () => {
    state.profile.calorieTargetKcal = parseIntOrNull(calTarget.querySelector("input").value) ?? state.profile.calorieTargetKcal;
    saveState();
    render();
  });
  g.appendChild(calTarget);
  goals.appendChild(g);

  const inbodySettings = card("InBody schema", []);
  inbodySettings.appendChild(p("6-wekelijks schema vanaf startdatum."));
  inbodySettings.appendChild(divSpacer(10));
  const ib = document.createElement("div");
  ib.className = "grid2";
  const start = field("Startdatum", inputDate(state.inbody.scheduleStartDate || "2026-04-01"));
  const interval = field("Interval (dagen)", inputInt(state.inbody.intervalDays || 42));
  start.querySelector("input").addEventListener("change", () => {
    state.inbody.scheduleStartDate = start.querySelector("input").value;
    saveState();
    render();
  });
  interval.querySelector("input").addEventListener("change", () => {
    state.inbody.intervalDays = parseIntOrNull(interval.querySelector("input").value) || 42;
    saveState();
    render();
  });
  ib.appendChild(start);
  ib.appendChild(interval);
  inbodySettings.appendChild(ib);

  const tpl = card("Weektemplate (schema)", []);
  tpl.appendChild(p("Definieer je vaste schema per week. Dit verschijnt automatisch in je agenda per dag."));
  tpl.appendChild(divSpacer(10));
  tpl.appendChild(weeklyTemplateEditor());

  const data = card("Data", []);
  data.appendChild(p("Alles staat lokaal op dit toestel (geen login)."));

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.flexWrap = "wrap";

  row.appendChild(button("Backup (JSON) downloaden", "primary", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    downloadBlob(blob, `andre-coach-backup-${isoDateToday()}.json`);
  }));

  row.appendChild(button("Backup importeren (JSON)", "", () => openJsonImport()));

  row.appendChild(button("Reset app", "danger", () => {
    if (!confirm("Alles verwijderen en opnieuw starten?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(SEED_STATE);
    saveState();
    toast("Reset klaar.");
    render();
  }));
  data.appendChild(divSpacer(10));
  data.appendChild(row);

  const importCard = card("Import (Excel/CSV)", []);
  importCard.appendChild(p("Voor een Excel (.xlsx) import heb je meestal een parser library nodig. In deze eerste versie ondersteunen we CSV-import (Excel kan exporteren naar CSV)."));
  importCard.appendChild(p("Wil je dat ik jouw Excel-bestand direct inlees als .xlsx? Upload het bestand hier in de chat, dan maak ik een importer op maat voor jouw format."));
  importCard.appendChild(divSpacer(10));
  importCard.appendChild(csvImportWidget());

  const pwa = card("Installeren op iPhone", []);
  pwa.appendChild(p("Open deze app in Safari op iOS, tik op Deel, en kies ‘Zet op beginscherm’. Daarna werkt hij als PWA (standalone)."));

  wrap.appendChild(card1);
  wrap.appendChild(goals);
  wrap.appendChild(inbodySettings);
  wrap.appendChild(tpl);
  wrap.appendChild(data);
  wrap.appendChild(importCard);
  wrap.appendChild(pwa);
  return wrap;
}

// ----------------------------
// Agenda / Day view
// ----------------------------

function calendarWidget(selectedDate) {
  const w = document.createElement("div");
  w.className = "cal";

  const monthKey = state.ui.calendarMonth || selectedDate.slice(0, 7);

  const head = document.createElement("div");
  head.className = "cal__head";

  const left = button("◀", "", () => {
    state.ui.calendarMonth = addMonths(monthKey + "-01", -1).slice(0, 7);
    saveState();
    render();
  });
  left.style.padding = "8px 10px";

  const right = button("▶", "", () => {
    state.ui.calendarMonth = addMonths(monthKey + "-01", 1).slice(0, 7);
    saveState();
    render();
  });
  right.style.padding = "8px 10px";

  const mid = document.createElement("div");
  mid.className = "cal__month";
  mid.textContent = formatMonthNL(monthKey);

  head.appendChild(left);
  head.appendChild(mid);
  head.appendChild(right);
  w.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "cal__grid";

  const dows = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  for (const d of dows) {
    const el = document.createElement("div");
    el.className = "cal__dow";
    el.textContent = d;
    grid.appendChild(el);
  }

  const cells = calendarCells(monthKey); // 42 items
  for (const c of cells) {
    const cell = document.createElement("div");
    cell.className = "cal__day" + (c.isOut ? " is-out" : "") + (c.dateKey === selectedDate ? " is-selected" : "");
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", formatDateNL(c.dateKey));

    const num = document.createElement("div");
    num.className = "cal__num";
    num.textContent = String(parseInt(c.dateKey.slice(8, 10), 10));
    cell.appendChild(num);

    const meta = document.createElement("div");
    meta.className = "cal__meta";

    const dayView = getDayView(c.dateKey);
    const stats = calcDayStats(c.dateKey, dayView);
    const badge = document.createElement("span");
    badge.className = "badge " + badgeClass(stats.scorePct);
    badge.textContent = stats.scorePct === null ? "—" : `${stats.scorePct}%`;
    meta.appendChild(badge);

    cell.appendChild(meta);

    const activate = () => {
      state.ui.selectedDate = c.dateKey;
      // Keep month aligned with selected date.
      state.ui.calendarMonth = c.dateKey.slice(0, 7);
      saveState();
      render();
    };
    cell.addEventListener("click", activate);
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    grid.appendChild(cell);
  }

  w.appendChild(grid);
  return w;
}

function dayPlanCard(dateKey) {
  const dayView = getDayView(dateKey);
  const wrap = card(`Schema • ${formatDateNL(dateKey)}`, []);

  const stats = calcDayStats(dateKey, dayView);
  const scoreRow = document.createElement("div");
  scoreRow.style.display = "flex";
  scoreRow.style.alignItems = "center";
  scoreRow.style.justifyContent = "space-between";
  scoreRow.style.gap = "10px";
  const left = document.createElement("div");
  left.className = "small";
  left.textContent = "Dagscore";
  const badge = document.createElement("span");
  badge.className = "chip " + badgeClass(stats.scorePct);
  badge.textContent = stats.scorePct === null ? "—" : `${stats.scorePct}%`;
  scoreRow.appendChild(left);
  scoreRow.appendChild(badge);
  wrap.appendChild(scoreRow);

  wrap.appendChild(sectionProgress("Totaal schema", [...dayView.training, ...dayView.voeding]));

  const tTitle = document.createElement("div");
  tTitle.className = "card__title";
  tTitle.textContent = "Training";
  const tAdd = button("Toevoegen", "primary", () => openAddTaskSheet(dateKey, "training"));
  tAdd.style.padding = "8px 10px";
  tTitle.appendChild(tAdd);
  wrap.appendChild(tTitle);

  const tList = document.createElement("div");
  for (const task of dayView.training) tList.appendChild(taskRow(dateKey, "training", task));
  if (dayView.training.length === 0) tList.appendChild(p("Geen training gepland voor deze dag."));
  wrap.appendChild(tList);

  wrap.appendChild(divSpacer(8));

  const vTitle = document.createElement("div");
  vTitle.className = "card__title";
  vTitle.textContent = "Voeding";
  const vAdd = button("Toevoegen", "primary", () => openAddTaskSheet(dateKey, "voeding"));
  vAdd.style.padding = "8px 10px";
  vTitle.appendChild(vAdd);
  wrap.appendChild(vTitle);

  const vList = document.createElement("div");
  for (const task of dayView.voeding) vList.appendChild(taskRow(dateKey, "voeding", task));
  if (dayView.voeding.length === 0) vList.appendChild(p("Geen voedingsitems gepland voor deze dag."));
  wrap.appendChild(vList);

  return wrap;
}

function dayScoreCard(dateKey) {
  const dayView = getDayView(dateKey);
  const stats = calcDayStats(dateKey, dayView);

  const c = card("Score & Calorieen", []);

  c.appendChild(kpiGrid([
    { label: "Schema gehaald", value: stats.completionPct === null ? "—" : `${stats.completionPct}%` },
    { label: "Calorie target", value: stats.targetKcal == null ? "—" : `${stats.targetKcal} kcal` },
    { label: "Inname", value: stats.actualInKcal == null ? "—" : `${stats.actualInKcal} kcal` },
    { label: "EGYM verbruik", value: stats.actualOutKcal == null ? "—" : `${stats.actualOutKcal} kcal` }
  ]));

  c.appendChild(divSpacer(10));

  const net = document.createElement("div");
  net.className = "small";
  net.textContent = stats.netKcal == null ? "Netto: —" : `Netto (inname - verbruik): ${stats.netKcal} kcal`;
  c.appendChild(net);

  c.appendChild(divSpacer(10));

  // Inputs
  const form = document.createElement("div");
  form.className = "grid2";

  const day = ensureDay(dateKey); // materialize so edits persist
  const inField = field("Calorie inname (kcal) (optioneel)", inputInt(day.manualCaloriesInKcal));
  const outField = field("EGYM verbruik (kcal) (optioneel)", inputInt(day.manualCaloriesOutKcal));

  inField.querySelector("input").addEventListener("change", () => {
    day.manualCaloriesInKcal = parseIntOrNull(inField.querySelector("input").value);
    saveState();
    render();
  });
  outField.querySelector("input").addEventListener("change", () => {
    day.manualCaloriesOutKcal = parseIntOrNull(outField.querySelector("input").value);
    saveState();
    render();
  });

  form.appendChild(inField);
  form.appendChild(outField);
  c.appendChild(form);

  c.appendChild(divSpacer(10));

  const scoreRow = document.createElement("div");
  scoreRow.className = "hint";
  scoreRow.textContent =
    stats.scorePct === null
      ? "Score: nog geen schema-items voor deze dag."
      : `Score: ${stats.scorePct}% (schema + calorie-afwijking t.o.v. target)`;
  c.appendChild(scoreRow);

  return c;
}

function dayLogCard(dateKey) {
  const dayView = getDayView(dateKey);
  const day = ensureDay(dateKey); // persist actions

  if (!Array.isArray(day.logEntries)) day.logEntries = [];

  const c = card("Extra / Afwijkingen", []);
  c.appendChild(p("Voeg toe wat je extra/niet hebt genomen of extra/niet hebt getraind. (Optioneel met kcal.)"));

  const list = document.createElement("div");
  for (const e of day.logEntries.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) {
    const r = document.createElement("div");
    r.className = "row";
    const l = document.createElement("div");
    l.className = "row__left";
    const t = document.createElement("div");
    t.className = "row__title";
    t.textContent = e.title || "(zonder titel)";
    const s = document.createElement("div");
    s.className = "row__subtitle";
    s.textContent = `${labelForLogType(e.type)}${typeof e.kcal === "number" ? ` • ${e.kcal > 0 ? "+" : ""}${e.kcal} kcal` : ""}`;
    l.appendChild(t);
    l.appendChild(s);
    r.appendChild(l);

    const del = button("Verwijder", "", () => {
      day.logEntries = day.logEntries.filter((x) => x.id !== e.id);
      saveState();
      toast("Verwijderd.");
      render();
    });
    del.style.padding = "8px 10px";
    r.appendChild(del);
    list.appendChild(r);
  }
  if (day.logEntries.length === 0) list.appendChild(p("Nog geen extra's of afwijkingen."));

  c.appendChild(list);
  c.appendChild(divSpacer(10));

  const form = document.createElement("div");
  form.className = "grid2";

  const typeSel = document.createElement("select");
  typeSel.innerHTML = `
    <option value="food">Voeding (extra / niet genomen)</option>
    <option value="egym">EGYM (verbruik)</option>
    <option value="training">Training (extra / niet gedaan)</option>
  `.trim();

  const titleIn = document.createElement("input");
  titleIn.placeholder = "Wat heb je gedaan/niet gedaan?";

  const kcalIn = inputInt(null);
  kcalIn.placeholder = "kcal (optioneel)";

  form.appendChild(field("Type", typeSel));
  form.appendChild(field("Omschrijving", titleIn));
  form.appendChild(field("Kcal (+/-)", kcalIn));

  const addBtn = button("Toevoegen", "primary", () => {
    const title = String(titleIn.value || "").trim();
    const type = typeSel.value;
    if (!title) return toast("Vul een omschrijving in.");
    const kcal = parseIntOrNull(kcalIn.value);

    day.logEntries.push({
      id: crypto.randomUUID(),
      type,
      title,
      kcal,
      createdAt: new Date().toISOString()
    });
    titleIn.value = "";
    kcalIn.value = "";
    saveState();
    toast("Toegevoegd.");
    render();
  });
  addBtn.style.gridColumn = "1 / -1";

  c.appendChild(form);
  c.appendChild(divSpacer(10));
  c.appendChild(addBtn);

  return c;
}

function inbodyDueCard() {
  const next = nextInbodyDate();
  if (!next) return null;

  const dueCard = card("Volgende InBody", []);
  const deltaDays = daysBetween(isoDateToday(), next);
  const chip = document.createElement("span");
  chip.className = "chip " + (deltaDays < 0 ? "bad" : deltaDays <= 10 ? "warn" : "ok");
  chip.textContent = deltaDays < 0 ? "Te laat" : `Over ${deltaDays} dagen`;

  const title = document.createElement("div");
  title.className = "card__title";
  title.textContent = formatDateNL(next);
  title.appendChild(chip);
  dueCard.insertBefore(title, dueCard.firstChild);

  const upcoming = upcomingInbodyDates(3);
  if (upcoming.length) {
    const s = document.createElement("div");
    s.className = "small";
    s.textContent = `Schema (6-wekelijks): ${upcoming.map(formatDateNL).join(" • ")}`;
    dueCard.appendChild(s);
  }

  dueCard.appendChild(p("Je kunt bij InBody een foto uploaden en/of de waarden invullen."));
  return dueCard;
}

// ----------------------------
// Components
// ----------------------------

function card(title, children) {
  const el = document.createElement("section");
  el.className = "card";

  const h = document.createElement("div");
  h.className = "card__title";
  h.textContent = title;
  el.appendChild(h);

  for (const c of children) el.appendChild(c);
  return el;
}

function p(text) {
  const el = document.createElement("p");
  el.style.margin = "10px 0 0 0";
  el.style.lineHeight = "1.35";
  el.textContent = text;
  return el;
}

function divSpacer(px) {
  const el = document.createElement("div");
  el.style.height = `${px}px`;
  return el;
}

function button(label, variant, onClick) {
  const b = document.createElement("button");
  b.className = "btn" + (variant ? " " + variant : "");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function datePicker(value, onChange) {
  const w = document.createElement("div");
  const input = document.createElement("input");
  input.type = "date";
  input.value = value;
  input.className = "btn";
  input.style.padding = "8px 10px";
  input.addEventListener("change", () => onChange(input.value));
  w.appendChild(input);
  return w;
}

function sectionProgress(label, tasks) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const box = document.createElement("div");
  box.style.marginTop = "10px";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.alignItems = "center";
  top.style.justifyContent = "space-between";
  top.style.gap = "10px";

  const left = document.createElement("div");
  left.className = "muted";
  left.style.fontSize = "13px";
  left.style.fontWeight = "800";
  left.textContent = label;

  const right = document.createElement("div");
  right.className = "chip " + (pct >= 80 ? "ok" : pct >= 40 ? "warn" : "bad");
  right.textContent = `${done}/${total}${total ? ` (${pct}%)` : ""}`;

  top.appendChild(left);
  top.appendChild(right);

  const bar = document.createElement("div");
  bar.className = "progress";
  const fill = document.createElement("div");
  fill.style.width = `${pct}%`;
  bar.appendChild(fill);

  box.appendChild(top);
  box.appendChild(divSpacer(8));
  box.appendChild(bar);
  return box;
}

function taskRow(dateKey, kind, task) {
  const row = document.createElement("div");
  row.className = "row";

  const left = document.createElement("div");
  left.className = "row__left";

  const title = document.createElement("div");
  title.className = "row__title";
  title.textContent = task.title || "(zonder titel)";

  const sub = document.createElement("div");
  sub.className = "row__subtitle";
  const kcal = typeof task.caloriesKcal === "number" ? `${task.caloriesKcal} kcal` : "";
  const bits = [task.details || "", kcal].filter(Boolean);
  sub.textContent = bits.join(" • ");

  left.appendChild(title);
  if (task.details) left.appendChild(sub);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "10px";

  const check = document.createElement("label");
  check.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!task.done;
  input.addEventListener("change", () => {
    setTaskDone(dateKey, kind, task, input.checked);
  });
  check.appendChild(input);

  const del = button("Verwijder", "", () => {
    deleteTaskFromDay(dateKey, kind, task);
  });
  del.style.padding = "8px 10px";

  right.appendChild(check);
  right.appendChild(del);

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function setTaskDone(dateKey, kind, task, done) {
  const day = ensureDay(dateKey);
  const t = resolveTask(day, kind, task);
  if (!t) return;
  t.done = !!done;
  saveState();
  render();
}

function deleteTaskFromDay(dateKey, kind, task) {
  const day = ensureDay(dateKey);
  const t = resolveTask(day, kind, task);
  if (!t) return;
  day[kind] = day[kind].filter((x) => x.id !== t.id);
  saveState();
  toast("Verwijderd.");
  render();
}

function resolveTask(day, kind, task) {
  if (!day || !Array.isArray(day[kind])) return null;
  if (task.templateKey) {
    return day[kind].find((x) => x.templateKey === task.templateKey) || null;
  }
  return day[kind].find((x) => x.id === task.id) || null;
}

function kpiGrid(items) {
  const wrap = document.createElement("div");
  wrap.className = "kpi";
  for (const it of items) {
    const el = document.createElement("div");
    el.className = "kpi__item";
    const l = document.createElement("div");
    l.className = "kpi__label";
    l.textContent = it.label;
    const v = document.createElement("div");
    v.className = "kpi__value";
    v.textContent = it.value;
    el.appendChild(l);
    el.appendChild(v);
    wrap.appendChild(el);
  }
  return wrap;
}

function insightsFor(latest, prev) {
  const box = document.createElement("div");
  box.className = "card";
  box.style.marginTop = "12px";

  const h = document.createElement("div");
  h.className = "card__title";
  h.textContent = "Korte analyse";
  box.appendChild(h);

  const bullets = document.createElement("div");

  const items = [];
  items.push(`Doel (printout): streefgewicht ${fmt(latest.weightControl?.targetWeightKg, 1)} kg (advies: ${fmt(latest.weightControl?.fatControlKg, 1)} kg vet, ${fmt(latest.weightControl?.muscleControlKg, 1)} kg spier).`);
  items.push(`InBody score: ${latest.inbodyScore}/100 • BMI: ${fmt(latest.bmi, 1)} • Vet%: ${fmt(latest.bodyFatPercent, 1)}%.`);

  // Simple status heuristics
  if (typeof latest.bodyFatPercent === "number") {
    const pbf = latest.bodyFatPercent;
    if (pbf >= 25) items.push("Vetpercentage is hoog voor veel mannen; focus op geleidelijke vetdaling met behoud van spiermassa.");
    else if (pbf >= 20) items.push("Vetpercentage zit rond de hogere kant van ‘gemiddeld’; vetdaling van ~2–5 kg kan dit zichtbaar verbeteren.");
    else items.push("Vetpercentage is relatief gunstig; focus op consistentie en herstel.");
  }

  if (prev) {
    const dW = delta(prev.weightKg, latest.weightKg);
    const dS = delta(prev.skeletalMuscleMassKg, latest.skeletalMuscleMassKg);
    const dP = delta(prev.bodyFatPercent, latest.bodyFatPercent);
    items.push(`Verschil t.o.v. vorige meting (${formatDateNL(prev.date)}): gewicht ${fmt(dW, 1)} kg, SMM ${fmt(dS, 1)} kg, vet% ${fmt(dP, 1)}%.`);
  } else {
    items.push("Geen eerdere meting met exacte datum in de app opgeslagen; je kunt die later toevoegen voor echte trends per 6 weken.");
  }

  if (typeof latest.visceralFatLevel === "number") {
    items.push(`Visceraal vetniveau: ${latest.visceralFatLevel} (op de printout staat de referentie 1–9).`);
  }
  if (typeof latest.waistHipRatio === "number") {
    items.push(`Waist-hip ratio: ${fmt(latest.waistHipRatio, 2)} (printout referentie: 0.80–0.90).`);
  }

  for (const t of items) {
    const r = document.createElement("div");
    r.className = "row";
    const l = document.createElement("div");
    l.className = "row__left";
    const tt = document.createElement("div");
    tt.className = "row__title";
    tt.style.fontWeight = "700";
    tt.style.fontSize = "13px";
    tt.textContent = t;
    l.appendChild(tt);
    r.appendChild(l);
    bullets.appendChild(r);
  }

  box.appendChild(bullets);
  return box;
}

function chartCard(title, values) {
  const outer = document.createElement("div");
  outer.className = "card";
  const h = document.createElement("div");
  h.className = "card__title";
  h.textContent = title;
  outer.appendChild(h);
  outer.appendChild(sparkline(values));
  return outer;
}

function sparkline(values) {
  const w = 640;
  const h = 170;
  const pad = 18;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return { x, y, v };
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("class", "chart");
  svg.style.height = "170px";

  const bg = document.createElementNS(svg.namespaceURI, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "rgba(255,255,255,0.0)");
  svg.appendChild(bg);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (h - pad * 2)) / 4;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", String(pad));
    line.setAttribute("x2", String(w - pad));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "rgba(60,60,67,0.16)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  }

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(10,132,255,0.95)");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("d", pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "));
  svg.appendChild(path);

  // Dots
  for (const p of pts) {
    const c = document.createElementNS(svg.namespaceURI, "circle");
    c.setAttribute("cx", p.x.toFixed(2));
    c.setAttribute("cy", p.y.toFixed(2));
    c.setAttribute("r", "4.5");
    c.setAttribute("fill", "rgba(52,199,89,0.92)");
    c.setAttribute("stroke", "white");
    c.setAttribute("stroke-width", "2");
    svg.appendChild(c);
  }

  const footer = document.createElement("div");
  footer.className = "small";
  footer.style.marginTop = "8px";
  footer.textContent = `Min: ${fmt(min, 2)} • Max: ${fmt(max, 2)} • Laatste: ${fmt(values[values.length - 1], 2)}`;

  const wrap = document.createElement("div");
  wrap.appendChild(svg);
  wrap.appendChild(footer);
  return wrap;
}

function inbodyForm() {
  const form = document.createElement("form");
  form.className = "grid2";

  const fDate = field("Datum", inputDate(nextInbodyDate() || isoDateToday()));
  const fWeight = field("Gewicht (kg)", inputNumber("", "85.2"));
  const fPbf = field("Vet %", inputNumber("", "20.0"));
  const fSmm = field("SMM (kg)", inputNumber("", "38.3"));
  const fScore = field("InBody score", inputNumber("", "80"));
  const fNotes = field("Notities", textarea(""));
  const fPhotos = field("Foto(s) (optioneel)", inputPhotos());

  form.appendChild(fDate);
  form.appendChild(fWeight);
  form.appendChild(fPbf);
  form.appendChild(fSmm);
  form.appendChild(fScore);
  form.appendChild(fNotes);
  form.appendChild(fPhotos);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";
  actions.style.gridColumn = "1 / -1";

  const saveBtn = button("Meting opslaan", "primary", async (e) => {
    e?.preventDefault?.();
    const date = fDate.querySelector("input").value;
    if (!date) return toast("Kies een datum.");

    const photoIds = [];
    const files = fPhotos.querySelector("input").files;
    if (files && files.length) {
      for (const file of Array.from(files)) {
        try {
          const id = await fileStorePut(file);
          photoIds.push(id);
        } catch (err) {
          // Non-fatal; still save measurement values.
        }
      }
    }

    const m = {
      date,
      time: "",
      device: "",
      heightCm: state.profile.heightCm,
      ageYears: yearsBetween(state.profile.birthdate, date),
      sex: state.profile.sex,
      weightKg: parseFloatOrNull(fWeight.querySelector("input").value),
      bodyFatPercent: parseFloatOrNull(fPbf.querySelector("input").value),
      skeletalMuscleMassKg: parseFloatOrNull(fSmm.querySelector("input").value),
      inbodyScore: parseFloatOrNull(fScore.querySelector("input").value),
      notes: fNotes.querySelector("textarea").value.trim(),
      photoIds
    };

    state.inbody.measurements = state.inbody.measurements.filter((x) => x.date !== date);
    state.inbody.measurements.push(m);
    state.inbody.measurements.sort((a, b) => (a.date < b.date ? -1 : 1));

    saveState();
    toast("Meting opgeslagen.");
    render();
  });

  const bumpBtn = button("Zet volgende datum op +6 weken", "", () => {
    const date = fDate.querySelector("input").value || isoDateToday();
    fDate.querySelector("input").value = addDays(date, 42);
  });

  actions.appendChild(saveBtn);
  actions.appendChild(bumpBtn);
  form.appendChild(actions);

  form.addEventListener("submit", (e) => e.preventDefault());
  return form;
}

function field(labelText, controlEl) {
  const w = document.createElement("div");
  w.className = "field";
  const l = document.createElement("label");
  l.textContent = labelText;
  w.appendChild(l);
  w.appendChild(controlEl);
  return w;
}

function inputDate(value) {
  const i = document.createElement("input");
  i.type = "date";
  i.value = value || "";
  return i;
}

function inputNumber(value, placeholder) {
  const i = document.createElement("input");
  i.type = "number";
  i.inputMode = "decimal";
  i.step = "0.1";
  i.value = value || "";
  i.placeholder = placeholder || "";
  return i;
}

function inputInt(value) {
  const i = document.createElement("input");
  i.type = "number";
  i.inputMode = "numeric";
  i.step = "1";
  i.value = value == null ? "" : String(value);
  return i;
}

function inputPhotos() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = "image/*";
  i.multiple = true;
  return i;
}

function textarea(value) {
  const t = document.createElement("textarea");
  t.value = value || "";
  t.placeholder = "Optioneel...";
  return t;
}

function csvImportWidget() {
  const wrap = document.createElement("div");

  const info = document.createElement("div");
  info.className = "small";
  info.textContent = "CSV verwacht kolommen: datum, titel, details. Extra kolommen worden genegeerd.";
  wrap.appendChild(info);
  wrap.appendChild(divSpacer(8));

  const kindSel = document.createElement("select");
  kindSel.innerHTML = `
    <option value="training">Training CSV</option>
    <option value="voeding">Voeding CSV</option>
  `.trim();

  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".csv,text/csv";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.flexWrap = "wrap";
  row.appendChild(kindSel);
  row.appendChild(file);

  const importBtn = button("Importeer CSV", "primary", async () => {
    if (!file.files || file.files.length === 0) return toast("Kies een CSV bestand.");
    const f = file.files[0];
    const text = await f.text();
    const kind = kindSel.value;
    const result = importCsvToPlan(text, kind);
    saveState();
    toast(`Geimporteerd: ${result.imported} items (${result.days} dagen).`);
    render();
  });
  importBtn.style.marginTop = "10px";

  wrap.appendChild(row);
  wrap.appendChild(importBtn);
  return wrap;
}

function weeklyTemplateEditor() {
  if (!state.templates) state.templates = { weekly: {} };
  if (!state.templates.weekly) state.templates.weekly = {};

  const wrap = document.createElement("div");

  const weekdaySel = document.createElement("select");
  const labels = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
  weekdaySel.innerHTML = labels
    .map((l, i) => `<option value="${i}">${l}</option>`)
    .join("");
  if (state.ui.templateWeekday == null) state.ui.templateWeekday = "0";
  weekdaySel.value = String(state.ui.templateWeekday);

  const kindSel = document.createElement("select");
  kindSel.innerHTML = `
    <option value="training">Training</option>
    <option value="voeding">Voeding</option>
  `.trim();

  const titleIn = document.createElement("input");
  titleIn.placeholder = "Titel";

  const detailsIn = document.createElement("input");
  detailsIn.placeholder = "Details (optioneel)";

  const kcalIn = inputInt(null);
  kcalIn.placeholder = "kcal (optioneel, voeding)";

  const top = document.createElement("div");
  top.className = "grid2";
  top.appendChild(field("Dag", weekdaySel));
  top.appendChild(field("Type", kindSel));
  top.appendChild(field("Titel", titleIn));
  top.appendChild(field("Details", detailsIn));
  top.appendChild(field("Kcal", kcalIn));

  const addBtn = button("Toevoegen aan weektemplate", "primary", () => {
    const weekday = weekdaySel.value;
    const kind = kindSel.value;
    const title = String(titleIn.value || "").trim();
    const details = String(detailsIn.value || "").trim();
    const kcal = parseIntOrNull(kcalIn.value);
    if (!title) return toast("Vul een titel in.");

    if (!state.templates.weekly[weekday]) state.templates.weekly[weekday] = { training: [], voeding: [] };
    state.templates.weekly[weekday][kind].push({
      title,
      details,
      caloriesKcal: kind === "voeding" && typeof kcal === "number" ? kcal : null
    });

    titleIn.value = "";
    detailsIn.value = "";
    kcalIn.value = "";
    saveState();
    toast("Toegevoegd.");
    render();
  });

  wrap.appendChild(top);
  wrap.appendChild(divSpacer(10));
  wrap.appendChild(addBtn);
  wrap.appendChild(divSpacer(10));

  const lists = document.createElement("div");
  lists.className = "grid2";

  const selectedWeekday = weekdaySel.value;
  const data = state.templates.weekly[selectedWeekday] || { training: [], voeding: [] };

  lists.appendChild(templateListCard("Training items", selectedWeekday, "training", data.training || []));
  lists.appendChild(templateListCard("Voeding items", selectedWeekday, "voeding", data.voeding || []));

  wrap.appendChild(lists);

  weekdaySel.addEventListener("change", () => {
    state.ui.templateWeekday = weekdaySel.value;
    saveState();
    render();
  });

  return wrap;
}

function templateListCard(title, weekday, kind, items) {
  const c = document.createElement("div");
  c.className = "card";
  const h = document.createElement("div");
  h.className = "card__title";
  h.textContent = title;
  c.appendChild(h);

  if (!items.length) {
    c.appendChild(p("Geen items."));
    return c;
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r = document.createElement("div");
    r.className = "row";
    const l = document.createElement("div");
    l.className = "row__left";
    const t = document.createElement("div");
    t.className = "row__title";
    t.textContent = it.title || "(zonder titel)";
    const s = document.createElement("div");
    s.className = "row__subtitle";
    const kcal = typeof it.caloriesKcal === "number" ? `${it.caloriesKcal} kcal` : "";
    s.textContent = [it.details || "", kcal].filter(Boolean).join(" • ");
    l.appendChild(t);
    if (s.textContent) l.appendChild(s);
    r.appendChild(l);

    const del = button("Verwijder", "", () => {
      const w = state.templates.weekly[String(weekday)] || { training: [], voeding: [] };
      w[kind] = (w[kind] || []).filter((_, idx) => idx !== i);
      state.templates.weekly[String(weekday)] = w;
      saveState();
      toast("Verwijderd.");
      render();
    });
    del.style.padding = "8px 10px";
    r.appendChild(del);
    c.appendChild(r);
  }

  return c;
}

function inbodyMeasurementCard(meas) {
  const c = document.createElement("div");
  c.className = "card";

  const title = document.createElement("div");
  title.className = "card__title";
  title.textContent = formatDateNL(meas.date);

  const del = button("Verwijder", "danger", async () => {
    if (!confirm(`Meting verwijderen (${formatDateNL(meas.date)})?`)) return;
    // Best-effort cleanup of stored photos
    if (Array.isArray(meas.photoIds)) {
      for (const id of meas.photoIds) {
        try { await fileStoreDelete(id); } catch {}
      }
    }
    state.inbody.measurements = state.inbody.measurements.filter((m) => m.date !== meas.date);
    saveState();
    toast("Meting verwijderd.");
    render();
  });
  del.style.padding = "8px 10px";
  title.appendChild(del);
  c.appendChild(title);

  const items = [];
  if (typeof meas.weightKg === "number") items.push({ label: "Gewicht", value: fmt(meas.weightKg, 1) + " kg" });
  if (typeof meas.bodyFatPercent === "number") items.push({ label: "Vet %", value: fmt(meas.bodyFatPercent, 1) + "%" });
  if (typeof meas.skeletalMuscleMassKg === "number") items.push({ label: "SMM", value: fmt(meas.skeletalMuscleMassKg, 1) + " kg" });
  if (typeof meas.inbodyScore === "number") items.push({ label: "Score", value: String(meas.inbodyScore) });
  if (items.length) c.appendChild(kpiGrid(items.slice(0, 4)));

  if (meas.notes) {
    const n = document.createElement("div");
    n.className = "small";
    n.style.marginTop = "10px";
    n.textContent = `Notities: ${meas.notes}`;
    c.appendChild(n);
  }

  const thumbs = document.createElement("div");
  thumbs.className = "thumbs";
  const ids = Array.isArray(meas.photoIds) ? meas.photoIds : [];
  for (const id of ids) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = `InBody foto ${formatDateNL(meas.date)}`;
    img.loading = "lazy";
    img.addEventListener("click", async () => {
      const blob = await fileStoreGet(id).catch(() => null);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
    // async load
    fileStoreGet(id).then((blob) => {
      if (!blob) return;
      img.src = URL.createObjectURL(blob);
    }).catch(() => {});
    thumbs.appendChild(img);
  }
  if (ids.length) {
    c.appendChild(divSpacer(10));
    c.appendChild(thumbs);
  }

  c.appendChild(divSpacer(10));
  const addPhotos = inputPhotos();
  addPhotos.addEventListener("change", async () => {
    const files = addPhotos.files;
    if (!files || !files.length) return;
    if (!Array.isArray(meas.photoIds)) meas.photoIds = [];
    for (const f of Array.from(files)) {
      try {
        const id = await fileStorePut(f);
        meas.photoIds.push(id);
      } catch {}
    }
    saveState();
    toast("Foto(s) toegevoegd.");
    render();
  });
  c.appendChild(field("Foto(s) toevoegen", addPhotos));

  return c;
}

function openAddTaskSheet(dateKey, kind) {
  const title = kind === "training" ? "Training item" : "Voeding item";

  const t = prompt(`${title} titel?`);
  if (!t) return;
  const d = prompt("Details (optioneel)?") || "";
  let kcal = null;
  if (kind === "voeding") {
    const k = prompt("Calorieen (kcal) (optioneel)?") || "";
    kcal = parseIntOrNull(k);
  }

  const day = ensureDay(dateKey);
  day[kind].push({
    id: crypto.randomUUID(),
    title: t.trim(),
    details: d.trim(),
    caloriesKcal: typeof kcal === "number" ? kcal : null,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveState();
  toast("Toegevoegd.");
  render();
}

function openJsonImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      state = normalizeState(obj);
      saveState();
      toast("Backup geimporteerd.");
      render();
    } catch (e) {
      toast("Import mislukt: geen geldige JSON.");
    }
  });
  input.click();
}

// ----------------------------
// CSV Import
// ----------------------------

function importCsvToPlan(csvText, kind) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return { imported: 0, days: 0 };

  const header = rows[0].map((h) => normalizeHeader(h));
  const idxDate = findHeaderIndex(header, ["datum", "date"]);
  const idxTitle = findHeaderIndex(header, ["titel", "title", "item", "naam", "exercise", "oefening"]);
  const idxDetails = findHeaderIndex(header, ["details", "detail", "notitie", "notes", "omschrijving", "beschrijving"]);
  const idxKcal = findHeaderIndex(header, ["kcal", "cal", "calories", "calorieen", "calorien"]);

  if (idxDate === -1 || idxTitle === -1) {
    toast("CSV mist kolommen 'datum' en/of 'titel'.");
    return { imported: 0, days: 0 };
  }

  let imported = 0;
  const daySet = new Set();

  for (const r of rows.slice(1)) {
    const dateRaw = (r[idxDate] || "").trim();
    const titleRaw = (r[idxTitle] || "").trim();
    const detailsRaw = idxDetails === -1 ? "" : (r[idxDetails] || "").trim();
    const kcalRaw = idxKcal === -1 ? "" : (r[idxKcal] || "").trim();
    if (!dateRaw || !titleRaw) continue;

    const dateKey = coerceDate(dateRaw);
    if (!dateKey) continue;

    const day = ensureDay(dateKey);
    day[kind].push({
      id: crypto.randomUUID(),
      title: titleRaw,
      details: detailsRaw,
      caloriesKcal: kind === "voeding" ? parseIntOrNull(kcalRaw) : null,
      done: false,
      createdAt: new Date().toISOString(),
      importedFrom: "csv"
    });

    imported++;
    daySet.add(dateKey);
  }

  return { imported, days: daySet.size };
}

function parseCsv(text) {
  // Minimal RFC4180-ish parser with support for quotes.
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  // Support both comma and semicolon by detecting delimiter on first line later.
  // For simplicity we parse with comma first, then if header has 1 cell, retry with semicolon.
  const parsedComma = parseCsvWithDelim(text, ",");
  if (parsedComma.length && parsedComma[0].length > 1) return parsedComma;
  return parseCsvWithDelim(text, ";");

  function parseCsvWithDelim(t, delim) {
    const out = [];
    row = [];
    cur = "";
    inQuotes = false;

    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      const next = t[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delim) {
        row.push(cur);
        cur = "";
        continue;
      }
      if (!inQuotes && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((c) => String(c).trim() !== "")) out.push(row);
        row = [];
        continue;
      }
      cur += ch;
    }
    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) out.push(row);
    return out;
  }
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function findHeaderIndex(headers, candidates) {
  for (const c of candidates) {
    const i = headers.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
}

function coerceDate(s) {
  // Accept YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

// ----------------------------
// State helpers
// ----------------------------

function getDayStored(dateKey) {
  return state.plans.byDate[dateKey] || null;
}

function getDayView(dateKey) {
  const stored = getDayStored(dateKey);
  if (stored) return stored;
  return seededDayFromTemplate(dateKey);
}

function ensureDay(dateKey) {
  let day = state.plans.byDate[dateKey];
  if (!day) {
    day = seededDayFromTemplate(dateKey, { persist: true });
    state.plans.byDate[dateKey] = day;
  }
  // Backwards compat for v1 days.
  if (!Array.isArray(day.training)) day.training = [];
  if (!Array.isArray(day.voeding)) day.voeding = [];
  if (!Array.isArray(day.logEntries)) day.logEntries = [];
  if (!("manualCaloriesInKcal" in day)) day.manualCaloriesInKcal = null;
  if (!("manualCaloriesOutKcal" in day)) day.manualCaloriesOutKcal = null;
  return day;
}

function seededDayFromTemplate(dateKey, opts = {}) {
  const weekday = weekdayMondayIndex(dateKey); // 0..6
  const tpl = state.templates?.weekly?.[String(weekday)] || { training: [], voeding: [] };
  const now = new Date().toISOString();
  const persist = !!opts.persist;

  const mkTask = (kind, t, idx) => {
    const templateKey = `${weekday}:${kind}:${idx}`;
    return {
      id: persist ? crypto.randomUUID() : `tmp_${dateKey}_${templateKey}`,
      title: t.title || "",
      details: t.details || "",
      caloriesKcal: typeof t.caloriesKcal === "number" ? t.caloriesKcal : null,
      done: false,
      createdAt: now,
      templateKey,
      fromTemplate: true,
      __temp: !persist
    };
  };

  const training = (tpl.training || []).map((t, i) => mkTask("training", t, i));
  const voeding = (tpl.voeding || []).map((t, i) => mkTask("voeding", t, i));

  return {
    training,
    voeding,
    logEntries: [],
    manualCaloriesInKcal: null,
    manualCaloriesOutKcal: null,
    createdAt: now,
    seededFromTemplate: true,
    __temp: !persist
  };
}

function previousMeasurement(dateKey) {
  const list = state.inbody.measurements.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const idx = list.findIndex((m) => m.date === dateKey);
  if (idx <= 0) return null;
  return list[idx - 1];
}

function normalizeState(obj) {
  const s = obj && typeof obj === "object" ? obj : {};
  const out = structuredClone(SEED_STATE);
  if (s.profile) out.profile = { ...out.profile, ...s.profile };
  if (s.ui) out.ui = { ...out.ui, ...s.ui };
  if (s.templates) out.templates = { ...out.templates, ...s.templates };
  if (s.plans?.byDate) out.plans.byDate = s.plans.byDate;
  if (s.inbody) out.inbody = { ...out.inbody, ...s.inbody };
  out.version = APP_VERSION;

  // Normalize day objects.
  for (const [dateKey, day] of Object.entries(out.plans.byDate || {})) {
    if (!day || typeof day !== "object") continue;
    if (!Array.isArray(day.training)) day.training = [];
    if (!Array.isArray(day.voeding)) day.voeding = [];
    if (!Array.isArray(day.logEntries)) day.logEntries = [];
    if (!("manualCaloriesInKcal" in day)) day.manualCaloriesInKcal = null;
    if (!("manualCaloriesOutKcal" in day)) day.manualCaloriesOutKcal = null;
    // Ensure tasks have ids
    for (const k of ["training", "voeding"]) {
      for (const t of day[k]) {
        if (!t.id) t.id = crypto.randomUUID();
        if (!("done" in t)) t.done = false;
      }
    }
    // Keep month view consistent
    if (!out.ui.calendarMonth) out.ui.calendarMonth = dateKey.slice(0, 7);
  }

  // InBody defaults
  if (!out.inbody.intervalDays) out.inbody.intervalDays = 42;
  if (!out.inbody.scheduleStartDate) out.inbody.scheduleStartDate = "2026-04-01";
  if (!Array.isArray(out.inbody.measurements)) out.inbody.measurements = [];

  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SEED_STATE);
    return normalizeState(JSON.parse(raw));
  } catch (e) {
    return structuredClone(SEED_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ----------------------------
// Routing / UI helpers
// ----------------------------

function parseRoute(hash) {
  const path = (hash || "").replace(/^#/, "");
  const parts = path.split("/").filter(Boolean);
  const name = parts[0] || "vandaag";
  return { name };
}

function setActiveTab(name) {
  for (const t of els.tabs) {
    const on = t.dataset.tab === name;
    t.classList.toggle("is-active", on);
    if (on) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  }
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("is-show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("is-show"), 1800);
}

// ----------------------------
// Service worker
// ----------------------------

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      // Use relative URLs so this works from subpaths (e.g. GitHub Pages /Training-/).
      await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    } catch (e) {
      // Non-fatal
    }
  });
}

// ----------------------------
// File Store (IndexedDB) for Photos
// ----------------------------

const FILE_DB_NAME = "andre_coach_files_v1";
const FILE_STORE_NAME = "files";
let _fileDbPromise = null;

function openFileDb() {
  if (_fileDbPromise) return _fileDbPromise;
  _fileDbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("indexedDB not supported"));
    const req = indexedDB.open(FILE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
  return _fileDbPromise;
}

async function fileStorePut(blob) {
  const db = await openFileDb();
  const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to store file"));
    tx.objectStore(FILE_STORE_NAME).put({
      id,
      blob,
      type: blob?.type || "",
      createdAt: new Date().toISOString()
    });
  });
  return id;
}

async function fileStoreGet(id) {
  const db = await openFileDb();
  const rec = await new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readonly");
    const req = tx.objectStore(FILE_STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("Failed to read file"));
  });
  return rec?.blob || null;
}

async function fileStoreDelete(id) {
  const db = await openFileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to delete file"));
    tx.objectStore(FILE_STORE_NAME).delete(id);
  });
}

// ----------------------------
// Utilities
// ----------------------------

function isoDateToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDateNL(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function fmt(n, digits) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toFixed(digits ?? 0);
}

function delta(a, b) {
  if (typeof a !== "number" || typeof b !== "number") return NaN;
  return b - a;
}

function parseFloatOrNull(s) {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(s) {
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / (24 * 3600 * 1000));
}

function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function yearsBetween(birthIso, atIso) {
  const b = new Date(birthIso + "T00:00:00");
  const a = new Date(atIso + "T00:00:00");
  let years = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) years--;
  return years;
}

function weekdayMondayIndex(isoDate) {
  // 0=Monday .. 6=Sunday
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const js = dt.getDay(); // 0=Sun..6=Sat
  return (js + 6) % 7;
}

function addMonths(isoDate, deltaMonths) {
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + Number(deltaMonths || 0));
  return toIsoLocal(dt);
}

function toIsoLocal(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calendarCells(monthKey /* YYYY-MM */) {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-based
  const start = new Date(y, m - 1, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateKey = toIsoLocal(d);
    cells.push({ dateKey, isOut: dateKey.slice(0, 7) !== monthKey });
  }
  return cells;
}

function formatMonthNL(monthKey /* YYYY-MM */) {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  const months = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"
  ];
  return `${months[m - 1]} ${y}`;
}

function badgeClass(pct) {
  if (pct == null) return "warn";
  if (pct >= 80) return "ok";
  if (pct >= 40) return "warn";
  return "bad";
}

function labelForLogType(type) {
  if (type === "food") return "Voeding";
  if (type === "egym") return "EGYM";
  if (type === "training") return "Training";
  return "Log";
}

function sumKcalFromTasks(tasks) {
  let s = 0;
  for (const t of tasks || []) {
    if (typeof t.caloriesKcal === "number") s += t.caloriesKcal;
  }
  return s;
}

function sumKcalFromEntries(entries, type) {
  let s = 0;
  for (const e of entries || []) {
    if (e?.type !== type) continue;
    if (typeof e.kcal === "number") s += e.kcal;
  }
  return s;
}

function calcDayStats(dateKey, dayView) {
  const tasks = [...(dayView.training || []), ...(dayView.voeding || [])];
  const total = tasks.length;
  const done = tasks.filter((t) => !!t.done).length;
  const completionPct = total ? Math.round((done / total) * 100) : null;

  const targetKcal = typeof state.profile.calorieTargetKcal === "number" ? state.profile.calorieTargetKcal : null;

  const plannedIn = sumKcalFromTasks(dayView.voeding);
  const adjIn = sumKcalFromEntries(dayView.logEntries, "food");
  const adjOut = sumKcalFromEntries(dayView.logEntries, "egym");

  const manualIn = dayView.manualCaloriesInKcal;
  const manualOut = dayView.manualCaloriesOutKcal;

  const actualIn =
    typeof manualIn === "number"
      ? manualIn
      : (plannedIn || adjIn) ? (plannedIn + adjIn) : null;

  const actualOut =
    typeof manualOut === "number"
      ? manualOut
      : adjOut ? adjOut : null;

  const netKcal =
    actualIn == null && actualOut == null
      ? null
      : (actualIn || 0) - (actualOut || 0);

  let calorieScore = null;
  if (targetKcal != null && actualIn != null) {
    const dev = Math.abs(actualIn - targetKcal) / Math.max(1, targetKcal);
    calorieScore = clampInt(Math.round(100 - dev * 100), 0, 100);
  }

  let scorePct = completionPct;
  if (completionPct != null && calorieScore != null) {
    scorePct = clampInt(Math.round(completionPct * 0.7 + calorieScore * 0.3), 0, 100);
  }

  return {
    completionPct,
    targetKcal,
    plannedInKcal: plannedIn || null,
    actualInKcal: actualIn,
    actualOutKcal: actualOut,
    netKcal: netKcal == null ? null : Math.round(netKcal),
    calorieScore,
    scorePct
  };
}

function clampInt(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function nextInbodyDate() {
  const interval = state.inbody?.intervalDays || 42;
  const start = state.inbody?.scheduleStartDate || null;
  const ms = (state.inbody?.measurements || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = ms[0]?.date || null;

  if (!start && !latest) return null;
  if (!latest) return start;

  let next = addDays(latest, interval);
  if (start && next < start) next = start;
  return next;
}

function upcomingInbodyDates(count) {
  const interval = state.inbody?.intervalDays || 42;
  let d = nextInbodyDate();
  const out = [];
  for (let i = 0; i < (count || 0); i++) {
    if (!d) break;
    out.push(d);
    d = addDays(d, interval);
  }
  return out;
}
