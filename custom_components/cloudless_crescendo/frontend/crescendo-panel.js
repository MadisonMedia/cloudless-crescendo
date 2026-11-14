// The Crescendo page in the sidebar: set up objects, their stops, devices and buttons, and check the connection.

const shared = await import(new URL(`./crescendo-shared.js${new URL(import.meta.url).search}`, import.meta.url).href);
const {
  DEVICE_ACTIONS,
  RAMP_DOMAINS,
  clamp,
  EASE_MAX_SECONDS,
  colorGap,
  comma,
  commonName,
  css,
  ease,
  esc,
  friendly,
  hueRgb,
  isDark,
  kRgb,
  lampAt,
  laneGradient,
  langOf,
  lerp,
  rgbToXy,
  xyToRgb,
  lightA,
  lightColor,
  lumOf,
  rampColor,
  rgbHue,
  rgbOf,
  roomGradient,
  roomLight,
  seriesVar,
  tr,
  loadIconPicker,
  units,
} = shared;

const STYLE = `
:host { display: block; min-height: 100%; background: var(--primary-background-color, #eef1f5); color: var(--ink); font: 400 15px/1.45 var(--paper-font-body1_-_font-family, var(--ha-font-family-body, system-ui, sans-serif));
  --ink: var(--primary-text-color, #171d2d); --muted: var(--secondary-text-color, #566077); --surface: var(--card-background-color, #fff); --field: var(--card-background-color, #fff); --line: var(--divider-color, #d4dae6); --accent: var(--primary-color, #2f5fd0); --accent-ink: var(--text-primary-color, #fff); --accent-soft: color-mix(in srgb, var(--accent) 16%, transparent); --well: color-mix(in srgb, var(--ink) 11%, var(--surface));
  --warn: #8a5300; --warn-soft: #fbeed6; --good: #1f6f47; --good-soft: #dcf1e5;
  --cr-s1:#2a78d6; --cr-s2:#eb6834; --cr-s3:#1baf7a; --cr-s4:#eda100; --cr-s5:#e87ba4; --cr-s6:#008300; --cr-s7:#6250d6; --cr-s8:#e34948; }
:host([dark]) { --warn: #f0bd6a; --warn-soft: #3a2b12; --good: #7fd6a6; --good-soft: #15352a; --cr-s1:#3987e5; --cr-s2:#d95926; --cr-s3:#199e70; --cr-s4:#c98500; --cr-s5:#d55181; --cr-s6:#008300; --cr-s7:#9085e9; --cr-s8:#e66767; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
h1, h2, h3, p { margin: 0; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.shell { container-type: inline-size; max-width: 1400px; margin: 0 auto; padding-block: 16px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 16px; }
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
.menu { border: 0; background: transparent; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; padding: 0; }
.mark { margin: 0; line-height: 0; }
.mark svg { display: block; height: 20px; width: auto; }
.tabs, .seg { display: inline-flex; gap: 2px; padding: 3px; background: var(--line); border-radius: 10px; }
.tabs button, .seg button { border: 0; background: transparent; padding: 6px 14px; border-radius: 8px; font-weight: 500; color: var(--muted); }
.tabs button[aria-selected="true"], .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); font-weight: 600; }
.note, .hint { font-size: 13.5px; color: var(--muted); max-width: 72ch; }
.opt { display: inline-flex; gap: 8px; align-items: center; font-size: 13.5px; color: var(--muted); }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.row.space { justify-content: space-between; }
.field { background: var(--field); border: 1px solid var(--line); border-radius: 8px; min-height: 36px; padding: 5px 9px; max-width: 100%; }
input.num { width: 76px; font-variant-numeric: tabular-nums; }
.btn { border: 1px solid var(--line); background: var(--field); border-radius: 8px; min-height: 36px; padding: 5px 12px; font-weight: 500; }
.btn:hover { border-color: var(--accent); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.x { border: 0; background: transparent; color: var(--muted); width: 26px; height: 26px; border-radius: 6px; font-size: 17px; line-height: 1; flex: none; padding: 0; }
.x:hover { background: var(--line); color: var(--ink); }
.notice { display: grid; gap: 6px; padding: 9px 12px; border-radius: 9px; background: var(--warn-soft); color: var(--warn); font-size: 13.5px; }
.notice b { font-weight: 650; }
.notice.calm { background: var(--accent-soft); color: var(--ink); }
.wrapx { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: separate; border-spacing: 0; width: 100%; }
.edit { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 20px; align-items: start; }
.jump { position: sticky; top: 12px; display: grid; gap: 2px; align-content: start; }
.jump a { text-decoration: none; color: var(--muted); font-size: 13.5px; padding: 6px 10px; border-left: 2px solid transparent; border-radius: 0 8px 8px 0; }
.jump a:hover { color: var(--ink); background: var(--line); }
.jump a.on { color: var(--ink); border-color: var(--accent); font-weight: 600; }
.sec { scroll-margin-top: 12px; }
.objrow { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.objpick { max-width: 240px; font-weight: 600; }
.newbox { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.lrow2 { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 7px 0; border-top: 1px solid var(--line); }
.lrow2:first-child { border-top: 0; }
.lrow2 .lname { padding: 0; }
.lrow2 select { min-height: 32px; padding: 3px 6px; font-size: 13px; }
.lrow2 > ha-icon { --mdc-icon-size: 16px; color: var(--muted); display: flex; }
.lrow2 .members { display: block; font-size: 12px; color: var(--muted); font-weight: 400; }
.lrow2 .dkind { font-size: 13px; color: var(--muted); }
.gsel { margin: 0 2px 0 0; width: 16px; height: 16px; flex: none; }
.gadv { padding-bottom: 0 !important; }
.gmembers { display: flex; flex-wrap: wrap; gap: 6px; }
.tempo { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13.5px; color: var(--muted); }
.tempo b { color: var(--ink); font-weight: 600; }
.tempo input.num { width: 64px; min-height: 32px; }
.hrow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.info { border: 1px solid var(--line); background: transparent; color: var(--muted); width: 20px; height: 20px; border-radius: 50%; padding: 0; font: italic 600 12px/1 Georgia, "Times New Roman", serif; flex: none; display: inline-grid; place-items: center; }
.info:hover, .info[aria-expanded="true"] { color: var(--accent); border-color: var(--accent); }
.info-text { max-width: none; font-size: 13px; }
.ctrls { display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.morebtn { border: 0; background: transparent; color: var(--muted); font-size: 12.5px; padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
.morebtn:hover, .morebtn[aria-expanded="true"] { color: var(--ink); background: var(--line); }
.warnbtn { border: 0; background: var(--warn-soft); color: var(--warn); width: 24px; height: 24px; border-radius: 6px; padding: 0; font-weight: 700; flex: none; }
.lpanel { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font-size: 13px; color: var(--muted); padding: 2px 0 4px; }
.lpanel label { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.lpanel select, .lpanel input:not([type="checkbox"]) { min-height: 30px; padding: 2px 6px; font-size: 13px; color: var(--ink); }
.lrow2 > .info-text, .lrow2 > .lwarn { grid-column: 2 / -1; }
.lpanel .lwarn { flex-basis: 100%; margin: 0; }
.wdot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--warn); margin-left: 5px; vertical-align: 1px; }
.inspector.wide { max-width: 560px; }
.inspector h3 ha-icon { --mdc-icon-size: 20px; color: var(--muted); }
.pt { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
.pt-head { display: flex; align-items: center; gap: 8px; color: var(--ink); }
.pt-head .x { margin-left: auto; }
.pt label { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pt select, .pt input { min-height: 30px; padding: 2px 6px; font-size: 13px; color: var(--ink); }
.ptlist { display: grid; gap: 2px; }
.ptrow { display: grid; grid-template-columns: 70px 18px 52px minmax(0, 1fr); align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; padding: 6px 8px; border-radius: 8px; font-variant-numeric: tabular-nums; color: var(--ink); font-size: 13.5px; }
.ptrow:hover { background: var(--line); }
.ptrow b { font-weight: 600; }
.ptrow small { color: var(--muted); }
.lanename { border: 0; background: transparent; padding: 0; display: inline-flex; gap: 6px; align-items: center; font: inherit; font-weight: 550; color: var(--ink); text-align: left; cursor: pointer; min-width: 0; }
.lanename:hover { color: var(--accent); }
.lanename ha-icon { --mdc-icon-size: 16px; color: var(--muted); flex: none; }
.devrow .lname { flex-wrap: wrap; row-gap: 0; }
.devrow .devval { flex-basis: 100%; }
.dkey { flex: none; stroke: var(--ink); stroke-width: 2; opacity: .65; }
.devramp.fall { background: linear-gradient(90deg, var(--accent), transparent); }
.devramp .dir { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: var(--ink); }
.c-dev { fill: none; stroke: var(--ink); stroke-width: 2; opacity: .6; }
.c-mark { fill: var(--ink); opacity: .75; }
.c-tick { stroke: var(--ink); stroke-width: 1; opacity: .35; }
.mxmarks { display: block; font-size: 11px; color: var(--muted); font-weight: 400; }
.gline { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.lwarn { font-size: 12.5px; color: var(--warn); max-width: none; }
.sugline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 5px 6px 5px 12px; border-radius: 9px; background: var(--accent-soft); font-size: 13px; }
.sugline b { font-weight: 600; }
.sugline small { color: var(--muted); }
.sugline .btn { min-height: 28px; padding: 2px 10px; font-size: 12.5px; }
.sugline .x { margin-left: auto; }
.addrow { justify-self: start; margin-top: 4px; }
.addline td { border-bottom: 0; }
.addline .chip { font-size: 12px; }
@container (max-width: 560px) { .lrow2 .ctrls { grid-column: 2; justify-content: flex-start; } }
.tplbox { display: grid; gap: 10px; padding: 12px; border-radius: 12px; background: var(--accent-soft); }
.tpls { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.tpl { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; display: grid; gap: 6px; align-content: start; background: var(--surface); }
.tpl b { font-weight: 650; }
.tpl small { font-size: 12.5px; color: var(--muted); }
.tpl svg { width: 100%; height: auto; display: block; }
.tpl .tline { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.powerrow td { background: color-mix(in srgb, var(--accent) 6%, transparent); }
.powerrow ha-icon { color: var(--muted); }
.powerrow .pname { font-weight: 600; }
.x.done { color: var(--accent); display: grid; place-items: center; }
.x.done:hover { background: var(--accent-soft); color: var(--accent); }
.devrow .lname ha-icon { --mdc-icon-size: 16px; color: var(--muted); flex: none; }
.picktop { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.lmore { grid-column: 1 / -1; }
.lmore summary { cursor: pointer; font-size: 12.5px; color: var(--muted); list-style: none; padding-left: 24px; }
.lmore summary::-webkit-details-marker { display: none; }
.lmore summary::before { content: "▸ "; }
.lmore[open] summary::before { content: "▾ "; }
.lmore .ladv { padding: 4px 0 4px 24px; }
.lanes { display: grid; gap: 2px; border-top: 1px solid var(--line); padding-top: 8px; }
.lights { position: relative; }
.inspector.pop { position: absolute; z-index: 4; width: min(300px, calc(100% - 16px)); box-shadow: 0 10px 30px rgba(0,0,0,.18); }
.inspector h3 { display: flex; align-items: center; gap: 8px; }
.inspector h3 .x { margin-left: auto; }
.livebar { grid-column: 1 / -1; position: sticky; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); z-index: 5; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; align-items: center; box-shadow: 0 6px 20px rgba(0,0,0,.12); }
.livebar .scrub { grid-template-columns: auto minmax(0, 1fr); gap: 10px; padding-right: 0; }
.livebar .scrub label { white-space: nowrap; }
.sideopt { margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--line); display: grid; gap: 8px; }
.sideopt .note { margin: 0; }
.btn.quiet { color: var(--muted); border-color: transparent; padding-left: 4px; text-align: left; }
.sheet { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 26px; min-width: 0; }
.sec { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }
.sec > h2 { font-size: 17px; font-weight: 650; }
.h2 { font-size: 17px; font-weight: 650; }
.title-input { font-size: 21px; font-weight: 650; width: min(100%, 360px); }
.lights { --gut: 170px; display: grid; gap: 8px; min-width: 0; }
.chart-box { position: relative; min-width: 0; touch-action: pan-y; }
.chart-box svg { display: block; width: 100%; }
.c-grid { stroke: var(--line); stroke-width: 1; opacity: .7; }
.c-axis { stroke: var(--line); stroke-width: 1; }
.c-stop { stroke: var(--line); stroke-width: 1; opacity: .7; }
.c-stop.sel { stroke: var(--accent); opacity: 1; }
.c-lab { fill: var(--muted); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.c-lab.sel { fill: var(--accent); font-weight: 600; }
.c-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.c-dot { stroke: var(--surface); stroke-width: 2; }
.c-dot.sel { stroke: var(--ink); }
.c-hit { fill: transparent; cursor: ns-resize; }
.c-stophit { fill: transparent; cursor: ew-resize; }
.c-ph { stroke: var(--ink); stroke-width: 1.5; opacity: .7; pointer-events: none; }
.c-cross { stroke: var(--muted); stroke-width: 1; pointer-events: none; }
.chart-tip { position: absolute; z-index: 3; pointer-events: none; padding: 7px 9px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); font-size: 12px; display: grid; gap: 2px; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.chart-tip div { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.chart-tip b { font-weight: 600; }
.chart-tip em { margin-left: auto; padding-left: 10px; font-style: normal; font-variant-numeric: tabular-nums; }
.scrub { display: grid; grid-template-columns: var(--gut) minmax(0, 1fr); align-items: center; padding-right: 14px; }
.scrub label { font-size: 13px; color: var(--muted); padding-right: 10px; }
input.grad { appearance: none; -webkit-appearance: none; width: 100%; height: 26px; background: transparent; margin: 0; }
input.grad::-webkit-slider-runnable-track { height: 16px; border-radius: 6px; background-color: var(--well); background-image: var(--grad, none); }
input.grad::-moz-range-track { height: 16px; border-radius: 6px; background-color: var(--well); background-image: var(--grad, none); }
input.grad::-webkit-slider-thumb { -webkit-appearance: none; width: 8px; height: 26px; margin-top: -5px; border-radius: 3px; background: #fff; border: 1px solid #101318; }
input.grad::-moz-range-thumb { width: 7px; height: 24px; border-radius: 3px; background: #fff; border: 1px solid #101318; }
.lrows { display: grid; gap: 2px; border-top: 1px solid var(--line); padding-top: 8px; }
.lrow { display: grid; grid-template-columns: var(--gut) minmax(0, 1fr); align-items: center; padding-right: 14px; min-height: 30px; }
.lname { display: flex; gap: 6px; align-items: center; padding-right: 8px; font-size: 13.5px; font-weight: 550; min-width: 0; }
.lname span { overflow-wrap: anywhere; min-width: 0; }
.key { display: inline-block; width: 14px; height: 3px; border-radius: 2px; flex: none; }
.llane { height: 18px; border-radius: 5px; background-color: var(--well); position: relative; }
.ladv { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 6px 0 10px; font-size: 13px; color: var(--muted); align-items: center; }
.ladv label { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ladv select, .ladv input:not([type="checkbox"]) { min-height: 30px; padding: 2px 6px; font-size: 13px; color: var(--ink); }
.devlane { touch-action: none; cursor: ew-resize; }
.devramp { position: absolute; top: 0; bottom: 0; border-radius: 5px; background: linear-gradient(90deg, transparent, var(--accent)); }
.devfill { position: absolute; top: 0; bottom: 0; right: 0; border-radius: 5px; background: var(--accent-soft); }
.devmark { position: absolute; top: -3px; bottom: -3px; width: 10px; margin-left: -5px; border-radius: 4px; background: var(--accent); }
.devval { display: block; font-size: 11px; color: var(--muted); font-weight: 400; }
.mx th, .mx td { padding: 4px; vertical-align: middle; }
.mx thead th { border-bottom: 1px solid var(--line); }
.mx th:first-child { position: sticky; left: 0; z-index: 1; background: var(--surface); min-width: 170px; max-width: 200px; text-align: left; padding: 6px 8px; border-right: 1px solid var(--line); font-weight: 600; }
.stophead { width: 100%; min-width: 62px; border: 0; background: transparent; border-radius: 7px; padding: 4px 2px; font-weight: 600; font-size: 13px; }
.stophead:hover { background: var(--line); }
.stophead.sel { background: var(--accent); color: var(--accent-ink); }
.roomcell { height: 14px; border-radius: 4px; background-color: var(--well); }
.cell { width: 100%; min-width: 62px; min-height: 48px; border: 0; border-radius: 8px; padding: 5px 3px; display: grid; align-content: center; gap: 1px; font-weight: 600; font-size: 12.5px; line-height: 1.2; }
.cell small { font-size: 10.5px; font-weight: 400; opacity: .85; }
.cell.off { background: transparent; border: 1px dashed var(--line); color: var(--muted); font-weight: 400; }
.cell.locked { border-style: dotted; cursor: not-allowed; opacity: .75; }
.cell.sel { outline: 2px solid var(--accent); outline-offset: 1px; }
.inspector { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 12px; }
.inspector h3 { font-size: 16px; font-weight: 650; }
.inspector h3 small { font-size: 12.5px; font-weight: 400; color: var(--muted); margin-left: 6px; }
.ctl { display: grid; gap: 4px; font-size: 13.5px; min-width: 0; }
.ctl-top { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); }
.ctl output { color: var(--ink); font-variant-numeric: tabular-nums; }
.pbar { position: relative; height: 30px; border-radius: 9px; cursor: pointer; touch-action: none; background-color: var(--well); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent); }
.pbar:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pbar.idle { opacity: .5; }
.pknob { position: absolute; top: -3px; bottom: -3px; width: 6px; margin-left: -3px; border-radius: 3px; background: #fff; box-shadow: 0 0 0 1px rgba(17,21,42,.4), 0 1px 5px rgba(0,0,0,.35); pointer-events: none; }
.pends { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.swatch { width: 18px; height: 18px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
.pick { display: grid; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 999px; padding: 4px 11px; font-size: 12.5px; }
.chip[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.picklist { display: grid; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.pickrow { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 8px 10px; border-top: 1px solid var(--line); }
.pickrow:first-child { border-top: 0; }
.pickrow ha-icon { color: var(--muted); --mdc-icon-size: 22px; }
.pickmain { display: grid; gap: 1px; min-width: 0; font-size: 13.5px; }
.pickmain b { font-weight: 600; overflow-wrap: anywhere; }
.pickmain small { font-size: 12px; color: var(--muted); }
.pickmain code { font-size: 11px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
.pickacts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.pickacts .btn { padding: 4px 10px; min-height: 30px; font-size: 12.5px; }
.pickmore { padding: 8px 10px; font-size: 12.5px; color: var(--muted); border-top: 1px solid var(--line); }
.pickmore:first-child { border-top: 0; }
.tag { display: inline-block; font-size: 10.5px; padding: 1px 6px; border-radius: 999px; background: var(--accent-soft); color: var(--ink); margin-left: 6px; vertical-align: middle; font-weight: 500; }
@media (max-width: 600px) { .pickrow { grid-template-columns: 26px minmax(0, 1fr); } .pickacts { grid-column: 1 / -1; justify-content: flex-start; } }
.tbl th { font-size: 12.5px; font-weight: 500; color: var(--muted); text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.tbl td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.tbl tr:last-child td { border-bottom: 0; }
.tbl input.txt { width: 130px; }
.num-cell { font-variant-numeric: tabular-nums; }
details > summary { cursor: pointer; font-size: 17px; font-weight: 650; }
details[open] > summary { margin-bottom: 12px; }
.stack { display: grid; gap: 14px; }
.sub { font-size: 14.5px; font-weight: 600; }
pre { margin: 0; padding: 12px 14px; font: 400 12.5px/1.55 ui-monospace, Menlo, monospace; background: #11152a; color: #dfe4f2; border-radius: 10px; overflow-x: auto; }
pre .c { color: #94a0bd; }
.diag { display: grid; gap: 18px; }
.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.fact { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; display: grid; gap: 4px; align-content: start; }
.fact h3 { font-size: 13px; font-weight: 500; color: var(--muted); }
.fact b { font-size: 21px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fact p { font-size: 13px; color: var(--muted); }
.pill { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 12.5px; white-space: nowrap; }
.pill.ok { background: var(--good-soft); color: var(--good); }
.pill.warn { background: var(--warn-soft); color: var(--warn); }
.dtable { background: var(--surface); }
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 20; max-width: calc(100vw - 32px); padding: 9px 14px; border-radius: 10px; background: var(--ink); color: var(--surface); font-size: 14px; }
@container (max-width: 640px) {
  .scrub label, .lrow .lname { grid-column: 1 / -1; padding-bottom: 2px; }
  .scrub input.grad, .lrow .llane { grid-column: 2; }
}
@container (max-width: 860px) {
  .edit { grid-template-columns: minmax(0, 1fr); }
  .jump { position: sticky; top: 0; z-index: 6; display: flex; flex-wrap: wrap; gap: 2px 4px; padding: 6px 0; background: var(--bg); }
  .jump a { border-left: 0; border-bottom: 2px solid transparent; border-radius: 8px 8px 0 0; padding: 4px 8px; }
  .sheet { padding: 14px; }
  .livebar { grid-template-columns: minmax(0, 1fr); }
  .inspector.pop { position: static; width: auto; box-shadow: none; }
  .facts { grid-template-columns: minmax(0, 1fr); }
}
`;

