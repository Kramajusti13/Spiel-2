# Loot & Blade — Prototyp

Top-Down-Pixel-Action nach `GAME_DESIGN_1.md`.
Umgesetzt: **alle 14 Schritte aus Abschnitt 10.**

## Starten

Im Projektordner:

```bash
node server.mjs
```

Dann `http://localhost:8080` im Browser oeffnen.
Anderer Port: `node server.mjs 3000`.

> Ein Doppelklick auf `index.html` funktioniert **nicht**: ES-Module und `fetch()`
> (fuer die Level-JSON) werden vom Browser ueber `file://` blockiert. Wenn du es
> trotzdem versuchst, erscheint eine rote Box mit genau diesem Hinweis.

## Weitergeben

Zum Verschicken an jemanden, der nur spielen will:

```bash
node build.mjs
```

Das erzeugt `dist/LootAndBlade.html` (rund 540 KB) — Code, alle 25 Sprites,
alle 16 Toene und alle 5 Level in **einer einzigen Datei**. Die laeuft per
Doppelklick, ohne Server und ohne Node: die Module sind zu einem klassischen
Skript zusammengefasst und die Assets als Daten eingebettet, deshalb greift die
file://-Sperre des Browsers nicht.

Nach Aenderungen am Spiel einfach neu bauen. Zum Entwickeln weiterhin
`node server.mjs` benutzen — das ist schneller, weil nichts gebaut werden muss.

Jeder Browser hat seinen eigenen Spielstand (`localStorage`), ihr stoert euch
also nicht gegenseitig.

## Steuerung

| Eingabe | Aktion |
|---|---|
| W A S D / Pfeiltasten | Laufen (8 Richtungen) |
| Maus | Blickrichtung — die Figur schaut immer zum Zeiger |
| Linksklick | Angriff mit der gewaehlten Waffe Richtung Mauszeiger |
| 1 / 2 | Waffe wechseln: Schwert / Bogen |
| Rechtsklick halten | Schild blocken (nur mit gekauftem Schild) |
| Leertaste | Ausweichrolle — kostet 30 Ausdauer, macht kurz unverwundbar |
| Esc | Pause-Menue |
| M | Ton an/aus |
| F1 | Debug-Anzeige: Hitboxen, Aggro-, Treffer- und Blockwinkel, FPS |
| E | Level verlassen (am offenen Ausgang) |
| R | Heiltrank trinken (+40 HP) |
| TAB | Charakterfenster: Werte ansehen, Skillpunkte vergeben |
| 1 / 2 / R, Pfeiltasten + Enter, Maus | Auswahl im Todesbildschirm und im Shop |

## Ordnerstruktur

