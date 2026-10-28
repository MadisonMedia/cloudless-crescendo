# Cloudless Crescendo – Lichtkurven für mehrere Leuchten

**Ein Regler, viele Leuchten.** Cloudless Crescendo gibt einem Raum eine Skala von 0 bis 100.
Du legst fest, was jede Leuchte entlang dieser Skala tut: welche zuerst kommt, wie hell sie
wird und welche Farbe oder Farbtemperatur sie hat. Ziehst du den Regler hoch – oder lässt du
über eine Stunde zum Aufwachen hochdimmen –, blenden die Leuchten genau in dieser versetzten
Reihenfolge ein.

🇬🇧 [English documentation](README.md)

## So funktioniert's

- **0 ist immer alles aus.**
- Eine Leuchte, die an einer Stufe zum ersten Mal vorkommt, **wird ab der vorherigen Stufe
  eingeblendet**. Daraus entsteht das versetzte Dimmen.
- Zwischen den Stufen wird weich überblendet: Helligkeit linear, Farbtemperatur in Mired,
  Farben im xy-Farbraum – so, wie die Leuchten selbst überblenden.
- Nach ihrer letzten Stufe behält eine Leuchte ihren Wert bis 100.
- Fehlt an einer Stufe die Helligkeit oder Farbe, gilt die vorherige.

Eine Überblendung wird an jeder Stufe aufgeteilt; jede Leuchte bekommt pro Abschnitt einen
Befehl mit passender Übergangszeit. Dadurch folgt auch eine einstündige Aufwach-Überblendung
exakt der Kurve, mit sehr wenigen Befehlen im Funknetz.

## Installation

HACS → ⋮ → *Benutzerdefinierte Repositories* → `https://github.com/MadisonMedia/cloudless-crescendo`
als *Integration* hinzufügen, **Cloudless Crescendo** installieren, Home Assistant neu starten.

## Konfiguration

Vorerst per YAML unter `light:` (ein grafischer Editor ist geplant):

```yaml
light:
  - platform: cloudless_crescendo
    name: Bad
    unique_id: crescendo_bad
    steps:
      20:
        light.bad_boden: { brightness: 50, kelvin: 2700 }
      40:
        light.bad_boden: 100
        light.bad_duschnische: 100
      60:
        light.bad_spiegel: { brightness: 50, kelvin: 3000 }
        light.bad_deckenstrip: { brightness: 30, rgb: [255, 120, 40] }
```

Ein Wert ist entweder eine Helligkeit in Prozent oder enthält `brightness` (0–100, `0` = aus),
und optional genau eins von `kelvin`, `rgb` oder `xy`. Weitere Optionen: `default_transition`
(Sekunden für den Dashboard-Regler, Standard 1,5) und `max_segment` (längster Einzelbefehl bei
langen Überblendungen, Standard 30 s).

Änderungen übernimmst du unter **Entwicklerwerkzeuge → YAML → Cloudless Crescendo** oder mit
der Aktion `cloudless_crescendo.reload` – ohne Neustart.

Ein vollständiges Beispiel fürs Bad liegt in [`examples/bathroom.yaml`](examples/bathroom.yaml).

## Benutzung

Der Raum erscheint als normales Licht (z. B. `light.bad`). Seine Helligkeit *ist* die Position
auf der Skala – eine Kachel mit Helligkeitsregler genügt.

**Auf eine Position fahren** (für Buttons und Automationen):

```yaml
action: cloudless_crescendo.fade_to
target:
  entity_id: light.bad
data:
  position: 40
  duration: 3 # Sekunden, oder { minutes: 60 }
```

**Stoppen:** `cloudless_crescendo.stop` hält alle Leuchten auf dem aktuellen Stand.

**Button im Dashboard:**

```yaml
type: button
name: Morgen
icon: mdi:weather-sunset-up
tap_action:
  action: perform-action
  perform_action: cloudless_crescendo.fade_to
  target:
    entity_id: light.bad
  data:
    position: 40
    duration: 3
```

**Aufwachlicht:**

```yaml
automation:
  - alias: Bad Aufwachlicht
    triggers:
      - trigger: time
        at: "06:00:00"
    actions:
      - action: cloudless_crescendo.fade_to
        target:
          entity_id: light.bad
        data:
          position: 80
          duration:
            hours: 1
```

## Gut zu wissen

- Die meisten Dashboard-Regler senden erst beim Loslassen. Der Raum fährt dann in
  `default_transition` entlang der Kurve dorthin.
- Eine laufende Überblendung wird nach einem Neustart von Home Assistant nicht fortgesetzt;
  die Position bleibt erhalten.
