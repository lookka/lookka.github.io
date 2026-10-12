# Riferimento dei comandi — Pyxis 1.0

Ho raccolto qui la sintassi implementata nella release 1.0. Questo è un riferimento
da consultare mentre scrivi, non una lista di funzionalità future. Per iniziare
segui [la guida pratica](INIZIA-QUI.md); per le proprietà dei modelli fisici consulta
[il manuale dei pacchetti](PACCHETTI.md), che completa questo riferimento.

## Come leggere la sintassi

`N` è il nome univoco di un oggetto, `P` un punto 2D, `r` una dimensione positiva.
Le parentesi quadre nella descrizione indicano argomenti facoltativi, non caratteri
da digitare. Nei blocchi semantici, invece, le liste come `[electron, positron]`
richiedono davvero le parentesi quadre. Un comando per riga; proprietà dei blocchi
una per riga. I commenti iniziano con `#`, fuori dalle stringhe.

I numeri usano il punto decimale. Le coordinate sono unità geometriche arbitrarie;
`width` è in mm, spessori e distanze delle etichette sono in bp (1/72 di pollice).
Le stringhe sono fra doppi apici; le barre inverse LaTeX restano letterali.
Non sono supportati doppi apici escapati dentro una stringa. I nomi cominciano
con una lettera o `_`, poi ammettono lettere, cifre, `_` e punti gerarchici.

Un punto `P` può essere `x y`, un riferimento della griglia (`@A1` … `@G7`)
o un ancoraggio (`A.center`). `@D4` è l'origine; lettere verso destra, numeri
verso il basso. Gli ancoraggi possono riferirsi a oggetti dichiarati più avanti.
I comandi di modifica richiedono invece che l'oggetto sia già stato dichiarato.

## Scena, profili e import

| Comando | Sintassi ed esempio | Spiegazione |
| --- | --- | --- |
| `width` | `width 120` | Larghezza finale in mm, positiva; default 100. Il testo conserva dimensioni fisiche. |
| `grid` | `grid off`, `grid on`, `grid 0.5` | Nasconde/mostra la griglia o ne cambia il passo. Passo tra 1e-6 e 1e6; default 1 e visibile. Gli ancoraggi esistono anche con griglia nascosta. |
| `theme` | `theme paper` oppure `theme: paper` | `paper`, `wire`, `color`, `blackboard`, `modern-vector`, `overleaf-classic` (alias di paper). I temi scelgono convenzioni visive; non cambiano il modello fisico. |
| `use` | `use qft, quantum` | Importa uno o più pacchetti fra qft, quantum, relativity, statmech. Import ripetuti ignorati. |
| `profile` | `profile statmech` | Importa il pacchetto del corso; `research` importa tutti e quattro. È additivo, non sostituisce gli import precedenti. |
| `camera` | `camera 5 -7 5` | Direzione di vista 3D, diversa dal vettore nullo. Default (5,-7,5). |
| `place` | `place B below A gap=1` | Dispone gruppi semantici 2D: above, below, right-of, left-of. gap geometrico 0…1000, default 1. Non è una traslazione di primitive singole; cicli e disposizioni duplicate sono errori. |

```text
use qft, quantum
grid off
feynman F {
    mediator: photon
}
circuit bell {
    q0: H, control(pair)
    q1: _, target(pair), M
}
place bell below F gap=2
```

## Primitive geometriche 2D