```
index.html            Canvas 960x640, imageSmoothingEnabled = false
server.mjs            winziger statischer Webserver, keine Abhaengigkeiten
build.mjs             packt alles in EINE HTML-Datei zum Verschicken
dist/                 Ergebnis von build.mjs (nicht von Hand bearbeiten)
src/
  config.js           ALLE Zahlenwerte — Balance nur hier aendern
  main.js             Einstiegspunkt, Spielschleife
  game.js             Spielzustand: Level, Spieler, Gegner, Loot, Effekte
  level.js            Tilemap laden, zeichnen, Kollision, Sichtlinie
  camera.js           weich nachziehende Kamera, an Levelgrenzen geklemmt
  input.js            Tastatur + Maus (rechnet CSS-Skalierung heraus)
  gfx.js              einzige Zeichenstelle — Sprites oder Platzhalter-Rechtecke
  hud.js              Leben, Gold, Fortschritt, Debug-Panel
  assets.js           welche Bild- und Tondateien geladen werden
  audio.js            Toene laden und abspielen (Web Audio)
  shop.js             Warenangebot und Kauflogik (ohne Anzeige)
  skills.js           Skillpunkte vergeben, zuruecksetzen, beschreiben
  save.js             Spielstand im localStorage lesen und schreiben
  ui/
    menu.js           Knoepfe und Menuesteuerung (Maus + Tastatur)
    deathScreen.js    Todesbildschirm: Wiederbeleben oder Level neu starten
    shopScreen.js     Shop zwischen den Leveln
    characterScreen.js Charakterfenster auf TAB
    mainMenu.js       Hauptmenue: Weiterspielen / Neues Spiel
    pauseMenu.js      Pause auf Esc
  util.js             Mathe-Helfer
  entities/
    player.js         Bewegung, Zielen, Schwerthieb, Schaden, Unverwundbarkeit
    enemy.js          Basisklasse: Leben, Ausholphase, HP-Balken, Ausweich-Steuerung
    enemies.js        Bauplan-Tabelle: Typname aus der Level-JSON -> Klasse
    slime.js          Slime: laeuft stur auf den Spieler zu
    goblin.js         Goblin: schlaegt zu und weicht zurueck
    archer.js         Bogenschuetze: haelt Abstand, schiesst mit Sichtlinie
    armoredOrc.js     Panzer-Ork: langsam, gepanzert, weiter Schwung
    orcChieftain.js   Boss mit drei Phasen
    arrow.js          Pfeil: Flug, Wand- und Trefferpruefung
    coin.js           Gold-Muenze mit Sog und Aufsammeln
assets/
  CREDITS.md          Herkunft und Lizenz aller Assets — beim Austausch pflegen!
  sprites/*.png       25 Sprites, alle 32x32
  sounds/*.wav        16 Toene
assets/levels/
  level1.json         Waldlichtung — Slimes
  level2.json         Hoehleneingang — Goblins
  level3.json         Ruinen — Bogenschuetzen
  level4.json         Orklager — Panzer-Orks, gemischt
  level5.json         Bosskammer — Ork-Haeuptling
```

## Balance aendern

Alles steht in `src/config.js`, z. B.:

- `PLAYER.speed`, `PLAYER.maxHp`, `PLAYER.invulnTime`
- `SWORD.cooldown`, `SWORD.range`, `SWORD.arc`, `SWORD.tiers[…].damage`
- `ENEMIES.slime.speed`, `.aggroRadius`, `.windupTime`, `.gold`
- `LOOT.pickupRadius`, `LOOT.magnetRadius`
- `DEATH.reviveBaseCost`, `DEATH.reviveCostIncrement`, `DEATH.reviveInvulnTime`
- `SHIELD.blockArc`, `SHIELD.moveSpeedFactor`, `SHIELD.tiers[…].block`, `SHIELD.canAttackWhileBlocking`
- `ROLL.distance`, `ROLL.duration`, `ROLL.invulnTime`, `PLAYER.rollCost`, `PLAYER.staminaRegen`
- `BOW.cooldown`, `BOW.arrowSpeed`, `BOW.arrowLife`, `BOW.tiers[…].damage`
- `SKILLS.killsPerPoint`, `SKILLS.tree[…].maxRank`, `SKILLS.tree[…].perRank`
- `AUDIO.masterVolume`, `AUDIO.sfxVolume`, `SPRITES.scale[…]` (Groesse je Figur)
- `SAVE.key` (Schluessel im localStorage), `SAVE.enabled`
- `ENEMIES.goblin`, `.archer`, `.armoredOrc`, `.orcChieftain` — je HP, Schaden, Tempo,
  Ausholzeiten und Loot; beim Boss zusaetzlich `charge`, `slam` und `phaseThresholds`
- `COMBAT.damageFormula` — `'add'` (10 + 10 = 20 Schaden, Slime stirbt am ersten
  Hieb) oder `'scale'` (11 Schaden, Slime braucht zwei Hiebe)

Seite neu laden, fertig — kein Build-Schritt.

## Schild (Abschnitt 3 und 5)

Rechte Maustaste **halten** hebt das Schild. Wichtig ist die Blickrichtung:
geblockt wird nur, was aus dem vorderen 120°-Winkel kommt. Von der Seite oder
von hinten trifft voller Schaden — genau dafuer ist das Zielen mit der Maus da.

