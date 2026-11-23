// The guided setup: one page with four questions that builds an object for a room. Used by the Crescendo page and,
// in place, by the card's settings. It only reports its result; whoever shows it creates or changes the object.

const shared = await import(new URL(`./crescendo-shared.js${new URL(import.meta.url).search}`, import.meta.url).href);
const {
  DAY_BUTTONS,
  areaIdOf,
  areaName,
  byPosition,
  clamp,
  commonName,
  curvePreview,
  esc,
  fillAuto,
  fitValue,
  friendly,
  isDark,
  lampAt,
  langOf,
  lightA,
  lightColor,
  lumOf,
  newId,
  newLight,
  rampColor,
  roomGradient,
  seriesVar,
  startSort,
  storeAuto,
  tr,
} = shared;

// Where lights may come on and reach their full brightness when they follow one another.
const STARTS = [0, 10, 25, 40, 60];
const ENDS = [40, 60, 80, 100];
const WARM = 2700,
  NEUTRAL = 4000;
const PREVIEW_GAP = 400;

// The white tone at a position, blended the way the lights do it.
const kelvinAt = (tone, p) => (tone === "warm" ? WARM : Math.round(1e6 / (1e6 / WARM + (1e6 / NEUTRAL - 1e6 / WARM) * clamp((p - 10) / 90, 0, 1)) / 50) * 50);

/**
 * Builds lights, stops and automatic points.
 * items: [{ ids, lights }] in the order they come on. Every item is one light or a group set the same.
 */
export function buildSetup(hass, items, { way, tone, positions }) {
  const n = items.length;
  const plans = items.map((item, k) => {
    if (way === "together" || n === 1) return { item, start: 0, end: 100 };
    return { item, start: STARTS[Math.floor((k * STARTS.length) / n)], end: ENDS[Math.round((k * (ENDS.length - 1)) / (n - 1))] };
  });
  const wanted = new Set(n ? [0, 10, 100, ...positions] : [0, 100]);
  for (const p of plans) {
    wanted.add(p.start);
    wanted.add(p.end);
  }
  const at = [...wanted].sort((a, b) => a - b);
  const stops = at.map((position) => ({ position, values: {}, _auto: {} }));
  for (const { item, start, end } of plans) {
    const level = (p) => (p <= start ? 0 : p >= end ? 100 : Math.max(1, Math.round(((p - start) / (end - start)) * 100)));
    // Set by hand would be: where it is still off, where it comes on, where it is full. All else lies between them.
    const first = at.find((p) => p > start);
    const fixed = new Set([0, start, first, end, 100]);
    for (const light of item.lights)
      for (const stop of stops) {
        const p = stop.position;
        stop.values[light.entity_id] = p === 0 ? { brightness: 0 } : fitValue(hass, light, { brightness: level(p), kelvin: kelvinAt(tone, p) });
        if (!fixed.has(p)) stop._auto[light.entity_id] = true;
      }
  }
  return fillAuto({ lights: items.flatMap((i) => i.lights), stops });
}

