const APP_VERSION = 1;
const STORAGE_KEY = "andre_coach_state_v1";

// Seed data based on your message + the latest InBody sheet photo you shared.
// Note: This is not medical advice; it’s a structured log + basic trend summaries.
const SEED_STATE = {
  version: APP_VERSION,
  profile: {
    name: "Andre",
    sex: "Man",
    birthdate: "1968-07-12",
    heightCm: 183
  },
  ui: {
    selectedDate: isoDateToday()
  },
  plans: {
    // dateKey -> { training: Task[], voeding: Task[] }
    byDate: {}
  },
  inbody: {
    nextMeasurementDate: "2026-04-01",
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

  const dayCard = card("Overzicht", []);
  dayCard.appendChild(p(`${formatDateNL(dateKey)} • ${state.profile.name}`));

  const t = ensureDay(dateKey).training;
  const v = ensureDay(dateKey).voeding;

  dayCard.appendChild(sectionProgress("Training", t));
  dayCard.appendChild(sectionProgress("Voeding", v));

  const hintEl = document.createElement("div");
  hintEl.className = "hint";
  hintEl.textContent = "Tip: gebruik Training/Voeding tabs om items toe te voegen en af te vinken.";
  dayCard.appendChild(divSpacer(10));
  dayCard.appendChild(hintEl);

  wrap.appendChild(dayCard);

  const next = state.inbody?.nextMeasurementDate;
  if (next) {
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

    dueCard.appendChild(p("Je gaf aan dat je elke 6 weken meet. Voeg op 1 april de nieuwe meting toe bij InBody."));
    wrap.appendChild(dueCard);
  }

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
  add.appendChild(p("Voeg je volgende InBody in op 1 april 2026 (of een andere datum)."));
  add.appendChild(divSpacer(10));
  add.appendChild(inbodyForm());

  wrap.appendChild(summary);
  wrap.appendChild(charts);
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
  wrap.appendChild(data);
  wrap.appendChild(importCard);
  wrap.appendChild(pwa);
  return wrap;
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
  sub.textContent = task.details || "";

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
    task.done = input.checked;
    saveState();
    render(); // refresh progress
  });
  check.appendChild(input);

  const del = button("Verwijder", "", () => {
    const day = ensureDay(dateKey);
    day[kind] = day[kind].filter((t) => t.id !== task.id);
    saveState();
    toast("Verwijderd.");
    render();
  });
  del.style.padding = "8px 10px";

  right.appendChild(check);
  right.appendChild(del);

  row.appendChild(left);
  row.appendChild(right);
  return row;
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

  const fDate = field("Datum", inputDate(state.inbody.nextMeasurementDate || isoDateToday()));
  const fWeight = field("Gewicht (kg)", inputNumber("", "85.2"));
  const fPbf = field("Vet %", inputNumber("", "20.0"));
  const fSmm = field("SMM (kg)", inputNumber("", "38.3"));
  const fScore = field("InBody score", inputNumber("", "80"));
  const fNotes = field("Notities", textarea(""));

  form.appendChild(fDate);
  form.appendChild(fWeight);
  form.appendChild(fPbf);
  form.appendChild(fSmm);
  form.appendChild(fScore);
  form.appendChild(fNotes);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";
  actions.style.gridColumn = "1 / -1";

  const saveBtn = button("Meting opslaan", "primary", (e) => {
    e?.preventDefault?.();
    const date = fDate.querySelector("input").value;
    if (!date) return toast("Kies een datum.");

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
      notes: fNotes.querySelector("textarea").value.trim()
    };

    state.inbody.measurements = state.inbody.measurements.filter((x) => x.date !== date);
    state.inbody.measurements.push(m);
    state.inbody.measurements.sort((a, b) => (a.date < b.date ? -1 : 1));

    // Keep nextMeasurementDate aligned (optional: bump by 6 weeks).
    state.inbody.nextMeasurementDate = addDays(date, 42);

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

function openAddTaskSheet(dateKey, kind) {
  const title = kind === "training" ? "Training item" : "Voeding item";

  const t = prompt(`${title} titel?`);
  if (!t) return;
  const d = prompt("Details (optioneel)?") || "";

  const day = ensureDay(dateKey);
  day[kind].push({
    id: crypto.randomUUID(),
    title: t.trim(),
    details: d.trim(),
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
    if (!dateRaw || !titleRaw) continue;

    const dateKey = coerceDate(dateRaw);
    if (!dateKey) continue;

    const day = ensureDay(dateKey);
    day[kind].push({
      id: crypto.randomUUID(),
      title: titleRaw,
      details: detailsRaw,
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

function ensureDay(dateKey) {
  if (!state.plans.byDate[dateKey]) {
    state.plans.byDate[dateKey] = { training: [], voeding: [] };
  } else {
    if (!Array.isArray(state.plans.byDate[dateKey].training)) state.plans.byDate[dateKey].training = [];
    if (!Array.isArray(state.plans.byDate[dateKey].voeding)) state.plans.byDate[dateKey].voeding = [];
  }
  return state.plans.byDate[dateKey];
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
  if (s.plans?.byDate) out.plans.byDate = s.plans.byDate;
  if (s.inbody) out.inbody = { ...out.inbody, ...s.inbody };
  out.version = APP_VERSION;
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
