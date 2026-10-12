# Verifiche della release 1.0

Le verifiche usano il compilatore C++17 Release, Asymptote/MiKTeX/Ghostscript
del PC e VS Code. I risultati riguardano questa configurazione Windows x64.

## Controlli riproducibili

```powershell
./scripts/build.ps1 -Release
node tests/source.js
node tests/cache-latex.js
node tests/backend.js
node tests/clipping.js
node tests/labels.js
node tests/native-latex.js
node tests/performance.js
./scripts/package.ps1 -SkipBuild
./scripts/test-package.ps1
```

Eseguire backend.js da solo: verifica che non compaiano intermedi nuovi
nel temporaneo di sistema, quindi non deve sovrapporsi ad altri rendering.
Gli altri test puliscono le directory univoche che creano.

- C++: errori sintattici, nomi/ancoraggi, layout, vincoli, regioni, pacchetti,
  spin 3D, oracoli, geodetiche, eventi e convergenza numerica.
- Sorgente/editor: ritocchi, cambio di metodo e proprieta' dei pacchetti.
- Cache/LaTeX: corruzione, scritture atomiche, richieste concorrenti,
  contesti verbatim, macro e originali intatti.
- Backend: SVG/PDF reali, 2D/3D e SVG senza immagini raster.
- Clipping: intersezioni di segmenti/curve/onde e scatole TeX nel frame finale.
- Etichette: misure reali TeX, scala, collisioni e punte native delle frecce.
- Documento: capitoli annidati, includeonly, TeX root, macro del principale,
  arresto su cicli e PDF precedente conservato in caso di errore.
- VSIX: installazione in profilo isolato, compilatore incluso, anteprima,
  salvataggi/inserimento e build del documento dall'editor del capitolo.

## Tempi misurati

Nel benchmark qft.pyxis del 12 ottobre 2026: nuovo rendering PDF 4341 ms;
cinque richieste con cache gia' preparata hanno media 59 ms e massimo 64 ms.
Questi tempi escludono l'avvio di un nuovo processo Node, misurano il servizio
di rendering e dipendono da carico e configurazione. Non garantiscono un
rendering nuovo sotto 150 ms. L'editor accorpa le richieste e mantiene reattiva
la scrittura durante una compilazione piu' lunga.

La lettura/verifica indipendente degli eseguibili e dei moduli e' parallela,
senza cambiare ordine o ingredienti della chiave SHA-256. I risultati della
cache rimangono validati mediante hash, non soltanto dalla presenza del file.

## Controllo visuale

Figure ispezionate: etichette automatiche, propagatore gluonico e loop,
oracolo controllato, regioni P-T, spin 3D, coni di luce, scattering/cattura,
raggio riportato sul Flamm e schema conforme sull'asse di Kerr.
I PNG in output sono anteprime utili; PDF/SVG sono le esportazioni vettoriali.

Una figura plausibile non sostituisce i test fisici: usiamo soluzioni
analitiche, invarianti e casi limite quando sono disponibili. I limiti
dei modelli sono descritti in PACCHETTI.md.