const STYLE = `
:host { display: block; color: var(--ink); font-size: 14px; line-height: 1.45;
  --ink: var(--primary-text-color, #171d2d); --muted: var(--secondary-text-color, #566077); --surface: var(--card-background-color, #fff); --line: var(--divider-color, #d4dae6); --accent: var(--primary-color, #2f5fd0); --accent-ink: var(--text-primary-color, #fff); --accent-soft: color-mix(in srgb, var(--accent) 16%, transparent); --well: color-mix(in srgb, var(--ink) 11%, var(--surface));
  --cr-s1:#2a78d6; --cr-s2:#eb6834; --cr-s3:#1baf7a; --cr-s4:#eda100; --cr-s5:#e87ba4; --cr-s6:#008300; --cr-s7:#6250d6; --cr-s8:#e34948; }
:host([dark]) { --cr-s1:#3987e5; --cr-s2:#d95926; --cr-s3:#199e70; --cr-s4:#c98500; --cr-s5:#d55181; --cr-s6:#008300; --cr-s7:#9085e9; --cr-s8:#e66767; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
h2, h3, p { margin: 0; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.box { display: grid; gap: 22px; max-width: 680px; }
h2 { font-size: 18px; font-weight: 650; }
.q { display: grid; gap: 8px; min-width: 0; }
.q h3 { font-size: 15px; font-weight: 600; }
.hint { color: var(--muted); font-size: 13px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; min-height: 36px; padding: 5px 9px; max-width: 100%; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 8px; }
.two label { display: grid; gap: 3px; font-size: 13px; color: var(--muted); min-width: 0; }
.two .field { color: var(--ink); width: 100%; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 999px; padding: 5px 12px; font-size: 13px; text-align: left; }
.chip[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); font-weight: 600; }
.chip[aria-pressed="true"]::before { content: "✓ "; }
.seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; background: var(--line); border-radius: 10px; justify-self: start; }
.seg button { border: 0; background: transparent; padding: 6px 14px; border-radius: 8px; font-weight: 500; color: var(--muted); }
.seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); font-weight: 600; }
.order { display: grid; border-top: 1px solid var(--line); }
.orow { display: grid; grid-template-columns: auto 14px minmax(0, 1fr) auto auto; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--line); background: var(--surface); }
.orow.sorting { position: relative; z-index: 1; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.orow span { overflow-wrap: anywhere; }
.key { width: 14px; height: 3px; border-radius: 2px; }
.grip { border: 0; background: transparent; color: var(--muted); width: 28px; height: 32px; padding: 0; cursor: grab; touch-action: none; font-size: 16px; line-height: 1; }
.step { border: 1px solid var(--line); background: transparent; border-radius: 8px; width: 32px; height: 32px; padding: 0; }
.step:disabled { opacity: .35; cursor: default; }
.look { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; }
.look svg { width: 100%; height: auto; display: block; }
.tline { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.c-axis { stroke: var(--line); stroke-width: 1; }
.lamps { display: flex; flex-wrap: wrap; gap: 6px; }
.lamp { border-radius: 8px; padding: 4px 9px; font-size: 12.5px; background: var(--well); display: inline-flex; gap: 6px; align-items: center; }
.lamp i { font-style: normal; font-variant-numeric: tabular-nums; opacity: .85; }
.scrub { display: flex; gap: 10px; align-items: center; }
.scrub output { min-width: 4ch; font-variant-numeric: tabular-nums; text-align: right; }
input.grad { appearance: none; -webkit-appearance: none; flex: 1; min-width: 0; height: 26px; background: transparent; margin: 0; }
input.grad::-webkit-slider-runnable-track { height: 16px; border-radius: 6px; background-color: var(--well); background-image: var(--grad, none); }
input.grad::-moz-range-track { height: 16px; border-radius: 6px; background-color: var(--well); background-image: var(--grad, none); }
input.grad::-webkit-slider-thumb { -webkit-appearance: none; width: 8px; height: 26px; margin-top: -5px; border-radius: 3px; background: #fff; border: 1px solid #101318; }
input.grad::-moz-range-thumb { width: 7px; height: 24px; border-radius: 3px; background: #fff; border: 1px solid #101318; }
.check { display: inline-flex; gap: 8px; align-items: center; font-size: 13.5px; }
.btn { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; min-height: 38px; padding: 5px 14px; font-weight: 500; }
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.err { color: var(--error-color, #b3261e); }
`;

class CrescendoSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pos = 40;
    this._way = "together";
    this._tone = "rise";
    this._picked = [];
    this._order = [];
    this._buttons = new Set(DAY_BUTTONS.map(([p]) => p));
    this._area = null;
    this._name = "";
    this._nameTouched = false;
    this._all = false;
    this._live = false;
    this._busy = false;
    this._error = "";
    this._shown = null;
    this._showing = false;
    const r = this.shadowRoot;
    r.addEventListener("click", (e) => this._onClick(e));
    r.addEventListener("change", (e) => this._onChange(e));
    r.addEventListener("input", (e) => this._onInput(e));
    r.addEventListener("keydown", (e) => this._onKey(e));
    r.addEventListener("pointerdown", (e) => {
      const grip = e.target.closest?.(".grip");
      if (grip) startSort(e, grip, (keys) => this._setOrder(keys));
    });
  }

  // { object } builds anew for an existing object, { titles } are the names already taken, { empty } allows no lights.
  start({ object = null, titles = [], empty = true, cancel = true, first = false } = {}) {
    this._object = object;
    this._titles = titles;
    this._empty = empty;
    this._cancel = cancel;
    this._first = first;
    if (object) {
      this._name = object.title;
      this._nameTouched = true;
      this._picked = object.options.lights.map((l) => l.entity_id);
      if (object.options.buttons?.length) this._buttons = new Set();
      const areas = new Set(this._picked.map((id) => areaIdOf(this._hass, id)).filter(Boolean));
      this._area = areas.size === 1 ? [...areas][0] : this._picked.length ? "" : null;
      this._order = this._items().map((i) => i.key);
    }
    this._started = true;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const dark = isDark(this.isConnected ? this : null, hass);
    if (dark !== this._dark) {
      this._dark = dark;
      this.toggleAttribute("dark", dark);
      if (this._started) this._render();
    }
  }

  // Taken off the page, a preview ends; put back, the box shows that.
  connectedCallback() {
    const box = this.shadowRoot.getElementById("live");
    if (box) box.checked = this._live;
  }

  disconnectedCallback() {
    this._restore();
  }

  get _t() {
    return tr(this._hass);
  }

  // Lights that can be chosen: no Crescendo objects, nothing hidden and no status lights of devices.
  _lights() {
    const h = this._hass;
    return Object.keys(h.states)
      .filter((id) => id.startsWith("light.") && !h.states[id].attributes?.crescendo)
      .filter((id) => !(h.entities?.[id]?.hidden || h.entities?.[id]?.entity_category) || this._picked.includes(id))
      .map((id) => ({ id, name: friendly(h, id), area: areaIdOf(h, id), members: h.states[id].attributes?.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _areas() {
    const count = new Map();
    for (const l of this._lights()) if (l.area) count.set(l.area, (count.get(l.area) || 0) + 1);
    return [...count.keys()].map((id) => ({ id, name: this._hass.areas?.[id]?.name || id, count: count.get(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }

  // A group of lights stays out while its lights are there themselves, or both would be dimmed.
  _pickArea(area) {
    this._area = area;
    const here = area ? this._lights().filter((l) => l.area === area) : [];
    const isGroup = (l) => Array.isArray(l.members) || this._hass.states[l.id].attributes?.is_hue_group;
    const single = here.filter((l) => !isGroup(l));
    this._picked = (single.length ? single : here).map((l) => l.id);
    this._order = this._items().map((i) => i.key);
    if (!this._nameTouched) this._name = area ? this._freeName(this._hass.areas?.[area]?.name || "") : "";
  }

  _freeName(base) {
    if (!base) return "";
    const taken = new Set(this._titles);
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
    return name;
  }

  // The chosen lights as they come on; lights the object groups stay together.
  _items() {
    const h = this._hass;
    const out = [],
      done = new Set();
    const known = new Map((this._object?.options.lights || []).map((l) => [l.entity_id, l]));
    const light = (id) => (known.has(id) ? { ...known.get(id) } : newLight(h, id));
    for (const id of this._picked) {
      if (done.has(id)) continue;
      const g = (this._object?.options.groups || []).find((x) => x.lights.includes(id));
      const ids = g ? g.lights.filter((x) => this._picked.includes(x)) : [id];
      ids.forEach((x) => done.add(x));
      const name = ids.length > 1 ? (g.name || "").trim() || commonName(ids.map((x) => friendly(h, x))) : friendly(h, id);
      out.push({ key: ids.join(","), ids, name, lights: ids.map(light) });
    }
    const at = (i) => {
      const k = this._order.indexOf(i.key);
      return k < 0 ? 1e6 : k;
    };
    return out.map((i, k) => [i, k]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(([i]) => i);
  }

  _result() {
    const items = this._items();
    const de = langOf(this._hass) === "de";
    const chosen = items.length ? DAY_BUTTONS.filter(([p]) => this._buttons.has(p)) : [];
    const built = buildSetup(this._hass, items, { way: this._way, tone: this._tone, positions: chosen.map(([p]) => p) });
    const kept = this._object?.options.buttons || [];
    const buttons = chosen
      .map(([position, name, icon]) => ({ id: newId(), name: de ? name[1] : name[0], position, duration: 0, icon }))
      .filter((b) => !kept.some((k) => k.position === b.position || k.name === b.name));
    return { items, lights: built.lights, stops: built.stops, buttons: byPosition([...kept, ...buttons]) };
  }

  _options() {
    const res = this._result();
    const base = this._object ? JSON.parse(JSON.stringify(this._object.options)) : { devices: [], groups: [] };
    const ids = new Set(res.lights.map((l) => l.entity_id));
    const options = {
      ...base,
      lights: res.lights,
      stops: res.stops,
      buttons: res.buttons,
      groups: (base.groups || []).map((g) => ({ ...g, lights: g.lights.filter((id) => ids.has(id)) })).filter((g) => g.lights.length >= 2),
    };
    // A copy with the automatic points as they are stored.
    return storeAuto(JSON.parse(JSON.stringify(options)));
  }

  _hasWhite() {
    return this._items().some((i) => i.lights.some((l) => l.mode !== "onoff" && l.mode !== "dim"));
  }

  // -- rendering --------------------------------------------------------------------------------

  _render() {
    if (!this._started || !this._hass) return;
    const t = this._t;
    const items = this._items();
    const areas = this._areas();
    const inArea = this._lights();
    const shown = this._all || !this._area ? inArea : inArea.filter((l) => l.area === this._area || this._picked.includes(l.id));
    const chip = (act, value, on, label, title = "") => `<button class="chip" data-act="${act}" data-v="${esc(value)}" aria-pressed="${on}"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;
    const seg = (act, value, pairs) => `<div class="seg" role="group">${pairs.map(([v, l]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${value === v}">${esc(l)}</button>`).join("")}</div>`;
    const de = langOf(this._hass) === "de";
    const showLights = this._area !== null;
    const orderRows = items
      .map(
        (i, k) => `<div class="orow" data-sortrow="${esc(i.key)}"><button class="grip" data-key="${esc(i.key)}" aria-label="${esc(t(`Move ${i.name}`, `${i.name} verschieben`))}" title="${esc(t("Drag, or use the arrow keys", "Ziehen oder Pfeiltasten benutzen"))}">⠿</button><i class="key" style="background:${seriesVar(k)}"></i><span>${esc(i.name)}</span><button class="step" data-act="up" data-v="${esc(i.key)}"${k === 0 ? " disabled" : ""} aria-label="${esc(t("Earlier", "Früher"))}">↑</button><button class="step" data-act="down" data-v="${esc(i.key)}"${k === items.length - 1 ? " disabled" : ""} aria-label="${esc(t("Later", "Später"))}">↓</button></div>`,
      )
      .join("");
    const kept = this._object?.options.buttons || [];
    const questions = [];
    questions.push(`<div class="q"><h3>${esc(t("Which room?", "Welcher Raum?"))}</h3>
      <div class="two"><label>${esc(t("Room", "Raum"))}<select class="field" id="area"><option value="?"${this._area === null ? " selected" : ""} disabled>${esc(t("Please choose", "Bitte wählen"))}</option>${areas.map((a) => `<option value="${esc(a.id)}"${a.id === this._area ? " selected" : ""}>${esc(a.name)} (${a.count})</option>`).join("")}<option value=""${this._area === "" ? " selected" : ""}>${esc(t("Choose lights freely", "Leuchten frei wählen"))}</option></select></label>
      ${showLights ? `<label>${esc(t("Name", "Name"))}<input class="field" id="name" value="${esc(this._name)}" placeholder="${esc(t("Name of the object", "Name des Objekts"))}"></label>` : ""}</div>
      ${
        showLights
          ? `<div class="chips" role="group" aria-label="${esc(t("Lights", "Leuchten"))}">${shown
              .map((l) => chip("light", l.id, this._picked.includes(l.id), l.name, areaName(this._hass, l.id)))
              .join("")}${shown.length < inArea.length ? `<button class="chip" data-act="all">+ ${esc(t("Lights of other rooms", "Leuchten anderer Räume"))}</button>` : ""}</div>
            <p class="hint">${esc(shown.length ? t("Tap a light to leave it out or add it.", "Tippe eine Leuchte an, um sie wegzulassen oder aufzunehmen.") : t("There is no light to choose from.", "Es gibt keine Leuchte zur Auswahl."))}</p>`
          : ""
      }</div>`);
    if (items.length) {
      if (items.length > 1)
        questions.push(`<div class="q"><h3>${esc(t("How should it get brighter?", "Wie soll es heller werden?"))}</h3>
        ${seg("way", this._way, [
          ["together", t("All together", "Alle zusammen")],
          ["sequence", t("One after another", "Nacheinander")],
        ])}
        ${this._way === "sequence" ? `<p class="hint">${esc(t("Put them in order: the first one comes on first, the last one only when it gets really bright.", "Bring sie in Reihenfolge: Die oberste geht zuerst an, die unterste erst, wenn es richtig hell wird."))}</p><div class="order">${orderRows}</div>` : ""}</div>`);
      if (this._hasWhite())
        questions.push(`<div class="q"><h3>${esc(t("Which light?", "Welches Licht?"))}</h3>${seg("tone", this._tone, [
          ["rise", t("Warm when dim, neutral when bright", "Gedimmt warm, hell neutral")],
          ["warm", t("Always warm", "Immer warm")],
        ])}</div>`);
      questions.push(`<div class="q"><h3>${esc(t("Which buttons?", "Welche Buttons?"))}</h3><div class="chips">${DAY_BUTTONS.map(([p, name]) => chip("button", p, this._buttons.has(p), `${de ? name[1] : name[0]} · ${p} %`)).join("")}</div>
        ${kept.length ? `<p class="hint">${esc(t(`The object keeps its buttons: ${kept.map((b) => b.name).join(", ")}.`, `Das Objekt behält seine Buttons: ${kept.map((b) => b.name).join(", ")}.`))}</p>` : ""}</div>`);
      questions.push(`<div class="look" id="look">${this._lookHtml()}</div>`);
    }
    const title = this._object ? t(`Set up “${this._object.title}”`, `„${this._object.title}“ einrichten`) : t("New object for a room", "Neues Objekt für einen Raum");
    const done = this._object ? t("Apply", "Übernehmen") : t("Create", "Anlegen");
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="box"><h2>${esc(title)}</h2>${questions.join("")}
      ${this._error ? `<p class="err" role="alert">${esc(this._error)}</p>` : ""}
      <div class="row"><button class="btn primary" data-act="done"${items.length && !this._busy ? "" : " disabled"}>${esc(done)}</button>
      ${this._empty && !this._object && showLights && !items.length ? `<button class="btn" data-act="empty"${this._busy ? " disabled" : ""}>${esc(t("Create without lights", "Ohne Leuchten anlegen"))}</button>` : ""}
      ${this._cancel ? `<button class="btn" data-act="cancel">${esc(this._first ? t("Set up by hand", "Von Hand einrichten") : t("Cancel", "Abbrechen"))}</button>` : ""}</div></div>`;
    this._paint();
  }

  _lookHtml() {
    const t = this._t;
    const res = this._result();
    const list = res.items.map((i, slot) => ({ ids: i.ids, slot }));
    return `${curvePreview(list, res.stops, t("Brightness of each light over the scale", "Helligkeit jeder Leuchte über die Skala"))}
      <div class="scrub"><input type="range" class="grad" id="pos" min="0" max="100" step="1" value="${this._pos}" aria-label="${esc(t("Try a position", "Position ausprobieren"))}"><output id="posOut"></output></div>
      <div class="lamps" id="lamps"></div>
      <label class="check"><input type="checkbox" id="live"${this._live ? " checked" : ""}> ${esc(t("Show on the real lights; afterwards they return to how they were", "An den echten Leuchten zeigen; danach sind sie wieder wie vorher"))}</label>`;
  }

  // The preview follows the slider without building the page anew.
  _paint() {
    const r = this.shadowRoot;
    const pos = r.getElementById("pos");
    if (!pos) {
      // Without lights there is nothing to show any more.
      if (this._live) this._restore();
      return;
    }
    const res = this._result();
    pos.style.setProperty("--grad", roomGradient(res, undefined, undefined, this._dark));
    r.getElementById("posOut").textContent = `${this._pos} %`;
    r.getElementById("lamps").innerHTML = res.items
      .map((i) => {
        const l = lampAt(res, i.lights[0], this._pos);
        const on = l.v > 0.3;
        const paint = rampColor(l.c, 0.25 + 0.75 * (l.v / 100), this._dark);
        const fg = on && (this._dark || l.v > 50) ? (lumOf(lightColor(l.c)) > 0.5 ? "#171d2d" : "#fff") : "inherit";
        return `<span class="lamp" style="${on ? `background:${this._dark ? paint : lightA(l.c, 0.25 + 0.75 * (l.v / 100))};color:${fg}` : ""}">${esc(i.name)} <i>${on ? `${Math.round(l.v)} %` : esc(this._t("off", "aus"))}</i></span>`;
      })
      .join("");
    if (this._live) this._preview();
  }

  _changed() {
    this._error = "";
    this._render();
  }

  // -- trying it on the real lights ---------------------------------------------------------------

  // Home Assistant shows it and remembers how each light was. It gives them back, also when this page just closes.
  _preview() {
    clearTimeout(this._previewTimer);
    const wait = PREVIEW_GAP - (Date.now() - (this._previewLast || 0));
    if (wait > 0) {
      this._previewTimer = setTimeout(() => this._live && this.isConnected && this._preview(), wait);
      return;
    }
    const options = this._options();
    const key = JSON.stringify([options.lights, options.stops, this._pos]);
    if (this._shown === key) return;
    this._shown = key;
    this._previewLast = Date.now();
    this._showing = true;
    this._hass.callWS({ type: "cloudless_crescendo/setup/preview", options, position: this._pos }).catch(() => {});
  }

  _restore() {
    clearTimeout(this._previewTimer);
    this._live = false;
    this._shown = null;
    if (!this._showing) return;
    this._showing = false;
    this._hass.callWS({ type: "cloudless_crescendo/setup/preview_end" }).catch(() => {});
  }

  // -- answers ------------------------------------------------------------------------------------

  _setOrder(keys) {
    this._order = keys;
    this._changed();
  }

  _move(key, by) {
    const keys = this._items().map((i) => i.key);
    const i = keys.indexOf(key),
      to = clamp(i + by, 0, keys.length - 1);
    if (i < 0 || to === i) return;
    keys.splice(to, 0, keys.splice(i, 1)[0]);
    this._setOrder(keys);
  }

  _onKey(e) {
    const grip = e.target.closest?.(".grip");
    if (!grip || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const key = grip.dataset.key;
    this._move(key, e.key === "ArrowUp" ? -1 : 1);
    [...this.shadowRoot.querySelectorAll(".grip")].find((g) => g.dataset.key === key)?.focus();
  }

  _onInput(e) {
    if (e.target.id === "pos") {
      this._pos = +e.target.value;
      this._paint();
    } else if (e.target.id === "name") {
      this._name = e.target.value;
      this._nameTouched = true;
    }
  }

  _onChange(e) {
    if (e.target.id === "area") {
      this._all = false;
      this._pickArea(e.target.value);
      this._changed();
    } else if (e.target.id === "live") {
      if (e.target.checked) {
        this._live = true;
        this._paint();
      } else this._restore();
    }
  }

  _onClick(e) {
    const a = e.target.closest?.("[data-act]");
    if (!a) return;
    const v = a.dataset.v;
    switch (a.dataset.act) {
      case "light":
        this._picked = this._picked.includes(v) ? this._picked.filter((id) => id !== v) : [...this._picked, v];
        this._order = this._items().map((i) => i.key);
        this._changed();
        break;
      case "all":
        this._all = true;
        this._changed();
        break;
      case "way":
        this._way = v;
        this._changed();
        break;
      case "tone":
        this._tone = v;
        this._changed();
        break;
      case "up":
      case "down":
        this._move(v, a.dataset.act === "up" ? -1 : 1);
        break;
      case "button":
        if (this._buttons.has(+v)) this._buttons.delete(+v);
        else this._buttons.add(+v);
        this._changed();
        break;
      case "cancel":
        this._restore();
        this.dispatchEvent(new CustomEvent("setup-cancel"));
        break;
      case "done":
      case "empty":
        this._finish();
        break;
    }
  }

  async _finish() {
    const t = this._t;
    const name = this._name.trim();
    if (!name) {
      this._error = t("Give the object a name first.", "Gib dem Objekt zuerst einen Namen.");
      this._render();
      this.shadowRoot.getElementById("name")?.focus();
      return;
    }
    const options = this._options();
    this._restore();
    if (this._object) {
      this.dispatchEvent(new CustomEvent("setup-apply", { detail: { title: name, options } }));
      return;
    }
    this._busy = true;
    this._render();
    try {
      const res = await this._hass.callWS({ type: "cloudless_crescendo/object/create", title: name, lights: options.lights.map((l) => l.entity_id), options });
      this.dispatchEvent(new CustomEvent("setup-created", { detail: { ...res, title: name, empty: !options.lights.length } }));
    } catch (err) {
      this._error = t(`The object could not be created: ${err?.message || err}`, `Das Objekt ließ sich nicht anlegen: ${err?.message || err}`);
      this._busy = false;
      this._render();
    }
  }
}

// Home Assistant replaces its element registry while its app starts, so this is defined when first needed.
export function createSetup(hass, settings) {
  if (!customElements.get("crescendo-setup")) customElements.define("crescendo-setup", CrescendoSetup);
  const el = document.createElement("crescendo-setup");
  el.hass = hass;
  el.start(settings);
  return el;
}

