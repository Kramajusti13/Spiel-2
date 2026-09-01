# Spielkonzept — Arbeitstitel: "Loot & Blade"

Top-Down Pixel-Action-RPG mit Monster-Loot, Shop und Upgrades.
**Version 2 — alle Entscheidungen getroffen. Dieses Dokument ist fertig für Claude Code.**

> Name ist noch offen. "Loot & Blade" ist Arbeitstitel und kann jederzeit geändert werden,
> ohne dass sich am Code etwas ändert.

---

## 1. Kurzbeschreibung (Pitch)

Der Spieler steuert einen Helden aus der Vogelperspektive durch mehrere Level,
kämpft gegen Monster, sammelt deren Loot (Gold) und kauft damit im Shop bessere
Ausrüstung: Schwert, Schild sowie Pfeil und Bogen. Zusätzlich gibt es Skillpunkte,
mit denen Grundwerte dauerhaft verbessert werden.

**Kernschleife:** Level betreten → Monster besiegen → Gold + Skillpunkte →
Shop / Skillbaum → stärker zurück ins nächste Level.

**Grundhaltung:** Das Spiel ist **fordernd**. Der Spieler soll sterben, daraus lernen
und mit besserer Ausrüstung zurückkommen.

---

## 2. Technische Entscheidung — FESTGELEGT

**Browser-Spiel mit HTML5 Canvas + reinem JavaScript, ohne Framework.**

- Reines JavaScript (ES-Module), HTML5 Canvas 2D
- Kein Build-Tool; optional später Vite
- Speicherstand über `localStorage`
- Pixel-Art scharf halten: `ctx.imageSmoothingEnabled = false`
- Ordnerstruktur: `index.html`, `/src` (Code), `/assets` (Sprites, Sounds)
- **Alle Zahlenwerte gehören in `src/config.js`** — nichts hart im Code verstreut

**Auflösung:** Kacheln 32×32 px, Fenster 960×640 px (= 30×20 sichtbare Kacheln).

---

## 3. Steuerung — FESTGELEGT

**Zielen erfolgt mit der Maus.** Die Blickrichtung der Figur folgt immer dem Mauszeiger,
unabhängig von der Laufrichtung. Angriffe gehen dorthin, wo die Maus ist.

| Eingabe | Aktion |
|---|---|
| W A S D (oder Pfeiltasten) | Bewegung in 8 Richtungen |
| Linksklick | Schwerthieb Richtung Mauszeiger |
| Rechtsklick (halten) | Schild blocken — reduziert Schaden, –40 % Bewegungstempo |
| Leertaste | Ausweichrolle (kurze Unverwundbarkeit, kostet Ausdauer) |
| 1 / 2 | Waffe wechseln: Schwert / Bogen |
| Linksklick (mit Bogen ausgerüstet) | Pfeil Richtung Mauszeiger schießen |
| E | Interagieren (Truhe, Tür, Level-Ausgang) |
| TAB | Inventar / Charakterfenster |
| Esc | Pause-Menü |

**Umsetzungshinweise:**

- Rechtsklick öffnet im Browser das Kontextmenü → per `contextmenu`-Event abfangen
  (`e.preventDefault()`).
- Blocken funktioniert nur, wenn der Angriff **von vorne** kommt (im Blickwinkel des
  Spielers, ca. 120°). Von hinten trifft voller Schaden. Das macht die Maus-Blickrichtung
  spielrelevant statt nur dekorativ.

---

## 4. Spielerwerte (Stats) — FESTGELEGT

| Wert | Start | Bedeutung |
|---|---|---|
| Leben (HP) | 100 | Bei 0 → Tod (siehe Abschnitt 9) |
| Angriffskraft | 10 | Grundschaden, wird mit Waffenschaden verrechnet |
| Verteidigung | 0 | Zieht Schaden ab (Minimum 1 Schaden pro Treffer) |
| Bewegungstempo | 120 px/s | |
| Angriffstempo | 1 Hieb / 0,5 s | Cooldown |
| Ausdauer | 100 | Ausweichrolle kostet 30, regeneriert 20/s nach 1 s Pause |
| Kritische Chance | 5 % | Doppelter Schaden |

