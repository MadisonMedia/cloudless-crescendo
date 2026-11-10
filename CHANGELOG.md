# Changelog

## 0.1.0b4

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- During a fade, the card's progress bar, time and light columns jumped back each time a single light reported, and only reached the target when the fade had ended. This came with 0.1.0b2, where the card started showing the lights' real colors.

## 0.1.0b3

Restart Home Assistant after updating.

### Added

- Attributes for other integrations that show which command decides the object's state: `command`, `command_source`, `command_user_id` and `command_at`. They stay the same for every state of a command and survive a restart. `crescendo_api` gives the version of this interface, currently 1.
- `fade_to` and `stop` take an optional `source`, shown unchanged in `command_source`.
- `fade_to` takes `devices: false` to leave thresholds and following values alone, for example for a short dip before switching off. The next command with devices catches up: a threshold acts once if the target lies on its other side, and a following value moves on from the value it last got.
- The attribute `external_on_position` shows the position set with `set_on_position`.

### Changed

- The states of a long fade keep the context of the command that started it, so the logbook names the right user.
- A drag on a card's slider no longer passes its user on to later commands to single lights.
- `set_on_position` refuses 0, which would have made switching on switch off.

### Fixed

- A restart forgot a switch-on position set with `set_on_position` and a color chosen by hand. Both survive now.
- Switching on with only a color went close to the switch-on position, and now goes exactly there.

## 0.1.0b2

Restart Home Assistant after updating, then reload open dashboards.

### Added

- The columns of all lights can open in a window from any design, to set single lights apart from the object. The card settings choose how it opens: a button in the card's header (the default), a tap on the card, both, or not at all.
- The name of a single light in that window opens its normal controls, for example to choose its color.
- The card shows the active light colors as dots when a color is chosen or a light was changed by hand. A setting shows them all the time, and the window of single lights always names them.
- A setting for the dial: a wedge that grows where the room gets brighter, or an even ring. Both themes now use the same shape.
- A color bar on the card replaces the color field, with whites on the left and colors on the right.
- A button's name replaces the value at that button's position. Long names shrink to fit.

### Fixed

- The object reported a mix of its lights' colors while a color was chosen. Where white lights outweighed the lights that follow the color, Home Assistant and the card showed white instead of the chosen color.
- The card's controls kept their old colors until the page was reloaded after a color was chosen or reset.
- **Current light colors, without a gradient** (formerly **Current light color, flat**) showed one mixed color that no light had. It now shows the lights' real colors side by side.
- A column jumped to the object's position when touched, and back to the old value when released.
- The card's settings closed the advanced section after each change and listed options that had no effect on the chosen design.
- The photo upload and the mixer channels were hidden in the advanced section.
- The logo looked uneven in Home Assistant, because the font was not available there.

### Changed

- Fades on the card and the setup page now start and end softly up to 15 seconds. Longer fades stay even, so the display keeps matching the lights. The lights themselves are unchanged and still fade natively.

## 0.1.0b1

First public beta, written from scratch. Versions before it are not compatible, so remove any older Crescendo first and set up your objects again.

### Added

- Objects that dim several lights along stops you design, with an explicit brightness and color for every light at every stop.
- Native fades through `light.turn_on`, and a real-time slider at 4 updates per second by default.
- Per-light settings for color mode, fade mode and slider behavior.
- Volume, temperature and other values following a range of the scale, and actions at thresholds.
- A chosen color that overrides the stops until you switch off or return to them.
- One card with eight designs, for Crescendo objects and for other devices. The designs adapt to light and dark themes.
- A setup page with chart, table, undo and preview on the lights.
- Diagnostics from normal operation, and a connection test that asks before it runs.
- German and English.

### Known limits

- A slider dragged by hand can stutter on Thread, because the network shares its capacity among all lights.
- Some lights jump when changing between color and white. That comes from their firmware.
- Some lights report a fade far later than it looks. If a light really reaches its target too late, set its fade to **On time**.