| Schild | Reduktion | Tempo |
|---|---|---|
| kein Schild | — | 120 px/s |
| Holzschild | 30 % | 120, blockend 72 |
| Eisenschild | 50 % | 120, blockend 72 |
| Turmschild | 70 % | 96 (schwer), blockend 57,6 |

Blocken kostet 40 % Bewegungstempo; das Turmschild zieht zusaetzlich dauerhaft
20 % ab, weil man es auch dann schleppt, wenn es unten ist.

Mit erhobenem Schild kann nicht zugeschlagen werden — erst Rechtsklick loslassen.
Das steht so nicht im Dokument; wenn du lieber gleichzeitig blocken und hauen
willst, setze `SHIELD.canAttackWhileBlocking` in `config.js` auf `true`.

Der Skill „Blockmeister" (+10 % pro Stufe, Schritt 11) ist bereits eingerechnet
und bei `SHIELD.maxBlock` = 95 % gedeckelt.

Schilde kaufst du im Shop zwischen den Leveln — du startest ohne Schild.

## Ausweichrolle und Ausdauer (Abschnitt 3 und 4)

**Leertaste** rollt 94 px weit (knapp drei Kacheln), dauert 0,28 s und kostet 30 Ausdauer.
Gerollt wird in **Laufrichtung**; stehst du still, in **Blickrichtung**.

Unverwundbar bist du die ersten 0,24 s der Rolle — das letzte Stueck bist du
wieder angreifbar. Zu frueh gerollt heisst also trotzdem getroffen.

Waehrend der Rolle: kein Lenken, kein Zuschlagen, kein Schild, und der Rueckstoss
eines vorherigen Treffers wird abgeschnitten. Waende stoppen die Rolle.

Ausdauer: 100 max, Rolle kostet 30, Regeneration 20 pro Sekunde, aber erst
1 Sekunde nach der letzten Rolle. Drei Rollen am Stueck sind also drin, danach
musst du warten. Die Leiste sitzt unter der Lebensanzeige; der senkrechte Strich
markiert die 30 Ausdauer einer Rolle. Sie wird gelb, wenn es nicht mehr reicht,
und blitzt rot auf, wenn du es trotzdem versuchst.

## Pfeil und Bogen (Abschnitt 3 und 5)

**1** waehlt das Schwert, **2** den Bogen — der Bogen erst, wenn du ihn im Shop
gekauft hast; sonst kommt „Kein Bogen". Der Linksklick schiesst dann Richtung
Mauszeiger statt zuzuschlagen. Welche Waffe aktiv ist, steht links im HUD und
ist am gezeichneten Bogen zu sehen; die Sehne zeigt an, wann nachgeladen ist.

Pfeile sind unbegrenzt, aber mit Cooldown: 1 Schuss / 0,8 s, beim Kompositbogen
doppelt so schnell. Reichweite rund 590 px (1,4 s Flugzeit), danach faellt der
Pfeil weg; an Waenden bleibt er kurz stecken und verblasst.

| Bogen | Schaden | Schaden gesamt (mit Angriffskraft 10) |
|---|---|---|
| Kurzbogen | 8 | 18 |
| Langbogen | 15 | 25 |
| Kompositbogen | 25, doppelte Schussrate | 35 |

Der Pfeilschaden wird nach derselben Formel verrechnet wie der Schwertschaden
(`COMBAT.damageFormula`), Kritische Treffer werden beim Einschlag gewuerfelt.
Der Skill „Bogenschuetze" (+15 % pro Stufe, Schritt 11) ist eingerechnet.

Mit erhobenem Schild wird auch nicht geschossen — dieselbe Regel wie beim Schwert.

## Monster und Level (Abschnitt 6 und 7)

Jedes Level fuehrt einen Gegnertyp ein, der eine andere Antwort verlangt:

