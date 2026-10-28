# Cloudless Crescendo – Multi-Light Dimming Curves

[![Validate](https://github.com/MadisonMedia/cloudless-crescendo/actions/workflows/validate.yml/badge.svg)](https://github.com/MadisonMedia/cloudless-crescendo/actions/workflows/validate.yml)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)

**One slider, many lights.** Cloudless Crescendo gives a room a single 0–100 scale. You decide
what every light does along that scale: which one comes first, how bright it gets, and which
color or color temperature it has. Moving the slider – or fading over an hour for a wake-up
light – plays the lights in exactly that staggered order.

🇩🇪 [Deutsche Anleitung](README.de.md)

- Staggered dimming: lights join one after another, each with its own brightness curve
- Colors and color temperatures per step, smoothly blended in between
- Fades of any length (seconds to hours) that follow the curve the whole way
- Any new command interrupts a running fade cleanly
- Works with every Home Assistant light; few commands, friendly to Thread/Zigbee networks

Part of the *cloudless* family, alongside cloudless-mixtape.

## How it works

```
position   0 ──────── 20 ──────── 40 ──────── 60 ──────── 100
Floor      off ─────▶ 50 % ─────▶ 100 % ─────────────────── 100 %
Shower     off ───────────────────▶ 100 % ───────────────── 100 %
                       (starts at 20)
Mirror     off ───────────────────────────────▶ 50 % ────── 50 %
                                   (starts at 40)
```

- **0 is always everything off.**
- A light that is first mentioned at a step **starts fading in at the previous step**.
  That is what creates the staggered effect.
- Between steps, values are interpolated (brightness linearly, color temperature in mireds,
  colors in CIE xy – the same way the lights themselves transition).
- After its last step, a light keeps its value up to 100.
- A step without brightness keeps the previous brightness; a step without color keeps the
  previous color.

A fade is split at every step, and each light gets one command per part with a matching
transition. So a one-hour wake-up fade really follows the curve, while sending only a handful
of commands. Long parts are split into pieces of at most `max_segment` seconds so that the
slider keeps moving and the fade can be stopped at any time.

## Installation

### HACS

1. HACS → ⋮ → *Custom repositories* → add `https://github.com/MadisonMedia/cloudless-crescendo`
   as type *Integration*.
2. Install **Cloudless Crescendo** and restart Home Assistant.

### Manual

Copy `custom_components/cloudless_crescendo` into your `config/custom_components` folder and
restart Home Assistant.

## Configuration

Configuration is YAML for now (a graphical editor is planned). Add one entry per room under
`light:`:

```yaml
light:
  - platform: cloudless_crescendo
    name: Bathroom
    unique_id: crescendo_bathroom
    steps:
      20:
        light.bathroom_floor: { brightness: 50, kelvin: 2700 }
      40:
        light.bathroom_floor: 100
        light.bathroom_shower: 100
      60:
        light.bathroom_mirror: { brightness: 50, kelvin: 3000 }
        light.bathroom_ceiling_strip: { brightness: 30, rgb: [255, 120, 40] }
```

| Option | Default | Description |
| --- | --- | --- |
| `name` | required | Name of the virtual room light. |
| `unique_id` | – | Recommended, makes the entity editable in the UI. |
| `default_transition` | `1.5` | Seconds used when the light is changed without a transition (e.g. the dashboard slider). |
| `max_segment` | `30` | Longest single command in seconds during long fades. |
| `steps` | required | Position (1–100) → lights → value. |

A value is either a plain brightness in percent, or a mapping with:

| Key | Description |
| --- | --- |
| `brightness` | 0–100 %. `0` turns the light off at that step. |
| `kelvin` | Color temperature, e.g. `2700`. |
| `rgb` | Color, e.g. `[255, 120, 40]`. |
| `xy` | Color in CIE xy, e.g. `[0.55, 0.4]`. |

Use only one of `kelvin`, `rgb` and `xy` per value. Colors are adapted to each light: a
warm/cold-only light receives the nearest color temperature, a dimmable-only light just the
brightness.

Changes are applied with **Developer tools → YAML → Cloudless Crescendo**, or the
`cloudless_crescendo.reload` action – no restart needed.

A complete example for a bathroom with seven lights is in [`examples/bathroom.yaml`](examples/bathroom.yaml).

## Usage

The room appears as a normal light (e.g. `light.bathroom`). Its brightness *is* the position on
the scale, so a tile card with a brightness slider is all you need.

### Actions

**`cloudless_crescendo.fade_to`** – fade to a position over any duration.

```yaml
action: cloudless_crescendo.fade_to
target:
  entity_id: light.bathroom
data:
  position: 40
  duration: 3 # seconds, or { minutes: 60 }
```

**`cloudless_crescendo.stop`** – stop a running fade and keep the lights where they are.

`light.turn_on` with `brightness_pct` and `transition`, and `light.turn_off`, work as well.
Turning the room on without a brightness returns to the last position.

### Dashboard buttons

```yaml
type: button
name: Morning
icon: mdi:weather-sunset-up
tap_action:
  action: perform-action
  perform_action: cloudless_crescendo.fade_to
  target:
    entity_id: light.bathroom
  data:
    position: 40
    duration: 3
```

### Wake-up light

```yaml
automation:
  - alias: Bathroom wake-up light
    triggers:
      - trigger: time
        at: "06:00:00"
    actions:
      - action: cloudless_crescendo.fade_to
        target:
          entity_id: light.bathroom
        data:
          position: 80
          duration:
            hours: 1
```

### Attributes

| Attribute | Description |
| --- | --- |
| `position` | Current position (0–100), updated while fading. |
| `fading` | `true` while a fade is running. |
| `target_position` | Target of the running fade. |
| `fade_end` | Seconds until the running fade ends. |
| `last_on_position` | Position used by a plain `turn_on`. |
| `entity_id` | The controlled lights. |

## Good to know

- Most dashboard sliders only send a value when you let go. The room then fades to that value
  over `default_transition`, following the curve.
- A fade that is running while Home Assistant restarts is not resumed; the position is restored.
- If you change a controlled light by hand, the next command to the room brings it back in line.

## Roadmap

- Graphical editor for steps and colors
- Color cycling ("rolling colors") as a step value for RGB lights
- Resuming fades after a restart

## Development

```bash
python -m venv .venv && .venv/bin/pip install -r requirements_test.txt
.venv/bin/ruff check . && .venv/bin/ruff format --check .
.venv/bin/pytest
```

## License

[MIT](LICENSE)