| Comando | Sintassi | Spiegazione ed esempio |
| --- | --- | --- |
| `point` | `point N [P]` | Punto invisibile di costruzione; default origine. `point O 0 0`; ancoraggio O.center. |
| `circle` | `circle N [r]` oppure `circle N x y r` oppure `circle N P r` | Cerchio; default origine e r=1. `circle A 0 0 0.5`. |
| `ellipse` | `ellipse N [rx ry]` oppure `ellipse N x y rx ry` oppure `ellipse N P rx ry` | Ellisse, semiassi positivi. Default origine, rx=1, ry=0.5. |
| `line` | `line N [P Q]` | Segmento senza punta. Senza punti va da (-0.5,0) a (0.5,0). `line L A.center B.center`. |
| `arrow` | `arrow N [P Q]` | Come line, con punta finale. `arrow axis 0 0 3 0`. |
| `path` | `path N "x1 y1;x2 y2;…"` oppure `path N P Q …` | Polilinea, almeno due punti, massimo 10000; ammette ancoraggi. `path C "0 0;1 2;3 0"`. |
| `region` | `region N "x1 y1;x2 y2;x3 y3;…"` | Poligono semplice chiuso automaticamente, 3…512 vertici. Niente auto-intersezioni, area nulla o bordi curvi. Nasce sullo sfondo. |
| `gatebox` | `gatebox N x y larghezza altezza` | Rettangolo centrato in (x,y), dimensioni positive; primitiva usata anche dai circuiti. |
| `plot` | `plot N xmin xmax campioni "f(x)"` | Campiona una funzione reale; xmin<xmax, 2…10000 punti. `plot C 0 6 200 "sin(x)"`. Non crea automaticamente gli assi. |

Ancoraggi: circle/ellipse/gatebox hanno `center`, `north`, `south`, `east`, `west`;
line/arrow `start`, `end`, `center`; path/plot `start`, `end`, `node1`, `node2`, …;
point e testi fissi soltanto `center`. Per un percorso, `node1` è il primo punto
campionato. Gli oggetti 3D non espongono questi ancoraggi 2D.

## Formule, variabili e funzioni

| Comando | Esempio | Significato |
| --- | --- | --- |
| `let` | `let a "0.8"` | Valuta una costante all'atto della dichiarazione; nomi univoci. Non rende espressioni tutti i parametri geometrici. |
| `function` | `function wave "a*sin(x)*exp(-x/6)"` | Definisce una funzione di un argomento, usabile come wave(x). Le variabili necessarie devono esistere quando l'espressione viene valutata. |

Operatori: `+`, `-`, `*`, `/`, `^`, parentesi e segni unari. Moltiplicazione
esplicita: scrivi `2*x`, non `2x`. La potenza è associativa a destra:
`2^3^2` significa `2^(3^2)`. `-x^2` significa `-(x^2)`.
Costante `pi`, funzioni `sin`, `cos`, `tan`, `exp`, `log` (naturale), `sqrt`, `abs`.
Trigonometria in radianti. I risultati devono essere reali e finiti.
`plot` fornisce x; `surface` fornisce x,y; phase-flow fornisce x,y,t.
Non sono disponibili confronti, condizioni, cicli, derivate simboliche o lettura CSV.

## Testi e posizionamento

| Comando | Sintassi | Spiegazione |
| --- | --- | --- |
| `label` | `label N [P] "testo LaTeX"` | Etichetta LaTeX; default origine. `label E 1 0 "$E=mc^2$"`. |
| `text` | `text N [P] "testo normale"` | Testo letterale: caratteri speciali TeX escapati dal programma. Non interpreta `$…$` come matematica. |
| `placement` | `placement N auto [preferenza] [gap]` oppure `placement N fixed` | Label/text 2D. Preferenze n,ne,e,se,s,sw,w,nw; default n. Gap in bp, 0…100, default 3. Cerca fra otto posizioni usando misure TeX, senza garantire un layout globalmente privo di collisioni. |

```text
circle A 0.5
label name {
    at: A.center
    text: "$A$"
    placement: auto
    prefer: ne
    gap: 4
}
```

Un'etichetta automatica non può essere un ancoraggio di altra geometria:
usa il nodo a cui è associata. Un testo fisso non vuoto può essere un nodo
di clipping: viene misurato realmente con TeX.

## Percorsi, stili e modifiche

