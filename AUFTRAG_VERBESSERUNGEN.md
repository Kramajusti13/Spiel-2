# Auftrag für Claude Code: Verbesserungen "Loot and Blade"

Dieses Dokument ist die Arbeitsanweisung für Claude Code an diesem Projekt (Ordner `Spiel 2`). Es enthält 8 einzelne, unabhängige Aufgaben. **Bitte nicht alles auf einmal umsetzen.**

## Arbeitsweise (bitte genau befolgen, spart Zeit/Tokens)

1. Arbeite die Aufgaben **eine nach der anderen** in der angegebenen Reihenfolge ab, nicht parallel.
2. Lies bei jeder Aufgabe **nur die dort genannten Dateien** (plus ggf. eine direkt importierte Hilfsdatei, falls unbedingt nötig). Durchsuche nicht das ganze Repo — die relevanten Dateien sind schon benannt.
3. Ändere **nur**, was für die jeweilige Aufgabe nötig ist. Keine Refactorings "nebenbei", keine Formatierungsänderungen an Code, der nicht angefasst werden muss.
4. Nach jeder Aufgabe: kurz per `node build.mjs` (bzw. dem vorhandenen Build-Befehl) prüfen, dass es keinen Syntaxfehler gibt, dann **einen eigenen Git-Commit** mit kurzer Beschreibung machen (z.B. `git commit -m "Titanoboa: Immunität + schnelleres Angriffsmuster beim Häuten"`). So kann ich jede Änderung einzeln nachvollziehen und bei Bedarf zurückrollen.
5. Wenn eine Aufgabe unklar ist oder mehrere Umsetzungsmöglichkeiten hat, wähle die **einfachste, kleinste** Lösung, die die Anforderung erfüllt, statt nachzufragen oder groß zu planen — kurz in der Commit-Message notieren, wofür du dich entschieden hast.
6. Aufgabe 8 (Hauptmenü-Umbau) ist die größte und optisch sichtbarste Änderung — die zuletzt machen, wenn alle anderen (kleineren, klar umrissenen) Aufgaben erledigt sind.

---

## Aufgabe 1 — Monster auf höheren Schwierigkeitsstufen aggressiver

**Ziel:** Bei höheren Schwierigkeitsstufen sollen Gegner schneller angreifen und "schlauer" agieren (z.B. kürzere Angriffs-Cooldowns, präzisere Vorhersage der Spielerposition, weniger Fehlangriffe).

**Dateien:** `src/difficulty.js`, `src/entities/enemy.js` (Basisverhalten aller Gegner).

**Vorgehen:** Prüfe, wie `difficulty.js` aktuell Werte für Schwierigkeit skaliert (Schaden, HP etc.) und ergänze dort einen Skalierungsfaktor für Angriffsgeschwindigkeit/Reaktionszeit/KI-Genauigkeit, der in `enemy.js` (bzw. den Stellen, wo Cooldown/Angriffsentscheidung berechnet wird) verwendet wird. Keine einzelnen Gegner-Dateien anfassen, sofern die Basis-KI zentral in `enemy.js` sitzt — nur wenn ein Gegner eigene Angriffslogik überschreibt, dort ebenfalls anpassen.

---

## Aufgabe 2 — Mehr Quests mit Schwierigkeitsstufen

**Ziel:** Mehr Quests, kategorisiert in leicht/mittel/schwer. Leichte Quests (z.B. "Töte Schleims") sollen sehr wenig Gold/XP geben.

**Datei:** `src/quests.js` (ggf. `src/ui/questTile.js` nur falls sich Anzeige-Logik für Schwierigkeit ändern muss).

**Vorgehen:** Bestehende Quest-Definitionen als Vorlage nehmen, neue Quests mit Kategorie `leicht`/`mittel`/`schwer` ergänzen und Gold/XP-Belohnung entsprechend niedrig/mittel/hoch skalieren. Bestehende Quests nicht umbauen, nur ergänzen bzw. wo nötig mit Kategorie/Belohnung nachschärfen.

---

## Aufgabe 3 — Titanoboa stärker machen

**Ziel:** Titanoboa insgesamt stärker. Während der Häutungsphase: immun gegen Schaden, schneller, schlaueres Angriffsmuster.

**Datei:** `src/entities/titanoboa.js`

**Vorgehen:** Häutungs-/Phasenlogik lokalisieren (State für "häutet sich"), dort Schadensimmunität einbauen, Bewegungs-/Angriffsgeschwindigkeit erhöhen und das Angriffsmuster in dieser Phase komplexer/unvorhersehbarer machen (z.B. mehr Angriffsvarianten, kürzere Pausen).

---