### Skillpunkte

- **1 Skillpunkt pro 15 getötete Monster** (zählt spielübergreifend weiter, kein Reset bei Tod).
- Der Boss gibt zusätzlich 1 Skillpunkt.
- Gold kauft **Ausrüstung**, Skillpunkte verbessern den **Charakter**. Zwei getrennte Stränge.
- **Skillpunkte sind zurücksetzbar (Respec) gegen 100 Gold** im Shop. Ermutigt zum
  Ausprobieren, ohne dass eine Fehlentscheidung den Spielstand ruiniert.

| Skill | Max. Stufen | Effekt pro Punkt |
|---|---|---|
| Vitalität | 5 | +20 max. Leben |
| Stärke | 5 | +3 Angriffskraft |
| Rüstung | 5 | +2 Verteidigung |
| Geschwindigkeit | 5 | +8 % Bewegungstempo |
| Bogenschütze | 5 | +15 % Pfeilschaden |
| Blockmeister | 5 | +10 % Schadensreduktion beim Blocken |

---

## 5. Ausrüstung & Shop — FESTGELEGT

Währung: **Gold** (fällt von Monstern).

**Waffen sind Upgrades:** Ein Kauf ersetzt die bisherige Stufe. Kein Inventar-Management,
keine Vergleichs-Tooltips — deutlich einfacher zu bauen und zu verstehen.

**Der Shop ist ein Bildschirm zwischen den Leveln**, kein NPC in der Spielwelt.
Nach Abschluss eines Levels landet der Spieler automatisch dort und startet von dort
ins nächste Level.

### Schwert (Nahkampf)

| Stufe | Name | Schaden | Preis |
|---|---|---|---|
| 1 | Rostiges Schwert | 10 | Startausrüstung |
| 2 | Eisenschwert | 18 | 50 G |
| 3 | Stahlschwert | 30 | 150 G |
| 4 | Klinge der Dämmerung | 50 | 400 G |

### Schild (Rechtsklick halten)

| Stufe | Name | Blockwert | Preis |
|---|---|---|---|
| — | kein Schild | — | Start |
| 1 | Holzschild | 30 % | 40 G |
| 2 | Eisenschild | 50 % | 120 G |
| 3 | Turmschild | 70 %, aber –20 % Tempo | 350 G |

### Pfeil und Bogen (Fernkampf)

| Stufe | Name | Schaden | Preis |
|---|---|---|---|
| 1 | Kurzbogen | 8 | 80 G |
| 2 | Langbogen | 15 | 200 G |
| 3 | Kompositbogen | 25, doppelte Schussrate | 500 G |

**Pfeile sind unbegrenzt**, aber mit Cooldown (1 Schuss / 0,8 s). Keine Munitionsverwaltung.

### Verbrauchsgüter

| Ware | Preis | Effekt |
|---|---|---|
| Heiltrank | 25 G | Heilt 40 HP, max. 3 im Gepäck, Taste `R` |
| Skill-Reset | 100 G | Alle Skillpunkte zurück in den Pool |

---

## 6. Monster & Loot — FESTGELEGT

| Monster | HP | Schaden | Verhalten | Loot |
|---|---|---|---|---|
| Slime | 20 | 5 | Läuft langsam direkt auf den Spieler zu | 3–6 G |
| Goblin | 35 | 10 | Schnell, greift in Intervallen an, weicht danach zurück | 8–15 G |
| Bogenschütze | 25 | 12 | Hält 200 px Abstand, schießt alle 2 s | 12–20 G |
| Panzer-Ork | 90 | 18 | Langsam, 5 Verteidigung, weiter Schwung | 30–50 G |
| **Boss: Ork-Häuptling** | 400 | 25 | 3 Phasen mit unterschiedlichen Mustern | 200 G + 1 Skillpunkt |

**Fairness-Regel (wichtig, weil das Spiel fordernd sein soll):**
Jeder Gegnerangriff hat eine **sichtbare Ausholphase von mindestens 0,4 Sekunden**
(Gegner leuchtet auf / holt aus), bevor Schaden entsteht. Nur so kann der Spieler
blocken oder ausweichen. Ohne das wirkt „schwer" wie „unfair".