| Comando | Sintassi ed esempio | Effetto e limiti |
| --- | --- | --- |
| `move` | `move N dx dy` | Trasla un oggetto 2D e i suoi controlli; su un oggetto ancorato aggiunge un offset. Per i gruppi usa place. |
| `stroke` | `stroke N dashed` | solid, dashed, dotted; geometria 2D, non testo. |
| `linewidth` | `linewidth N 0.7` | Spessore in bp, >0 e ≤20, non sui testi. Default geometria 0.5, sfere 0.45, superfici 0.25. |
| `bend` | `bend N 0.4` | Arco costruito da un'altezza relativa alla corda, positiva a sinistra del verso start→end. 0 torna rettilineo. Rimuove onde e controlli espliciti. |
| `curve` | `curve N segmento c1x c1y c2x c2y` | Bézier cubica per il segmento numerato da 1. Controlli in coordinate assolute; line/arrow hanno un solo segmento. `curve C 1 0 1 2 1`. Rimuove l'onda. |
| `wave` | `wave N ampiezza oscillazioni` | Onda lungo il percorso; oscillazioni intere 1…64. Rimuove bend e controlli. |
| `flow` | `flow N forward` | none, forward, reverse: freccia di flusso sul percorso. Distinta dalla punta finale di arrow. |
| `markers` | `markers N triangle hollow 0.12` | Marcatori sui nodi: none, circle, square, triangle, diamond o simbolo personalizzato. filled/hollow, dimensione positiva; default filled e 0.08. |
| `symbol` | `symbol kite "0 1;0.6 0;0 -1;-0.6 0"` | Poligono personalizzato per markers, 3…1000 vertici; nome diverso dai marcatori predefiniti. |
| `clip` | `clip N nodes` oppure `clip N off` | Taglia line/arrow/path ai bordi dei nodi ancorati agli estremi: circle, ellipse, gatebox, label/text fissi non vuoti. Funziona sul percorso effettivo, anche curvo. Non taglia contro oggetti arbitrari nel mezzo. |
| `background` | `background N` | Dispone un oggetto sullo sfondo 2D; non prende on/off. |
| `nodefill` | `nodefill N black` | Riempimento di un circle: black, white, none. |
| `color` | `color N 0.2 0.4 0.8` | RGB 0…1 su geometria 2D/3D; non testi/punti invisibili. Su region controlla il riempimento; sul tratto 2D controlla il colore del tratto. |
| `fill` | `fill N color` | auto, none, white, color per region/sphere/surface/mesh3. Non è il comando di riempimento dei circle: usa nodefill. |
| `opacity` | `opacity N 0.3` | Solo region, fra 0 (trasparente) e 1 (opaco), default 0.25. |
| `outline` | `outline N off` | on/off per il contorno delle region riempite; default on. |

Gli stili di percorso bend/curve/wave/flow/markers si applicano a line, arrow,
path e plot; le region devono restare poligoni rettilinei senza onde/flusso/clipping.
Una correzione di curve/bend/wave può cambiare il metodo del percorso:
non trattarli come decorazioni indipendenti tutte simultanee.

## Vincoli geometrici

| Comando | Sintassi | Spiegazione |
| --- | --- | --- |
| `tangent-circle` | `tangent-circle B A east 0.3` | Crea B tangente esternamente al circle A. Direzioni north,south,east,west,ne,nw,se,sw. Il raggio di B è positivo. |
| `parallel` | `parallel N P riferimento lunghezza` | Segmento centrato in P, parallelo a una line/arrow rettilinea non degenere. |
| `perpendicular` | `perpendicular N P riferimento lunghezza` | Come parallel, direzione ruotata di 90°. |
| `parallel-arrow` | `parallel-arrow N P riferimento lunghezza` | Variante con punta finale. |
| `perpendicular-arrow` | `perpendicular-arrow N P riferimento lunghezza` | Variante con punta finale. |

Lunghezze positive. Il riferimento può essere dichiarato dopo. Non assegnare
offset al cerchio tangente: romperebbe la relazione. Spostando il cerchio di
riferimento, il dipendente si aggiorna. Non è un solver di vincoli generali.

