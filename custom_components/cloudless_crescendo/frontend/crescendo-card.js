// The Crescendo card: one card with switchable designs, for Crescendo objects and other devices.

const shared = await import(new URL(`./crescendo-shared.js${new URL(import.meta.url).search}`, import.meta.url).href);
const {
  clamp,
  comma,
  controllerFor,
  css,
  esc,
  formatValue,
  friendly,
  hexRgb,
  isDark,
  kRgb,
  lampAt,
  laneGradient,
  langOf,
  lightA,
  lightColor,
  lumOf,
  rampColor,
  rgbHex,
  roomGradient,
  roomLight,
  seriesVar,
  sendValue,
  tempColor,
  tr,
  units,
} = shared;

const DESIGNS = [
  ["gradient", "Room gradient", "Raumverlauf"],
  ["fader", "Vertical fader", "Hochkant"],
  ["dial", "Dial", "Drehregler"],
  ["scenes", "Scenes", "Szenen"],
  ["columns", "Columns", "Säulen"],
  ["chart", "Chart", "Diagramm"],
  ["picture", "Room picture", "Raumbild"],
  ["mixer", "Mixer", "Mischpult"],
];
const AUTO_POS = { fader: "right", scenes: "top" };
const DEFAULTS = {
  design: "gradient",
  buttons_on: true,
  show_value: false,
  show_duration: false,
  button_position: "auto",
  slider: "wide",
  color: "light",
  custom_color: "#7a5cff",
  group: true,
  columns_operable: true,
  snap: true,
  glow: true,
  show_lanes: true,
  color_control: false,
  tap_duration: 1,
};

const STYLE = `
:host { display: block; --cr-ink: var(--primary-text-color, #171d2d); --cr-muted: var(--secondary-text-color, #566077);
  --cr-bg: var(--ha-card-background, var(--card-background-color, #fff)); --cr-line: var(--divider-color, #d4dae6);
  --cr-accent: var(--primary-color, #2f5fd0); --cr-accent-ink: var(--text-primary-color, #fff);
  --cr-well: color-mix(in srgb, var(--cr-ink) 11%, var(--cr-bg)); --p: 0%; --pn: 0; --reg: var(--cr-accent); --glowc: transparent;
  --cr-s1:#2a78d6; --cr-s2:#eb6834; --cr-s3:#1baf7a; --cr-s4:#eda100; --cr-s5:#e87ba4; --cr-s6:#008300; --cr-s7:#6250d6; --cr-s8:#e34948; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
ha-card, .card { display: block; position: relative; height: 100%; overflow: visible; background: var(--cr-bg); color: var(--cr-ink); box-shadow: var(--ha-card-box-shadow, none), 0 0 30px 3px var(--glowc); border-radius: var(--ha-card-border-radius, 16px); }
.cc { container-type: inline-size; padding: 16px; display: grid; gap: 14px; min-width: 0; }
button { font: inherit; color: inherit; cursor: pointer; }
.progress { position: absolute; left: 16px; right: 16px; top: 5px; height: 4px; border-radius: 2px; background: var(--cr-line); overflow: hidden; pointer-events: none; }
.progress i { display: block; height: 100%; width: 0; background: var(--cr-accent); }
.head { display: flex; gap: 12px; align-items: center; justify-content: space-between; min-width: 0; }
.head > div:first-child { min-width: 0; flex: 1; }
.name { margin: 0; font-size: 17.5px; font-weight: 600; overflow-wrap: anywhere; line-height: 1.25; }
.status { margin: 0; font-size: 13px; color: var(--cr-muted); min-height: 19px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.value { font-size: 28px; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -.03em; white-space: nowrap; line-height: 1; }
.value small, .big small { font-size: 14px; color: var(--cr-muted); margin-left: 2px; letter-spacing: 0; }
.big { font-size: 54px; font-weight: 300; font-variant-numeric: tabular-nums; letter-spacing: -.03em; white-space: nowrap; line-height: 1; }
.big small { font-size: 20px; }
.power { width: 42px; height: 42px; flex: none; border-radius: 50%; border: 1px solid var(--cr-line); background: transparent; display: grid; place-items: center; color: var(--cr-muted); padding: 0; }
.power[aria-pressed="true"] { background: var(--cr-accent); border-color: var(--cr-accent); color: var(--cr-accent-ink); }
.power .stop { display: none; }
.long .power .pw { display: none; }
.long .power .stop { display: block; }
.readonly .power { display: none; }
.body { display: grid; gap: 14px; min-width: 0; }
.reg { display: grid; gap: 10px; min-width: 0; }
[data-pos="top"] .btns { order: -1; }
[data-pos="left"] .body { grid-template-columns: auto minmax(0, 1fr); }
[data-pos="left"] .btns { order: -1; }
[data-pos="right"] .body { grid-template-columns: minmax(0, 1fr) auto; }
[data-pos="left"] .presets, [data-pos="right"] .presets, [data-pos="left"] .scenes, [data-pos="right"] .scenes { grid-template-columns: minmax(78px, 112px); }
.btns { min-width: 0; align-self: start; }
.presets { display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 8px; }
.preset { border: 1px solid var(--cr-line); background: transparent; border-radius: 10px; padding: 9px 8px; display: grid; gap: 1px; text-align: center; justify-items: center; min-height: 40px; align-content: center; }
.preset b { font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.preset span { font-size: 11.5px; line-height: 1.3; color: var(--cr-muted); }
.preset.on { border-color: var(--cr-accent); background: color-mix(in srgb, var(--cr-accent) 16%, transparent); }
.scenes { display: grid; grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); gap: 8px; }
.scenes.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.preset.scene { min-height: 74px; align-content: end; border: 0; }
.preset.scene span { color: inherit; opacity: .85; }
.preset.scene.on { outline: 2px solid var(--cr-accent); outline-offset: 2px; }
[data-slider] { user-select: none; -webkit-user-select: none; }
[data-slider]:focus-visible { outline: 2px solid var(--cr-accent); outline-offset: 2px; }
.track { position: relative; height: 62px; border-radius: 14px; overflow: hidden; background-color: var(--cr-well); touch-action: pan-y; cursor: ew-resize; }
.dim { position: absolute; inset: 0 0 0 var(--p); background: color-mix(in srgb, var(--cr-well) 78%, transparent); }
.cover { position: absolute; left: 0; right: 0; top: 0; bottom: var(--p); background: color-mix(in srgb, var(--cr-well) 78%, transparent); }
.thumb { position: absolute; top: 7px; bottom: 7px; width: 6px; left: clamp(4px, calc(var(--p) - 3px), calc(100% - 10px)); border-radius: 3px; background: #fff; box-shadow: 0 0 0 1px rgba(17,21,42,.4), 0 1px 5px rgba(0,0,0,.35); }
.slim { position: relative; height: 34px; touch-action: pan-y; cursor: ew-resize; }
.slim-track { position: absolute; left: 0; right: 0; top: 50%; height: 12px; margin-top: -6px; border-radius: 6px; background-color: var(--cr-well); overflow: hidden; }
.knob { position: absolute; top: 50%; left: clamp(0px, calc(var(--p) - 12px), calc(100% - 24px)); width: 24px; height: 24px; margin-top: -12px; border-radius: 50%; background: #fff; border: 2px solid var(--cr-ink); box-shadow: 0 1px 4px rgba(0,0,0,.3); }
.tick .thumb, .tick .knob, .tick .dial-knob { filter: drop-shadow(0 0 5px var(--cr-accent)); }
[data-sl="wide"] .regh .slim { display: none; }
[data-sl="slim"] .regh .track { display: none; }
[data-sl="none"] .regh { display: none; }
[data-color="solid"] .js-grad, [data-color="solid"] .js-vgrad { background-color: var(--reg); background-image: none !important; }
.ticks { position: relative; height: 17px; font-size: 11.5px; line-height: 1; color: var(--cr-muted); font-variant-numeric: tabular-nums; }
.ticks span { position: absolute; top: 0; transform: translateX(-50%); }
.ticks span::before { content: ""; display: block; width: 1px; height: 4px; margin: 0 auto 2px; background: var(--cr-line); }
.ticks .first { transform: none; }
.ticks .first::before { margin-left: 0; }
.ticks .last { transform: translateX(-100%); }
.ticks .last::before { margin-right: 0; }
.lanes { position: relative; display: grid; gap: 6px; --nw: 96px; }
.lane { display: grid; grid-template-columns: calc(var(--nw) - 8px) minmax(0, 1fr); gap: 8px; align-items: center; font-size: 12.5px; color: var(--cr-muted); }
.lane span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lane i { display: block; height: 8px; border-radius: 4px; background-color: var(--cr-well); }
.playhead { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--cr-ink); opacity: .75; left: calc(var(--nw) + (100% - var(--nw)) * var(--pn)); pointer-events: none; }
.fader-row { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 14px; align-items: end; }
.fader { position: relative; height: 280px; border-radius: 22px; background: var(--cr-well); overflow: hidden; touch-action: pan-x; cursor: ns-resize; }
.fader-line { position: absolute; left: 14px; right: 14px; height: 4px; border-radius: 2px; bottom: clamp(8px, calc(var(--p) - 2px), calc(100% - 12px)); background: #fff; box-shadow: 0 0 8px rgba(0,0,0,.5); }
.dial-wrap { position: relative; }
.dial { width: min(100%, 250px); aspect-ratio: 1; margin: 0 auto; touch-action: none; cursor: grab; }
.dial svg { display: block; width: 100%; height: 100%; }
.dial-base { fill: none; stroke-width: 22; stroke-linecap: round; stroke: var(--cr-well); }
.dial-seg { fill: none; stroke-width: 22; }
.dial-tick { stroke: var(--cr-muted); stroke-width: 2; }
.dial-knob { fill: #fff; stroke: var(--cr-ink); stroke-width: 3; }
.dial-center { position: absolute; inset: 0; display: grid; place-content: center; pointer-events: none; }
.bars { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 7px; }
.bar { display: grid; grid-template-rows: 150px auto; gap: 5px; min-width: 0; }
.well { position: relative; overflow: hidden; border-radius: 9px; background: var(--cr-well); }
.well[data-slider] { touch-action: pan-x; cursor: ns-resize; }
.well.dev { box-shadow: inset 0 0 0 2px var(--cr-accent); }
.fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: linear-gradient(0deg, color-mix(in srgb, var(--reg) 35%, transparent), var(--reg)); }
.bar > span, .ch > span { font-size: 11px; line-height: 1.15; text-align: center; color: var(--cr-muted); overflow-wrap: anywhere; }
.reset { border: 1px solid var(--cr-line); background: transparent; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.colorrow { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; font-size: 13.5px; color: var(--cr-muted); }
.colorrow label { display: inline-flex; gap: 8px; align-items: center; }
.colorrow input { width: 44px; height: 32px; padding: 2px; border: 1px solid var(--cr-line); border-radius: 8px; background: transparent; cursor: pointer; }
.chart { display: block; width: 100%; height: auto; touch-action: pan-y; cursor: ew-resize; }
.c-grid { stroke: var(--cr-line); stroke-width: 1; }
.c-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.c-ph { stroke: var(--cr-ink); stroke-width: 1.5; opacity: .7; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: var(--cr-muted); }
.legend span { display: inline-flex; gap: 5px; align-items: center; }
.key { display: inline-block; width: 14px; height: 3px; border-radius: 2px; flex: none; }
.pic { display: block; width: 100%; aspect-ratio: 16 / 10; border-radius: 12px; background: #0a0d1c; }
.mix { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.ch { display: grid; grid-template-rows: auto 170px auto; align-content: start; gap: 5px; min-width: 0; text-align: center; }
.ch b { font-size: 12px; font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ch-fill { position: absolute; left: 0; right: 0; bottom: 0; }
.warning { padding: 16px; color: var(--cr-muted); }
:host([data-dark]) .dim, :host([data-dark]) .cover { background: color-mix(in srgb, var(--cr-well) 90%, transparent); }
:host([data-dark]) .fill { background: var(--reg); }
:host([data-dark]) .dial-base { display: none; }
@container (max-width: 270px) {
  .ticks, .lanes, .status { display: none; }
  .value { font-size: 22px; }
  .big { font-size: 36px; }
  .power { width: 36px; height: 36px; }
  .fader-row { grid-template-columns: minmax(0, 1fr); }
  .fader-row .big { display: none; }
  .fader { height: 170px; }
  .track { height: 48px; }
  .bar { grid-template-rows: 100px; }
  .bar > span, .ch > span { display: none; }
  .ch { grid-template-rows: auto 110px; }
  .presets, .scenes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .preset { padding: 6px 8px; min-height: 34px; }
  .preset.scene { min-height: 46px; }
}
@container (min-width: 470px) {
  [data-pos="bottom"] .body { grid-template-columns: minmax(0, 1fr) minmax(120px, 170px); }
  [data-pos="bottom"] .presets, [data-pos="bottom"] .scenes { grid-template-columns: minmax(0, 1fr); }
  .fader { height: 340px; }
  .bar { grid-template-rows: 210px auto; }
  .ch { grid-template-rows: auto 230px auto; }
  .big { font-size: 66px; }
}
`;