Nach einem Treffer ist der Spieler **0,6 s unverwundbar** und blinkt — verhindert,
dass zwei Gegner ihn in einer Sekunde töten.

**Loot:** Beim Tod droppt eine sichtbare Goldmünze, die der Spieler einsammelt
(Aufsammel-Radius ca. 40 px, Münze fliegt dem Spieler leicht entgegen).

**Kein Respawn innerhalb eines Levels.** Getötete Monster bleiben tot. Levels können
aber jederzeit vom Shop-Bildschirm aus wiederholt werden, um Gold zu farmen.

---

## 7. Level-Aufbau — FESTGELEGT

**Scrollende Karte mit Kamera**, die dem Spieler folgt (weich nachziehend, nicht starr).

**Level gilt als abgeschlossen, wenn alle Monster besiegt sind** — dann öffnet sich
der Ausgang und der Spieler drückt dort `E`. Kein Verstecken vor Gegnern möglich,
und der Spieler sieht klar, was zu tun ist.

| Level | Ort | Inhalt |
|---|---|---|
| 1 | Waldlichtung | Tutorial, nur Slimes, führt Schwert ein |
| 2 | Höhleneingang | Goblins — Schild wird nötig |
| 3 | Ruinen | Bogenschützen — Fernkampf wird nötig |
| 4 | Orklager | Panzer-Orks, gemischte Gruppen |
| 5 | Bosskammer | Ork-Häuptling |

**Level-Format:** Tilemap als JSON-Datei pro Level (`/assets/levels/level1.json`),
40×30 Kacheln à 32 px. Enthält: Bodenkacheln, Wandkacheln, Startposition des Spielers,
Monster-Spawnpunkte mit Typ, Ausgangsposition. So kannst du Level anlegen und ändern,
ohne Code anzufassen.

---

## 8. Grafik & Sound — FESTGELEGT

**Stilrichtung: düster-mittelalterlich.** Gedeckte Farbpalette (Grau, Braun, Moosgrün,
tiefes Blau), Stein und Holz, Fackellicht, dunkle Wälder. Keine knalligen Cartoon-Farben.
Gold und Blut sind die einzigen kräftigen Akzente — dadurch springt Loot sofort ins Auge.

Passende kostenlose Quellen:

- **Kenney.nl** — CC0, keine Namensnennung nötig, u. a. "Tiny Dungeon", "Micro Roguelike"
- **itch.io → Free Game Assets** — nach "dark fantasy top down 32x32" suchen
- **OpenGameArt.org** — nur CC0- oder CC-BY-Assets verwenden
- Sound: **freesound.org**, **Kenney Audio Packs**

**Alle Assets müssen 32×32 px sein**, sonst passen die Packs nicht zusammen.
Lizenzen in einer Datei `assets/CREDITS.md` mitschreiben — spart Ärger, falls du das
Spiel später veröffentlichst.

**Für den Prototyp:** Claude Code baut zuerst mit farbigen Rechtecken als Platzhalter.
Die Sprites werden in Schritt 11 eingehängt, damit die Asset-Suche den Fortschritt
nicht blockiert.

---

## 9. Tod, Fortschritt und Speichern — FESTGELEGT

**Beim Tod erscheint ein Bildschirm mit zwei Optionen:**

1. **Wiederbeleben gegen Gold** — der Spieler steht an derselben Stelle wieder auf,
   mit vollem Leben. Besiegte Monster bleiben besiegt.
   Kosten: **50 G beim ersten Tod pro Level, danach je 25 G mehr** (50 → 75 → 100 → 125 …).
   Der Zähler wird zurückgesetzt, sobald das Level abgeschlossen ist.
2. **Level neu starten** — kostenlos, aber alle Monster im Level leben wieder,
   gesammeltes Gold aus diesem Durchgang ist weg.

Gekaufte Ausrüstung und vergebene Skillpunkte bleiben in **beiden** Fällen erhalten.

