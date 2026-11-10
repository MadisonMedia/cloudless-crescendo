// The Crescendo card: one card with switchable designs, for Crescendo objects and other devices.

const shared = await import(new URL(`./crescendo-shared.js${new URL(import.meta.url).search}`, import.meta.url).href);
const {
  activeColors,
  clamp,
  comma,
  controllerFor,
  EASE_MAX_SECONDS,
  css,
  ease,
  esc,
  formatValue,
  friendly,
  hueRgb,
  isDark,
  kRgb,
  lampAt,
  laneGradient,
  langOf,
  lightA,
  lightColor,
  lumOf,
  rampColor,
  rgbHue,
  rgbToXy,
  roomGradient,
  roomLight,
  seriesVar,
  sendValue,
  stripeLayers,
  tempColor,
  tr,
  units,
} = shared;

// Lights not yet placed on the room picture, spread out so that none hides another.
const defaultMark = (index, count) => [(index + 1) / (count + 1), [0.25, 0.5, 0.75][index % 3]];

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
  color: "stripes",
  custom_color: "#7a5cff",
  group: true,
  columns_operable: true,
  snap: true,
  glow: true,
  show_lanes: true,
  color_control: false,
  dial_wedge: true,
  button_names: true,
  details: "button",
  colors_always: false,
  tap_duration: 1,
  show_title: true,
  show_header_value: true,
  power: "header",
  button_style: "tint_icon",
  color_bar: "both",
  columns_mode: "dim_settings",
};

