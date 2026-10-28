// Crescendo dashboard card: one playhead over the room's light score.

import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import {
  DOMAIN,
  type CurveData,
  type HassEntity,
  type HomeAssistant,
  fetchCurve,
  formatDuration,
  laneGradient,
  language,
  roomGradient,
  t,
  throttle,
} from "./shared";

interface ButtonConfig {
  position: number;
  name?: string;
  icon?: string;
  duration?: number;
}

interface CardConfig {
  type: string;
  entity: string;
  name?: string;
  show_lanes?: boolean;
  live?: boolean;
  step_duration?: number;
  buttons?: ButtonConfig[];
}

const LIVE_INTERVAL = 300;
const LIVE_DURATION = 0.4;
const SNAP = 1.5;

class CrescendoCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _curve: { state: true },
    _drag: { state: true },
    _frame: { state: true },
    _width: { state: true },
  };

  hass?: HomeAssistant;
  private _config?: CardConfig;
  private _curve?: CurveData;
  private _gradient = "";
  private _lanes: [string, string][] = [];
  private _curveId?: string;
  private _drag?: number;
  private _moved = false;
  private _pending?: { position: number; until: number };
  private _received = 0;
  private _stateObj?: HassEntity;
  private _raf?: number;
  private _frame = 0;
  private _width = 320;
  private _resize?: ResizeObserver;

  private _sendLive = throttle((position: number) => {
    this._fadeTo(position, LIVE_DURATION);
  }, LIVE_INTERVAL);

  setConfig(config: CardConfig): void {
    if (!config?.entity) throw new Error("Please choose a Crescendo room (entity).");
    this._config = { show_lanes: true, live: true, ...config };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("crescendo-card-editor");
  }

  static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    const room = Object.values(hass.states).find(
      (s) => s.entity_id.startsWith("light.") && "curve_id" in s.attributes,
    );
    return { entity: room?.entity_id ?? "" };
  }

  getCardSize(): number {
    return this._config?.show_lanes ? 4 : 3;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, min_rows: 3 };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._resize = new ResizeObserver((entries) => {
      this._width = entries[0]?.contentRect.width ?? this._width;
    });
    this._resize.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
    this._sendLive.cancel();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has("hass") || !this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (stateObj !== this._stateObj) {
      this._stateObj = stateObj;
      this._received = performance.now();
      const curveId = stateObj?.attributes.curve_id;
      if (stateObj && curveId !== this._curveId) {
        this._curveId = curveId;
        this._loadCurve();
      }
      if (stateObj?.attributes.fading) this._animate();
    }
  }

  private async _loadCurve(): Promise<void> {
    if (!this.hass || !this._config) return;
    try {
      const curve = await fetchCurve(this.hass, { entity_id: this._config.entity });
      this._gradient = roomGradient(curve);
      this._lanes = Object.entries(curve.lights).map(([id, samples]) => [id, laneGradient(samples)]);
      this._curve = curve;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Crescendo: could not load curve", err);
    }
  }

  private _animate(): void {
    if (this._raf) return;
    const tick = () => {
      this._raf = undefined;
      this._frame++;
      if (this._stateObj?.attributes.fading) this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /** Live position: interpolated during a fade, without relying on clock sync. */
  private get _statePosition(): number {
    const attrs = this._stateObj?.attributes ?? {};
    const position = Number(attrs.position ?? 0);
    if (!attrs.fading) return position;
    const target = Number(attrs.target_position ?? position);
    const remaining = Number(attrs.fade_remaining ?? 0);
    if (remaining <= 0) return target;
    const elapsed = (performance.now() - this._received) / 1000;
    return position + (target - position) * Math.min(1, elapsed / remaining);
  }

  private get _position(): number {
    if (this._drag !== undefined) return this._drag;
    const live = this._statePosition;
    if (this._pending) {
      const attrs = this._stateObj?.attributes ?? {};
      const target = attrs.fading ? Number(attrs.target_position) : live;
      if (Math.abs(target - this._pending.position) < 0.6 || performance.now() > this._pending.until) {
        this._pending = undefined;
      } else {
        return this._pending.position;
      }
    }
    return live;
  }

  private _fadeTo(position: number, duration?: number): void {
    if (!this.hass || !this._config) return;
    const data: Record<string, unknown> = { position: Math.round(position * 10) / 10 };
    if (duration !== undefined) data.duration = duration;
    this.hass.callService(DOMAIN, "fade_to", data, { entity_id: this._config.entity });
  }

  private _positionFromEvent(ev: PointerEvent): number {
    const track = this.renderRoot.querySelector<HTMLElement>(".score");
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
  }

  private _onPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._moved = false;
    this._drag = this._positionFromEvent(ev);
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (this._drag === undefined) return;
    const position = this._positionFromEvent(ev);
    if (Math.abs(position - this._drag) > 0.2) this._moved = true;
    this._drag = position;
    if (this._moved && this._config?.live) this._sendLive(position);
  }

  private _onPointerUp(): void {
    if (this._drag === undefined) return;
    let position = this._drag;
    const snap = this._curve?.steps.find((s) => Math.abs(s.position - position) <= SNAP);
    if (snap) position = snap.position;
    if (position < SNAP) position = 0;
    this._sendLive.cancel();
    this._drag = undefined;
    this._pending = { position, until: performance.now() + 2500 };
    const live = this._moved && this._config?.live;
    this._fadeTo(position, live ? LIVE_DURATION : this._config?.step_duration);
  }

  private _onKeyDown(ev: KeyboardEvent): void {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let position = this._position;
    if (ev.key in keys) position += keys[ev.key] * (ev.shiftKey ? 10 : 1);
    else if (ev.key === "PageUp") position += 10;
    else if (ev.key === "PageDown") position -= 10;
    else if (ev.key === "Home") position = 0;
    else if (ev.key === "End") position = 100;
    else return;
    ev.preventDefault();
    position = Math.max(0, Math.min(100, Math.round(position)));
    this._pending = { position, until: performance.now() + 2500 };
    this._fadeTo(position, 0.5);
    this.requestUpdate();
  }

  private _toggle(): void {
    if (!this.hass || !this._config) return;
    const on = this._stateObj?.state === "on";
    this.hass.callService("light", on ? "turn_off" : "turn_on", {}, { entity_id: this._config.entity });
  }

  private _status(position: number): string {
    const attrs = this._stateObj?.attributes ?? {};
    const lang = language(this.hass);
    if (attrs.fading && this._drag === undefined && !this._pending) {
      const target = Math.round(Number(attrs.target_position));
      const remaining =
        Number(attrs.fade_remaining ?? 0) - (performance.now() - this._received) / 1000;
      if (remaining > 3) {
        return t(this.hass, {
          en: `to ${target} %, ${formatDuration(remaining, lang)} left`,
          de: `auf ${target} %, noch ${formatDuration(remaining, lang)}`,
        });
      }
    }
    if (position < 0.5) return t(this.hass, { en: "Off", de: "Aus" });
    const step = this._curve?.steps.find((s) => Math.abs(s.position - position) < 0.6);
    return step?.name ?? "";
  }

  private _stepLabels() {
    const steps = this._curve?.steps ?? [];
    const minGap = (72 / Math.max(160, this._width)) * 100;
    let lastNamed = -Infinity;
    return steps.map((step) => {
      const showName = Boolean(step.name) && step.position - lastNamed >= minGap && step.position <= 100 - minGap / 3;
      if (showName) lastNamed = step.position;
      return html`<button
        class="step ${showName ? "named" : ""}"
        style="left: ${step.position}%"
        title=${step.name ?? `${step.position} %`}
        @click=${() => {
          this._pending = { position: step.position, until: performance.now() + 2500 };
          this._fadeTo(step.position, this._config?.step_duration);
        }}
      >
        <span class="tick"></span>${showName ? html`<span class="label">${step.name}</span>` : nothing}
      </button>`;
    });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<ha-card><div class="missing">
        ${t(this.hass, { en: "Room not found:", de: "Raum nicht gefunden:" })} ${this._config.entity}
      </div></ha-card>`;
    }
    void this._frame;
    const position = this._position;
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? this._config.entity;
    const on = stateObj.state === "on";
    const unavailable = stateObj.state === "unavailable";

    return html`
      <ha-card class=${unavailable ? "unavailable" : ""}>
        <div class="head">
          <div class="name">${name}</div>
          <button
            class="power ${on ? "on" : ""}"
            @click=${this._toggle}
            aria-label=${on ? t(this.hass, { en: "Turn off", de: "Ausschalten" }) : t(this.hass, { en: "Turn on", de: "Einschalten" })}
          >
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
        </div>
        <div class="readout">
          <span class="value">${Math.round(position)}</span><span class="unit">%</span>
          <span class="status">${this._status(position)}</span>
        </div>
        <div
          class="score ${this._drag !== undefined ? "dragging" : ""}"
          role="slider"
          tabindex="0"
          aria-label=${name}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${Math.round(position)}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerUp}
          @keydown=${this._onKeyDown}
        >
          <div class="ribbon" style="background: ${this._gradient || "var(--divider-color)"}">
            <div class="veil" style="left: ${position}%"></div>
          </div>
          ${this._config.show_lanes && this._lanes.length
            ? html`<div class="lanes">
                ${this._lanes.map(
                  ([id, gradient]) =>
                    html`<div class="lane" title=${this.hass?.states[id]?.attributes.friendly_name ?? id}>
                      <div class="lane-fill" style="background: ${gradient}"></div>
                      <div class="veil" style="left: ${position}%"></div>
                    </div>`,
                )}
              </div>`
            : nothing}
          <div class="playhead" style="left: ${position}%"><div class="knob"></div></div>
        </div>
        <div class="steps">${this._stepLabels()}</div>
        ${this._config.buttons?.length
          ? html`<div class="buttons">
              ${this._config.buttons.map(
                (b) => html`<button
                  class="chip"
                  @click=${() => {
                    this._pending = { position: b.position, until: performance.now() + 2500 };
                    this._fadeTo(b.position, b.duration ?? this._config?.step_duration);
                  }}
                >
                  ${b.icon ? html`<ha-icon .icon=${b.icon}></ha-icon>` : nothing}
                  <span>${b.name ?? `${b.position} %`}</span>
                </button>`,
              )}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --crescendo-radius: 14px;
      display: block;
    }
    ha-card {
      padding: 16px 16px 12px;
      overflow: hidden;
    }
    ha-card.unavailable {
      opacity: 0.5;
      pointer-events: none;
    }
    .missing {
      color: var(--error-color, #db4437);
      padding: 8px 0;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .name {
      font-size: 1rem;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    button:focus-visible,
    .score:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 3px;
    }
    .power {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      transition: background-color 180ms, color 180ms;
      flex: none;
    }
    .power.on {
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
    }
    .readout {
      display: flex;
      align-items: baseline;
      gap: 2px;
      margin: 2px 0 12px;
      min-height: 48px;
    }
    .value {
      font-size: 2.75rem;
      font-weight: 300;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .unit {
      font-size: 1rem;
      color: var(--secondary-text-color);
      margin-right: 12px;
    }
    .status {
      font-size: 0.9rem;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .score {
      position: relative;
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      cursor: ew-resize;
      border-radius: var(--crescendo-radius);
    }
    .ribbon {
      position: relative;
      height: 52px;
      border-radius: var(--crescendo-radius);
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(127, 127, 127, 0.18);
    }
    .veil {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      background: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
      pointer-events: none;
    }
    .lanes {
      display: grid;
      gap: 3px;
      margin-top: 6px;
    }
    .lane {
      position: relative;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(127, 127, 127, 0.16);
    }
    .lane-fill {
      position: absolute;
      inset: 0;
    }
    .playhead {
      position: absolute;
      top: -4px;
      bottom: -4px;
      width: 4px;
      margin-left: -2px;
      border-radius: 2px;
      background: #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
    .knob {
      position: absolute;
      top: 15px;
      left: 50%;
      width: 18px;
      height: 30px;
      margin-left: -9px;
      border-radius: 9px;
      background: #fff;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .score.dragging .knob {
      transform: scale(1.12);
    }
    .steps {
      position: relative;
      height: 30px;
      margin: 2px 4px 0;
    }
    .step {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 24px;
      height: 30px;
      color: var(--secondary-text-color);
    }
    .tick {
      width: 2px;
      height: 6px;
      border-radius: 1px;
      background: var(--secondary-text-color);
      opacity: 0.6;
    }
    .label {
      margin-top: 3px;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .step:hover .label,
    .step:hover .tick {
      color: var(--primary-text-color);
      opacity: 1;
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      color: var(--primary-text-color);
      font-size: 0.875rem;
    }
    .chip ha-icon {
      --mdc-icon-size: 18px;
    }
    @media (prefers-reduced-motion: reduce) {
      .power {
        transition: none;
      }
    }
  `;
}

// -- Visual card editor -------------------------------------------------------

class CrescendoCardEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };

  hass?: HomeAssistant;
  private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  private get _schema() {
    return [
      {
        name: "entity",
        required: true,
        selector: { entity: { filter: { integration: DOMAIN, domain: "light" } } },
      },
      { name: "name", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_lanes", selector: { boolean: {} } },
          { name: "live", selector: { boolean: {} } },
        ],
      },
      {
        name: "step_duration",
        selector: { number: { min: 0, max: 600, step: 0.5, mode: "box", unit_of_measurement: "s" } },
      },
    ];
  }

  private _label = (schema: { name: string }) => {
    const labels: Record<string, { en: string; de: string }> = {
      entity: { en: "Room", de: "Raum" },
      name: { en: "Name", de: "Name" },
      show_lanes: { en: "Show each light", de: "Einzelne Leuchten zeigen" },
      live: { en: "Lights follow while dragging", de: "Leuchten folgen beim Ziehen" },
      step_duration: {
        en: "Fade time for steps (empty = room default)",
        de: "Überblendzeit für Stufen (leer = Raumstandard)",
      },
    };
    return labels[schema.name] ? t(this.hass, labels[schema.name]) : schema.name;
  };

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ show_lanes: true, live: true, ...this._config }}
      .schema=${this._schema}
      .computeLabel=${this._label}
      @value-changed=${this._changed}
    ></ha-form>`;
  }

  private _changed(ev: CustomEvent): void {
    const config = { ...ev.detail.value };
    if (config.step_duration === undefined || config.step_duration === "") delete config.step_duration;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

if (!customElements.get("crescendo-card")) customElements.define("crescendo-card", CrescendoCard);
if (!customElements.get("crescendo-card-editor")) {
  customElements.define("crescendo-card-editor", CrescendoCardEditor);
}

const w = window as unknown as { customCards?: unknown[] };
w.customCards = w.customCards ?? [];
if (!w.customCards.some((c) => (c as { type: string }).type === "crescendo-card")) {
  w.customCards.push({
    type: "crescendo-card",
    name: "Crescendo",
    description: "One slider for a whole room, with staggered dimming curves.",
    preview: true,
    documentationURL: "https://github.com/MadisonMedia/cloudless-crescendo",
  });
}
