# Cloudless Crescendo

Eine Home-Assistant-Integration, die mehrere Leuchten als ein Objekt dimmt, entlang einer Abfolge, die du selbst festlegst. In jeder Stufe auf einer Skala von 0 bis 100 hat jede Leuchte ihre eigene Helligkeit und Farbe. Dazwischen wird fließend überblendet. Beim Runterdimmen läuft dieselbe Abfolge rückwärts.

[English version](README.md)

![Die Crescendo-Karte in acht Designs](https://raw.githubusercontent.com/MadisonMedia/cloudless-crescendo/main/docs/cards-de.png)

![Ein Objekt einrichten: Jede Leuchte hat in jeder Stufe einen Wert](https://raw.githubusercontent.com/MadisonMedia/cloudless-crescendo/main/docs/setup-de.png)

## Was du bekommst

- **Ein Objekt, viele Leuchten.** In Home Assistant ist das Objekt ein normales Licht. Kacheln, Sprachbefehle („50 Prozent“) und Automationen funktionieren wie gewohnt, und seine Helligkeit ist die Position auf der Skala.
- **Nichts Verstecktes.** Jede Leuchte hat in jeder Stufe einen Wert. Du siehst alle im Diagramm oder in der Tabelle und änderst sie dort.
- **Native Überblendungen.** Zeitgesteuertes Dimmen nutzt die eigenen Überblendungen der Leuchten über `light.turn_on`. Es läuft dadurch weich und hängt nicht daran, was Home Assistant gerade sonst tut. Nur ein von Hand gezogener Slider sendet Werte in Echtzeit, standardmäßig 4 pro Sekunde.
- **Andere Geräte auf derselben Skala.** Lautstärke und Temperatur können einem Bereich der Skala folgen. Rollos, Heizung oder Musik können an einer Schwelle starten oder stoppen, auf Wunsch mit einer Gegenaktion darunter.
- **Eine Karte, acht Designs.** Raumverlauf, Hochkant, Drehregler, Szenen, Säulen für einzelne Leuchten, Diagramm, ein Foto deines Raums mit Lichtpunkten und ein Mischpult für mehrere Geräte. Die Karte funktioniert auch mit anderen Leuchten, Klima, Rollos, Medienplayern, Lüftern, Zahlenwerten und reinen Anzeige-Sensoren.
- **Diagnose.** Reaktionszeiten und Fehler aus dem normalen Betrieb, dazu ein Verbindungstest, der vor dem Start nachfragt.
- **Deutsch und Englisch.**

## Installieren

**Home Assistant 2026.11 oder neuer (Marketplace)**

[![Home Assistant öffnen und dieses Repository im Marketplace zeigen.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=MadisonMedia&repository=cloudless-crescendo&category=integration)

1. Wähle den Button oben, oder gehe zu **Einstellungen → Marketplace** und füge `https://github.com/MadisonMedia/cloudless-crescendo` per Link hinzu. Dafür braucht es eine Verbindung zu GitHub, nach der der Marketplace fragt.
2. Solange Crescendo im Beta-Stadium ist, schalte beim Repository den Schalter für Vorabversionen (Pre-release) ein und installiere es dann. Ohne den Schalter bekommst du den neuesten Stand des Hauptzweigs statt einer nummerierten Version.

**Home Assistant 2026.10 oder älter (HACS)**

1. Öffne in HACS das Menü oben rechts und wähle **Benutzerdefinierte Repositories**.
2. Füge `https://github.com/MadisonMedia/cloudless-crescendo` mit dem Typ **Integration** hinzu.
3. Installiere **Cloudless Crescendo** und starte Home Assistant neu.

Benötigt Home Assistant 2026.2 oder neuer.

## Das erste Objekt anlegen

[![Home Assistant öffnen und die Einrichtung von Crescendo starten.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=cloudless_crescendo)

Gehe zu **Einstellungen → Geräte & Dienste → Integration hinzufügen → Cloudless Crescendo**, gib einen Namen ein und wähle die Leuchten. Danach erscheint **Crescendo** in der Seitenleiste, dort kannst du weitere Objekte anlegen.

## Ein Objekt einrichten

Öffne **Crescendo** in der Seitenleiste.

1. Wähle das Objekt aus, oder gib einen Namen ein und lege ein weiteres an.
2. Füge über die Liste unter dem Diagramm seine Leuchten und Geräte hinzu.
3. Ziehe die Punkte im Diagramm, um die Helligkeit jeder Leuchte einzustellen, und tippe einen Punkt an, um die Farbe zu wählen. Die Zahl unter einer Linie verschiebt die Stufe. Änderungen werden automatisch gespeichert und an den Leuchten gezeigt, solange **Vorschau an den Leuchten** an ist.
4. Lege **Standard-Buttons** an. Neue Karten übernehmen sie als Vorlage.

Um die Karte zu einem Dashboard hinzuzufügen, bearbeitest du das Dashboard, fügst eine Karte hinzu und wählst **Crescendo**. Im Karten-Editor stellst du Design, Reglerfarbe, Buttons und mehr ein.

## Einstellungen pro Leuchte

Schalte **Erweiterte Einstellungen einblenden** ein, dann stehen sie direkt bei jeder Leuchte.

| Einstellung | Möglichkeiten |
| --- | --- |
| Farbe | Nur an/aus, einfarbig dimmen, Weiß (CCT), Farbe (RGB), Farbe + Weiß (RGB+CCT). Angeboten wird nur, was die Leuchte kann. |
| Überblendung | **Weich** (Standard): Die Leuchte überblendet selbst. **Pünktlich**: Falls diese Leuchte zu spät ihr Ziel erreicht, probiere diese Einstellung. Sie läuft dann in kurzen Schritten und kann stärker ruckeln. |
| Am Slider | Automatisch, Gleiten oder Direkt. |

Bei Farbe + Weiß kann eine Leuchte beim Wechsel zwischen beidem flackern, je nach Firmware. Falls das stört, wähle eins davon. Ein weiteres Objekt mit denselben Leuchten kannst du anders einstellen.

## Aktionen

Das Objekt ist ein Licht, also funktioniert `light.turn_on` mit `brightness_pct` und `transition`. Eine einzelne Überblendung ist durch den Wertebereich von Matter auf rund 1 Stunde 49 Minuten begrenzt, längere Fades teilt Crescendo selbst auf.

| Aktion | Zweck |
| --- | --- |
| `cloudless_crescendo.fade_to` | Über eine beliebige Dauer auf eine Position fahren. |
| `cloudless_crescendo.stop` | Ein laufendes Dimmen stoppen und die Leuchten lassen, wie sie gerade sind. |
| `cloudless_crescendo.press_button` | Einen der Standard-Buttons über seinen Namen ausführen. |
| `cloudless_crescendo.set_on_position` | Die Position festlegen, die beim Einschalten ohne Wert gilt, zum Beispiel nach Tageszeit. |
| `cloudless_crescendo.reset_color` | Eine von Hand gewählte Farbe beenden und zu den Farben der Stufen zurückkehren. |

```yaml
# In 30 Minuten auf 80 %, zum Beispiel als Aufwachlicht
action: light.turn_on
target:
  entity_id: light.bad
data:
  brightness_pct: 80
  transition: 1800
```

## Wie es sich verhält

- Änderst du während des Dimmens eine einzelne Leuchte von Hand, fällt nur diese Leuchte heraus. Beim nächsten Befehl an das Objekt ist sie wieder dabei.
- Gehört eine Leuchte zu mehreren Objekten, gilt der letzte Befehl, und das Dimmen des anderen Objekts stoppt.
- Leuchten, die offline waren, holen ihren Stand nach, wenn sie zurückkommen. Das Dimmen läuft nach einem Neustart von Home Assistant weiter.
- Eine Farbe, die du in der normalen Lichtsteuerung des Objekts wählst, überschreibt die Farben der Stufen, bis du ausschaltest oder **Zurück zu den Stufen** wählst. Leuchten ohne Farbe behalten ihr Weiß.
- Eine Schwelle löst einmal aus: beim Slider erst beim Loslassen, bei zeitgesteuertem Dimmen beim Überschreiten.

## Thread und Matter

Der Matter-Server sendet seine Befehle mit Abstand, und ein Thread-Netz teilt seine Kapazität unter allen Leuchten. Das kann keine Integration ändern. Bei Thread sind rund 12 bis 16 Befehle pro Sekunde für alle Leuchten zusammen zu erwarten. Deshalb nutzt zeitgesteuertes Dimmen native Überblendungen, und ein Slider sendet pro Leuchte immer nur den neuesten Wert. Falls ein Slider ruckelt, verringere seine Aktualisierungen pro Sekunde unter **Weitere Einstellungen**.

Manche Leuchten springen beim Wechsel zwischen Farbe und Weiß. Das liegt an ihrer Firmware.

## Entwicklung

```bash
pip install -r requirements_test.txt ruff
pytest -q
ruff check .
```

`tests/frontend/harness.html` führt die echte Karte und Einrichtungsseite gegen ein simuliertes Home Assistant aus. Liefere das Hauptverzeichnis des Repositorys mit einem beliebigen lokalen Webserver aus und öffne diese Datei.

## Lizenz

MIT
