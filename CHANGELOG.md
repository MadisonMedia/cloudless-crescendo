# Changelog

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
