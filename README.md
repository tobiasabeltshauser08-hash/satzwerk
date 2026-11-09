# Satzwerk

Fitness-App (PWA), die dir einen Trainingsplan erstellt und dich durch jedes Training führt.
Sie lässt sich auf Handy und PC installieren und läuft danach auch offline.

- **Fragen-Assistent:** Ziel, Schwerpunkt (z. B. Oberkörper), Erfahrung, Trainingstage, Dauer und vorhandene Geräte
- **Trainingsplan in 4-Wochen-Blöcken:** Einstieg, Aufbau, Steigerung, Deload
- **Geführtes Training:** Aufwärmprogramm passend zum Trainingstag (Puls, Mobilität, Rampensätze), dann jede Übung Satz für Satz, Pausen-Countdown mit Ton und Vibration, Finisher und zum Schluss eine Dehnroutine für die trainierten Muskeln (auch nach Cardio-Tagen und Läufen)
- **Steigerung:** Die App schlägt aus der letzten Woche das Gewicht für heute vor (alle Sätze bis zum oberen Wiederholungsziel geschafft → mehr Gewicht, im Deload etwas leichter)
- **Sprachansagen:** Übung, Satz, Wiederholungen und Gewicht, Pausen mit Vorschau auf die nächste Übung, Seitenwechsel beim Dehnen; im Training und Lauf ein- und ausschaltbar
- **Bildschirm bleibt an** während Training, Lauf und Dehnen (Wake Lock, abschaltbar)
- **Erinnerungen:** Wöchentliche Kalendertermine mit Alarm für alle Trainings- und Lauftage (.ics für iPhone, Android und PC)
- **Datensicherung:** Backup als Datei speichern und wieder laden
- **Vorlage für jede Übung:** animierte Figur, die die Bewegung vormacht, Anleitung in 3 Schritten und wichtigster Technik-Hinweis
- **Stoppuhr** für die gesamte Trainingszeit, plus Timer für Halteübungen (z. B. Unterarmstütz, Toter Hang)
- Gewicht und Wiederholungen je Satz eintragen; die App zeigt, was du letzte Woche geschafft hast
- **Verlauf:** Trainings, Trainingszeit, Sätze und bewegtes Gewicht
- **Laufen (eigener Tab):** 8-Wochen-Laufplan nach Ziel (Anfangen, Fit bleiben, 5 km, 10 km, Halbmarathon), Niveau und frei wählbaren Lauftagen. Konkrete Einheiten: lockere Läufe, Intervalle, Tempoläufe und ein Longrun pro Woche, mit Entlastungswochen. Mit aktueller 5-km-Zeit zeigt die App ein Zieltempo je Abschnitt
- **Lauf-Modus:** Stoppuhr, Intervall-Ansage mit Ton, Vibration und Stimme, Restzeit des Abschnitts, GPS-Kilometerzähler mit Ø-Tempo und Ansage je Kilometer, Korrektur ±0,1 km (z. B. Laufband), Puls-Zielbereich je Abschnitt. Kilometer pro Woche, Jahr und gesamt
- **Strecke und Bestzeiten:** Jeder GPS-Lauf wird als Karte gespeichert (mit Kilometer-Punkten). Die App findet die schnellsten 1, 5 und 10 km in jedem Lauf und meldet neue Bestzeiten
- **Puls-Zonen:** Aus Alter, Ruhepuls und optional gemessenem Maximalpuls fünf Trainingszonen (Karvonen)
- **Körperwerte:** Gewicht, Taille, Körperfett, Brust, Oberarm, Hüfte mit Verlauf und Änderung über 4 Wochen
- **Ernährung:** Richtwerte für Kalorien (Mifflin-St Jeor, angepasst an Trainingsumfang und Ziel), Eiweiß und Wasser
- **Ausdauer verfolgen:** Nach jeder Cardio-Einheit Dauer, Strecke, Puls und Anstrengung eintragen; Finisher mit Stoppuhr zählen automatisch. Läufe oder Radtouren an freien Tagen lassen sich dazu eintragen. Der Verlauf zeigt Minuten pro Woche (8 Wochen), das Wochenziel nach WHO-Empfehlung (150 min moderat, intensive Minuten zählen doppelt), Strecke, bestes Lauftempo und Ø Puls

Alle Daten bleiben auf dem Gerät (im Browser gespeichert).

## Starten

Die App braucht einen kleinen Webserver, weil Browser JavaScript-Module nicht direkt aus einer Datei laden:

```bash
cd fitness-app
python3 -m http.server 8000
```

Dann im Browser **http://localhost:8000** öffnen.

## Als App installieren

Die App liegt auf GitHub Pages (HTTPS), dadurch ist sie installierbar:

- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“
- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“
- **PC (Chrome/Edge):** In der Adressleiste auf das Installieren-Symbol klicken

Wenn du später Dateien änderst, erhöhe in `sw.js` die Versionsnummer (z. B. `satzwerk-v2` → `satzwerk-v3`).
Sonst zeigen bereits installierte Apps weiter die alte Version.

## Test

```bash
npm test
```

Prüft alle Übungsdaten und erzeugt Pläne für 3600 Profilkombinationen (Ziel, Schwerpunkt, Niveau, Tage, Dauer, Geräte).
`tests/mobility.test.js` prüft Aufwärmen und Dehnen für alle Trainingstage, `tests/backup.test.js` Backup und Kalenderdatei.
`tests/track.test.js` prüft Speicherformat, Vereinfachung, Bestzeiten und Kartenform der GPS-Strecke, `tests/health.test.js` Puls-Zonen, Körperwerte und Ernährung.
`tests/run.test.js` prüft Laufplan, Abschnitts-Zeitleiste und GPS-Strecke.
`tests/endurance.test.js` prüft Eingaben, Tempo und die Wochenauswertung des Ausdauer-Trackings.

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/data.js` | Fragen, Übungen mit Anleitung, Splits, Satz- und Wochenschemata |
| `js/plan.js` | Plan-Generator: wählt Übungen nach Geräten und Niveau, passt die Einheit an die Zeit an |
| `js/endurance.js` | Ausdauer-Tracking: Eingaben prüfen, Tempo, Wochenauswertung und Wochenziel |
| `js/mobility.js` | Aufwärmprogramm und Dehnroutine je nach Trainingstag, Cardio-Tag oder Lauf |
| `js/backup.js` | Backup speichern/laden (Prüfung) und Kalender-Erinnerungen (.ics) |
| `js/track.js` | GPS-Strecke: kompakt speichern, vereinfachen, Bestzeiten über 1/5/10 km, Form für die Karte |
| `js/health.js` | Puls-Zonen, Körperwerte und Ernährungs-Richtwerte |
| `js/run.js` | Laufplan (8 Wochen), Zieltempo, Intervall-Zeitleiste, GPS-Strecke und Kilometer |
| `js/figure.js` | Animierte Übungsvorlagen (Strichfigur aus Gelenkwinkeln) |
| `js/app.js` | Oberfläche, Fragen-Assistent, Trainingsmodus mit Stoppuhr und Pausen-Timer |
| `sw.js` | Service Worker für den Offline-Betrieb |

Hinweis: Bei Schmerzen, Vorerkrankungen oder nach längerer Pause vorher ärztlich abklären lassen.