const ACTION_LABEL = {
  media_play: ["Start playback", "Wiedergabe starten"],
  media_pause: ["Pause playback", "Wiedergabe pausieren"],
  media_stop: ["Stop playback", "Wiedergabe stoppen"],
  play_media: ["Play a title or playlist", "Titel oder Playlist abspielen"],
  turn_on: ["Switch on", "Einschalten"],
  turn_off: ["Switch off", "Ausschalten"],
  open_cover: ["Open", "Öffnen"],
  close_cover: ["Close", "Schließen"],
  stop_cover: ["Stop", "Stoppen"],
};
const RAMP_LABEL = {
  media_player: ["Volume", "Lautstärke", "%"],
  climate: ["Temperature", "Temperatur", "°C"],
  cover: ["Position", "Position", "%"],
  fan: ["Speed", "Geschwindigkeit", "%"],
  light: ["Brightness", "Helligkeit", "%"],
};
const DOMAIN_ICON = {
  media_player: "mdi:speaker",
  climate: "mdi:thermostat",
  cover: "mdi:window-shutter",
  fan: "mdi:fan",
  light: "mdi:lightbulb-outline",
  switch: "mdi:toggle-switch-outline",
  input_boolean: "mdi:toggle-switch-outline",
  number: "mdi:ray-vertex",
  input_number: "mdi:ray-vertex",
  script: "mdi:script-text-outline",
  scene: "mdi:palette-outline",
};
const DOMAIN_LABEL = {
  media_player: ["Speaker", "Lautsprecher"],
  climate: ["Thermostat", "Thermostat"],
  cover: ["Blind", "Rollo"],
  fan: ["Fan", "Lüfter"],
  light: ["Light", "Leuchte"],
  switch: ["Switch", "Schalter"],
  input_boolean: ["Toggle helper", "Schalter (Helfer)"],
  number: ["Number", "Zahl"],
  input_number: ["Number helper", "Zahl (Helfer)"],
  script: ["Script", "Skript"],
  scene: ["Scene", "Szene"],
};
const STATE_DE = { on: "an", off: "aus", playing: "spielt", paused: "pausiert", idle: "bereit", standby: "Standby", open: "offen", closed: "geschlossen", opening: "öffnet", closing: "schließt", heat: "heizt", cool: "kühlt", auto: "automatisch", heat_cool: "heizt/kühlt", dry: "entfeuchtet", fan_only: "nur Lüfter", unavailable: "nicht erreichbar", unknown: "unbekannt" };
// The name as outlines, each letter a step heavier. Fonts on a system rarely offer that many weights.
const LOGO = '<svg viewBox="0 -720 4828 740" role="img" aria-label="Crescendo"><path fill="currentColor" d="M389 12Q290 12 214 -34Q137 -81 94 -162Q50 -244 50 -350Q50 -456 93 -538Q136 -619 212 -666Q288 -712 386 -712Q445 -712 502 -690Q558 -669 604 -630Q650 -592 675 -542L622 -509Q601 -552 564 -584Q526 -617 480 -636Q434 -654 386 -654Q307 -654 246 -615Q184 -576 149 -508Q114 -439 114 -350Q114 -260 149 -191Q184 -122 246 -83Q309 -44 389 -44Q438 -44 484 -64Q530 -85 568 -121Q605 -157 626 -203L679 -170Q653 -117 608 -76Q562 -34 505 -11Q448 12 389 12Z M780 0V-500H855V-411Q885 -458 933 -480Q980 -502 1032 -502V-432Q988 -432 947 -417Q907 -403 881 -369Q855 -334 855 -276V0Z M1321 12Q1248 12 1192 -22Q1136 -55 1104 -114Q1072 -173 1072 -250Q1072 -327 1104 -386Q1136 -445 1192 -478Q1248 -512 1321 -512Q1390 -512 1441 -478Q1493 -443 1522 -380Q1551 -317 1551 -232H1161Q1166 -154 1212 -111Q1258 -67 1326 -67Q1378 -67 1413 -91Q1448 -115 1467 -154L1543 -117Q1523 -79 1492 -49Q1460 -20 1417 -4Q1374 12 1321 12ZM1168 -304H1456Q1453 -345 1434 -375Q1416 -404 1386 -420Q1356 -435 1319 -435Q1283 -435 1250 -420Q1216 -404 1194 -375Q1172 -345 1168 -304Z M1814 12Q1762 12 1721 -4Q1679 -19 1650 -47Q1621 -74 1607 -109L1693 -146Q1709 -116 1740 -96Q1771 -76 1809 -76Q1852 -76 1878 -92Q1905 -107 1905 -135Q1905 -161 1885 -177Q1865 -192 1827 -201L1779 -214Q1710 -232 1670 -271Q1631 -309 1631 -358Q1631 -431 1679 -472Q1727 -512 1818 -512Q1863 -512 1901 -499Q1939 -485 1966 -461Q1992 -437 2004 -405L1920 -367Q1909 -396 1880 -410Q1851 -424 1814 -424Q1775 -424 1753 -408Q1731 -391 1731 -361Q1731 -344 1750 -330Q1769 -315 1805 -306L1860 -292Q1909 -280 1941 -256Q1973 -231 1989 -200Q2004 -169 2004 -136Q2004 -91 1980 -58Q1955 -24 1912 -6Q1869 12 1814 12Z M2322 12Q2245 12 2186 -22Q2127 -55 2094 -114Q2060 -173 2060 -250Q2060 -327 2093 -386Q2127 -445 2185 -478Q2244 -512 2320 -512Q2394 -512 2454 -476Q2514 -441 2543 -375L2439 -335Q2423 -368 2390 -388Q2357 -408 2315 -408Q2274 -408 2242 -388Q2210 -367 2192 -332Q2174 -296 2174 -250Q2174 -204 2192 -168Q2211 -133 2243 -113Q2276 -92 2317 -92Q2359 -92 2392 -114Q2425 -135 2441 -172L2545 -132Q2516 -64 2457 -26Q2397 12 2322 12Z M2844 12Q2770 12 2713 -22Q2656 -55 2623 -114Q2591 -173 2591 -250Q2591 -327 2624 -386Q2658 -445 2716 -478Q2774 -512 2850 -512Q2916 -512 2971 -478Q3026 -443 3059 -377Q3092 -311 3092 -217H2723Q2728 -164 2767 -133Q2806 -102 2857 -102Q2899 -102 2926 -120Q2953 -138 2967 -167L3081 -122Q3060 -81 3027 -50Q2993 -20 2948 -4Q2902 12 2844 12ZM2730 -312H2955Q2952 -344 2934 -364Q2917 -384 2893 -394Q2870 -404 2846 -404Q2823 -404 2798 -395Q2772 -385 2753 -365Q2734 -345 2730 -312Z M3157 0V-500H3293L3299 -434Q3323 -472 3360 -492Q3397 -512 3443 -512Q3503 -512 3544 -488Q3586 -464 3607 -413Q3628 -363 3628 -284V0H3484V-256Q3484 -301 3473 -327Q3463 -353 3444 -365Q3425 -376 3400 -377Q3352 -378 3326 -349Q3301 -320 3301 -263V0Z M3914 12Q3843 12 3793 -19Q3742 -51 3715 -110Q3688 -169 3688 -250Q3688 -332 3715 -391Q3742 -449 3793 -481Q3843 -512 3914 -512Q3960 -512 3995 -494Q4030 -477 4053 -443V-700H4215V0H4061L4057 -61Q4034 -26 3998 -7Q3961 12 3914 12ZM3956 -137Q3983 -137 4004 -150Q4025 -162 4038 -185Q4051 -208 4053 -236V-264Q4051 -292 4038 -315Q4025 -337 4004 -349Q3982 -362 3955 -362Q3927 -362 3905 -348Q3882 -334 3869 -308Q3857 -283 3857 -250Q3857 -217 3870 -192Q3883 -166 3906 -152Q3928 -137 3956 -137Z M4548 12Q4468 12 4407 -22Q4345 -55 4310 -114Q4275 -173 4275 -250Q4275 -327 4309 -386Q4344 -445 4405 -478Q4467 -512 4546 -512Q4626 -512 4687 -478Q4749 -445 4784 -386Q4818 -327 4818 -250Q4818 -173 4784 -114Q4749 -55 4688 -22Q4627 12 4548 12ZM4548 -154Q4573 -154 4592 -166Q4611 -179 4622 -200Q4633 -222 4633 -250Q4633 -278 4622 -300Q4611 -321 4591 -334Q4572 -346 4546 -346Q4521 -346 4502 -334Q4482 -321 4471 -300Q4460 -278 4460 -250Q4460 -222 4471 -200Q4482 -179 4502 -166Q4522 -154 4548 -154Z"/></svg>';
const CHECK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
// Below a threshold a device does the opposite by default: what switched on switches off again.
const OPPOSITE = { turn_on: "turn_off", turn_off: "turn_on", open_cover: "close_cover", close_cover: "open_cover", media_play: "media_pause", play_media: "media_pause", media_pause: "media_play", media_stop: "media_play" };
// Taken from a real bathroom: floor, shower niche, mirror, ceiling strip and washstand come on one after another,
// warm at first and neutral at the top. Each role holds brightness and white tone, or a color, per stop.
const BATH_STOPS = [10, 25, 40, 60, 80, 100];
const BATH_ROLES = [
  { 10: [20, 3000], 25: [100, 2700], 40: [100, 2700], 60: [100, 2700], 80: [100, 3000], 100: [100, 4000] },
  { 25: [40, 3000], 40: [100, 3000], 60: [100, 3000], 80: [100, 3000], 100: [100, 4000] },
  { 40: [30, 2700], 60: [70, 3000], 80: [80, 3000], 100: [100, 4000] },
  { 60: [26, [255, 140, 60]], 80: [50, 3500], 100: [80, 4000] },
  { 80: [45, 3000], 100: [100, 4000] },
];
const BATH_BUTTONS = [
  [10, ["Night", "Nacht"], "mdi:moon-waning-crescent"],
  [40, ["Morning", "Morgen"], "mdi:weather-sunset"],
  [80, ["Day", "Tag"], "mdi:weather-sunny"],
  [100, ["Bright", "Hell"], "mdi:light-flood-down"],
];
const EVEN_ROLE = { 50: [50, 2700], 100: [100, 4000] };
const roleValue = (r, p) => (r[p] ? { brightness: r[p][0], ...(Array.isArray(r[p][1]) ? { color: [...r[p][1]] } : { kelvin: r[p][1] }) } : { brightness: 0 });
// Spreads n lights over the roles: a few take roles from first to last, many share them in order.
const roleIndex = (k, n, roles) => (n <= 1 ? 0 : n <= roles ? Math.round((k * (roles - 1)) / (n - 1)) : Math.floor((k * roles) / n));
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "objekt";
const MENU_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>';
// Devices on the chart are told apart by their dash, as the lights are by their color.
const DASHES = ["6 4", "2 3", "10 3 2 3", "1 4"];
const PCT_DOMAINS = ["media_player", "cover", "fan"];
const PT = 10,
  PB = 30,
  PR = 14,
  CHART_H = 300;
let sidCounter = 1;
const clone = (x) => JSON.parse(JSON.stringify(x));
const newId = () => Math.random().toString(16).slice(2, 10);

function withIds(options) {
  const o = clone(options);
  for (const stop of o.stops) stop._sid = `s${sidCounter++}`;
  o.groups = o.groups || [];
  return o;
}
function stripIds(options) {
  const o = clone(options);
  for (const stop of o.stops) delete stop._sid;
  return o;
}
function interpVal(a, b, t) {
  if (a.brightness === 0 && b.brightness === 0) return clone(a);
  const brightness = Math.round(lerp(a.brightness, b.brightness, t));
  if (a.brightness === 0) return { ...clone(b), brightness };
  if (b.brightness === 0) return { ...clone(a), brightness };
  // Like the lights between two stops: color temperature in mireds, colors in xy.
  if (a.kelvin && b.kelvin) return { brightness, kelvin: Math.round(1e6 / lerp(1e6 / a.kelvin, 1e6 / b.kelvin, t) / 50) * 50 };
  if (!a.kelvin && !a.color) return { ...clone(b), brightness };
  if (!b.kelvin && !b.color) return { ...clone(a), brightness };
  const ax = rgbToXy(rgbOf({ mode: "rgbcct" }, a)),
    bx = rgbToXy(rgbOf({ mode: "rgbcct" }, b));
  return { brightness, color: xyToRgb([lerp(ax[0], bx[0], t), lerp(ax[1], bx[1], t)]).map(Math.round) };
}

class CrescendoPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._objects = [];
    this._i = 0;
    this._view = "edit";
    this._sel = { stop: null, lamp: null };
    this._preview = true;
    this._edView = "chart";
    this._noGroup = new Set();
    this._infos = new Set();
    this._addOpen = false;
    this._openMore = new Set();
    this._newing = false;
    this._undo = [];
    this._lastKey = null;
    this._chartW = 0;
    this._chartGut = 170;
    this._chartDrag = null;
    this._devDrag = null;
    this._test = {};
    this._diag = null;
    this._confirmDelete = false;
    const r = this.shadowRoot;
    r.addEventListener("click", (e) => this._onClick(e));
    r.addEventListener("input", (e) => this._onInput(e));
    r.addEventListener("change", (e) => this._onChange(e));
    r.addEventListener("pointerdown", (e) => this._onDown(e));
    r.addEventListener("pointermove", (e) => this._onMove(e));
    r.addEventListener("pointerup", (e) => this._onUp(e));
    r.addEventListener("pointercancel", () => {
      this._chartDrag = null;
      this._devDrag = null;
      if (this._insDrag) {
        this._insDrag = null;
        this._renderInspector();
      }
    });
    r.addEventListener("keydown", (e) => this._onKey(e));
    r.addEventListener("pointerleave", () => this._hideTip(), true);
    // A light's "More" stays open across re-renders.
    r.addEventListener(
      "toggle",
      (e) => {
        const key = e.target?.dataset?.more;
        if (key) e.target.open ? this._openMore.add(key) : this._openMore.delete(key);
      },
      true,
    );
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const dark = isDark(this.isConnected ? this : null, hass);
    const themeChanged = dark !== this._dark;
    this._dark = dark;
    this.toggleAttribute("dark", dark);
    // A link from a card or a device can name the object to open.
    if (first) this._load(new URLSearchParams(location.search).get("object") || undefined);
    else if (themeChanged && this._view === "edit" && this._o) this._renderStops();
    else this._tickLive();
  }

  set narrow(v) {
    this._narrow = v;
    const m = this.shadowRoot.querySelector(".menu");
    if (m) m.hidden = !v;
  }

  set panel(_v) {}
  set route(_v) {}

  connectedCallback() {
    // Home Assistant can set these before this script has loaded. They would then hide the setters above.
    for (const name of ["hass", "narrow", "panel", "route"]) {
      if (Object.hasOwn(this, name)) {
        const value = this[name];
        delete this[name];
        this[name] = value;
      }
    }
    this._timer = setInterval(() => this._periodic(), 500);
    this._resize = new ResizeObserver(() => {
      if (this._view === "edit" && this._edView === "chart") this._renderChart();
    });
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._resize?.disconnect();
  }

  get _t() {
    return tr(this._hass);
  }

  get _o() {
    return this._objects[this._i];
  }

  async _load(selectEntry) {
    this._objects = (await this._hass.callWS({ type: "cloudless_crescendo/objects" })).map((x) => ({
      ...x,
      options: withIds(x.options),
    }));
    this._sidebarShown = (await this._hass.callWS({ type: "cloudless_crescendo/sidebar" }).catch(() => null))?.shown ?? true;
    if (selectEntry) this._i = Math.max(0, this._objects.findIndex((x) => x.entry_id === selectEntry));
    this._i = Math.min(this._i, Math.max(0, this._objects.length - 1));
    this._sel = { stop: null, lamp: null };
    this._undo = [];
    this._render();
  }

  // -- rendering --------------------------------------------------------------------------------

  _render() {
    const t = this._t;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="shell">
      <header class="top">
        <button class="menu" data-act="menu" aria-label="Menu" ${this._narrow ? "" : "hidden"}>${MENU_ICON}</button>
        <h1 class="mark">${LOGO}</h1>
        <select class="field objpick" id="objPick" aria-label="${esc(t("Object", "Objekt"))}"></select>
        <span class="newbox" id="newBox" hidden><input class="field" id="newObjName" placeholder="${esc(t("Name of the new object", "Name des neuen Objekts"))}" aria-label="${esc(t("Name of the new object", "Name des neuen Objekts"))}"><button class="btn primary" data-act="new-obj">${esc(t("Create", "Anlegen"))}</button><button class="btn" data-act="new-cancel">${esc(t("Cancel", "Abbrechen"))}</button></span>
        <div class="tabs" role="tablist">
          <button role="tab" data-act="tab" data-v="edit" aria-selected="${this._view === "edit"}">${esc(t("Setup", "Einrichtung"))}</button>
          <button role="tab" data-act="tab" data-v="diag" aria-selected="${this._view === "diag"}">${esc(t("Diagnostics", "Diagnose"))}</button>
        </div>
      </header>
      <main id="main"></main>
    </div><div class="toast" id="toast" hidden></div>`;
    this._renderObjects();
    if (this._view === "edit") this._renderEdit();
    else this._renderDiagView();
  }

  _renderEdit() {
    const t = this._t,
      main = this.shadowRoot.getElementById("main");
    const o = this._o;
    const sections = [
      ["sec-lights", t("Lights and devices", "Leuchten und Geräte")],
      ["sec-stops", t("Stops", "Stufen")],
      ["sec-buttons", t("Buttons", "Buttons")],
      ["sec-behavior", t("Behavior", "Verhalten")],
    ];
    main.innerHTML = `<section class="edit">
      <nav class="jump" id="jump" aria-label="${esc(t("Sections", "Abschnitte"))}">${sections.map(([id, label]) => `<a href="#${id}" data-act="jump" data-to="${id}">${esc(label)}</a>`).join("")}</nav>
      ${
        o
          ? `<div class="sheet">
        <div class="objrow"><input class="field title-input" id="objName" aria-label="${esc(t("Name of the object", "Name des Objekts"))}">
          <div class="row"><button class="btn" id="undoBtn" data-act="undo" disabled>${esc(t("Undo", "Rückgängig"))}</button><button class="btn" data-act="export">${esc(t("Export", "Exportieren"))}</button><button class="btn" data-act="import">${esc(t("Import", "Importieren"))}</button><input type="file" id="importFile" accept=".json,application/json" hidden><span id="deleteBox"></span></div></div>
        <div id="importBox" hidden></div>
        <div class="sec" id="sec-lights"><div class="hrow"><h2>${esc(t("Lights and devices", "Leuchten und Geräte"))}</h2>${this._ib("lights")}</div>
          ${this._it("lights", t("Lights shape the curve; for each you choose what it shows, and under More how it fades, how it follows a slider and which group it belongs to. A speaker, a thermostat, a blind or another device follows the scale with a course between two stops or with an action at a threshold; you set both under Stops.", "Leuchten formen die Kurve; je Leuchte wählst du, was sie zeigt, und unter „Mehr“, wie sie überblendet, wie sie einem Slider folgt und zu welcher Gruppe sie gehört. Lautsprecher, Thermostat, Rollo oder andere Geräte folgen der Skala mit einem Verlauf zwischen zwei Stufen oder mit einer Aktion an einer Schwelle; beides stellst du unter „Stufen“ ein."))}
          <div class="lrows" id="rows"></div>
          <div class="stack" id="groupBar" hidden></div>
          <div class="pick" id="devPick" hidden><div class="row space"><div class="sub">${esc(t("Add", "Hinzufügen"))}</div><button class="btn" data-act="add-close">${esc(t("Done", "Fertig"))}</button></div>
            <div class="picktop"><input class="field" type="search" id="devSearch" autocomplete="off" placeholder="${esc(t("Search by name, room or kind", "Nach Name, Raum oder Art suchen"))}" aria-label="${esc(t("Search a light or device", "Leuchte oder Gerät suchen"))}"><select class="field" id="roomSel" aria-label="${esc(t("Room", "Raum"))}"></select></div>
            <div class="chips" id="devKinds" role="group" aria-label="${esc(t("Kind", "Art"))}"></div>
            <div class="picklist" id="devList"></div>
          </div>
        </div>
        <div class="sec" id="sec-stops">
          <div class="row space"><div class="hrow"><h2>${esc(t("Stops", "Stufen"))}</h2>${this._ib("stops")}</div>
            <div class="row"><span class="tempo"><label for="fadeDef"><b>${esc(t("Speed", "Tempo"))}</b> ${esc(t("0 to 100 % in", "0 auf 100 % in"))}</label><input class="field num" type="number" id="fadeDef" min="0" max="3600" step="0.5"><span>s</span>${this._ib("tempo")}</span>
            <div class="seg" role="group"><button data-act="view-chart" id="vChart">${esc(t("Chart", "Diagramm"))}</button><button data-act="view-table" id="vTable">${esc(t("Table", "Tabelle"))}</button></div></div></div>
          ${this._it("tempo", t("Speed: buttons, on/off and taps on a card's slider take their share of this time, from 80 to 100 % a fifth. A card can set its own speed. Automations and other integrations that give a duration keep it exactly.", "Tempo: Buttons, Ein/Aus und Tippen auf den Regler einer Karte brauchen ihren Anteil dieser Zeit, von 80 auf 100 % ein Fünftel. Eine Karte kann ein eigenes Tempo haben. Automationen und andere Integrationen mit eigener Dauer behalten sie genau."))}
          <p class="note info-text" id="stopNote" data-info="stops"${this._infos.has("stops") ? "" : " hidden"}></p>
          <div class="row" id="stopTools"></div>
          <div class="tplbox" id="tplBox" hidden></div>
          <div class="lights" id="lights">
            <div class="chart-box" id="chartBox"></div>
            <div class="wrapx" id="tableWrap" hidden><table class="mx" id="matrix"></table></div>
            <div class="lanes" id="lanes"></div>
            <div class="lanes" id="devRows" hidden></div>
            <div class="inspector" id="inspector" hidden></div>
          </div>
        </div>
        <div class="sec" id="sec-buttons"><div class="hrow"><h2>${esc(t("Standard buttons", "Standard-Buttons"))}</h2>${this._ib("buttons")}</div>
          ${this._it("buttons", t("New cards take these buttons as a template; in each card you can leave out some or add your own, and automations can press them too. On/off switches on to the last position or to a fixed stop; this also applies to tiles and voice commands without a percentage, and an automation can set the position with the action “Set switch-on position”, for example by time of day.", "Neue Karten übernehmen diese Buttons als Vorlage; in jeder Karte kannst du einzelne weglassen oder eigene ergänzen, und Automationen können sie ebenfalls auslösen. Ein/Aus schaltet auf die letzte Position oder auf eine feste Stufe ein; das gilt auch für Kacheln und Sprachbefehle ohne Prozentangabe, und eine Automation kann die Position mit der Aktion „Einschaltposition festlegen“ vorgeben, zum Beispiel nach Tageszeit."))}
          <div class="wrapx"><table class="tbl" id="btnTable"></table></div></div>
        <div class="sec" id="sec-behavior"><h2>${esc(t("Behavior", "Verhalten"))}</h2>
          <div class="stack">
          <div class="ctl"><div class="hrow"><div class="sub">${esc(t("Slider", "Slider"))}</div>${this._ib("rate")}</div><div class="row"><label for="rate">${esc(t("Updates per second", "Aktualisierungen pro Sekunde"))}</label><input class="field num" type="number" id="rate" min="1" max="10" step="1"></div>
            ${this._it("rate", t("The default is 4. More updates feel more direct, but too many can cause stutter.", "Standard ist 4. Mehr Aktualisierungen wirken direkter, zu viele können aber Ruckler verursachen."))}</div>
          <div class="ctl"><div class="hrow"><div class="sub">${esc(t("In automations", "In Automationen"))}</div>${this._ib("auto")}</div>${this._it("auto", t("The object is a normal light. Its brightness is the position on the scale. The lights always run in the set sequence, backward when dimming down.", "Das Objekt ist ein normales Licht. Seine Helligkeit ist die Position auf der Skala. Die Leuchten laufen immer in der eingestellten Reihenfolge, rückwärts beim Runterdimmen."))}<pre id="yaml"></pre></div>
        <div class="ctl"><div class="sub">${esc(t("Entry in the sidebar", "Eintrag in der Seitenleiste"))}</div><div id="sideOpt"></div></div>
        </div></div>
      </div>
      <div class="livebar">
        <div class="scrub"><label for="editPos">${esc(t("Position", "Position"))} <output id="editPosOut">0 %</output></label><input type="range" class="grad" id="editPos" min="0" max="100" step="1" value="0"></div>
        <div class="row"><label class="opt"><input type="checkbox" id="preview"${this._preview ? " checked" : ""}> ${esc(t("Preview on the lights", "Vorschau an den Leuchten"))}</label>
          <label class="opt" for="runDur">${esc(t("Test run over", "Probelauf über"))}</label>
          <select class="field" id="runDur"><option value="5">5 s</option><option value="10">10 s</option><option value="30" selected>30 s</option><option value="60">60 s</option></select>
          <button class="btn" data-act="run-up">${esc(t("Dim up", "Hochdimmen"))}</button><button class="btn" data-act="run-down">${esc(t("Dim down", "Runterdimmen"))}</button></div>
      </div>`
          : `<div class="sheet"><div class="sec"><h2>${esc(t("No object yet", "Noch kein Objekt"))}</h2><p class="note">${esc(t("Choose “New object” at the top and give it a name.", "Wähle oben „Neues Objekt“ und gib ihm einen Namen."))}</p></div></div>`
      }
    </section>`;
    this._renderSidebarOption();
    if (!o) return;
    this._watchSections();
    this.shadowRoot.getElementById("objName").value = o.title;
    this._resize?.disconnect();
    this._resize?.observe(this.shadowRoot.getElementById("chartBox"));
    this._renderDelete();
    this._renderImport();
    this._renderTools();
    this._renderStops();
    this._renderInspector();
    this._renderButtons();
    this._renderSettings();
    this._tickLive();
    this.shadowRoot.getElementById("undoBtn").disabled = !this._undo.length;
  }

  _renderDelete() {
    const t = this._t,
      box = this.shadowRoot.getElementById("deleteBox");
    if (!box) return;
    box.innerHTML = this._confirmDelete
      ? `<span class="row"><span class="opt">${esc(t("Really delete?", "Wirklich löschen?"))}</span><button class="btn" data-act="delete-yes">${esc(t("Delete", "Löschen"))}</button><button class="btn" data-act="delete-no">${esc(t("Keep", "Behalten"))}</button></span>`
      : `<button class="btn" data-act="delete-ask">${esc(t("Delete object", "Objekt löschen"))}</button>`;
  }

  // The sidebar entry can go; the page stays reachable through an object's Configure button and the card editor.
  _renderSidebarOption() {
    const el = this.shadowRoot.getElementById("sideOpt");
    if (!el) return;
    const t = this._t;
    if (!this._sidebarShown) {
      el.innerHTML = `<p class="note">${esc(t("This settings page is not in the sidebar. You reach it through Configure on an object under Settings → Devices & services, and through the card editor.", "Diese Einstellungsseite steht nicht in der Seitenleiste. Du erreichst sie über „Konfigurieren“ beim Objekt unter Einstellungen → Geräte & Dienste und über den Karten-Editor."))}</p>
        <button class="btn" data-act="sidebar-add">${esc(t("Put this settings page back in the sidebar", "Diese Einstellungsseite wieder in die Seitenleiste aufnehmen"))}</button>`;
    } else if (this._sidebarAsk) {
      el.innerHTML = `<p class="note">${esc(t("Remove the entry “Crescendo” from the sidebar? This settings page stays reachable through Configure on an object under Settings → Devices & services, and through the card editor. You can put it back here at any time.", "Den Eintrag „Crescendo“ aus der Seitenleiste entfernen? Diese Einstellungsseite bleibt erreichbar über „Konfigurieren“ beim Objekt unter Einstellungen → Geräte & Dienste und über den Karten-Editor. Du kannst sie hier jederzeit wieder aufnehmen."))}</p>
        <div class="row"><button class="btn" data-act="sidebar-yes">${esc(t("Remove", "Entfernen"))}</button><button class="btn" data-act="sidebar-no">${esc(t("Keep", "Behalten"))}</button></div>`;
    } else {
      el.innerHTML = `<p class="note">${esc(t("Crescendo has its own entry in the sidebar of Home Assistant. If you do not need it, you can remove it; this page stays reachable through Configure on an object and through the card editor.", "Crescendo hat einen eigenen Eintrag in der Seitenleiste von Home Assistant. Wenn du ihn nicht brauchst, kannst du ihn entfernen; diese Seite bleibt über „Konfigurieren“ beim Objekt und über den Karten-Editor erreichbar."))}</p>
        <button class="btn quiet" data-act="sidebar-ask">${esc(t("Remove this settings page from the sidebar", "Diese Einstellungsseite aus der Seitenleiste entfernen"))}</button>`;
    }
  }

  _renderObjects() {
    const pick = this.shadowRoot.getElementById("objPick");
    if (!pick) return;
    const t = this._t;
    pick.innerHTML =
      this._objects.map((o, i) => `<option value="${i}"${i === this._i && !this._newing ? " selected" : ""}>${esc(o.title)}</option>`).join("") +
      `<option value="new"${this._newing ? " selected" : ""}>＋ ${esc(t("New object", "Neues Objekt"))}</option>`;
    const box = this.shadowRoot.getElementById("newBox");
    if (box) box.hidden = !this._newing;
  }

  _pickObject(i) {
    clearTimeout(this._saveTimer);
    this._i = i;
    this._sel = { stop: null, lamp: null };
    this._undo = [];
    this._confirmDelete = false;
    this._import = null;
    this._addOpen = false;
    this._tplOpen = false;
    this._renderEdit();
  }

  // The jump bar marks the section in view.
  _watchSections() {
    this._sections?.disconnect();
    const links = [...this.shadowRoot.querySelectorAll("#jump a")];
    if (!links.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map();
    this._sections = new IntersectionObserver(
      (entries) => {
        for (const en of entries) seen.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0);
        const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] > 0) links.forEach((a) => a.classList.toggle("on", a.dataset.to === best[0]));
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    this.shadowRoot.querySelectorAll(".sec[id]").forEach((el) => this._sections.observe(el));
  }

  _stop() {
    return this._o.options.stops.find((s) => s._sid === this._sel.stop) || null;
  }

  _units() {
    return units(this._o.options, this._hass, true);
  }

  _selUnit() {
    return this._units().find((u) => u.ids.includes(this._sel.lamp)) || null;
  }

  _renderTools() {
    const t = this._t,
      st = this._stop();
    const movable = st && st.position !== 0 && st.position !== 100;
    this.shadowRoot.getElementById("stopTools").innerHTML = `<button class="btn primary" data-act="add-stop">${esc(t("Add stop", "Stufe hinzufügen"))}</button>
      ${
        st
          ? `<span class="opt"><label for="stopPos">${esc(t("Stop", "Stufe"))}</label><input class="field num" type="number" id="stopPos" min="1" max="99" value="${st.position}" ${movable ? "" : "disabled"}></span>
        <button class="btn" data-act="dup-stop" ${st.position === 100 ? "disabled" : ""}>${esc(t("Copy stop", "Stufe kopieren"))}</button>
        <button class="btn" data-act="take-state" ${st.position === 0 ? "disabled" : ""}>${esc(t("Take current state", "Ist-Zustand übernehmen"))}</button>
        <button class="btn" data-act="del-stop" ${movable ? "" : "disabled"}>${esc(t("Delete stop", "Stufe löschen"))}</button>`
          : ""
      }
      <button class="btn" data-act="tpl-toggle" aria-expanded="${!!this._tplOpen}">${esc(t("Templates …", "Vorlagen …"))}</button>`;
  }

  // -- explanations ----------------------------------------------------------------------------

  // Explanations stay folded behind a small "i" until asked for; the choice holds across re-renders.
  _ib(id) {
    const label = esc(this._t("Explanation", "Erklärung"));
    return `<button class="info" data-act="info" data-info-for="${esc(id)}" aria-expanded="${this._infos.has(id)}" aria-label="${label}" title="${label}">i</button>`;
  }

  _it(id, text) {
    return `<p class="note info-text" data-info="${esc(id)}"${this._infos.has(id) ? "" : " hidden"}>${esc(text)}</p>`;
  }

  // -- templates --------------------------------------------------------------------------------

  _templates() {
    const t = this._t;
    const list = [
      { key: "bath", name: t("One after another", "Nacheinander"), text: t("One light after another, warm at first and neutral at the top. Brings the buttons Night, Morning, Day and Bright if there are none yet.", "Eine Leuchte nach der anderen, erst warm, oben neutral. Bringt die Buttons Nacht, Morgen, Tag und Hell mit, falls noch keine da sind.") },
      { key: "even", name: t("Together", "Gemeinsam"), text: t("All lights together, from warm to neutral.", "Alle Leuchten zusammen, von warm zu neutral.") },
    ];
    for (const x of this._objects) {
      if (x.entry_id === this._o.entry_id || !x.options.lights.length) continue;
      list.push({ key: `obj:${x.entry_id}`, name: t(`Like “${x.title}”`, `Wie „${x.title}“`), text: t("Its stops. Lights it shares with this object get exactly its values; the others take the light in the same place.", "Seine Stufen. Leuchten, die es mit diesem Objekt teilt, bekommen genau seine Werte; die anderen übernehmen die Leuchte an gleicher Stelle.") });
    }
    return list;
  }

  // The stops a template gives this object's lights, and the buttons it brings.
  _template(key) {
    const o = this._o.options;
    let positions,
      roles,
      source = null,
      at = null,
      buttons = null;
    if (key === "bath") {
      positions = BATH_STOPS;
      roles = BATH_ROLES.map((r) => (p) => roleValue(r, p));
      buttons = this._buttonTemplate("day");
    } else if (key === "even") {
      positions = [50, 100];
      roles = [(p) => roleValue(EVEN_ROLE, p)];
    } else {
      source = this._objects.find((x) => x.entry_id === key.slice(4))?.options;
      if (!source) return null;
      positions = source.stops.map((s) => s.position).filter((p) => p > 0);
      at = (id, p) => source.stops.find((s) => s.position === p)?.values[id] || { brightness: 0 };
      roles = units(source, this._hass, true).map((u) => (p) => at(u.light.entity_id, p));
    }
    const us = this._units();
    const stops = [0, ...positions].map((position) => ({ position, values: {} }));
    us.forEach((u, k) => {
      const shared = source && u.ids.find((id) => source.lights.some((l) => l.entity_id === id));
      const role = shared ? (p) => at(shared, p) : roles[roleIndex(k, us.length, roles.length)];
      for (const id of u.ids) {
        const light = o.lights.find((l) => l.entity_id === id);
        for (const s of stops) s.values[id] = s.position === 0 ? { brightness: 0 } : this._fitValue(light, role(s.position));
      }
    });
    return { stops, buttons };
  }

  // A value as far as the light can show it: a color becomes the warmest white, a white tone a color.
  _fitValue(light, v) {
    const b = Math.round(v?.brightness || 0);
    if (!b) return { brightness: 0 };
    if (light.mode === "onoff") return { brightness: 100 };
    if (light.mode === "dim") return { brightness: b };
    const [kmin, kmax] = this._kelvinRange(light);
    if (v.color) return light.mode === "cct" ? { brightness: b, kelvin: kmin } : { brightness: b, color: v.color.map(Math.round) };
    const k = v.kelvin ?? 3000;
    return light.mode === "rgb" ? { brightness: b, color: kRgb(k).map(Math.round) } : { brightness: b, kelvin: clamp(Math.round(k / 50) * 50, kmin, kmax) };
  }

  _buttonTemplates() {
    const t = this._t;
    const list = [{ key: "day", name: t("Night · Morning · Day · Bright", "Nacht · Morgen · Tag · Hell") }];
    for (const x of this._objects) if (x.entry_id !== this._o.entry_id && x.options.buttons?.length) list.push({ key: `obj:${x.entry_id}`, name: t(`Like “${x.title}”`, `Wie „${x.title}“`) });
    return list;
  }

  _buttonTemplate(key) {
    if (key === "day") return BATH_BUTTONS.map(([position, name, icon]) => ({ id: newId(), name: this._lang === "de" ? name[1] : name[0], position, duration: 0, icon }));
    const src = this._objects.find((x) => x.entry_id === key.slice(4));
    return src ? src.options.buttons.map((b) => ({ ...clone(b), id: newId() })) : null;
  }

  _tplPreview(stops) {
    const W = 200,
      H = 64,
      P = 4;
    const x = (p) => (P + (p / 100) * (W - 2 * P)).toFixed(1),
      y = (v) => (P + (1 - v / 100) * (H - 2 * P)).toFixed(1);
    const lines = this._units()
      .map((u) => `<polyline class="tline" style="stroke:${seriesVar(u.slot)}" points="${stops.map((s) => `${x(s.position)},${y(s.values[u.ids[0]]?.brightness || 0)}`).join(" ")}"/>`)
      .join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(this._t("Brightness of each light over the scale", "Helligkeit jeder Leuchte über die Skala"))}"><line class="c-axis" x1="${P}" x2="${W - P}" y1="${y(0)}" y2="${y(0)}"/>${lines}</svg>`;
  }

  _renderTemplates() {
    const box = this.shadowRoot.getElementById("tplBox");
    if (!box) return;
    box.hidden = !this._tplOpen;
    if (!this._tplOpen) return;
    const t = this._t;
    const head = `<div class="row space"><div class="hrow"><b>${esc(t("Templates", "Vorlagen"))}</b><span class="opt">${esc(t("replace all stops; Undo brings them back", "ersetzen alle Stufen; „Rückgängig“ holt sie zurück"))}</span></div><button class="x" data-act="tpl-toggle" aria-label="${esc(t("Close", "Schließen"))}">×</button></div>`;
    if (!this._o.options.lights.length) {
      box.innerHTML = `${head}<p class="note">${esc(t("Add lights first; a template shapes their stops.", "Füge zuerst Leuchten hinzu; eine Vorlage formt ihre Stufen."))}</p>`;
      return;
    }
    const cards = this._templates()
      .map((x) => {
        const tpl = this._template(x.key);
        return tpl ? `<div class="tpl"><b>${esc(x.name)}</b>${this._tplPreview(tpl.stops)}<small>${esc(x.text)}</small><div><button class="btn" data-act="tpl-apply" data-key="${esc(x.key)}">${esc(t("Apply", "Übernehmen"))}</button></div></div>` : "";
      })
      .join("");
    box.innerHTML = `${head}<div class="tpls">${cards}</div>`;
  }

  // -- export and import ------------------------------------------------------------------------

  _export() {
    const data = { crescendo: 1, title: this._o.title, exported: new Date().toISOString(), options: stripIds(this._o.options) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `crescendo-${slug(this._o.title)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this._toast(this._t(`Saved as ${link.download}.`, `Als ${link.download} gespeichert.`));
  }

  _readImport(text, file) {
    const t = this._t;
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const options = data?.options && typeof data.options === "object" ? data.options : data;
    if (!Array.isArray(options?.lights) || !Array.isArray(options?.stops)) {
      this._toast(t(`${file} is not a Crescendo object.`, `${file} ist kein Crescendo-Objekt.`));
      return;
    }
    const states = this._hass.states;
    const missing = [...options.lights.map((l) => l?.entity_id), ...(options.devices || []).map((d) => d?.entity_id)].filter((id) => !id || !states[id]);
    this._import = { file, title: String(data.title || file.replace(/\.json$/i, "") || "Crescendo"), options, missing };
    this._renderImport();
  }

  // Only what exists here: lights and devices of this Home Assistant, a value for every light at every stop.
  _cleanImport(raw) {
    const states = this._hass.states;
    const o = { slider_rate: 4, on_mode: "last", on_position: 40, default_transition: 5, ...clone(raw) };
    o.lights = (o.lights || []).filter((l) => l?.entity_id && states[l.entity_id]);
    const ids = new Set(o.lights.map((l) => l.entity_id));
    o.devices = (o.devices || []).filter((d) => d?.entity_id && states[d.entity_id]).map((d) => ({ id: d.id || newId(), ...d }));
    o.buttons = (o.buttons || []).map((b) => ({ id: b.id || newId(), ...b }));
    o.groups = (o.groups || []).map((g) => ({ ...g, lights: (g.lights || []).filter((id) => ids.has(id)) })).filter((g) => g.lights.length >= 2);
    o.stops = (o.stops || []).filter((s) => typeof s?.position === "number");
    if (!o.stops.some((s) => s.position === 0)) o.stops.unshift({ position: 0, values: {} });
    if (!o.stops.some((s) => s.position === 100)) o.stops.push({ position: 100, values: {} });
    o.stops.sort((a, b) => a.position - b.position);
    for (const s of o.stops) {
      const values = {};
      for (const id of ids) values[id] = s.position === 0 ? { brightness: 0 } : s.values?.[id] || { brightness: 0 };
      s.values = values;
      delete s._sid;
    }
    return o;
  }

  _renderImport() {
    const box = this.shadowRoot.getElementById("importBox");
    if (!box) return;
    const imp = this._import,
      t = this._t;
    box.hidden = !imp;
    if (!imp) {
      box.innerHTML = "";
      return;
    }
    const o = imp.options;
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const facts = [
      count(o.lights.length, t("light", "Leuchte"), t("lights", "Leuchten")),
      count(o.stops.length, t("stop", "Stufe"), t("stops", "Stufen")),
      count((o.buttons || []).length, "Button", "Buttons"),
      count((o.devices || []).length, t("device", "Gerät"), t("devices", "Geräte")),
    ].join(", ");
    box.innerHTML = `<div class="notice calm"><b>${esc(imp.file)}: ${esc(imp.title)}</b><span>${esc(facts)}.</span>
      ${imp.missing.length ? `<span>${esc(t(`Not in this Home Assistant, so left out: ${imp.missing.join(", ")}.`, `Nicht in diesem Home Assistant, daher weggelassen: ${imp.missing.join(", ")}.`))}</span>` : ""}
      <div class="row"><button class="btn primary" data-act="import-new">${esc(t("Create as a new object", "Als neues Objekt anlegen"))}</button><button class="btn" data-act="import-replace">${esc(t(`Replace “${this._o.title}”`, `„${this._o.title}“ damit ersetzen`))}</button><button class="btn" data-act="import-cancel">${esc(t("Cancel", "Abbrechen"))}</button></div></div>`;
  }

  _renderStops() {
    const r = this.shadowRoot,
      t = this._t,
      o = this._o.options;
    const chart = this._edView === "chart";
    r.getElementById("vChart").setAttribute("aria-pressed", String(chart));
    r.getElementById("vTable").setAttribute("aria-pressed", String(!chart));
    r.getElementById("chartBox").hidden = !chart;
    r.getElementById("tableWrap").hidden = chart;
    r.getElementById("stopNote").textContent = chart
      ? t("Drag a point up or down to change the brightness. The number below a line moves the stop. Tap a point to set its color.", "Ziehe einen Punkt nach oben oder unten, um die Helligkeit zu ändern. Die Zahl unter einer Linie verschiebt die Stufe. Tippe einen Punkt an, um die Farbe einzustellen.")
      : t("Every light has a fixed value at every stop. In between it blends smoothly.", "Jede Leuchte hat in jeder Stufe einen festen Wert. Dazwischen wird fließend überblendet.");
    if (o.devices.length) r.getElementById("stopNote").textContent += ` ${t("Below stand the devices: drag a bar to move where one starts and ends. A threshold fires once: on a slider when you let go, on a timed fade when it is crossed.", "Darunter stehen die Geräte: Ziehe einen Balken, um zu verschieben, wo eines beginnt und endet. Eine Schwelle löst einmal aus: beim Slider erst beim Loslassen, bei zeitgesteuertem Dimmen beim Überschreiten.")}`;
    r.getElementById("editPos").style.setProperty("--grad", roomGradient(o, undefined, undefined, this._dark));
    r.getElementById("lanes").hidden = !chart;
    if (chart) this._renderChart();
    else this._renderMatrix();
    this._renderLanes();
    this._renderRows();
    this._renderDevices();
    this._renderTemplates();
    this._renderPicker();
    this._placeInspector();
  }

  _domainLabel(domain) {
    const l = DOMAIN_LABEL[domain];
    return l ? (this._lang === "de" ? l[1] : l[0]) : domain;
  }

  _areaOf(entityId) {
    const h = this._hass,
      e = h.entities?.[entityId];
    const areaId = e?.area_id || (e?.device_id && h.devices?.[e.device_id]?.area_id);
    return (areaId && h.areas?.[areaId]?.name) || "";
  }

  // Every light and device that can join, with the words a search may hit: name, id, room and kind.
  _candidates() {
    const hass = this._hass;
    const out = [];
    for (const id of Object.keys(hass.states)) {
      const s = hass.states[id],
        domain = id.split(".")[0];
      if (s.attributes?.crescendo) continue;
      const light = domain === "light",
        ramp = !light && RAMP_DOMAINS.includes(domain),
        threshold = !light && !!DEVICE_ACTIONS[domain];
      if (!light && !ramp && !threshold) continue;
      const name = friendly(hass, id),
        area = this._areaOf(id),
        kind = this._domainLabel(domain);
      out.push({ id, domain, name, area, kind, light, ramp, threshold, text: `${name} ${id} ${area} ${kind}`.toLowerCase() });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // What the device is doing right now, in a few words.
  _stateText(c) {
    const hass = this._hass,
      t = this._t,
      s = hass.states[c.id],
      a = s.attributes || {},
      lang = this._lang;
    let state = "";
    try {
      state = typeof hass.formatEntityState === "function" && s.entity_id ? hass.formatEntityState(s) : "";
    } catch (err) {
      state = "";
    }
    if (!state) state = lang === "de" ? STATE_DE[s.state] || s.state : s.state.replace(/_/g, " ");
    let now = "";
    if (c.domain === "media_player" && a.volume_level != null) now = `${t("Volume", "Lautstärke")} ${Math.round(a.volume_level * 100)} %`;
    else if (c.domain === "climate" && a.temperature != null) now = `${t("Target", "Soll")} ${comma(lang, a.temperature)} ${hass.config?.unit_system?.temperature || "°C"}`;
    else if (c.domain === "cover" && a.current_position != null) now = `${t("Position", "Position")} ${a.current_position} %`;
    else if (c.domain === "fan" && a.percentage != null) now = `${t("Speed", "Geschwindigkeit")} ${a.percentage} %`;
    else if (c.domain === "light" && s.state === "on" && a.brightness != null) now = `${Math.round((a.brightness / 255) * 100)} %`;
    else if ((c.domain === "number" || c.domain === "input_number") && !isNaN(+s.state)) {
      now = `${comma(lang, s.state)} ${a.unit_of_measurement || ""}`.trim();
      state = "";
    }
    return [state, now].filter(Boolean).join(", ");
  }

  _pickRow(c) {
    const t = this._t,
      s = this._hass.states[c.id],
      o = this._o.options;
    let facts,
      tags = "",
      acts = "";
    if (c.light) {
      const modes = this._modesFor(c.id);
      facts = [c.kind, this._modeLabels()[modes[modes.length - 1]], c.area, this._stateText(c)];
      if (o.lights.some((l) => l.entity_id === c.id)) tags = `<span class="tag">${esc(t("added", "dabei"))}</span>`;
      else acts = `<button class="btn" data-act="add-light" data-id="${esc(c.id)}">${esc(t("Add", "Hinzufügen"))}</button>`;
    } else {
      facts = [c.kind, c.area, this._stateText(c)];
      if (o.devices.some((d) => d.entity_id === c.id)) tags = `<span class="tag">${esc(t("added", "dabei"))}</span>`;
      else acts = `<button class="btn" data-act="add-dev" data-kind="${c.ramp ? "ramp" : "threshold"}" data-id="${esc(c.id)}">${esc(t("Add", "Hinzufügen"))}</button>`;
    }
    return `<div class="pickrow"><ha-icon icon="${esc(s.attributes?.icon || DOMAIN_ICON[c.domain] || "mdi:devices")}"></ha-icon><div class="pickmain"><b>${esc(c.name)}${tags}</b><small>${esc(facts.filter(Boolean).join(" · "))}</small><code>${esc(c.id)}</code></div><div class="pickacts">${acts}</div></div>`;
  }

  // Lights and devices come up by name, room or kind; lights are chosen first. Each shows what it is now.
  _renderPicker() {
    const t = this._t,
      r = this.shadowRoot;
    const list = r.getElementById("devList"),
      chips = r.getElementById("devKinds"),
      search = r.getElementById("devSearch"),
      room = r.getElementById("roomSel");
    if (!list) return;
    const pick = r.getElementById("devPick");
    pick.hidden = !(this._addOpen || !this._o.options.lights.length);
    if (pick.hidden) return;
    if (search.value !== (this._devQuery || "")) search.value = this._devQuery || "";
    const all = this._candidates();
    const present = new Set(all.map((c) => c.domain));
    let kind = this._devKind ?? "light";
    if (kind && !present.has(kind)) kind = "";
    const order = ["light", ...Object.keys(DOMAIN_LABEL).filter((d) => d !== "light")];
    const kinds = [...order.filter((d) => present.has(d)).map((d) => [d, this._domainLabel(d)]), ["", t("All kinds", "Alle Arten")]];
    chips.innerHTML = kinds.map(([d, l]) => `<button class="chip" data-act="dev-kind" data-domain="${d}" aria-pressed="${kind === d}">${esc(l)}</button>`).join("");
    const areas = [...new Set(all.map((c) => c.area).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (this._room && !areas.includes(this._room)) this._room = "";
    room.innerHTML = `<option value="">${esc(t("All rooms", "Alle Räume"))}</option>` + areas.map((a) => `<option value="${esc(a)}"${a === this._room ? " selected" : ""}>${esc(a)}</option>`).join("");
    room.hidden = !areas.length;
    const words = (this._devQuery || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const match = (c) => (!this._room || c.area === this._room) && words.every((w) => c.text.includes(w));
    const hits = all.filter((c) => (!kind || c.domain === kind) && match(c));
    const elsewhere = kind && (words.length || this._room) ? all.filter((c) => c.domain !== kind && match(c)).length : 0;
    const MAX = 12;
    const rows = hits.slice(0, MAX).map((c) => this._pickRow(c)).join("");
    let foot = hits.length > MAX ? `<div class="pickmore">${esc(t(`${hits.length - MAX} more. Narrow the search.`, `${hits.length - MAX} weitere. Grenze die Suche ein.`))}</div>` : "";
    if (elsewhere) foot += `<div class="pickmore">${esc(t(`${elsewhere} more of other kinds.`, `${elsewhere} weitere bei anderen Arten.`))} <button class="btn" data-act="dev-kind" data-domain="">${esc(t("Show all kinds", "Alle Arten zeigen"))}</button></div>`;
    list.innerHTML = (rows || `<div class="pickmore">${esc(all.length ? t("Nothing found.", "Nichts gefunden.") : t("Nothing to choose from.", "Nichts zur Auswahl."))}</div>`) + foot;
  }

  get _lang() {
    return langOf(this._hass);
  }

  _chartX(p) {
    return (this._chartGut + (p / 100) * (this._chartW - this._chartGut - PR)).toFixed(1);
  }

  _chartY(v) {
    return (PT + (1 - v / 100) * (CHART_H - PT - PB)).toFixed(1);
  }

  _renderChart() {
    const box = this.shadowRoot.getElementById("chartBox");
    if (!box || box.hidden || !this._o) return;
    const w = box.clientWidth;
    if (!w) return;
    const o = this._o.options;
    this._chartW = w;
    this._chartGut = w < 560 ? 42 : 170;
    this.shadowRoot.getElementById("lights").style.setProperty("--gut", `${this._chartGut}px`);
    const gut = this._chartGut,
      X = (p) => this._chartX(p),
      Y = (v) => this._chartY(v);
    const grid = [0, 25, 50, 75, 100]
      .map(
        (v) => `<line class="${v === 0 ? "c-axis" : "c-grid"}" x1="${gut}" x2="${w - PR}" y1="${Y(v)}" y2="${Y(v)}"/>
      <text class="c-lab" x="${gut - 8}" y="${+Y(v) + 4}" text-anchor="end">${v}${v === 100 ? " %" : ""}</text>`,
      )
      .join("");
    let lastX = -99;
    const stops = o.stops
      .map((s) => {
        const sel = this._sel.stop === s._sid,
          x = +X(s.position);
        const show = x - lastX >= 22 || sel || s.position === 100;
        if (show) lastX = x;
        return `<line class="c-stop${sel ? " sel" : ""}" x1="${x}" x2="${x}" y1="${PT}" y2="${CHART_H - PB}"/>${show ? `<text class="c-lab${sel ? " sel" : ""}" x="${x}" y="${CHART_H - 10}" text-anchor="middle">${s.position}</text>` : ""}<rect class="c-stophit" data-stophit="${s._sid}" x="${x - 14}" y="${CHART_H - PB}" width="28" height="${PB}"/>`;
      })
      .join("");
    const us = this._units();
    const lines = us
      .map((u) => {
        const pts = o.stops.map((s) => `${X(s.position)},${Y(lampAt(o, u.light, s.position).v)}`).join(" ");
        return `<polyline class="c-line" style="stroke:${seriesVar(u.slot)}" points="${pts}"/>`;
      })
      .join("");
    const dots = us
      .map((u) =>
        o.stops
          .map((s) => {
            const v = lampAt(o, u.light, s.position).v;
            const sel = this._sel.stop === s._sid && u.ids.includes(this._sel.lamp);
            return `<circle class="c-dot${sel ? " sel" : ""}" cx="${X(s.position)}" cy="${Y(v)}" r="${sel ? 6 : 4.5}" style="fill:${seriesVar(u.slot)}"/>${s.position === 0 ? "" : `<circle class="c-hit" data-pthit="${s._sid}" data-lamp="${esc(u.ids[0])}" cx="${X(s.position)}" cy="${Y(v)}" r="13"/>`}`;
          })
          .join(""),
      )
      .join("");
    const groups = this._devGroups();
    const devLines = groups
      .filter((g) => this._isPct(g.entity))
      .map((g) =>
        g.points
          .filter((d) => d.kind === "ramp")
          .map((d) => `<line class="c-dev" x1="${X(d.from)}" x2="${X(d.to)}" y1="${Y(clamp(d.min, 0, 100))}" y2="${Y(clamp(d.max, 0, 100))}" stroke-dasharray="${g.dash}"><title>${esc(friendly(this._hass, g.entity))}: ${esc(this._pointText(d))}</title></line>`)
          .join(""),
      )
      .join("");
    const base = +Y(0);
    const marks = groups
      .map((g) =>
        g.points
          .filter((d) => d.kind === "threshold")
          .map((d) => {
            const x = +X(d.at);
            const up = d.action ? `<path class="c-mark" d="M${x - 5} ${base - 13} L${x} ${base - 21} L${x + 5} ${base - 13} Z"/>` : "";
            const down = d.back ? `<path class="c-mark" d="M${x - 5} ${base - 10} L${x} ${base - 2} L${x + 5} ${base - 10} Z"/>` : "";
            return `<g><title>${esc(friendly(this._hass, g.entity))}: ${esc(this._pointText(d))}</title><line class="c-tick" x1="${x}" x2="${x}" y1="${base}" y2="${base - 24}"/>${up}${down}</g>`;
          })
          .join(""),
      )
      .join("");
    const pos = this._livePos();
    box.innerHTML = `<svg width="${w}" height="${CHART_H}" viewBox="0 0 ${w} ${CHART_H}" role="img" aria-label="${esc(this._t("Brightness of each light over the scale. The table shows the same values.", "Helligkeit jeder Leuchte über die Skala. Die Tabelle zeigt dieselben Werte."))}">
      ${grid}${stops}${devLines}${lines}${marks}<line class="c-cross" id="chartCross" x1="0" x2="0" y1="${PT}" y2="${CHART_H - PB}" visibility="hidden"/><line class="c-ph" id="chartPh" x1="${X(pos)}" x2="${X(pos)}" y1="${PT}" y2="${CHART_H - PB}"/>${dots}</svg><div class="chart-tip" id="chartTip" hidden></div>`;
    this._placeInspector();
  }

  _rampUnit(d) {
    const domain = d.entity_id.split(".")[0],
      a = this._hass.states[d.entity_id]?.attributes || {};
    const r = RAMP_LABEL[domain];
    return {
      label: r ? (this._lang === "de" ? r[1] : r[0]) : this._t("Value", "Wert"),
      unit: domain === "climate" ? this._hass.config?.unit_system?.temperature || "°C" : r ? r[2] : a.unit_of_measurement || "",
      step: domain === "climate" ? 0.5 : 1,
    };
  }

  _rampVal(d, p) {
    if (p <= d.from || d.to <= d.from) return d.min;
    return lerp(d.min, d.max, Math.min(1, (p - d.from) / (d.to - d.from)));
  }

  _fmtRamp(d, v) {
    const { unit, step } = this._rampUnit(d);
    return `${comma(this._lang, step < 1 ? (Math.round(v / step) * step).toFixed(1) : Math.round(v))} ${unit}`.trim();
  }

  // A device with all its entries, in the order they first appear. Each device has its own dash.
  _devGroups() {
    const map = new Map();
    for (const d of this._o.options.devices) {
      if (!map.has(d.entity_id)) map.set(d.entity_id, { entity: d.entity_id, points: [] });
      map.get(d.entity_id).points.push(d);
    }
    return [...map.values()].map((g, i) => ({ ...g, dash: DASHES[i % DASHES.length] }));
  }

  // Values in percent share the chart's axis with the lights; a temperature does not.
  _isPct(entityId) {
    const domain = entityId.split(".")[0];
    if (PCT_DOMAINS.includes(domain)) return true;
    return (domain === "number" || domain === "input_number") && this._hass.states[entityId]?.attributes?.unit_of_measurement === "%";
  }

  _devIcon(d) {
    const id = d.entity_id || d.entity;
    return this._hass.states[id]?.attributes?.icon || DOMAIN_ICON[id.split(".")[0]] || "mdi:devices";
  }

  _dashKey(g) {
    return this._isPct(g.entity) && g.points.some((d) => d.kind === "ramp") ? `<svg class="dkey" width="16" height="4" aria-hidden="true"><line x1="0" x2="16" y1="2" y2="2" stroke-dasharray="${g.dash}"/></svg>` : "";
  }

  // A point in words: a range with its values and direction, a switch point with what it does each way.
  _pointText(d) {
    const t = this._t;
    if (d.kind === "ramp") {
      const u = this._rampUnit(d);
      const dir = d.direction === "up" ? t(", only when dimming up", ", nur beim Hochdimmen") : d.direction === "down" ? t(", only when dimming down", ", nur beim Runterdimmen") : "";
      return `${t("Stop", "Stufe")} ${d.from}–${d.to}: ${u.label} ${this._fmtRamp(d, d.min)} → ${this._fmtRamp(d, d.max)}${dir}`;
    }
    const up = d.action ? `▲ ${this._actionName(d.action)}` : "",
      down = d.back ? `▼ ${this._actionName(d.back)}` : "";
    return `${t("Stop", "Stufe")} ${d.at}: ${[up, down].filter(Boolean).join(" · ") || t("does nothing", "tut nichts")}`;
  }

  // What a device shows at a position: the value of a range it lies in, otherwise nothing.
  _devValueAt(g, p) {
    const hit = g.points.filter((d) => d.kind === "ramp" && d.from <= p && p <= d.to).at(-1);
    return hit ? this._fmtRamp(hit, this._rampVal(hit, p)) : null;
  }

  // Under the stops: a device's lane with its ranges and switch points, its name opening its points.
  _deviceRow(g) {
    const t = this._t,
      e = esc(g.entity);
    const marks = g.points
      .map((d) =>
        d.kind === "ramp"
          ? `<div class="devramp${d.max < d.min ? " fall" : ""}" id="dvr-${esc(d.id)}" style="left:${d.from}%;width:${Math.max(0, d.to - d.from)}%" title="${esc(this._pointText(d))}">${d.direction === "up" ? '<span class="dir">↑</span>' : d.direction === "down" ? '<span class="dir">↓</span>' : ""}</div>`
          : `<div class="devmark" id="dvm-${esc(d.id)}" style="left:${d.at}%" title="${esc(this._pointText(d))}"></div>`,
      )
      .join("");
    return `<div class="lrow devrow"><div class="lname"><button class="lanename" data-act="win-dev" data-entity="${e}">${this._dashKey(g)}<ha-icon icon="${esc(this._devIcon(g))}"></ha-icon><span>${esc(friendly(this._hass, g.entity))}</span></button><span class="devval" data-devval="${e}"></span></div><div class="llane devlane" data-devlane="${e}" title="${esc(t("Dragging moves the nearest end or switch point", "Ziehen verschiebt das nächste Ende oder den nächsten Schaltpunkt"))}">${marks}</div></div>`;
  }

  // In the list of lights and devices: what the device is, how many points it has, and the way to them.
  _devItem(g) {
    const t = this._t,
      e = esc(g.entity),
      domain = g.entity.split(".")[0];
    const ramps = g.points.filter((d) => d.kind === "ramp").length,
      marks = g.points.length - ramps;
    const parts = [this._domainLabel(domain)];
    if (ramps) parts.push(ramps === 1 ? t("1 range", "1 Bereich") : t(`${ramps} ranges`, `${ramps} Bereiche`));
    if (marks) parts.push(marks === 1 ? t("1 switch point", "1 Schaltpunkt") : t(`${marks} switch points`, `${marks} Schaltpunkte`));
    return `<div class="lrow2 dev"><ha-icon icon="${esc(this._devIcon(g))}"></ha-icon><div class="lname"><span>${esc(friendly(this._hass, g.entity))}<small class="members">${esc(parts.join(" · "))}</small></span></div><div class="ctrls"><button class="morebtn" data-act="win-dev" data-entity="${e}" data-jump="1">${esc(t("Points", "Punkte"))} ▸</button><button class="x" data-act="rm-devall" data-entity="${e}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div></div>`;
  }

  // One point in the device's window.
  _ptFields(d) {
    const t = this._t,
      id = esc(d.id);
    const num = (f, v, label, attrs = 'min="0" max="100"') => `<input class="field num" type="number" id="d${f}-${id}" data-dev="${id}" data-f="${f}" ${attrs} value="${v}" aria-label="${esc(label)}">`;
    const head = (title) => `<div class="pt-head"><b>${esc(title)}</b><button class="x" data-act="rm-dev" data-id="${id}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div>`;
    if (d.kind === "ramp") {
      const u = this._rampUnit(d);
      const dir = d.direction || "both";
      const opt = (v, l) => `<option value="${v}"${dir === v ? " selected" : ""}>${esc(l)}</option>`;
      return `<div class="pt">${head(t("Range", "Bereich"))}
        <div class="row"><label>${esc(t("Stop", "Stufe"))} ${num("from", d.from, t("Start", "Beginn"))}</label><label>${esc(t("to", "bis"))} ${num("to", d.to, t("End", "Ende"))}</label></div>
        <div class="row"><label>${esc(u.label)} ${num("min", d.min, t("Start value", "Anfangswert"), `step="${u.step}"`)}</label><label>${esc(t("to", "bis"))} ${num("max", d.max, t("End value", "Endwert"), `step="${u.step}"`)} ${esc(u.unit)}</label></div>
        <label>${esc(t("Acts", "Wirkt"))} <select class="field" id="ddir-${id}" data-dev="${id}" data-f="direction">${opt("both", t("when dimming up and down", "beim Hoch- und Runterdimmen"))}${opt("up", t("only when dimming up", "nur beim Hochdimmen"))}${opt("down", t("only when dimming down", "nur beim Runterdimmen"))}</select></label></div>`;
    }
    const actions = DEVICE_ACTIONS[d.entity_id.split(".")[0]] || ["turn_on", "turn_off"];
    const opts = (val, list) =>
      `<option value="">${esc(t("Do nothing", "Nichts tun"))}</option>` + list.map((a) => `<option value="${a}"${val === a ? " selected" : ""}>${esc(this._actionName(a))}</option>`).join("");
    const media =
      d.action === "play_media"
        ? `<div class="row"><label>${esc(t("Title or playlist", "Titel oder Playlist"))} <input class="field" id="dcid-${id}" data-dev="${id}" data-f="media_content_id" value="${esc(d.data?.media_content_id || "")}"></label>
           <label>${esc(t("Type", "Art"))} <input class="field" id="dctype-${id}" data-dev="${id}" data-f="media_content_type" value="${esc(d.data?.media_content_type || "music")}"></label></div>`
        : "";
    return `<div class="pt">${head(t("Switch point", "Schaltpunkt"))}
      <div class="row"><label>${esc(t("At stop", "Bei Stufe"))} ${num("at", d.at, t("Switch point", "Schaltpunkt"))}</label></div>
      <label>▲ ${esc(t("Crossing up", "Beim Überschreiten"))} <select class="field" id="dact-${id}" data-dev="${id}" data-f="action">${opts(d.action || "", actions)}</select></label>
      <label>▼ ${esc(t("Crossing down", "Beim Unterschreiten"))} <select class="field" id="dbck-${id}" data-dev="${id}" data-f="back">${opts(d.back || "", actions.filter((a) => a !== "play_media"))}</select></label>${media}</div>`;
  }

  _actionName(a) {
    return ACTION_LABEL[a] ? (this._lang === "de" ? ACTION_LABEL[a][1] : ACTION_LABEL[a][0]) : a;
  }

  _opposite(entityId, action) {
    const actions = DEVICE_ACTIONS[entityId.split(".")[0]] || ["turn_on", "turn_off"];
    const back = OPPOSITE[action];
    return back && back !== "play_media" && actions.includes(back) ? back : null;
  }

  _modesFor(entityId) {
    const a = this._hass.states[entityId]?.attributes || {};
    const modes = a.supported_color_modes || [];
    const hasColor = modes.some((m) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m));
    const hasCt = modes.includes("color_temp");
    const list = ["onoff"];
    if (!modes.length || hasColor || hasCt || modes.includes("brightness")) list.push("dim");
    if (hasCt) list.push("cct");
    if (hasColor) list.push("rgb");
    if (hasColor && hasCt) list.push("rgbcct");
    return list;
  }

  _modeLabels() {
    const t = this._t;
    return {
      onoff: t("On/off only", "Nur an/aus"),
      dim: t("Dimming only", "Nur dimmen"),
      cct: t("White tones", "Weißtöne"),
      rgb: t("Colors", "Farben"),
      rgbcct: t("Colors and white tones", "Farben und Weißtöne"),
    };
  }

  // A light's row: what it shows, with More beside it. More opens fade, slider and group below the row.
  // A group's row names its lights; under More it can be renamed, lose a light or be dissolved.
  _lampRow(u, us) {
    const t = this._t,
      l = u.light,
      label = this._modeLabels(),
      g = u.group;
    const avail = u.ids.map((id) => this._modesFor(id)).reduce((a, b) => a.filter((m) => b.includes(m)));
    const modes = (avail.includes(l.mode) ? avail : [...avail, l.mode]).map((m) => `<option value="${m}"${l.mode === m ? " selected" : ""}>${esc(label[m])}</option>`).join("");
    const key = u.ids.join(","),
      k = esc(key);
    const names = u.ids.map((id) => friendly(this._hass, id));
    const title = g ? (g.name || "").trim() || commonName(names) : u.name;
    const open = this._openMore.has(key);
    const flicker = l.mode === "rgbcct";
    let panel = "";
    if (open) {
      const steps = l.fade === "ontime" ? `<label>${esc(t("Steps per second", "Schritte pro Sekunde"))} <input class="field num" type="number" id="fs-${esc(l.entity_id)}" data-steps="${k}" min="1" max="8" value="${l.steps || 4}"></label>` : "";
      const nameOf = (x) => (x.group ? (x.group.name || "").trim() || commonName(x.ids.map((id) => friendly(this._hass, id))) : x.name);
      const group = g
        ? `<div class="gline"><label>${esc(t("Display name", "Anzeigename"))} <input class="field" id="gn-${esc(g.id)}" data-gname="${esc(g.id)}" value="${esc(g.name || "")}" placeholder="${esc(commonName(names))}"></label>
          <span class="gmembers">${u.ids.map((id) => `<button class="chip" data-act="group-out" data-gid="${esc(g.id)}" data-id="${esc(id)}" title="${esc(t("Take out of the group", "Aus der Gruppe nehmen"))}">${esc(friendly(this._hass, id))} ×</button>`).join("")}</span>
          <button class="btn quiet" data-act="ungroup" data-gid="${esc(g.id)}">${esc(t("Dissolve group", "Gruppe auflösen"))}</button></div>`
        : `<label>${esc(t("Group", "Gruppe"))} <select class="field" id="gw-${esc(l.entity_id)}" data-groupwith="${k}"><option value="">${esc(t("None", "Keine"))}</option>${us
            .filter((x) => x.ids.join(",") !== key)
            .map((x) => `<option value="${esc(x.ids.join(","))}">${esc(x.group ? t(`Join “${nameOf(x)}”`, `Zu „${nameOf(x)}“ hinzufügen`) : t(`Group with “${nameOf(x)}”`, `Mit „${nameOf(x)}“ gruppieren`))}</option>`)
            .join("")}</select></label>`;
      const note = flicker
        ? `<p class="lwarn">${esc(t("Changing between color and white can make this light flicker. If that bothers you, choose Colors or White tones. Another object with the same light can be set differently.", "Beim Wechsel zwischen Farbe und Weiß kann diese Leuchte flackern. Falls das stört, wähle „Farben“ oder „Weißtöne“. Ein weiteres Objekt mit derselben Leuchte kann anders eingestellt sein."))}</p>`
        : "";
      panel = `<div class="lpanel">${note}${g ? group : ""}
        <label>${esc(t("Fade", "Überblendung"))} <select class="field" id="fm-${esc(l.entity_id)}" data-fade="${k}"><option value="soft"${l.fade === "soft" ? " selected" : ""}>${esc(t("Smooth", "Weich"))}</option><option value="ontime"${l.fade === "ontime" ? " selected" : ""}>${esc(t("On time", "Pünktlich"))}</option></select></label>${steps}
        <label>${esc(t("On the slider", "Am Slider"))} <select class="field" id="sl-${esc(l.entity_id)}" data-slider-mode="${k}"><option value="auto"${(l.slider || "auto") === "auto" ? " selected" : ""}>${esc(t("Automatic", "Automatisch"))}</option><option value="glide"${l.slider === "glide" ? " selected" : ""}>${esc(t("Gliding", "Gleitend"))}</option><option value="direct"${l.slider === "direct" ? " selected" : ""}>${esc(t("Direct steps", "Direkte Schritte"))}</option></select></label>
        ${g ? "" : group}${this._ib(`fade-${key}`)}</div>${this._it(`fade-${key}`, t("Smooth lets the light fade by itself. On time moves it in short steps if it reaches its target too late, which may stutter more. Gliding and direct steps change how it follows a slider. A group shows as one light, here and in the cards, and takes the settings of the light or group it joins.", "Weich lässt die Leuchte selbst überblenden. Pünktlich bewegt sie in kurzen Schritten, falls sie ihr Ziel zu spät erreicht; das kann mehr ruckeln. Gleitend und direkte Schritte ändern, wie sie einem Slider folgt. Eine Gruppe erscheint als eine Leuchte, hier und in den Karten, und übernimmt die Einstellungen der Leuchte oder Gruppe, zu der sie kommt."))}`;
    }
    const dot = flicker ? `<span class="wdot" title="${esc(t("Can flicker, see More", "Kann flackern, siehe Mehr"))}"></span>` : "";
    return `<div class="lrow2"><i class="key" style="background:${seriesVar(u.slot)}"></i><div class="lname"><span>${esc(title)}${g ? `<small class="members">${esc(t("Group", "Gruppe"))}: ${esc(names.join(", "))}</small>` : ""}</span></div>
      <div class="ctrls"><button class="morebtn" data-act="more" data-key="${k}" aria-expanded="${open}">${esc(t("More", "Mehr"))}${dot} ${open ? "▾" : "▸"}</button><select class="field" id="mode-${esc(l.entity_id)}" data-mode="${k}" aria-label="${esc(t("What the light shows", "Was die Leuchte zeigt"))}">${modes}</select><button class="x" data-act="rm-lamp" data-ids="${k}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div>
      ${panel}</div>`;
  }

  _renderRows() {
    const box = this.shadowRoot.getElementById("rows"),
      t = this._t,
      o = this._o.options;
    const us = this._units();
    const rows = us.map((u) => this._lampRow(u, us)).join("") + this._devGroups().map((g) => this._devItem(g)).join("");
    const folded = this._addOpen || !o.lights.length;
    box.innerHTML =
      (rows || `<p class="note">${esc(t("Nothing yet. Add the first light below.", "Noch nichts. Füge unten die erste Leuchte hinzu."))}</p>`) +
      `<button class="btn quiet addrow" data-act="add-open"${folded ? " hidden" : ""}>+ ${esc(t("Add a light or device", "Leuchte oder Gerät hinzufügen"))}</button>`;
    this._renderGroupBar();
  }

  // -- groups -----------------------------------------------------------------------------------

  // What the names share, or all names when they share nothing.
  _groupName(ids) {
    const names = ids.map((id) => friendly(this._hass, id));
    const shared = commonName(names);
    return names.every((n) => n === shared || n.startsWith(`${shared} `)) ? shared : names.join(" + ");
  }

  // Lights set the same or almost the same, not grouped yet. Not offered while the curve has only its two ends.
  _groupSuggestions() {
    const o = this._o.options;
    const all = this._units();
    const free = all.filter((u) => !u.group);
    if (o.stops.length < 3 || free.length < 2) return [];
    const val = (u, s) => s.values[u.light.entity_id] || { brightness: 0 };
    const near = (a, b) =>
      a.light.mode === b.light.mode &&
      o.stops.every((s) => {
        const x = val(a, s),
          y = val(b, s);
        if (Math.abs((x.brightness || 0) - (y.brightness || 0)) > 5) return false;
        if (!x.brightness && !y.brightness) return true;
        if (!!x.color !== !!y.color) return false;
        return x.color ? colorGap(x.color, y.color) < 0.05 : Math.abs((x.kelvin ?? 3000) - (y.kelvin ?? 3000)) <= 250;
      });
    const same = (a, b) =>
      o.stops.every((s) => {
        const x = val(a, s),
          y = val(b, s);
        return (x.brightness || 0) === (y.brightness || 0) && (x.kelvin ?? null) === (y.kelvin ?? null) && String(x.color ?? "") === String(y.color ?? "");
      });
    const no = this._dismissed();
    const out = [],
      used = new Set();
    for (const a of free) {
      if (used.has(a)) continue;
      const members = [a, ...free.filter((b) => b !== a && !used.has(b) && near(a, b))];
      if (members.length < 2 || members.length === all.length) continue;
      members.forEach((m) => used.add(m));
      const ids = members.flatMap((m) => m.ids);
      if (no.has([...ids].sort().join(","))) continue;
      out.push({ ids, same: members.every((m) => same(a, m)), name: this._groupName(ids) });
    }
    return out;
  }

  _dismissed() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("crescendo-nogroup") || "{}")[this._o.entry_id] || [];
    } catch {
      stored = [];
    }
    return new Set([...stored, ...this._noGroup]);
  }

  _dismiss(key) {
    this._noGroup.add(key);
    try {
      const all = JSON.parse(localStorage.getItem("crescendo-nogroup") || "{}");
      all[this._o.entry_id] = [...new Set([...(all[this._o.entry_id] || []), key])];
      localStorage.setItem("crescendo-nogroup", JSON.stringify(all));
    } catch {
      // Without storage the choice holds until the page is reloaded.
    }
  }

  // A suggestion takes one line: what is set the same, one button to group, one to let it be.
  _renderGroupBar() {
    const box = this.shadowRoot.getElementById("groupBar");
    if (!box) return;
    const t = this._t;
    const nameOf = (id) => friendly(this._hass, id);
    this._suggest = this._groupSuggestions();
    box.hidden = !this._suggest.length;
    box.innerHTML = this._suggest
      .map(
        (h, i) => `<div class="sugline"><span>${esc(h.same ? t("Set the same", "Gleich eingestellt") : t("Set almost the same", "Fast gleich eingestellt"))}: <b>${esc(h.ids.map(nameOf).join(", "))}</b>${h.same ? "" : ` <small>${esc(t(`(all take the values of ${nameOf(h.ids[0])})`, `(alle übernehmen die Werte von ${nameOf(h.ids[0])})`))}</small>`}</span>
        <button class="btn primary" data-act="group-suggest" data-i="${i}">${esc(t(`Group as “${h.name}”`, `Als „${h.name}“ gruppieren`))}</button><button class="x" data-act="group-dismiss" data-i="${i}" aria-label="${esc(t("Do not group", "Nicht gruppieren"))}" title="${esc(t("Do not group", "Nicht gruppieren"))}">×</button></div>`,
      )
      .join("");
  }

  // The lights become one group with the lead light's mode, as far as all can show it, and its values.
  _makeGroup(ids, name, leadId) {
    const o = this._o.options;
    const lead = o.lights.find((l) => l.entity_id === leadId);
    if (!lead || ids.length < 2) return;
    const PREF = ["rgbcct", "rgb", "cct", "dim", "onoff"];
    const common = ids.map((id) => this._modesFor(id)).reduce((a, b) => a.filter((m) => b.includes(m)));
    const mode = common.includes(lead.mode) ? lead.mode : PREF.find((m) => common.includes(m)) || "onoff";
    const values = Object.fromEntries(o.stops.map((s) => [s._sid, clone(s.values[leadId] || { brightness: 0 })]));
    this._change(() => {
      o.groups = (o.groups || []).map((g) => ({ ...g, lights: g.lights.filter((id) => !ids.includes(id)) })).filter((g) => g.lights.length >= 2);
      o.groups.push({ id: newId(), name: String(name || "").trim(), lights: o.lights.map((l) => l.entity_id).filter((id) => ids.includes(id)) });
      for (const id of ids) {
        const l = o.lights.find((x) => x.entity_id === id);
        Object.assign(l, { mode, fade: lead.fade, steps: lead.steps, slider: lead.slider });
        for (const s of o.stops) s.values[id] = s.position === 0 ? { brightness: 0 } : this._fitValue(l, values[s._sid]);
      }
    });
  }

  _renderLanes() {
    const box = this.shadowRoot.getElementById("lanes"),
      o = this._o.options;
    box.innerHTML = this._units()
      .map(
        (u) => `<div class="lrow"><div class="lname"><button class="lanename" data-act="win-light" data-ids="${esc(u.ids.join(","))}"><i class="key" style="background:${seriesVar(u.slot)}"></i><span>${esc(u.name)}</span></button></div>
        <div class="llane" style="background-image:${laneGradient(o, u.light, undefined, this._dark)}"></div></div>`,
      )
      .join("");
  }

  _renderDevices() {
    const box = this.shadowRoot.getElementById("devRows"),
      t = this._t,
      o = this._o.options;
    box.hidden = !o.devices.length;
    box.innerHTML = this._devGroups()
      .map((g) => this._deviceRow(g))
      .join("");
  }

  _renderMatrix() {
    const o = this._o.options,
      t = this._t,
      us = this._units();
    const head = o.stops.map((s) => `<th><button class="stophead${this._sel.stop === s._sid ? " sel" : ""}" data-act="sel-stop" data-stop="${s._sid}">${s.position}</button></th>`).join("");
    const room = o.stops
      .map((s) => {
        const l = roomLight(o, s.position);
        const paint = rampColor(l.c, l.a, this._dark);
        return `<td><div class="roomcell" style="background-image:linear-gradient(${paint},${paint})"></div></td>`;
      })
      .join("");
    const cell = (u, s) => {
      const light = u.light,
        val = s.values[light.entity_id] || { brightness: 0 };
      const sel = this._sel.stop === s._sid && u.ids.includes(this._sel.lamp) ? " sel" : "";
      const attrs = `data-act="sel-cell" data-stop="${s._sid}" data-lamp="${esc(light.entity_id)}" aria-label="${esc(u.name)}, ${esc(t("stop", "Stufe"))} ${s.position}"`;
      if (!val.brightness) return `<button class="cell off${s.position === 0 ? " locked" : ""}${sel}" ${attrs}>${esc(t("off", "aus"))}</button>`;
      const base = rgbOf(light, val);
      const alpha = 0.2 + 0.8 * Math.pow(val.brightness / 100, 0.7);
      const fg = this._dark || alpha > 0.6 ? (lumOf(lightColor(base)) > 0.5 ? "#171d2d" : "#ffffff") : "var(--ink)";
      let sub = "";
      if (light.mode === "cct" || (light.mode === "rgbcct" && !val.color)) sub = `${val.kelvin ?? 3000} K`;
      else if (light.mode === "rgb" || light.mode === "rgbcct") sub = t("Color", "Farbe");
      const main = light.mode === "onoff" ? t("on", "an") : `${Math.round(val.brightness)} %`;
      return `<button class="cell${sel}" style="background:${rampColor(base, alpha, this._dark)};color:${fg}" ${attrs}>${main}${sub ? `<small>${sub}</small>` : ""}</button>`;
    };
    const rows = us
      .map(
        (u) => `<tr><th scope="row"><div class="lname" style="padding:0"><button class="lanename" data-act="win-light" data-ids="${esc(u.ids.join(","))}">${esc(u.name)}</button><button class="x" data-act="rm-lamp" data-ids="${esc(u.ids.join(","))}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div></th>${o.stops.map((s) => `<td>${cell(u, s)}</td>`).join("")}</tr>`,
      )
      .join("");
    const devRows = this._devGroups()
      .map((g) => {
        const marks = g.points
          .filter((d) => d.kind === "threshold")
          .map((d) => this._pointText(d))
          .join("; ");
        return `<tr><th scope="row"><button class="lanename" data-act="win-dev" data-entity="${esc(g.entity)}">${esc(friendly(this._hass, g.entity))}</button>${marks ? `<small class="mxmarks">${esc(marks)}</small>` : ""}</th>${o.stops.map((s) => `<td class="num-cell" style="text-align:center;font-size:12.5px">${esc(this._devValueAt(g, s.position) ?? "–")}</td>`).join("")}</tr>`;
      })
      .join("");
    this.shadowRoot.getElementById("matrix").innerHTML = `<thead><tr><th>${esc(t("Stop", "Stufe"))}</th>${head}</tr></thead><tbody><tr><th scope="row">${esc(t("Room", "Raum"))}</th>${room}</tr>${rows || `<tr><th scope="row">${esc(t("No light yet", "Noch keine Leuchte"))}</th><td colspan="${o.stops.length}"><span class="note">${esc(t("Add the first one below.", "Füge unten die erste hinzu."))}</span></td></tr>`}${devRows}</tbody>`;
  }

  _kelvinRange(light) {
    const a = this._hass.states[light.entity_id]?.attributes || {};
    // Lights report odd limits such as 2702 K; Home Assistant clamps what it sends anyway.
    return [Math.round((a.min_color_temp_kelvin || 2000) / 50) * 50, Math.floor((a.max_color_temp_kelvin || 6500) / 50) * 50];
  }

  // Hue and saturation of the chosen color, kept while dragging so a gray does not lose its hue.
  _insPick(light, val) {
    const rgb = val.color || rgbOf(light, val);
    const key = `${this._sel.stop}|${this._sel.lamp}`;
    if (this._pickState?.key === key && this._pickState.rgb.join() === rgb.join()) return this._pickState;
    const top = Math.max(...rgb);
    // A light still on a white tone starts fully saturated, like the card's picker.
    this._pickState = { key, rgb: [...rgb], hue: rgbHue(rgb), sat: !val.color ? 1 : top ? (top - Math.min(...rgb)) / top : 0 };
    return this._pickState;
  }

  // The bars of the selected point: what each shows, its gradient and where its mark stands.
  _insModel(st, u) {
    const t = this._t,
      light = u.light,
      val = st.values[light.entity_id] || { brightness: 0 };
    const shine = rgbOf(light, val);
    const grad = (n, f) => `linear-gradient(90deg,${Array.from({ length: n + 1 }, (_, i) => `rgb(${css(f(i / n))}) ${((i / n) * 100).toFixed(1)}%`).join(",")})`;
    const bars = [];
    if (light.mode !== "onoff") bars.push({ kind: "bri", label: t("Brightness", "Helligkeit"), value: `${Math.round(val.brightness)} %`, image: `linear-gradient(90deg, var(--well), ${lightA(shine, 1)})`, place: val.brightness / 100 });
    const white = light.mode !== "rgb" && !val.color;
    if (light.mode === "cct" || light.mode === "rgbcct") {
      const [kmin, kmax] = this._kelvinRange(light);
      const k = clamp(val.kelvin ?? 3000, kmin, kmax);
      bars.push({ kind: "white", label: t("White tone", "Weißton"), value: white ? `${k} K` : "–", image: grad(6, (x) => kRgb(kmin + (kmax - kmin) * x)), place: white ? (k - kmin) / (kmax - kmin || 1) : null, idle: !white, ends: [`${kmin} K`, `${kmax} K`] });
    }
    if (light.mode === "rgb" || light.mode === "rgbcct") {
      const pick = this._insPick(light, val);
      bars.push({ kind: "hue", label: t("Color", "Farbe"), value: white ? "–" : `${Math.round(pick.hue)}°`, image: grad(12, (x) => hueRgb((x * 360) % 360)), place: white ? null : pick.hue / 360, idle: white });
      bars.push({ kind: "sat", label: t("Saturation", "Sättigung"), value: white ? "–" : `${Math.round(pick.sat * 100)} %`, image: `linear-gradient(90deg, #ffffff, rgb(${css(hueRgb(pick.hue % 360))}))`, place: white ? null : pick.sat, idle: white });
    }
    return { val, shine: val.brightness > 0 ? lightA(shine, 1) : "var(--well)", bars };
  }

  // A light's window lists its stops; a device's window holds its ranges and switch points.
  _renderWin() {
    const box = this.shadowRoot.getElementById("inspector"),
      t = this._t,
      w = this._win,
      o = this._o.options;
    const close = `<button class="x done" data-act="close-ins" aria-label="${esc(t("Done", "Fertig"))}" title="${esc(t("Done", "Fertig"))}">${CHECK_ICON}</button>`;
    box.classList.toggle("wide", w.kind === "device");
    if (w.kind === "light") {
      const u = this._units().find((x) => x.ids.join(",") === w.ids);
      if (!u) {
        this._win = null;
        box.hidden = true;
        return;
      }
      const light = u.light;
      const rows = o.stops
        .filter((s) => s.position > 0)
        .map((s) => {
          const v = s.values[light.entity_id] || { brightness: 0 };
          const on = v.brightness > 0;
          const main = !on ? t("off", "aus") : light.mode === "onoff" ? t("on", "an") : `${Math.round(v.brightness)} %`;
          const sub = !on ? "" : v.color ? t("Color", "Farbe") : light.mode === "cct" || light.mode === "rgbcct" ? `${v.kelvin ?? 3000} K` : "";
          return `<button class="ptrow" data-act="win-point" data-stop="${s._sid}" data-lamp="${esc(light.entity_id)}"><span>${esc(t("Stop", "Stufe"))} ${s.position}</span><i class="swatch" style="background:${on ? lightA(rgbOf(light, v), 1) : "var(--well)"}"></i><b>${esc(main)}</b><small>${esc(sub)}</small></button>`;
        })
        .join("");
      box.innerHTML = `<h3><i class="key" style="background:${seriesVar(u.slot)}"></i>${esc(u.name)}<small>${esc(t("All stops", "Alle Stufen"))}</small>${close}</h3><div class="ptlist">${rows}</div><p class="note">${esc(t("Tap a stop to set it.", "Tippe eine Stufe an, um sie einzustellen."))}</p>`;
    } else {
      const g = this._devGroups().find((x) => x.entity === w.entity);
      if (!g) {
        this._win = null;
        box.hidden = true;
        return;
      }
      const domain = g.entity.split(".")[0],
        e = esc(g.entity);
      const add = (kind, label) => `<button class="btn" data-act="add-pt" data-kind="${kind}" data-entity="${e}">+ ${esc(label)}</button>`;
      box.innerHTML = `<h3><ha-icon icon="${esc(this._devIcon(g))}"></ha-icon>${esc(friendly(this._hass, g.entity))}<small>${esc(this._domainLabel(domain))}</small>${close}</h3>
        ${g.points.map((d) => this._ptFields(d)).join("")}
        <div class="row">${RAMP_DOMAINS.includes(domain) ? add("ramp", t("Range", "Bereich")) : ""}${DEVICE_ACTIONS[domain] ? add("threshold", t("Switch point", "Schaltpunkt")) : ""}${this._ib("devwin")}</div>
        ${this._it("devwin", t("A range changes the value while the scale runs through it; a jump over it ends at its end value. A switch point acts when the scale crosses it, on a slider when you let go; Do nothing leaves one side out. Several ranges and switch points can work together, for example play from 50, louder from 60 to 80, pause below 40.", "Ein Bereich ändert den Wert, während die Skala durch ihn läuft; wer ihn überspringt, landet auf seinem Endwert. Ein Schaltpunkt löst aus, wenn die Skala ihn überquert, beim Slider erst beim Loslassen; „Nichts tun“ lässt eine Seite aus. Mehrere Bereiche und Schaltpunkte arbeiten zusammen, zum Beispiel ab 50 abspielen, von 60 bis 80 lauter, unter 40 pausieren."))}`;
    }
    box.hidden = false;
    this._placeInspector();
  }

  _renderInspector() {
    const box = this.shadowRoot.getElementById("inspector"),
      t = this._t;
    if (!box || this._insDrag) return;
    if (this._win && !this._sel.lamp) {
      this._renderWin();
      return;
    }
    box.classList.remove("wide");
    const st = this._stop(),
      u = this._selUnit();
    box.hidden = !st || !u;
    if (!st || !u) return;
    const close = `<button class="x done" data-act="close-ins" aria-label="${esc(t("Done", "Fertig"))}" title="${esc(t("Done", "Fertig"))}">${CHECK_ICON}</button>`;
    const light = u.light;
    const m = this._insModel(st, u);
    const back = this._win?.kind === "light" ? `<button class="x" data-act="win-back" aria-label="${esc(t("Back to all stops", "Zurück zu allen Stufen"))}" title="${esc(t("All stops", "Alle Stufen"))}">‹</button>` : "";
    let html = `<h3>${back}<i class="swatch" style="background:${m.shine}"></i>${esc(u.name)}<small>${esc(t("Stop", "Stufe"))} ${st.position}</small>${close}</h3>`;
    if (st.position === 0) {
      box.innerHTML = `${html}<p class="note">${esc(t("At stop 0 all lights are always off.", "Bei Stufe 0 sind immer alle Leuchten aus."))}</p>`;
      this._placeInspector();
      return;
    }
    if (light.mode === "onoff") {
      html += `<label class="opt"><input type="checkbox" id="insOn"${m.val.brightness > 0 ? " checked" : ""}> ${esc(t("Light on at this stop", "Leuchte an in dieser Stufe"))}</label>`;
    }
    for (const b of m.bars) {
      html += `<div class="ctl"><div class="ctl-top"><span>${esc(b.label)}</span><output data-pout="${b.kind}">${esc(b.value)}</output></div>
        <div class="pbar${b.idle ? " idle" : ""}" data-pbar="${b.kind}" role="slider" tabindex="0" aria-label="${esc(b.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${b.place === null ? 0 : Math.round(b.place * 100)}" style="background-image:${b.image}"><i class="pknob"${b.place === null ? " hidden" : ` style="left:${(b.place * 100).toFixed(1)}%"`}></i></div>
        ${b.ends ? `<div class="pends"><span>${esc(b.ends[0])}</span><span>${esc(b.ends[1])}</span></div>` : ""}</div>`;
    }
    if (light.mode === "rgbcct") html += `<p class="note">${esc(t("A tap on a bar chooses: the light shows a white tone or a color.", "Ein Tipp auf einen Balken wählt: Die Leuchte zeigt einen Weißton oder eine Farbe."))}</p>`;
    html += `<button class="btn" data-act="copy-all">${esc(t("Apply to all lights of this stop", "Für alle Leuchten dieser Stufe übernehmen"))}</button>`;
    box.innerHTML = html;
    this._placeInspector();
  }

  // While a bar is dragged the inspector is painted in place, so the dragged bar stays.
  _paintInspector() {
    const box = this.shadowRoot.getElementById("inspector"),
      st = this._stop(),
      u = this._selUnit();
    if (!box || !st || !u) return;
    const m = this._insModel(st, u);
    box.querySelector(".swatch").style.background = m.shine;
    for (const b of m.bars) {
      const bar = box.querySelector(`[data-pbar="${b.kind}"]`),
        out = box.querySelector(`[data-pout="${b.kind}"]`);
      if (!bar) continue;
      out.textContent = b.value;
      bar.classList.toggle("idle", !!b.idle);
      bar.style.backgroundImage = b.image;
      bar.setAttribute("aria-valuenow", b.place === null ? 0 : Math.round(b.place * 100));
      const knob = bar.querySelector(".pknob");
      knob.hidden = b.place === null;
      if (b.place !== null) knob.style.left = `${(b.place * 100).toFixed(1)}%`;
    }
  }

  // Changes apply as they are made, so closing only puts the settings away. The stop stays chosen for its tools.
  _closeInspector() {
    this._win = null;
    this._sel = { stop: this._sel.stop, lamp: null };
    this._renderInspector();
    const r = this.shadowRoot;
    r.querySelectorAll(".c-dot.sel").forEach((el) => {
      el.classList.remove("sel");
      el.setAttribute("r", "4.5");
    });
    r.querySelectorAll(".cell.sel").forEach((el) => el.classList.remove("sel"));
  }

  // Moves the selected point's value along a bar: 0 to 1 across its width.
  _applyIns(kind, place) {
    const st = this._stop(),
      u = this._selUnit();
    if (!st || !u) return;
    const light = u.light;
    const [kmin, kmax] = this._kelvinRange(light);
    const pick = kind === "hue" || kind === "sat" ? this._insPick(light, st.values[light.entity_id] || { brightness: 0 }) : null;
    if (pick) {
      if (kind === "hue") pick.hue = (place * 360) % 360;
      else pick.sat = place;
      pick.rgb = hueRgb(pick.hue % 360).map((c) => Math.round(c + (255 - c) * (1 - pick.sat)));
    }
    for (const id of u.ids) {
      const v = st.values[id] || { brightness: 0 };
      if (kind === "bri") st.values[id] = { ...v, brightness: Math.round(place * 100) };
      else if (kind === "white") st.values[id] = { brightness: v.brightness, kelvin: Math.round((kmin + (kmax - kmin) * place) / 50) * 50 };
      else st.values[id] = { brightness: v.brightness, color: [...pick.rgb] };
    }
  }

  _moveIns(e) {
    const d = this._insDrag;
    if (!d) return;
    this._applyIns(d.kind, clamp((e.clientX - d.r.left) / (d.r.width || 1), 0, 1));
    this._renderStops();
    this._paintInspector();
    this._save();
    this._previewDraft();
  }

  // Arrow keys move a bar's mark in small steps; a white tone by 50 K.
  _onKey(e) {
    if (e.key === "Escape" && this.shadowRoot.getElementById("inspector")?.hidden === false) {
      this._closeInspector();
      return;
    }
    const bar = e.target?.closest?.("[data-pbar]");
    if (!bar || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const st = this._stop(),
      u = this._selUnit();
    if (!st || !u) return;
    const kind = bar.dataset.pbar;
    const b = this._insModel(st, u).bars.find((x) => x.kind === kind);
    const [kmin, kmax] = this._kelvinRange(u.light);
    const step = kind === "white" ? 50 / (kmax - kmin || 1) : 0.02;
    let place = b.place ?? (kind === "white" ? 0.5 : kind === "sat" ? 1 : 0);
    if (e.key === "ArrowLeft") place -= step;
    else if (e.key === "ArrowRight") place += step;
    else place = e.key === "Home" ? 0 : 1;
    e.preventDefault();
    this._change(() => this._applyIns(kind, clamp(place, 0, 1)), `ins${kind}${st._sid}${u.ids[0]}`);
    this._renderInspector();
    this.shadowRoot.querySelector(`[data-pbar="${kind}"]`)?.focus();
  }

  // In the chart the inspector opens beside the selected point; in the table it stands below the table.
  _placeInspector() {
    const r = this.shadowRoot;
    const box = r.getElementById("inspector"),
      lights = r.getElementById("lights"),
      chart = r.getElementById("chartBox");
    if (!box || box.hidden || !lights) return;
    // A device's window is a form and opens in place under the lanes; a light's list opens below its name.
    const win = this._win && !this._sel.lamp;
    if (win && this._win.kind === "device") {
      box.classList.remove("pop");
      box.style.left = box.style.top = "";
      return;
    }
    const key = win ? (this._win.kind === "light" ? `[data-act="win-light"][data-ids="${this._win.ids}"]` : `[data-act="win-dev"][data-entity="${this._win.entity}"]`) : "";
    const dot = win ? [...lights.querySelectorAll(key)].find((el) => el.offsetParent) : chart && !chart.hidden ? chart.querySelector(".c-dot.sel") : null;
    if (!dot || r.querySelector(".shell").clientWidth <= 860) {
      box.classList.remove("pop");
      box.style.left = box.style.top = "";
      return;
    }
    box.classList.add("pop");
    const lr = lights.getBoundingClientRect(),
      dr = dot.getBoundingClientRect();
    const bw = box.offsetWidth,
      bh = box.offsetHeight;
    if (win) {
      box.style.left = `${clamp(this._chartGut, 4, Math.max(4, lr.width - bw - 4))}px`;
      box.style.top = `${dr.bottom - lr.top + 6}px`;
      return;
    }
    let left = dr.right - lr.left + 12;
    if (left + bw > lr.width - 4) left = Math.max(4, dr.left - lr.left - bw - 12);
    const top = clamp(dr.top - lr.top - 20, 0, Math.max(0, lr.height - bh));
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
  }

  _renderButtons() {
    const t = this._t,
      o = this._o.options;
    const power = `<tr class="powerrow"><td><span class="pname">${esc(t("On/off", "Ein/Aus"))}</span></td>
        <td><div class="row"><select class="field" id="onMode" aria-label="${esc(t("Switches on to", "Schaltet ein auf"))}"><option value="last"${o.on_mode === "last" ? " selected" : ""}>${esc(t("Last position", "Letzte Position"))}</option><option value="fixed"${o.on_mode === "fixed" ? " selected" : ""}>${esc(t("Fixed stop", "Feste Stufe"))}</option></select>${o.on_mode === "fixed" ? `<input class="field num" type="number" id="onPos" min="1" max="100" value="${o.on_position}" aria-label="${esc(t("Fixed stop in percent", "Feste Stufe in Prozent"))}">` : ""}</div></td>
        <td><ha-icon icon="mdi:power"></ha-icon></td>
        <td><div class="row"><button class="btn" data-act="test-power">${esc(t("Test", "Testen"))}</button></div></td></tr>`;
    const tpls = this._buttonTemplates();
    const addRow = `<tr class="addline"><td colspan="4"><div class="row"><button class="btn quiet" data-act="add-btn">+ ${esc(t("Add button", "Button hinzufügen"))}</button>${
      tpls.length ? `<span class="opt">${esc(t("or from a template:", "oder aus einer Vorlage:"))}</span>${tpls.map((x) => `<button class="chip" data-act="btn-tpl" data-key="${esc(x.key)}">${esc(x.name)}</button>`).join("")}` : ""
    }</div></td></tr>`;
    this.shadowRoot.getElementById("btnTable").innerHTML = `<thead><tr><th>${esc(t("Name", "Name"))}</th><th>${esc(t("Stop (%)", "Stufe (%)"))}</th><th>${esc(t("Icon", "Symbol"))}</th><th></th></tr></thead><tbody>${power}${
      o.buttons
        .map(
          (b) => `<tr><td><input class="field txt" id="bn-${esc(b.id)}" data-btn="${esc(b.id)}" data-f="name" value="${esc(b.name)}" aria-label="${esc(t("Name", "Name"))}"></td>
        <td><input class="field num" type="number" id="bp-${esc(b.id)}" data-btn="${esc(b.id)}" data-f="position" min="0" max="100" value="${b.position}" aria-label="${esc(t("Stop", "Stufe"))}"></td>
        <td>${
          customElements.get("ha-icon-picker")
            ? `<ha-icon-picker id="bi-${esc(b.id)}" data-btn="${esc(b.id)}" data-f="icon" value="${esc(b.icon || "")}"></ha-icon-picker>`
            : `<input class="field txt" id="bi-${esc(b.id)}" data-btn="${esc(b.id)}" data-f="icon" value="${esc(b.icon || "")}" placeholder="mdi:weather-night" aria-label="${esc(t("Icon", "Symbol"))}">`
        }</td>
        <td><div class="row"><button class="btn" data-act="test-btn" data-id="${esc(b.id)}">${esc(t("Test", "Testen"))}</button><button class="x" data-act="rm-btn" data-id="${esc(b.id)}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div></td></tr>`,
        )
        .join("")
    }${addRow}</tbody>`;
    // Home Assistant's icon picker reports its choice only on itself, without bubbling, so each one gets its own listener.
    this.shadowRoot.querySelectorAll("#btnTable ha-icon-picker").forEach((el) => {
      el.hass = this._hass;
      el.addEventListener("value-changed", (e) => this._onChange(e));
    });
    // Home Assistant loads its icon picker on demand; the table appears again once it is there.
    if (!customElements.get("ha-icon-picker") && !this._waitingForPicker) {
      this._waitingForPicker = true;
      loadIconPicker().then((ready) => ready && this._o && this.shadowRoot.getElementById("btnTable") && this._renderButtons());
    }
  }

  _renderSettings() {
    const r = this.shadowRoot,
      o = this._o.options;
    r.getElementById("rate").value = o.slider_rate;
    r.getElementById("fadeDef").value = o.default_transition;
    const entity = this._o.entity_id || "light.example";
    r.getElementById("yaml").innerHTML = `<span class="c">${esc(this._t("# In 30 minutes to 80 %, for example as a wake-up light", "# In 30 Minuten auf 80 %, zum Beispiel als Aufwachlicht"))}</span>