| Level | Ort | Neu dabei | Was er verlangt |
|---|---|---|---|
| 1 | Waldlichtung | Slime (20 HP, 5 Schaden) | Schwert-Timing lernen |
| 2 | Hoehleneingang | Goblin (35 HP, 10) — schlaegt zu und **weicht zurueck** | Nachsetzen oder blocken |
| 3 | Ruinen | Bogenschuetze (25 HP, 12) — haelt 200 px Abstand | Deckung hinter Saeulen, Bogen oder Sturm |
| 4 | Orklager | Panzer-Ork (90 HP, 18, **5 Verteidigung**) — weiter Schwung | Waffen-Upgrade, hinter ihn kommen |
| 5 | Bosskammer | Ork-Haeuptling (400 HP, 25) | alles zusammen |

Der Bogenschuetze schiesst nur mit **freier Sicht** — hinter einer Saeule bist du
sicher, und er rueckt dann nach, statt dumm zu warten. Seine Pfeile lassen sich
mit dem Schild blocken (gemessen: 12 → 6 Schaden mit dem Eisenschild von vorne).

Der Panzer-Ork zieht 5 vom Schaden ab: das rostige Schwert macht nur noch 15
statt 20. Hier lohnt sich der Waffenkauf zum ersten Mal wirklich.

### Der Boss und seine drei Phasen

Die Phase haengt an seinem Leben und ist an den Streifen auf seinem Helm sowie
an der Leiste unten am Bildschirm ablesbar:

1. **ab 100 %** — nur der weite Schwung (25 Schaden, 160°-Kegel). Sein Timing lernen.
2. **ab 66 %** — dazu der **Ansturm**: er weicht zurueck, holt sichtbar aus und
   rennt geradeaus (20 Schaden). Rennt er in eine Wand, ist er 1,2 s benommen —
   das ist dein Fenster.
3. **ab 33 %** — dazu der **Bodenstampfer** (30 Schaden im Umkreis von 130 px,
   trifft auch hinter ihm; Ausweichrolle oder Abstand). Ausserdem wird er
   30 % schneller und erholt sich schneller.

Jeder dieser Angriffe hat weiterhin eine sichtbare Ausholphase: Kegel beim
Schwung, Bahn beim Ansturm, Ring beim Stampfer. Besiegt gibt er 200 Gold und
**einen zusaetzlichen Skillpunkt**.

## Skillpunkte und Charakterfenster (Abschnitt 4)

**Ein Skillpunkt pro 15 getoetete Monster.** Der Zaehler laeuft spieluebergreifend
weiter und wird bei einem Tod nicht zurueckgesetzt. Sind Punkte frei, blinkt oben
im HUD ein Hinweis; **TAB** oeffnet das Charakterfenster (das Spiel pausiert
solange, `TAB` oder `Esc` schliesst).

Links stehen die aktuellen Werte mit dem Skillanteil in Klammern, rechts der
Skillbaum mit Stufenanzeige. Vergeben wird per Zifferntaste 1–6, Pfeiltasten +
Enter oder Mausklick.

| Skill | max. | pro Stufe |
|---|---|---|
| Vitalitaet | 5 | +20 max. Leben |
| Staerke | 5 | +3 Angriffskraft |
| Ruestung | 5 | +2 Verteidigung |
| Geschwindigkeit | 5 | +8 % Bewegungstempo |
| Bogenschuetze | 5 | +15 % Pfeilschaden |
| Blockmeister | 5 | +10 % Schadensblock |

Die Werte sind Getter: ein vergebener Punkt wirkt sofort, ohne Levelneustart.
Bei Vitalitaet steigt das aktuelle Leben um denselben Betrag mit — sonst faende
man mitten im Kampf keinen Unterschied.

**Zuruecksetzen** kostet 100 Gold im Shop und gibt alle vergebenen Punkte in den
Pool zurueck. Gold kauft Ausruestung, Skillpunkte verbessern den Charakter: zwei
getrennte Straenge.

Der zusaetzliche Skillpunkt fuer den Boss (Abschnitt 4) kommt mit Schritt 12.

## Level-Ausgang und Shop (Abschnitt 5 und 7)

Solange noch Monster leben, ist der Ausgang ein **vergittertes Tor**. Faellt das
letzte Monster, oeffnet er sich, leuchtet golden und ein Pfeil am Bildschirmrand
zeigt hin, wenn er ausserhalb des Bildes liegt. Dort **E** druecken.