## Aufgabe 4 — Ork-Häuptling stärker + schlaueres Angriffsmuster

**Datei:** `src/entities/orcChieftain.js`

**Vorgehen:** Werte (Schaden/HP/Geschwindigkeit) erhöhen und Angriffsmuster erweitern (z.B. mehr Angriffsvarianten, kombinierte Attacken, kürzere Erholungszeit zwischen Angriffen), analog zum Vorgehen bei Titanoboa.

---

## Aufgabe 5 — Sumpf-Level: Krokodile sollen schwimmen

**Ziel:** Der Sumpf ist zu voll, Krokodile bewegen sich schlecht. Krokodile sollen sich im Wasser schwimmend bewegen können statt nur auf festem Untergrund.

**Dateien:** `src/entities/krokodil.js`, das betreffende Sumpf-Level in `assets/levels/` (welches Level das ist, im Zweifel an den Wasser-/Sumpf-Tiles bzw. am Namen/Kommentar im JSON erkennen), ggf. `src/level.js` (falls dort generell definiert ist, welche Tiles begehbar sind).

**Vorgehen:** In `krokodil.js` die Bewegungslogik so erweitern, dass Wasser-Tiles für dieses Entity begehbar sind (eigene Kollisionsprüfung statt der Standard-Boden-Prüfung, falls Gegner aktuell nur auf "festem" Tile laufen können). Falls das Level selbst zu eng/überfüllt platziert ist, im Level-JSON die Anzahl/Platzierung der Krokodile leicht entzerren.

---

## Aufgabe 6 — Wasser besser animieren

**Datei:** `src/gfx.js` (Rendering), ggf. `assets/sprites/tile_water.png` bleibt unverändert (kein Asset-Neuzeichnen nötig, nur Animation).

**Vorgehen:** Prüfen, wie andere animierte Tiles/Effekte in `gfx.js` (z.B. Partikel, Coin-Glanz) umgesetzt sind, und eine einfache Loop-Animation fürs Wasser-Tile ergänzen (z.B. leichtes Wellen-Shimmer per Zeit-basiertem Offset/Alpha, kein neues Sprite nötig).

---

## Aufgabe 7 — Reichweite von Fernkampfwaffen begrenzen

**Ziel:** Bogen und Speer sollen keine unendliche Reichweite mehr haben. Der Bogen soll weiterhin weiter schießen können als der Speer. Gegner, die werfen/schießen (z.B. Archer), sollen ebenfalls eine begrenzte, endliche Reichweite haben.

**Dateien:** `src/weapons.js`, `src/entities/arrow.js`, `src/entities/thrownSpear.js`, `src/entities/archer.js` (bzw. andere werfende/schießende Gegner, falls vorhanden).

**Vorgehen:** In `arrow.js`/`thrownSpear.js` eine maximale Flugdistanz/Lebensdauer einbauen, nach der das Projektil verschwindet (Bogen-Reichweite > Speer-Reichweite, konkrete Werte in `weapons.js` als Konstanten definieren, falls dort Waffenwerte zentral liegen). Dieselbe Begrenzung auf die Wurf-/Schuss-Projektile der Gegner (z.B. `archer.js`) anwenden.

---

## Aufgabe 8 — Hauptmenü/Dashboard umbauen (zuletzt)

**Ziel:** Neues Layout: Spielerbild in der Mitte, drumherum einzelne Kacheln — u.a. eine eigene Charakter-Kachel, eine eigene Shop-Kachel, eine eigene Quest-Kachel, eine eigene Kachel für die Levelauswahl/Pfad.

**Dateien:** `src/ui/dashboard.js`, `src/ui/mainMenu.js`, `src/ui/shopTile.js`, `src/ui/questTile.js`, `src/ui/routeTile.js`, `src/ui/characterWindow.js` (nur als Referenz, welche Aktion die Charakter-Kachel öffnen soll).

**Vorgehen:** Bestehendes Kachel-System (`shopTile.js`, `questTile.js`, `routeTile.js`) als Vorlage für eine neue `characterTile.js` nehmen. In `dashboard.js` das Layout so umbauen, dass mittig ein Spielerporträt/-bild sitzt und die vorhandenen + neue Kachel ringförmig/rasterartig darum angeordnet werden (z.B. per CSS Grid/Flex um ein zentrales Element). Bestehende Klick-Handler der Kacheln wiederverwenden, nur Layout/Anordnung ändern, keine Funktionslogik der Kacheln selbst umbauen.

---

## Nach Abschluss

Kurze Zusammenfassung aller 8 Commits geben (was wurde je Aufgabe geändert), damit ich die Änderungen im Spiel testen kann.
