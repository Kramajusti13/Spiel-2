# Assets und Lizenzen

Diese Datei muss aktuell bleiben, wenn du Grafiken oder Toene austauschst —
sonst gibt es Aerger, falls du das Spiel spaeter veroeffentlichst (Abschnitt 8).

## Aktueller Stand

| Was | Herkunft | Lizenz |
|---|---|---|
| `sprites/*.png` (35 Dateien) | fuer dieses Projekt erzeugte Platzhalter | frei verwendbar, keine Bedingungen |
| `sounds/*.wav` (16 Dateien) | fuer dieses Projekt synthetisiert | frei verwendbar, keine Bedingungen |
| `levels/*.json` (10 Level) | eigene Level | frei verwendbar |

Die Sprites und Toene sind **Platzhalter in Spielqualitaet**, keine fertige
Kunst: erzeugte 32×32-Pixelgrafik in der duester-mittelalterlichen Palette und
synthetisierte Retro-Sounds. Sie sind da, damit die Lade-Kette nachweisbar
funktioniert und das Spiel nicht nach bunten Rechtecken aussieht.

## Grafiken austauschen

Alle Sprites sind **32×32 px**. Zum Ersetzen genuegt es, eine Datei durch eine
gleichnamige 32×32-PNG zu ueberschreiben — am Code aendert sich nichts.

```
assets/sprites/
  player.png  slime.png  goblin.png  archer.png
  armoredOrc.png  orcChieftain.png  gorilla.png  frog.png  giftpilz.png
  krokodil.png  titanoboa.png
  coin.png  arrow.png  stone.png
  tile_grass.png  tile_grassDark.png  tile_path.png  tile_wall.png  tile_tree.png
  tile_caveFloor.png  tile_caveFloorDark.png  tile_caveWall.png  tile_rock.png
  tile_ruinFloor.png  tile_ruinFloorDark.png  tile_pillar.png
  tile_dirt.png  tile_dirtDark.png  tile_palisade.png
  tile_bossFloor.png  tile_bossFloorDark.png
```

Der Dateiname `tile_<name>.png` gehoert zum `name` in der Legende der
Level-JSON. Neue Kachelart? Datei dazulegen und den Namen in `TILE_SPRITES`
in `src/assets.js` ergaenzen.

Grosse Figuren werden hochskaliert gezeichnet (Ork 1,15×, Boss 1,75× — siehe
`SPRITES.scale` in `src/config.js`), damit sie trotz 32×32-Quelle wuchtig wirken.

### Empfohlene Quellen (aus Abschnitt 8)

- **Kenney.nl** — CC0, keine Namensnennung noetig. Passend: „Tiny Dungeon",
  „Micro Roguelike"
- **itch.io → Free Game Assets** — nach „dark fantasy top down 32x32" suchen
- **OpenGameArt.org** — nur CC0 oder CC-BY verwenden
- Ton: **freesound.org**, **Kenney Audio Packs**

Traegst du etwas davon ein, gehoert hier eine Zeile mit Paketname, Autor,
Lizenz und Fundstelle hin. Beispiel:

```
| sprites/player.png | Kenney "Tiny Dungeon" (kenney.nl) | CC0 |
```

## Toene austauschen

Alle Toene liegen als WAV unter `assets/sounds/`. Auch `.ogg` oder `.mp3`
funktionieren — dann die Endung in `loadSound` in `src/assets.js` anpassen.

| Datei | Wann er spielt |
|---|---|
| `swing.wav` | Schwerthieb |
| `hit.wav` / `hitCrit.wav` | Treffer am Gegner, normal / kritisch |
| `enemyDeath.wav` | Gegner faellt |
| `playerHit.wav` | Spieler wird getroffen |
| `block.wav` | Treffer wird mit dem Schild geblockt |
| `coin.wav` | Gold eingesammelt |
| `bow.wav` / `arrowHit.wav` | Pfeil abgeschossen / eingeschlagen |
| `roll.wav` | Ausweichrolle |
| `potion.wav` | Heiltrank getrunken |
| `levelClear.wav` | letztes Monster im Level besiegt |
| `bossPhase.wav` | der Boss wechselt die Phase |
| `playerDeath.wav` | Spieler faellt |
| `buy.wav` | Kauf im Shop |
| `skillPoint.wav` | neuer Skillpunkt verdient |

Lautstaerken stehen in `AUDIO` in `src/config.js`, im Spiel schaltet **M**
den Ton stumm.

## Fehlende Dateien

Fehlt eine Datei, laeuft das Spiel weiter: fuer Grafiken erscheint wieder das
farbige Platzhalter-Rechteck, fuer Toene bleibt es still. In der Browser-Konsole
steht dann, welche Datei gefehlt hat.
