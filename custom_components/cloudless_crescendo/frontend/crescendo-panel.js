// The Crescendo page in the sidebar: set up objects, their stops, devices and buttons, and check the connection.

const shared = await import(new URL(`./crescendo-shared.js${new URL(import.meta.url).search}`, import.meta.url).href);
const {
  DEVICE_ACTIONS,
  RAMP_DOMAINS,
  clamp,
  EASE_MAX_SECONDS,
  comma,
  ease,
  esc,
  friendly,
  hexRgb,
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
  rgbHex,
  rgbOf,
  roomGradient,
  roomLight,
  seriesVar,
  tr,
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
.edit { display: grid; grid-template-columns: 180px minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
.objects h2 { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.objlist { display: grid; gap: 2px; margin-top: 6px; }
.objlist button { text-align: left; border: 0; background: transparent; padding: 8px 10px; border-radius: 8px; overflow-wrap: anywhere; }
.objlist button:hover { background: var(--line); }
.objlist button[aria-current="true"] { background: var(--accent-soft); font-weight: 600; }
.objnew { display: grid; gap: 6px; margin-top: 10px; }
.objnew input { width: 100%; }
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
.side { display: grid; gap: 14px; position: sticky; top: 12px; min-width: 0; }
.inspector { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 12px; }
.inspector h3 { font-size: 16px; font-weight: 650; }
.inspector h3 small { font-size: 12.5px; font-weight: 400; color: var(--muted); margin-left: 6px; }
.ctl { display: grid; gap: 4px; font-size: 13.5px; min-width: 0; }
.ctl-top { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); }
.ctl input[type="range"] { width: 100%; accent-color: var(--accent); }
.ctl output { color: var(--ink); font-variant-numeric: tabular-nums; }
.color { width: 44px; height: 32px; min-height: 0; padding: 2px; }
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
@container (max-width: 1240px) {
  .edit { grid-template-columns: minmax(0, 1fr) 280px; }
  .objects { grid-column: 1 / -1; }
  .objlist { display: flex; flex-wrap: wrap; }
  .objnew { display: flex; flex-wrap: wrap; align-items: center; }
  .objnew input { width: auto; }
}
@container (max-width: 640px) {
  .scrub label, .lrow .lname { grid-column: 1 / -1; padding-bottom: 2px; }
  .scrub input.grad, .lrow .llane { grid-column: 2; }
}
@container (max-width: 860px) {
  .edit { grid-template-columns: minmax(0, 1fr); }
  .side { position: static; order: 1; }
  .sheet { order: 2; padding: 14px; }
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
// The name as outlines, each letter a step heavier. Fonts on a system rarely offer that many weights.
const LOGO = '<svg viewBox="0 -720 4828 740" role="img" aria-label="Crescendo"><path fill="currentColor" d="M389 12Q290 12 214 -34Q137 -81 94 -162Q50 -244 50 -350Q50 -456 93 -538Q136 -619 212 -666Q288 -712 386 -712Q445 -712 502 -690Q558 -669 604 -630Q650 -592 675 -542L622 -509Q601 -552 564 -584Q526 -617 480 -636Q434 -654 386 -654Q307 -654 246 -615Q184 -576 149 -508Q114 -439 114 -350Q114 -260 149 -191Q184 -122 246 -83Q309 -44 389 -44Q438 -44 484 -64Q530 -85 568 -121Q605 -157 626 -203L679 -170Q653 -117 608 -76Q562 -34 505 -11Q448 12 389 12Z M780 0V-500H855V-411Q885 -458 933 -480Q980 -502 1032 -502V-432Q988 -432 947 -417Q907 -403 881 -369Q855 -334 855 -276V0Z M1321 12Q1248 12 1192 -22Q1136 -55 1104 -114Q1072 -173 1072 -250Q1072 -327 1104 -386Q1136 -445 1192 -478Q1248 -512 1321 -512Q1390 -512 1441 -478Q1493 -443 1522 -380Q1551 -317 1551 -232H1161Q1166 -154 1212 -111Q1258 -67 1326 -67Q1378 -67 1413 -91Q1448 -115 1467 -154L1543 -117Q1523 -79 1492 -49Q1460 -20 1417 -4Q1374 12 1321 12ZM1168 -304H1456Q1453 -345 1434 -375Q1416 -404 1386 -420Q1356 -435 1319 -435Q1283 -435 1250 -420Q1216 -404 1194 -375Q1172 -345 1168 -304Z M1814 12Q1762 12 1721 -4Q1679 -19 1650 -47Q1621 -74 1607 -109L1693 -146Q1709 -116 1740 -96Q1771 -76 1809 -76Q1852 -76 1878 -92Q1905 -107 1905 -135Q1905 -161 1885 -177Q1865 -192 1827 -201L1779 -214Q1710 -232 1670 -271Q1631 -309 1631 -358Q1631 -431 1679 -472Q1727 -512 1818 -512Q1863 -512 1901 -499Q1939 -485 1966 -461Q1992 -437 2004 -405L1920 -367Q1909 -396 1880 -410Q1851 -424 1814 -424Q1775 -424 1753 -408Q1731 -391 1731 -361Q1731 -344 1750 -330Q1769 -315 1805 -306L1860 -292Q1909 -280 1941 -256Q1973 -231 1989 -200Q2004 -169 2004 -136Q2004 -91 1980 -58Q1955 -24 1912 -6Q1869 12 1814 12Z M2322 12Q2245 12 2186 -22Q2127 -55 2094 -114Q2060 -173 2060 -250Q2060 -327 2093 -386Q2127 -445 2185 -478Q2244 -512 2320 -512Q2394 -512 2454 -476Q2514 -441 2543 -375L2439 -335Q2423 -368 2390 -388Q2357 -408 2315 -408Q2274 -408 2242 -388Q2210 -367 2192 -332Q2174 -296 2174 -250Q2174 -204 2192 -168Q2211 -133 2243 -113Q2276 -92 2317 -92Q2359 -92 2392 -114Q2425 -135 2441 -172L2545 -132Q2516 -64 2457 -26Q2397 12 2322 12Z M2844 12Q2770 12 2713 -22Q2656 -55 2623 -114Q2591 -173 2591 -250Q2591 -327 2624 -386Q2658 -445 2716 -478Q2774 -512 2850 -512Q2916 -512 2971 -478Q3026 -443 3059 -377Q3092 -311 3092 -217H2723Q2728 -164 2767 -133Q2806 -102 2857 -102Q2899 -102 2926 -120Q2953 -138 2967 -167L3081 -122Q3060 -81 3027 -50Q2993 -20 2948 -4Q2902 12 2844 12ZM2730 -312H2955Q2952 -344 2934 -364Q2917 -384 2893 -394Q2870 -404 2846 -404Q2823 -404 2798 -395Q2772 -385 2753 -365Q2734 -345 2730 -312Z M3157 0V-500H3293L3299 -434Q3323 -472 3360 -492Q3397 -512 3443 -512Q3503 -512 3544 -488Q3586 -464 3607 -413Q3628 -363 3628 -284V0H3484V-256Q3484 -301 3473 -327Q3463 -353 3444 -365Q3425 -376 3400 -377Q3352 -378 3326 -349Q3301 -320 3301 -263V0Z M3914 12Q3843 12 3793 -19Q3742 -51 3715 -110Q3688 -169 3688 -250Q3688 -332 3715 -391Q3742 -449 3793 -481Q3843 -512 3914 -512Q3960 -512 3995 -494Q4030 -477 4053 -443V-700H4215V0H4061L4057 -61Q4034 -26 3998 -7Q3961 12 3914 12ZM3956 -137Q3983 -137 4004 -150Q4025 -162 4038 -185Q4051 -208 4053 -236V-264Q4051 -292 4038 -315Q4025 -337 4004 -349Q3982 -362 3955 -362Q3927 -362 3905 -348Q3882 -334 3869 -308Q3857 -283 3857 -250Q3857 -217 3870 -192Q3883 -166 3906 -152Q3928 -137 3956 -137Z M4548 12Q4468 12 4407 -22Q4345 -55 4310 -114Q4275 -173 4275 -250Q4275 -327 4309 -386Q4344 -445 4405 -478Q4467 -512 4546 -512Q4626 -512 4687 -478Q4749 -445 4784 -386Q4818 -327 4818 -250Q4818 -173 4784 -114Q4749 -55 4688 -22Q4627 12 4548 12ZM4548 -154Q4573 -154 4592 -166Q4611 -179 4622 -200Q4633 -222 4633 -250Q4633 -278 4622 -300Q4611 -321 4591 -334Q4572 -346 4546 -346Q4521 -346 4502 -334Q4482 -321 4471 -300Q4460 -278 4460 -250Q4460 -222 4471 -200Q4482 -179 4502 -166Q4522 -154 4548 -154Z"/></svg>';
const MENU_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>';
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
    this._adv = false;
    this._group = true;
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
    // Home Assistant's icon picker reports through its own event.
    r.addEventListener("value-changed", (e) => {
      if (e.target?.dataset?.f === "icon" && e.composedPath()[0] === e.target) this._onChange(e);
    });
    r.addEventListener("pointerdown", (e) => this._onDown(e));
    r.addEventListener("pointermove", (e) => this._onMove(e));
    r.addEventListener("pointerup", (e) => this._onUp(e));
    r.addEventListener("pointercancel", () => {
      this._chartDrag = null;
      this._devDrag = null;
    });
    r.addEventListener("pointerleave", () => this._hideTip(), true);
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
        <div class="tabs" role="tablist">
          <button role="tab" data-act="tab" data-v="edit" aria-selected="${this._view === "edit"}">${esc(t("Setup", "Einrichtung"))}</button>
          <button role="tab" data-act="tab" data-v="diag" aria-selected="${this._view === "diag"}">${esc(t("Diagnostics", "Diagnose"))}</button>
        </div>
      </header>
      <main id="main"></main>
    </div><div class="toast" id="toast" hidden></div>`;
    if (this._view === "edit") this._renderEdit();
    else this._renderDiagView();
  }

  _renderEdit() {
    const t = this._t,
      main = this.shadowRoot.getElementById("main");
    const o = this._o;
    main.innerHTML = `<section class="edit">
      <aside class="objects"><h2>${esc(t("Objects", "Objekte"))}</h2><div class="objlist" id="objList"></div>
        <div class="objnew"><input class="field" id="newObjName" placeholder="${esc(t("New object", "Neues Objekt"))}" aria-label="${esc(t("Name of the new object", "Name des neuen Objekts"))}">
          <button class="btn" data-act="new-obj">${esc(t("Create", "Anlegen"))}</button></div></aside>
      ${
        o
          ? `<div class="sheet">
        <div class="sec">
          <div class="row space"><input class="field title-input" id="objName" aria-label="${esc(t("Name of the object", "Name des Objekts"))}">
            <div class="row"><button class="btn" id="undoBtn" data-act="undo" disabled>${esc(t("Undo", "Rückgängig"))}</button><span id="deleteBox"></span></div></div>
          <div class="row space"><label class="opt"><input type="checkbox" id="preview"${this._preview ? " checked" : ""}> ${esc(t("Preview on the lights", "Vorschau an den Leuchten"))}</label>
            <div class="row"><label class="opt" for="runDur">${esc(t("Test run over", "Probelauf über"))}</label>
              <select class="field" id="runDur"><option value="5">5 s</option><option value="10">10 s</option><option value="30" selected>30 s</option><option value="60">60 s</option></select>
              <button class="btn" data-act="run-up">${esc(t("Dim up", "Hochdimmen"))}</button><button class="btn" data-act="run-down">${esc(t("Dim down", "Runterdimmen"))}</button></div></div>
        </div>
        <div class="sec">
          <div class="row space"><span class="h2">${esc(t("Lights and devices", "Leuchten und Geräte"))}</span>
            <div class="seg" role="group"><button data-act="view-chart" id="vChart">${esc(t("Chart", "Diagramm"))}</button><button data-act="view-table" id="vTable">${esc(t("Table", "Tabelle"))}</button></div></div>
          <p class="note" id="stopNote"></p>
          <div class="row" id="stopTools"></div>
          <div class="row"><label class="opt"><input type="checkbox" id="edAdv"${this._adv ? " checked" : ""}> ${esc(t("Show advanced settings", "Erweiterte Einstellungen einblenden"))}</label>
            <label class="opt"><input type="checkbox" id="edGroup"${this._group ? " checked" : ""}> ${esc(t("Combine identical lights", "Gleiche Leuchten zusammenfassen"))}</label></div>
          <div class="notice calm" id="advNote" hidden><span><b>${esc(t("Fade.", "Überblendung."))}</b> ${esc(t("Smooth is the default: the light fades by itself. On time: if a light reaches its target too late, try this setting. It then moves in short steps and may stutter more.", "Weich ist der Standard: Die Leuchte überblendet selbst. Pünktlich: Falls eine Leuchte zu spät ihr Ziel erreicht, probiere diese Einstellung. Sie läuft dann in kurzen Schritten und kann stärker ruckeln."))}</span></div>
          <div class="lights" id="lights">
            <div class="scrub"><label for="editPos">${esc(t("Position", "Position"))} <output id="editPosOut">0 %</output></label><input type="range" class="grad" id="editPos" min="0" max="100" step="1" value="0"></div>
            <div class="chart-box" id="chartBox"></div>
            <div class="wrapx" id="tableWrap" hidden><table class="mx" id="matrix"></table></div>
            <div class="lrows" id="rows"></div>
          </div>
          <div id="modeNotice"></div>
          <div class="row"><select class="field" id="addSel" aria-label="${esc(t("Choose a light or device", "Leuchte oder Gerät auswählen"))}"></select><button class="btn" data-act="add-item">${esc(t("Add", "Hinzufügen"))}</button></div>
          <p class="note">${esc(t("A threshold fires once: on a slider when you let go, on a timed fade when it is crossed.", "Eine Schwelle löst einmal aus: beim Slider erst beim Loslassen, bei zeitgesteuertem Dimmen beim Überschreiten."))}</p>
        </div>
        <div class="sec"><h2>${esc(t("Standard buttons", "Standard-Buttons"))}</h2>
          <p class="note">${esc(t("New cards take these buttons as a template. In each card you can leave out some or add your own. Automations can press them too.", "Neue Karten übernehmen diese Buttons als Vorlage. In jeder Karte kannst du einzelne weglassen oder eigene ergänzen. Automationen können sie ebenfalls auslösen."))}</p>
          <div class="wrapx"><table class="tbl" id="btnTable"></table></div><div><button class="btn" data-act="add-btn">${esc(t("Add button", "Button hinzufügen"))}</button></div></div>
        <details><summary>${esc(t("More settings", "Weitere Einstellungen"))}</summary><div class="stack">
          <div class="ctl"><div class="sub">${esc(t("Slider", "Slider"))}</div><div class="row"><label for="rate">${esc(t("Updates per second", "Aktualisierungen pro Sekunde"))}</label><input class="field num" type="number" id="rate" min="1" max="10" step="1"></div>
            <p class="note">${esc(t("The default is 4. More updates feel more direct, but too many can cause stutter.", "Standard ist 4. Mehr Aktualisierungen wirken direkter, zu viele können aber Ruckler verursachen."))}</p></div>
          <div class="ctl"><div class="sub">${esc(t("Switching on without a stop", "Einschalten ohne Stufe"))}</div><div class="row"><select class="field" id="onMode" aria-label="${esc(t("Behavior when switching on", "Verhalten beim Einschalten"))}"><option value="last">${esc(t("Last position", "Letzte Position"))}</option><option value="fixed">${esc(t("Fixed stop", "Feste Stufe"))}</option></select><input class="field num" type="number" id="onPos" min="1" max="100" aria-label="${esc(t("Fixed stop in percent", "Feste Stufe in Prozent"))}"></div>
            <p class="note">${esc(t("Applies to tiles and voice commands without a percentage. Another integration or automation can set this value with the action “Set switch-on position”, for example by time of day.", "Gilt für Kacheln und Sprachbefehle ohne Prozentangabe. Eine andere Integration oder Automation kann den Wert mit der Aktion „Einschaltposition festlegen“ vorgeben, zum Beispiel nach Tageszeit."))}</p></div>
          <div class="ctl"><div class="sub">${esc(t("Speed", "Tempo"))}</div><div class="row"><label for="fadeDef">${esc(t("0 to 100 % takes (seconds)", "0 auf 100 % dauert (Sekunden)"))}</label><input class="field num" type="number" id="fadeDef" min="0" max="3600" step="0.5"></div>
            <p class="note">${esc(t("Each fade takes its share: from 80 to 100 % a fifth. Applies to buttons, switching on and off, taps on a card's slider, and tiles or voice commands without a duration. A card can set its own speed. Automations and other integrations that give a duration keep it exactly.", "Jede Überblendung dauert ihren Anteil: von 80 auf 100 % ein Fünftel. Gilt für Buttons, Ein- und Ausschalten, Tippen auf den Regler einer Karte sowie Kacheln und Sprachbefehle ohne Dauer. Eine Karte kann ein eigenes Tempo haben. Automationen und andere Integrationen mit eigener Dauer behalten sie genau."))}</p></div>
          <div class="ctl"><div class="sub">${esc(t("In automations", "In Automationen"))}</div><p class="note">${esc(t("The object is a normal light. Its brightness is the position on the scale. The lights always run in the set sequence, backward when dimming down.", "Das Objekt ist ein normales Licht. Seine Helligkeit ist die Position auf der Skala. Die Leuchten laufen immer in der eingestellten Reihenfolge, rückwärts beim Runterdimmen."))}</p><pre id="yaml"></pre></div>
        </div></details>
      </div>
      <aside class="side"><div class="inspector" id="inspector"></div></aside>`
          : `<div class="sheet"><div class="sec"><h2>${esc(t("No object yet", "Noch kein Objekt"))}</h2><p class="note">${esc(t("Enter a name on the left and create your first object.", "Gib links einen Namen ein und lege dein erstes Objekt an."))}</p></div></div>`
      }
    </section>`;
    this._renderObjects();
    if (!o) return;
    this.shadowRoot.getElementById("objName").value = o.title;
    this._resize?.disconnect();
    this._resize?.observe(this.shadowRoot.getElementById("chartBox"));
    this._renderDelete();
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

  _renderObjects() {
    const list = this.shadowRoot.getElementById("objList");
    if (list)
      list.innerHTML = this._objects
        .map((o, i) => `<button data-act="pick-obj" data-i="${i}"${i === this._i ? ' aria-current="true"' : ""}>${esc(o.title)}</button>`)
        .join("");
  }

  _stop() {
    return this._o.options.stops.find((s) => s._sid === this._sel.stop) || null;
  }

  _units() {
    return units(this._o.options, this._hass, this._group);
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
      }`;
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
    r.getElementById("advNote").hidden = !this._adv;
    r.getElementById("editPos").style.setProperty("--grad", roomGradient(o, undefined, undefined, this._dark));
    if (chart) this._renderChart();
    else this._renderMatrix();
    this._renderRows();
    const both = o.lights.filter((l) => l.mode === "rgbcct").map((l) => friendly(this._hass, l.entity_id));
    r.getElementById("modeNotice").innerHTML = both.length
      ? `<div class="notice"><b>${esc(t("Color + white", "Farbe + Weiß"))}: ${esc(both.join(", "))}</b><span>${esc(t("Changing between color and white can flicker badly. If that bothers you, set one of them in the advanced settings. Another object with the same lights can be set differently.", "Beim Wechsel zwischen Farbe und Weiß kann die Leuchte unschön flackern. Falls das stört, lege in den erweiterten Einstellungen eins davon fest. Ein weiteres Objekt mit denselben Leuchten kannst du anders einstellen."))}</span></div>`
      : "";
    this._renderAddSelect();
  }

  _renderAddSelect() {
    const t = this._t,
      hass = this._hass,
      o = this._o.options;
    const sel = this.shadowRoot.getElementById("addSel");
    const keep = sel.value;
    const ids = Object.keys(hass.states).sort((a, b) => friendly(hass, a).localeCompare(friendly(hass, b)));
    const lights = ids.filter((id) => id.startsWith("light.") && !hass.states[id].attributes.crescendo && !o.lights.some((l) => l.entity_id === id));
    const label = (id) => `${friendly(hass, id)}`;
    let devices = "";
    for (const id of ids) {
      const domain = id.split(".")[0];
      if (domain === "light" && !hass.states[id].attributes.crescendo) continue;
      if (hass.states[id].attributes.crescendo) continue;
      if (RAMP_DOMAINS.includes(domain)) {
        const r = RAMP_LABEL[domain];
        const what = r ? (this._lang === "de" ? r[1] : r[0]) : t("Value", "Wert");
        devices += `<option value="d:ramp:${esc(id)}">${esc(label(id))}: ${esc(t("course", "Verlauf"))} (${esc(what)})</option>`;
      }
      if (DEVICE_ACTIONS[domain]) devices += `<option value="d:threshold:${esc(id)}">${esc(label(id))}: ${esc(t("action at a threshold", "Aktion an einer Schwelle"))}</option>`;
    }
    sel.innerHTML = `<optgroup label="${esc(t("Lights", "Leuchten"))}">${lights.map((id) => `<option value="l:${esc(id)}">${esc(label(id))}</option>`).join("")}</optgroup><optgroup label="${esc(t("Devices", "Geräte"))}">${devices}</optgroup>`;
    if (keep) sel.value = keep;
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
    const pos = this._livePos();
    box.innerHTML = `<svg width="${w}" height="${CHART_H}" viewBox="0 0 ${w} ${CHART_H}" role="img" aria-label="${esc(this._t("Brightness of each light over the scale. The table shows the same values.", "Helligkeit jeder Leuchte über die Skala. Die Tabelle zeigt dieselben Werte."))}">
      ${grid}${stops}${lines}<line class="c-cross" id="chartCross" x1="0" x2="0" y1="${PT}" y2="${CHART_H - PB}" visibility="hidden"/><line class="c-ph" id="chartPh" x1="${X(pos)}" x2="${X(pos)}" y1="${PT}" y2="${CHART_H - PB}"/>${dots}</svg><div class="chart-tip" id="chartTip" hidden></div>`;
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

  _devLane(d) {
    if (d.kind === "ramp") {
      return `<div class="llane devlane" data-devlane="${esc(d.id)}" title="${esc(this._t("Dragging moves the nearest end", "Ziehen verschiebt das nächstliegende Ende"))}"><div class="devramp" id="dvr-${esc(d.id)}" style="left:${d.from}%;width:${Math.max(0, d.to - d.from)}%"></div></div>`;
    }
    return `<div class="llane devlane" data-devlane="${esc(d.id)}" title="${esc(this._t("Dragging moves the threshold", "Ziehen verschiebt die Schwelle"))}"><div class="devfill" id="dvf-${esc(d.id)}" style="left:${d.at}%"></div><div class="devmark" id="dvm-${esc(d.id)}" style="left:${d.at}%"></div></div>`;
  }

  _devFields(d) {
    const t = this._t;
    const num = (f, v, label, attrs = 'min="0" max="100"') =>
      `<input class="field num" type="number" id="d${f}-${esc(d.id)}" data-dev="${esc(d.id)}" data-f="${f}" ${attrs} value="${v}" aria-label="${esc(label)}">`;
    if (d.kind === "ramp") {
      const u = this._rampUnit(d);
      return `<label>${esc(t("From stop", "Von Stufe"))} ${num("from", d.from, t("Start", "Beginn"))}</label><label>${esc(t("to", "bis"))} ${num("to", d.to, t("End", "Ende"))}:</label>
        <label>${esc(u.label)} ${num("min", d.min, t("Start value", "Anfangswert"), `step="${u.step}"`)}</label><label>${esc(t("to", "bis"))} ${num("max", d.max, t("End value", "Endwert"), `step="${u.step}"`)} ${esc(u.unit)}</label>`;
    }
    const domain = d.entity_id.split(".")[0];
    const names = (a) => (ACTION_LABEL[a] ? (this._lang === "de" ? ACTION_LABEL[a][1] : ACTION_LABEL[a][0]) : a);
    const actions = DEVICE_ACTIONS[domain] || ["turn_on", "turn_off"];
    const opts = (val, list, empty) =>
      (empty ? `<option value="">${esc(t("Do nothing", "Nichts tun"))}</option>` : "") +
      list.map((a) => `<option value="${a}"${val === a ? " selected" : ""}>${esc(names(a))}</option>`).join("");
    const media =
      d.action === "play_media"
        ? `<label>${esc(t("Title or playlist", "Titel oder Playlist"))} <input class="field" id="dcid-${esc(d.id)}" data-dev="${esc(d.id)}" data-f="media_content_id" value="${esc(d.data?.media_content_id || "")}"></label>
           <label>${esc(t("Type", "Art"))} <input class="field" id="dctype-${esc(d.id)}" data-dev="${esc(d.id)}" data-f="media_content_type" value="${esc(d.data?.media_content_type || "music")}"></label>`
        : "";
    return `<label>${esc(t("From stop", "Ab Stufe"))} ${num("at", d.at, t("Threshold", "Schwelle"))}</label>
      <label><select class="field" id="dact-${esc(d.id)}" data-dev="${esc(d.id)}" data-f="action" aria-label="${esc(t("Action when crossed", "Aktion beim Überschreiten"))}">${opts(d.action, actions)}</select></label>
      <label>${esc(t("When falling below", "Beim Unterschreiten"))} <select class="field" id="dbck-${esc(d.id)}" data-dev="${esc(d.id)}" data-f="back">${opts(d.back || "", actions.filter((a) => a !== "play_media"), true)}</select></label>${media}`;
  }

  _deviceRow(d) {
    return `<div class="lrow"><div class="lname"><span>${esc(friendly(this._hass, d.entity_id))}<span class="devval" data-devval="${esc(d.id)}"></span></span><button class="x" data-act="rm-dev" data-id="${esc(d.id)}" aria-label="${esc(this._t("Remove", "Entfernen"))}">×</button></div>${this._devLane(d)}<div class="ladv">${this._devFields(d)}</div></div>`;
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

  _lampAdv(u) {
    const t = this._t,
      l = u.light;
    const label = {
      onoff: t("On/off only", "Nur an/aus"),
      dim: t("Single-color dimming", "Einfarbig dimmen"),
      cct: t("White (CCT)", "Weiß (CCT)"),
      rgb: t("Color (RGB)", "Farbe (RGB)"),
      rgbcct: t("Color + white (RGB+CCT)", "Farbe + Weiß (RGB+CCT)"),
    };
    const avail = this._modesFor(l.entity_id);
    const modes = (avail.includes(l.mode) ? avail : [...avail, l.mode]).map((m) => `<option value="${m}"${l.mode === m ? " selected" : ""}>${esc(label[m])}</option>`).join("");
    const key = esc(u.ids.join(","));
    const steps = l.fade === "ontime" ? `<label>${esc(t("Steps per second", "Schritte pro Sekunde"))} <input class="field num" type="number" id="fs-${esc(l.entity_id)}" data-steps="${key}" min="1" max="8" value="${l.steps || 4}"></label>` : "";
    return `<div class="ladv"><label>${esc(t("Color", "Farbe"))} <select class="field" id="mode-${esc(l.entity_id)}" data-mode="${key}">${modes}</select></label>
      <label>${esc(t("Fade", "Überblendung"))} <select class="field" id="fm-${esc(l.entity_id)}" data-fade="${key}"><option value="soft"${l.fade === "soft" ? " selected" : ""}>${esc(t("Smooth", "Weich"))}</option><option value="ontime"${l.fade === "ontime" ? " selected" : ""}>${esc(t("On time", "Pünktlich"))}</option></select></label>${steps}
      <label>${esc(t("On the slider", "Am Slider"))} <select class="field" id="sl-${esc(l.entity_id)}" data-slider-mode="${key}"><option value="auto"${(l.slider || "auto") === "auto" ? " selected" : ""}>${esc(t("Automatic", "Automatisch"))}</option><option value="glide"${l.slider === "glide" ? " selected" : ""}>${esc(t("Glide", "Gleiten"))}</option><option value="direct"${l.slider === "direct" ? " selected" : ""}>${esc(t("Direct", "Direkt"))}</option></select></label></div>`;
  }

  _renderRows() {
    const box = this.shadowRoot.getElementById("rows"),
      t = this._t,
      o = this._o.options;
    if (this._edView === "table") {
      box.innerHTML = o.devices.map((d) => this._deviceRow(d)).join("");
      box.hidden = !o.devices.length;
      return;
    }
    box.hidden = false;
    const lamps = this._units()
      .map(
        (u) => `<div class="lrow"><div class="lname"><i class="key" style="background:${seriesVar(u.slot)}"></i><span>${esc(u.name)}</span><button class="x" data-act="rm-lamp" data-ids="${esc(u.ids.join(","))}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div>
        <div class="llane" style="background-image:${laneGradient(o, u.light, undefined, this._dark)}"></div>${this._adv ? this._lampAdv(u) : ""}</div>`,
      )
      .join("");
    box.innerHTML = (lamps || `<p class="note">${esc(t("No light yet. Add the first one below.", "Noch keine Leuchte. Füge unten die erste hinzu."))}</p>`) + o.devices.map((d) => this._deviceRow(d)).join("");
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
        (u) => `<tr><th scope="row"><div class="lname" style="padding:0"><span>${esc(u.name)}</span><button class="x" data-act="rm-lamp" data-ids="${esc(u.ids.join(","))}" aria-label="${esc(t("Remove", "Entfernen"))}">×</button></div></th>${o.stops.map((s) => `<td>${cell(u, s)}</td>`).join("")}</tr>${this._adv ? `<tr><th scope="row"></th><td colspan="${o.stops.length}">${this._lampAdv(u)}</td></tr>` : ""}`,
      )
      .join("");
    const devRows = o.devices
      .filter((d) => d.kind === "ramp")
      .map((d) => `<tr><th scope="row">${esc(friendly(this._hass, d.entity_id))}</th>${o.stops.map((s) => `<td class="num-cell" style="text-align:center;font-size:12.5px">${esc(this._fmtRamp(d, this._rampVal(d, s.position)))}</td>`).join("")}</tr>`)
      .join("");
    this.shadowRoot.getElementById("matrix").innerHTML = `<thead><tr><th>${esc(t("Stop", "Stufe"))}</th>${head}</tr></thead><tbody><tr><th scope="row">${esc(t("Room", "Raum"))}</th>${room}</tr>${rows || `<tr><th scope="row">${esc(t("No light yet", "Noch keine Leuchte"))}</th><td colspan="${o.stops.length}"><span class="note">${esc(t("Add the first one below.", "Füge unten die erste hinzu."))}</span></td></tr>`}${devRows}</tbody>`;
  }

  _renderInspector() {
    const box = this.shadowRoot.getElementById("inspector"),
      t = this._t;
    if (!box) return;
    const st = this._stop(),
      u = this._selUnit();
    if (!st || !u) {
      box.innerHTML = `<h3>${esc(t("Adjust", "Einstellen"))}</h3><p class="note">${esc(t("Choose a point in the chart or a cell in the table. Here you then set brightness and color.", "Wähle einen Punkt im Diagramm oder eine Zelle in der Tabelle, dann stellst du hier Helligkeit und Farbe ein."))}</p>`;
      return;
    }
    const light = u.light,
      val = st.values[light.entity_id] || { brightness: 0 };
    const a = this._hass.states[light.entity_id]?.attributes || {};
    // Lights report odd limits such as 2702 K; Home Assistant clamps what it sends anyway.
    const kmin = Math.round((a.min_color_temp_kelvin || 2000) / 50) * 50,
      kmax = Math.floor((a.max_color_temp_kelvin || 6500) / 50) * 50;
    let html = `<h3>${esc(u.name)}<small>${esc(t("Stop", "Stufe"))} ${st.position}</small></h3>`;
    if (st.position === 0) {
      box.innerHTML = `${html}<p class="note">${esc(t("At stop 0 all lights are always off.", "Bei Stufe 0 sind immer alle Leuchten aus."))}</p>`;
      return;
    }
    if (light.mode === "onoff") {
      html += `<label class="opt"><input type="checkbox" id="insOn"${val.brightness > 0 ? " checked" : ""}> ${esc(t("Light on at this stop", "Leuchte an in dieser Stufe"))}</label>`;
    } else {
      html += `<div class="ctl"><div class="ctl-top"><label for="insB">${esc(t("Brightness", "Helligkeit"))}</label><output id="insBOut">${Math.round(val.brightness)} %</output></div><input type="range" id="insB" min="0" max="100" step="1" value="${val.brightness}"></div>`;
    }
    if (light.mode === "rgbcct") {
      html += `<div class="seg" role="group"><button data-act="kind" data-kind="white" aria-pressed="${!val.color}">${esc(t("White", "Weiß"))}</button><button data-act="kind" data-kind="color" aria-pressed="${!!val.color}">${esc(t("Color", "Farbe"))}</button></div>`;
    }
    if (light.mode === "cct" || (light.mode === "rgbcct" && !val.color)) {
      const k = clamp(val.kelvin ?? 3000, kmin, kmax);
      html += `<div class="ctl"><div class="ctl-top"><label for="insK">${esc(t("Color temperature", "Farbtemperatur"))}</label><output id="insKOut">${k} K</output></div><input type="range" id="insK" min="${kmin}" max="${kmax}" step="50" value="${k}"><p class="note">${esc(t(`This light can do ${kmin} to ${kmax} K.`, `Diese Leuchte kann ${kmin} bis ${kmax} K.`))}</p></div>`;
    }
    if (light.mode === "rgb" || (light.mode === "rgbcct" && val.color)) {
      const hex = val.color ? rgbHex(val.color) : rgbHex(kRgb(val.kelvin ?? 3000));
      html += `<div class="row"><label for="insC">${esc(t("Color", "Farbe"))}</label><input class="field color" type="color" id="insC" value="${hex}"></div>`;
    }
    html += `<button class="btn" data-act="copy-all">${esc(t("Apply to all lights of this stop", "Für alle Leuchten dieser Stufe übernehmen"))}</button>`;
    box.innerHTML = html;
  }

  _renderButtons() {
    const t = this._t,
      o = this._o.options;
    this.shadowRoot.getElementById("btnTable").innerHTML = `<thead><tr><th>${esc(t("Name", "Name"))}</th><th>${esc(t("Stop (%)", "Stufe (%)"))}</th><th>${esc(t("Icon", "Symbol"))}</th><th></th></tr></thead><tbody>${
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
        .join("") || `<tr><td colspan="4"><span class="note">${esc(t("No buttons yet.", "Noch keine Buttons."))}</span></td></tr>`
    }</tbody>`;
  }

  _renderSettings() {
    const r = this.shadowRoot,
      o = this._o.options;
    r.getElementById("rate").value = o.slider_rate;
    r.getElementById("onMode").value = o.on_mode;
    r.getElementById("onPos").value = o.on_position;
    r.getElementById("onPos").hidden = o.on_mode !== "fixed";
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
      const d = this._o.options.devices.find((x) => x.id === el.dataset.devval);
      if (d?.kind === "ramp") el.textContent = this._fmtRamp(d, this._rampVal(d, p));
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

  _selectPoint(stop, lamp) {
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
    const domain = entityId.split(".")[0],
      a = this._hass.states[entityId]?.attributes || {};
    const o = this._o.options;
    const d = { id: newId(), entity_id: entityId, kind };
    if (kind === "ramp") {
      d.from = 20;
      d.to = 100;
      if (domain === "media_player") Object.assign(d, { min: 0, max: 40 });
      else if (domain === "climate") {
        const now = +a.temperature || 20;
        Object.assign(d, { from: 40, min: now - 1, max: now + 2 });
      } else if (domain === "number" || domain === "input_number") Object.assign(d, { min: +a.min || 0, max: +a.max || 100 });
      else Object.assign(d, { min: 0, max: 100 });
    } else {
      const actions = DEVICE_ACTIONS[domain] || ["turn_on", "turn_off"];
      Object.assign(d, { at: 50, action: actions[0], back: null });
    }
    this._change(() => o.devices.push(d));
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
      case "new-obj": {
        const name = this.shadowRoot.getElementById("newObjName").value.trim();
        if (!name) {
          this._toast(t("Give the object a name first.", "Gib dem Objekt zuerst einen Namen."));
          return;
        }
        const res = await hass.callWS({ type: "cloudless_crescendo/object/create", title: name, lights: [] });
        await this._load(res.entry_id);
        break;
      }
      case "pick-obj":
        clearTimeout(this._saveTimer);
        this._i = +a.dataset.i;
        this._sel = { stop: null, lamp: null };
        this._undo = [];
        this._confirmDelete = false;
        this._renderEdit();
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
          if (ids.includes(this._sel.lamp)) this._sel.lamp = null;
        });
        this._renderInspector();
        break;
      }
      case "rm-dev":
        this._change(() => {
          o.devices = o.devices.filter((d) => d.id !== a.dataset.id);
        });
        break;
      case "add-item": {
        const v = this.shadowRoot.getElementById("addSel").value;
        if (!v) return;
        const [kind, x, y] = v.split(":");
        if (kind === "d") {
          this._addDevice(x, y);
          return;
        }
        const modes = this._modesFor(x);
        const mode = modes.includes("cct") ? "cct" : modes[modes.length - 1];
        this._change(() => {
          o.lights.push({ entity_id: x, mode, fade: "soft", steps: 4, slider: "auto" });
          for (const s of o.stops) s.values[x] = { brightness: 0 };
          const top = o.stops[o.stops.length - 1];
          top.values[x] = mode === "cct" || mode === "rgbcct" ? { brightness: 100, kelvin: 3000 } : { brightness: 100 };
        });
        break;
      }
      case "kind": {
        const st = this._stop(),
          u = this._selUnit();
        this._change(() => {
          for (const id of u.ids) {
            const v = st.values[id];
            st.values[id] = a.dataset.kind === "color" ? { brightness: v.brightness, color: v.color || kRgb(v.kelvin ?? 3000) } : { brightness: v.brightness, kelvin: v.kelvin ?? 3000 };
          }
        });
        this._renderInspector();
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
    } else if (t.id === "insB") {
      const st = this._stop(),
        u = this._selUnit();
      this._change(() => u.ids.forEach((id) => (st.values[id] = { ...st.values[id], brightness: +t.value })), `b${st._sid}${u.ids[0]}`);
      this.shadowRoot.getElementById("insBOut").textContent = `${t.value} %`;
    } else if (t.id === "insK") {
      const st = this._stop(),
        u = this._selUnit();
      this._change(() => u.ids.forEach((id) => (st.values[id] = { brightness: st.values[id].brightness, kelvin: +t.value })), `k${st._sid}${u.ids[0]}`);
      this.shadowRoot.getElementById("insKOut").textContent = `${t.value} K`;
    } else if (t.id === "insC") {
      const st = this._stop(),
        u = this._selUnit();
      this._change(() => u.ids.forEach((id) => (st.values[id] = { brightness: st.values[id].brightness, color: hexRgb(t.value) })), `c${st._sid}${u.ids[0]}`);
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
    else if (t.id === "edAdv") {
      this._adv = t.checked;
      this._renderStops();
    } else if (t.id === "edGroup") {
      this._group = t.checked;
      this._renderStops();
      this._renderInspector();
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
        if (f === "action") d.action = t.value;
        else if (f === "back") d.back = t.value || null;
        else if (f === "media_content_id" || f === "media_content_type") d.data = { media_content_type: "music", ...d.data, [f]: t.value };
        else if (f === "min" || f === "max") d[f] = +t.value || 0;
        else d[f] = clamp(+t.value || 0, 0, 100);
      });
    } else if (t.id === "rate") {
      this._change(() => (o.slider_rate = clamp(Math.round(+t.value) || 4, 1, 10)));
      t.value = o.slider_rate;
    } else if (t.id === "onMode") {
      this._change(() => (o.on_mode = t.value));
      this._renderSettings();
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
    const lane = e.target.closest?.("[data-devlane]");
    if (lane) {
      const d = this._o.options.devices.find((x) => x.id === lane.dataset.devlane);
      if (!d) return;
      e.preventDefault();
      const r = lane.getBoundingClientRect();
      const p = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      this._undo.push(JSON.stringify({ title: this._o.title, options: this._o.options }));
      this.shadowRoot.getElementById("undoBtn").disabled = false;
      this._lastKey = null;
      const end = d.kind === "ramp" ? (Math.abs(p - d.from) < Math.abs(p - d.to) ? "from" : "to") : "at";
      this._devDrag = { d, r, end };
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
      if (q(`dvf-${d.id}`)) q(`dvf-${d.id}`).style.left = `${p}%`;
    }
    const inp = q(`d${end}-${d.id}`);
    if (inp) inp.value = p;
  }

  _onUp() {
    if (this._devDrag) {
      this._devDrag = null;
      this._save();
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
      o.devices
        .filter((d) => d.kind === "ramp")
        .map((d) => `<div>${esc(friendly(this._hass, d.entity_id))}<em>${esc(this._fmtRamp(d, this._rampVal(d, pos)))}</em></div>`)
        .join("");
    tip.hidden = false;
    const left = p.x + 14 + tip.offsetWidth > this._chartW ? p.x - 14 - tip.offsetWidth : p.x + 14;
    tip.style.left = `${left}px`;
    tip.style.top = "12px";
  }
}

if (!customElements.get("crescendo-panel")) customElements.define("crescendo-panel", CrescendoPanel);