action: light.turn_on
target:
  entity_id: ${esc(entity)}
data:
  brightness_pct: 80
  transition: 1800`;
  }

  // -- live values ------------------------------------------------------------------------------

  _livePos() {
    if (this._scrubPos !== undefined) return this._scrubPos;
    const a = this._o && this._hass.states[this._o.entity_id]?.attributes;
    if (!a) return 0;
    if (a.fading && a.fade_started && a.fade_ends) {
      const total = (Date.parse(a.fade_ends) - Date.parse(a.fade_started)) / 1000 || 1;
      const done = clamp((Date.now() - Date.parse(a.fade_started)) / 1000 / total, 0, 1);
      return lerp(a.fade_from, a.target_position, total <= EASE_MAX_SECONDS ? ease(done) : done);
    }
    return a.position ?? 0;
  }

  _tickLive() {
    const r = this.shadowRoot;
    if (this._view !== "edit" || !this._o) return;
    const p = this._livePos();
    const out = r.getElementById("editPosOut");
    if (!out) return;
    out.textContent = `${Math.round(p)} %`;
    if (this._scrubPos === undefined) r.getElementById("editPos").value = p;
    const ph = r.getElementById("chartPh");
    if (ph) {
      const x = this._chartX(p);
      ph.setAttribute("x1", x);
      ph.setAttribute("x2", x);
    }
    r.querySelectorAll("[data-devval]").forEach((el) => {
      const id = el.dataset.devval;
      if (this._hass.states[id]) el.textContent = this._stateText({ id, domain: id.split(".")[0] });
    });
  }

  _periodic() {
    if (!this._hass) return;
    if (this._view === "edit") this._tickLive();
    else if (!this._testing) this._refreshDiag();
  }

  // -- diagnostics ------------------------------------------------------------------------------

  _renderDiagView() {
    const t = this._t,
      main = this.shadowRoot.getElementById("main");
    const options = this._objects.map((o, i) => `<option value="${i}"${i === this._i ? " selected" : ""}>${esc(o.title)}</option>`).join("");
    main.innerHTML = `<section class="diag">
      <div class="row"><label class="opt" for="diagObj">${esc(t("Object", "Objekt"))}</label><select class="field" id="diagObj">${options}</select></div>
      <div class="facts">
        <div class="fact"><h3>${esc(t("Reachable", "Erreichbar"))}</h3><b id="dReach">–</b><p>${esc(t("Lights in this object", "Leuchten in diesem Objekt"))}</p></div>
        <div class="fact"><h3>${esc(t("Commands right now", "Befehle gerade"))}</h3><b id="dCmd">0 / s</b><p>${esc(t("On Thread, expect roughly 12 to 16 per second for all lights together.", "Bei Thread sind rund 12 bis 16 pro Sekunde für alle Leuchten zusammen zu erwarten."))}</p></div>
        <div class="fact"><h3>${esc(t("Answers so far", "Antworten bisher"))}</h3><b id="dAns">0</b><p id="dFail"></p></div>
      </div>
      <div class="notice calm"><b>${esc(t("Why Thread is limited", "Warum Thread begrenzt ist"))}</b><span>${esc(t("The Matter server spaces its commands, and a Thread network shares its capacity among all lights. Neither can be changed by an integration. Crescendo therefore sends each light only its newest value.", "Der Matter-Server sendet seine Befehle mit Abstand, und ein Thread-Netz teilt seine Kapazität unter allen Leuchten. Beides kann eine Integration nicht ändern. Crescendo sendet deshalb pro Leuchte immer nur den neuesten Wert."))}</span></div>
      <div class="row space"><p class="note">${esc(t("Checks each light on its own and measures its reaction time.", "Prüft jede Leuchte einzeln und misst ihre Reaktionszeit."))}</p><button class="btn primary" id="testBtn" data-act="test-ask">${esc(t("Test connection", "Verbindung testen"))}</button></div>
      <div class="notice" id="testAsk" hidden><b>${esc(t("Really test the lights?", "Leuchten wirklich testen?"))}</b><span id="testAskText"></span><div class="row"><button class="btn primary" data-act="test-run">${esc(t("Start test", "Test starten"))}</button><button class="btn" data-act="test-cancel">${esc(t("Cancel", "Abbrechen"))}</button></div></div>
      <div class="wrapx dtable"><table class="tbl" id="diagTable"></table></div>
      <p class="hint">${esc(t("The values come from normal operation since the last start of Home Assistant and from the connection test.", "Die Werte stammen aus dem normalen Betrieb seit dem letzten Start von Home Assistant und aus dem Verbindungstest."))}</p>
    </section>`;
    this._refreshDiag();
  }

  async _refreshDiag() {
    const o = this._o;
    if (!o?.entity_id || !this.shadowRoot.getElementById("diagTable")) return;
    let data;
    try {
      data = await this._hass.callWS({ type: "cloudless_crescendo/diagnostics", entity_id: o.entity_id });
    } catch {
      return;
    }
    const t = this._t,
      r = this.shadowRoot,
      table = r.getElementById("diagTable");
    if (!table) return;
    const rows = data.lights
      .map((l) => {
        const unreachable = !l.state || l.state === "unavailable" || l.state === "unknown";
        const trouble = unreachable || l.failures > 0 || l.repeats > 0 || !l.following;
        let note = "";
        if (unreachable) note = t("Not reachable", "Nicht erreichbar");
        else if (!l.following) note = t("Set by hand, back at the next command", "Von Hand gesetzt, beim nächsten Befehl wieder dabei");
        else if (l.last_error) note = l.last_error;
        else if (l.repeats) note = t("A command had to be repeated", "Ein Befehl musste wiederholt werden");
        const test = this._test[l.entity_id];
        const testText = test === undefined ? t("not yet", "noch nicht") : test === "run" ? t("running", "läuft") : test.ok ? `${test.ms} ms` : test.error || t("failed", "fehlgeschlagen");
        return `<tr><td>${esc(friendly(this._hass, l.entity_id))}</td><td>${esc(l.network)}</td><td class="num-cell">${l.average_ms !== null ? `${l.average_ms} ms` : "–"}</td><td class="num-cell">${l.failures}</td><td class="num-cell">${l.repeats}</td>
          <td><span class="pill ${trouble ? "warn" : "ok"}">${esc(trouble ? t("Check", "Prüfen") : t("OK", "In Ordnung"))}</span>${note ? `<div class="note">${esc(note)}</div>` : ""}</td><td class="num-cell">${esc(testText)}</td></tr>`;
      })
      .join("");
    table.innerHTML = `<thead><tr><th>${esc(t("Light", "Leuchte"))}</th><th>${esc(t("Network", "Netz"))}</th><th>${esc(t("Reaction time", "Reaktionszeit"))}</th><th>${esc(t("Failures", "Fehler"))}</th><th>${esc(t("Repeats", "Wiederholt"))}</th><th>${esc(t("Status", "Zustand"))}</th><th>${esc(t("Last test", "Letzter Test"))}</th></tr></thead><tbody>${rows}</tbody>`;
    const reach = data.lights.filter((l) => l.state && l.state !== "unavailable" && l.state !== "unknown").length;
    r.getElementById("dReach").textContent = `${reach} / ${data.lights.length}`;
    r.getElementById("dCmd").textContent = `${Math.max(0, ...data.lights.map((l) => l.rate))} / s`;
    r.getElementById("dAns").textContent = String(data.lights.reduce((n, l) => n + l.answers, 0));
    const fails = data.lights.reduce((n, l) => n + l.failures, 0);
    r.getElementById("dFail").textContent = t(`${fails} failed`, `${fails} fehlgeschlagen`);
  }

  async _runTest() {
    const o = this._o,
      r = this.shadowRoot;
    r.getElementById("testAsk").hidden = true;
    r.getElementById("testBtn").disabled = true;
    this._testing = true;
    this._test = Object.fromEntries(o.options.lights.map((l) => [l.entity_id, "run"]));
    await this._refreshDiag();
    try {
      const results = await this._hass.callWS({ type: "cloudless_crescendo/test_connection", entity_id: o.entity_id });
      this._test = Object.fromEntries(results.map((x) => [x.entity_id, x]));
      const ok = results.filter((x) => x.ok).length;
      this._toast(this._t(`Test finished: ${ok} of ${results.length} lights answer`, `Test fertig: ${ok} von ${results.length} Leuchten antworten`));
    } catch (err) {
      this._test = {};
      this._toast(String(err.message || err));
    }
    this._testing = false;
    const btn = r.getElementById("testBtn");
    if (btn) btn.disabled = false;
    this._refreshDiag();
  }

  // -- changes ----------------------------------------------------------------------------------

  _change(fn, key) {
    if (!key || key !== this._lastKey) {
      this._undo.push(JSON.stringify({ title: this._o.title, options: this._o.options }));
      if (this._undo.length > 60) this._undo.shift();
    }
    this._lastKey = key || null;
    fn();
    this.shadowRoot.getElementById("undoBtn").disabled = false;
    this._renderStops();
    this._save();
    this._previewDraft();
  }

  _save() {
    clearTimeout(this._saveTimer);
    const o = this._o;
    this._saveTimer = setTimeout(async () => {
      try {
        const res = await this._hass.callWS({
          type: "cloudless_crescendo/object/save",
          entry_id: o.entry_id,
          title: o.title || "Crescendo",
          options: stripIds(o.options),
        });
        for (const d of res.options.devices) {
          const local = o.options.devices.find((x) => x.entity_id === d.entity_id && x.kind === d.kind && !x.id);
          if (local) local.id = d.id;
        }
      } catch (err) {
        this._toast(String(err.message || err));
      }
    }, 400);
  }

  _previewDraft() {
    if (!this._preview || !this._o?.options.lights.length) return;
    const now = Date.now();
    clearTimeout(this._previewTimer);
    const send = () => {
      this._previewLast = Date.now();
      this._hass
        .callWS({ type: "cloudless_crescendo/preview", entry_id: this._o.entry_id, options: stripIds(this._o.options), position: this._livePos() })
        .catch(() => {});
    };
    if (now - (this._previewLast || 0) > 300) send();
    else this._previewTimer = setTimeout(send, 300);
  }

  _toast(msg) {
    const el = this.shadowRoot.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (el.hidden = true), 3000);
  }

  _sendPosition(p, final) {
    if (!this._preview || !this._o?.entity_id) return;
    this._hass.callWS({ type: "cloudless_crescendo/position", entity_id: this._o.entity_id, position: Math.round(p * 100) / 100, final }).catch(() => {});
  }

  _jumpTo(position) {
    this._scrubPos = position;
    this._sendPosition(position, true);
    clearTimeout(this._scrubTimer);
    this._scrubTimer = setTimeout(() => {
      this._scrubPos = undefined;
    }, 1800);
    this._tickLive();
  }

  _freePosition() {
    const o = this._o.options,
      wanted = Math.round(this._livePos());
    if (wanted > 0 && wanted < 100 && !o.stops.some((s) => s.position === wanted)) return wanted;
    let best = 0,
      at = 50;
    for (let i = 0; i < o.stops.length - 1; i++) {
      const gap = o.stops[i + 1].position - o.stops[i].position;
      if (gap > best) {
        best = gap;
        at = Math.round(o.stops[i].position + gap / 2);
      }
    }
    return best > 1 ? at : null;
  }

  _valuesAt(position) {
    const o = this._o.options;
    let i = 0;
    while (i < o.stops.length - 2 && position > o.stops[i + 1].position) i++;
    const a = o.stops[i],
      b = o.stops[i + 1],
      tt = (position - a.position) / (b.position - a.position);
    return Object.fromEntries(o.lights.map((l) => [l.entity_id, interpVal(a.values[l.entity_id] || { brightness: 0 }, b.values[l.entity_id] || { brightness: 0 }, tt)]));
  }

  _selectPoint(stop, lamp, fromWin = false) {
    if (!fromWin) this._win = null;
    this._sel = { stop, lamp };
    this._lastKey = null;
    this._renderTools();
    this._renderStops();
    this._renderInspector();
    const st = this._stop();
    if (st) this._jumpTo(st.position);
    if (this.shadowRoot.querySelector(".shell").clientWidth <= 860) this.shadowRoot.getElementById("inspector")?.scrollIntoView({ block: "nearest" });
  }

  _addDevice(kind, entityId) {
    const d = this._newDevice(kind, entityId);
    this._change(() => this._o.options.devices.push(d));
  }

  _newDevice(kind, entityId) {
    const domain = entityId.split(".")[0],
      a = this._hass.states[entityId]?.attributes || {};
    const d = { id: newId(), entity_id: entityId, kind };
    if (kind === "ramp") {
      d.from = 20;
      d.to = 100;
      d.direction = "both";
      if (domain === "media_player") Object.assign(d, { min: 0, max: 40 });
      else if (domain === "climate") {
        const now = +a.temperature || 20;
        Object.assign(d, { from: 40, min: now - 1, max: now + 2 });
      } else if (domain === "number" || domain === "input_number") Object.assign(d, { min: +a.min || 0, max: +a.max || 100 });
      else Object.assign(d, { min: 0, max: 100 });
    } else {
      const actions = DEVICE_ACTIONS[domain] || ["turn_on", "turn_off"];
      Object.assign(d, { at: 50, action: actions[0], back: this._opposite(entityId, actions[0]) });
    }
    return d;
  }

  async _onClick(e) {
    const a = e.target.closest?.("[data-act]");
    if (!a) return;
    const act = a.dataset.act,
      t = this._t,
      hass = this._hass,
      o = this._o?.options;
    switch (act) {
      case "menu":
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
        break;
      case "tab":
        this._view = a.dataset.v;
        this._render();
        break;
      case "sidebar-ask":
      case "sidebar-no":
        this._sidebarAsk = act === "sidebar-ask";
        this._renderSidebarOption();
        break;
      case "sidebar-yes":
      case "sidebar-add": {
        const show = act === "sidebar-add";
        this._sidebarAsk = false;
        try {
          await hass.callWS({ type: "cloudless_crescendo/sidebar/set", show });
          this._sidebarShown = show;
          this._toast(show ? t("Crescendo is back in the sidebar.", "Crescendo steht wieder in der Seitenleiste.") : t("Crescendo is out of the sidebar.", "Crescendo ist aus der Seitenleiste genommen."));
        } catch (err) {
          this._toast(String(err?.message || err));
        }
        this._renderSidebarOption();
        break;
      }
      case "new-obj": {
        const name = this.shadowRoot.getElementById("newObjName").value.trim();
        if (!name) {
          this._toast(t("Give the object a name first.", "Gib dem Objekt zuerst einen Namen."));
          return;
        }
        const res = await hass.callWS({ type: "cloudless_crescendo/object/create", title: name, lights: [] });
        this._newing = false;
        await this._load(res.entry_id);
        break;
      }
      case "new-cancel":
        this._newing = false;
        this._renderObjects();
        break;
      case "jump": {
        e.preventDefault();
        this.shadowRoot.getElementById(a.dataset.to)?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "close-ins":
        this._closeInspector();
        break;
      case "delete-ask":
        this._confirmDelete = true;
        this._renderDelete();
        break;
      case "delete-no":
        this._confirmDelete = false;
        this._renderDelete();
        break;
      case "delete-yes":
        clearTimeout(this._saveTimer);
        await hass.callWS({ type: "cloudless_crescendo/object/delete", entry_id: this._o.entry_id });
        this._confirmDelete = false;
        this._i = 0;
        await this._load();
        break;
      case "undo": {
        const before = this._undo.pop();
        if (!before) return;
        const parsed = JSON.parse(before);
        this._o.title = parsed.title;
        this._o.options = parsed.options;
        this._lastKey = null;
        this._renderEdit();
        this._save();
        this._previewDraft();
        break;
      }
      case "view-chart":
        this._edView = "chart";
        this._renderStops();
        break;
      case "view-table":
        this._edView = "table";
        this._renderStops();
        break;
      case "run-up":
      case "run-down": {
        const to = act === "run-up" ? 100 : 0;
        const duration = +this.shadowRoot.getElementById("runDur").value;
        if (act === "run-up" && this._livePos() >= 99.5) await hass.callWS({ type: "cloudless_crescendo/position", entity_id: this._o.entity_id, position: 0, final: true });
        if (act === "run-down" && this._livePos() <= 0.5) await hass.callWS({ type: "cloudless_crescendo/position", entity_id: this._o.entity_id, position: 100, final: true });
        hass.callService("cloudless_crescendo", "fade_to", { position: to, duration: { seconds: duration } }, { entity_id: this._o.entity_id });
        break;
      }
      case "sel-stop":
        this._sel = { stop: a.dataset.stop, lamp: this._sel.lamp };
        this._lastKey = null;
        this._renderTools();
        this._renderStops();
        this._renderInspector();
        this._jumpTo(this._stop().position);
        break;
      case "sel-cell":
        this._selectPoint(a.dataset.stop, a.dataset.lamp);
        break;
      case "add-stop": {
        const pos = this._freePosition();
        if (pos === null) {
          this._toast(t("There is no free place between the stops.", "Zwischen den Stufen ist kein Platz mehr frei."));
          return;
        }
        this._change(() => {
          const st = { _sid: `s${sidCounter++}`, position: pos, values: this._valuesAt(pos) };
          o.stops.push(st);
          o.stops.sort((x, y) => x.position - y.position);
          this._sel = { stop: st._sid, lamp: this._sel.lamp };
        });
        this._renderTools();
        this._renderInspector();
        break;
      }
      case "dup-stop": {
        const st = this._stop();
        const next = o.stops[o.stops.indexOf(st) + 1];
        const pos = Math.round((st.position + next.position) / 2);
        if (pos === st.position || pos === next.position) {
          this._toast(t("There is no room for a copy right behind it.", "Direkt dahinter ist kein Platz für eine Kopie."));
          return;
        }
        this._change(() => {
          const copy = { _sid: `s${sidCounter++}`, position: pos, values: clone(st.values) };
          o.stops.push(copy);
          o.stops.sort((x, y) => x.position - y.position);
          this._sel = { stop: copy._sid, lamp: this._sel.lamp };
        });
        this._renderTools();
        this._renderInspector();
        break;
      }
      case "take-state": {
        const st = this._stop();
        this._change(() => {
          for (const l of o.lights) {
            const s = hass.states[l.entity_id];
            if (!s || s.state !== "on") {
              st.values[l.entity_id] = { ...st.values[l.entity_id], brightness: 0 };
              continue;
            }
            const brightness = Math.round((s.attributes.brightness ?? 255) / 2.55);
            if (s.attributes.color_mode === "color_temp" && s.attributes.color_temp_kelvin) st.values[l.entity_id] = { brightness, kelvin: s.attributes.color_temp_kelvin };
            else if (s.attributes.rgb_color && l.mode !== "cct" && l.mode !== "dim") st.values[l.entity_id] = { brightness, color: s.attributes.rgb_color };
            else st.values[l.entity_id] = { ...st.values[l.entity_id], brightness };
          }
        });
        this._renderInspector();
        this._toast(t(`Stop ${st.position} now shows the current state`, `Stufe ${st.position} zeigt jetzt den Ist-Zustand`));
        break;
      }
      case "del-stop": {
        const st = this._stop();
        this._change(() => {
          o.stops = o.stops.filter((x) => x !== st);
          this._o.options.stops = o.stops;
          this._sel = { stop: null, lamp: null };
        });
        this._renderTools();
        this._renderInspector();
        break;
      }
      case "rm-lamp": {
        const ids = a.dataset.ids.split(",");
        this._change(() => {
          o.lights = o.lights.filter((l) => !ids.includes(l.entity_id));
          for (const s of o.stops) for (const id of ids) delete s.values[id];
          o.groups = (o.groups || []).map((g) => ({ ...g, lights: g.lights.filter((id) => !ids.includes(id)) })).filter((g) => g.lights.length >= 2);
          if (ids.includes(this._sel.lamp)) this._sel.lamp = null;
        });
        this._renderInspector();
        break;
      }
      case "rm-dev":
        this._change(() => {
          o.devices = o.devices.filter((d) => d.id !== a.dataset.id);
        });
        this._renderInspector();
        break;
      case "rm-devall":
        this._change(() => {
          o.devices = o.devices.filter((d) => d.entity_id !== a.dataset.entity);
        });
        if (this._win?.entity === a.dataset.entity) this._win = null;
        this._renderInspector();
        break;
      case "add-dev":
        this._addDevice(a.dataset.kind, a.dataset.id);
        this._win = { kind: "device", entity: a.dataset.id };
        this._sel = { stop: this._sel.stop, lamp: null };
        this._renderInspector();
        this._toast(t(`${friendly(hass, a.dataset.id)} added. Its points stand under Stops.`, `${friendly(hass, a.dataset.id)} hinzugefügt. Seine Punkte stehen unter „Stufen“.`));
        break;
      case "add-pt": {
        const d = this._newDevice(a.dataset.kind, a.dataset.entity);
        this._change(() => o.devices.push(d));
        this._renderInspector();
        break;
      }
      case "win-dev":
      case "win-light":
        this._win = act === "win-dev" ? { kind: "device", entity: a.dataset.entity } : { kind: "light", ids: a.dataset.ids };
        this._sel = { stop: this._sel.stop, lamp: null };
        this._renderStops();
        this._renderInspector();
        if (a.dataset.jump) this.shadowRoot.getElementById("devRows")?.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      case "win-point":
        this._selectPoint(a.dataset.stop, a.dataset.lamp, true);
        break;
      case "win-back":
        this._sel = { stop: this._sel.stop, lamp: null };
        this._renderStops();
        this._renderInspector();
        break;
      case "dev-kind":
        this._devKind = a.dataset.domain;
        this._renderPicker();
        break;
      case "more": {
        const key = a.dataset.key;
        if (this._openMore.has(key)) this._openMore.delete(key);
        else this._openMore.add(key);
        this._renderRows();
        break;
      }
      case "info": {
        const id = a.dataset.infoFor;
        const open = !this._infos.has(id);
        if (open) this._infos.add(id);
        else this._infos.delete(id);
        this.shadowRoot.querySelectorAll("[data-info]").forEach((el) => el.dataset.info === id && (el.hidden = !open));
        this.shadowRoot.querySelectorAll("[data-info-for]").forEach((el) => el.dataset.infoFor === id && el.setAttribute("aria-expanded", String(open)));
        break;
      }
      case "add-open":
        this._addOpen = true;
        this._renderRows();
        this._renderPicker();
        this.shadowRoot.getElementById("devSearch")?.focus();
        break;
      case "add-close":
        this._addOpen = false;
        this._renderRows();
        this._renderPicker();
        break;
      case "btn-tpl": {
        const list = this._buttonTemplate(a.dataset.key);
        if (!list) return;
        const had = o.buttons.length;
        this._change(() => (o.buttons = list));
        this._renderButtons();
        this._toast(had ? t("Buttons replaced by the template. Undo brings back the old ones.", "Buttons durch die Vorlage ersetzt. „Rückgängig“ holt die alten zurück.") : t("Buttons taken from the template.", "Buttons aus der Vorlage übernommen."));
        break;
      }
      case "group-suggest": {
        const h = this._suggest?.[+a.dataset.i];
        if (!h) return;
        // Its More opens, so the display name can be changed right away.
        this._openMore.add(o.lights.map((l) => l.entity_id).filter((id) => h.ids.includes(id)).join(","));
        this._makeGroup(h.ids, h.name, h.ids[0]);
        this._renderInspector();
        break;
      }
      case "group-dismiss": {
        const h = this._suggest?.[+a.dataset.i];
        if (!h) return;
        this._dismiss([...h.ids].sort().join(","));
        this._renderGroupBar();
        break;
      }
      case "ungroup":
        this._change(() => {
          o.groups = o.groups.filter((g) => g.id !== a.dataset.gid);
        });
        this._renderInspector();
        break;
      case "group-out":
        this._change(() => {
          const g = o.groups.find((x) => x.id === a.dataset.gid);
          if (!g) return;
          g.lights = g.lights.filter((id) => id !== a.dataset.id);
          if (g.lights.length < 2) o.groups = o.groups.filter((x) => x !== g);
        });
        this._renderInspector();
        break;
      case "tpl-toggle":
        this._tplOpen = !this._tplOpen;
        this._renderTools();
        this._renderTemplates();
        break;
      case "tpl-apply": {
        const tpl = this._template(a.dataset.key);
        if (!tpl) return;
        const withButtons = !!tpl.buttons && !o.buttons.length;
        this._change(() => {
          o.stops = tpl.stops.map((s) => ({ ...s, _sid: `s${sidCounter++}` }));
          if (withButtons) o.buttons = tpl.buttons;
        });
        this._sel = { stop: null, lamp: null };
        this._tplOpen = false;
        this._renderEdit();
        this._toast(withButtons ? t("Template applied, with its buttons. Undo brings back the old stops.", "Vorlage übernommen, mit ihren Buttons. „Rückgängig“ holt die alten Stufen zurück.") : t("Template applied. Undo brings back the old stops.", "Vorlage übernommen. „Rückgängig“ holt die alten Stufen zurück."));
        break;
      }
      case "export":
        this._export();
        break;
      case "import":
        this.shadowRoot.getElementById("importFile").click();
        break;
      case "import-cancel":
        this._import = null;
        this._renderImport();
        break;
      case "import-replace": {
        const clean = this._cleanImport(this._import.options);
        this._import = null;
        this._change(() => {
          this._o.options = withIds(clean);
        });
        this._sel = { stop: null, lamp: null };
        this._renderEdit();
        this._toast(t("Imported. Undo brings back the old settings.", "Importiert. „Rückgängig“ holt die alten Einstellungen zurück."));
        break;
      }
      case "import-new": {
        const imp = this._import;
        const clean = this._cleanImport(imp.options);
        const base = imp.title.trim() || "Crescendo";
        const taken = new Set(this._objects.map((x) => x.title));
        let title = base;
        for (let n = 2; taken.has(title); n++) title = `${base} ${n}`;
        try {
          const res = await hass.callWS({ type: "cloudless_crescendo/object/create", title, lights: [] });
          await hass.callWS({ type: "cloudless_crescendo/object/save", entry_id: res.entry_id, title, options: clean });
          this._import = null;
          await this._load(res.entry_id);
          this._toast(t(`“${title}” created.`, `„${title}“ angelegt.`));
        } catch (err) {
          this._toast(t(`Import failed: ${err?.message || err}`, `Import fehlgeschlagen: ${err?.message || err}`));
        }
        break;
      }
      case "test-power":
        hass.callService("light", "toggle", {}, { entity_id: this._o.entity_id });
        break;
      case "add-light": {
        const x = a.dataset.id;
        if (o.lights.some((l) => l.entity_id === x)) return;
        const modes = this._modesFor(x);
        const mode = modes.includes("cct") ? "cct" : modes[modes.length - 1];
        this._change(() => {
          o.lights.push({ entity_id: x, mode, fade: "soft", steps: 4, slider: "auto" });
          for (const s of o.stops) s.values[x] = { brightness: 0 };
          const top = o.stops[o.stops.length - 1];
          top.values[x] = mode === "cct" || mode === "rgbcct" ? { brightness: 100, kelvin: 3000 } : { brightness: 100 };
        });
        this._toast(t(`${friendly(hass, x)} added.`, `${friendly(hass, x)} hinzugefügt.`));
        break;
      }
      case "copy-all": {
        const st = this._stop(),
          src = st.values[this._sel.lamp];
        this._change(() => {
          for (const l of o.lights) st.values[l.entity_id] = clone(src);
        });
        break;
      }
      case "add-btn":
        this._change(() => o.buttons.push({ id: newId(), name: t("New", "Neu"), position: Math.max(1, Math.round(this._livePos())), duration: 5 }));
        this._renderButtons();
        break;
      case "rm-btn":
        this._change(() => {
          o.buttons = o.buttons.filter((b) => b.id !== a.dataset.id);
        });
        this._renderButtons();
        break;
      case "test-btn": {
        const b = o.buttons.find((x) => x.id === a.dataset.id);
        hass.callService("cloudless_crescendo", "press_button", { button: b.id }, { entity_id: this._o.entity_id });
        break;
      }
      case "test-ask":
        this.shadowRoot.getElementById("testAskText").textContent = t(
          `All ${o.lights.length} lights of “${this._o.title}” switch one after another for a few seconds and may flicker. Afterwards Crescendo restores their previous state.`,
          `Alle ${o.lights.length} Leuchten in „${this._o.title}“ schalten nacheinander für einige Sekunden und können flackern. Danach stellt Crescendo ihren vorherigen Zustand wieder her.`,
        );
        this.shadowRoot.getElementById("testAsk").hidden = false;
        break;
      case "test-cancel":
        this.shadowRoot.getElementById("testAsk").hidden = true;
        break;
      case "test-run":
        this._runTest();
        break;
    }
  }

  _onInput(e) {
    const t = e.target,
      o = this._o?.options;
    if (t.id === "objName") {
      this._o.title = t.value;
      this._renderObjects();
      this._save();
    } else if (t.id === "devSearch") {
      this._devQuery = t.value;
      this._renderPicker();
    } else if (t.id === "editPos") {
      this._scrubPos = +t.value;
      this.shadowRoot.getElementById("editPosOut").textContent = `${t.value} %`;
      const now = performance.now();
      if (now - (this._scrubLast || 0) >= 1000 / (o?.slider_rate || 4)) {
        this._scrubLast = now;
        this._sendPosition(+t.value, false);
      }
    }
  }

  _onChange(e) {
    const t = e.target,
      o = this._o?.options;
    if (t.id === "editPos") {
      this._sendPosition(+t.value, true);
      setTimeout(() => {
        this._scrubPos = undefined;
      }, 1500);
    } else if (t.id === "preview") this._preview = t.checked;
    else if (t.id === "objPick") {
      if (t.value === "new") {
        this._newing = true;
        this._renderObjects();
        this.shadowRoot.getElementById("newObjName")?.focus();
      } else {
        this._newing = false;
        this._pickObject(+t.value);
        this._renderObjects();
      }
    } else if (t.id === "roomSel") {
      this._room = t.value;
      this._renderPicker();
    } else if (t.id === "importFile") {
      const file = t.files?.[0];
      t.value = "";
      if (file) file.text().then((text) => this._readImport(text, file.name));
    } else if (t.dataset.groupwith) {
      // The light joins the chosen light or group and takes its settings; the new group's More opens.
      if (!t.value) return;
      const mine = t.dataset.groupwith.split(","),
        theirs = t.value.split(",");
      const target = this._units().find((u) => u.ids.join(",") === t.value);
      const all = [...theirs, ...mine];
      const name = target?.group ? target.group.name : this._groupName(all);
      this._openMore.delete(t.dataset.groupwith);
      this._openMore.add(o.lights.map((l) => l.entity_id).filter((id) => all.includes(id)).join(","));
      this._makeGroup(all, name, theirs[0]);
      this._renderInspector();
    } else if (t.dataset.gname) {
      const g = o.groups.find((x) => x.id === t.dataset.gname);
      if (g) this._change(() => (g.name = t.value.trim()));
    } else if (t.id === "diagObj") {
      this._i = +t.value;
      this._test = {};
      this._renderDiagView();
    } else if (t.id === "insOn") {
      const st = this._stop(),
        u = this._selUnit();
      this._change(() => u.ids.forEach((id) => (st.values[id] = { ...st.values[id], brightness: t.checked ? 100 : 0 })));
    } else if (t.id === "stopPos") {
      const st = this._stop(),
        pos = Math.round(+t.value);
      if (!(pos >= 1 && pos <= 99) || o.stops.some((s) => s !== st && s.position === pos)) {
        this._toast(this._t(`Stop ${t.value} is not possible. Choose a free value between 1 and 99.`, `Stufe ${t.value} geht nicht. Wähle einen freien Wert zwischen 1 und 99.`));
        t.value = st.position;
        return;
      }
      this._change(() => {
        st.position = pos;
        o.stops.sort((a, b) => a.position - b.position);
      });
      this._renderInspector();
    } else if (t.dataset.mode) {
      const ids = t.dataset.mode.split(",");
      this._change(() => o.lights.forEach((l) => ids.includes(l.entity_id) && (l.mode = t.value)));
      this._renderInspector();
    } else if (t.dataset.fade) {
      const ids = t.dataset.fade.split(",");
      this._change(() => o.lights.forEach((l) => ids.includes(l.entity_id) && (l.fade = t.value)));
    } else if (t.dataset.steps) {
      const ids = t.dataset.steps.split(",");
      this._change(() => o.lights.forEach((l) => ids.includes(l.entity_id) && (l.steps = clamp(Math.round(+t.value) || 4, 1, 8))));
    } else if (t.dataset.sliderMode) {
      const ids = t.dataset.sliderMode.split(",");
      this._change(() => o.lights.forEach((l) => ids.includes(l.entity_id) && (l.slider = t.value)));
    } else if (t.dataset.btn) {
      const b = o.buttons.find((x) => x.id === t.dataset.btn),
        f = t.dataset.f;
      this._change(() => {
        if (f === "name") b.name = t.value.trim() || "Button";
        else if (f === "position") b.position = clamp(Math.round(+t.value) || 0, 0, 100);
        else if (f === "icon") {
          const icon = String(e.detail?.value ?? t.value ?? "").trim();
          if (icon) b.icon = icon;
          else delete b.icon;
        }
      });
      if (f !== "icon") this._renderButtons();
    } else if (t.dataset.dev) {
      const d = o.devices.find((x) => x.id === t.dataset.dev),
        f = t.dataset.f;
      this._change(() => {
        if (f === "action") {
          // A "back" that was the opposite of the old action follows the new one.
          const follows = (d.back || null) === this._opposite(d.entity_id, d.action);
          d.action = t.value || null;
          if (follows && d.action) d.back = this._opposite(d.entity_id, d.action);
        } else if (f === "back") d.back = t.value || null;
        else if (f === "direction") d.direction = t.value;
        else if (f === "media_content_id" || f === "media_content_type") d.data = { media_content_type: "music", ...d.data, [f]: t.value };
        else if (f === "min" || f === "max") d[f] = +t.value || 0;
        else d[f] = clamp(+t.value || 0, 0, 100);
        if (d.kind === "ramp" && d.from > d.to) [d.from, d.to] = [d.to, d.from];
      });
      this._renderInspector();
    } else if (t.id === "rate") {
      this._change(() => (o.slider_rate = clamp(Math.round(+t.value) || 4, 1, 10)));
      t.value = o.slider_rate;
    } else if (t.id === "onMode") {
      this._change(() => (o.on_mode = t.value));
      this._renderButtons();
    } else if (t.id === "onPos") {
      this._change(() => (o.on_position = clamp(Math.round(+t.value) || 40, 1, 100)));
      t.value = o.on_position;
    } else if (t.id === "fadeDef") {
      this._change(() => (o.default_transition = clamp(+t.value || 0, 0, 3600)));
      t.value = o.default_transition;
    }
  }

  // -- dragging in the chart and on device lanes --------------------------------------------------

  _pointIn(e) {
    const r = this.shadowRoot.getElementById("chartBox").getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _xToPos(x) {
    return clamp(((x - this._chartGut) / (this._chartW - this._chartGut - PR)) * 100, 0, 100);
  }

  _yToVal(y) {
    return clamp((1 - (y - PT) / (CHART_H - PT - PB)) * 100, 0, 100);
  }

  _onDown(e) {
    // A press outside a point's settings puts them away, unless it chooses another point or a tool of the stop.
    const ins = this.shadowRoot.getElementById("inspector");
    if (ins && !ins.hidden && !e.composedPath().includes(ins) && !e.target.closest?.('[data-pthit], .cell, #stopTools, [data-act^="win-"], [data-devlane]')) this._closeInspector();
    const pbar = e.target.closest?.("[data-pbar]");
    if (pbar) {
      e.preventDefault();
      this._undo.push(JSON.stringify({ title: this._o.title, options: this._o.options }));
      this.shadowRoot.getElementById("undoBtn").disabled = false;
      this._lastKey = null;
      this._insDrag = { kind: pbar.dataset.pbar, r: pbar.getBoundingClientRect() };
      pbar.setPointerCapture(e.pointerId);
      this._moveIns(e);
      return;
    }
    const lane = e.target.closest?.("[data-devlane]");
    if (lane) {
      const points = this._o.options.devices.filter((x) => x.entity_id === lane.dataset.devlane);
      if (!points.length) return;
      e.preventDefault();
      const r = lane.getBoundingClientRect();
      const p = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      this._undo.push(JSON.stringify({ title: this._o.title, options: this._o.options }));
      this.shadowRoot.getElementById("undoBtn").disabled = false;
      this._lastKey = null;
      let best = null;
      for (const x of points)
        for (const end of x.kind === "ramp" ? ["from", "to"] : ["at"]) {
          const gap = Math.abs(p - x[end]);
          if (!best || gap < best.gap) best = { d: x, end, gap };
        }
      this._devDrag = { d: best.d, r, end: best.end };
      lane.setPointerCapture(e.pointerId);
      this._moveDev(e);
      return;
    }
    const box = e.target.closest?.("#chartBox");
    if (!box) return;
    const t = e.target,
      ds = t.dataset || {};
    if (ds.pthit) this._chartDrag = { type: "pt", stop: ds.pthit, lamp: ds.lamp, y: e.clientY, moved: false };
    else if (ds.stophit) this._chartDrag = { type: "stop", stop: ds.stophit, x: e.clientX, moved: false };
    else if (this._pointIn(e).x >= this._chartGut) {
      this._chartDrag = { type: "scrub", moved: true };
      this._scrubPos = this._xToPos(this._pointIn(e).x);
      this._sendPosition(this._scrubPos, false);
      this._tickLive();
    } else return;
    box.setPointerCapture(e.pointerId);
  }

  _onMove(e) {
    if (this._insDrag) {
      this._moveIns(e);
      return;
    }
    if (this._devDrag) {
      this._moveDev(e);
      return;
    }
    const inChart = e.target.closest?.("#chartBox");
    const d = this._chartDrag;
    if (!d) {
      if (inChart) this._showTip(this._pointIn(e));
      return;
    }
    this._hideTip();
    const p = this._pointIn(e),
      o = this._o.options;
    if (d.type === "scrub") {
      this._scrubPos = this._xToPos(p.x);
      const now = performance.now();
      if (now - (this._scrubLast || 0) >= 1000 / (o.slider_rate || 4)) {
        this._scrubLast = now;
        this._sendPosition(this._scrubPos, false);
      }
      this._tickLive();
    } else if (d.type === "pt") {
      if (!d.moved && Math.abs(e.clientY - d.y) < 3) return;
      d.moved = true;
      const st = o.stops.find((s) => s._sid === d.stop);
      const u = this._units().find((x) => x.ids.includes(d.lamp));
      if (!st || !u) return;
      d.ids = d.ids || u.ids;
      const v = Math.round(this._yToVal(p.y));
      this._sel = { stop: st._sid, lamp: d.lamp };
      this._change(() => d.ids.forEach((id) => (st.values[id] = { ...st.values[id], brightness: v })), `pt${st._sid}${d.lamp}`);
      this._renderInspector();
    } else if (d.type === "stop") {
      if (!d.moved && Math.abs(e.clientX - d.x) < 3) return;
      d.moved = true;
      const st = o.stops.find((s) => s._sid === d.stop);
      if (!st || st.position === 0 || st.position === 100) return;
      const i = o.stops.indexOf(st);
      const pos = Math.round(clamp(this._xToPos(p.x), o.stops[i - 1].position + 1, o.stops[i + 1].position - 1));
      if (pos === st.position) return;
      this._sel = { stop: st._sid, lamp: this._sel.lamp };
      this._change(() => (st.position = pos), `sp${st._sid}`);
      this._renderTools();
    }
  }

  _moveDev(e) {
    const { d, r, end } = this._devDrag;
    let p = Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100));
    if (end === "from") p = Math.min(p, d.to - 1);
    if (end === "to") p = Math.max(p, d.from + 1);
    d[end] = p;
    const q = (id) => this.shadowRoot.getElementById(id);
    if (d.kind === "ramp") {
      const el = q(`dvr-${d.id}`);
      if (el) {
        el.style.left = `${d.from}%`;
        el.style.width = `${d.to - d.from}%`;
      }
    } else {
      if (q(`dvm-${d.id}`)) q(`dvm-${d.id}`).style.left = `${p}%`;
    }
    const inp = q(`d${end}-${d.id}`);
    if (inp) inp.value = p;
  }

  _onUp() {
    if (this._insDrag) {
      this._insDrag = null;
      this._renderInspector();
      this._save();
      return;
    }
    if (this._devDrag) {
      this._devDrag = null;
      this._save();
      this._renderStops();
      this._renderInspector();
      return;
    }
    const d = this._chartDrag;
    this._chartDrag = null;
    if (!d) return;
    if (d.type === "scrub") {
      this._sendPosition(this._scrubPos, true);
      setTimeout(() => {
        this._scrubPos = undefined;
      }, 1500);
    } else if (d.type === "pt" && !d.moved) this._selectPoint(d.stop, d.lamp);
    else if (d.type === "pt") {
      this._renderTools();
      this._renderInspector();
    } else if (d.type === "stop" && !d.moved) {
      this._sel = { stop: d.stop, lamp: this._sel.lamp };
      this._renderTools();
      this._renderStops();
      this._renderInspector();
      if (this._stop()) this._jumpTo(this._stop().position);
    }
  }

  _hideTip() {
    const r = this.shadowRoot;
    const tip = r.getElementById("chartTip"),
      c = r.getElementById("chartCross");
    if (tip) tip.hidden = true;
    if (c) c.setAttribute("visibility", "hidden");
  }

  _showTip(p) {
    const r = this.shadowRoot;
    const tip = r.getElementById("chartTip"),
      c = r.getElementById("chartCross");
    if (!tip || !c || p.x < this._chartGut || p.x > this._chartW - PR) {
      this._hideTip();
      return;
    }
    const o = this._o.options,
      pos = this._xToPos(p.x),
      t = this._t;
    c.setAttribute("x1", p.x);
    c.setAttribute("x2", p.x);
    c.setAttribute("visibility", "visible");
    tip.innerHTML =
      `<div><b>${esc(t("Position", "Position"))} ${Math.round(pos)} %</b></div>` +
      this._units()
        .map((u) => `<div><i class="key" style="background:${seriesVar(u.slot)}"></i>${esc(u.name)}<em>${Math.round(lampAt(o, u.light, pos).v)} %</em></div>`)
        .join("") +
      this._devGroups()
        .map((g) => {
          const v = this._devValueAt(g, pos);
          return v === null ? "" : `<div>${this._dashKey(g)}${esc(friendly(this._hass, g.entity))}<em>${esc(v)}</em></div>`;
        })
        .join("");
    tip.hidden = false;
    const left = p.x + 14 + tip.offsetWidth > this._chartW ? p.x - 14 - tip.offsetWidth : p.x + 14;
    tip.style.left = `${left}px`;
    tip.style.top = "12px";
  }
}

if (!customElements.get("crescendo-panel")) customElements.define("crescendo-panel", CrescendoPanel);
