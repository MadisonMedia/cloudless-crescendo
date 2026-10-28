# Cloudless Crescendo – Multi-Light Dimming Curves

[![Validate](https://github.com/MadisonMedia/cloudless-crescendo/actions/workflows/validate.yml/badge.svg)](https://github.com/MadisonMedia/cloudless-crescendo/actions/workflows/validate.yml)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)

**One slider, many lights.** Cloudless Crescendo puts the lights of a room on a single scale from
0 to 100. You decide what every light does along that scale: which one comes first, how bright it
gets and which color or white it has. Moving the slider – or fading over an hour for a wake-up
light – plays the lights in exactly that staggered order.

🇩🇪 [Deutsche Anleitung](README.de.md)

- **Editor in the sidebar**: draw the room as a score of lights, with live preview on the real lights
- **Dashboard card**: one playhead over the room's light, follows your finger, buttons for named steps
- **Staggered fades** of any length that follow the curve all the way, interruptible at any time
- **Smooth on real hardware**: few commands, soft fade-outs, no jumps between white and color LEDs
- Fades that are running survive a Home Assistant restart

Part of the *cloudless* family, alongside cloudless-mixtape.

## Installation

1. HACS → ⋮ → *Custom repositories* → add `https://github.com/MadisonMedia/cloudless-crescendo`
   as type *Integration*.
2. Install **Cloudless Crescendo** and restart Home Assistant.
3. *Settings → Devices & services → Add integration → Cloudless Crescendo*: name the room and pick
   its lights.
4. Open **Crescendo** in the sidebar and set up the steps.

## The editor

Every light is a lane; its brightness over the scale is drawn as an area in its own color. The
**Room** lane on top shows what the room as a whole looks like.

- Tap or drag on the score to move the playhead. With **Preview on the lights** switched on,
  your real lights follow the playhead – nothing is saved yet.
- **Step at …** adds a step at the playhead. Select a step via its marker or a dot.
- For each light in a step: switch it on for this step, set brightness, and choose **Keep**
  (color continues), **White** (color temperature) or **Color**. Lights that are not part of a
  step simply follow their curve.
- **Name** a step (e.g. *Morning*) to get a button for it on the card.
- **Save** applies the room immediately; no restart.

### How the curve works

- **0 is always everything off.**
- A light that first appears at a step **starts fading in at the previous step**. That is what
  creates the staggered effect.
- Between steps values are blended (brightness linearly, color temperature in mireds, colors in
  CIE xy – the same way lights transition themselves).
- After its last step a light keeps its value up to 100.

### White and color on RGBCCT lights

An RGBCCT light makes white with its white LEDs, and colors with its RGB LEDs. Switching between
the two is a visible jump. With **Automatic** (default), a light that uses a color anywhere in its
curve mixes its whites from RGB as well, so it never switches mid-fade. You can force *Always mix
colors* or *Always white LEDs* per light in the editor.

## The dashboard card

Add the card **Crescendo** from the card picker (or `type: custom:crescendo-card`).

```yaml
type: custom:crescendo-card
entity: light.bathroom
```

| Option | Default | Description |
| --- | --- | --- |
| `entity` | required | The room light. |
| `name` | room name | Card title. |
| `show_lanes` | `true` | Show a thin lane per light under the room. |
| `live` | `true` | Lights follow while you drag. Off: they fade when you let go. |
| `step_duration` | room default | Fade time in seconds when tapping a step. |
| `buttons` | – | Extra buttons: `[{position: 30, name: Reading, icon: mdi:book}]`. |

Drag anywhere on the room; tap a step name to fade there. During long fades the playhead moves on
its own and the card shows the target and remaining time.

The room is also a normal light (e.g. `light.bathroom`): its brightness *is* the position, so tile
cards, voice assistants and automations work as usual.

## Actions

**`cloudless_crescendo.fade_to`** – fade to a position over any duration.

```yaml
action: cloudless_crescendo.fade_to
target:
  entity_id: light.bathroom
data:
  position: 80
  duration:
    hours: 1
```

**`cloudless_crescendo.stop`** – stop a running fade and keep the lights where they are.

`light.turn_on` with `brightness_pct` and `transition`, and `light.turn_off`, work as well. Turning
the room on without a brightness returns to the last position.

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

## Under the hood

A fade is planned per light. Each light only gets a command at its own steps, with a transition
that lasts until its next step, so even a one-hour fade needs only a few commands. Long legs are
split (default 30 s) so the fade can be stopped at any time. Three details keep it smooth on Thread,
Zigbee and Wi-Fi lights alike:

- **Fading out** never relies on `turn_off` with a transition (Matter, for example, switches off
  instantly). Lights dim to their minimum and switch off when they arrive.
- **Fading in** starts at the minimum in the target color, so nothing flashes up at an old
  brightness or color.
- **Follow-up commands** are sent a moment early, so lights never pause between legs.

Lights without transition support get small software steps instead.

## Attributes

| Attribute | Description |
| --- | --- |
| `position` | Current position (0–100). |
| `fading`, `target_position`, `fade_remaining` | Progress of a running fade. |
| `steps` | Positions and names of the steps. |
| `entity_id` | The controlled lights. |

## Coming from YAML (0.1)

YAML rooms under `light:` are imported automatically on the first start, keeping their entity ID.
A repair notice then asks you to remove the YAML; from then on the room is edited in the editor.

## Troubleshooting

- **The card shows "Custom element doesn't exist" right after installing**: reload the page once.
- **A light reacts late or jumps**: check *Settings → System → Logs* for warnings from
  `cloudless_crescendo`; each failing command is logged with the light's name.

## Development

```bash
python -m venv .venv && .venv/bin/pip install -r requirements_test.txt
.venv/bin/ruff check . && .venv/bin/pytest
cd frontend && npm ci && npm run build   # rebuilds the card and editor into custom_components
```

## License

[MIT](LICENSE)
