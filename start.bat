@echo off
REM Startet den lokalen Server und oeffnet das Spiel im Browser.
REM Beenden: dieses Fenster mit Strg+C oder Schliessen.
cd /d "%~dp0"
start "" http://localhost:8080
node server.mjs
