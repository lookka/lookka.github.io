# Stato di Pyxis — 12 ottobre 2026

Release 1.0 Windows x64: catalogo semantico, strumenti LaTeX ed estensione installabile.
I modelli fisici supportati e i loro limiti sono specificati in PACCHETTI.md.

## Release 1.0

Regioni poligonali semplici con riempimento vettoriale/opacity e verifica dei
bordi; diagrammi P-T schematici con punto triplo/critico e due segni della
pendenza di fusione. Ising 3D con configurazioni esplicite e bordi aperti.
Profili di corso additive rispetto a use, oracoli su qubit contigui con controlli.
Clipping delle scatole TeX misurate nel frame finale, compresi tratti curvi
e spessori delle linee. Eventi di arresto localizzati per le traiettorie.
Coni radiali di Schwarzschild in carta Painleve-Gullstrand e raggi nulli
equatoriali con scattering/cattura; vista piana o proiezione spaziale riportata
sull'embedding di Flamm. Il raggio nullo non e' una geodetica intrinseca della
sola superficie spaziale.
Compilazione del documento nativo nell'editor al salvataggio: PDF con il nome
standard, due passaggi LaTeX, originale intatto, pubblicazione soltanto dopo successo.
Segue capitoli input/include, includeonly e TeX root. Macro del preambolo
condivise con le figure. Kerr sull'asse subestremale con orizzonti di Cauchy
e continuazione periodica. Loop photon campionato senza flusso fermionico.
Pacchetto VSIX con compilatore statico incluso, sorgenti, guide ed esempi;
installazione su questo PC collegata ai runtime esistenti. Codice Pyxis MIT.

## Incremento 0.5

Integratore C++ condiviso 2D/3D: RK4 fisso compatibile e RK4 adattivo con
step doubling, tolleranze locali assolute/relative, passi respinti, limite
del campionamento e arresto con diagnostica. Esempio del pendolo libero e
smorzato, senza coordinate manuali dei pannelli. Le tolleranze non sono
garanzie sull'errore globale; sistemi stiff ed eventi restano fuori scope.
Il propagatore gluonico ha raccordi simmetrici ai due vertici e ampiezza
limitata sulle linee corte, verificati sulle coordinate generate.

## Incremento 0.4

Etichette automatiche 2D misurate da LaTeX, valutazione di otto direzioni
nel frame finale e penalita' per etichette, nodi, tratti e punte native delle
frecce. Inchiostro/testo con dimensioni fisiche costanti al variare di width.
QFT usa ora il sistema comune per default, con modalita' fixed disponibile.
Test delle misure reali, cambi di scala, ostacoli fissi, sovrapposizioni fra
formule, flussi orientati e casi in cui tutte le direzioni sono occupate.
La procedura e' greedy e non garantisce un layout senza collisioni in ogni scena.

## Incremento 0.3

Vincoli direzionali parallel/perpendicular, tangenza esterna fra cerchi,
punti nominati invisibili e clipping ai bordi dei nodi su segmenti/Bezier/onde.
Reti PEPS e MPS con connessioni, etichette e gambe fisiche che seguono i nodi.
Il layout dei gruppi supporta ora gli ancoraggi interni senza doppia traslazione.
Test C++ matematici, test delle intersezioni con il vero Asymptote e regressioni
di rendering. Nuove voci cache obsolete vengono eliminate automaticamente,
proteggendo gli asset referenziati da documenti LaTeX derivati conservati.
La guida GUIDA-SVILUPPO.md accompagna il codice con esperimenti e letture guidate.

## Incremento semantico 0.2

Implementati import combinabili, registry dei pacchetti, blocchi semantici,
nomi gerarchici, composizione di gruppi 2D e diagnostica di cicli/conflitti.
I moduli sono in src/packages; il nucleo e il backend precedenti sono riutilizzati.
Disponibili Feynman 2→2 con loop, circuiti, MPS, Bloch, Penrose Minkowski/Schwarzschild,
embedding di Flamm, Ising 2D, orbite RK4 2D e Lorenz 3D.
Preprocessore LaTeX reale, cache SHA-256 con verifica degli artefatti,
temi paper/modern-vector/blackboard e ritocchi dei pacchetti nell'editor.
Il manuale PACCHETTI.md distingue le funzionalita' effettive dagli obiettivi integrali.
Le limitazioni elencate sotto per il prototipo 0.1 sono aggiornate da questo incremento.

## Verificato

- Nucleo C++17: formule, oggetti, ancoraggi, percorsi, onde, Bezier, griglia di costruzione.
- Sorgenti dichiarativi a blocchi e comandi rapidi per modificare le proprieta'.
- Cerchi, ellissi, frecce, testo/LaTeX, grafici y=f(x).
- Sfere e superfici z=f(x,y), camera ortografica, etichette 3D.
- Stile paper: griglia senza riempimento, sfere senza equatore, sfumatura e spessori configurabili.
- Pipeline reale SVG/PDF, anche 3D, con etichette. Gli SVG testati non contengono immagini raster.
- Extension Host sul VSIX installato: anteprima, salvataggio .pyxis/.svg/.pdf, inserimento LaTeX, build nativa e build al salvataggio. Anteprima a freddo del caso di prova: circa 7.2 secondi in quel test.
- Pulizia automatica degli intermedi della pipeline dopo successo ed errore.

## Avvio

Aprire Installa Pyxis.cmd, ricaricare VS Code e aprire il documento LaTeX.
Ctrl+Alt+F apre la figura; la palette contiene esempi del corso e guida rapida.
Per ambienti nativi usare usepackage pyxis e la build dell'estensione.
start.ps1 resta disponibile per lo sviluppo. Le istruzioni sono in INIZIA-QUI.md.

## Dipendenze necessarie

.tools/asymptote: Asymptote 3.15 con moduli e DLL.
.tools/ghostscript: Ghostscript 10.08.0 console con risorse e licenza.
LaTeX e dvisvgm sono quelli gia' presenti sul PC. Non eliminare .tools.
L'installer collega i runtime di questo PC. Su altri PC il VSIX richiede
installazioni proprie di Asymptote/Ghostscript/TeX; non li redistribuisce.

## Limiti

Scene miste 2D/3D, rotazioni e ancoraggi 3D non ancora disponibili.
Feynman, Penrose, circuiti, reti tensoriali e reticoli hanno un primo insieme
di oggetti eseguibili; le estensioni integrali sono elencate in PACCHETTI.md.
Gruppi semantici 2D, ancoraggi interni e clipping agli estremi dei nodi sono
disponibili. Regioni e clipping delle scatole TeX fisse sono implementati;
gruppi arbitrari, layer espliciti, import dati e superfici parametriche generali
restano da implementare.
Variabili, funzioni e simboli vanno definiti prima dell'uso.
La sfumatura vettoriale 3D puo' mostrare giunzioni tra patch in alcuni visualizzatori.
Servono altre prove manuali e una sintassi consolidata insieme al proprietario.

## File conservati

Codice, test riutilizzabili, documentazione, esempi, SVG/PDF dimostrativi, eseguibili e runtime necessari.
Installer, estrattori, proxy sperimentale, profilo VS Code di prova e intermedi diagnostici rimossi.
La sessione didattica e la divisione dei compiti C++ si faranno successivamente.