**Speicherstand über `localStorage`**, automatisch nach jedem Level und nach jedem
Shop-Kauf. Gespeichert wird: Gold, Ausrüstungsstufen, Skillpunkte (vergeben + Pool),
höchstes freigeschaltetes Level, Anzahl getöteter Monster, Heiltränke.
Im Hauptmenü gibt es einen Knopf „Neues Spiel" mit Sicherheitsabfrage.

---

## 10. Empfohlene Reihenfolge der Umsetzung

Nicht alles auf einmal bauen — in dieser Reihenfolge bleibt das Spiel immer spielbar
und testbar:

1. Fenster, Spielerfigur, Bewegung (WASD), Blickrichtung per Maus, Kamera
2. Tilemap aus JSON laden + Kollision mit Wänden
3. Schwertangriff (Linksklick) + Treffer-Erkennung + Angriffs-Cooldown
4. Slime-Gegner mit Verfolgungs-KI, HP-Balken, Ausholphase, Unverwundbarkeit nach Treffer
5. Tod des Gegners, Gold-Drop als Münze, Gold-Anzeige im HUD
6. Spielertod + Wiederbelebungs-Bildschirm
7. Schild (Rechtsklick) + Blockwinkel + Schadensreduktion
8. Ausweichrolle + Ausdauerleiste
9. Level-Ausgang + Shop-Bildschirm zwischen den Leveln
10. Bogen als zweite Waffe + Waffenwechsel
11. Skillpunkte + Charakterfenster (TAB)
12. Weitere Monstertypen, Level 2–5, Boss
13. Sprites und Sounds einbauen
14. Speicherstand, Hauptmenü, Pause-Menü, Feinschliff

---

## 11. Startprompt für Claude Code

Diesen Text in Claude Code eingeben, nachdem `GAME_DESIGN.md` im Projektordner liegt:

> Lies GAME_DESIGN.md in diesem Ordner. Baue daraus ein Top-Down-Pixel-Action-Spiel
> als Browser-Spiel mit HTML5 Canvas und reinem JavaScript (ES-Module, kein Framework).
>
> Setze zunächst nur die Schritte 1 bis 5 aus Abschnitt 10 um: Spielerbewegung mit WASD,
> Blickrichtung folgt der Maus, Tilemap aus einer JSON-Datei mit Wandkollision,
> Schwertangriff per Linksklick mit Cooldown, ein Slime-Gegner mit Verfolgungs-KI,
> HP-Balken und sichtbarer Ausholphase vor dem Angriff, sowie Gold-Drop als
> einsammelbare Münze mit Anzeige im HUD.
>
> Benutze farbige Rechtecke als Platzhaltergrafik, aber strukturiere den Code so,
> dass Sprites später leicht ersetzt werden können. Alle Zahlenwerte aus dem Dokument
> gehören in eine eigene Datei src/config.js, damit ich sie anpassen kann.
> Kacheln 32×32 px, Fenster 960×640 px, imageSmoothingEnabled auf false.
>
> Sag mir am Ende, wie ich das Spiel starte und was ich testen soll.

Danach jeweils: *„Mach mit Schritt 6 aus Abschnitt 10 weiter."*

---

## 12. Tipps für die Arbeit mit Claude Code

- **Immer nur ein bis zwei Schritte auf einmal** bauen lassen und dazwischen selbst
  spielen. Große Aufträge liefern viel Code, den du nicht mehr überblickst.
- **Nach jedem funktionierenden Schritt einen Git-Commit** machen lassen
  („Committe den aktuellen Stand"). Dann kannst du jederzeit zurück.
- Wenn etwas nicht stimmt, **beschreibe was du siehst**, nicht was du vermutest:
  „Der Slime läuft durch die Wand" ist hilfreicher als „die Kollision ist kaputt".
- **Balance änderst du selbst** in `config.js` — dafür ist die Datei da, dazu brauchst
  du Claude Code nicht.
- Wenn du etwas am Konzept änderst, **ändere es auch in diesem Dokument**. Es ist die
  gemeinsame Grundlage; veraltet es, baut Claude Code am Ziel vorbei.