Erst dieses `E` schliesst den Durchgang ab: dann ist das Gold gesichert und der
Wiederbelebungspreis faellt auf 50 G zurueck. Wer nach dem letzten Monster noch
stirbt, zahlt also weiter den erhoehten Preis.

Der Shop ist ein reiner Zwischenbildschirm, kein NPC in der Welt:

| Ware | Wirkung |
|---|---|
| Schwert | naechste Stufe, ersetzt die bisherige (50 / 150 / 400 G) |
| Bogen | naechste Stufe (80 / 200 / 500 G) |
| Schild | naechste Stufe (40 / 120 / 350 G) |
| Heiltrank | +40 HP, Taste `R`, max. 3 im Gepaeck (25 G) |
| Skill-Reset | alle vergebenen Skillpunkte zurueck in den Pool (100 G) |
| Level wiederholen | kostenlos, alle Monster leben wieder — zum Gold farmen |
| Weiter | naechstes Level |

Waffen sind Upgrades, kein Inventar: ist die hoechste Stufe gekauft, verschwindet
der Eintrag. Was du dir nicht leisten kannst, ist grau und nennt den Fehlbetrag.

## Spielstand, Hauptmenue, Pause (Abschnitt 9)

Beim Start kommt das **Hauptmenue**. Ohne Spielstand gibt es nur „Neues Spiel";
mit Stand steht „Weiterspielen" oben, mit einer Zeile wie
*„Ruinen · 340 Gold · 62 Monster besiegt"*. „Neues Spiel" fragt dann nach — und
in der Abfrage ist **„Abbrechen" vorausgewaehlt**, nicht der Loeschknopf.

**Esc** oeffnet das Pause-Menue: Weiter, Charakter, Level neu starten,
Hauptmenue (auch das mit Rueckfrage). Die Welt steht dabei still.

Gespeichert wird automatisch **nach jedem abgeschlossenen Level und nach jedem
Kauf** — genau wie im Dokument. Im Spielstand stehen: Gold, Ausruestungsstufen,
Skillpunkte (Pool und vergeben), hoechstes freigeschaltetes Level, getoetete
Monster und Heiltraenke. Nicht gespeichert wird die Lage im Level: ein
Spielstand ist der Stand *zwischen* den Leveln, nicht mitten im Kampf. Deshalb
landet „Weiterspielen" im Shop.

Im Shop ist „Weiter" gesperrt, bis das aktuelle Level abgeschlossen ist —
Level 4 laesst sich also nicht ueberspringen.

Der Spielstand liegt im `localStorage` unter `SAVE.key`. Jeder gelesene Wert
wird begrenzt: ein von Hand veraenderter Stand macht das Spiel hoechstens
seltsam, nicht kaputt. Passt die Version nicht, wird er verworfen und neu
angefangen. Geht `localStorage` nicht (privater Modus), laeuft das Spiel ohne
Speichern weiter.

## Tod und Wiederbelebung (Abschnitt 9)

Bei 0 Leben haelt das Spiel an und der Todesbildschirm bietet zwei Wege:

1. **Wiederbeleben gegen Gold** — du stehst an derselben Stelle mit vollem Leben
   auf, besiegte Monster bleiben besiegt. Preis: 50 G beim ersten Tod im Level,
   danach je 25 G mehr (50 → 75 → 100 → 125 …). Nach dem Aufstehen bist du
   1,6 s unverwundbar, damit umstehende Gegner dich nicht sofort wieder umhauen.
2. **Level neu starten** — kostenlos, aber alle Monster leben wieder und das in
   *diesem Durchgang* gesammelte Gold verfaellt. Gold aus frueheren Leveln bleibt.

Ausruestung und Skillpunkte bleiben in beiden Faellen erhalten: sie stehen in
`game.progress` (siehe `createProgress()` in `entities/player.js`) und nicht in der
Spielerfigur, die beim Neustart neu gebaut wird.

Der Todeszaehler wird zurueckgesetzt, sobald das Level abgeschlossen ist.
Derzeit gilt es als abgeschlossen, wenn das letzte Monster faellt — ab Schritt 9
uebernimmt das der Level-Ausgang.

