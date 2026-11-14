# Changelog

## 0.2.0b5

Reload the browser or app once after updating so the page loads anew.

### Changed

- **A point's white tone and color are set on gradient bars**, like in the card: brightness, white tone with the light's own range, color and saturation. A tap on a bar chooses between white tone and color; the arrow keys move a bar's mark too. A dot beside the name shows the result.
- **Devices are found by search.** Under Devices a search field and kind chips lead to the entity, each result showing its kind, room, current state and value, and offering **Course** and **Threshold** directly. Devices already in the object are marked.
- The sidebar option says what it does: **Remove this settings page from the sidebar**, with the ways back named before and after.

## 0.2.0b4

Restart Home Assistant after updating, then reload the browser or app once so the card and the page load anew.

### Added

- The card can hide the names on buttons that have an icon. A button without an icon keeps its name.
- The sidebar entry can be removed on the setup page under **Behavior**, after a question, and added again. The page stays reachable through **Configure** on an object under Devices & services, which links straight to it, and through the card editor.

### Changed

- **The setup page is rearranged.** The object is chosen in the header, with **New object** as the last entry. A jump bar on the left leads to five sections: **Lights**, each with what it shows in view and the fade and slider behavior under **More**; **Stops**, with the chart and the lanes, where a tapped point opens its settings right beside it; **Standard buttons**; **Devices**, in a section of their own; and **Behavior** with speed, switching on and the slider. A bar at the bottom shows the position, switches the preview and starts test runs, on every part of the page.
- The modes of a light are named by what it shows: on/off only, dimming only, white tones, colors, colors and white tones.

## 0.2.0b3

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- Four scene buttons beside the control stood in a 2×2 block, mirrored. They now stack in one column like the other buttons.
- The setup page showed plain text fields for icons when Home Assistant had not loaded its icon picker yet. The setup page and the card editor now load the picker themselves and show it as soon as it is there.
- Settings of earlier versions that no longer exist, such as the light glow, are dropped from a card's configuration when it is saved.

### Changed

- Buttons beside the control are stacked with plain CSS instead of per-button ordering, which is lighter on slow devices.

## 0.2.0b2

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- Icons for buttons can be chosen again, in the card editor and for the standard buttons on the setup page. Home Assistant's icon picker reports its choice only on itself, and Crescendo listened one level higher, so the choice never arrived and the editor's save button stayed off.

### Changed

- Beside the control, buttons stand like a fader: the last one at the top, the first at the bottom, and the power button below them all. Above or below the control they keep their order from left to right, with the power button first.
- The light glow around and inside the card is gone, together with its setting.

## 0.2.0b1

The same as 0.1.0b10, under a number the Marketplace offers. Home Assistant's Marketplace sorts versions as text, so it placed 0.1.0b10 below 0.1.0b9 and never offered it. Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

## 0.1.0b10

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Changed

- **Speed instead of durations:** the setup page sets how long 0 to 100 % takes, and every fade without a duration takes its share: from 80 to 100 % a fifth. This applies to buttons, switching on and off, taps on a card's slider, and tiles or voice commands. A card can set its own speed. Buttons no longer have durations of their own. A duration given by an automation or another integration, such as Cloudless Maestro, counts exactly as before. The former **Fade without a duration** becomes this speed and keeps its value.
- **One reset:** a single **Reset** brings single lights and a chosen color back to the stops. Its button sits beside the slider by default, or in the header, and fades in only while something differs. It no longer covers the card when there is no header.
- The light window follows what the lights report while it is open, so **Reset this light** appears as soon as a light differs.
- The setup page's standard buttons get an icon, which cards use unless they set their own.
- The light glow also shows inside the card, as a soft light from the top, where no dashboard layout can cut it off.
- Card editor: the slider choices drop the word „Wide“, the option to show values on buttons is gone, and the reset button's place can be chosen.

### Fixed

- Icons chosen in the card editor were not saved: the editor rebuilt itself while the icon picker was still in use.

## 0.1.0b9

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Fixed

- The power button among the buttons failed with an error.

### Changed

- A light's name opens its settings: brightness, and white tone, color and saturation as far as its mode allows. Lights that only dim or switch get them too. A combined column lists its lights, each with its own brightness and settings, and a light set apart can be reset there alone.
- Resetting is a small icon that fades in only while something differs from the stops. It opens a menu with **Reset dimming** and **Reset colors**, so it takes no room on the card.
- Tinted buttons show every light color at their position side by side, and follow a chosen color at once.
- Buttons show an icon only when one was chosen for them. Icons are no longer guessed from the name.
- Combined columns show their name without the count, for example „Waschtisch“. The settings window says how many lights it holds.
- At a button's position the value shows the button's name again. The editor can switch this off.
- A slider or a column pulled below 3 % switches off instead of staying at 1 or 2 %.
- Columns can dim, open a light's settings, do both, or only show. With settings only, a small gear marks the columns.
- Card editor: one setting for the slider and its look, the color selection as one choice with **Off**, **Add your own button** instead of **Button only for this card**. The option to show the duration on buttons is gone.

## 0.1.0b8

Restart Home Assistant after updating, then reload the browser or app once so the card loads anew.

### Added

- **Each light as a stripe**, the new default for what the control shows: one thin stripe per light along the scale, with its color and brightness at every position. On the dial they are rings, on the vertical fader they stand side by side. **Room light as a gradient**, the dashboard color and an own color stay available. Cards set to the former **Current light colors** get the stripes.
- A light's name under the columns or in the window of single lights opens a color choice for that light alone. It offers only what the light's mode allows: white tones, colors or both, and nothing for lights that only dim. Combined lights such as „Waschtisch (3)“ get it too.
- Buttons can show their light: tinted with the color and brightness they switch on, with an icon, with a small preview per light, or plain. Tinted with an icon is the default. A button without an icon of its own gets one that fits its name.
- The header can be switched off part by part: name and status, value, power button. Without any part there is no header. The power button can also sit among the buttons or left of the slider.
- The card editor has a button that opens the object in Crescendo's setup page.

### Changed

- **Reset dimming** and **Reset colors** replace **Reset single lights** and **Back to the stops**, side by side. Dimming brings single lights' brightness back to the stops, colors the chosen color and single lights' own colors. A light with a color of its own keeps it when a color is chosen for the whole object.
- The color selection follows the finger while you drag, like dimming.
- The color selection offers what the lights can show by their mode. If they can show both, the editor lets you offer white tones, colors or both.
- The card editor is arranged in sections: connection and design, header, control, buttons, colors, single lights.
- The power button matches the buttons' shape and stands out in the dashboard's color.
- Columns glide to a new value or color instead of jumping, for example after a reset.
- The value no longer turns into a button's name at its position; the lit button already shows it.

### For other integrations

- New attributes `deviating_brightness` and `deviating_color` say why a light is in `deviating`. `reset_color` also ends single lights' own colors.

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