## Geometria 3D

| Comando | Sintassi | Spiegazione |
| --- | --- | --- |
| `sphere` | `sphere N [r]` oppure `sphere N x y z r` | Sfera; default origine e r=1. |
| `surface` | `surface N xmin xmax ymin ymax mesh "f(x,y)"` | Superficie z=f(x,y), intervalli crescenti; mesh intera 2…60, campioni (mesh+1)². Esempio: `surface S -2 2 -2 2 16 "x^2+y^2"`. |
| `path3` | `path3 N "x y z;x y z;…"` | Polilinea 3D, 2…10000 vertici. |
| `arrow3` | `arrow3 N "x y z;x y z;…"` | Percorso 3D con punta finale. |
| `mesh3` | `mesh3 N righe colonne "x y z;…"` | Griglia rettangolare ordinata per righe; righe/colonne intere 2…61, esattamente righe×colonne vertici. |
| `label3` | `label3 N [x y z] "LaTeX"` | Etichetta LaTeX 3D; default origine. |
| `text3` | `text3 N [x y z] "testo"` | Testo letterale 3D. |
| `move3` | `move3 N dx dy dz` | Traslazione di un oggetto 3D. |
| `detail` | `detail N minimal` | Solo sphere: minimal, outline, mesh; default minimal. |
| `shading` | `shading N 0.14` | Solo sphere, 0…0.8. Ombreggiatura vettoriale, non simulazione ottica. |

Le scene 2D e 3D sono distinte: usa figure/ambienti separati. Il PDF/SVG è una
proiezione vettoriale, non un modello 3D interattivo. Per RGB, fill, linewidth
e direzione della vista usa color, fill, linewidth, camera.

## Forma a blocchi delle primitive

`tipo nome {` apre un blocco, `}` lo chiude su una propria riga. La tabella
elenca tutte le proprietà ammesse. Numeri e coordinate fra parentesi/comma
sono accettati nelle proprietà che normalizzano coordinate; le liste di punti
rimangono stringhe separate da `;` o successioni di ancoraggi.

| Tipo | Proprietà geometriche/testuali |
| --- | --- |
| point | at |
| circle | center, radius, tangent-to, direction, stroke |
| ellipse | center, radii, stroke |
| line, arrow | from, to, path, route, stroke, markers, controls, through, parallel-to, perpendicular-to, length, clip |
| path | points, route, stroke, markers, controls, clip |
| region | points (obbligatoria), color, fill, opacity, stroke, outline |
| label, text | at, text, placement, prefer, gap |
| sphere | center, radius, color, fill, detail, shading |
| surface | xrange, yrange, mesh, formula, color, fill |
| label3, text3 | at, text |

Tutti questi blocchi ammettono `offset`; figure non testuali/non point ammettono
`stroke-width`. circle/ellipse/line/arrow/path ammettono anche `color`.
`offset: (dx,dy)` equivale a move; sui tipi 3D `(dx,dy,dz)` equivale a move3.
`controls: 1 c1x c1y c2x c2y` equivale a curve sul segmento 1.
`markers: triangle(hollow,0.12)` equivale al comando markers.
`path` o `route` (scegline uno): straight, arc(altezza), wave(ampiezza,oscillazioni).
`prefer`/`gap` richiedono placement: auto.
`through`/`length` richiedono parallel-to o perpendicular-to e sostituiscono from/to.
`direction` richiede tangent-to; center e tangent-to sono incompatibili.
gatebox/plot/path3/arrow3/mesh3 non hanno una forma a blocchi nella release 1.0.

```text
circle A {
    center: (0,0)
    radius: 0.4
}
circle B {
    center: (2,0)
    radius: 0.4
}
arrow connection {
    from: A.center
    to: B.center
    path: arc(0.5)
    clip: nodes
    stroke-width: 0.7
}
```

## Tutti i comandi dei pacchetti fisici

