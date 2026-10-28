# Cloudless Crescendo – Lichtkurven für mehrere Leuchten

**Ein Regler, viele Leuchten.** Cloudless Crescendo legt die Leuchten eines Raums auf eine Skala
von 0 bis 100. Du bestimmst, was jede Leuchte entlang dieser Skala tut: welche zuerst kommt, wie
hell sie wird und welche Farbe oder welches Weiß sie hat. Ziehst du den Regler hoch – oder lässt
du über eine Stunde zum Aufwachen hochdimmen –, blenden die Leuchten genau in dieser versetzten
Reihenfolge ein.

🇬🇧 [English documentation](README.md)

## Installation

1. HACS → ⋮ → *Benutzerdefinierte Repositories* → `https://github.com/MadisonMedia/cloudless-crescendo`
   als *Integration* hinzufügen.
2. **Cloudless Crescendo** installieren und Home Assistant neu starten.
3. *Einstellungen → Geräte & Dienste → Integration hinzufügen → Cloudless Crescendo*: Raum benennen
   und Leuchten wählen.
4. **Crescendo** in der Seitenleiste öffnen und die Stufen einrichten.

## Der Editor

Jede Leuchte ist eine Spur; ihre Helligkeit über die Skala ist als Fläche in ihrer Farbe
gezeichnet. Die Spur **Raum** oben zeigt, wie der Raum insgesamt aussieht.

- Tippe oder ziehe auf die Spuren, um die Abspielposition zu bewegen. Mit **Vorschau an den
  Leuchten** folgen deine echten Leuchten – gespeichert wird dabei nichts.
- **Stufe bei …** legt eine Stufe an der Abspielposition an. Stufen wählst du über ihre Marke oder
  einen Punkt.
- Pro Leuchte und Stufe: einschalten, Helligkeit setzen und **Beibehalten** (Farbe läuft weiter),
  **Weiß** (Farbtemperatur) oder **Farbe** wählen. Leuchten ohne Haken folgen einfach ihrer Kurve.
- Gib einer Stufe einen **Namen** (z. B. *Morgen*), dann bekommt sie auf der Karte einen Button.
- **Speichern** wirkt sofort, ohne Neustart.

**Regeln der Kurve:** 0 ist immer alles aus. Eine Leuchte, die an einer Stufe zum ersten Mal
vorkommt, wird ab der vorherigen Stufe eingeblendet – daraus entsteht das versetzte Dimmen.
Zwischen den Stufen wird weich überblendet; nach ihrer letzten Stufe behält eine Leuchte ihren
Wert bis 100.

**Weiß und Farbe bei RGBCCT-Leuchten:** Weiß kommt aus den Weiß-LEDs, Farbe aus den RGB-LEDs, und
der Wechsel dazwischen ist ein sichtbarer Sprung. Mit **Automatisch** mischt eine Leuchte, die
irgendwo in ihrer Kurve eine Farbe nutzt, auch ihr Weiß aus Farben – so wechselt sie nie mitten
in einer Überblendung. Pro Leuchte lässt sich *Immer Farben mischen* oder *Immer Weiß-LEDs* wählen.

## Die Dashboard-Karte

Karte **Crescendo** über die Kartenauswahl hinzufügen (oder `type: custom:crescendo-card`):

```yaml
type: custom:crescendo-card
entity: light.bad
```

Optionen: `name`, `show_lanes` (Spur pro Leuchte, Standard an), `live` (Leuchten folgen beim
Ziehen, Standard an), `step_duration` (Überblendzeit beim Tippen auf eine Stufe) und `buttons`
für zusätzliche Buttons, z. B. `[{position: 30, name: Lesen, icon: mdi:book}]`.

Ziehe irgendwo auf dem Raum; tippe auf einen Stufennamen, um dorthin zu blenden. Bei langen
Überblendungen wandert die Position von selbst, und die Karte zeigt Ziel und Restzeit.

Der Raum ist außerdem ein normales Licht (z. B. `light.bad`): Seine Helligkeit *ist* die Position.
Kacheln, Sprachassistenten und Automationen funktionieren wie gewohnt.

## Aktionen

```yaml
action: cloudless_crescendo.fade_to
target:
  entity_id: light.bad
data:
  position: 80
  duration:
    hours: 1
```

`cloudless_crescendo.stop` hält alle Leuchten auf dem aktuellen Stand. `light.turn_on` mit
`brightness_pct` und `transition` sowie `light.turn_off` funktionieren ebenfalls.

## Was im Hintergrund passiert

Jede Leuchte bekommt nur an ihren eigenen Stufen einen Befehl, mit einer Übergangszeit bis zur
nächsten Stufe. Lange Abschnitte werden geteilt (Standard 30 s), damit sich jede Überblendung
jederzeit stoppen lässt. Ausblenden läuft über die minimale Helligkeit statt über `turn_off`
(Matter schaltet sonst sofort hart aus), Einblenden beginnt bei der minimalen Helligkeit in der
Zielfarbe, und Folgebefehle gehen einen Moment früher raus, damit keine Leuchte zwischendurch
stehen bleibt. Laufende Überblendungen überstehen einen Neustart von Home Assistant.

## Umstieg von YAML (0.1)

YAML-Räume unter `light:` werden beim ersten Start automatisch übernommen und behalten ihre
Entitäts-ID. Ein Reparatur-Hinweis bittet dich danach, das YAML zu entfernen; ab dann bearbeitest
du den Raum im Editor.

## Fehlerbehebung

- **Die Karte zeigt direkt nach der Installation „Custom element doesn't exist“**: Seite einmal
  neu laden.
- **Eine Leuchte reagiert verzögert oder springt**: Unter *Einstellungen → System → Protokolle*
  stehen Warnungen von `cloudless_crescendo` mit dem Namen der Leuchte.