## Level bearbeiten

`assets/levels/level1.json` ist von Hand lesbar: eine Textzeile pro Kachelreihe.

```json
"legend": {
  ".": { "name": "grass", "solid": false, "color": "grass" },
  "#": { "name": "wall",  "solid": true,  "color": "wall", "topColor": "wallTop" },
  "T": { "name": "tree",  "solid": true,  "color": "tree", "topColor": "treeTop" }
},
"tiles": ["TTTTTTT…", "T.....#…", …],
"playerStart": { "x": 4,  "y": 25 },
"exit":        { "x": 36, "y": 3 },
"spawns": [{ "type": "slime", "x": 12, "y": 21 }]
```

`color` verweist auf einen Namen aus `COLORS` in `config.js` (oder direkt `"#rrggbb"`).
`solid: true` heisst: Wand. Alle Koordinaten sind Kacheln, nicht Pixel.
`exit` wird schon geladen, aber erst in Schritt 9 benutzt.

## Grafik und Ton (Abschnitt 8)

Beim Start laedt das Spiel 25 Sprites und 16 Toene; ein Ladebalken zeigt den
Fortschritt. **M** schaltet den Ton stumm.

Die mitgelieferten Assets sind **selbst erzeugte Platzhalter**, keine
heruntergeladene Kunst: 32×32-Pixelgrafik in der duester-mittelalterlichen
Palette und synthetisierte Retro-Sounds. Sie sind da, damit die Lade-Kette
nachweisbar funktioniert.

### Eigene Grafiken einsetzen

Datei unter `assets/sprites/` durch eine gleichnamige **32×32-PNG** ersetzen —
mehr nicht. Kein Code, kein Build. Passende CC0-Quellen stehen in
[assets/CREDITS.md](assets/CREDITS.md), zusammen mit der Liste aller Dateinamen.

Sonderfall: `tile_<name>.png` gehoert zum `name` in der Legende der Level-JSON.
Neue Kachelart? Datei dazulegen und den Namen in `TILE_SPRITES` in
`src/assets.js` ergaenzen.

Grosse Figuren werden hochskaliert (`SPRITES.scale` in `config.js`): der
Panzer-Ork 1,15×, der Boss 1,75× — so wirkt er wuchtig, obwohl die Quelle wie
alle anderen 32×32 ist.

### Toene austauschen

WAV-Dateien unter `assets/sounds/` ersetzen. Welcher Ton wann spielt, steht in
[assets/CREDITS.md](assets/CREDITS.md). Lautstaerken: `AUDIO` in `config.js`.

**Fehlende Dateien sind kein Fehler:** fuer Grafiken erscheint wieder das
farbige Platzhalter-Rechteck, fuer Toene bleibt es still, und die Konsole nennt
die fehlende Datei. Du kannst also einzeln austauschen und dazwischen spielen.

## Stand der Umsetzung

| Schritt | Status |
|---|---|
| 1 Fenster, Bewegung, Blickrichtung, Kamera | fertig |
| 2 Tilemap aus JSON + Wandkollision | fertig |
| 3 Schwertangriff + Treffer + Cooldown | fertig |
| 4 Slime mit Verfolgung, HP-Balken, Ausholphase, Unverwundbarkeit | fertig |
| 5 Gegnertod, Gold-Drop, Gold im HUD | fertig |
| 6 Spielertod + Wiederbelebungs-Bildschirm | fertig |
| 7 Schild, Blockwinkel, Schadensreduktion | fertig |
| 8 Ausweichrolle + Ausdauerleiste | fertig |
| 9 Level-Ausgang + Shop-Bildschirm | fertig |
| 10 Bogen als zweite Waffe + Waffenwechsel | fertig |
| 11 Skillpunkte + Charakterfenster | fertig |
| 12 Monstertypen, Level 2–5, Boss | fertig |
| 13 Sprites und Sounds | fertig (Platzhalter-Assets, austauschbar) |
| 14 Speicherstand, Hauptmenue, Pause-Menue | fertig |
