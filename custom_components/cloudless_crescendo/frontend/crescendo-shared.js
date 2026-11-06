// Shared by the Crescendo card and the Crescendo page: colors and the curve.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const css = (c) => c.map((x) => Math.round(x)).join(",");
export const comma = (lang, n) => (lang === "de" ? String(n).replace(".", ",") : String(n));
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const langOf = (hass) => (hass?.locale?.language || hass?.language || "en").split("-")[0];
export const tr = (hass) => {
  const de = langOf(hass) === "de";
  return (en, german) => (de ? german : en);
};

export function kRgb(k) {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708 * Math.log(t) - 161.1196;
    b = t <= 19 ? 0 : 138.5177 * Math.log(t - 10) - 305.0448;
  } else {
    r = 329.6987 * Math.pow(t - 60, -0.1332);
    g = 288.1222 * Math.pow(t - 60, -0.0755);
    b = 255;
  }
  return [r, g, b].map((x) => Math.round(clamp(x, 0, 255)));
}
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbHex = (c) =>
  "#" + c.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const gam = (x) => {
  x = clamp(x, 0, 1);
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
};
function toLab(c) {
  const r = lin(c[0]),
    g = lin(c[1]),
    b = lin(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromLab(o) {
  const l = Math.pow(o[0] + 0.3963377774 * o[1] + 0.2158037573 * o[2], 3);
  const m = Math.pow(o[0] - 0.1055613458 * o[1] - 0.0638541728 * o[2], 3);
  const s = Math.pow(o[0] - 0.0894841775 * o[1] - 1.291485548 * o[2], 3);
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
export const mixLab = (a, b, t) => fromLab(lerp3(toLab(a), toLab(b), t));
export const colorGap = (a, b) => {
  const x = toLab(a),
    y = toLab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

// Brightness shows as fill and opacity. Whites stay bright instead of being darkened toward brown.
export function lightColor(c) {
  const o = toLab(c);
  if (Math.hypot(o[1], o[2]) >= 0.15) return c;
  return fromLab([Math.max(o[0], 0.86), o[1] * 0.9, o[2] * 0.9]);
}
export const lightA = (c, a) => `rgba(${css(lightColor(c))},${clamp(a, 0, 1).toFixed(2)})`;
// How the interface shows a fade: slow at both ends. The lights themselves fade evenly, so longer fades stay
// even here too, or the display would visibly run away from the lights.
export const ease = (u) => {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
};
export const EASE_MAX_SECONDS = 15;

export function hueRgb(hue) {
  const part = (n) => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [part(0), part(8), part(4)];
}
export function rgbHue([r, g, b]) {
  const max = Math.max(r, g, b),
    d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

export const lumOf = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// On a dark ground a dimmed warm light turns brown. There a control shows the full light color, and only
// fades in right where a light starts.
export const rampColor = (c, a, dark) => lightA(c, dark ? a / 0.08 : a);

// Uses the color actually behind the element, because a theme can be dark without being the dark mode.
export function isDark(el, hass) {
  const bg = el ? getComputedStyle(el).backgroundColor : "";
  if (/^rgba?\(/.test(bg)) {
    const parts = bg.match(/[\d.]+/g).map(Number);
    if (parts[3] === undefined || parts[3] >= 0.5) return lumOf(parts) < 0.45;
  }
  return !!hass?.themes?.darkMode;
}
export const tempColor = (t) => mixLab([47, 107, 255], [240, 80, 60], t);

// -- the curve, the same way the integration computes it ------------------------------------------

export const SERIES = 8;
export const seriesVar = (slot) => `var(--cr-s${(slot % SERIES) + 1})`;

export function rgbOf(light, value) {
  if (light.mode === "onoff" || light.mode === "dim") return kRgb(2900);
  if (light.mode === "cct") return kRgb(value?.kelvin ?? 3000);
  if (value?.color) return value.color;
  return kRgb(value?.kelvin ?? 3000);
}

export function lampAt(options, light, pos, override) {
  const stops = options.stops;
  let i = 0;
  while (i < stops.length - 2 && pos > stops[i + 1].position) i++;
  const a = stops[i],
    b = stops[i + 1] || a;
  const va = a.values[light.entity_id] || { brightness: 0 };
  const vb = b.values[light.entity_id] || { brightness: 0 };
  const t = b.position === a.position ? 0 : clamp((pos - a.position) / (b.position - a.position), 0, 1);
  if (light.mode === "onoff") {
    return { v: (t >= 1 ? vb.brightness : va.brightness) > 0 ? 100 : 0, c: kRgb(2900) };
  }
  const ca = rgbOf(light, va),
    cb = rgbOf(light, vb);
  let c = va.brightness === 0 ? cb : vb.brightness === 0 ? ca : lerp3(ca, cb, t);
  if (followsOverride(light, override)) c = override.rgb;
  return { v: lerp(va.brightness, vb.brightness, t), c };
}

// White lights keep their white under a chosen color, and only change with a chosen white.
function followsOverride(light, override) {
  if (!override || light.mode === "onoff" || light.mode === "dim") return false;
  return light.mode !== "cct" || !!override.white;
}

export function roomLight(options, pos, override) {
  let tot = 0,
    r = 0,
    g = 0,
    b = 0,
    top = 0,
    follows = false;
  for (const light of options.lights) {
    const l = lampAt(options, light, pos, override),
      w = l.v / 100;
    tot += w;
    r += l.c[0] * w;
    g += l.c[1] * w;
    b += l.c[2] * w;
    top = Math.max(top, w);
    if (w > 0 && followsOverride(light, override)) follows = true;
  }
  if (!tot) return { c: [255, 255, 255], a: 0 };
  const avg = Math.pow(Math.min(1, tot / Math.max(1, options.lights.length)), 0.55);
  // A chosen color shows as itself. Mixed with white lights it would be a color no light has.
  return { c: follows ? override.rgb : [r / tot, g / tot, b / tot], a: 0.5 * avg + 0.5 * Math.pow(top, 0.6) };
}

// The colors the lights report right now, largest group first. Nearly equal colors count as one.
const SAME_COLOR = 0.035;
export function activeColors(entityIds, hass) {
  const found = [];
  for (const id of entityIds) {
    const state = hass?.states?.[id];
    if (state?.state !== "on") continue;
    const rgb = state.attributes?.rgb_color || kRgb(2900);
    const same = found.find((f) => colorGap(f.rgb, rgb) < SAME_COLOR);
    if (same) same.ids.push(id);
    else found.push({ rgb, ids: [id] });
  }
  return found.sort((a, b) => b.ids.length - a.ids.length);
}

export function roomGradient(options, dir, override, dark) {
  const parts = [];
  for (let i = 0; i <= 28; i++) {
    const l = roomLight(options, (i / 28) * 100, override);
    parts.push(`${rampColor(l.c, l.a, dark)} ${((i / 28) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${dir || "90deg"}, ${parts.join(",")})`;
}

export function laneGradient(options, light, override, dark) {
  const parts = [];
  for (let i = 0; i <= 24; i++) {
    const l = lampAt(options, light, (i / 24) * 100, override);
    parts.push(`${rampColor(l.c, Math.pow(l.v / 100, 0.6), dark)} ${((i / 24) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(",")})`;
}

export const friendly = (hass, entityId) => hass?.states?.[entityId]?.attributes?.friendly_name || entityId;

// Lights with the same mode and the same values at every stop count as one unit.
export function units(options, hass, group) {
  const list = options.lights.map((light, slot) => ({ light, slot, ids: [light.entity_id] }));
  if (!group) return list.map((u) => ({ ...u, name: friendly(hass, u.light.entity_id) }));
  const map = new Map();
  for (const u of list) {
    const sig = JSON.stringify([
      u.light.mode,
      u.light.fade,
      options.stops.map((s) => s.values[u.light.entity_id] || null),
    ]);
    if (map.has(sig)) map.get(sig).ids.push(u.light.entity_id);
    else map.set(sig, { ...u });
  }
  return [...map.values()].map((u) => ({
    ...u,
    name:
      u.ids.length > 1
        ? `${commonName(u.ids.map((id) => friendly(hass, id)))} (${u.ids.length})`
        : friendly(hass, u.ids[0]),
  }));
}

function commonName(names) {
  const words = names[0].split(" ");
  let n = words.length;
  for (const other of names.slice(1)) {
    const w = other.split(" ");
    let i = 0;
    while (i < n && i < w.length && w[i] === words[i]) i++;
    n = i;
  }
  return n > 0 ? words.slice(0, n).join(" ") : names[0];
}

// -- what a card or a mixer channel can control ---------------------------------------------------

const num = (v, fallback) => (Number.isFinite(+v) ? +v : fallback);

export function controllerFor(hass, entityId, config = {}) {
  const state = hass?.states?.[entityId];
  const domain = (entityId || "").split(".")[0];
  const a = state?.attributes || {};
  const ctl = {
    entityId,
    domain,
    state,
    crescendo: !!a.crescendo,
    readonly: false,
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    scheme: "plain",
    value: 0,
    on: state?.state === "on",
  };
  if (ctl.crescendo) {
    ctl.value = num(a.position, 0);
    ctl.on = ctl.value > 0;
    ctl.scheme = "light";
    return finish(ctl, config);
  }
  switch (domain) {
    case "light":
      ctl.value = ctl.on ? num(a.brightness, 255) / 2.55 : 0;
      ctl.scheme = "light";
      break;
    case "climate":
      ctl.unit = hass?.config?.unit_system?.temperature || "°C";
      ctl.min = num(a.min_temp, 7);
      ctl.max = num(a.max_temp, 35);
      ctl.step = num(a.target_temp_step, 0.5);
      ctl.value = num(a.temperature, ctl.min);
      ctl.scheme = "temp";
      ctl.on = state?.state !== "off";
      break;
    case "cover":
      ctl.value = num(a.current_position, state?.state === "open" ? 100 : 0);
      ctl.on = ctl.value > 0;
      break;
    case "media_player":
      ctl.value = num(a.volume_level, 0) * 100;
      ctl.on = state?.state === "playing";
      break;
    case "fan":
      ctl.value = ctl.on ? num(a.percentage, 100) : 0;
      break;
    case "number":
    case "input_number":
      ctl.unit = a.unit_of_measurement || "";
      ctl.min = num(a.min, 0);
      ctl.max = num(a.max, 100);
      ctl.step = num(a.step, 1);
      ctl.value = num(state?.state, ctl.min);
      break;
    default:
      ctl.readonly = true;
      ctl.unit = a.unit_of_measurement || "";
      ctl.value = num(state?.state, 0);
      if (ctl.unit === "°C" || a.device_class === "temperature") {
        ctl.min = 10;
        ctl.max = 35;
        ctl.step = 0.1;
        ctl.scheme = "temp";
      } else {
        ctl.step = 0.1;
      }
  }
  return finish(ctl, config);
}

function finish(ctl, config) {
  if (config.min !== undefined) ctl.min = +config.min;
  if (config.max !== undefined) ctl.max = +config.max;
  const span = ctl.max - ctl.min || 1;
  ctl.pos = ctl.crescendo ? ctl.value : clamp(((ctl.value - ctl.min) / span) * 100, 0, 100);
  ctl.toValue = (p) => {
    const v = ctl.crescendo ? p : ctl.min + (span * p) / 100;
    return Math.round(v / ctl.step) * ctl.step;
  };
  ctl.toPos = (v) => clamp(((v - ctl.min) / span) * 100, 0, 100);
  return ctl;
}

export function formatValue(ctl, pos, lang) {
  const v = ctl.toValue(pos);
  return comma(lang, ctl.step < 1 ? v.toFixed(1) : String(Math.round(v)));
}

// Sends a value to a device that is not a Crescendo object.
export function sendValue(hass, ctl, pos, duration) {
  const v = ctl.toValue(pos);
  const target = { entity_id: ctl.entityId };
  switch (ctl.domain) {
    case "light": {
      if (v <= 0) return hass.callService("light", "turn_off", duration ? { transition: duration } : {}, target);
      const data = { brightness_pct: Math.max(1, Math.round(v)) };
      if (duration) data.transition = duration;
      return hass.callService("light", "turn_on", data, target);
    }
    case "climate":
      return hass.callService("climate", "set_temperature", { temperature: v }, target);
    case "cover":
      return hass.callService("cover", "set_cover_position", { position: Math.round(v) }, target);
    case "media_player":
      return hass.callService("media_player", "volume_set", { volume_level: Math.round(v) / 100 }, target);
    case "fan":
      return hass.callService("fan", "set_percentage", { percentage: Math.round(v) }, target);
    case "number":
    case "input_number":
      return hass.callService(ctl.domain, "set_value", { value: v }, target);
    default:
      return Promise.resolve();
  }
}

export const DEVICE_ACTIONS = {
  media_player: ["media_play", "media_pause", "media_stop", "play_media", "turn_on", "turn_off"],
  cover: ["open_cover", "close_cover", "stop_cover"],
  switch: ["turn_on", "turn_off"],
  input_boolean: ["turn_on", "turn_off"],
  fan: ["turn_on", "turn_off"],
  light: ["turn_on", "turn_off"],
  climate: ["turn_on", "turn_off"],
  script: ["turn_on"],
  scene: ["turn_on"],
};
export const RAMP_DOMAINS = ["media_player", "climate", "cover", "fan", "number", "input_number", "light"];