La sintassi è `tipo nome {` con una proprietà per riga. Prima importa il pacchetto.
Il prefisso qualificato è facoltativo soltanto dopo l'import e senza ambiguità.
Per ogni proprietà, valori ammessi, default, convenzioni fisiche ed esempi completi
sono nel [manuale dei pacchetti](PACCHETTI.md).

| Comando | Descrizione | Tutte le proprietà |
| --- | --- | --- |
| qft.feynman | Albero 2→2 s/t/u e bolla sul mediatore | channel, incoming, outgoing, mediator, labels, loop, loop-position, loop-radius, label-placement |
| quantum.circuit | Righe di qubit in ordine, colonne separate da virgole | Nomi dei qubit come proprietà; H,X,Y,Z,S,T,M, `_`, control(id), target(id), gate("U"), oracle(id,"$U_f$") |
| quantum.tensor-network | Catena MPS o reticolo PEPS aperto | sites, labels, layout, rows, columns |
| quantum.bloch | Sfera di Bloch e vettore di uno stato puro | theta, phi (deg/rad obbligatori) |
| relativity.penrose | Minkowski, Schwarzschild o schema Kerr sull'asse | metric, spin, bands |
| relativity.embedding | Paraboloide di Flamm | metric, radius, extent, mesh, branch |
| relativity.light-cones | Coni nulli radiali locali Schwarzschild | metric, chart, radii, rows, height |
| relativity.geodesic | Raggio nullo equatoriale Schwarzschild | metric, kind, impact, extent, max-angle, max-step, abs-tol, rel-tol, max-steps, photon-sphere, view, mesh |
| statmech.ising | Reticolo/spin 2D o 3D | rows, columns, state, spins, dimension, layers |
| statmech.phase-diagram | Diagramma P-T schematico | model, melting, labels, point-labels, opacity |
| statmech.phase-flow | Traiettoria di ODE 2D | dx, dy, start, duration, steps, integrator, abs-tol, rel-tol, max-step, max-steps |
| statmech.lorenz | Traiettoria del sistema di Lorenz | sigma, rho, beta, start, duration, steps, integrator, abs-tol, rel-tol, max-step, max-steps |

I comandi semantici generano componenti nominati, che puoi rifinire con i comandi
geometrici. Disegnare un circuito non simula lo stato; disegnare un diagramma QFT
non verifica le interazioni e non calcola l'ampiezza. Kerr non è una carta generale
fuori dall'asse; phase-diagram non ricava l'equazione di stato di un materiale.

## Comandi dell'editor VS Code

| Comando nella palette Ctrl+Shift+P | Azione |
| --- | --- |
| Pyxis: Nuova figura | Apre l'editor/anteprima. Scorciatoia Ctrl+Alt+F mentre modifichi LaTeX. |
| Pyxis: Modifica figura esistente | Riapre un sorgente .pyxis per modificarlo. |
| Pyxis: Figura da esempio del corso | Crea una bozza da un esempio; il modello originale resta intatto. |
| Pyxis: Compila documento LaTeX | Genera il PDF degli appunti, seguendo i capitoli supportati. |
| Pyxis: Guida rapida | Apre la guida inclusa nell'estensione. |

La casella dei ritocchi rapidi comprende i comandi geometrici supportati e:

```text
set F mediator gluon
set bell q0 X, control(pair)
set orbit integrator rk4
```

`set nome proprietà valore` è **solo un comando dell'editor**, non del compilatore
del linguaggio. Modifica una proprietà di un oggetto definito a blocco. Su rk4
rimuove le proprietà riservate all'integratore adaptive. `profile`/`use` nella
casella aggiungono import; theme/grid/width/camera modificano le impostazioni.
Salva figura produce .pyxis/.svg/.pdf e inserisce includegraphics nel documento.

