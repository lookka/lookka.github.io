# Manuale di riferimento — Pyxis 1.0

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

Questo manuale documenta l’API pubblica del linguaggio Pyxis 1.0.
Ogni comando ha una scheda autonoma: sintassi, parametri, default, esempio
completo e vincoli. Per iniziare a usare l’applicazione: [installazione e uso](INIZIA-QUI.md).
Per l’implementazione C++: [architettura e sorgenti](CODICE-CPP.md).

## Indice dei comandi

**Scena, profili e import** — [camera](#camera), [grid](#grid), [place](#place), [profile](#profile), [theme](#theme), [use](#use), [width](#width)

**Primitive geometriche 2D** — [arrow](#arrow), [circle](#circle), [ellipse](#ellipse), [gatebox](#gatebox), [line](#line), [path](#path), [plot](#plot), [point](#point), [region](#region)

**Formule, variabili e funzioni** — [function](#function), [let](#let)

**Testi e posizionamento** — [label](#label), [placement](#placement), [text](#text)

**Percorsi, stili e modifiche** — [background](#background), [bend](#bend), [clip](#clip), [color](#color), [curve](#curve), [fill](#fill), [flow](#flow), [linewidth](#linewidth), [markers](#markers), [move](#move), [nodefill](#nodefill), [opacity](#opacity), [outline](#outline), [stroke](#stroke), [symbol](#symbol), [wave](#wave)

**Vincoli geometrici** — [parallel](#parallel), [parallel-arrow](#parallel-arrow), [perpendicular](#perpendicular), [perpendicular-arrow](#perpendicular-arrow), [tangent-circle](#tangent-circle)

**Geometria 3D** — [arrow3](#arrow3), [detail](#detail), [label3](#label3), [mesh3](#mesh3), [move3](#move3), [path3](#path3), [shading](#shading), [sphere](#sphere), [surface](#surface), [text3](#text3)

**Pacchetti** — [qft.feynman](#qft-feynman), [quantum.circuit](#quantum-circuit), [quantum.tensor-network](#quantum-tensor-network), [quantum.bloch](#quantum-bloch), [statmech.ising](#statmech-ising), [statmech.phase-flow](#statmech-phase-flow), [statmech.lorenz](#statmech-lorenz), [statmech.phase-diagram](#statmech-phase-diagram), [relativity.penrose](#relativity-penrose), [relativity.embedding](#relativity-embedding), [relativity.light-cones](#relativity-light-cones), [relativity.geodesic](#relativity-geodesic)

## Convenzioni sintattiche

- `N`: identificatore univoco. Gli oggetti da modificare devono essere già dichiarati.
- `P`, `Q`: punti 2D; scrivere due numeri (`1 2`), un punto della griglia (`@D4`) o un ancoraggio (`A.center`).
- `[argomento]` nella **firma**: argomento facoltativo. Le liste nelle proprietà dei pacchetti, per esempio `[electron, positron]`, richiedono invece le parentesi.
- Una istruzione per riga; una proprietà per riga nei blocchi. Commenti `#` fuori dalle stringhe.
- Stringhe fra doppi apici. Le barre inverse LaTeX sono letterali; doppi apici escapati nella stringa non sono supportati.
- Coordinate in unità geometriche; width in mm; linewidth e gap delle etichette in bp (1/72 di pollice). Numeri con punto decimale.
- Nomi: lettera o `_` iniziale, poi lettere/cifre/underscore; punti per nomi gerarchici. Nessun punto finale o doppio punto.
- Scene 2D e 3D separate. Non mescolare le loro primitive nella stessa figura.

**Ancoraggi.** circle/ellipse/gatebox: center, north, south, east, west.
line/arrow: start, end, center. path/plot: start, end, node1, node2, ….
point e testi fissi: center. I riferimenti geometrici possono anticipare una
dichiarazione successiva, purché non producano un ciclo. Le etichette automatiche
non sono ancoraggi geometrici.

## arrow

**Categoria:** Primitive geometriche 2D.

Come line, con punta finale. `arrow axis 0 0 3 0`.

### Sintassi

```text
arrow N [P Q]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P / Q` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |

### Valori predefiniti

Estremi (-0.5,0) e (0.5,0) se omessi.

### Esempio completo

```pyxis
arrow L 0 0 2 1
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [line](#line), [path](#path).

## arrow3

**Categoria:** Geometria 3D.

Percorso 3D con punta finale.

### Sintassi

```text
arrow3 N "x y z;x y z;…"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `vertici` | stringa | 2…10000 terne x y z separate da ;, con punta finale. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
arrow3 A "0 0 0;1 1 1"
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [mesh3](#mesh3), [label3](#label3).

## background

**Categoria:** Percorsi, stili e modifiche.

Dispone un oggetto sullo sfondo 2D; non prende on/off.

### Sintassi

```text
background N
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L -1 0 1 0
circle A 0.3
background L
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## bend

**Categoria:** Percorsi, stili e modifiche.

Arco costruito da un'altezza relativa alla corda, positiva a sinistra del verso start→end. 0 torna rettilineo. Rimuove onde e controlli espliciti.

### Sintassi

```text
bend N altezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `altezza` | reale | Curvatura relativa alla corda; positiva verso la sua sinistra, 0 rettilineo. |

### Valori predefiniti

`0`.

### Esempio completo

```pyxis
arrow A 0 0 2 0
bend A 0.4
```

### Interazioni

Rimuove onde e controlli Bézier espliciti. Non usarlo sui bordi delle region, che devono rimanere poligonali.

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [curve](#curve), [wave](#wave).

## camera

**Categoria:** Scena, profili e import.

Direzione di vista 3D, diversa dal vettore nullo. Default (5,-7,5).

### Sintassi

```text
camera x y z
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `x y z` | tre reali | Direzione di vista 3D; il vettore non può essere nullo. |

### Valori predefiniti

(5,-7,5).

### Esempio completo

```pyxis
camera 5 -7 5
sphere S 1
```

**Vedi anche:** [width](#width), [grid](#grid), [theme](#theme), [use](#use), [profile](#profile).

## circle

**Categoria:** Primitive geometriche 2D.

Cerchio; default origine e r=1. `circle A 0 0 0.5`.

### Sintassi

```text
circle N [r]
circle N x y r
circle N ancoraggio [r]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `r` | reale positivo | Raggio, in unità geometriche. |

### Valori predefiniti

Centro (0,0), raggio 1.

### Esempio completo

```pyxis
circle A 0 0 0.5
```

**Vedi anche:** [point](#point), [ellipse](#ellipse), [line](#line), [arrow](#arrow), [path](#path).

## clip

**Categoria:** Percorsi, stili e modifiche.

Taglia line/arrow/path ai bordi dei nodi ancorati agli estremi: circle, ellipse, gatebox, label/text fissi non vuoti. Funziona sul percorso effettivo, anche curvo. Non taglia contro oggetti arbitrari nel mezzo.

### Sintassi

```text
clip N nodes
clip N off
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `modalità` | nodes / off | Taglio ai bordi dei nodi ancorati agli estremi, oppure disattivazione. |

### Valori predefiniti

off per primitive esplicite; alcuni pacchetti emettono nodes.

### Esempio completo

```pyxis
circle A 0 0 0.3
circle B 2 0 0.3
arrow L A.center B.center
clip L nodes
```

### Vincoli

Richiede estremi con ancoraggi nominati: circle, ellipse, gatebox o label/text fissi non vuoti. Il taglio avviene sul percorso effettivo anche per curve/onde. Un point è invisibile e non ha un bordo. Non taglia contro oggetti arbitrari nel mezzo del percorso.

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## color

**Categoria:** Percorsi, stili e modifiche.

RGB 0…1 su geometria 2D/3D; non testi/punti invisibili. Su region controlla il riempimento; sul tratto 2D controlla il colore del tratto.

### Sintassi

```text
color N r g b
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `r g b` | tre reali 0…1 | Colore RGB; su region cambia il riempimento, sulle linee 2D il tratto. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L 0 0 2 0
color L 0.2 0.4 0.8
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## curve

**Categoria:** Percorsi, stili e modifiche.

Bézier cubica per il segmento numerato da 1. Controlli in coordinate assolute; line/arrow hanno un solo segmento. `curve C 1 0 1 2 1`. Rimuove l'onda.

### Sintassi

```text
curve N segmento c1x c1y c2x c2y
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `segmento` | intero da 1 | Segmento da modificare; line/arrow hanno solo il segmento 1. |
| `c1x c1y c2x c2y` | quattro reali | Coordinate assolute dei due controlli Bézier. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L 0 0 2 0
curve L 1 0 1 2 1
```

### Interazioni

Rimuove l’onda; sostituisce i controlli dello stesso segmento. Non usarlo sui bordi delle region, che devono rimanere poligonali.

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [wave](#wave).

## detail

**Categoria:** Geometria 3D.

Solo sphere: minimal, outline, mesh; default minimal.

### Sintassi

```text
detail N minimal|outline|mesh
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `modalità` | minimal / outline / mesh | Dettaglio della sphere. |

### Valori predefiniti

minimal.

### Esempio completo

```pyxis
sphere S 1
detail S mesh
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3).

## ellipse

**Categoria:** Primitive geometriche 2D.

Ellisse, semiassi positivi. Default origine, rx=1, ry=0.5.

### Sintassi

```text
ellipse N [rx ry]
ellipse N x y rx ry
ellipse N ancoraggio [rx ry]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `rx ry` | due reali positivi | Semiassi orizzontale e verticale. |

### Valori predefiniti

Centro (0,0), semiassi 1 e 0.5.

### Esempio completo

```pyxis
ellipse E 0 0 1 0.5
```

**Vedi anche:** [point](#point), [circle](#circle), [line](#line), [arrow](#arrow), [path](#path).

## fill

**Categoria:** Percorsi, stili e modifiche.

auto, none, white, color per region/sphere/surface/mesh3. Non è il comando di riempimento dei circle: usa nodefill.

### Sintassi

```text
fill N auto|none|white|color
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `modalità` | auto / none / white / color | Riempimento per region, sphere, surface e mesh3. |

### Valori predefiniti

auto.

### Esempio completo

```pyxis
sphere S 1
fill S none
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## flow

**Categoria:** Percorsi, stili e modifiche.

none, forward, reverse: freccia di flusso sul percorso. Distinta dalla punta finale di arrow.

### Sintassi

```text
flow N verso
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `verso` | none / forward / reverse | Freccia di flusso; distinta dalla punta finale di arrow. |

### Valori predefiniti

none.

### Esempio completo

```pyxis
line L 0 0 2 0
flow L forward
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## function

**Categoria:** Formule, variabili e funzioni.

Definisce una funzione di un argomento, usabile come wave(x). Le variabili necessarie devono esistere quando l'espressione viene valutata.

### Sintassi

```text
function nome "espressione"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `nome` | identificatore | Nome della funzione, non riservato. |
| `espressione` | stringa | Corpo della funzione di un argomento, rappresentato da x. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
function f "sin(x)*exp(-x/6)"
plot C 0 6 100 "f(x)"
```

**Vedi anche:** [let](#let).

## gatebox

**Categoria:** Primitive geometriche 2D.

Rettangolo centrato in (x,y), dimensioni positive; primitiva usata anche dai circuiti.

### Sintassi

```text
gatebox N x y larghezza altezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `x y` | due reali | Centro del rettangolo. |
| `larghezza altezza` | due reali positivi | Dimensioni geometriche complete, non semiassi. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
gatebox G 0 0 1 0.7
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [line](#line), [arrow](#arrow).

## grid

**Categoria:** Scena, profili e import.

Nasconde/mostra la griglia o ne cambia il passo. Passo tra 1e-6 e 1e6; default 1 e visibile. Gli ancoraggi esistono anche con griglia nascosta.

### Sintassi

```text
grid on
grid off
grid passo
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `opzione` | on / off / numero | on/off cambia la visibilità; un numero 1e-6…1e6 imposta il passo e mostra la griglia. |

### Valori predefiniti

Visibile, passo 1.

### Esempio completo

```pyxis
grid 0.5
circle A @D4 0.5
```

**Vedi anche:** [width](#width), [theme](#theme), [use](#use), [profile](#profile), [camera](#camera).

## label

**Categoria:** Testi e posizionamento.

Etichetta LaTeX; default origine. `label E 1 0 "$E=mc^2$"`.

### Sintassi

```text
label N [P] "testo LaTeX"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `testo` | stringa | LaTeX; delimitare la matematica con $…$. |

### Valori predefiniti

Posizione (0,0), placement fixed.

### Esempio completo

```pyxis
label E 0 0 "$E=mc^2$"
```

### Posizionamento

Con auto, la scelta è greedy fra otto candidati misurati con TeX. Non garantisce l’assenza globale di collisioni. prefer/gap sono proprietà del posizionamento automatico.

**Vedi anche:** [text](#text), [placement](#placement).

## label3

**Categoria:** Geometria 3D.

Etichetta LaTeX 3D; default origine.

### Sintassi

```text
label3 N [x y z] "LaTeX"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `x y z` | tre reali opzionali | Posizione 3D. |
| `testo` | stringa | Formula o testo LaTeX. |

### Valori predefiniti

(0,0,0).

### Esempio completo

```pyxis
sphere S 1
label3 T 0 0 1.3 "$S^2$"
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3).

## let

**Categoria:** Formule, variabili e funzioni.

Valuta una costante all'atto della dichiarazione; nomi univoci. Non rende espressioni tutti i parametri geometrici.

### Sintassi

```text
let nome "espressione"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `nome` | identificatore | Nome della costante, non riservato. |
| `espressione` | stringa | Valutata alla dichiarazione; le dipendenze devono essere definite. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
let a "0.8"
plot C 0 6 100 "a*sin(x)"
```

**Vedi anche:** [function](#function).

## line

**Categoria:** Primitive geometriche 2D.

Segmento senza punta. Senza punti va da (-0.5,0) a (0.5,0). `line L A.center B.center`.

### Sintassi

```text
line N [P Q]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P / Q` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |

### Valori predefiniti

Estremi (-0.5,0) e (0.5,0) se omessi.

### Esempio completo

```pyxis
line L 0 0 2 1
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [arrow](#arrow), [path](#path).

## linewidth

**Categoria:** Percorsi, stili e modifiche.

Spessore in bp, >0 e ≤20, non sui testi. Default geometria 0.5, sfere 0.45, superfici 0.25.

### Sintassi

```text
linewidth N bp
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `bp` | reale >0 e ≤20 | Spessore fisico in bp (1/72 di pollice). |

### Valori predefiniti

0.5 bp; sphere 0.45 bp; surface 0.25 bp.

### Esempio completo

```pyxis
line L 0 0 2 0
linewidth L 0.8
```

**Vedi anche:** [move](#move), [stroke](#stroke), [bend](#bend), [curve](#curve), [wave](#wave).

## markers

**Categoria:** Percorsi, stili e modifiche.

Marcatori sui nodi: none, circle, square, triangle, diamond o simbolo personalizzato. filled/hollow, dimensione positiva; default filled e 0.08.

### Sintassi

```text
markers N simbolo [filled|hollow [dimensione]]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `simbolo` | enumerazione / nome | none, circle, square, triangle, diamond, oppure simbolo definito con symbol. |
| `riempimento` | opzionale | filled / hollow. |
| `dimensione` | reale positivo opzionale | Dimensione geometrica del marcatore. |

### Valori predefiniti

none sull’oggetto; quando specificato, filled e dimensione 0.08 se omessi.

### Esempio completo

```pyxis
path P "0 0;1 1;2 0"
markers P triangle hollow 0.12
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## mesh3

**Categoria:** Geometria 3D.

Griglia rettangolare ordinata per righe; righe/colonne intere 2…61, esattamente righe×colonne vertici.

### Sintassi

```text
mesh3 N righe colonne "x y z;…"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `righe colonne` | due interi 2…61 | Dimensioni della griglia. |
| `vertici` | stringa | Esattamente righe×colonne terne x y z in ordine di riga. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
mesh3 M 2 2 "0 0 0;1 0 0;0 1 0;1 1 1"
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [label3](#label3).

## move

**Categoria:** Percorsi, stili e modifiche.

Trasla un oggetto 2D e i suoi controlli; su un oggetto ancorato aggiunge un offset. Per i gruppi usa place.

### Sintassi

```text
move N dx dy
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `dx dy` | due reali | Spostamento relativo 2D; somma un offset alle coordinate/ancoraggi. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
circle A 0.5
move A 1 0
```

**Vedi anche:** [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve), [wave](#wave).

## move3

**Categoria:** Geometria 3D.

Traslazione di un oggetto 3D.

### Sintassi

```text
move3 N dx dy dz
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `dx dy dz` | tre reali | Spostamento relativo 3D. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
sphere S 1
move3 S 1 0 0
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3).

## nodefill

**Categoria:** Percorsi, stili e modifiche.

Riempimento di un circle: black, white, none.

### Sintassi

```text
nodefill N black|white|none
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `riempimento` | black / white / none | Solo circle; non usare fill per riempire un cerchio 2D. |

### Valori predefiniti

none.

### Esempio completo

```pyxis
circle A 0.3
nodefill A black
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## opacity

**Categoria:** Percorsi, stili e modifiche.

Solo region, fra 0 (trasparente) e 1 (opaco), default 0.25.

### Sintassi

```text
opacity N alpha
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `alpha` | reale 0…1 | Opacità di region: 0 trasparente, 1 opaca. |

### Valori predefiniti

0.25 sulle primitive region; i pacchetti possono impostarla diversamente.

### Esempio completo

```pyxis
region R "0 0;2 0;1 1"
opacity R 0.5
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## outline

**Categoria:** Percorsi, stili e modifiche.

on/off per il contorno delle region riempite; default on.

### Sintassi

```text
outline N on|off
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `modalità` | on / off | Contorno delle region riempite. |

### Valori predefiniti

on.

### Esempio completo

```pyxis
region R "0 0;2 0;1 1"
outline R off
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## parallel

**Categoria:** Vincoli geometrici.

Segmento centrato in P, parallelo a una line/arrow rettilinea non degenere.

### Sintassi

```text
parallel N P riferimento lunghezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `riferimento` | nome | Line/arrow rettilinea e non degenere. |
| `lunghezza` | reale positivo | Lunghezza del segmento, centrato in P. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L -1 0 1 0
parallel N 0 1 L 2
```

**Vedi anche:** [tangent-circle](#tangent-circle), [perpendicular](#perpendicular), [parallel-arrow](#parallel-arrow), [perpendicular-arrow](#perpendicular-arrow).

## parallel-arrow

**Categoria:** Vincoli geometrici.

Variante con punta finale.

### Sintassi

```text
parallel-arrow N P riferimento lunghezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `riferimento` | nome | Line/arrow rettilinea e non degenere. |
| `lunghezza` | reale positivo | Lunghezza del segmento, centrato in P. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L -1 0 1 0
parallel-arrow N 0 1 L 2
```

**Vedi anche:** [tangent-circle](#tangent-circle), [parallel](#parallel), [perpendicular](#perpendicular), [perpendicular-arrow](#perpendicular-arrow).

## path

**Categoria:** Primitive geometriche 2D.

Polilinea, almeno due punti, massimo 10000; ammette ancoraggi. `path C "0 0;1 2;3 0"`.

### Sintassi

```text
path N "x1 y1;x2 y2;…"
path N P Q …
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `punti` | sequenza 2D | Almeno 2, massimo 10000. Stringa con ; oppure successione di punti/ancoraggi. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
path P "0 0;1 1;2 0"
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [line](#line), [arrow](#arrow).

## path3

**Categoria:** Geometria 3D.

Polilinea 3D, 2…10000 vertici.

### Sintassi

```text
path3 N "x y z;x y z;…"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `vertici` | stringa | 2…10000 terne x y z separate da ;. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
path3 P "0 0 0;1 0 1;1 1 2"
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [arrow3](#arrow3), [mesh3](#mesh3), [label3](#label3).

## perpendicular

**Categoria:** Vincoli geometrici.

Come parallel, direzione ruotata di 90°.

### Sintassi

```text
perpendicular N P riferimento lunghezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `riferimento` | nome | Line/arrow rettilinea e non degenere. |
| `lunghezza` | reale positivo | Lunghezza del segmento, centrato in P. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L -1 0 1 0
perpendicular N 0 1 L 2
```

**Vedi anche:** [tangent-circle](#tangent-circle), [parallel](#parallel), [parallel-arrow](#parallel-arrow), [perpendicular-arrow](#perpendicular-arrow).

## perpendicular-arrow

**Categoria:** Vincoli geometrici.

Variante con punta finale.

### Sintassi

```text
perpendicular-arrow N P riferimento lunghezza
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `riferimento` | nome | Line/arrow rettilinea e non degenere. |
| `lunghezza` | reale positivo | Lunghezza del segmento, centrato in P. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L -1 0 1 0
perpendicular-arrow N 0 1 L 2
```

**Vedi anche:** [tangent-circle](#tangent-circle), [parallel](#parallel), [perpendicular](#perpendicular), [parallel-arrow](#parallel-arrow).

## place

**Categoria:** Scena, profili e import.

Dispone gruppi semantici 2D: above, below, right-of, left-of. gap geometrico 0…1000, default 1. Non è una traslazione di primitive singole; cicli e disposizioni duplicate sono errori.

### Sintassi

```text
place B relazione A [gap=numero]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `B / A` | nomi di gruppi | Gruppo da disporre / gruppo di riferimento. |
| `relazione` | enumerazione | above, below, left-of, right-of. |
| `gap` | reale opzionale | Distanza geometrica 0…1000; scrivere gap=numero. |

### Valori predefiniti

gap=1.

### Esempio completo

```pyxis
use quantum
circuit A {
    q0: H
}
circuit B {
    q0: X
}
place B below A gap=2
```

**Vedi anche:** [width](#width), [grid](#grid), [theme](#theme), [use](#use), [profile](#profile).

## placement

**Categoria:** Testi e posizionamento.

Label/text 2D. Preferenze n,ne,e,se,s,sw,w,nw; default n. Gap in bp, 0…100, default 3. Cerca fra otto posizioni usando misure TeX, senza garantire un layout globalmente privo di collisioni.

### Sintassi

```text
placement N auto [preferenza] [gap]
placement N fixed
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `modalità` | auto / fixed | Scelta automatica o posizione fissa. |
| `preferenza` | opzionale | n, ne, e, se, s, sw, w, nw. |
| `gap` | reale opzionale 0…100 | Distanza in bp, non in unità geometriche. |

### Valori predefiniti

Posizionamento iniziale fixed; con auto, preferenza n e gap 3 bp se omessi.

### Esempio completo

```pyxis
circle A 0.5
label T A.center "$A$"
placement T auto ne 4
```

### Posizionamento

Con auto, la scelta è greedy fra otto candidati misurati con TeX. Non garantisce l’assenza globale di collisioni. prefer/gap sono proprietà del posizionamento automatico.

**Vedi anche:** [label](#label), [text](#text).

## plot

**Categoria:** Primitive geometriche 2D.

Campiona una funzione reale; xmin<xmax, 2…10000 punti. `plot C 0 6 200 "sin(x)"`. Non crea automaticamente gli assi.

### Sintassi

```text
plot N xmin xmax campioni "f(x)"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `xmin xmax` | due reali | Intervallo crescente. |
| `campioni` | intero 2…10000 | Numero dei punti della polilinea campionata. |
| `formula` | stringa | Espressione reale in x, per esempio "sin(x)". |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
plot C 0 6 100 "sin(x)"
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [line](#line), [arrow](#arrow).

## point

**Categoria:** Primitive geometriche 2D.

Punto invisibile di costruzione; default origine. `point O 0 0`; ancoraggio O.center.

### Sintassi

```text
point N [P]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |

### Valori predefiniti

(0,0).

### Esempio completo

```pyxis
point P 1 0
circle A P.center 0.3
```

**Vedi anche:** [circle](#circle), [ellipse](#ellipse), [line](#line), [arrow](#arrow), [path](#path).

## profile

**Categoria:** Scena, profili e import.

Importa il pacchetto del corso; `research` importa tutti e quattro. È additivo, non sostituisce gli import precedenti.

### Sintassi

```text
profile nome
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `nome` | enumerazione | qft, quantum, relativity, statmech, research; research importa tutti. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
profile quantum
circuit C {
    q0: H
}
```

**Vedi anche:** [width](#width), [grid](#grid), [theme](#theme), [use](#use), [camera](#camera).

## region

**Categoria:** Primitive geometriche 2D.

Poligono semplice chiuso automaticamente, 3…512 vertici. Niente auto-intersezioni, area nulla o bordi curvi. Nasce sullo sfondo.

### Sintassi

```text
region N "x1 y1;x2 y2;x3 y3;…"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `vertici` | sequenza 2D | 3…512 vertici; poligono semplice con area non nulla, chiuso automaticamente. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
region R "0 0;2 0;1 1"
color R 0.2 0.5 0.8
opacity R 0.3
```

**Vedi anche:** [point](#point), [circle](#circle), [ellipse](#ellipse), [line](#line), [arrow](#arrow).

## shading

**Categoria:** Geometria 3D.

Solo sphere, 0…0.8. Ombreggiatura vettoriale, non simulazione ottica.

### Sintassi

```text
shading N intensità
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `intensità` | reale 0…0.8 | Ombreggiatura vettoriale della sphere. |

### Valori predefiniti

0.14.

### Esempio completo

```pyxis
sphere S 1
shading S 0.2
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3).

## sphere

**Categoria:** Geometria 3D.

Sfera; default origine e r=1.

### Sintassi

```text
sphere N [r]
sphere N x y z r
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `x y z` | tre reali opzionali | Centro. |
| `r` | reale positivo opzionale | Raggio. |

### Valori predefiniti

Centro (0,0,0), raggio 1.

### Esempio completo

```pyxis
sphere S 0 0 0 1
```

**Vedi anche:** [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3), [label3](#label3).

## stroke

**Categoria:** Percorsi, stili e modifiche.

solid, dashed, dotted; geometria 2D, non testo.

### Sintassi

```text
stroke N stile
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `stile` | solid / dashed / dotted | Stile del tratto 2D. |

### Valori predefiniti

solid.

### Esempio completo

```pyxis
line L 0 0 2 0
stroke L dashed
```

**Vedi anche:** [move](#move), [linewidth](#linewidth), [bend](#bend), [curve](#curve), [wave](#wave).

## surface

**Categoria:** Geometria 3D.

Superficie z=f(x,y), intervalli crescenti; mesh intera 2…60, campioni (mesh+1)². Esempio: `surface S -2 2 -2 2 16 "x^2+y^2"`.

### Sintassi

```text
surface N xmin xmax ymin ymax mesh "f(x,y)"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `xmin xmax ymin ymax` | quattro reali | Intervalli crescenti per x e y. |
| `mesh` | intero 2…60 | Suddivisioni per asse; (mesh+1)² campioni. |
| `formula` | stringa | Espressione z=f(x,y), per esempio "x^2+y^2". |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
surface S -2 2 -2 2 12 "x^2+y^2"
```

**Vedi anche:** [sphere](#sphere), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3), [label3](#label3).

## symbol

**Categoria:** Percorsi, stili e modifiche.

Poligono personalizzato per markers, 3…1000 vertici; nome diverso dai marcatori predefiniti.

### Sintassi

```text
symbol nome "x y;x y;…"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `nome` | identificatore | Nome non riservato del simbolo. |
| `vertici` | stringa | 3…1000 coppie x y separate da ;. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
symbol kite "0 1;0.6 0;0 -1;-0.6 0"
path P "0 0;1 0"
markers P kite filled 0.12
```

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## tangent-circle

**Categoria:** Vincoli geometrici.

Crea B tangente esternamente al circle A. Direzioni north,south,east,west,ne,nw,se,sw. Il raggio di B è positivo.

### Sintassi

```text
tangent-circle B A direzione r
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `B / A` | identificatori | Nuovo cerchio / cerchio di riferimento. |
| `direzione` | enumerazione | north, south, east, west, ne, nw, se, sw. |
| `r` | reale positivo | Raggio del nuovo cerchio; tangenza esterna. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
circle A 0.5
tangent-circle B A east 0.3
```

**Vedi anche:** [parallel](#parallel), [perpendicular](#perpendicular), [parallel-arrow](#parallel-arrow), [perpendicular-arrow](#perpendicular-arrow).

## text

**Categoria:** Testi e posizionamento.

Testo letterale: caratteri speciali TeX escapati dal programma. Non interpreta `$…$` come matematica.

### Sintassi

```text
text N [P] "testo normale"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `P` | punto 2D | Coppia x y, punto @A1…@G7 oppure ancoraggio come A.center. |
| `testo` | stringa | Testo letterale; i caratteri speciali TeX vengono escapati. |

### Valori predefiniti

Posizione (0,0), placement fixed.

### Esempio completo

```pyxis
text T 0 0 "Energia totale"
```

### Posizionamento

Con auto, la scelta è greedy fra otto candidati misurati con TeX. Non garantisce l’assenza globale di collisioni. prefer/gap sono proprietà del posizionamento automatico.

**Vedi anche:** [label](#label), [placement](#placement).

## text3

**Categoria:** Geometria 3D.

Testo letterale 3D.

### Sintassi

```text
text3 N [x y z] "testo"
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `x y z` | tre reali opzionali | Posizione 3D. |
| `testo` | stringa | Testo letterale. |

### Valori predefiniti

(0,0,0).

### Esempio completo

```pyxis
sphere S 1
text3 T 0 0 1.3 "Sfera"
```

**Vedi anche:** [sphere](#sphere), [surface](#surface), [path3](#path3), [arrow3](#arrow3), [mesh3](#mesh3).

## theme

**Categoria:** Scena, profili e import.

`paper`, `wire`, `color`, `blackboard`, `modern-vector`, `overleaf-classic` (alias di paper). I temi scelgono convenzioni visive; non cambiano il modello fisico.

### Sintassi

```text
theme nome
theme: nome
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `nome` | enumerazione | paper, wire, color, blackboard, modern-vector, overleaf-classic. |

### Valori predefiniti

paper.

### Esempio completo

```pyxis
theme blackboard
circle A 1
```

**Vedi anche:** [width](#width), [grid](#grid), [use](#use), [profile](#profile), [camera](#camera).

## use

**Categoria:** Scena, profili e import.

Importa uno o più pacchetti fra qft, quantum, relativity, statmech. Import ripetuti ignorati.

### Sintassi

```text
use pacchetto[, pacchetto…]
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `pacchetti` | lista separata da virgole | qft, quantum, relativity, statmech; import cumulativi. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
use quantum
circuit C {
    q0: H
}
```

**Vedi anche:** [width](#width), [grid](#grid), [theme](#theme), [profile](#profile), [camera](#camera).

## wave

**Categoria:** Percorsi, stili e modifiche.

Onda lungo il percorso; oscillazioni intere 1…64. Rimuove bend e controlli.

### Sintassi

```text
wave N ampiezza oscillazioni
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `N` | identificatore | Nome univoco dell’oggetto; dichiarato prima se il comando lo modifica. |
| `ampiezza` | reale | Ampiezza geometrica dell’onda. |
| `oscillazioni` | intero 1…64 | Numero di oscillazioni intere lungo il percorso. |

### Valori predefiniti

Gli argomenti della firma sono obbligatori, salvo quelli indicati fra parentesi quadre. Il comando non viene applicato automaticamente.

### Esempio completo

```pyxis
line L 0 0 2 0
wave L 0.1 6
```

### Interazioni

Rimuove bend e controlli Bézier. Non usarlo sui bordi delle region, che devono rimanere poligonali.

**Vedi anche:** [move](#move), [stroke](#stroke), [linewidth](#linewidth), [bend](#bend), [curve](#curve).

## width

**Categoria:** Scena, profili e import.

Larghezza finale in mm, positiva; default 100. Il testo conserva dimensioni fisiche.

### Sintassi

```text
width mm
```

### Parametri

| Parametro | Tipo | Significato e vincoli |
| --- | --- | --- |
| `mm` | reale positivo | Larghezza finale della figura in millimetri. |

### Valori predefiniti

100 mm.

### Esempio completo

```pyxis
width 90
circle A 1
```

**Vedi anche:** [grid](#grid), [theme](#theme), [use](#use), [profile](#profile), [camera](#camera).

## qft.feynman

**Categoria:** pacchetto qft.

Albero 2→2 s/t/u e bolla sul mediatore.

### Sintassi

```text
use qft
feynman N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `feynman`; il nome qualificato `qft.feynman` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `channel` | Canale topologico: s, t, u. | `s` |
| `incoming` | Lista di due particelle entranti. | `[electron, positron]` |
| `outgoing` | Lista di due particelle uscenti. | `[muon, antimuon]` |
| `mediator` | Tipo di particella del mediatore. | `photon` |
| `labels` | Etichette esplicite fra virgolette; numero richiesto dipendente dal modello. Esattamente quattro, nell’ordine incoming/outgoing. | `Da particelle` |
| `loop` | Bolla: fermion, scalar, ghost, photon. Assente per il diagramma ad albero. | `Assente` |
| `loop-position` | Frazione della posizione sul mediatore; richiede loop. Reale nell’intervallo [0.05, 0.95]. | `0.5` |
| `loop-radius` | Raggio geometrico della bolla; richiede loop e spazio sufficiente sul mediatore. Reale nell’intervallo [0.05, 0.5]. | `0.25` |
| `label-placement` | auto / fixed per etichette esterne. | `auto` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use qft
grid off
feynman tree {
    mediator: photon
}
```

**Esempio distribuito:** `examples/qft.pyxis`.

## quantum.circuit

**Categoria:** pacchetto quantum.

Righe di qubit in ordine, colonne separate da virgole.

### Sintassi

```text
use quantum
circuit N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `circuit`; il nome qualificato `quantum.circuit` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `nome_qubit` | Nome arbitrario valido del qubit; valore = lista dei gate, colonne separate da virgole. | `Nessun default: almeno una riga` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use quantum
grid off
circuit controlled {
    ancilla: H, control(f), H, M
    q0: _, oracle(f,"$U_f$"), _, M
    q1: _, oracle(f,"$U_f$"), _, M
}
```

### Istruzioni di gate

`H`, `X`, `Y`, `Z`, `S`, `T`, `M`, `_`, `control(id)`, `target(id)`, `gate("U")`, `oracle(id,"$U_f$")`. Le virgole separano le colonne; l’ordine delle proprietà determina l’ordine dei qubit. Un oracle occupa almeno due righe contigue, con formula condivisa. Un controllo esterno con lo stesso id lo collega al blocco. Pyxis disegna il circuito, non simula le misure.

**Esempio distribuito:** `examples/oracles.pyxis`.

## quantum.tensor-network

**Categoria:** pacchetto quantum.

Catena MPS o reticolo PEPS aperto.

### Sintassi

```text
use quantum
tensor-network N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `tensor-network`; il nome qualificato `quantum.tensor-network` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `layout` | mps / peps. | `mps` |
| `sites` | Numero di tensori della catena; soltanto MPS. Intero nell’intervallo [1, 32]. | `4` |
| `rows` | Numero di righe. Intero nell’intervallo [1, 16]. Soltanto PEPS; 1…16, massimo 128 siti complessivi. | `3` |
| `columns` | Numero di colonne. Intero nell’intervallo [1, 16]. Soltanto PEPS; 1…16, massimo 128 siti complessivi. | `3` |
| `labels` | Etichette esplicite fra virgolette; numero richiesto dipendente dal modello. Una per tensore, in ordine di riga. | `A_1, A_2, …` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use quantum
grid off
tensor-network chain {
    layout: mps
    sites: 4
}
```

**Esempio distribuito:** `examples/tensor-networks.pyxis`.

## quantum.bloch

**Categoria:** pacchetto quantum.

Sfera di Bloch e vettore di uno stato puro.

### Sintassi

```text
use quantum
bloch N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `bloch`; il nome qualificato `quantum.bloch` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `theta` | Angolo polare 0…180deg, oppure equivalente in rad. Unità obbligatoria. | `60deg` |
| `phi` | Angolo azimutale; suffisso deg/rad obbligatorio. | `35deg` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use quantum
grid off
quantum.bloch qubit {
    theta: 60deg
    phi: 35deg
}
```

**Esempio distribuito:** `examples/bloch.pyxis`.

## relativity.penrose

**Categoria:** pacchetto relativity.

Minkowski, Schwarzschild o schema Kerr sull'asse.

### Sintassi

```text
use relativity
penrose N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `penrose`; il nome qualificato `relativity.penrose` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `metric` | minkowski, schwarzschild, kerr (soltanto asse subestremale). | `minkowski` |
| `spin` | Rapporto a/M, soltanto Kerr subestremale sull’asse. Reale nell’intervallo [1e-6, 0.999999]. | `0.7` |
| `bands` | Numero di bande del diagramma Kerr: 3, 5, 7. Intero nell’intervallo [3, 7]. | `3` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use relativity
grid off
penrose flat {
    metric: minkowski
}
```

**Esempio distribuito:** `examples/penrose.pyxis`.

## relativity.embedding

**Categoria:** pacchetto relativity.

Paraboloide di Flamm.

### Sintassi

```text
use relativity
embedding N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `embedding`; il nome qualificato `relativity.embedding` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `metric` | schwarzschild (sezione equatoriale spaziale). | `schwarzschild` |
| `radius` | Raggio r_s in unità geometriche. Reale nell’intervallo [1e-4, 1e4]. | `1` |
| `extent` | Raggio esterno espresso come rapporto r/r_s. Reale nell’intervallo [1.01, 100]. | `4` |
| `mesh` | Risoluzione della superficie; per geodesic richiede view: embedding. Intero nell’intervallo [4, 30]. | `16` |
| `branch` | upper / lower del paraboloide di Flamm. | `upper` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use relativity
grid off
relativity.embedding flamm {
    metric: schwarzschild
    radius: 1
    extent: 4
    mesh: 16
    branch: upper
}
```

**Esempio distribuito:** `examples/embedding.pyxis`.

## relativity.light-cones

**Categoria:** pacchetto relativity.

Coni nulli radiali locali Schwarzschild.

### Sintassi

```text
use relativity
light-cones N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `light-cones`; il nome qualificato `relativity.light-cones` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `metric` | schwarzschild (unica metrica implementata per questo oggetto). | `schwarzschild` |
| `chart` | painleve-gullstrand ingoing (unico modello). | `painleve-gullstrand` |
| `radii` | Lista crescente di 1…16 raggi; ogni rapporto r/r_s tra 0.1 e 100. | `[0.6, 1, 1.8, 3.2, 5]` |
| `rows` | Numero di righe. Intero nell’intervallo [1, 8]. | `2` |
| `height` | Estensione locale del cono; viene ridotta vicino a r=0. Reale nell’intervallo [0.01, 0.5]. | `0.32` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use relativity
grid off
light-cones causal {
    metric: schwarzschild
    chart: painleve-gullstrand
    radii: [0.6, 1, 1.8, 3.2, 5]
    rows: 3
}
```

**Esempio distribuito:** `examples/light-cones.pyxis`.

## relativity.geodesic

**Categoria:** pacchetto relativity.

Raggio nullo equatoriale Schwarzschild.

### Sintassi

```text
use relativity
geodesic N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `geodesic`; il nome qualificato `relativity.geodesic` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `metric` | schwarzschild (unica metrica implementata per questo oggetto). | `schwarzschild` |
| `kind` | null (raggi nulli equatoriali). | `null` |
| `impact` | Parametro d’impatto b/r_s; deve consentire il ramo iniziale entrante. Reale nell’intervallo [0.1, 100]. | `3` |
| `extent` | Raggio esterno espresso come rapporto r/r_s. Reale nell’intervallo [2, 1000]. | `12` |
| `max-angle` | Limite di phi in radianti: errore se il raggio non termina entro questo limite. Reale nell’intervallo [0.01, 100]. | `37.69911184307752` |
| `max-step` | Passo massimo; nelle ODE richiede adaptive, in geodesic è in radianti. Reale nell’intervallo [1e-6, 0.05]. | `0.01` |
| `abs-tol` | Tolleranza assoluta locale; nelle ODE richiede adaptive. Reale nell’intervallo [1e-14, 1e-3]. | `1e-10` |
| `rel-tol` | Tolleranza relativa locale; nelle ODE richiede adaptive. Reale nell’intervallo [0, 1e-3]. | `1e-10` |
| `max-steps` | Limite di passi accettati; nelle ODE richiede adaptive. Intero nell’intervallo [1, 9999]. | `9999` |
| `photon-sphere` | on / off per la circonferenza r=1.5r_s. | `on` |
| `view` | plane (2D) / embedding (3D). | `plane` |
| `mesh` | Intero 4…30; richiede view: embedding. | `12` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use relativity
grid off
geodesic scattered {
    impact: 3
    extent: 10
}
```

**Esempio distribuito:** `examples/geodesics.pyxis`.

## statmech.ising

**Categoria:** pacchetto statmech.

Reticolo/spin 2D o 3D.

### Sintassi

```text
use statmech
ising N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `ising`; il nome qualificato `statmech.ising` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `dimension` | 2 / 3. Intero nell’intervallo [2, 3]. | `2` |
| `rows` | Numero di righe. Intero nell’intervallo [1, 32]. | `4` |
| `columns` | Numero di colonne. Intero nell’intervallo [1, 32]. | `4` |
| `layers` | Numero di strati, soltanto dimension: 3. Intero nell’intervallo [1, 16]. Il 3D ha massimo 512 siti. | `3` |
| `state` | up / down / checkerboard / domains; configura spin predefiniti. | `up` |
| `spins` | Lista esplicita di +1/-1; esattamente un valore per sito, ordine strato-riga-colonna. | `Da state` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use statmech
grid off
ising lattice {
    dimension: 3
    rows: 3
    columns: 3
    layers: 3
    state: checkerboard
}
```

**Esempio distribuito:** `examples/ising3d.pyxis`.

## statmech.phase-diagram

**Categoria:** pacchetto statmech.

Diagramma P-T schematico.

### Sintassi

```text
use statmech
phase-diagram N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `phase-diagram`; il nome qualificato `statmech.phase-diagram` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `model` | schematic (unico modello P–T). | `schematic` |
| `melting` | positive / negative per la pendenza della linea di fusione. | `positive` |
| `labels` | Quattro stringhe nell’ordine solido, liquido, gas, supercritico. | `["Solid", "Liquid", "Gas", "Supercritical"]` |
| `point-labels` | Due stringhe, punto triplo e punto critico. | `["TP", "CP"]` |
| `opacity` | Opacità delle regioni, 0…1. Reale nell’intervallo [0, 1]. | `0.22` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use statmech
grid off
phase-diagram ordinary {
    melting: positive
    labels: ["Solido", "Liquido", "Gas", "Supercritico"]
}
```

**Esempio distribuito:** `examples/phase-diagrams.pyxis`.

## statmech.phase-flow

**Categoria:** pacchetto statmech.

Traiettoria di ODE 2D.

### Sintassi

```text
use statmech
phase-flow N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `phase-flow`; il nome qualificato `statmech.phase-flow` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `dx` | Stringa della derivata dx/dt in x,y,t. | `"y"` |
| `dy` | Stringa della derivata dy/dt in x,y,t. | `"-x"` |
| `start` | Lista delle coordinate iniziali dello stato. | `[1, 0]` |
| `duration` | Tempo totale di integrazione, non larghezza grafica. Reale nell’intervallo [1e-6, 1e4]. | `6.283185307179586` |
| `steps` | Passi fissi con rk4; con adaptive imposta il max-step predefinito duration/steps. Intero nell’intervallo [4, 9999]. | `400` |
| `integrator` | rk4 (fisso) / adaptive (step doubling). | `rk4` |
| `abs-tol` | Tolleranza assoluta locale; nelle ODE richiede adaptive. Reale nell’intervallo [1e-14, 1]. | `1e-8` |
| `rel-tol` | Tolleranza relativa locale; nelle ODE richiede adaptive. Reale nell’intervallo [0, 1]. | `1e-6` |
| `max-step` | Passo massimo; nelle ODE richiede adaptive, in geodesic è in radianti. Reale nell’intervallo [1e-12, 1e4]. | `duration/steps` |
| `max-steps` | Limite di passi accettati; nelle ODE richiede adaptive. Intero nell’intervallo [1, 9999]. | `9999` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use statmech
grid off
phase-flow libration {
    dx: "y"
    dy: "-sin(x)"
    start: [1.5, 0]
    duration: 15
    integrator: adaptive
    abs-tol: 1e-9
    rel-tol: 1e-9
    max-step: 0.08
}
```

**Esempio distribuito:** `examples/adaptive-flow.pyxis`.

## statmech.lorenz

**Categoria:** pacchetto statmech.

Traiettoria del sistema di Lorenz.

### Sintassi

```text
use statmech
lorenz N {
    proprietà: valore
}
```

Dopo l’import è ammesso il nome breve `lorenz`; il nome qualificato `statmech.lorenz` è sempre esplicito, ma richiede comunque l’import.

### Proprietà

| Proprietà | Valori / significato | Default |
| --- | --- | --- |
| `sigma` | Parametro σ del modello Lorenz. Reale nell’intervallo [0.001, 100]. | `10` |
| `rho` | Parametro ρ del modello Lorenz. Reale nell’intervallo [0.001, 100]. | `28` |
| `beta` | Parametro β del modello Lorenz. Reale nell’intervallo [0.001, 100]. | `2.6666666666666665` |
| `start` | Lista delle coordinate iniziali dello stato. | `[1, 1, 1]` |
| `duration` | Tempo totale di integrazione, non larghezza grafica. Reale nell’intervallo [1e-4, 100]. | `30` |
| `steps` | Passi fissi con rk4; con adaptive imposta il max-step predefinito duration/steps. Intero nell’intervallo [10, 9999]. | `6000` |
| `integrator` | rk4 (fisso) / adaptive (step doubling). | `rk4` |
| `abs-tol` | Tolleranza assoluta locale; nelle ODE richiede adaptive. Reale nell’intervallo [1e-14, 1]. | `1e-8` |
| `rel-tol` | Tolleranza relativa locale; nelle ODE richiede adaptive. Reale nell’intervallo [0, 1]. | `1e-6` |
| `max-step` | Passo massimo; nelle ODE richiede adaptive, in geodesic è in radianti. Reale nell’intervallo [1e-12, 1e4]. Ulteriore limite 0.02. | `duration/steps` |
| `max-steps` | Limite di passi accettati; nelle ODE richiede adaptive. Intero nell’intervallo [1, 9999]. | `9999` |

**Contratto del modello:** [convenzioni e limiti fisici](PACCHETTI.md).

### Esempio completo

```pyxis
use statmech
grid off
statmech.lorenz attractor {
    sigma: 10
    rho: 28
    beta: 2.6666666666666665
    duration: 30
    steps: 6000
}
```

**Esempio distribuito:** `examples/lorenz.pyxis`.

## Sintassi a blocchi

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

## Espressioni matematiche

Operatori `+`, `-`, `*`, `/`, `^`, parentesi e segni unari. Moltiplicazione esplicita. Potenza associativa a destra: `2^3^2 = 2^(3^2)`; `-x^2 = -(x^2)`. Costante pi; sin, cos, tan, exp, log (naturale), sqrt, abs, e funzioni utente di un argomento. Angoli delle funzioni trigonometriche in radianti. Le espressioni devono avere risultati reali e finiti. plot espone x, surface x/y, phase-flow x/y/t. Confronti, if, cicli, lettura CSV e derivate simboliche non sono implementati.

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