// Below this, a slider or a column switches off instead of hanging at 1 or 2 %.
const OFF_SNAP = 3;

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
.value.named { font-size: 18px; font-weight: 600; letter-spacing: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; }
.big.named { font-size: 28px; font-weight: 500; letter-spacing: 0; line-height: 1.15; white-space: normal; text-align: center; }
.power { width: 42px; height: 42px; flex: none; border-radius: 12px; border: 1.5px solid color-mix(in srgb, var(--cr-accent) 55%, var(--cr-line)); background: transparent; display: grid; place-items: center; color: var(--cr-accent); padding: 0; }
.power[aria-pressed="true"] { background: var(--cr-accent); border-color: var(--cr-accent); color: var(--cr-accent-ink); }
.power .stop { display: none; }
.long .power .pw { display: none; }
.long .power .stop { display: block; }
.readonly .power { display: none; }
.head-space { flex: 1; }
.preset.power-tile { width: auto; height: auto; min-height: 40px; border-radius: 10px; }
.regline { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; }
.regline > .power { width: 54px; height: 62px; }
[data-sl="slim"] .regline > .power { width: 40px; height: 34px; }
.resets { display: flex; flex-wrap: wrap; gap: 8px; }
.resets:not(:has(.reset:not([hidden]))) { display: none; }
.reset-wrap { position: relative; display: inline-grid; flex: none; width: 36px; transition: opacity .25s ease, transform .25s ease, width .25s ease, margin .25s ease; }
.reset-wrap:not(.show) { opacity: 0; transform: scale(.6); width: 0; margin-left: -12px; pointer-events: none; }
.reset-float { position: absolute; top: 10px; right: 10px; z-index: 3; }
.reset-float .reset-wrap:not(.show) { margin-left: 0; }
.reset-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 6; display: grid; gap: 2px; padding: 6px; border-radius: 12px; background: var(--cr-bg); border: 1px solid var(--cr-line); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.reset-menu button { border: 0; background: transparent; text-align: left; padding: 8px 10px; border-radius: 8px; font-size: 14px; white-space: nowrap; }
.reset-menu button:hover { background: var(--cr-well); }
.well.js-pick { cursor: pointer; }
.well .gear { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); display: grid; color: var(--cr-ink); opacity: .55; pointer-events: none; }
.bar-name.plain { text-decoration: none; }
.lp-ctl { display: grid; gap: 6px; }
.lp-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: var(--cr-muted); }
.lp-row b { font-weight: 500; color: var(--cr-ink); font-variant-numeric: tabular-nums; }
.lp-members { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid var(--cr-line); font-size: 13px; }
.lp-members > b { font-weight: 600; }
.lp-member { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 10px; align-items: center; }
.lp-mname { border: 0; background: none; padding: 0; text-align: left; font-size: 13px; color: var(--cr-ink); text-decoration: underline dotted; text-underline-offset: 2px; }
.lp-bar.lp-mini { height: 22px; border-radius: 7px; }
.preset ha-icon { --mdc-icon-size: 22px; display: block; opacity: .9; }
.preset.tint { border: 0; }
.preset.tint span { color: inherit; opacity: .8; }
.preset.tint.on { outline: 2px solid var(--cr-accent); outline-offset: 2px; }
.pv { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; width: 100%; max-width: 84px; height: 5px; margin-top: 3px; justify-self: center; }
.pv i { border-radius: 2px; }
.cc[data-novalue] .fader-row { grid-template-columns: minmax(0, 1fr); }
.lightpick { border: 0; padding: 0; border-radius: 16px; background: var(--cr-bg); color: var(--cr-ink); width: min(360px, calc(100vw - 24px)); box-shadow: 0 12px 40px rgba(0,0,0,.3); }
.lightpick::backdrop { background: rgba(0,0,0,.4); }
.lp-in { display: grid; gap: 14px; padding: 16px; }
.lp-bar { position: relative; height: 34px; border-radius: 10px; cursor: pointer; touch-action: none; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cr-ink) 12%, transparent); }
.lp-bar:focus-visible { outline: 2px solid var(--cr-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .fill, .reset-wrap { transition: none !important; } }
.body { display: grid; gap: 14px; min-width: 0; }
.reg { display: grid; gap: 10px; min-width: 0; }
[data-pos="top"] .btns { order: -1; }
[data-pos="left"] .body { grid-template-columns: auto minmax(0, 1fr); }
[data-pos="left"] .btns { order: -1; }
[data-pos="right"] .body { grid-template-columns: minmax(0, 1fr) auto; }
[data-pos="left"] .presets, [data-pos="right"] .presets, [data-pos="left"] .scenes, [data-pos="right"] .scenes { grid-template-columns: minmax(78px, 112px); }
.btns { min-width: 0; align-self: start; }
/* Beside the control, neither side leaves a gap: the buttons grow to the control's height, and columns, a fader or channels grow to the buttons'. */
:is([data-pos="left"], [data-pos="right"]) .btns { align-self: stretch; display: grid; }
:is([data-pos="left"], [data-pos="right"]) :is(.presets, .scenes) { grid-auto-rows: 1fr; }
.reg:has(> .bars), .reg:has(> .fader-row), .reg:has(> .mix) { grid-template-rows: 1fr; }
.presets { display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 8px; }
.preset { border: 1px solid var(--cr-line); background: transparent; border-radius: 10px; padding: 9px 8px; display: grid; gap: 1px; text-align: center; justify-items: center; min-height: 40px; align-content: center; }
.preset b { font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.preset span { font-size: 11.5px; line-height: 1.3; color: var(--cr-muted); }
.preset.on { border-color: var(--cr-accent); background: color-mix(in srgb, var(--cr-accent) 16%, transparent); }
.scenes { display: grid; grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); gap: 8px; }
.scenes.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.preset.scene { min-height: 74px; align-content: end; }
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
.fader { position: relative; min-height: 280px; align-self: stretch; border-radius: 22px; background: var(--cr-well); overflow: hidden; touch-action: pan-x; cursor: ns-resize; }
.fader-line { position: absolute; left: 14px; right: 14px; height: 4px; border-radius: 2px; bottom: clamp(8px, calc(var(--p) - 2px), calc(100% - 12px)); background: #fff; box-shadow: 0 0 8px rgba(0,0,0,.5); }
.dial-wrap { position: relative; }
.dial { width: min(100%, 250px); aspect-ratio: 1; margin: 0 auto; touch-action: none; cursor: grab; }
.dial svg { display: block; width: 100%; height: 100%; }
.dial-base { fill: none; stroke-width: 22; stroke-linecap: round; stroke: var(--cr-well); }
.dial-seg { fill: none; stroke-width: 22; }
.dial-under { fill: none; stroke: var(--cr-well); }
[data-wedge] .dial-base { display: none; }
.dial-tick { stroke: var(--cr-muted); stroke-width: 2; }
.dial-knob { fill: #fff; stroke: var(--cr-ink); stroke-width: 3; }
.dial-center { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 62%); place-content: center; text-align: center; pointer-events: none; }
/* The columns share one grid, so a name on two lines does not make its column shorter than the others. */
.bars { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); grid-template-rows: minmax(150px, 1fr) auto; gap: 5px 7px; }
.bar { display: grid; grid-row: span 2; grid-template-rows: subgrid; min-width: 0; }
.well { position: relative; overflow: hidden; border-radius: 9px; background: var(--cr-well); }
.well[data-slider] { touch-action: pan-x; cursor: ns-resize; }
.well.dev { box-shadow: inset 0 0 0 2px var(--cr-accent); }
/* Only the color changes, so a reset or a chosen color glides instead of jumping. While moving, columns follow at once. */
.fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background-color: var(--reg); background-image: linear-gradient(0deg, color-mix(in srgb, var(--cr-bg) 62%, transparent), transparent); transition: height .45s ease, background-color .45s ease; }
.cc.moving .fill { transition: none; }
.bar > span, .ch > span { font-size: 11px; line-height: 1.15; text-align: center; color: var(--cr-muted); overflow-wrap: anywhere; }
.reset { border: 1px solid var(--cr-line); background: transparent; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.colorrow { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.colorbar { position: relative; flex: 1 1 160px; height: 24px; cursor: pointer; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.colorbar:focus-visible { outline: 2px solid var(--cr-accent); outline-offset: 2px; border-radius: 8px; }
.colorbar u { position: absolute; top: 0; bottom: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cr-ink) 12%, transparent); }
.colorknob { position: absolute; top: -3px; bottom: -3px; width: 6px; margin-left: -3px; border-radius: 3px; background: #fff; box-shadow: 0 0 0 1px rgba(17,21,42,.4), 0 1px 5px rgba(0,0,0,.35); pointer-events: none; }
.chart { display: block; width: 100%; height: auto; touch-action: pan-y; cursor: ew-resize; }
.c-grid { stroke: var(--cr-line); stroke-width: 1; }
.c-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.c-ph { stroke: var(--cr-ink); stroke-width: 1.5; opacity: .7; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: var(--cr-muted); }
.legend span { display: inline-flex; gap: 5px; align-items: center; }
.key { display: inline-block; width: 14px; height: 3px; border-radius: 2px; flex: none; }
.pic { display: block; width: 100%; aspect-ratio: 16 / 10; border-radius: 12px; background: #0a0d1c; }
.mix { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); grid-template-rows: auto minmax(170px, 1fr) auto; gap: 5px 8px; }
.ch { display: grid; grid-row: span 3; grid-template-rows: subgrid; min-width: 0; text-align: center; }
.ch b { font-size: 12px; font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ch-fill { position: absolute; left: 0; right: 0; bottom: 0; }
.warning { padding: 16px; color: var(--cr-muted); }
.icon-btn { width: 36px; height: 36px; flex: none; border-radius: 50%; border: 1px solid var(--cr-line); background: transparent; display: grid; place-items: center; color: var(--cr-muted); padding: 0; }
.icon-btn:hover { color: var(--cr-ink); border-color: var(--cr-muted); }
.cc[data-tap] { cursor: pointer; }
.js-title:focus-visible { outline: 2px solid var(--cr-accent); outline-offset: 2px; border-radius: 6px; }
.chips { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip { display: inline-block; flex: none; width: 18px; height: 18px; border-radius: 50%; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cr-ink) 24%, transparent); }
.details { border: 0; padding: 0; border-radius: 16px; background: var(--cr-bg); color: var(--cr-ink); width: min(620px, calc(100vw - 24px)); max-width: none; max-height: calc(100dvh - 24px); overflow: auto; box-shadow: 0 12px 40px rgba(0,0,0,.35); cursor: default; }
.details::backdrop { background: rgba(0,0,0,.5); }
.details-in { display: grid; gap: 14px; padding: 16px; }
.details-head { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
.details-head > div { min-width: 0; flex: 1; }
.details .bars { grid-auto-columns: minmax(46px, 1fr); grid-template-rows: auto clamp(170px, 40dvh, 320px) auto; overflow-x: auto; padding-block: 2px; }
.details .bar { grid-row: span 3; }
.details .bar > b { font-size: 12px; font-weight: 500; text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
.bar-name { border: 0; background: none; padding: 0; font-size: 11px; line-height: 1.15; text-align: center; color: var(--cr-muted); overflow-wrap: anywhere; text-decoration: underline dotted; text-underline-offset: 2px; }
.bar-name:hover { color: var(--cr-ink); }
.details-colors { display: grid; gap: 6px; font-size: 13px; color: var(--cr-muted); }
.details-colors b { font-weight: 600; color: var(--cr-ink); }
.named-chips { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.named-chips span { display: inline-flex; gap: 6px; align-items: center; }
.details-group { display: inline-flex; gap: 8px; align-items: center; justify-self: start; font-size: 13px; color: var(--cr-muted); cursor: pointer; }
.details-foot { display: flex; flex-wrap: wrap; gap: 8px; }
.details-foot:not(:has(button:not([hidden]))) { display: none; }
:host([data-dark]) .dim, :host([data-dark]) .cover { background: color-mix(in srgb, var(--cr-well) 90%, transparent); }
:host([data-dark]) .fill { background-image: none; }
@container (max-width: 270px) {
  .ticks, .lanes, .status { display: none; }
  .value { font-size: 22px; }
  .big { font-size: 36px; }
  .power { width: 36px; height: 36px; }
  .head { gap: 8px; }
  .icon-btn { width: 32px; height: 32px; }
  .fader-row { grid-template-columns: minmax(0, 1fr); }
  .fader-row .big { display: none; }
  .fader { min-height: 170px; }
  .track { height: 48px; }
  .bars { grid-template-rows: minmax(100px, 1fr); }
  .bar { grid-row: span 1; }
  .bar > span, .bar > .bar-name, .ch > span { display: none; }
  .mix { grid-template-rows: auto minmax(110px, 1fr); }
  .ch { grid-row: span 2; }
  .presets, .scenes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .preset { padding: 6px 8px; min-height: 34px; }
  .preset.scene { min-height: 46px; }
}
@container (min-width: 470px) {
  /* Matching the design: on a wide card the buttons stand beside the control, on a narrow one below it. */
  [data-pos="auto"] .body { grid-template-columns: minmax(0, 1fr) minmax(120px, 170px); }
  [data-pos="auto"] .presets, [data-pos="auto"] .scenes { grid-template-columns: minmax(0, 1fr); grid-auto-rows: 1fr; }
  [data-pos="auto"] .btns { align-self: stretch; display: grid; }
  .fader { min-height: 340px; }
  .bars { grid-template-rows: minmax(210px, 1fr) auto; }
  .mix { grid-template-rows: auto minmax(230px, 1fr) auto; }
  .big { font-size: 66px; }
}
@container (max-width: 190px) {
  .head .icon-btn { display: none; }
}
`;

const POWER_ICONS = `<svg class="pw" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/></svg><svg class="stop" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>`;
const POWER = `<button class="power js-power" aria-pressed="false">${POWER_ICONS}</button>`;
const POWER_TILE = `<button class="preset power power-tile js-power" aria-pressed="false">${POWER_ICONS}</button>`;
const OPEN_DETAILS = `<button class="icon-btn js-details-open" aria-haspopup="dialog" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 4v9M6 17v3M12 4v3M12 11v9M18 4v11M18 19v1"/><circle cx="6" cy="15" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="18" cy="17" r="2"/></svg></button>`;
const CLOSE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const TITLE = `<div class="js-title"><h3 class="name js-name"></h3><p class="status js-status"></p></div>`;
const VALUE = `<div class="value"><span class="js-pos">0</span><small class="js-unit"></small></div>`;
const NAME_MIN_PX = 13;
const BIG = `<div class="big"><span class="js-pos">0</span><small class="js-unit"></small></div>`;
const TICKS = `<div class="ticks js-ticks" aria-hidden="true"></div>`;
const REG = `<div class="regh"><div class="track js-grad" data-slider="x"><div class="dim"></div><div class="thumb"></div></div><div class="slim" data-slider="x"><div class="slim-track js-grad"><div class="dim"></div></div><div class="knob"></div></div>${TICKS}</div>`;
const BTNS = `<div class="btns"><div class="presets js-presets"></div></div>`;
const RESETS = `<div class="resets"><button class="reset js-reset-dim" hidden></button><button class="reset js-reset-color" hidden></button></div>`;
const ARC = "M59.29 200.71 A100 100 0 1 1 200.71 200.71";

// A button shows an icon only when one was chosen for it.
const buttonIcon = (b) => b.icon || "";
const BACK_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
const GEAR_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;
const RESET_ICON = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`;
// Shown only while something differs from the stops; it opens a small menu instead of taking room on the card.
const RESET_WRAP = `<span class="reset-wrap"><button class="icon-btn js-resets-open" aria-haspopup="menu">${RESET_ICON}</button><span class="reset-menu js-reset-menu" role="menu" hidden><button class="js-reset-dim" role="menuitem"></button><button class="js-reset-color" role="menuitem"></button></span></span>`;

// {{HEAD}} is the header, {{HEADP}} one without the value (the control shows it), {{REG}} the slider. Each card fills them in.
const TEMPLATES = {
  gradient: `{{HEAD}}<div class="body"><div class="reg">{{REG}}</div>${BTNS}</div><div class="lanes js-lanes"></div>`,
  fader: `{{HEADP}}<div class="body"><div class="reg"><div class="fader-row"><div class="fader js-vgrad" data-slider="y"><div class="cover"></div><div class="fader-line"></div></div>${BIG}</div></div>${BTNS}</div>`,
  dial: `{{HEADP}}<div class="body"><div class="reg"><div class="dial-wrap"><div class="dial" data-slider="arc"><svg viewBox="0 0 260 260" aria-hidden="true"><path class="dial-base" d="${ARC}"/><g class="js-segs"></g><g class="js-dticks"></g><circle class="dial-knob" cx="59.29" cy="200.71" r="11"/></svg></div><div class="dial-center">${BIG}</div></div></div>${BTNS}</div>`,
  scenes: `{{HEAD}}<div class="body"><div class="reg">{{REG}}</div><div class="btns"><div class="scenes js-scenes"></div></div></div>`,
  columns: `{{HEAD}}<div class="body"><div class="reg"><div class="bars js-bars"></div>{{REG}}</div>${BTNS}</div>`,
  chart: `{{HEAD}}<div class="body"><div class="reg"><div class="js-chart"></div><div class="legend js-legend"></div></div>${BTNS}</div>`,
  picture: `{{HEAD}}<div class="body"><div class="reg"><canvas class="pic js-pic" aria-hidden="true"></canvas>{{REG}}</div>${BTNS}</div>`,
  mixer: `{{HEADP}}<div class="body"><div class="reg"><div class="mix js-mix"></div></div>${BTNS}</div>`,
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
    this._barHolds = {};
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("pointerdown", (e) => this._onDown(e));
    this.shadowRoot.addEventListener("pointermove", (e) => this._onMove(e));
    this.shadowRoot.addEventListener("pointerup", (e) => this._onUp(e));
    this.shadowRoot.addEventListener("pointercancel", () => {
      this._drag = null;
      this._colorDrag = null;
      this._colorX = undefined;
      this._kick();
    });
    this.shadowRoot.addEventListener("keydown", (e) => this._onKey(e));
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Please choose an entity");
    this._config = { ...DEFAULTS, ...config };
    // The side-by-side colors of 0.1.0b2 to 0.1.0b7 became the stripes.
    if (this._config.color === "solid") this._config.color = "stripes";
    if (config.columns_mode === undefined && config.columns_operable === false) this._config.columns_mode = "off";
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
      (this._config.design === "mixer" && (this._config.channels || []).some((c) => old.states[c] !== hass.states[c])) ||
      (this._options?.lights || []).some((l) => old.states[l.entity_id] !== hass.states[l.entity_id]);
    if (changed || !this._built) this._update(false);
    if (old && (old.themes?.darkMode !== hass.themes?.darkMode || old.themes?.theme !== hass.themes?.theme)) {
      setTimeout(() => this._recheckDark(), 200);
    }
  }

  connectedCallback() {
    this._recheckDark();
    this._kick();
    this._sizes ??= new ResizeObserver(() => this._fitNames());
    this._sizes.observe(this);
  }

  // A button's name may be one long word. It gets smaller to fit; only a word too long even then breaks.
  _fitNames() {
    this.shadowRoot.querySelectorAll(".big").forEach((el) => {
      el.style.fontSize = "";
      el.style.overflowWrap = "";
      if (!el.classList.contains("named") || !el.clientWidth) return;
      const over = el.scrollWidth / el.clientWidth;
      if (over <= 1) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${Math.max(NAME_MIN_PX, Math.floor(size / over))}px`;
      if (el.scrollWidth > el.clientWidth) el.style.overflowWrap = "anywhere";
    });
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
    this._sizes?.disconnect();
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
    // The colors on the controls were painted for one chosen color. Another one needs them painted anew.
    const chosen = JSON.stringify(this._override());
    if (chosen !== this._chosen && !this._drag && !this._colorDrag && this._colorX === undefined) {
      this._chosen = chosen;
      this._built = false;
    }
    if (!this._built || force) this._build();
    this._kick();
  }

  // Follows a fade from what the state last said, without relying on synchronized clocks.
  _trackFade(ctl) {
    const a = ctl.state.attributes;
    const f = this._fade;
    const now = performance.now();
    // Only a new state of the object tells how far a fade is. A single light reporting, or the app
    // reconnecting with the same states, must not move it back.
    const stamp = ctl.state.last_updated ?? ctl.state;
    const fresh = stamp !== this._fadeSeen;
    this._fadeSeen = stamp;
    if (!ctl.crescendo || !a.fading || a.target_position === undefined) {
      // A fade started on this card keeps running until the state has had time to report it.
      if (f?.local && now - f.at < 1500) return;
      if (f) this._startGlide();
      this._fade = null;
      return;
    }
    const total = Math.max(0.001, (Date.parse(a.fade_ends) - Date.parse(a.fade_started)) / 1000);
    const done = (a.position - a.fade_from) / (a.target_position - a.fade_from || 1);
    if (f && f.key === a.fade_started) {
      if (fresh) {
        f.done = done;
        f.at = now;
      }
      return;
    }
    if (f?.local && Math.abs(f.target - a.target_position) < 0.01) {
      f.key = a.fade_started;
      f.local = false;
      return;
    }
    this._startGlide();
    this._fade = {
      key: a.fade_started,
      from: a.fade_from,
      target: a.target_position,
      total,
      eased: total <= EASE_MAX_SECONDS,
      done,
      at: now,
    };
  }

  // The eased display and the even lights differ during a fade. A stop or a new fade must not make that jump.
  _startGlide() {
    if (this._shown !== undefined) this._glide = { from: this._shown, at: performance.now() };
  }

  _position() {
    if (this._drag && this._drag.kind === "main" && this._drag.moved) {
      this._glide = null;
      return this._drag.pos;
    }
    let shown = this._value();
    if (this._glide) {
      const part = (performance.now() - this._glide.at) / 300;
      if (part >= 1) this._glide = null;
      else shown = this._glide.from + (shown - this._glide.from) * ease(part);
    }
    this._shown = shown;
    return shown;
  }

  _value() {
    if (this._fade) {
      const f = this._fade;
      const done = this._fadeDone();
      return f.from + (f.target - f.from) * (f.eased ? ease(done) : done);
    }
    if (this._hold) {
      if (performance.now() < this._hold.until && Math.abs(this._ctl.pos - this._hold.pos) > 0.7) return this._hold.pos;
      this._hold = null;
    }
    return this._ctl.pos;
  }

  _fadeDone() {
    const f = this._fade;
    return clamp(f.done + (performance.now() - f.at) / 1000 / f.total, 0, 1);
  }

  _override() {
    // A color being chosen on the card shows at once, before the lights report it.
    if (this._colorLocal && this._colorX !== undefined) return this._colorLocal;
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

  // -- the view of all single lights --------------------------------------------------------------

  _detailsMode() {
    const cfg = this._config;
    if (!this._options || this._options.lights.length < 2 || cfg.design === "columns") return "off";
    return cfg.details;
  }

  _detailsHtml() {
    const t = this._t;
    const o = this._options;
    const canGroup = units(o, this._hass, true).length < o.lights.length;
    const group = this._detailsGroup ?? this._config.group;
    const title = esc(t("Single lights", "Einzelne Leuchten"));
    return `<dialog class="details js-details" aria-label="${title}"><div class="details-in">
      <div class="details-head"><div><h3 class="name js-name"></h3><p class="status">${title}</p></div><button class="icon-btn js-details-close" aria-label="${esc(t("Close", "Schließen"))}">${CLOSE_ICON}</button></div>
      <div class="bars js-dbars"></div>
      <div class="details-colors" hidden><b>${esc(t("Active light colors", "Aktive Lichtfarben"))}</b><div class="named-chips js-named-chips"></div></div>
      ${canGroup ? `<label class="details-group"><input type="checkbox" class="js-dgroup"${group ? " checked" : ""}> ${esc(t("Combine identical lights", "Gleiche Leuchten zusammenfassen"))}</label>` : ""}
      <div class="details-foot">${RESETS}</div>
    </div></dialog>`;
  }

  // A single light's name opens its normal controls, for its color. A combined column has no single light to open.
  _detailBars() {
    const o = this._options;
    if (!o) return "";
    return units(o, this._hass, this._detailsGroup ?? this._config.group, false)
      .map((u) => {
        const ids = esc(u.ids.join(","));
        const label = `<button class="bar-name js-pick" data-ids="${ids}" data-mode="${u.light.mode}" data-name="${esc(u.name)}">${esc(u.name)}</button>`;
        return `<div class="bar"><b class="js-barv"></b><div class="well" data-slider="bar" data-ids="${ids}" aria-label="${esc(u.name)}"><div class="fill js-bar" data-ids="${ids}"></div></div>${label}</div>`;
      })
      .join("");
  }

  _openDetails() {
    const dialog = this.shadowRoot.querySelector(".js-details");
    if (!dialog || dialog.open) return;
    dialog.showModal();
    this._kick();
  }

  // A tap on the card opens the view, unless it was meant for a control. A tap in the dial's middle operates nothing.
  _tapOpens(e) {
    const mode = this._detailsMode();
    if (mode !== "card" && mode !== "both") return false;
    if (performance.now() - (this._dragEnded || 0) < 80) return false;
    const t = e.target;
    const dial = t.closest?.('[data-slider="arc"]');
    if (dial) {
      const r = dial.getBoundingClientRect();
      return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width * 0.26;
    }
    return !t.closest?.("button, input, a, dialog, [data-slider], .js-colorbar");
  }

  _sliderRoles() {
    this.shadowRoot.querySelectorAll("[data-slider]").forEach((el) => {
      el.setAttribute("role", "slider");
      el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", this._t("Position", "Position"));
      el.setAttribute("aria-valuemin", "0");
      el.setAttribute("aria-valuemax", "100");
    });
  }

  // Shows the colors the lights report. A mix of them would be a color no light has.
  _paintActive(colors) {
    const root = this.shadowRoot;
    const paint = (c) => `rgb(${css(lightColor(c.rgb))})`;
    const names = (c) => esc(c.ids.map((id) => friendly(this._hass, id)).join(", "));
    root.querySelectorAll(".js-chips").forEach((el) => {
      el.innerHTML = colors.map((c) => `<i class="chip" style="background:${paint(c)}" title="${names(c)}"></i>`).join("");
    });
    root.querySelectorAll(".js-named-chips").forEach((el) => {
      el.innerHTML = colors.map((c) => `<span><i class="chip" style="background:${paint(c)}"></i>${names(c)}</span>`).join("");
      el.parentElement.hidden = !colors.length;
    });
  }

  // What a light taken out by hand reports. A plain on/off light reports no brightness while it is on.
  _reported(entityId) {
    const real = this._hass.states[entityId];
    if (real?.state !== "on") return { v: 0, c: null };
    return { v: (real.attributes.brightness ?? 255) / 2.55, c: real.attributes.rgb_color || null };
  }


  _build() {
    const cfg = this._config,
      ctl = this._ctl;
    const design = TEMPLATES[cfg.design] ? cfg.design : "gradient";
    const pos = cfg.button_position === "auto" ? AUTO_POS[design] || "auto" : cfg.button_position;
    const detailsWereOpen = !!this.shadowRoot.querySelector(".js-details")?.open;
    const mode = this._detailsMode();
    const powerAt = this._powerPlace();
    const template = TEMPLATES[design]
      .replace("{{HEAD}}", this._headHtml(true, powerAt))
      .replace("{{HEADP}}", this._headHtml(false, powerAt))
      .replace("{{REG}}", powerAt === "slider" ? `<div class="regline">${POWER}<div>${REG}</div></div>` : REG);
    const floating = !template.includes('class="head"');
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="card"><div class="progress js-progress" hidden><i></i></div>
      <div class="cc" data-pos="${pos}" data-sl="${cfg.slider}" data-color="${cfg.color}"${cfg.dial_wedge ? " data-wedge" : ""}${cfg.show_header_value ? "" : " data-novalue"}>${template}<div class="colorrow js-colorrow" hidden><span class="chips js-chips" role="group" aria-label="${esc(this._t("Active light colors", "Aktive Lichtfarben"))}" hidden></span><div class="colorbar js-colorbar" role="slider" tabindex="0" aria-label="${esc(this._t("Color", "Farbe"))}" aria-valuemin="0" aria-valuemax="100"><u class="js-colorwhite"></u><u class="js-colorhue"></u><i class="colorknob js-colorknob" hidden></i></div></div>${floating ? `<div class="reset-float">${RESET_WRAP}</div>` : ""}</div>${mode === "off" ? "" : this._detailsHtml()}${this._pickerHtml()}</ha-card>`;
    this._built = true;
    this._activeKey = null;
    this._paintKey = null;
    const root = this.shadowRoot;
    const opensBy = (...how) => how.includes(mode);
    root.querySelector(".cc").toggleAttribute("data-tap", opensBy("card", "both"));
    root.querySelectorAll(".js-details-open").forEach((el) => {
      el.hidden = !opensBy("button", "both");
      el.setAttribute("aria-label", this._t("Show single lights", "Einzelne Leuchten zeigen"));
    });
    if (opensBy("card", "both")) {
      root.querySelectorAll(".js-title").forEach((el) => {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-haspopup", "dialog");
      });
    }
    root.querySelectorAll(".js-dbars").forEach((el) => (el.innerHTML = this._detailBars()));
    const dark = isDark(root.querySelector(".card"), this._hass);
    this._dark = dark;
    this.toggleAttribute("data-dark", dark);
    const $$ = (sel, fn) => root.querySelectorAll(sel).forEach(fn);
    const o = this._options;
    const override = this._override();
    const lang = langOf(this._hass);
    const name = cfg.name || friendly(this._hass, cfg.entity);
    $$(".js-mix", (el) => (el.innerHTML = this._mixer()));
    this._paintColorBar();
    $$(".js-name", (el) => (el.textContent = name));
    $$(".js-unit", (el) => (el.textContent = ctl.unit));
    $$(".big", (el) => (el.hidden = !cfg.show_header_value));
    $$(".js-power", (el) => el.setAttribute("aria-label", this._t("Switch on or off", "Ein- oder ausschalten")));
    root.querySelector(".cc").classList.toggle("readonly", ctl.readonly);
    $$(".js-ticks", (el) => (el.innerHTML = this._ticks()));
    const us = o ? units(o, this._hass, cfg.group, false) : [];
    this._units = us;
    const list = this._buttons();
    const sub = (b) => {
      const bits = [];
      if (cfg.show_value) bits.push(`${formatValue(ctl, b.position, lang)} ${ctl.unit}`);
      if (cfg.show_duration) bits.push(`${comma(lang, b.duration)} s`);
      return bits.length ? `<span>${esc(bits.join(" · "))}</span>` : "";
    };
    const tile = powerAt === "buttons" ? POWER_TILE : "";
    $$(".btns", (el) => (el.hidden = !list.length && !tile));
    $$(".js-presets", (el) => {
      el.innerHTML = tile + list.map((b) => this._buttonHtml(b, sub, us, override, dark, false)).join("");
    });
    $$(".js-scenes", (el) => {
      el.classList.toggle("four", list.length === 4 && !tile);
      el.innerHTML = tile + list.map((b) => this._buttonHtml(b, sub, us, override, dark, true)).join("");
    });
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
    // Columns can dim, open a light's settings, both, or only show.
    const cmode = cfg.columns_mode;
    const pickData = (u) => `data-ids="${esc(u.ids.join(","))}" data-mode="${u.light.mode}" data-name="${esc(u.name)}"`;
    const nameOf = (u) =>
      cmode === "dim_settings" || cmode === "settings"
        ? `<button class="bar-name${cmode === "settings" ? " plain" : ""} js-pick" ${pickData(u)}>${esc(u.name)}</button>`
        : `<span>${esc(u.name)}</span>`;
    const wellOf = (u) =>
      cmode === "settings"
        ? `<div class="well js-pick" ${pickData(u)} role="button" tabindex="0" aria-label="${esc(u.name)}"><div class="fill js-bar" data-ids="${esc(u.ids.join(","))}"></div><i class="gear">${GEAR_ICON}</i></div>`
        : `<div class="well" ${cmode === "dim" || cmode === "dim_settings" ? 'data-slider="bar"' : ""} data-ids="${esc(u.ids.join(","))}" aria-label="${esc(u.name)}"><div class="fill js-bar" data-ids="${esc(u.ids.join(","))}"></div></div>`;
    $$(".js-bars", (el) => {
      el.innerHTML = o
        ? us.map((u) => `<div class="bar">${wellOf(u)}${nameOf(u)}</div>`).join("")
        : `<div class="bar"><div class="well"><div class="fill js-self"></div></div><span>${esc(name)}</span></div>`;
    });
    $$(".js-reset-dim", (el) => (el.textContent = this._t("Reset dimming", "Dimming zurücksetzen")));
    $$(".js-reset-color", (el) => (el.textContent = this._t("Reset colors", "Farben zurücksetzen")));
    $$(".js-resets-open", (el) => el.setAttribute("aria-label", this._t("Reset", "Zurücksetzen")));
    $$(".js-segs", (el) => (el.innerHTML = this._arcSegments()));
    $$(".js-dticks", (el) => (el.innerHTML = this._arcTicks()));
    $$(".js-chart", (el) => (el.innerHTML = this._chart(us)));
    $$(".js-legend", (el) => {
      el.innerHTML = us
        .map((u) => `<span><i class="key" style="background:${seriesVar(u.slot)}"></i>${esc(u.name)}</span>`)
        .join("");
    });
    this._sliderRoles();
    this._live(true);
    if (detailsWereOpen && mode !== "off") this._openDetails();
  }

  // Where the power button goes. Among the buttons it needs buttons, beside the slider a slider.
  _powerPlace() {
    const cfg = this._config;
    if (this._ctl?.readonly || cfg.power === "off") return "off";
    const design = TEMPLATES[cfg.design] ? cfg.design : "gradient";
    if (cfg.power === "slider" && TEMPLATES[design].includes("{{REG}}")) return "slider";
    if (cfg.power === "buttons" && cfg.buttons_on && this._buttons().length) return "buttons";
    return "header";
  }

  // Each part of the header can be switched off. Without any part there is no header at all.
  _headHtml(withValue, powerAt) {
    const cfg = this._config;
    const details = ["button", "both"].includes(this._detailsMode());
    const value = withValue && cfg.show_header_value;
    const power = powerAt === "header";
    if (!cfg.show_title && !value && !power && !details) return "";
    return `<div class="head">${cfg.show_title ? TITLE : '<div class="head-space"></div>'}${value ? VALUE : ""}${RESET_WRAP}${details ? OPEN_DETAILS : ""}${power ? POWER : ""}</div>`;
  }

  // A button can show its light: tinted with it (color and brightness), with an icon, or with a small preview per light.
  _buttonHtml(b, sub, us, override, dark, scene) {
    const o = this._options;
    const style = this._config.button_style || "tint_icon";
    const icon = style === "tint_icon" || style === "icon_preview" ? buttonIcon(b) : "";
    let cls = scene ? "preset scene" : "preset";
    const attr = "";
    if (style === "tint" || style === "tint_icon") cls += " tint";
    const preview =
      (style === "preview" || style === "icon_preview") && o
        ? `<span class="pv" aria-hidden="true">${us
            .map((u) => {
              const l = lampAt(o, u.light, b.position, override);
              return `<i style="background:${l.v > 0.3 ? rampColor(l.c, Math.pow(l.v / 100, 0.6), dark) : "var(--cr-well)"}"></i>`;
            })
            .join("")}</span>`
        : "";
    return `<button class="${cls}" data-pos="${b.position}" data-dur="${b.duration}"${attr}>${icon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : ""}<b>${esc(b.name)}</b>${sub(b)}${preview}</button>`;
  }

  // -- a single light's own color ------------------------------------------------------------------

  _pickerHtml() {
    const t = this._t;
    const control = (kind, label) =>
      `<div class="lp-ctl" data-ctl="${kind}"><div class="lp-row"><span>${esc(label)}</span><b class="js-lp-val"></b></div><div class="lp-bar js-pickbar" data-kind="${kind}" role="slider" tabindex="0" aria-label="${esc(label)}"><i class="colorknob js-lp-knob" hidden></i></div></div>`;
    return `<dialog class="lightpick js-lightpick" aria-label="${esc(t("Light settings", "Leuchte einstellen"))}"><div class="lp-in">
      <div class="details-head"><button class="icon-btn js-lp-back" hidden aria-label="${esc(t("Back", "Zurück"))}">${BACK_ICON}</button><div><h3 class="name js-lp-name"></h3><p class="status js-lp-mode"></p></div><button class="icon-btn js-lp-close" aria-label="${esc(t("Close", "Schließen"))}">${CLOSE_ICON}</button></div>
      ${control("bri", t("Brightness", "Helligkeit"))}
      <button class="reset js-lp-onoff" hidden></button>
      ${control("white", t("White tone", "Weißton"))}
      ${control("hue", t("Color", "Farbe"))}
      ${control("sat", t("Saturation", "Sättigung"))}
      <div class="lp-members js-lp-members" hidden></div>
      <button class="reset js-lp-reset" hidden>${esc(t("Reset this light", "Diese Leuchte zurücksetzen"))}</button>
    </div></dialog>`;
  }

  // A light's settings: its brightness, and white tones, colors and saturation as far as its mode allows.
  // A combined column also lists its lights, each with its own brightness and its own settings.
  _openPicker(ids, mode, name, back = null) {
    const dialog = this.shadowRoot.querySelector(".js-lightpick");
    if (!dialog) return;
    const t = this._t;
    const state = this._hass.states[ids[0]];
    const a = state?.attributes || {};
    const on = state?.state === "on";
    const range = [a.min_color_temp_kelvin || 2000, a.max_color_temp_kelvin || 6500];
    const rgb = on && a.color_mode !== "color_temp" && a.rgb_color ? a.rgb_color : null;
    const top = rgb ? Math.max(...rgb) : 0;
    this._pick = { ids, mode, name, range, back, hue: rgb ? rgbHue(rgb) : 0, sat: rgb && top ? (top - Math.min(...rgb)) / top : 1 };
    dialog.querySelector(".js-lp-name").textContent = name;
    const label =
      { onoff: t("On and off", "Ein und aus"), dim: t("Dimmable", "Dimmbar"), cct: t("White tones", "Weißtöne"), rgb: t("Colors", "Farben"), rgbcct: t("Colors and white tones", "Farben und Weißtöne") }[mode] || "";
    dialog.querySelector(".js-lp-mode").textContent = ids.length > 1 ? `${label} · ${t(`${ids.length} lights`, `${ids.length} Leuchten`)}` : label;
    dialog.querySelector(".js-lp-back").hidden = !back;
    const show = (kind, yes) => (dialog.querySelector(`[data-ctl="${kind}"]`).hidden = !yes);
    show("bri", mode !== "onoff");
    show("white", mode === "cct" || mode === "rgbcct");
    show("hue", mode === "rgb" || mode === "rgbcct");
    show("sat", mode === "rgb" || mode === "rgbcct");
    const onoff = dialog.querySelector(".js-lp-onoff");
    onoff.hidden = mode !== "onoff";
    onoff.textContent = on ? t("Switch off", "Ausschalten") : t("Switch on", "Einschalten");
    const stops = (n, f) => Array.from({ length: n + 1 }, (_, i) => `rgb(${css(f(i / n))}) ${((i / n) * 100).toFixed(1)}%`).join(",");
    const bar = (kind) => dialog.querySelector(`[data-ctl="${kind}"] .js-pickbar`);
    const shine = rgb || (a.color_temp_kelvin ? kRgb(a.color_temp_kelvin) : kRgb(2900));
    bar("bri").style.backgroundImage = `linear-gradient(90deg, var(--cr-well), ${lightA(shine, 1)})`;
    bar("white").style.backgroundImage = `linear-gradient(90deg,${stops(6, (x) => kRgb(range[0] + (range[1] - range[0]) * x))})`;
    bar("hue").style.backgroundImage = `linear-gradient(90deg,${stops(12, (x) => hueRgb((x * 360) % 360))})`;
    this._paintSaturation();
    const place = (kind, x) => {
      const knob = bar(kind).querySelector(".js-lp-knob");
      knob.hidden = x === null;
      if (x !== null) knob.style.left = `${clamp(x, 0, 1) * 100}%`;
    };
    const level = on ? (a.brightness ?? 255) / 255 : 0;
    place("bri", level);
    this._pickValue("bri", `${Math.round(level * 100)} %`);
    place("white", on && a.color_mode === "color_temp" && a.color_temp_kelvin ? (a.color_temp_kelvin - range[0]) / (range[1] - range[0] || 1) : null);
    place("hue", rgb ? this._pick.hue / 360 : null);
    place("sat", rgb ? this._pick.sat : null);
    const members = dialog.querySelector(".js-lp-members");
    members.hidden = ids.length < 2;
    members.innerHTML =
      ids.length < 2
        ? ""
        : `<b>${esc(t("Each light", "Einzeln"))}</b>` +
          ids
            .map((id) => {
              const s = this._hass.states[id];
              const v = s?.state === "on" ? (s.attributes.brightness ?? 255) / 255 : 0;
              const n = friendly(this._hass, id);
              return `<div class="lp-member"><button class="lp-mname js-lp-member" data-id="${esc(id)}">${esc(n)}</button><div class="lp-bar lp-mini js-pickbar" data-kind="bri" data-id="${esc(id)}" role="slider" tabindex="0" aria-label="${esc(n)}" style="background-image:linear-gradient(90deg, var(--cr-well), ${lightA(shine, 1)})"><i class="colorknob js-lp-knob" style="left:${(v * 100).toFixed(0)}%"></i></div></div>`;
            })
            .join("");
    const deviating = this._ctl.state?.attributes?.deviating || [];
    dialog.querySelector(".js-lp-reset").hidden = !ids.some((id) => deviating.includes(id));
    if (!dialog.open) dialog.showModal();
  }

  _paintSaturation() {
    const bar = this.shadowRoot.querySelector('.js-lightpick [data-ctl="sat"] .js-pickbar');
    if (bar && this._pick) bar.style.backgroundImage = `linear-gradient(90deg, #ffffff, rgb(${css(hueRgb(this._pick.hue % 360))}))`;
  }

  _pickValue(kind, text) {
    const el = this.shadowRoot.querySelector(`.js-lightpick [data-ctl="${kind}"] .js-lp-val`);
    if (el) el.textContent = text;
  }

  // Follows the finger like the slider: sent a few times a second, and once more on release.
  _pickAt(bar, e, final) {
    const r = bar.getBoundingClientRect();
    const kind = bar.dataset.kind;
    let place = clamp((e.clientX - r.left) / (r.width || 1), 0, 1);
    if (kind === "bri" && place * 100 < OFF_SNAP) place = 0;
    const knob = bar.querySelector(".js-lp-knob");
    knob.hidden = false;
    knob.style.left = `${place * 100}%`;
    const pick = this._pick;
    const dialog = bar.closest("dialog");
    const knobOf = (k) => dialog.querySelector(`[data-ctl="${k}"] .js-lp-knob`);
    // A light shows a white tone or a color, so choosing one hides the other's mark.
    if (kind === "white") ["hue", "sat"].forEach((k) => (knobOf(k).hidden = true));
    if (kind === "hue" || kind === "sat") knobOf("white").hidden = true;
    if (kind === "hue") {
      pick.hue = (place * 360) % 360;
      this._paintSaturation();
      knobOf("sat").hidden = false;
      knobOf("sat").style.left = `${pick.sat * 100}%`;
    }
    if (kind === "sat") {
      pick.sat = place;
      knobOf("hue").hidden = false;
      knobOf("hue").style.left = `${(pick.hue / 360) * 100}%`;
    }
    if (kind === "bri" && !bar.dataset.id) this._pickValue("bri", `${Math.round(place * 100)} %`);
    const now = performance.now();
    if (!final && now - (this._pickSent || 0) < this._interval()) return;
    this._pickSent = now;
    const lights = bar.dataset.id ? [bar.dataset.id] : pick.ids;
    if (kind === "bri") {
      this._hass
        .callWS({ type: "cloudless_crescendo/lights/set", entity_id: this._ctl.entityId, lights, brightness: Math.round(place * 100) })
        .catch(() => {});
      return;
    }
    const msg = { type: "cloudless_crescendo/lights/color", entity_id: this._ctl.entityId, lights };
    if (kind === "white") msg.kelvin = Math.round(pick.range[0] + (pick.range[1] - pick.range[0]) * place);
    else msg.xy = rgbToXy(hueRgb(pick.hue % 360).map((v) => v + (255 - v) * (1 - pick.sat))).map((v) => Math.round(v * 10000) / 10000);
    this._hass.callWS(msg).catch(() => {});
  }

  // -- the control's colors --------------------------------------------------------------------------

  // Repaints only when what it shows changed: the color mode, a chosen color, the theme or the curve.
  _paintControl() {
    const cfg = this._config;
    const key = JSON.stringify([cfg.color, cfg.custom_color, cfg.button_style, this._override(), this._dark, this._curveId, this._units?.length]);
    if (key === this._paintKey) return;
    this._paintKey = key;
    const set = (el, layers) => {
      el.style.backgroundImage = layers.image;
      el.style.backgroundSize = layers.size || "";
      el.style.backgroundPosition = layers.position || "";
      el.style.backgroundRepeat = layers.size ? "no-repeat" : "";
    };
    const across = this._controlLayers(false),
      up = this._controlLayers(true),
      slim = { image: this._gradient("90deg") };
    this.shadowRoot.querySelectorAll(".js-grad").forEach((el) => set(el, el.classList.contains("slim-track") ? slim : across));
    this.shadowRoot.querySelectorAll(".js-vgrad").forEach((el) => set(el, up));
    this.shadowRoot.querySelectorAll(".dial-seg").forEach((el) => (el.style.stroke = this._segColor(+el.dataset.p, el.dataset.u)));
    this._tintButtons();
  }

  // A tinted button shows every light color it switches on, side by side, as bright as the room gets there.
  _tintButtons() {
    const o = this._options;
    const override = this._override();
    const dark = this._dark;
    this.shadowRoot.querySelectorAll(".preset.tint[data-pos]").forEach((el) => {
      const pos = +el.dataset.pos;
      const room = o ? roomLight(o, pos, override) : { c: [108, 140, 240], a: 0.2 + (0.8 * pos) / 100 };
      const a = 0.14 + 0.86 * room.a;
      const lit = o ? (this._units || []).map((u) => lampAt(o, u.light, pos, override)).filter((l) => l.v > 0.3) : [];
      const colors = lit.length ? lit.map((l) => l.c) : [room.c];
      const total = lit.reduce((sum, l) => sum + Math.sqrt(l.v), 0);
      let at = 0;
      const stops =
        colors.length > 1
          ? lit.map((l) => {
              const from = at;
              at += (Math.sqrt(l.v) / total) * 100;
              return `${lightA(l.c, a)} ${((from + at) / 2).toFixed(0)}%`;
            })
          : [lightA(colors[0], a * 0.55), lightA(colors[0], a)];
      // The text color follows how bright the button really looks: its light over the card's ground.
      const lum = colors.reduce((sum, c) => sum + lumOf(lightColor(c)), 0) / colors.length;
      const looks = 0.8 * a * lum + (1 - 0.8 * a) * (dark ? 0.12 : 0.96);
      el.style.background = `linear-gradient(135deg, ${stops.join(", ")})`;
      el.style.color = looks > 0.55 ? "#171d2d" : dark ? "var(--cr-ink)" : "#ffffff";
    });
  }

  _controlLayers(vertical) {
    if (this._config.color === "stripes" && this._options && this._units?.length) {
      return stripeLayers(this._options, this._units, this._override(), this._dark, vertical);
    }
    return { image: this._gradient(vertical ? "0deg" : "90deg") };
  }

  _gradient(dir) {
    const cfg = this._config,
      ctl = this._ctl;
    const dark = this._dark;
    const fade = (c) =>
      dark ? `linear-gradient(${dir}, ${c}, ${c})` : `linear-gradient(${dir}, color-mix(in srgb, ${c} 12%, transparent), ${c})`;
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

  _segColor(pct, unit) {
    const cfg = this._config,
      ctl = this._ctl;
    const dark = this._dark;
    if (cfg.color === "stripes" && unit !== undefined && this._options && this._units?.[+unit]) {
      const l = lampAt(this._options, this._units[+unit].light, pct, this._override());
      return l.v <= 0.3 ? "var(--cr-well)" : `rgba(${css(l.c)},${(dark ? Math.min(1, 0.35 + (l.v / 100) * 1.5) : 0.3 + 0.7 * (l.v / 100)).toFixed(2)})`;
    }
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

  // As a wedge, the ring grows where the room gets brighter.
  _segWidth(pct) {
    if (!this._config.dial_wedge) return "";
    const a = this._options ? roomLight(this._options, pct, this._override()).a : pct / 100;
    return `stroke-width:${(a > 0 ? 26 * (0.14 + 0.86 * a) : 0).toFixed(1)}`;
  }

  // With stripes, the ring holds one thin ring per light, inner to outer in the lights' order.
  _arcSegments() {
    const count = 54;
    const stripes = this._config.color === "stripes" && this._options ? this._units || [] : [];
    const layers = stripes.length || 1;
    let under = "",
      out = "";
    for (let i = 0; i < count; i++) {
      const a0 = ((135 + (i / count) * 270 - 0.4) * Math.PI) / 180;
      const a1 = ((135 + ((i + 1) / count) * 270 + 0.4) * Math.PI) / 180;
      const pct = ((i + 0.5) / count) * 100;
      const p = (a, r) => `${(130 + r * Math.cos(a)).toFixed(2)} ${(130 + r * Math.sin(a)).toFixed(2)}`;
      const arc = (r) => `d="M${p(a0, r)} A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${p(a1, r)}"`;
      const width = this._segWidth(pct);
      const full = width ? parseFloat(width.split(":")[1]) : 22;
      if (width) under += `<path class="dial-under" style="${width}" ${arc(100)}/>`;
      if (!stripes.length) {
        out += `<path class="dial-seg" data-p="${pct.toFixed(1)}" style="stroke:${this._segColor(pct)};${width}" ${arc(100)}/>`;
        continue;
      }
      const w = full / layers;
      for (let j = 0; j < layers; j++) {
        const r = 100 - full / 2 + w * (j + 0.5);
        out += `<path class="dial-seg" data-p="${pct.toFixed(1)}" data-u="${j}" style="stroke-width:${Math.max(0.5, w - 0.8).toFixed(2)}" ${arc(r)}/>`;
      }
    }
    return under + out;
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
    // At a button's position the value shows the button's name.
    const named =
      cfg.button_names && !this._fade ? this._buttons().find((b) => Math.abs(b.position - p) < 0.5) : null;
    $$(".js-pos", (el) => (el.textContent = named && !el.closest(".ch") ? named.name : shown));
    $$(".head .js-unit, .big .js-unit", (el) => (el.hidden = !!named));
    $$(".head .value, .big", (el) => el.classList.toggle("named", !!named));
    if ((named?.name ?? null) !== this._fitted) {
      this._fitted = named?.name ?? null;
      this._fitNames();
    }
    $$('[data-slider]:not([data-slider="bar"]):not([data-slider="chan"])', (el) =>
      el.setAttribute("aria-valuenow", Math.round(p)),
    );
    const o = this._options;
    const override = this._override();
    // Each light's place on the curve, once per frame for everything below.
    const lamps = o ? new Map(o.lights.map((light) => [light.entity_id, lampAt(o, light, p, override)])) : null;
    const tot = o ? o.lights.reduce((sum, light) => sum + lamps.get(light.entity_id).v / 100, 0) : 0;
    const avg = tot ? roomLight(o, p, override, lamps).c : null;
    this._paintControl();
    root.querySelector(".cc")?.classList.toggle("moving", !!(this._fade || this._drag || this._glide));
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
      const done = this._fadeDone();
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
    const unreached = cfg.dial_wedge || this._dark ? 0 : 0.22;
    $$(".dial-seg", (el) => (el.style.opacity = +el.dataset.p <= p ? 1 : unreached));
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
    const now = performance.now();
    let holding = false;
    // Columns show the value set by the curve, because lights report only about once per second.
    // A light taken out by hand shows what it reports, including a color set in its own controls.
    $$(".js-bar", (el) => {
      const ids = el.dataset.ids.split(",");
      const light = o?.lights.find((x) => x.entity_id === ids[0]);
      if (!light) return;
      const l = lamps.get(light.entity_id);
      const drag = this._drag?.kind === "bar" && this._drag.ids[0] === ids[0] ? this._drag.pos : null;
      const hold = this._barHolds[ids[0]];
      const kept = hold && now < hold.until ? hold.pos : null;
      if (kept !== null) holding = true;
      const awayId = ids.find((id) => deviating.includes(id));
      const real = awayId ? this._reported(awayId) : null;
      const v = drag ?? kept ?? (real ? real.v : l.v);
      const color = real?.c || l.c;
      el.style.height = `${v}%`;
      el.style.backgroundColor = lightA(color, 1);
      el.parentElement.classList.toggle("dev", !!awayId || drag !== null);
      el.parentElement.setAttribute("aria-valuenow", Math.round(v));
      const label = el.closest(".bar")?.querySelector(".js-barv");
      if (label) label.textContent = `${Math.round(v)} %`;
    });
    const apartDim = ctl.state.attributes.deviating_brightness ?? deviating;
    const apartColor = ctl.state.attributes.deviating_color ?? [];
    $$(".js-reset-dim", (el) => (el.hidden = !apartDim.length));
    $$(".js-reset-color", (el) => (el.hidden = !ctl.state.attributes.color_override && !apartColor.length));
    const differs = apartDim.length > 0 || apartColor.length > 0 || !!ctl.state.attributes.color_override;
    $$(".reset-wrap", (el) => el.classList.toggle("show", differs));
    if (!differs) $$(".js-reset-menu", (el) => (el.hidden = true));
    const attrs = ctl.state?.attributes || {};
    const picks = cfg.color_control && (this._hasColor() || this._hasWhite());
    const back = !!attrs.color_override;
    const colors = o ? activeColors(o.lights.map((l) => l.entity_id), this._hass) : [];
    const activeKey = colors.map((c) => `${css(c.rgb)}:${c.ids.join()}`).join("|");
    if (activeKey !== this._activeKey) {
      this._activeKey = activeKey;
      this._paintActive(colors);
    }
    // The dots say which colors the lights have. Columns and the current light colors already show that.
    const shownElsewhere = cfg.design === "columns" || cfg.color === "stripes";
    const chips = colors.length > 0 && !shownElsewhere && (cfg.colors_always || back || deviating.length > 0);
    $$(".js-colorrow", (el) => (el.hidden = !picks && !chips));
    $$(".js-chips", (el) => (el.hidden = !chips));
    $$(".js-colorbar", (el) => (el.hidden = !picks));
    const place = this._colorX ?? this._colorPlace();
    $$(".js-colorknob", (el) => {
      el.hidden = place === null;
      if (place !== null) el.style.left = `${clamp(place, 0.012, 0.988) * 100}%`;
    });
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
    $$(".js-pic", (el) => this._drawPicture(el, p, override, lamps));
    if (f || this._hold || this._drag || this._glide || holding) this._kick();
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
    return defaultMark(index, count);
  }

  _drawPicture(el, p, override, lamps) {
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
      .map((light, i) => ({ l: lamps?.get(light.entity_id) ?? lampAt(o, light, p, override), pt: this._point(light.entity_id, i, o.lights.length) }))
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

  // -- the color bar: whites on the left, colors on the right ------------------------------------

  // What the lights can show: an object goes by its lights' modes in the setup, other lights by what they report.
  _barKinds() {
    const o = this._options;
    if (this._ctl.crescendo && o) {
      const modes = o.lights.map((l) => l.mode);
      return { white: modes.some((m) => m === "cct" || m === "rgbcct"), color: modes.some((m) => m === "rgb" || m === "rgbcct") };
    }
    const m = this._ctl.state?.attributes?.supported_color_modes || [];
    return { white: m.includes("color_temp"), color: m.some((x) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(x)) };
  }

  _hasColor() {
    const k = this._barKinds();
    return k.color && (!k.white || this._config.color_bar !== "white");
  }

  _hasWhite() {
    const k = this._barKinds();
    return k.white && (!k.color || this._config.color_bar !== "color");
  }

  _placeOverride(place) {
    const share = this._whiteShare(),
      [low, high] = this._whiteRange();
    if (place <= share) return { rgb: kRgb(low + ((high - low) * place) / (share || 1)), white: true };
    const gap = share ? share + 0.012 : 0;
    return { rgb: hueRgb((clamp((place - gap) / (1 - gap), 0, 1) * 360) % 360), white: false };
  }

  _whiteShare() {
    return !this._hasColor() ? 1 : this._hasWhite() ? 0.28 : 0;
  }

  _whiteRange() {
    const a = this._ctl.state?.attributes || {};
    return [a.min_color_temp_kelvin || 2000, a.max_color_temp_kelvin || 6500];
  }

  _paintColorBar() {
    const white = this.shadowRoot.querySelector(".js-colorwhite");
    const hue = this.shadowRoot.querySelector(".js-colorhue");
    if (!white || !hue) return;
    const share = this._whiteShare(),
      [low, high] = this._whiteRange();
    const stops = (count, color) =>
      Array.from({ length: count + 1 }, (_, i) => `rgb(${css(color(i / count))}) ${((i / count) * 100).toFixed(1)}%`).join(",");
    white.hidden = !share;
    hue.hidden = share === 1;
    white.style.cssText = `left:0;width:${share * 100}%;background-image:linear-gradient(90deg,${stops(4, (t) => kRgb(low + (high - low) * t))})`;
    // Softer than the pure colors, which look harsh side by side. The light still gets the pure color.
    const soft = (t) => hueRgb(t * 360).map((c) => c + (255 - c) * 0.14);
    hue.style.cssText = `left:${share ? (share + 0.012) * 100 : 0}%;right:0;background-image:linear-gradient(90deg,${stops(12, soft)})`;
  }

  _colorPlace() {
    const a = this._ctl.state?.attributes || {};
    if (this._ctl.crescendo && !a.color_override) return null;
    if (this._ctl.state?.state !== "on") return null;
    const share = this._whiteShare(),
      [low, high] = this._whiteRange();
    if (a.color_mode === "color_temp" && a.color_temp_kelvin && share) {
      return (share * (a.color_temp_kelvin - low)) / (high - low || 1);
    }
    if (!a.rgb_color || share === 1) return null;
    const gap = share ? share + 0.012 : 0;
    return gap + ((1 - gap) * rgbHue(a.rgb_color)) / 360;
  }

  _colorFrom(el, e) {
    const r = el.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }

  _sendColor(place, live = false) {
    const share = this._whiteShare(),
      [low, high] = this._whiteRange();
    let data;
    if (place <= share) {
      data = { color_temp_kelvin: Math.round((low + ((high - low) * place) / (share || 1)) / 50) * 50 };
    } else {
      const gap = share ? share + 0.012 : 0;
      data = { rgb_color: hueRgb((clamp((place - gap) / (1 - gap), 0, 1) * 360) % 360) };
    }
    if (live) data.transition = 0.3;
    this._hass.callService("light", "turn_on", data, { entity_id: this._ctl.entityId });
    this._colorX = place;
    this._colorLocal = this._placeOverride(place);
    clearTimeout(this._colorTimer);
    this._colorTimer = setTimeout(() => {
      this._colorX = undefined;
      this._colorLocal = null;
      this._kick();
    }, 2500);
    this._kick();
  }

  _onDown(e) {
    const pickBar = e.target.closest?.(".js-pickbar");
    if (pickBar && this._pick) {
      this._pickDrag = pickBar;
      pickBar.setPointerCapture?.(e.pointerId);
      this._pickAt(pickBar, e, true);
      return;
    }
    const colorBar = e.target.closest?.(".js-colorbar");
    if (colorBar) {
      this._colorDrag = colorBar;
      clearTimeout(this._colorTimer);
      this._colorX = this._colorFrom(colorBar, e);
      colorBar.setPointerCapture(e.pointerId);
      this._kick();
      return;
    }
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
      pos: kind === "bar" ? this._posFrom(el, e) : this._position(),
      last: this._position(),
      ids: kind === "bar" ? el.dataset.ids.split(",") : null,
      chan: el.dataset.chan,
    };
    el.setPointerCapture(e.pointerId);
    this._kick();
  }

  _onMove(e) {
    if (this._pickDrag) {
      this._pickAt(this._pickDrag, e, false);
      return;
    }
    if (this._colorDrag) {
      this._colorX = this._colorFrom(this._colorDrag, e);
      this._colorLocal = this._placeOverride(this._colorX);
      const now = performance.now();
      if (now - (this._colorSent || 0) >= this._interval()) {
        this._colorSent = now;
        this._sendColor(this._colorX, true);
      }
      this._kick();
      return;
    }
    const d = this._drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    if (!d.moved) return;
    const now = performance.now();
    let p = this._offSnap(this._posFrom(d.el, e));
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

  _offSnap(p) {
    return p < OFF_SNAP ? 0 : p;
  }

  _sendLights(ids, brightness) {
    this._hass
      .callWS({ type: "cloudless_crescendo/lights/set", entity_id: this._ctl.entityId, lights: ids, brightness })
      .catch(() => {});
  }

  _onUp(e) {
    if (this._pickDrag) {
      this._pickAt(this._pickDrag, e, true);
      this._pickDrag = null;
      this._dragEnded = performance.now();
      return;
    }
    if (this._colorDrag) {
      const place = this._colorFrom(this._colorDrag, e);
      this._colorDrag = null;
      this._dragEnded = performance.now();
      this._sendColor(place);
      return;
    }
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    this._dragEnded = performance.now();
    if (d.kind === "bar") {
      const p = this._offSnap(this._posFrom(d.el, e));
      this._barHolds[d.ids[0]] = { pos: p, until: performance.now() + 2500 };
      this._sendLights(d.ids, p);
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
      this._go(this._offSnap(this._posFrom(d.el, e)), this._config.tap_duration);
    }
    this._kick();
  }

  _go(pos, duration) {
    const ctl = this._ctl;
    if (ctl.crescendo && duration > 0) {
      this._hold = null;
      this._fade = {
        key: null,
        local: true,
        from: this._position(),
        target: pos,
        total: duration,
        eased: duration <= EASE_MAX_SECONDS,
        done: 0,
        at: performance.now(),
      };
    } else {
      this._hold = { pos, until: performance.now() + (duration < 3 ? (duration + 1.5) * 1000 : 1500) };
    }
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
    const picker = this.shadowRoot.querySelector(".js-lightpick");
    if (picker?.open && (e.target.closest?.(".js-lp-close") || e.target === picker)) {
      picker.close();
      return;
    }
    const pick = e.target.closest?.(".js-pick");
    if (pick) {
      this._openPicker(pick.dataset.ids.split(","), pick.dataset.mode, pick.dataset.name || pick.textContent, null);
      return;
    }
    if (picker?.open) {
      const p = this._pick;
      if (e.target.closest?.(".js-lp-back") && p?.back) {
        this._openPicker(p.back.ids, p.back.mode, p.back.name, null);
        return;
      }
      const member = e.target.closest?.(".js-lp-member");
      if (member) {
        this._openPicker([member.dataset.id], p.mode, member.textContent, { ids: p.ids, mode: p.mode, name: p.name });
        return;
      }
      if (e.target.closest?.(".js-lp-onoff")) {
        const on = this._hass.states[p.ids[0]]?.state === "on";
        this._sendLights(p.ids, on ? 0 : 100);
        e.target.closest(".js-lp-onoff").textContent = on ? this._t("Switch on", "Einschalten") : this._t("Switch off", "Ausschalten");
        return;
      }
      if (e.target.closest?.(".js-lp-reset")) {
        this._hass.callWS({ type: "cloudless_crescendo/lights/reset", entity_id: this._ctl.entityId, what: "all", lights: p.ids }).catch(() => {});
        e.target.closest(".js-lp-reset").hidden = true;
        return;
      }
    }
    // The reset menu opens from its icon and closes with any other tap.
    const menu = this.shadowRoot.querySelector(".js-reset-menu");
    if (e.target.closest?.(".js-resets-open")) {
      menu.hidden = !menu.hidden;
      return;
    }
    if (menu && !menu.hidden && !e.target.closest?.(".js-reset-menu")) menu.hidden = true;
    const dialog = this.shadowRoot.querySelector(".js-details");
    if (e.target.closest?.(".js-details-open")) {
      this._openDetails();
      return;
    }
    if (e.target.closest?.(".js-details-close") || e.target === dialog) {
      dialog.close();
      return;
    }
    const more = e.target.closest?.(".js-more");
    if (more) {
      // Home Assistant's dialog would open underneath this one.
      dialog?.close();
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: more.dataset.id } }));
      return;
    }
    if (e.target.matches?.(".js-dgroup")) {
      this._detailsGroup = e.target.checked;
      this.shadowRoot.querySelector(".js-dbars").innerHTML = this._detailBars();
      this._sliderRoles();
      this._kick();
      return;
    }
    const preset = e.target.closest?.(".preset:not(.js-power)");
    if (preset) {
      this._go(+preset.dataset.pos, +preset.dataset.dur);
      return;
    }
    if (e.target.closest?.(".js-reset-menu")) this.shadowRoot.querySelector(".js-reset-menu").hidden = true;
    if (e.target.closest?.(".js-reset-dim")) {
      this._barHolds = {};
      this._hass.callWS({ type: "cloudless_crescendo/lights/reset", entity_id: this._ctl.entityId, what: "brightness" }).catch(() => {});
      return;
    }
    if (e.target.closest?.(".js-reset-color")) {
      this._hass.callWS({ type: "cloudless_crescendo/lights/reset", entity_id: this._ctl.entityId, what: "colors" }).catch(() => {});
      return;
    }
    if (e.target.closest?.(".js-power")) {
      this._power();
      return;
    }
    if (this._tapOpens(e)) this._openDetails();
  }

  _power() {
    const ctl = this._ctl,
      hass = this._hass;
    const f = this._fade;
    const target = { entity_id: ctl.entityId };
    if (f && f.total >= 3) {
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
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('.js-title[role="button"]')) {
      e.preventDefault();
      this._openDetails();
      return;
    }
    if (e.target.closest?.(".js-colorbar")) {
      const change = { ArrowRight: 0.02, ArrowUp: 0.02, ArrowLeft: -0.02, ArrowDown: -0.02 }[e.key];
      if (change) {
        e.preventDefault();
        this._sendColor(clamp((this._colorX ?? this._colorPlace() ?? 0.5) + change, 0, 1));
      }
      return;
    }
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
      const ids = el.dataset.ids.split(",");
      this._barHolds[ids[0]] = { pos: p, until: performance.now() + 2500 };
      this._sendLights(ids, p);
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
.section { padding: 12px; border: 1px solid var(--divider-color, #d4dae6); border-radius: 10px; }
.hint { margin: 0; font-size: 13px; line-height: 1.4; color: var(--secondary-text-color, #566077); }
.row { display: flex; flex-wrap: wrap; gap: 8px; }
details[open] > summary { margin-bottom: 10px; }
.stack { display: grid; gap: 10px; }
.grp { display: grid; gap: 10px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.grp:last-child { border-bottom: 0; padding-bottom: 0; }
.grp h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.btn-icon { grid-column: 2 / -1; }
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
    this.shadowRoot.addEventListener("value-changed", (e) => {
      if (e.target?.dataset?.f === "icon") this._onChange(e);
    });
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener(
      "toggle",
      (e) => {
        if (e.target.id === "advanced") this._advancedOpen = e.target.open;
      },
      true,
    );
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
    const next = { ...DEFAULTS, ...config };
    const known = this._config;
    this._config = next;
    if (!this._hass) return;
    if (!known || known.entity !== next.entity) this._load();
    else if (Object.keys({ ...known, ...next }).some((k) => JSON.stringify(known[k]) !== JSON.stringify(next[k]))) this._render();
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
          this._entryId = res.entry_id;
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
      `<select id="${id}">${pairs.map(([v, label, off]) => `<option value="${v}"${v === value ? " selected" : ""}${off ? " disabled" : ""}>${esc(label)}</option>`).join("")}</select>`;
    const iconField = (b, i) =>
      customElements.get("ha-icon-picker")
        ? `<ha-icon-picker class="btn-icon" data-i="${i}" data-f="icon" value="${esc(b.icon || "")}" label="${esc(t("Icon (optional)", "Symbol (optional)"))}"></ha-icon-picker>`
        : `<input type="text" class="btn-icon" data-i="${i}" data-f="icon" value="${esc(b.icon || "")}" placeholder="${esc(t("Icon, for example mdi:weather-night", "Symbol, zum Beispiel mdi:weather-night"))}" aria-label="${esc(t("Icon", "Symbol"))}">`;
    const check = (id, on, label) => `<label class="check"><input type="checkbox" id="${id}"${on ? " checked" : ""}> ${esc(label)}</label>`;
    const rows = this._list()
      .map(
        (b, i) => `<div class="btn-row">
        <input type="checkbox" data-i="${i}" data-f="use"${b.use !== false ? " checked" : ""} aria-label="${esc(t("Show", "Zeigen"))}">
        <input type="text" data-i="${i}" data-f="name" value="${esc(b.name)}" aria-label="${esc(t("Name", "Name"))}">
        <input type="number" data-i="${i}" data-f="value" value="${ctl.toValue(b.position)}" step="${ctl.step}" aria-label="${esc(t("Value", "Wert"))}">
        <input type="number" data-i="${i}" data-f="duration" value="${b.duration}" min="0" step="0.5" aria-label="${esc(t("Duration in seconds", "Dauer in Sekunden"))}">
        ${b.own ? `<button data-remove="${i}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button>` : "<span></span>"}
        ${iconField(b, i)}
      </div>`,
      )
      .join("");
    const lights = this._options?.lights || [];
    const marks = lights
      .map((l, i) => {
        const [x, y] = cfg.points?.[l.entity_id] || defaultMark(i, lights.length);
        return `<button class="mark" data-mark="${esc(l.entity_id)}" data-x="${x}" data-y="${y}" style="left:${x * 100}%;top:${y * 100}%">${esc(friendly(hass, l.entity_id))}</button>`;
      })
      .join("");
    const channels = cfg.channels || [];
    const design = cfg.design;
    const hasSlider = ["gradient", "scenes", "columns", "picture"].includes(design);
    const offersDetails = ctl.crescendo && design !== "columns";
    const combines = ["gradient", "columns", "chart"].includes(design) || (offersDetails && cfg.details !== "off");
    const pictureSection =
      design === "picture"
        ? `<div class="ctl stack section">
        <span class="lab">${esc(t("Room picture", "Raumbild"))}</span>
        <p class="hint">${esc(t("Shows a photo of your room. The card darkens it and lets each light shine where you place it, with its current brightness and color.", "Zeigt ein Foto deines Raums. Die Karte dunkelt es ab und lässt jede Leuchte dort scheinen, wo du sie platzierst, mit ihrer aktuellen Helligkeit und Farbe."))}</p>
        <div class="row"><button id="pick-photo">${esc(cfg.photo ? t("Upload another photo", "Anderes Foto hochladen") : t("Upload a photo", "Foto hochladen"))}</button>${cfg.photo ? `<button id="remove-photo">${esc(t("Remove photo", "Foto entfernen"))}</button>` : ""}<input type="file" id="upload" accept="image/*" hidden></div>
        ${this._photoNote ? `<p class="hint">${esc(this._photoNote)}</p>` : ""}
        <label for="photo">${esc(t("Or the address of a picture", "Oder die Adresse eines Bildes"))}</label>
        <input type="text" id="photo" value="${esc(cfg.photo || "")}" placeholder="/local/bad.jpg">
        ${lights.length ? `<span class="lab">${esc(t("Drag each light to its place", "Ziehe jede Leuchte an ihre Stelle"))}</span><div class="picture"${cfg.photo ? ` style="background-image:url('${esc(cfg.photo)}')"` : ""}>${marks}</div>` : ""}
      </div>`
        : "";
    const mixerSection =
      design === "mixer"
        ? `<div class="ctl stack section">
        <span class="lab">${esc(t("Mixer channels", "Kanäle im Mischpult"))}</span>
        <p class="hint">${esc(t("Several controls side by side: this object first, then the devices you add here, such as a speaker, a thermostat or a blind. Each one works on its own.", "Mehrere Regler nebeneinander: zuerst dieses Objekt, daneben die Geräte, die du hier hinzufügst, zum Beispiel Lautsprecher, Thermostat oder Rollo. Jeder Regler arbeitet für sich."))}</p>
        <select id="add-channel"><option value="">${esc(t("Add a channel", "Kanal hinzufügen"))}</option>${others.filter((id) => !channels.includes(id)).map((id) => `<option value="${esc(id)}">${esc(friendly(hass, id))}</option>`).join("")}</select>
        ${channels.map((id) => `<div class="btn-row" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(friendly(hass, id))}</span><button data-rmchan="${esc(id)}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div>`).join("")}
      </div>`
        : "";
    // What the lights can show decides which color choices make sense.
    const modes = (this._options?.lights || []).map((l) => l.mode);
    const kinds = ctl.crescendo && this._options
      ? { white: modes.some((m) => m === "cct" || m === "rgbcct"), color: modes.some((m) => m === "rgb" || m === "rgbcct") }
      : {
          white: (ctl.state?.attributes?.supported_color_modes || []).includes("color_temp"),
          color: (ctl.state?.attributes?.supported_color_modes || []).some((m) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m)),
        };
    const bar = kinds.white && kinds.color ? cfg.color_bar : kinds.white ? "white" : "color";
    const canShow = kinds.white && kinds.color
      ? t("Your lights can show white tones and colors.", "Deine Leuchten können Weißtöne und Farben.")
      : kinds.white
        ? t("Your lights can show white tones only.", "Deine Leuchten können nur Weißtöne.")
        : t("Your lights can show colors only.", "Deine Leuchten können nur Farben.");
    const showsDots = ctl.crescendo && design !== "columns" && cfg.color !== "stripes";
    const group = (title, body) => (body.trim() ? `<section class="grp"><h3>${esc(title)}</h3>${body}</section>` : "");
    const colorHint = {
      stripes: t(
        "Each light gets a thin stripe. Along the scale it shows how bright and in which color the light is at each position.",
        "Jede Leuchte bekommt einen schmalen Streifen. Er zeigt entlang der Skala, wie hell und in welcher Farbe sie an jeder Position leuchtet.",
      ),
      light: t(
        "A gradient of the mixed light at each position. With mostly white lights it looks almost like one color.",
        "Ein Verlauf mit dem gemischten Licht je Position. Bei viel Weiß wirkt er fast einfarbig.",
      ),
    }[cfg.color];
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLE}</style><div class="form">
      ${group(
        t("Connection and design", "Verbindung und Design"),
        `<div class="ctl"><label for="entity">${esc(t("Connected to", "Verbunden mit"))}</label>
        <select id="entity">
          ${objects.length ? `<optgroup label="Crescendo">${objects.map(opt).join("")}</optgroup>` : ""}
          <optgroup label="${esc(t("Other devices", "Andere Geräte"))}">${others.map(opt).join("")}</optgroup>
          ${sensors.length ? `<optgroup label="${esc(t("Display only", "Nur Anzeige"))}">${sensors.map(opt).join("")}</optgroup>` : ""}
        </select></div>
      <div class="ctl"><label for="name">${esc(t("Name (optional)", "Name (optional)"))}</label><input type="text" id="name" value="${esc(cfg.name || "")}"></div>
      <div class="ctl"><span class="lab">${esc(t("Design", "Design"))}</span><div class="designs">${DESIGNS.map(
        ([k, en, de]) => `<button data-design="${k}" aria-pressed="${cfg.design === k}">${esc(lang === "de" ? de : en)}</button>`,
      ).join("")}</div></div>
      ${pictureSection}${mixerSection}
      ${ctl.crescendo && this._entryId ? `<div><button id="open-setup">${esc(t("Edit the object in Crescendo", "Objekt in Crescendo bearbeiten"))}</button></div>` : ""}`,
      )}
      ${group(
        t("Header", "Kopfzeile"),
        `${check("show_title", cfg.show_title, t("Show the name and status", "Name und Status zeigen"))}
      ${check("show_header_value", cfg.show_header_value, t("Show the value, for example 40 %", "Wert zeigen, zum Beispiel 40 %"))}
      ${cfg.show_header_value ? check("button_names", cfg.button_names, t("At a button's position show its name instead of the value", "An der Position eines Buttons seinen Namen statt des Werts zeigen")) : ""}
      ${
        ctl.readonly
          ? ""
          : `<div class="ctl"><label for="power">${esc(t("Power button", "Ein/Aus-Knopf"))}</label>${select("power", cfg.power, [
              ["header", t("In the header", "In der Kopfzeile")],
              ["buttons", t("Among the buttons", "Bei den Buttons")],
              ["slider", t("Left of the slider", "Links vom Regler"), !hasSlider],
              ["off", t("Hidden", "Ausgeblendet")],
            ])}`
      }
      <p class="hint">${esc(t("Without name, value and power button the card has no header.", "Ohne Name, Wert und Ein/Aus-Knopf hat die Karte keine Kopfzeile."))}</p></div>`,
      )}
      ${group(
        t("Control", "Regler"),
        `${
          hasSlider
            ? `<div class="ctl"><label for="control">${esc(t("Slider", "Regler"))}</label>${select("control", cfg.slider === "none" ? "none" : cfg.slider === "slim" ? "slim" : `wide:${cfg.color}`, [
                ["wide:stripes", t("Wide, each light as a stripe", "Breit, jede Leuchte als Streifen")],
                ["wide:light", t("Wide, room light as a gradient", "Breit, Raumlicht als Verlauf")],
                ["wide:accent", t("Wide, dashboard color", "Breit, Farbe des Dashboards")],
                ["wide:custom", t("Wide, own color", "Breit, eigene Farbe")],
                ["slim", t("Slim", "Schmal")],
                ["none", t("Off", "Aus")],
              ])}`
            : `<div class="ctl"><label for="color">${esc(t("What the control shows", "Was der Regler zeigt"))}</label>${select("color", cfg.color, [
                ["stripes", t("Each light as a stripe", "Jede Leuchte als Streifen")],
                ["light", t("Room light as a gradient", "Raumlicht als Verlauf")],
                ["accent", t("Dashboard color", "Farbe des Dashboards")],
                ["custom", t("Own color", "Eigene Farbe")],
              ])}`
        }
        ${colorHint && (!hasSlider || cfg.slider === "wide") ? `<p class="hint">${esc(colorHint)}</p>` : ""}
        ${cfg.color === "custom" && (!hasSlider || cfg.slider === "wide") ? `<input type="color" id="custom_color" value="${esc(cfg.custom_color)}" aria-label="${esc(t("Own color", "Eigene Farbe"))}">` : ""}</div>
      ${design === "dial" ? check("dial_wedge", cfg.dial_wedge, t("Dial as a wedge: wider where the room gets brighter", "Drehregler als Keil: breiter, wo der Raum heller wird")) : ""}
      ${check("snap", cfg.snap, t("Snap to stops, with a short pulse on phones", "An Stufen einrasten, mit kurzem Impuls am Handy"))}`,
      )}
      ${group(
        t("Buttons", "Buttons"),
        `${check("buttons_on", cfg.buttons_on, t("Show buttons", "Buttons zeigen"))}
      ${
        cfg.buttons_on
          ? `<div class="ctl stack">
        <span class="lab">${esc(cfg.buttons ? t("Adjusted for this card", "Für diese Karte angepasst") : t("Template: standard buttons", "Vorlage: Standard-Buttons"))}</span>
        ${rows}
        <div><button id="add-button">${esc(t("Add your own button", "Eigenen Button hinzufügen"))}</button> ${cfg.buttons ? `<button id="reset-buttons">${esc(t("Reset", "Zurücksetzen"))}</button>` : ""}</div></div>
      <div class="ctl"><label for="button_style">${esc(t("Look", "Aussehen"))}</label>${select("button_style", cfg.button_style, [
        ["tint_icon", t("In their light, with an icon", "In ihrer Lichtfarbe, mit Symbol")],
        ["tint", t("In their light", "In ihrer Lichtfarbe")],
        ["icon_preview", t("Icon and light preview", "Symbol und Lichtvorschau")],
        ["preview", t("With a light preview", "Mit Lichtvorschau")],
        ["plain", t("Plain", "Schlicht")],
      ])}
      <p class="hint">${esc(t("In their light shows the color and brightness each button switches on. Without an icon of its own, a button gets one that fits its name.", "„In ihrer Lichtfarbe“ zeigt Farbe und Helligkeit, die ein Button einschaltet. Ohne eigenes Symbol bekommt ein Button eines, das zu seinem Namen passt."))}</p></div>
      <div class="ctl"><label for="button_position">${esc(t("Button position", "Position der Buttons"))}</label>
        ${select("button_position", cfg.button_position, [
          ["auto", t("Matching the design: beside the control on wide cards", "Passend zum Design: auf breiten Karten neben dem Regler")],
          ["top", t("Top", "Oben")],
          ["bottom", t("Bottom", "Unten")],
          ["left", t("Left", "Links")],
          ["right", t("Right", "Rechts")],
        ])}</div>
      ${check("show_value", cfg.show_value, t("Show the value on buttons", "Wert auf den Buttons zeigen"))}`
          : ""
      }`,
      )}
      ${group(
        t("Colors", "Farben"),
        `${
          kinds.white || kinds.color
            ? `<div class="ctl"><label for="color_choice">${esc(t("Color selection on the card", "Farbauswahl auf der Karte"))}</label>${select("color_choice", cfg.color_control ? bar : "off", [
                ["off", t("Off", "Aus")],
                ["both", t("White tones and colors", "Weißtöne und Farben"), !(kinds.white && kinds.color)],
                ["white", t("White tones only", "Nur Weißtöne"), !kinds.white],
                ["color", t("Colors only", "Nur Farben"), !kinds.color],
              ])}
        <p class="hint">${esc(canShow)} ${esc(
          ctl.crescendo && cfg.color_control
            ? t(
                "The selection colors every light of the object that can show it, also lights dimmed by hand. Lights with a color of their own keep it. A single light gets its color through its name under the columns or in the window of single lights.",
                "Die Auswahl färbt alle Leuchten des Objekts, die das können, auch von Hand gedimmte. Leuchten mit eigener Farbe behalten sie. Eine einzelne Leuchte färbst du über ihren Namen unter den Säulen oder im Fenster der einzelnen Leuchten.",
              )
            : "",
        )}</p></div>`
            : ""
        }
      ${check("glow", cfg.glow, t("Light glow around the card", "Lichtschein um die Karte"))}
      <p class="hint">${esc(t("A glow around the card in the current light color, stronger the brighter the room is.", "Ein Schein um die Karte in der aktuellen Lichtfarbe, umso stärker, je heller der Raum ist."))}</p>
      ${showsDots ? check("colors_always", cfg.colors_always, t("Always show the active light colors as dots, not only when something differs from the stops", "Aktive Lichtfarben immer als Punkte zeigen, nicht nur wenn etwas von den Stufen abweicht")) : ""}`,
      )}
      ${group(
        t("Single lights", "Einzelne Leuchten"),
        `${
          offersDetails
            ? `<div class="ctl"><label for="details">${esc(t("Open the single lights", "Einzelne Leuchten öffnen"))}</label>
        ${select("details", cfg.details, [
          ["button", t("With a button in the card's header", "Mit einem Knopf oben in der Karte")],
          ["card", t("By tapping the card", "Durch Tippen auf die Karte")],
          ["both", t("Both", "Beides")],
          ["off", t("Not at all", "Gar nicht")],
        ])}
        <p class="hint">${esc(t("Opens a window with a column for each light, to set single lights apart from the object.", "Öffnet ein Fenster mit einer Säule je Leuchte, um einzelne Leuchten abweichend vom Objekt einzustellen."))}</p></div>`
            : ""
        }
      ${
        design === "columns"
          ? `<div class="ctl"><label for="columns_mode">${esc(t("Lights in the columns", "Leuchten in den Säulen"))}</label>${select("columns_mode", cfg.columns_mode, [
              ["dim_settings", t("Dim with the column, settings through the name", "Dimmen über die Säule, Einstellungen über den Namen")],
              ["dim", t("Dim with the column", "Dimmen über die Säule")],
              ["settings", t("Settings by tapping the column or the name", "Einstellungen durch Tippen auf Säule oder Namen")],
              ["off", t("Display only", "Nur anzeigen")],
            ])}</div>`
          : ""
      }
      ${combines ? check("group", cfg.group, t("Combine identical lights", "Gleiche Leuchten zusammenfassen")) : ""}
      ${design === "gradient" ? check("show_lanes", cfg.show_lanes, t("Show a lane per light", "Spuren je Leuchte zeigen")) : ""}`,
      )}
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
      else if (t.dataset.f === "icon") b.icon = String(e.detail?.value ?? t.value ?? "").trim() || undefined;
      else b.duration = Math.max(0, +t.value || 0);
      list[+t.dataset.i] = b;
      this._set({ buttons: list });
      return;
    }
    switch (t.id) {
      case "control":
        this._set(t.value === "none" || t.value === "slim" ? { slider: t.value } : { slider: "wide", color: t.value.split(":")[1] });
        break;
      case "color_choice":
        this._set(t.value === "off" ? { color_control: false } : { color_control: true, color_bar: t.value });
        break;
      case "columns_mode":
        this._set({ columns_mode: t.value });
        break;
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
      case "details":
      case "power":
      case "button_style":
      case "color_bar":
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
      case "dial_wedge":
      case "button_names":
      case "colors_always":
      case "show_title":
      case "show_header_value":
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
    const t = tr(this._hass);
    const form = new FormData();
    form.append("file", file);
    this._photoNote = t("Uploading the photo…", "Das Foto wird hochgeladen …");
    this._render();
    try {
      const res = await this._hass.fetchWithAuth("/api/image/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      this._photoNote = "";
      this._set({ photo: `/api/image/serve/${data.id}/original` });
    } catch (err) {
      this._photoNote = t(`The photo could not be uploaded (${err.message}). Try a JPEG or PNG file.`, `Das Foto ließ sich nicht hochladen (${err.message}). Versuche es mit einer JPEG- oder PNG-Datei.`);
      this._render();
    }
  }

  _onClick(e) {
    const t = e.target;
    if (t.id === "pick-photo") this.shadowRoot.getElementById("upload").click();
    else if (t.id === "remove-photo") this._set({ photo: undefined });
    else if (t.dataset?.design) this._set({ design: t.dataset.design });
    else if (t.id === "open-setup" && this._entryId) {
      // Home Assistant's way to change pages from inside: a new address, then a location-changed event.
      history.pushState(null, "", `/crescendo?object=${encodeURIComponent(this._entryId)}`);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    }
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
