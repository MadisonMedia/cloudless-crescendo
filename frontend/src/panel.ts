// Crescendo editor panel: rooms, steps and colors, with live preview on the real lights.

import { LitElement, css, html, nothing, svg, type PropertyValues } from "lit";
import {
  DOMAIN,
  type CurveData,
  type HomeAssistant,
  type Point,
  type Room,
  type RoomLight,
  type RoomOptions,
  type Sample,
  type Step,
  fetchCurve,
  friendlyName,
  hexToRgb,
  kelvinToRgb,
  rgb,
  rgbToHex,
  roomGradient,
  sampleAt,
  t,
  throttle,
} from "./shared";

type ColorKind = "none" | "white" | "color";

const COLOR_MODES = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

interface Capabilities {
  color: boolean;
  white: boolean;
  minKelvin: number;
  maxKelvin: number;
}

class CrescendoPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    _rooms: { state: true },
    _selected: { state: true },
    _title: { state: true },
    _draft: { state: true },
    _curve: { state: true },
    _step: { state: true },
    _preview: { state: true },
    _playhead: { state: true },
    _error: { state: true },
    _saving: { state: true },
    _creating: { state: true },
    _newName: { state: true },
    _search: { state: true },
    _loaded: { state: true },
  };

  hass?: HomeAssistant;
  narrow = false;
  private _rooms: Room[] = [];
  private _selected?: string;
  private _title = "";
  private _draft?: RoomOptions;
  private _saved = "";
  private _curve?: CurveData;
  private _step?: number; // index into draft.steps
  private _preview = false;
  private _playhead = 40;
  private _error = "";
  private _saving = false;
  private _creating = false;
  private _newName = "";
  private _search = "";
  private _loaded = false;
  private _curveTimer?: number;
  private _dragging = false;

  private _sendPreview = throttle((position: number) => {
    if (!this.hass || !this._draft) return;
    const room = this._room;
    this.hass
      .callWS({
        type: `${DOMAIN}/room/preview`,
        entity_id: room?.entity_id ?? undefined,
        options: this._draft,
        position,
        transition: 0.3,
      })
      .catch((err) => (this._error = String(err?.message ?? err)));
  }, 250);

  // -- data ------------------------------------------------------------------

  protected firstUpdated(): void {
    this._loadRooms();
  }

  private async _loadRooms(select?: string): Promise<void> {
    if (!this.hass) return;
    try {
      this._rooms = await this.hass.callWS<Room[]>({ type: `${DOMAIN}/rooms` });
    } catch (err) {
      this._error = String((err as Error)?.message ?? err);
    }
    this._loaded = true;
    const target = select ?? this._selected ?? this._rooms[0]?.entry_id;
    if (target) this._select(target, true);
  }

  private get _room(): Room | undefined {
    return this._rooms.find((r) => r.entry_id === this._selected);
  }

  private get _dirty(): boolean {
    return Boolean(this._draft) && JSON.stringify({ t: this._title, o: this._draft }) !== this._saved;
  }

  private _select(entryId: string, force = false): void {
    if (!force && this._dirty && !confirm(this._t("Discard unsaved changes?", "Ungespeicherte Änderungen verwerfen?"))) {
      return;
    }
    const room = this._rooms.find((r) => r.entry_id === entryId);
    if (!room) return;
    this._selected = entryId;
    this._title = room.title;
    this._draft = clone(room.options);
    this._saved = JSON.stringify({ t: this._title, o: this._draft });
    this._step = this._draft.steps.length ? 0 : undefined;
    this._error = "";
    this._scheduleCurve();
  }

  private _update(mutator: (draft: RoomOptions) => void): void {
    if (!this._draft) return;
    const draft = clone(this._draft);
    mutator(draft);
    this._draft = draft;
    this._scheduleCurve();
    if (this._preview) this._sendPreview(this._playhead);
  }

  private _scheduleCurve(): void {
    window.clearTimeout(this._curveTimer);
    this._curveTimer = window.setTimeout(async () => {
      if (!this.hass || !this._draft) return;
      try {
        this._curve = await fetchCurve(this.hass, { options: this._draft }, 201);
        this._error = "";
      } catch (err) {
        this._error = String((err as Error)?.message ?? err);
      }
    }, 120);
  }

  private async _save(): Promise<void> {
    if (!this.hass || !this._draft || !this._selected) return;
    this._saving = true;
    try {
      const result = await this.hass.callWS<{ options: RoomOptions }>({
        type: `${DOMAIN}/room/save`,
        entry_id: this._selected,
        title: this._title.trim() || this._room?.title,
        options: this._draft,
      });
      this._draft = result.options;
      this._saved = JSON.stringify({ t: this._title, o: this._draft });
      await this._loadRooms(this._selected);
    } catch (err) {
      this._error = String((err as Error)?.message ?? err);
    }
    this._saving = false;
  }

  private _discard(): void {
    if (this._selected) this._select(this._selected, true);
  }

  private async _create(): Promise<void> {
    if (!this.hass || !this._newName.trim()) return;
    try {
      const { entry_id } = await this.hass.callWS<{ entry_id: string }>({
        type: `${DOMAIN}/room/create`,
        title: this._newName.trim(),
      });
      this._creating = false;
      this._newName = "";
      await this._loadRooms(entry_id);
      this._select(entry_id, true);
    } catch (err) {
      this._error = String((err as Error)?.message ?? err);
    }
  }

  private async _deleteRoom(): Promise<void> {
    const room = this._room;
    if (!this.hass || !room) return;
    if (!confirm(this._t(`Delete the room "${room.title}"?`, `Raum „${room.title}“ löschen?`))) return;
    await this.hass.callWS({ type: `${DOMAIN}/room/delete`, entry_id: room.entry_id });
    this._selected = undefined;
    this._draft = undefined;
    this._curve = undefined;
    await this._loadRooms();
  }

  // -- helpers -----------------------------------------------------------------

  private _t(en: string, de: string): string {
    return t(this.hass, { en, de });
  }

  private _caps(entityId: string): Capabilities {
    const attrs = this.hass?.states[entityId]?.attributes ?? {};
    const modes: string[] = attrs.supported_color_modes ?? [];
    return {
      color: modes.some((m) => COLOR_MODES.has(m)),
      white: modes.includes("color_temp") || modes.some((m) => COLOR_MODES.has(m)),
      minKelvin: attrs.min_color_temp_kelvin ?? 2000,
      maxKelvin: attrs.max_color_temp_kelvin ?? 6500,
    };
  }

  private _samples(entityId: string): Sample[] | undefined {
    return this._curve?.lights[entityId];
  }

  private _positionFromEvent(ev: PointerEvent, el: HTMLElement): number {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
  }

  private _onTrackDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    this._dragging = true;
    this._movePlayhead(this._positionFromEvent(ev, el));
  }

  private _onTrackMove(ev: PointerEvent): void {
    if (!this._dragging) return;
    this._movePlayhead(this._positionFromEvent(ev, ev.currentTarget as HTMLElement));
  }

  private _onTrackUp(): void {
    this._dragging = false;
  }

  private _movePlayhead(position: number): void {
    const steps = this._draft?.steps ?? [];
    const near = steps.findIndex((s) => Math.abs(s.position - position) <= 1.2);
    if (near >= 0) {
      position = steps[near].position;
      this._step = near;
    }
    this._playhead = Math.round(position * 10) / 10;
    if (this._preview) this._sendPreview(this._playhead);
  }

  private _togglePreview(): void {
    this._preview = !this._preview;
    if (this._preview) this._sendPreview(this._playhead);
  }

  private _addStep(): void {
    if (!this._draft) return;
    let position = Math.round(this._playhead);
    if (position <= 0) position = 10;
    const existing = this._draft.steps.findIndex((s) => s.position === position);
    if (existing >= 0) {
      this._step = existing;
      return;
    }
    this._update((d) => {
      d.steps.push({ position, lights: {} });
      d.steps.sort((a, b) => a.position - b.position);
    });
    this._step = this._draft.steps.findIndex((s) => s.position === position);
  }

  private _removeStep(index: number): void {
    this._update((d) => d.steps.splice(index, 1));
    const count = this._draft?.steps.length ?? 0;
    this._step = count ? Math.min(index, count - 1) : undefined;
  }

  private _moveStep(index: number, value: string): void {
    const position = Math.round(Number(value) * 10) / 10;
    if (!this._draft || !(position > 0 && position <= 100)) return;
    if (this._draft.steps.some((s, i) => i !== index && s.position === position)) {
      this._error = this._t("Another step already uses this position.", "Diese Position hat schon eine andere Stufe.");
      return;
    }
    const step = this._draft.steps[index];
    this._update((d) => {
      d.steps[index].position = position;
      d.steps.sort((a, b) => a.position - b.position);
    });
    this._step = this._draft.steps.findIndex((s) => s.position === step.position || s.position === position);
    this._playhead = position;
  }

  private _setPoint(index: number, entityId: string, point: Point | undefined): void {
    this._update((d) => {
      const lights = d.steps[index].lights;
      if (point) lights[entityId] = point;
      else delete lights[entityId];
    });
  }

  private _include(index: number, entityId: string, include: boolean): void {
    if (!include) {
      this._setPoint(index, entityId, undefined);
      return;
    }
    const step = this._draft!.steps[index];
    const samples = this._samples(entityId);
    const brightness = samples ? Math.round(sampleAt(samples, step.position)[0]) : 100;
    this._setPoint(index, entityId, { brightness: brightness || 50 });
  }

  private _addLight(entityId: string): void {
    this._update((d) => {
      if (!d.lights.some((l) => l.entity_id === entityId)) {
        d.lights.push({ entity_id: entityId, color_mode: "auto" });
      }
    });
    this._search = "";
  }

  private _removeLight(entityId: string): void {
    this._update((d) => {
      d.lights = d.lights.filter((l) => l.entity_id !== entityId);
      for (const step of d.steps) delete step.lights[entityId];
    });
  }

  private _setColorMode(entityId: string, mode: RoomLight["color_mode"]): void {
    this._update((d) => {
      const light = d.lights.find((l) => l.entity_id === entityId);
      if (light) light.color_mode = mode;
    });
  }

  // -- rendering ---------------------------------------------------------------

  protected render() {
    if (!this.hass) return nothing;
    return html`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <h1>Crescendo</h1>
      </div>
      <main>
        ${this._renderRooms()}
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
        ${this._draft ? this._renderEditor() : this._renderEmpty()}
      </main>
      ${this._dirty
        ? html`<div class="savebar">
            <span>${this._t("Unsaved changes", "Ungespeicherte Änderungen")}</span>
            <button class="text" @click=${this._discard}>${this._t("Discard", "Verwerfen")}</button>
            <button class="filled" ?disabled=${this._saving} @click=${this._save}>
              ${this._saving ? this._t("Saving…", "Speichert…") : this._t("Save", "Speichern")}
            </button>
          </div>`
        : nothing}
    `;
  }

  private _renderRooms() {
    return html`<nav class="rooms" aria-label=${this._t("Rooms", "Räume")}>
      ${this._rooms.map(
        (room) => html`<button
          class="room-tab ${room.entry_id === this._selected ? "active" : ""}"
          @click=${() => this._select(room.entry_id)}
        >
          ${room.entry_id === this._selected ? this._title || room.title : room.title}
        </button>`,
      )}
      ${this._creating
        ? html`<form
            class="create"
            @submit=${(ev: Event) => {
              ev.preventDefault();
              this._create();
            }}
          >
            <input
              .value=${this._newName}
              @input=${(ev: Event) => (this._newName = (ev.target as HTMLInputElement).value)}
              placeholder=${this._t("Room name", "Name des Raums")}
              aria-label=${this._t("Room name", "Name des Raums")}
              autofocus
            />
            <button class="filled" type="submit" ?disabled=${!this._newName.trim()}>
              ${this._t("Create", "Anlegen")}
            </button>
            <button class="text" type="button" @click=${() => (this._creating = false)}>
              ${this._t("Cancel", "Abbrechen")}
            </button>
          </form>`
        : html`<button class="room-tab add" @click=${() => (this._creating = true)}>
            <ha-icon icon="mdi:plus"></ha-icon>${this._t("New room", "Neuer Raum")}
          </button>`}
    </nav>`;
  }

  private _renderEmpty() {
    if (!this._loaded) return nothing;
    return html`<section class="empty">
      <h2>${this._t("No room yet", "Noch kein Raum")}</h2>
      <p>
        ${this._t(
          "A room puts several lights on one scale from 0 to 100. Create one and decide which light joins at which point.",
          "Ein Raum legt mehrere Leuchten auf eine Skala von 0 bis 100. Lege einen an und bestimme, welche Leuchte wann dazukommt.",
        )}
      </p>
      <button class="filled" @click=${() => (this._creating = true)}>${this._t("Create room", "Raum anlegen")}</button>
    </section>`;
  }

  private _renderEditor() {
    const draft = this._draft!;
    return html`
      <section class="score-card">
        <div class="room-head">
          <input
            class="room-name"
            .value=${this._title}
            @input=${(ev: Event) => (this._title = (ev.target as HTMLInputElement).value)}
            aria-label=${this._t("Room name", "Name des Raums")}
          />
          ${this._room?.entity_id ? html`<span class="entity">${this._room.entity_id}</span>` : nothing}
        </div>
        ${draft.lights.length ? this._renderScore() : html`<p class="hint">
          ${this._t("Add the lights of this room below.", "Füge unten die Leuchten dieses Raums hinzu.")}
        </p>`}
      </section>
      ${this._step !== undefined && draft.steps[this._step] ? this._renderStep(this._step) : nothing}
      ${this._renderLights()} ${this._renderSettings()}
    `;
  }

  private _renderScore() {
    const draft = this._draft!;
    const curve = this._curve;
    const ribbon = curve ? roomGradient(curve) : "var(--divider-color)";
    const selected = this._step !== undefined ? draft.steps[this._step]?.position : undefined;

    const track = (content: unknown, extraClass = "") => html`<div
      class="track ${extraClass}"
      @pointerdown=${this._onTrackDown}
      @pointermove=${this._onTrackMove}
      @pointerup=${this._onTrackUp}
      @pointercancel=${this._onTrackUp}
    >
      ${content}
      ${draft.steps.map(
        (s) => html`<div class="bar ${s.position === selected ? "selected" : ""}" style="left:${s.position}%"></div>`,
      )}
      <div class="playhead" style="left:${this._playhead}%"></div>
    </div>`;

    return html`
      <div class="score">
        <div class="row ruler-row">
          <div class="label"></div>
          <div class="ruler">
            ${draft.steps.map(
              (s, i) => html`<button
                class="marker ${i === this._step ? "selected" : ""} ${s.position >= 96 ? "end" : ""}"
                style="left:${s.position}%"
                @click=${() => {
                  this._step = i;
                  this._movePlayhead(s.position);
                }}
              >
                <span>${s.name || `${s.position}`}</span>
              </button>`,
            )}
          </div>
        </div>
        <div class="row">
          <div class="label">${this._t("Room", "Raum")}</div>
          ${track(html`<div class="ribbon" style="background:${ribbon}"></div>`, "ribbon-track")}
        </div>
        ${draft.lights.map((light) => {
          const samples = this._samples(light.entity_id);
          const keyframes = draft.steps
            .map((s, i) => ({ s, i, p: s.lights[light.entity_id] }))
            .filter((k) => k.p);
          return html`<div class="row">
            <div class="label" title=${light.entity_id}>${friendlyName(this.hass!, light.entity_id)}</div>
            ${track(
              html`${samples ? this._lane(samples) : nothing}
              ${keyframes.map(
                (k) => html`<button
                  class="dot ${k.i === this._step ? "selected" : ""}"
                  style="left:${k.s.position}%; bottom:${(k.p!.brightness ?? sampleAt(samples ?? [[0, 0, 0, 0]], k.s.position)[0]) * 0.8 + 6}%"
                  aria-label="${friendlyName(this.hass!, light.entity_id)} ${k.s.position} %"
                  @pointerdown=${(ev: Event) => ev.stopPropagation()}
                  @click=${() => {
                    this._step = k.i;
                    this._movePlayhead(k.s.position);
                  }}
                ></button>`,
              )}`,
              "lane",
            )}
          </div>`;
        })}
        <div class="row ruler-scale">
          <div class="label"></div>
          <div class="scale">${[0, 25, 50, 75, 100].map((v) => html`<span style="left:${v}%">${v}</span>`)}</div>
        </div>
      </div>
      <div class="score-actions">
        <label class="switch">
          <input type="checkbox" .checked=${this._preview} @change=${this._togglePreview} />
          <span>${this._t("Preview on the lights", "Vorschau an den Leuchten")}</span>
        </label>
        <span class="playhead-value">${Math.round(this._playhead)} %</span>
        <button class="outlined" @click=${this._addStep}>
          <ha-icon icon="mdi:plus"></ha-icon>${this._t(`Step at ${Math.round(this._playhead) || 10} %`, `Stufe bei ${Math.round(this._playhead) || 10} %`)}
        </button>
      </div>
    `;
  }

  private _lane(samples: Sample[]) {
    const n = samples.length - 1;
    const points = samples.map((s, i) => `${(i / n) * 1000},${100 - s[0] * 0.8 - 4}`);
    const path = `M0,100 L${points.join(" L")} L1000,100 Z`;
    const id = `g${Math.random().toString(36).slice(2, 8)}`;
    const stops = samples.filter((_, i) => i % 5 === 0 || i === n);
    return svg`<svg class="area" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id=${id} x1="0" x2="1" y1="0" y2="0">
          ${stops.map((s) => {
            const i = samples.indexOf(s);
            return svg`<stop offset=${i / n} stop-color=${rgb([s[1], s[2], s[3]])} stop-opacity=${0.25 + 0.75 * (s[0] / 100)}></stop>`;
          })}
        </linearGradient>
      </defs>
      <path d=${path} fill="url(#${id})"></path>
      <polyline points=${points.join(" ")} fill="none" stroke="var(--primary-text-color)" stroke-opacity="0.35" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline>
    </svg>`;
  }

  private _renderStep(index: number) {
    const draft = this._draft!;
    const step = draft.steps[index];
    return html`<section class="card step-card">
      <div class="step-head">
        <button
          class="icon"
          ?disabled=${index === 0}
          @click=${() => {
            this._step = index - 1;
            this._playhead = draft.steps[index - 1].position;
          }}
          aria-label=${this._t("Previous step", "Vorherige Stufe")}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </button>
        <label class="field position">
          <span>${this._t("Position", "Position")}</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            .value=${String(step.position)}
            @change=${(ev: Event) => this._moveStep(index, (ev.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field grow">
          <span>${this._t("Name (shown on the card)", "Name (erscheint auf der Karte)")}</span>
          <input
            .value=${step.name ?? ""}
            placeholder=${this._t("e.g. Morning", "z. B. Morgen")}
            @input=${(ev: Event) => {
              const value = (ev.target as HTMLInputElement).value;
              this._update((d) => {
                if (value) d.steps[index].name = value;
                else delete d.steps[index].name;
              });
            }}
          />
        </label>
        <button
          class="icon"
          ?disabled=${index >= draft.steps.length - 1}
          @click=${() => {
            this._step = index + 1;
            this._playhead = draft.steps[index + 1].position;
          }}
          aria-label=${this._t("Next step", "Nächste Stufe")}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </button>
      </div>
      <div class="step-lights">
        ${draft.lights.map((light) => this._renderPoint(index, step, light))}
      </div>
      <div class="step-foot">
        <button class="text danger" @click=${() => this._removeStep(index)}>
          <ha-icon icon="mdi:delete-outline"></ha-icon>${this._t("Remove step", "Stufe entfernen")}
        </button>
      </div>
    </section>`;
  }

  private _renderPoint(index: number, step: Step, light: RoomLight) {
    const id = light.entity_id;
    const point = step.lights[id];
    const caps = this._caps(id);
    const samples = this._samples(id);
    const follow = samples ? Math.round(sampleAt(samples, step.position)[0]) : undefined;
    const kind: ColorKind = point?.kelvin !== undefined ? "white" : point?.rgb || point?.xy ? "color" : "none";
    const name = friendlyName(this.hass!, id);

    const setKind = (next: ColorKind) => {
      const base: Point = { brightness: point?.brightness ?? follow ?? 50 };
      if (next === "white") base.kelvin = 2700;
      if (next === "color") {
        const s = samples ? sampleAt(samples, step.position) : undefined;
        base.rgb = s && s[0] > 0 ? [Math.round(s[1]), Math.round(s[2]), Math.round(s[3])] : [255, 140, 60];
      }
      this._setPoint(index, id, base);
    };

    return html`<div class="point ${point ? "active" : ""}">
      <label class="include">
        <input type="checkbox" .checked=${Boolean(point)} @change=${(ev: Event) => this._include(index, id, (ev.target as HTMLInputElement).checked)} />
        <span class="light-name">${name}</span>
      </label>
      ${point
        ? html`
            <div class="control">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                .value=${String(point.brightness ?? 0)}
                aria-label="${name} ${this._t("brightness", "Helligkeit")}"
                @input=${(ev: Event) =>
                  this._setPoint(index, id, { ...point, brightness: Number((ev.target as HTMLInputElement).value) })}
              />
              <span class="value">${point.brightness === 0 ? this._t("off", "aus") : `${point.brightness ?? 0} %`}</span>
            </div>
            ${caps.white || caps.color
              ? html`<div class="color-row">
                  <div class="segmented" role="radiogroup" aria-label=${this._t("Color", "Farbe")}>
                    <button class=${kind === "none" ? "on" : ""} @click=${() => setKind("none")}>
                      ${this._t("Keep", "Beibehalten")}
                    </button>
                    ${caps.white
                      ? html`<button class=${kind === "white" ? "on" : ""} @click=${() => setKind("white")}>
                          ${this._t("White", "Weiß")}
                        </button>`
                      : nothing}
                    ${caps.color
                      ? html`<button class=${kind === "color" ? "on" : ""} @click=${() => setKind("color")}>
                          ${this._t("Color", "Farbe")}
                        </button>`
                      : nothing}
                  </div>
                  ${kind === "white" ? this._kelvinControl(index, id, point, caps) : nothing}
                  ${kind === "color"
                    ? html`<label class="swatch" style="background:${rgb(point.rgb ?? [255, 255, 255])}">
                        <input
                          type="color"
                          .value=${rgbToHex(point.rgb ?? [255, 255, 255])}
                          aria-label=${this._t("Pick color", "Farbe wählen")}
                          @input=${(ev: Event) =>
                            this._setPoint(index, id, {
                              brightness: point.brightness,
                              rgb: hexToRgb((ev.target as HTMLInputElement).value),
                            })}
                        />
                      </label>`
                    : nothing}
                </div>`
              : nothing}
          `
        : html`<div class="follow">
            ${follow === undefined
              ? this._t("Not used yet", "Noch nicht verwendet")
              : follow > 0
                ? this._t(`Follows the curve: ${follow} %`, `Folgt der Kurve: ${follow} %`)
                : this._t("Off here", "Hier aus")}
          </div>`}
    </div>`;
  }

  private _kelvinControl(index: number, id: string, point: Point, caps: Capabilities) {
    const min = Math.max(1800, Math.min(caps.minKelvin, 2200));
    const max = Math.min(8000, Math.max(caps.maxKelvin, 5000));
    const gradient = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1]
      .map((f) => rgb(kelvinToRgb(min + (max - min) * f)))
      .join(", ")})`;
    return html`<div class="control kelvin">
      <input
        type="range"
        min=${min}
        max=${max}
        step="50"
        style="--track:${gradient}"
        .value=${String(point.kelvin ?? 2700)}
        aria-label=${this._t("Color temperature", "Farbtemperatur")}
        @input=${(ev: Event) =>
          this._setPoint(index, id, { brightness: point.brightness, kelvin: Number((ev.target as HTMLInputElement).value) })}
      />
      <span class="value">${point.kelvin ?? 2700} K</span>
    </div>`;
  }

  private _renderLights() {
    const draft = this._draft!;
    const used = new Set(draft.lights.map((l) => l.entity_id));
    const query = this._search.trim().toLowerCase();
    const candidates = query
      ? Object.values(this.hass!.states)
          .filter(
            (s) =>
              s.entity_id.startsWith("light.") &&
              !used.has(s.entity_id) &&
              !("curve_id" in s.attributes) &&
              `${s.entity_id} ${s.attributes.friendly_name ?? ""}`.toLowerCase().includes(query),
          )
          .slice(0, 8)
      : [];

    return html`<section class="card">
      <h2>${this._t("Lights", "Leuchten")}</h2>
      <div class="light-list">
        ${draft.lights.map((light) => {
          const caps = this._caps(light.entity_id);
          return html`<div class="light-row">
            <div class="light-info">
              <span class="light-name">${friendlyName(this.hass!, light.entity_id)}</span>
              <span class="entity">${light.entity_id}</span>
            </div>
            ${caps.color && caps.white
              ? html`<select
                  aria-label=${this._t("How white is produced", "Wie Weiß erzeugt wird")}
                  .value=${light.color_mode}
                  @change=${(ev: Event) =>
                    this._setColorMode(light.entity_id, (ev.target as HTMLSelectElement).value as RoomLight["color_mode"])}
                >
                  <option value="auto">${this._t("Automatic", "Automatisch")}</option>
                  <option value="color">${this._t("Always mix colors", "Immer Farben mischen")}</option>
                  <option value="white">${this._t("Always white LEDs", "Immer Weiß-LEDs")}</option>
                </select>`
              : nothing}
            <button
              class="icon"
              @click=${() => this._removeLight(light.entity_id)}
              aria-label=${this._t("Remove light", "Leuchte entfernen")}
            >
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>`;
        })}
      </div>
      <div class="add-light">
        <input
          type="search"
          .value=${this._search}
          placeholder=${this._t("Add a light…", "Leuchte hinzufügen…")}
          aria-label=${this._t("Add a light", "Leuchte hinzufügen")}
          @input=${(ev: Event) => (this._search = (ev.target as HTMLInputElement).value)}
        />
        ${candidates.length
          ? html`<div class="results">
              ${candidates.map(
                (s) => html`<button @click=${() => this._addLight(s.entity_id)}>
                  <span class="light-name">${s.attributes.friendly_name ?? s.entity_id}</span>
                  <span class="entity">${s.entity_id}</span>
                </button>`,
              )}
            </div>`
          : nothing}
      </div>
      <p class="hint">
        ${this._t(
          "Automatic: if a light uses a color anywhere in the curve, its whites are mixed from colors too. That avoids the visible jump when an RGBCCT light switches between white LEDs and color LEDs.",
          "Automatisch: Nutzt eine Leuchte irgendwo in der Kurve eine Farbe, wird auch ihr Weiß aus Farben gemischt. So gibt es keinen sichtbaren Sprung, wenn eine RGBCCT-Leuchte zwischen Weiß- und Farb-LEDs wechselt.",
        )}
      </p>
    </section>`;
  }

  private _renderSettings() {
    const draft = this._draft!;
    const number = (key: "default_transition" | "max_segment", min: number, max: number, step: number) => html`<input
      type="number"
      min=${min}
      max=${max}
      step=${step}
      .value=${String(draft[key])}
      @change=${(ev: Event) => {
        const value = Number((ev.target as HTMLInputElement).value);
        if (value >= min && value <= max) this._update((d) => (d[key] = value));
      }}
    />`;
    return html`<section class="card settings">
      <h2>${this._t("Timing", "Zeiten")}</h2>
      <label class="field">
        <span>${this._t("Fade time for sliders and steps (s)", "Überblendzeit für Regler und Stufen (s)")}</span>
        ${number("default_transition", 0, 60, 0.1)}
      </label>
      <label class="field">
        <span>${this._t("Longest single command during long fades (s)", "Längster Einzelbefehl bei langen Überblendungen (s)")}</span>
        ${number("max_segment", 1, 600, 1)}
      </label>
      <button class="text danger" @click=${this._deleteRoom}>
        <ha-icon icon="mdi:delete-outline"></ha-icon>${this._t("Delete room", "Raum löschen")}
      </button>
    </section>`;
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("hass") && !changed.get("hass") && this.hass && !this._loaded) this._loadRooms();
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      --radius: 14px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: var(--header-height, 56px);
      padding: 0 12px;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, #fff);
      border-bottom: var(--app-header-border-bottom, none);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .toolbar h1 {
      font-size: 1.25rem;
      font-weight: 400;
      margin: 0 0 0 8px;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 16px 16px 96px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }
    main > * {
      min-width: 0;
    }
    h2 {
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 12px;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    :is(button, input, select):focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    input,
    select {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      min-height: 40px;
      box-sizing: border-box;
    }
    input[type="range"] {
      border: none;
      padding: 0;
      background: none;
      accent-color: var(--primary-color);
      min-height: 32px;
    }
    input[type="checkbox"] {
      accent-color: var(--primary-color);
      width: 20px;
      height: 20px;
      min-height: 0;
      margin: 0;
    }
    .filled,
    .outlined,
    .text {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      font-weight: 500;
      white-space: nowrap;
    }
    .filled {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .outlined {
      border: 1px solid var(--divider-color);
      color: var(--primary-color);
    }
    .text {
      color: var(--primary-color);
      padding: 0 8px;
    }
    .danger {
      color: var(--error-color, #db4437);
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex: none;
      color: var(--secondary-text-color);
    }
    ha-icon {
      --mdc-icon-size: 20px;
    }
    .error {
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(219, 68, 55, 0.12);
      color: var(--error-color, #db4437);
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 12px 0 0;
      max-width: 70ch;
    }
    .entity {
      color: var(--secondary-text-color);
      font-size: 0.75rem;
    }

    /* Rooms */
    .rooms {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .room-tab {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 36px;
      padding: 0 16px;
      border-radius: 18px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .room-tab.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .room-tab.add {
      color: var(--primary-color);
      border-style: dashed;
    }
    .create {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .empty {
      background: var(--card-background-color);
      border-radius: var(--radius);
      padding: 32px 24px;
      text-align: center;
    }
    .empty p {
      color: var(--secondary-text-color);
      max-width: 52ch;
      margin: 8px auto 20px;
      line-height: 1.5;
    }

    /* Cards */
    .card,
    .score-card {
      background: var(--card-background-color);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--ha-card-box-shadow, none);
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
    }
    .room-head {
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .room-name {
      font-size: 1.5rem;
      font-weight: 400;
      border: 1px solid transparent;
      background: transparent;
      padding: 4px 8px;
      margin-left: -8px;
      min-width: 0;
      flex: 1 1 200px;
    }
    .room-name:hover,
    .room-name:focus {
      border-color: var(--divider-color);
    }

    /* Score */
    .score {
      display: grid;
      gap: 4px;
    }
    .row {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
    }
    .label {
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track {
      position: relative;
      height: 40px;
      border-radius: 8px;
      background: rgba(127, 127, 127, 0.08);
      touch-action: pan-y;
      cursor: ew-resize;
      user-select: none;
      -webkit-user-select: none;
    }
    .ribbon-track {
      height: 44px;
      overflow: hidden;
    }
    .ribbon {
      position: absolute;
      inset: 0;
    }
    .area {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .bar {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: var(--divider-color);
      pointer-events: none;
    }
    .bar.selected {
      width: 2px;
      margin-left: -0.5px;
      background: var(--primary-color);
    }
    .playhead {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 3px;
      margin-left: -1.5px;
      border-radius: 2px;
      background: var(--primary-text-color);
      pointer-events: none;
    }
    .dot {
      position: absolute;
      width: 14px;
      height: 14px;
      margin: 0 0 -7px -7px;
      border-radius: 50%;
      background: var(--card-background-color);
      border: 2px solid var(--primary-text-color);
      box-sizing: border-box;
      z-index: 1;
    }
    .dot.selected {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
    .ruler {
      position: relative;
      height: 28px;
    }
    .marker {
      position: absolute;
      bottom: 0;
      transform: translateX(-50%);
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 12px;
      color: var(--secondary-text-color);
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .marker.end {
      transform: translateX(-100%);
    }
    .marker.selected {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .scale {
      position: relative;
      height: 18px;
      font-size: 0.6875rem;
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .scale span {
      position: absolute;
      transform: translateX(-50%);
    }
    .scale span:first-child {
      transform: none;
    }
    .scale span:last-child {
      transform: translateX(-100%);
    }
    .score-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .playhead-value {
      margin-left: auto;
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color);
    }

    /* Step */
    .step-head {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .field {
      display: grid;
      gap: 4px;
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
    }
    .field.grow {
      flex: 1;
      min-width: 0;
    }
    .field.grow input {
      width: 100%;
    }
    .field.position input {
      width: 84px;
    }
    .step-lights {
      display: grid;
      gap: 4px;
      margin-top: 16px;
    }
    .point {
      display: grid;
      grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
      gap: 4px 16px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--divider-color);
    }
    .include {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      min-width: 0;
    }
    .light-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .point:not(.active) .light-name {
      color: var(--secondary-text-color);
    }
    .follow {
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
    }
    .control {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .control input[type="range"] {
      flex: 1;
      min-width: 0;
    }
    .control .value {
      width: 64px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .kelvin input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      height: 10px;
      min-height: 10px;
      border-radius: 5px;
      background: var(--track);
    }
    .kelvin input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid rgba(0, 0, 0, 0.35);
    }
    .kelvin input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid rgba(0, 0, 0, 0.35);
    }
    .color-row {
      grid-column: 2;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .color-row .kelvin {
      flex: 1;
      min-width: 180px;
    }
    .segmented {
      display: inline-flex;
      border: 1px solid var(--divider-color);
      border-radius: 18px;
      overflow: hidden;
    }
    .segmented button {
      height: 32px;
      padding: 0 12px;
      font-size: 0.8125rem;
    }
    .segmented button + button {
      border-left: 1px solid var(--divider-color);
    }
    .segmented button.on {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .swatch {
      position: relative;
      width: 40px;
      height: 32px;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
      cursor: pointer;
    }
    .swatch input {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .step-foot {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    /* Lights */
    .light-list {
      display: grid;
    }
    .light-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color);
    }
    .light-info {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .add-light {
      position: relative;
      margin-top: 12px;
    }
    .add-light input {
      width: 100%;
    }
    .results {
      display: grid;
      margin-top: 4px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .results button {
      display: grid;
      text-align: left;
      padding: 8px 12px;
    }
    .results button + button {
      border-top: 1px solid var(--divider-color);
    }
    .results button:hover {
      background: rgba(127, 127, 127, 0.1);
    }

    /* Settings */
    .settings {
      display: grid;
      gap: 12px;
      justify-items: start;
    }
    .settings .field input {
      width: 120px;
    }

    /* Save bar */
    .savebar {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 20px;
      border-radius: 28px;
      background: var(--card-background-color);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
      border: 1px solid var(--divider-color);
      z-index: 3;
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
    }
    .savebar span {
      margin-right: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 600px) {
      main {
        padding: 12px 12px 96px;
      }
      .row {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
      }
      .row .label:empty {
        display: none;
      }
      .ruler-row .label,
      .ruler-scale .label {
        display: none;
      }
      .point {
        grid-template-columns: minmax(0, 1fr);
      }
      .color-row {
        grid-column: 1;
      }
      .step-head {
        flex-wrap: wrap;
      }
      .savebar span {
        display: none;
      }
    }
  `;
}

if (!customElements.get("crescendo-panel")) customElements.define("crescendo-panel", CrescendoPanel);
