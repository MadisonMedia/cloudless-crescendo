// Shared types and helpers for the card and the editor panel.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale?: { language: string };
  user?: { is_admin: boolean };
  themes?: { darkMode?: boolean };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown>;
}

export const DOMAIN = "cloudless_crescendo";

/** [brightness 0-100, r, g, b] per sample. */
export type Sample = [number, number, number, number];

export interface CurveData {
  steps: { position: number; name: string | null }[];
  samples: number;
  lights: Record<string, Sample[]>;
}

export interface Point {
  brightness?: number;
  kelvin?: number;
  rgb?: [number, number, number];
  xy?: [number, number];
}

export interface Step {
  position: number;
  name?: string;
  lights: Record<string, Point>;
}

export interface RoomLight {
  entity_id: string;
  color_mode: "auto" | "color" | "white";
}

export interface RoomOptions {
  lights: RoomLight[];
  steps: Step[];
  default_transition: number;
  max_segment: number;
}

export interface Room {
  entry_id: string;
  title: string;
  entity_id: string | null;
  options: RoomOptions;
}

export const fetchCurve = (
  hass: HomeAssistant,
  source: { entity_id: string } | { options: RoomOptions },
  samples = 101,
): Promise<CurveData> =>
  hass.callWS<CurveData>({ type: `${DOMAIN}/room/curve`, samples, ...source });

/** Interpolated sample of one light at a position (0-100). */
export function sampleAt(samples: Sample[], position: number): Sample {
  const n = samples.length - 1;
  const f = Math.max(0, Math.min(1, position / 100)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const a = samples[i];
  const b = samples[Math.min(n, i + 1)];
  return a.map((v, k) => v + (b[k] - v) * t) as Sample;
}

const NIGHT: [number, number, number] = [28, 29, 36];

/**
 * The color a room "emits" at a position: the lights' colors mixed by their
 * brightness (hue kept at full intensity), rising out of darkness as the total
 * brightness grows.
 */
export function roomColor(curve: CurveData, position: number, maxTotal: number): string {
  let total = 0;
  const mix = [0, 0, 0];
  for (const samples of Object.values(curve.lights)) {
    const [b, r, g, bl] = sampleAt(samples, position);
    total += b;
    mix[0] += r * b;
    mix[1] += g * b;
    mix[2] += bl * b;
  }
  if (total <= 0.01) return rgb(NIGHT);
  const peak = Math.max(mix[0], mix[1], mix[2], 1e-6);
  const color = mix.map((c) => (c / peak) * 255);
  const level = Math.pow(Math.min(1, total / Math.max(1, maxTotal)), 0.35);
  const lift = 0.25 + 0.75 * level;
  return rgb(NIGHT.map((n, k) => n + (color[k] - n) * lift));
}

export function maxTotalBrightness(curve: CurveData): number {
  const lights = Object.values(curve.lights);
  let max = 1;
  for (let i = 0; i < curve.samples; i++) {
    let sum = 0;
    for (const s of lights) sum += s[i][0];
    max = Math.max(max, sum);
  }
  return max;
}

/** CSS gradient of the room color along the scale. */
export function roomGradient(curve: CurveData): string {
  const maxTotal = maxTotalBrightness(curve);
  const stops: string[] = [];
  for (let p = 0; p <= 100; p += 2.5) stops.push(`${roomColor(curve, p, maxTotal)} ${p}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** CSS gradient of one light: its color, faded by its brightness. */
export function laneGradient(samples: Sample[]): string {
  const stops: string[] = [];
  const step = Math.max(1, Math.round((samples.length - 1) / 40));
  for (let i = 0; i < samples.length; i += step) {
    const [b, r, g, bl] = samples[i];
    const p = (i / (samples.length - 1)) * 100;
    stops.push(`rgba(${r}, ${g}, ${bl}, ${(0.12 + 0.88 * (b / 100)).toFixed(3)}) ${p.toFixed(1)}%`);
  }
  const [b, r, g, bl] = samples[samples.length - 1];
  stops.push(`rgba(${r}, ${g}, ${bl}, ${(0.12 + 0.88 * (b / 100)).toFixed(3)}) 100%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export const rgb = (c: [number, number, number] | number[]): string =>
  `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgbToHex(c: [number, number, number]): string {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Approximate display color of a color temperature (Tanner Helland). */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return [clamp(r), clamp(g), clamp(b)];
}

export function friendlyName(hass: HomeAssistant, entityId: string): string {
  return hass.states[entityId]?.attributes.friendly_name ?? entityId;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

export function formatDuration(seconds: number, lang: string): string {
  const s = Math.max(0, Math.round(seconds));
  const de = lang.startsWith("de");
  if (s < 60) return de ? `${s} s` : `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function language(hass?: HomeAssistant): string {
  return hass?.locale?.language ?? hass?.language ?? "en";
}

/** Simple translation helper: picks German or English. */
export function t(hass: HomeAssistant | undefined, strings: { en: string; de: string }): string {
  return language(hass).startsWith("de") ? strings.de : strings.en;
}

/** Call at most every `ms`, always delivering the latest arguments. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  let timer: number | undefined;
  let pending: A | undefined;
  const run = () => {
    last = performance.now();
    timer = undefined;
    if (pending) {
      const args = pending;
      pending = undefined;
      fn(...args);
    }
  };
  const throttled = (...args: A) => {
    pending = args;
    const wait = ms - (performance.now() - last);
    if (wait <= 0) run();
    else if (timer === undefined) timer = window.setTimeout(run, wait);
  };
  throttled.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return throttled;
}