| Impostazione VS Code | Valore / funzione |
| --- | --- |
| pyxis.executable | Percorso opzionale del compilatore; vuoto usa quello incluso. |
| pyxis.asymptote | Percorso di asy.exe quando non è nel PATH. |
| pyxis.ghostscript | Percorso di gswin64c.exe quando non è nel PATH. |
| pyxis.buildOnSave | true di default; false per disattivare la build LaTeX al salvataggio. |
| pyxis.latexEngine | pdflatex (default), lualatex o xelatex. |

## Ambiente LaTeX

```latex
\documentclass{article}
\usepackage{pyxis}
\begin{document}
\begin{pyxis}[width=90,theme=paper]
profile quantum
circuit bell {
    q0: H, control(pair)
    q1: _, target(pair), M
}
\end{pyxis}
\end{document}
```

Opzioni dell'ambiente: width in mm, theme. Chiudi con `\end{pyxis}` su una propria
riga. Compila attraverso Pyxis: un normale pdflatex da solo non genera le figure.
Nei blocchi nativi `%` fuori da stringhe diventa commento; il resto del documento
mantiene la sintassi LaTeX. Sono supportati `\input`, `\include`, `\includeonly`
con nomi letterali e `% !TeX root = ../main.tex` per i capitoli. Il preambolo
condivide pacchetti e dichiarazioni newcommand/renewcommand/providecommand/
DeclareMathOperator con le etichette. Subfiles/import, input costruiti da macro
e orchestrazione BibTeX/Biber non sono supportati nella 1.0.

## Terminale e script

Questi comandi si eseguono dalla cartella del progetto completo, non dal solo VSIX.
Per gli script JavaScript serve Node.js; per gli script PowerShell serve PowerShell.
Asymptote/TeX/Ghostscript sono dipendenze esterne. Variabili opzionali per gli
script: PYXIS_ASYMPTOTE e PYXIS_GHOSTSCRIPT (percorsi degli eseguibili).

| Comando | Cosa produce |
| --- | --- |
| `node scripts/render.js examples/qft.pyxis pdf` | output/qft.pdf; sostituisci pdf con svg per SVG. |
| `node scripts/render.js examples/qft.pyxis svg --preview` | Esportazione con opzione anteprima; file .preview.svg. |
| `./scripts/render.ps1 -Source examples/qft.pyxis -Format pdf` | Wrapper PowerShell; -Preview è facoltativo. |
| `node scripts/build-latex.js documento.tex --engine=pdflatex` | PDF finale con nome del documento; engine facoltativo: pdflatex, lualatex, xelatex. |
| `node scripts/latex.js documento.tex derivato.tex --compile` | Pipeline a basso livello: documento derivato esplicito e compilazione facoltativa. Le figure referenziate sono protette nella cache. |
| `./build/pyxis.exe input.pyxis output.asy [--preview]` | Solo compilazione del linguaggio in Asymptote; non è ancora un PDF. --preview è facoltativo. |
| `node scripts/doctor.js` | Diagnostica degli strumenti disponibili. |
| `./scripts/build.ps1 -Release` | Compila nucleo e test con GCC C++17, poi esegue i test. -Compiler cambia il percorso GCC predefinito. |
| `./scripts/package.ps1 -SkipBuild` | Crea il VSIX dalla build già presente; senza SkipBuild ricompila in Release. |
| `./scripts/install.ps1 -SkipBuild` | Installer per il PC di sviluppo con .tools configurata; su un altro PC installa il VSIX e configura i runtime. |
| `./scripts/start.ps1 -Folder examples` | Apre un host di sviluppo VS Code; non serve per usare l'estensione già installata. |
| `./scripts/test-editor.ps1` | Prova l'editor in un profilo temporaneo. |
| `./scripts/test-package.ps1` | Prova il VSIX installato in un profilo temporaneo. |

Per gli altri test e la loro copertura consulta [VERIFICHE.md](VERIFICHE.md).
`_use` e `_group` sono istruzioni interne generate dal preprocessore, non API
pubblica. I comandi vertex, fermion, momentum, replace, loop, rotate e i modelli
proposti nei documenti di design non fanno parte della sintassi eseguibile 1.0.
