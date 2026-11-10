# Changelog

## 0.1.0b7

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- **Button position: Bottom** put the buttons beside the control on wide cards. Bottom now means bottom; only **Matching the design** moves them beside the control on wide cards.
- A chosen color skipped every light set apart by hand. It now reaches those lights too, and they keep their brightness. **Back to the stops** returns their color as well.

### Changed

- On the columns design, a single light's name under its column opens the light's own controls, to give it its own color.
- The color dots only appear where the control does not already show the lights' colors, so not on the columns design and not with **Current light colors**.
- Clearer names and hints in the card editor: the control colors are now **Light at each position** and **Current light colors**, each with a line that says what it shows, and the color selection says which lights it colors.

## 0.1.0b6

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- Switching on with only a color while the object was fading off let it go off anyway. It now switches back on.
- Switching off at once while all lights were already off by hand kept a chosen color for the next switch-on.
- A plain on/off light switched on by hand showed as off in the columns and in the real colors.
- The card blended colors in plain RGB, while the lights blend color temperatures in mireds and colors in CIE xy. Columns, gradients and real colors now show what the lights show between two stops. A stop inserted on the setup page also gets the value the lights pass through there.

### Changed

- During a fade, the real colors repaint about ten times a second instead of on every frame, and the card looks up each light on the curve once per frame. This spares slow wall tablets.
- Cards shown to users without admin rights no longer receive the object's device actions, which a card does not need.

## 0.1.0b5

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Changed

- **Current light colors, without a gradient** no longer jumps. It still shows the lights' colors side by side, but takes them from the curve at the shown position, like the columns, instead of from the lights' reports, which arrive only about once per second. Each color is as wide as its light is bright, neighbors blend softly, and a light set by hand shows its own color.
- Buttons beside the control grow to its height, so few buttons leave no gap below them. With many buttons, the columns, a fader or the channels grow to the buttons' height instead of leaving gaps above and below the slider.

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