const POWER = `<button class="power js-power" aria-pressed="false"><svg class="pw" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/></svg><svg class="stop" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg></button>`;
const TITLE = `<div><h3 class="name js-name"></h3><p class="status js-status"></p></div>`;
const VALUE = `<div class="value"><span class="js-pos">0</span><small class="js-unit"></small></div>`;
const BIG = `<div class="big"><span class="js-pos">0</span><small class="js-unit"></small></div>`;
const HEAD = `<div class="head">${TITLE}${VALUE}${POWER}</div>`;
const HEAD_PLAIN = `<div class="head">${TITLE}${POWER}</div>`;
const TICKS = `<div class="ticks js-ticks" aria-hidden="true"></div>`;
const REG = `<div class="regh"><div class="track js-grad" data-slider="x"><div class="dim"></div><div class="thumb"></div></div><div class="slim" data-slider="x"><div class="slim-track js-grad"><div class="dim"></div></div><div class="knob"></div></div>${TICKS}</div>`;
const BTNS = `<div class="btns"><div class="presets js-presets"></div></div>`;
const ARC = "M59.29 200.71 A100 100 0 1 1 200.71 200.71";

const TEMPLATES = {
  gradient: `${HEAD}<div class="body"><div class="reg">${REG}</div>${BTNS}</div><div class="lanes js-lanes"></div>`,
  fader: `${HEAD_PLAIN}<div class="body"><div class="reg"><div class="fader-row"><div class="fader js-vgrad" data-slider="y"><div class="cover"></div><div class="fader-line"></div></div>${BIG}</div></div>${BTNS}</div>`,
  dial: `${HEAD_PLAIN}<div class="body"><div class="reg"><div class="dial-wrap"><div class="dial" data-slider="arc"><svg viewBox="0 0 260 260" aria-hidden="true"><path class="dial-base" d="${ARC}"/><g class="js-segs"></g><g class="js-dticks"></g><circle class="dial-knob" cx="59.29" cy="200.71" r="11"/></svg></div><div class="dial-center">${BIG}</div></div></div>${BTNS}</div>`,
  scenes: `${HEAD}<div class="body"><div class="reg">${REG}</div><div class="btns"><div class="scenes js-scenes"></div></div></div>`,
  columns: `${HEAD}<div class="body"><div class="reg"><div class="bars js-bars"></div><button class="reset js-reset" hidden></button>${REG}</div>${BTNS}</div>`,
  chart: `${HEAD}<div class="body"><div class="reg"><div class="js-chart"></div><div class="legend js-legend"></div></div>${BTNS}</div>`,
  picture: `${HEAD}<div class="body"><div class="reg"><canvas class="pic js-pic" aria-hidden="true"></canvas>${REG}</div>${BTNS}</div>`,
  mixer: `${HEAD_PLAIN}<div class="body"><div class="reg"><div class="mix js-mix"></div></div>${BTNS}</div>`,
};

const fmtDur = (lang, s) =>
  s >= 60 ? `${Math.ceil(s / 60)} Min` : `${comma(lang, s.toFixed(s < 10 ? 1 : 0))} s`;

class CrescendoCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("crescendo-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const object = ids.find((id) => hass.states[id].attributes?.crescendo);
    return { entity: object || ids.find((id) => id.startsWith("light.")) || "" };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._drag = null;
    this._raf = 0;
    this._lastSend = 0;
    this._hold = null;
    this._options = null;
    this._curveId = undefined;
    this._fade = null;
    this._photo = null;
    this._built = false;
    this._mix = {};
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("change", (e) => {
      if (e.target.classList?.contains("js-color")) {
        this._hass.callService("light", "turn_on", { rgb_color: hexRgb(e.target.value) }, { entity_id: this._ctl.entityId });
      }
    });
    this.shadowRoot.addEventListener("pointerdown", (e) => this._onDown(e));
    this.shadowRoot.addEventListener("pointermove", (e) => this._onMove(e));
    this.shadowRoot.addEventListener("pointerup", (e) => this._onUp(e));
    this.shadowRoot.addEventListener("pointercancel", () => {
      this._drag = null;
      this._kick();
    });
    this.shadowRoot.addEventListener("keydown", (e) => this._onKey(e));
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Please choose an entity");
    this._config = { ...DEFAULTS, ...config };
    this._built = false;
    if (this._config.photo !== this._photoUrl) this._loadPhoto();
    if (this._hass) this._update(true);
  }

  getCardSize() {
    return { fader: 7, dial: 7, columns: 7, mixer: 6 }[this._config?.design] || 5;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 3, rows: "auto" };
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    if (!this._config) return;
    const changed =
      !old ||
      old.states[this._config.entity] !== hass.states[this._config.entity] ||
      (this._config.design === "mixer" && (this._config.channels || []).some((c) => old.states[c] !== hass.states[c]));
    if (changed || !this._built) this._update(false);
    if (old && (old.themes?.darkMode !== hass.themes?.darkMode || old.themes?.theme !== hass.themes?.theme)) {
      setTimeout(() => this._recheckDark(), 200);
    }
  }

  connectedCallback() {
    this._recheckDark();
    this._kick();
  }

  // The colors depend on the ground the card sits on, which is only known once it is on the page.
  _recheckDark() {
    const card = this.shadowRoot.querySelector(".card");
    if (this._built && card && isDark(card, this._hass) !== this._dark) {
      this._built = false;
      this._update(false);
    }
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  get _t() {
    return tr(this._hass);
  }

  _update(force) {
    const hass = this._hass,
      cfg = this._config;
    const ctl = controllerFor(hass, cfg.entity, cfg);
    this._ctl = ctl;
    if (!ctl.state) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="card"><div class="warning">${esc(this._t("Not found", "Nicht gefunden"))}: ${esc(cfg.entity)}</div></ha-card>`;
      this._built = false;
      return;
    }
    const curveId = ctl.state.attributes.curve_id;
    if (ctl.crescendo && curveId !== this._curveId) {
      this._curveId = curveId;
      hass
        .callWS({ type: "cloudless_crescendo/object", entity_id: cfg.entity })
        .then((res) => {
          this._options = res.options;
          this._built = false;
          this._update(true);
        })
        .catch(() => {});
    }
    if (!ctl.crescendo) this._options = null;
    this._trackFade(ctl);
    if (!this._built || force) this._build();
    this._kick();
  }

  // Follows a fade from what the state last said, without relying on synchronized clocks.
  _trackFade(ctl) {
    const a = ctl.state.attributes;
    if (!ctl.crescendo || !a.fading || a.target_position === undefined) {
      this._fade = null;
      return;
    }
    const started = Date.parse(a.fade_started),
      ends = Date.parse(a.fade_ends);
    const total = Math.max(0.001, (ends - started) / 1000);
    if (this._fade && this._fade.key === a.fade_started) {
      this._fade.pos = a.position;
      this._fade.at = performance.now();
      return;
    }
    this._fade = {
      key: a.fade_started,
      from: a.fade_from,
      target: a.target_position,
      total,
      rate: (a.target_position - a.fade_from) / total,
      pos: a.position,
      at: performance.now(),
    };
  }

  _position() {
    if (this._drag && this._drag.kind === "main" && this._drag.moved) return this._drag.pos;
    if (this._fade) {
      const f = this._fade;
      const p = f.pos + (f.rate * (performance.now() - f.at)) / 1000;
      return f.rate >= 0 ? Math.min(p, f.target) : Math.max(p, f.target);
    }
    if (this._hold) {
      if (performance.now() < this._hold.until && Math.abs(this._ctl.pos - this._hold.pos) > 0.7) return this._hold.pos;
      this._hold = null;
    }
    return this._ctl.pos;
  }

  _override() {
    const a = this._ctl.state?.attributes;
    if (!a?.color_override) return null;
    if (a.rgb_color) return { rgb: a.rgb_color, white: a.color_mode === "color_temp" };
    return null;
  }

  _buttons() {
    const cfg = this._config;
    if (!cfg.buttons_on) return [];
    if (Array.isArray(cfg.buttons)) return cfg.buttons.filter((b) => b.use !== false);
    return this._ctl.state?.attributes?.buttons || [];
  }

  _build() {
    const cfg = this._config,
      ctl = this._ctl;
    const design = TEMPLATES[cfg.design] ? cfg.design : "gradient";
    const pos = cfg.button_position === "auto" ? AUTO_POS[design] || "bottom" : cfg.button_position;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="card"><div class="progress js-progress" hidden><i></i></div>
      <div class="cc" data-pos="${pos}" data-sl="${cfg.slider}" data-color="${cfg.color}">${TEMPLATES[design]}<div class="colorrow js-colorrow" hidden><label class="js-colorpick"><span>${esc(this._t("Color", "Farbe"))}</span><input type="color" class="js-color"></label><button class="reset js-colorback">${esc(this._t("Back to the stops", "Zurück zu den Stufen"))}</button></div></div></ha-card>`;
    this._built = true;
    const root = this.shadowRoot;
    const dark = isDark(root.querySelector(".card"), this._hass);
    this._dark = dark;
    this.toggleAttribute("data-dark", dark);
    const $$ = (sel, fn) => root.querySelectorAll(sel).forEach(fn);
    const o = this._options;
    const override = this._override();
    const lang = langOf(this._hass);
    const name = cfg.name || friendly(this._hass, cfg.entity);
    $$(".js-mix", (el) => (el.innerHTML = this._mixer()));
    $$(".js-name", (el) => (el.textContent = name));
    $$(".js-unit", (el) => (el.textContent = ctl.unit));
    root.querySelector(".cc").classList.toggle("readonly", ctl.readonly);
    $$(".js-grad", (el) => (el.style.backgroundImage = this._gradient("90deg")));
    $$(".js-vgrad", (el) => (el.style.backgroundImage = this._gradient("0deg")));
    $$(".js-ticks", (el) => (el.innerHTML = this._ticks()));
    const list = this._buttons();
    const sub = (b) => {
      const bits = [];
      if (cfg.show_value) bits.push(`${formatValue(ctl, b.position, lang)} ${ctl.unit}`);
      if (cfg.show_duration) bits.push(`${comma(lang, b.duration)} s`);
      return bits.length ? `<span>${esc(bits.join(" · "))}</span>` : "";
    };
    $$(".btns", (el) => (el.hidden = !list.length));
    $$(".js-presets", (el) => {
      el.innerHTML = list
        .map(
          (b) =>
            `<button class="preset" data-pos="${b.position}" data-dur="${b.duration}"><b>${esc(b.name)}</b>${sub(b)}</button>`,
        )
        .join("");
    });
    $$(".js-scenes", (el) => {
      el.classList.toggle("four", list.length === 4);
      el.innerHTML = list
        .map((b) => {
          const l = o ? roomLight(o, b.position, override) : { c: [108, 140, 240], a: 0.2 + (0.8 * b.position) / 100 };
          const a = 0.14 + 0.86 * l.a;
          const onLight = lumOf(lightColor(l.c)) > 0.5 ? "#171d2d" : "#ffffff";
          const fg = dark || a > 0.55 ? onLight : "var(--cr-ink)";
          const paint = dark ? lightA(l.c, 1) : `linear-gradient(135deg, ${lightA(l.c, a * 0.55)}, ${lightA(l.c, a)})`;
          return `<button class="preset scene" data-pos="${b.position}" data-dur="${b.duration}" style="background:${paint};color:${fg}"><b>${esc(b.name)}</b>${sub(b)}</button>`;
        })
        .join("");
    });
    const us = o ? units(o, this._hass, cfg.group) : [];
    this._units = us;
    $$(".js-lanes", (el) => {
      el.hidden = !cfg.show_lanes || !us.length;
      el.innerHTML =
        us
          .map(
            (u) =>
              `<div class="lane"><span>${esc(u.name)}</span><i style="background-image:${laneGradient(o, u.light, override, dark)}"></i></div>`,
          )
          .join("") + '<div class="playhead"></div>';
    });
    $$(".js-bars", (el) => {
      el.innerHTML = o
        ? us
            .map(
              (u) =>
                `<div class="bar"><div class="well" ${cfg.columns_operable ? 'data-slider="bar"' : ""} data-ids="${esc(u.ids.join(","))}" aria-label="${esc(u.name)}"><div class="fill js-bar" data-ids="${esc(u.ids.join(","))}"></div></div><span>${esc(u.name)}</span></div>`,
            )
            .join("")
        : `<div class="bar"><div class="well"><div class="fill js-self"></div></div><span>${esc(name)}</span></div>`;
    });
    $$(".js-reset", (el) => (el.textContent = this._t("Reset single lights", "Einzelne Leuchten zurücksetzen")));
    $$(".js-segs", (el) => (el.innerHTML = this._arcSegments()));
    $$(".js-dticks", (el) => (el.innerHTML = this._arcTicks()));
    $$(".js-chart", (el) => (el.innerHTML = this._chart(us)));
    $$(".js-legend", (el) => {
      el.innerHTML = us
        .map((u) => `<span><i class="key" style="background:${seriesVar(u.slot)}"></i>${esc(u.name)}</span>`)
        .join("");
    });
    $$("[data-slider]", (el) => {
      el.setAttribute("role", "slider");
      el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", this._t("Position", "Position"));
      el.setAttribute("aria-valuemin", "0");
      el.setAttribute("aria-valuemax", "100");
    });
    this._live(true);
  }

  _gradient(dir) {
    const cfg = this._config,
      ctl = this._ctl;
    const dark = this._dark;
    const fade = (c) =>
      dark ? `linear-gradient(${dir}, ${c}, ${c})` : `linear-gradient(${dir}, color-mix(in srgb, ${c} 12%, transparent), ${c})`;
    if (cfg.color === "solid") return "none";
    if (cfg.color === "accent") return fade("var(--cr-accent)");
    if (cfg.color === "custom") return fade(cfg.custom_color);
    if (this._options) return roomGradient(this._options, dir, this._override(), dark);
    if (ctl.scheme === "temp") return `linear-gradient(${dir}, #2f6bff, #62c7d8, #ffc15e, #f0503c)`;
    if (ctl.scheme === "light") {
      const rgb = ctl.state?.attributes?.rgb_color || kRgb(2900);
      return `linear-gradient(${dir}, ${lightA(rgb, dark ? 1 : 0.12)}, ${lightA(rgb, 1)})`;
    }
    return fade("var(--cr-accent)");
  }

  _ticks() {
    const o = this._options,
      ctl = this._ctl;
    const lang = langOf(this._hass);
    if (!o) {
      return [
        ["first", 0],
        ["", 50],
        ["last", 100],
      ]
        .map(([cls, p]) => `<span class="${cls}" style="left:${p}%">${formatValue(ctl, p, lang)}</span>`)
        .join("");
    }
    let last = -99;
    return o.stops
      .map((s, i) => {
        const edge = i === 0 ? "first" : i === o.stops.length - 1 ? "last" : "";
        if (s.position - last < 6 && !edge) return "";
        last = s.position;
        return `<span class="${edge}" style="left:${s.position}%">${s.position}</span>`;
      })
      .join("");
  }

  _segColor(pct) {
    const cfg = this._config,
      ctl = this._ctl;
    const dark = this._dark;
    if (cfg.color === "solid") return "var(--reg)";
    const mix = (c) => (dark ? c : `color-mix(in srgb, ${c} ${Math.round(12 + (88 * pct) / 100)}%, transparent)`);
    if (cfg.color === "accent") return mix("var(--cr-accent)");
    if (cfg.color === "custom") return mix(cfg.custom_color);
    if (this._options) {
      const l = roomLight(this._options, pct, this._override());
      return rampColor(l.c, l.a, dark);
    }
    if (ctl.scheme === "temp") return `rgb(${css(tempColor(pct / 100))})`;
    if (ctl.scheme === "light") {
      return lightA(ctl.state?.attributes?.rgb_color || kRgb(2900), dark ? 1 : 0.12 + (0.88 * pct) / 100);
    }
    return mix("var(--cr-accent)");
  }

  // In the dark the dial is a wedge: the full light color, and the ring grows where the room gets brighter.
  _segWidth(pct) {
    if (!this._dark) return "";
    const a = this._options ? roomLight(this._options, pct, this._override()).a : pct / 100;
    return `;stroke-width:${(a > 0 ? 26 * (0.14 + 0.86 * a) : 0).toFixed(1)}`;
  }

  _arcSegments() {
    const count = 54;
    let out = "";
    for (let i = 0; i < count; i++) {
      const a0 = ((135 + (i / count) * 270 - 0.4) * Math.PI) / 180;
      const a1 = ((135 + ((i + 1) / count) * 270 + 0.4) * Math.PI) / 180;
      const pct = ((i + 0.5) / count) * 100;
      const p = (a) => `${(130 + 100 * Math.cos(a)).toFixed(2)} ${(130 + 100 * Math.sin(a)).toFixed(2)}`;
      const color = this._segColor(pct);
      out += `<path class="dial-seg" data-p="${pct.toFixed(1)}" data-c="${color}" style="stroke:${color}${this._segWidth(pct)}" d="M${p(a0)} A100 100 0 0 1 ${p(a1)}"/>`;
    }
    return out;
  }

  _arcTicks() {
    if (!this._options) return "";
    return this._options.stops
      .filter((s) => s.position > 0 && s.position < 100)
      .map((s) => {
        const a = ((135 + (s.position / 100) * 270) * Math.PI) / 180;
        return `<line class="dial-tick" x1="${(130 + 80 * Math.cos(a)).toFixed(1)}" y1="${(130 + 80 * Math.sin(a)).toFixed(1)}" x2="${(130 + 85 * Math.cos(a)).toFixed(1)}" y2="${(130 + 85 * Math.sin(a)).toFixed(1)}"/>`;
      })
      .join("");
  }

  _chart(us) {
    const o = this._options;
    const H = 150,
      W = 320;
    const x = (p) => (p / 100) * W,
      y = (v) => 6 + (1 - v / 100) * (H - 12);
    const grid = [0, 50, 100].map((v) => `<line class="c-grid" x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join("");
    const lines = o
      ? us
          .map((u) => {
            const pts = o.stops
              .map((s) => `${x(s.position).toFixed(1)},${y(lampAt(o, u.light, s.position).v).toFixed(1)}`)
              .join(" ");
            return `<polyline class="c-line" style="stroke:${seriesVar(u.slot)}" points="${pts}"/>`;
          })
          .join("")
      : `<line class="c-line" style="stroke:var(--cr-accent)" x1="0" y1="${y(0)}" x2="${W}" y2="${y(100)}"/>`;
    return `<svg class="chart" data-slider="x" viewBox="0 0 ${W} ${H}">${grid}${lines}<line class="c-ph js-ph" x1="0" x2="0" y1="0" y2="${H}"/></svg>`;
  }

  _mixer() {
    const cfg = this._config;
    const master = `<div class="ch"><b><span class="js-pos">0</span> <span class="js-unit"></span></b><div class="well js-vgrad" data-slider="y"><div class="cover"></div></div><span class="js-name"></span></div>`;
    const channels = (cfg.channels || []).filter((id) => id !== cfg.entity && this._hass.states[id]);
    return (
      master.replace('<span class="js-name"></span>', `<span>${esc(cfg.name || friendly(this._hass, cfg.entity))}</span>`) +
      channels
        .map((id) => {
          const c = controllerFor(this._hass, id);
          return `<div class="ch"><b data-chv="${esc(id)}"></b><div class="well" ${c.readonly ? "" : 'data-slider="chan"'} data-chan="${esc(id)}" aria-label="${esc(friendly(this._hass, id))}"><div class="ch-fill" data-chf="${esc(id)}"></div></div><span>${esc(friendly(this._hass, id))}</span></div>`;
        })
        .join("")
    );
  }

  _kick() {
    if (!this._raf && this.isConnected && this._built) {
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        this._live(false);
      });
    }
  }

  _live(first) {
    const root = this.shadowRoot,
      cfg = this._config,
      ctl = this._ctl;
    if (!ctl?.state || !this._built) return;
    const host = this;
    const p = this._position();
    const lang = langOf(this._hass);
    const $$ = (sel, fn) => root.querySelectorAll(sel).forEach(fn);
    host.style.setProperty("--p", `${p}%`);
    host.style.setProperty("--pn", p / 100);
    const shown = formatValue(ctl, p, lang);
    $$(".js-pos", (el) => (el.textContent = shown));
    $$('[data-slider]:not([data-slider="bar"]):not([data-slider="chan"])', (el) =>
      el.setAttribute("aria-valuenow", Math.round(p)),
    );
    const o = this._options;
    const override = this._override();
    let tot = 0,
      mix = [0, 0, 0];
    if (o) {
      for (const light of o.lights) {
        const l = lampAt(o, light, p, override),
          w = l.v / 100;
        tot += w;
        mix = [mix[0] + l.c[0] * w, mix[1] + l.c[1] * w, mix[2] + l.c[2] * w];
      }
    }
    const avg = tot ? mix.map((x) => x / tot) : null;
    let reg = "var(--cr-accent)";
    if (cfg.color === "custom") reg = cfg.custom_color;
    else if (cfg.color !== "accent") {
      if (avg) reg = `rgb(${css(lightColor(avg))})`;
      else if (ctl.scheme === "temp") reg = `rgb(${css(tempColor(p / 100))})`;
      else if (ctl.scheme === "light" && ctl.on) reg = `rgb(${css(lightColor(ctl.state.attributes.rgb_color || kRgb(2900)))})`;
    }
    host.style.setProperty("--reg", reg);
    let glow = "transparent";
    if (cfg.glow && o?.lights.length && avg) {
      const g = 0.6 * Math.pow(Math.min(1, tot / o.lights.length), 0.6);
      glow = `rgba(${css(lightColor(avg))},${g.toFixed(2)})`;
    }
    host.style.setProperty("--glowc", glow);
    const f = this._fade;
    const long = !!f && f.total >= 3;
    root.querySelector(".cc")?.classList.toggle("long", long);
    const bar = root.querySelector(".js-progress");
    if (bar) bar.hidden = !long;
    const t = this._t;
    let status;
    if (long) {
      const done = clamp((p - f.from) / (f.target - f.from || 1), 0, 1);
      if (bar) bar.firstElementChild.style.width = `${done * 100}%`;
      status = t(
        `${fmtDur(lang, (1 - done) * f.total)} left, to ${formatValue(ctl, f.target, lang)} ${ctl.unit}`,
        `Noch ${fmtDur(lang, (1 - done) * f.total)} bis ${formatValue(ctl, f.target, lang)} ${ctl.unit}`,
      );
    } else if (this._drag?.kind === "main" && this._drag.moved) {
      status = t("Following your finger", "Folgt deinem Finger");
    } else if (ctl.readonly) {
      status = t("Display only", "Nur Anzeige");
    } else {
      status = ctl.on ? t("On", "An") : t("Off", "Aus");
    }
    $$(".js-status", (el) => (el.textContent = status));
    const on = f ? f.target > 0 : ctl.on;
    $$(".js-power", (el) => {
      el.setAttribute("aria-pressed", String(on));
      el.setAttribute("aria-label", long ? t("Stop dimming", "Dimmen stoppen") : t("Switch on or off", "Ein- oder ausschalten"));
    });
    $$(".dial-seg", (el) => {
      const reached = +el.dataset.p <= p;
      if (this._dark) el.style.stroke = reached ? el.dataset.c : "var(--cr-well)";
      else el.style.opacity = reached ? 1 : 0.22;
    });
    const ang = ((135 + (p / 100) * 270) * Math.PI) / 180;
    $$(".dial-knob", (el) => {
      el.setAttribute("cx", (130 + 100 * Math.cos(ang)).toFixed(2));
      el.setAttribute("cy", (130 + 100 * Math.sin(ang)).toFixed(2));
    });
    $$(".js-ph", (el) => {
      const x = ((p / 100) * 320).toFixed(1);
      el.setAttribute("x1", x);
      el.setAttribute("x2", x);
    });
    $$(".js-self", (el) => (el.style.height = `${p}%`));
    const deviating = ctl.state.attributes.deviating || [];
    // Columns show the value set by the curve, because lights report only about once per second.
    $$(".js-bar", (el) => {
      const ids = el.dataset.ids.split(",");
      const light = o?.lights.find((x) => x.entity_id === ids[0]);
      if (!light) return;
      const l = lampAt(o, light, p, override);
      const drag = this._drag?.kind === "bar" && this._drag.ids[0] === ids[0] ? this._drag.pos : null;
      const away = deviating.includes(ids[0]);
      const real = this._hass.states[ids[0]];
      const v = drag ?? (away ? (real?.state === "on" ? (real.attributes.brightness || 0) / 2.55 : 0) : l.v);
      el.style.height = `${v}%`;
      el.style.background = this._dark ? lightA(l.c, 1) : `linear-gradient(0deg, ${lightA(l.c, 0.35)}, ${lightA(l.c, 1)})`;
      el.parentElement.classList.toggle("dev", away || drag !== null);
      el.parentElement.setAttribute("aria-valuenow", Math.round(v));
    });
    $$(".js-reset", (el) => (el.hidden = !deviating.length));
    const attrs = ctl.state?.attributes || {};
    const picks = cfg.color_control && (attrs.supported_color_modes || []).some((m) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m));
    const back = !!attrs.color_override;
    $$(".js-colorrow", (el) => (el.hidden = !picks && !back));
    $$(".js-colorpick", (el) => (el.hidden = !picks));
    $$(".js-colorback", (el) => (el.hidden = !back));
    if (attrs.rgb_color) {
      $$(".js-color", (el) => {
        if (root.activeElement !== el) el.value = rgbHex(attrs.rgb_color);
      });
    }
    $$("[data-chf]", (el) => {
      const id = el.dataset.chf;
      const c = controllerFor(this._hass, id);
      const pos = this._mix[id] !== undefined ? this._mix[id] : c.pos;
      const color =
        c.scheme === "temp"
          ? `rgb(${css(tempColor(pos / 100))})`
          : c.scheme === "light"
            ? `rgb(${css(lightColor(c.state?.attributes?.rgb_color || kRgb(2900)))})`
            : "var(--cr-accent)";
      el.style.height = `${pos}%`;
      el.style.background = this._dark ? color : `linear-gradient(0deg, color-mix(in srgb, ${color} 35%, transparent), ${color})`;
      el.parentElement.setAttribute("aria-valuenow", Math.round(pos));
      const label = root.querySelector(`[data-chv="${CSS.escape(id)}"]`);
      if (label) label.textContent = `${formatValue(c, pos, lang)} ${c.unit}`;
    });
    $$(".preset", (el) => {
      const target = +el.dataset.pos;
      el.classList.toggle("on", f ? Math.abs(f.target - target) < 0.5 : Math.abs(p - target) < 0.6);
    });
    $$(".js-pic", (el) => this._drawPicture(el, p, override));
    if (f || this._hold || this._drag) this._kick();
    void first;
  }

  // -- the room picture --------------------------------------------------------------------------

  _loadPhoto() {
    this._photoUrl = this._config.photo;
    this._photo = null;
    if (!this._photoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this._photo = img;
      this._kick();
    };
    img.src = this._photoUrl;
  }

  _point(entityId, index, count) {
    const saved = this._config.points?.[entityId];
    if (saved) return saved;
    return [(index + 1) / (count + 1), 0.45];
  }

  _drawPicture(el, p, override) {
    const w = el.clientWidth;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(w * dpr),
      H = Math.round(el.clientHeight * dpr);
    if (el.width !== W || el.height !== H) {
      el.width = W;
      el.height = H;
    }
    const g = el.getContext("2d");
    const o = this._options;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#0a0d1c";
    g.fillRect(0, 0, W, H);
    if (!o) return;
    const photo = this._photo;
    const cover = (ctx) => {
      const s = Math.max(W / photo.width, H / photo.height);
      const dw = photo.width * s,
        dh = photo.height * s;
      ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
    };
    const lit = o.lights
      .map((light, i) => ({ l: lampAt(o, light, p, override), pt: this._point(light.entity_id, i, o.lights.length) }))
      .filter((x) => x.l.v > 0.3);
    if (photo) {
      cover(g);
      g.fillStyle = "rgba(5,7,16,.88)";
      g.fillRect(0, 0, W, H);
      this._off = this._off || document.createElement("canvas");
      if (this._off.width !== W || this._off.height !== H) {
        this._off.width = W;
        this._off.height = H;
      }
      const m = this._off.getContext("2d");
      m.globalCompositeOperation = "source-over";
      m.clearRect(0, 0, W, H);
      m.globalCompositeOperation = "lighter";
      for (const { l, pt } of lit) {
        const a = Math.pow(l.v / 100, 0.7);
        const grad = m.createRadialGradient(pt[0] * W, pt[1] * H, 0, pt[0] * W, pt[1] * H, W * 0.55);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        m.fillStyle = grad;
        m.fillRect(0, 0, W, H);
      }
      m.globalCompositeOperation = "source-in";
      cover(m);
      g.drawImage(this._off, 0, 0);
    }
    g.globalCompositeOperation = photo ? "soft-light" : "lighter";
    for (const { l, pt } of lit) {
      const a = Math.pow(l.v / 100, 0.7) * 0.85;
      const c = css(lightColor(l.c));
      const r = W * (photo ? 0.4 : 0.32);
      const grad = g.createRadialGradient(pt[0] * W, pt[1] * H, 0, pt[0] * W, pt[1] * H, r);
      grad.addColorStop(0, `rgba(${c},${a})`);
      grad.addColorStop(0.55, `rgba(${c},${a * 0.35})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = "source-over";
  }

  // -- input -------------------------------------------------------------------------------------

  _posFrom(el, e) {
    const r = el.getBoundingClientRect();
    const mode = el.dataset.slider;
    if (mode === "x") return clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
    if (mode === "arc") {
      const dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      let rel = (((Math.atan2(dy, dx) * 180) / Math.PI - 135) % 360 + 720) % 360;
      if (rel > 270) rel = rel > 315 ? 0 : 270;
      return (rel / 270) * 100;
    }
    return clamp(((r.bottom - e.clientY) / r.height) * 100, 0, 100);
  }

  _snapPoints() {
    const o = this._options;
    return [...(o ? o.stops.map((s) => s.position) : []), ...this._buttons().map((b) => b.position)];
  }

  _snap(p) {
    if (!this._config.snap) return p;
    let best = p,
      dist = 1.6;
    for (const s of this._snapPoints()) {
      const d = Math.abs(s - p);
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    return best;
  }

  _tick() {
    window.dispatchEvent(new CustomEvent("haptic", { detail: "selection" }));
    if (navigator.vibrate) navigator.vibrate(8);
    const cc = this.shadowRoot.querySelector(".cc");
    cc?.classList.add("tick");
    clearTimeout(this._tickTimer);
    this._tickTimer = setTimeout(() => cc?.classList.remove("tick"), 130);
  }

  _interval() {
    return 1000 / (this._options?.slider_rate || (this._ctl.domain === "light" ? 4 : 2));
  }

  _sendMain(p, final) {
    const ctl = this._ctl;
    if (ctl.crescendo) {
      this._hass
        .callWS({ type: "cloudless_crescendo/position", entity_id: ctl.entityId, position: Math.round(p * 100) / 100, final })
        .catch(() => {});
    } else {
      sendValue(this._hass, ctl, p);
    }
  }

  _onDown(e) {
    const el = e.target.closest?.("[data-slider]");
    if (!el || (this._ctl.readonly && el.dataset.slider !== "chan")) return;
    if (el.dataset.slider === "arc") {
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (dist < r.width * 0.26) return;
    }
    const kind = el.dataset.slider === "bar" ? "bar" : el.dataset.slider === "chan" ? "chan" : "main";
    this._drag = {
      el,
      kind,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      pos: this._position(),
      last: this._position(),
      ids: kind === "bar" ? el.dataset.ids.split(",") : null,
      chan: el.dataset.chan,
    };
    el.setPointerCapture(e.pointerId);
    this._kick();
  }

  _onMove(e) {
    const d = this._drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    if (!d.moved) return;
    const now = performance.now();
    let p = this._posFrom(d.el, e);
    if (d.kind === "main") {
      p = this._snap(p);
      if (this._config.snap && this._snapPoints().some((s) => (d.last < s && p >= s) || (d.last > s && p <= s))) this._tick();
      d.last = p;
      this._fade = null;
    }
    d.pos = p;
    if (d.kind === "chan") this._mix[d.chan] = p;
    if (now - this._lastSend >= this._interval()) {
      this._lastSend = now;
      if (d.kind === "main") this._sendMain(p, false);
      else if (d.kind === "bar") this._sendLights(d.ids, p);
      else sendValue(this._hass, controllerFor(this._hass, d.chan), p);
    }
    this._kick();
  }

  _sendLights(ids, brightness) {
    this._hass
      .callWS({ type: "cloudless_crescendo/lights/set", entity_id: this._ctl.entityId, lights: ids, brightness })
      .catch(() => {});
  }

  _onUp(e) {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    if (d.kind === "bar") {
      this._sendLights(d.ids, this._posFrom(d.el, e));
    } else if (d.kind === "chan") {
      const p = this._posFrom(d.el, e);
      this._mix[d.chan] = p;
      sendValue(this._hass, controllerFor(this._hass, d.chan), p);
      setTimeout(() => {
        delete this._mix[d.chan];
        this._kick();
      }, 3000);
    } else if (d.moved) {
      this._hold = { pos: d.pos, until: performance.now() + 2500 };
      this._sendMain(d.pos, true);
    } else {
      this._go(this._posFrom(d.el, e), this._config.tap_duration);
    }
    this._kick();
  }

  _go(pos, duration) {
    const ctl = this._ctl;
    this._hold = { pos, until: performance.now() + (duration < 3 ? (duration + 1.5) * 1000 : 1500) };
    if (ctl.crescendo) {
      this._hass.callService(
        "cloudless_crescendo",
        "fade_to",
        { position: Math.round(pos * 100) / 100, duration: { seconds: duration } },
        { entity_id: ctl.entityId },
      );
    } else {
      sendValue(this._hass, ctl, pos, duration);
    }
    this._kick();
  }

  _onClick(e) {
    const preset = e.target.closest?.(".preset");
    if (preset) {
      this._go(+preset.dataset.pos, +preset.dataset.dur);
      return;
    }
    if (e.target.closest?.(".js-reset")) {
      this._hass.callWS({ type: "cloudless_crescendo/lights/reset", entity_id: this._ctl.entityId }).catch(() => {});
      return;
    }
    if (e.target.closest?.(".js-colorback")) {
      this._hass.callWS({ type: "cloudless_crescendo/color/reset", entity_id: this._ctl.entityId }).catch(() => {});
      return;
    }
    if (e.target.closest?.(".js-power")) this._power();
  }

  _power() {
    const ctl = this._ctl,
      hass = this._hass;
    const f = this._fade;
    const target = { entity_id: ctl.entityId };
    if (f && f.total >= 3) {
      this._fade = null;
      hass.callService("cloudless_crescendo", "stop", {}, target);
      return;
    }
    if (ctl.crescendo || ctl.domain === "light" || ctl.domain === "fan") {
      const on = f ? f.target > 0 : ctl.on;
      hass.callService("homeassistant", on ? "turn_off" : "turn_on", {}, target);
    } else if (ctl.domain === "cover") {
      hass.callService("cover", ctl.on ? "close_cover" : "open_cover", {}, target);
    } else if (ctl.domain === "media_player") {
      hass.callService("media_player", "media_play_pause", {}, target);
    } else {
      hass.callService("homeassistant", "toggle", {}, target);
    }
  }

  _onKey(e) {
    const el = e.target.closest?.("[data-slider]");
    if (!el) return;
    const step = e.shiftKey ? 10 : 1;
    const kind = el.dataset.slider;
    let base;
    if (kind === "chan") base = this._mix[el.dataset.chan] ?? controllerFor(this._hass, el.dataset.chan).pos;
    else if (kind === "bar") base = +el.getAttribute("aria-valuenow") || 0;
    else base = this._position();
    const next = { ArrowRight: base + step, ArrowUp: base + step, ArrowLeft: base - step, ArrowDown: base - step, Home: 0, End: 100 }[e.key];
    if (next === undefined || (this._ctl.readonly && kind !== "chan")) return;
    e.preventDefault();
    const p = clamp(next, 0, 100);
    if (kind === "chan") {
      this._mix[el.dataset.chan] = p;
      sendValue(this._hass, controllerFor(this._hass, el.dataset.chan), p);
    } else if (kind === "bar") {
      this._sendLights(el.dataset.ids.split(","), p);
    } else {
      this._hold = { pos: p, until: performance.now() + 2500 };
      this._sendMain(p, true);
    }
    this._kick();
  }
}

// -- the card's settings in the dashboard editor --------------------------------------------------

const EDITOR_STYLE = `
[hidden] { display: none !important; }
:host { display: block; --ink: var(--primary-text-color, #171d2d); --muted: var(--secondary-text-color, #566077); --line: var(--divider-color, #d4dae6); --accent: var(--primary-color, #2f5fd0); }
* { box-sizing: border-box; }
.form { display: grid; gap: 14px; color: var(--ink); font-size: 14px; }
.ctl { display: grid; gap: 4px; }
label, .lab { color: var(--muted); font-size: 13px; }
label.check { display: inline-flex; gap: 8px; align-items: center; }
select, input[type="text"], input[type="number"], input:not([type]) { font: inherit; color: var(--ink); background: var(--card-background-color, #fff); border: 1px solid var(--line); border-radius: 8px; min-height: 36px; padding: 5px 9px; width: 100%; }
button { font: inherit; color: var(--ink); background: transparent; border: 1px solid var(--line); border-radius: 8px; min-height: 34px; padding: 4px 10px; cursor: pointer; }
button:hover { border-color: var(--accent); }
.designs { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; }
.designs button[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); font-weight: 600; }
.btn-row { display: grid; grid-template-columns: auto minmax(0, 1fr) 62px 56px auto; gap: 4px; align-items: center; }
.btn-row input[type="text"], .btn-row input[type="number"] { min-height: 30px; padding: 2px 6px; font-size: 13px; }
details > summary { cursor: pointer; font-weight: 600; }
details[open] > summary { margin-bottom: 10px; }
.stack { display: grid; gap: 10px; }
.picture { position: relative; width: 100%; aspect-ratio: 16 / 10; border-radius: 10px; background: #0a0d1c center / cover no-repeat; overflow: hidden; }
.mark { position: absolute; transform: translate(-50%, -50%); padding: 1px 7px; border-radius: 99px; background: rgba(17,21,42,.82); color: #fff; font-size: 11px; border: 1px solid rgba(255,255,255,.7); cursor: grab; touch-action: none; white-space: nowrap; min-height: 0; }
`;

const CONTROLLABLE = ["light", "climate", "cover", "media_player", "fan", "number", "input_number"];

class CrescendoCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mark = null;
    this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("pointerdown", (e) => {
      const m = e.target.closest?.("[data-mark]");
      if (m) {
        this._mark = m;
        m.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    this.shadowRoot.addEventListener("pointermove", (e) => {
      if (!this._mark) return;
      const r = this._mark.parentElement.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1),
        y = clamp((e.clientY - r.top) / r.height, 0, 1);
      this._mark.style.left = `${x * 100}%`;
      this._mark.style.top = `${y * 100}%`;
      this._mark.dataset.x = x;
      this._mark.dataset.y = y;
    });
    this.shadowRoot.addEventListener("pointerup", () => {
      if (!this._mark) return;
      const m = this._mark;
      this._mark = null;
      this._set({ points: { ...(this._config.points || {}), [m.dataset.mark]: [+m.dataset.x, +m.dataset.y] } });
    });
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    if (this._hass) this._load();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first && this._config) this._load();
  }

  _load() {
    const c = controllerFor(this._hass, this._config.entity);
    if (c.crescendo) {
      this._hass
        .callWS({ type: "cloudless_crescendo/object", entity_id: this._config.entity })
        .then((res) => {
          this._options = res.options;
          this._render();
        })
        .catch(() => this._render());
    } else {
      this._options = null;
      this._render();
    }
  }

  _set(patch) {
    this._config = { ...this._config, ...patch };
    const out = { ...this._config };
    for (const [k, v] of Object.entries(DEFAULTS)) if (out[k] === v) delete out[k];
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: out }, bubbles: true, composed: true }));
    this._render();
  }

  _standard() {
    return this._hass.states[this._config.entity]?.attributes?.buttons || [];
  }

  _list() {
    return this._config.buttons || this._standard().map((b) => ({ ...b, use: true }));
  }

  _own() {
    return Array.isArray(this._config.buttons) ? [...this._config.buttons] : this._list();
  }

  _render() {
    const cfg = this._config,
      hass = this._hass;
    if (!cfg || !hass) return;
    const t = tr(hass);
    const lang = langOf(hass);
    const ids = Object.keys(hass.states).sort();
    const objects = ids.filter((id) => hass.states[id].attributes?.crescendo);
    const others = ids.filter((id) => !objects.includes(id) && CONTROLLABLE.includes(id.split(".")[0]));
    const sensors = ids.filter((id) => id.startsWith("sensor.") && Number.isFinite(+hass.states[id].state));
    const opt = (id) => `<option value="${esc(id)}"${id === cfg.entity ? " selected" : ""}>${esc(friendly(hass, id))}</option>`;
    const ctl = controllerFor(hass, cfg.entity);
    const select = (id, value, pairs) =>
      `<select id="${id}">${pairs.map(([v, label]) => `<option value="${v}"${v === value ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>`;
    const check = (id, on, label) => `<label class="check"><input type="checkbox" id="${id}"${on ? " checked" : ""}> ${esc(label)}</label>`;
    const rows = this._list()
      .map(
        (b, i) => `<div class="btn-row">
        <input type="checkbox" data-i="${i}" data-f="use"${b.use !== false ? " checked" : ""} aria-label="${esc(t("Show", "Zeigen"))}">
        <input type="text" data-i="${i}" data-f="name" value="${esc(b.name)}" aria-label="${esc(t("Name", "Name"))}">
        <input type="number" data-i="${i}" data-f="value" value="${ctl.toValue(b.position)}" step="${ctl.step}" aria-label="${esc(t("Value", "Wert"))}">
        <input type="number" data-i="${i}" data-f="duration" value="${b.duration}" min="0" step="0.5" aria-label="${esc(t("Duration in seconds", "Dauer in Sekunden"))}">
        ${b.own ? `<button data-remove="${i}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button>` : "<span></span>"}
      </div>`,
      )
      .join("");
    const lights = this._options?.lights || [];
    const marks = lights
      .map((l, i) => {
        const [x, y] = cfg.points?.[l.entity_id] || [(i + 1) / (lights.length + 1), 0.45];
        return `<button class="mark" data-mark="${esc(l.entity_id)}" data-x="${x}" data-y="${y}" style="left:${x * 100}%;top:${y * 100}%">${esc(friendly(hass, l.entity_id))}</button>`;
      })
      .join("");
    const channels = cfg.channels || [];
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLE}</style><div class="form">
      <div class="ctl"><label for="entity">${esc(t("Connected to", "Verbunden mit"))}</label>
        <select id="entity">
          ${objects.length ? `<optgroup label="Crescendo">${objects.map(opt).join("")}</optgroup>` : ""}
          <optgroup label="${esc(t("Other devices", "Andere Geräte"))}">${others.map(opt).join("")}</optgroup>
          ${sensors.length ? `<optgroup label="${esc(t("Display only", "Nur Anzeige"))}">${sensors.map(opt).join("")}</optgroup>` : ""}
        </select></div>
      <div class="ctl"><label for="name">${esc(t("Name (optional)", "Name (optional)"))}</label><input type="text" id="name" value="${esc(cfg.name || "")}"></div>
      <div class="ctl"><span class="lab">${esc(t("Design", "Design"))}</span><div class="designs">${DESIGNS.map(
        ([k, en, de]) => `<button data-design="${k}" aria-pressed="${cfg.design === k}">${esc(lang === "de" ? de : en)}</button>`,
      ).join("")}</div></div>
      <div class="ctl"><label for="color">${esc(t("Control color", "Reglerfarbe"))}</label>
        ${select("color", cfg.color, [
          ["light", t("Light color as a gradient", "Lichtfarbe als Verlauf")],
          ["solid", t("Current light color, flat", "Aktuelle Lichtfarbe, einfarbig")],
          ["accent", t("Dashboard color", "Farbe des Dashboards")],
          ["custom", t("Own color", "Eigene Farbe")],
        ])}
        ${cfg.color === "custom" ? `<input type="color" id="custom_color" value="${esc(cfg.custom_color)}" aria-label="${esc(t("Own color", "Eigene Farbe"))}">` : ""}</div>
      ${check("buttons_on", cfg.buttons_on, t("Show buttons", "Buttons zeigen"))}
      ${
        cfg.buttons_on
          ? `<div class="ctl stack">
        <span class="lab">${esc(cfg.buttons ? t("Adjusted for this card", "Für diese Karte angepasst") : t("Template: standard buttons", "Vorlage: Standard-Buttons"))}</span>
        ${rows}
        <div><button id="add-button">${esc(t("Button only for this card", "Button nur für diese Karte"))}</button> ${cfg.buttons ? `<button id="reset-buttons">${esc(t("Reset", "Zurücksetzen"))}</button>` : ""}</div>
        <label for="button_position">${esc(t("Button position", "Position der Buttons"))}</label>
        ${select("button_position", cfg.button_position, [
          ["auto", t("Matching the design", "Passend zum Design")],
          ["top", t("Top", "Oben")],
          ["bottom", t("Bottom", "Unten")],
          ["left", t("Left", "Links")],
          ["right", t("Right", "Rechts")],
        ])}</div>`
          : ""
      }
      <details><summary>${esc(t("Advanced settings", "Erweiterte Einstellungen"))}</summary><div class="stack">
        ${check("show_value", cfg.show_value, t("Show the value on buttons", "Wert auf den Buttons zeigen"))}
        ${check("show_duration", cfg.show_duration, t("Show the duration on buttons", "Dauer auf den Buttons zeigen"))}
        <div class="ctl"><label for="slider">${esc(t("Horizontal slider", "Waagerechter Regler"))}</label>${select("slider", cfg.slider, [
          ["wide", t("Wide", "Breit")],
          ["slim", t("Slim", "Schmal")],
          ["none", t("Off", "Aus")],
        ])}</div>
        ${check("group", cfg.group, t("Combine identical lights", "Gleiche Leuchten zusammenfassen"))}
        ${check("show_lanes", cfg.show_lanes, t("Show a lane per light (room gradient)", "Spuren je Leuchte zeigen (Raumverlauf)"))}
        ${check("columns_operable", cfg.columns_operable, t("Single lights can be operated (columns)", "Leuchten einzeln bedienbar (Säulen)"))}
        ${check("snap", cfg.snap, t("Snap to stops, with a short pulse on phones", "An Stufen einrasten, mit kurzem Impuls am Handy"))}
        ${check("glow", cfg.glow, t("Light glow around the card", "Lichtschein um die Karte"))}
        ${check("color_control", cfg.color_control, t("Show a color selection on the card", "Farbauswahl auf der Karte zeigen"))}
        <div class="ctl"><label for="photo">${esc(t("Photo for the room picture (path or address)", "Foto für das Raumbild (Pfad oder Adresse)"))}</label>
          <input type="text" id="photo" value="${esc(cfg.photo || "")}" placeholder="/local/bad.jpg">
          <label for="upload">${esc(t("Or upload a photo", "Oder ein Foto hochladen"))}</label><input type="file" id="upload" accept="image/*">
          ${lights.length ? `<span class="lab">${esc(t("Drag each light to its place", "Ziehe jede Leuchte an ihre Stelle"))}</span><div class="picture"${cfg.photo ? ` style="background-image:url('${esc(cfg.photo)}')"` : ""}>${marks}</div>` : ""}
        </div>
        <div class="ctl"><span class="lab">${esc(t("More channels in the mixer", "Weitere Kanäle im Mischpult"))}</span>
          <select id="add-channel"><option value="">${esc(t("Add a channel", "Kanal hinzufügen"))}</option>${others.filter((id) => !channels.includes(id)).map((id) => `<option value="${esc(id)}">${esc(friendly(hass, id))}</option>`).join("")}</select>
          ${channels.map((id) => `<div class="btn-row" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(friendly(hass, id))}</span><button data-rmchan="${esc(id)}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div>`).join("")}
        </div>
      </div></details>
    </div>`;
  }

  async _onChange(e) {
    const t = e.target;
    if (t.dataset.f !== undefined && t.dataset.i !== undefined) {
      const list = this._own();
      const b = { ...list[+t.dataset.i] };
      const ctl = controllerFor(this._hass, this._config.entity);
      if (t.dataset.f === "use") b.use = t.checked;
      else if (t.dataset.f === "name") b.name = t.value.trim() || "Button";
      else if (t.dataset.f === "value") b.position = Math.round(ctl.toPos(+t.value || 0) * 100) / 100;
      else b.duration = Math.max(0, +t.value || 0);
      list[+t.dataset.i] = b;
      this._set({ buttons: list });
      return;
    }
    switch (t.id) {
      case "entity":
        this._config = { ...this._config, entity: t.value, buttons: undefined };
        this._set({});
        this._load();
        break;
      case "name":
      case "photo":
        this._set({ [t.id]: t.value.trim() || undefined });
        break;
      case "color":
      case "custom_color":
      case "button_position":
      case "slider":
        this._set({ [t.id]: t.value });
        break;
      case "buttons_on":
      case "show_value":
      case "show_duration":
      case "group":
      case "show_lanes":
      case "columns_operable":
      case "snap":
      case "glow":
      case "color_control":
        this._set({ [t.id]: t.checked });
        break;
      case "add-channel":
        if (t.value) this._set({ channels: [...(this._config.channels || []), t.value] });
        break;
      case "upload":
        if (t.files?.[0]) await this._upload(t.files[0]);
        break;
    }
  }

  async _upload(file) {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await this._hass.fetchWithAuth("/api/image/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      this._set({ photo: `/api/image/serve/${data.id}/original` });
    } catch (err) {
      const t = tr(this._hass);
      window.alert(t(`The photo could not be uploaded: ${err.message}`, `Das Foto ließ sich nicht hochladen: ${err.message}`));
    }
  }

  _onClick(e) {
    const t = e.target;
    if (t.dataset?.design) this._set({ design: t.dataset.design });
    else if (t.id === "add-button") {
      const list = this._own();
      list.push({ id: Math.random().toString(16).slice(2, 10), name: "Button", position: 50, duration: 3, use: true, own: true });
      this._set({ buttons: list });
    } else if (t.id === "reset-buttons") {
      this._config = { ...this._config, buttons: undefined };
      this._set({});
    } else if (t.dataset?.remove !== undefined) {
      const list = this._own();
      list.splice(+t.dataset.remove, 1);
      this._set({ buttons: list });
    } else if (t.dataset?.rmchan) {
      this._set({ channels: (this._config.channels || []).filter((id) => id !== t.dataset.rmchan) });
    }
  }
}

// Home Assistant replaces its element registry while its app starts; define only after that.
const define = () => {
  if (!customElements.get("crescendo-card-editor")) customElements.define("crescendo-card-editor", CrescendoCardEditor);
  if (!customElements.get("crescendo-card")) customElements.define("crescendo-card", CrescendoCard);
};
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "crescendo-card")) {
  window.customCards.push({
    type: "crescendo-card",
    name: "Crescendo",
    description: "One control for many lights, with switchable designs. Also works for other devices.",
    preview: true,
    documentationURL: "https://github.com/MadisonMedia/cloudless-crescendo",
  });
}
if (!document.querySelector("home-assistant")) define();
else {
  const whenReady = () => (window.customElements.get("home-assistant") ? define() : setTimeout(whenReady, 50));
  whenReady();
}
