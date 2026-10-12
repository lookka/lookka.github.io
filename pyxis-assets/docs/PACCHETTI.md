# Pacchetti semantici — versione 1.0

Questo manuale descrive funzionalita' implementate e verificate, non la lista
completa degli obiettivi. La proposta integrale rimane in PYXIS-SEMANTICO.md.

## Regole condivise

`use qft, quantum, relativity, statmech` importa i pacchetti necessari.
Gli import possono essere ripetuti e combinati. Un nome qualificato come
`quantum.circuit` e' sempre esplicito; `circuit` e' ammesso dopo l'import
quando il nome non e' ambiguo. I nomi dei gruppi sono unici.
Una proprieta' per riga, commenti con `#`, stringhe LaTeX tra virgolette.
I blocchi non richiedono coordinate. Per i circuiti l'ordine delle righe
nel sorgente determina l'ordine dei qubit; le colonne sono separate da virgole.

`place B below A`, `above`, `right-of`, `left-of` dispongono gruppi 2D.
`gap=2` specifica la distanza in unita' geometriche. La dipendenza puo' essere
scritta prima o dopo i blocchi. Cicli e disposizioni duplicate vengono rifiutati.
Senza `place`, i gruppi nascono alla stessa origine: dichiarare le relazioni
se si vogliono affiancare piu' figure.
Il layout usa ingombri conservativi dei modelli; etichette personalizzate molto
lunghe possono richiedere piu' gap. Non e' ancora un risolutore globale di collisioni.

I componenti hanno nomi gerarchici, per esempio `bell.q0_step1`;
gli ancoraggi si risolvono sull'ultimo punto: `bell.q0_step1.north`.
Una macro non rende inaccessibili le primitive generate.

`profile qft`, quantum, relativity, statmech importa il pacchetto del corso;
`profile research` importa tutti e quattro. Il profilo e' additivo: use rimane
disponibile, gli import duplicati sono ignorati. Non imposta o sovrascrive il tema.

## Oggetti disponibili

| Pacchetto | Oggetto | Capacita' attuali |
| --- | --- | --- |
| qft | feynman | Alberi 2→2, canali s/t/u, propagatori e inserzione di bolla |
| quantum | circuit | H/X/Y/Z/S/T, controllo singolo/multiplo, target, misura, gate personalizzato |
| quantum | tensor-network | MPS e reticoli PEPS aperti, legami e gambe fisiche agganciati ai nodi |
| quantum | bloch | Sfera 3D in filo, vettore puro da theta/phi, stati di base |
| relativity | penrose | Minkowski 1+1 e schema conforme dell'estensione massimale di Schwarzschild |
| relativity | embedding | Paraboloide di Flamm della sezione equatoriale spaziale di Schwarzschild |
| statmech | ising | Reticolo 2D e configurazioni discrete esplicite o predefinite |
| statmech | phase-flow | Orbita di un sistema 2D esplicito, RK4 fisso o adattivo |
| statmech | lorenz | Traiettoria 3D del sistema di Lorenz, parametri configurabili |
| statmech | phase-diagram | Schema P-T, regioni colorate, punto triplo e critico |
| relativity | light-cones | Coni nulli radiali locali in carta Painleve-Gullstrand ingoing |
| relativity | geodesic | Raggi nulli equatoriali Schwarzschild, scattering/cattura e vista Flamm |

### QFT

```text
use qft
feynman F {
    channel: s
    incoming: [electron, positron]
    outgoing: [muon, antimuon]
    mediator: photon
    loop: fermion
    loop-position: 0.5
    loop-radius: 0.25
}
```

Le particelle disponibili sono electron, positron, muon, antimuon, fermion,
antifermion, photon, gluon, scalar e ghost. `labels` accetta quattro stringhe.
Fermioni con freccia centrale, antifermioni con flusso invertito, fotoni ondulati,
gluoni cicloidali, scalari e ghost tratteggiati.
`loop` opzionale accetta fermion, scalar, ghost o photon; radius deve stare nel tratto.
Il loop photon usa onde radiali campionate, senza frecce fermioniche.
Nomi: F.in1, F.in2, F.out1, F.out2, F.mediator. Con loop il mediatore diventa
F.mediator_in, F.mediator_out, F.loop_upper, F.loop_lower.
Pyxis rappresenta la topologia scelta: non verifica la validita' delle interazioni,
ne' calcola ampiezze o deduce automaticamente il mediatore.
Le etichette esterne usano per default il posizionamento automatico comune.
`label-placement: fixed` conserva le posizioni del modello 0.3.
Per un singolo componente: `placement F.in1_label auto nw 4`.

### Quantum

```text
use quantum
circuit toffoli {
    a: H, control(g)
    b: _, control(g)
    c: _, target(g), M
}
tensor-network mps {
    sites: 5
}
place mps below toffoli
```

Un collegamento richiede un target e almeno un controllo nella medesima colonna.
Le righe corte vengono completate con fili. `gate("U")` disegna un gate
personalizzato, con testo fino a 12 caratteri. `M` e' un simbolo di misura;
non simula il collasso e non trasforma ancora il filo successivo in filo classico.
`oracle(id,"$U_f$")`, ripetuto su almeno due righe contigue nella stessa
colonna, disegna un unico box su quei qubit con una formula LaTeX. Un
`control(id)` esterno al blocco lo rende controllato; piu' controlli sono ammessi.
Le formule devono coincidere e il nome non puo' avere anche un target XOR.
Il box ha larghezza geometrica 1.05 e altezza dalla prima all'ultima riga:
formule lunghe possono richiedere una rifinitura. Esempio: examples/oracles.pyxis.
Per catene MPS: `sites` e, facoltativamente, `labels` con una stringa per tensore.
`layout: peps` usa invece rows/columns (da 1 a 16, massimo 128 siti totali),
con legami orizzontali/verticali e una gamba fisica diagonale per sito.
I nomi sono r1c1, r1c2, ...; labels si legge per righe. Anche etichette e gambe
seguono un singolo nodo spostato con move. I tratti usano clipping sui bordi.
Il reticolo e' una rappresentazione dei tensori e delle contrazioni, non un
algoritmo per eseguire numericamente quelle contrazioni.
I tensori sono site1, site2, ...; i gate sono qubit_step1, qubit_step2, ...
Gli indici di colonna dei nomi iniziano da 1, anche per colonne `_` senza gate.

`bloch` usa theta tra 0 e 180deg e phi qualsiasi; le unita' deg/rad sono obbligatorie.
La mappa e' (sin(theta)cos(phi), sin(theta)sin(phi), cos(theta)); non accetta
ancora matrici densita' o vettori misti. Fonte per la convenzione:
[University of Durham](https://www.maths.dur.ac.uk/users/kasper.peeters/qcomp/2024/qubit.html).

### Relativita'

`penrose` accetta metric minkowski, schwarzschild oppure kerr.
Il secondo schema mostra quattro regioni, due orizzonti e due bordi singolari.
Non e' un calcolo di una trasformazione conforme per metriche arbitrarie.

Kerr usa la sezione sull'asse theta=0 e il regime subestremale: spin e' a/M
tra 1e-6 e 0.999999, bands e' una finestra di 3/5/7 bande (default 3).
Gli orizzonti esterni sono continui; quelli interni di Cauchy sono tratteggiati.
I puntini indicano la continuazione periodica oltre la finestra. I simboli i^0_+
e i^0_- si riferiscono rispettivamente alle regioni asintotiche r verso +infinito
e -infinito. Sull'asse r=0 e' regolare: la singolarita' ad anello non appartiene
a questa sezione. Non e' un diagramma globale di ogni angolo o del Kerr estremale.
Riferimento primario: [Carter, extension of the Kerr symmetry axis](https://journals.aps.org/pr/abstract/10.1103/PhysRev.141.1242).

`embedding` usa `metric: schwarzschild`, `radius` per r_s, `extent` per r_max/r_s,
`mesh` da 4 a 30 e `branch: upper` oppure lower. La superficie e'
z = ±2 sqrt(r_s (r-r_s)), r>=r_s, a tempo Schwarzschild costante e theta=pi/2.
Non rappresenta un potenziale gravitazionale o una superficie percorsa dal tempo.
Riferimento: [embedding diagrams in stationary spacetimes](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329697/).

`light-cones`: metrica Schwarzschild, carta painleve-gullstrand ingoing,
radii crescenti in unita' r_s, rows da 1 a 8, height da 0.01 a 0.5.
In unita' c=1, il diagramma usa r/r_s e t_PG/r_s. I lati hanno pendenze
`dr/dt=-sqrt(r_s/r) ± 1`, ricavate imponendo ds²=0 nella metrica
`ds²=-dt²+(dr+sqrt(r_s/r)dt)²+r²dOmega²`.
Sono coni tangenti locali, non geodesiche finite rettilinee. La loro altezza
si riduce vicino alla singolarita' per non attraversare r=0. Fonte primaria:
[coordinate velocity near horizons](https://www.mdpi.com/2218-1997/4/6/68).

`geodesic`: metrica Schwarzschild, kind null equatoriale. impact e' b/r_s
(default 3), extent e' r_iniziale/r_s (default 12). Integra rispetto a phi
`u''=1.5u²-u` con `u=r_s/r`, inizializzato mediante
`u'²=1/impact²-u²+u³` sul ramo entrante. L'evento termina all'orizzonte
u=1 o al ritorno al raggio iniziale sul ramo uscente. I punti di arresto
sono localizzati con bisezione all'interno del passo accettato.
Il cerchio tratteggiato e' r=1.5r_s, la sfera dei fotoni; photon-sphere off
lo nasconde. max-angle limita phi: se il raggio non termina viene segnalato
un errore, senza una traiettoria troncata presentata come completa.
max-step (default 0.01, massimo 0.05 rad), abs-tol/rel-tol e max-steps
controllano il calcolo. Il caso esattamente critico e le orbite asintotiche
richiedono attenzione al limite angolare; non sono eventi finiti.
Fonte per le equazioni: [null geodesics in Schwarzschild](https://arxiv.org/abs/1110.6508).

`view: plane` mostra la proiezione polare (r cos(phi),r sin(phi));
`view: embedding` riporta quella proiezione sulla superficie spaziale di Flamm,
con mesh da 4 a 30 e un offset visivo di 0.015r_s per evitare z-fighting.
Questa vista e' 3D e non puo' usare place con un pannello 2D nella stessa scena.
Non e' una geodetica intrinseca della sola superficie di Flamm: e' la
proiezione spaziale di una geodetica nulla dello spaziotempo.

### Meccanica statistica e numerica

`ising`: rows/columns da 1 a 32; state up/down/checkerboard/domains.
`spins: [+1, -1, ...]` specifica un valore per sito in ordine di riga.
I bordi sono aperti; non c'e' ancora una simulazione Monte Carlo.

`dimension: 3` abilita un reticolo cubico, con `layers` da 1 a 16 (default 3)
e massimo 512 siti. L'ordine di spins e' strato, riga, colonna; checkerboard
alterna anche tra gli strati. Le frecce +/-z sono spin Ising discreti, non
un modello di Heisenberg. Esempio: examples/ising3d.pyxis. La scena e' 3D.

`phase-diagram`: model schematic (unico modello), melting positive/negative,
opacity da 0 a 1, labels con quattro stringhe (solido/liquido/gas/supercritico),
point-labels con due stringhe (triplo/critico; default TP/CP). Tre curve di
coesistenza si incontrano al triplo; quella liquido-vapore termina al critico.
Le tinte oltre il critico sono zone indicative, senza una nuova linea di
transizione. Le coordinate sono convenzionali: non sono dati quantitativi o
un'equazione di stato di una sostanza. Il modello segue la topologia descritta
da [OpenStax](https://openstax.org/books/chemistry-2e/pages/10-4-phase-diagrams).
Le regioni e le curve hanno nomi stabili per poter essere modificate.

`phase-flow`: dx/dy come espressioni tra virgolette in x,y,t; start [x0,y0];
duration positiva; steps da 4 a 9999. Esempio: dx "y", dy "-x".
`lorenz`: sigma, rho, beta, start [x0,y0,z0], duration e steps; passo <=0.02.
Il default e' `integrator: rk4` a passo fisso. Entrambi supportano anche:

```text
integrator: adaptive
abs-tol: 1e-8
rel-tol: 1e-6
max-step: 0.01
max-steps: 9999
```

RK4 adattivo confronta un passo completo e due mezzi passi, stima l'errore
locale della soluzione piu' fine dividendo la differenza per 15 e accetta
i due mezzi passi se ogni componente rispetta la scala
`abs-tol + rel-tol * max(abs(prima), abs(dopo))`. I tentativi respinti
non diventano punti del percorso. L'ultimo passo termina alla duration esatta.
Il metodo di step doubling e' descritto anche nel
[manuale GSL](https://www.gnu.org/software/gsl/doc/html/ode-initval.html);
Pyxis ha una propria implementazione C++ senza dipendenza da GSL.

abs-tol va da 1e-14 a 1; rel-tol da 0 a 1. max-step positivo da 1e-12
a 1e4; default duration/steps. Per Lorenz non puo' superare 0.02.
max-steps da 1 a 9999 limita i passi accettati: se non bastano, errore,
senza esportare silenziosamente una traiettoria incompleta. I tentativi totali
sono limitati a 20 volte max-steps. Queste quattro proprieta' richiedono adaptive.
Con adaptive, steps imposta soltanto il max-step predefinito; non e' il numero
esatto di punti. Con rk4 i sorgenti precedenti mantengono il campionamento fisso.
Nell'editor `set nome integrator rk4` rimuove le proprieta' riservate al
controllo adattivo, cosi' il blocco resta valido dopo il cambio di metodo.

Espressioni fuori dominio e stati non finiti o oltre 1e6 interrompono il calcolo.
Le tolleranze controllano una stima locale, non un limite rigoroso dell'errore
globale. Il metodo e' esplicito, per sistemi non stiff; non localizza eventi.
max-step controlla anche la densita' del percorso disegnato: una stima locale
piccola non garantisce da sola un buon campionamento grafico.
Il punto invisibile `nome.caption.center` fornisce un attacco sotto un phase-flow
e segue place. Sono verificati convergenza su soluzioni analitiche, dipendenza
esplicita dal tempo, rifiuto di passi, punti fissi e confronto Lorenz a breve termine.
La sensibilita' caotica impedisce di interpretare l'accordo a lungo termine
fra singole traiettorie Lorenz come prova di accuratezza globale.

## Temi, scene e editor

### Etichette automatiche

```text
label name {
    at: A.center
    text: "$p_1+p_2$"
    placement: auto
    prefer: n
    gap: 3
}
```

Disponibile per label/text 2D. `placement T auto [prefer] [gap]` e' la forma
rapida; `placement T fixed` torna al punto di attacco. prefer accetta
n/ne/e/se/s/sw/w/nw; gap e' numerico in bp (da 0 a 100, default 3),
diversamente dal gap geometrico usato da place per i gruppi.

Il backend misura tramite LaTeX gli ingombri delle formule/testi. Nel frame
finale valuta otto rettangoli candidati, aggiunge un margine di sicurezza e
calcola penalita' per sovrapposizioni con etichette, nodi, linee e punte delle
frecce effettive. La preferenza ordina le alternative a parita' di collisioni.
Le etichette automatiche sono disposte nell'ordine del sorgente; quelle fisse
sono gia' considerate come ostacoli. Il testo mantiene dimensioni fisiche
costanti quando cambia width. Non viene stimato dalla lunghezza della stringa.

Con at riferito a un cerchio/ellisse/gatebox, il backend conosce l'ingombro
del nodo e propone posizioni esterne. Con coordinate numeriche o altri
ancoraggi propone posizioni vicine al punto, senza dedurre un nodo proprietario.
Il fitting riserva conservativamente spazio per tutte le alternative.

E' una scelta greedy fra otto candidati, non un'ottimizzazione globale:
quando sono tutti occupati usa il costo minore, senza garantire l'assenza
di collisioni. Si puo' aumentare gap, cambiare prefer o usare placement fixed.
I marcatori poligonali dei percorsi non sono ancora ostacoli dedicati.
Gli ancoraggi di un'etichetta automatica non possono definire altra geometria:
la posizione del testo si decide dopo il fitting, quindi usare il nodo o un point.
Le etichette fisse non vuote possono invece essere estremi di clip nodes:
il backend misura la scatola TeX e taglia il percorso nel frame finale.

### Costruzioni geometriche condivise

```text
circle A {
    radius: 0.5
}
circle B {
    tangent-to: A
    direction: east
    radius: 0.3
}
line baseline {
    from: A.center
    to: B.center
}
line normal {
    through: A.center
    perpendicular-to: baseline
    length: 2
}
arrow connection {
    from: A.center
    to: B.center
    path: arc(0.5)
    clip: nodes
}
```

parallel-to/perpendicular-to richiedono un segmento rettilineo di riferimento
e through; length e' la lunghezza del segmento, centrato su through.
Sono incompatibili con from/to e con percorsi curvi. I riferimenti possono
essere definiti piu' avanti nel sorgente. Vengono risolti dopo spostamenti e layout.
Tangenza esterna fra cerchi: direction north/south/east/west/ne/nw/se/sw.
Un offset sul cerchio vincolato viene rifiutato perche' romperebbe la tangenza;
spostare il cerchio di riferimento aggiorna invece quello dipendente.
Non e' ancora un solver generale per vincoli simultanei non lineari.

`point P A.center` oppure un blocco point con at/offset definisce un punto
nominato invisibile, con ancoraggio P.center. Si usa per punti di costruzione
e terminazioni di gambe; non genera una label vuota o un nodo visibile.

`clip: nodes`/`clip L nodes` taglia line/arrow/path ai bordi di cerchi, ellissi
e gatebox associati agli estremi mediante ancoraggi. Funziona anche su Bezier
e onde usando le intersezioni del percorso effettivo. Punti invisibili non
hanno un bordo. `clip: off` disattiva il taglio. Il clipping conserva i centri
come connessioni topologiche: modifica solo il tratto disegnato. Non copre
clipping contro oggetti arbitrari nel mezzo del percorso. Per label/text fissi
usa la scatola reale TeX, con margine 1.5bp piu' meta' spessore del tratto.
Le punte native sono applicate al percorso fisico gia' tagliato. Le etichette
automatiche continuano a non essere ancoraggi geometrici.
I marcatori degli estremi agganciati a nodi tagliati vengono omessi.

`theme: overleaf-classic` equivale a paper. Disponibili anche modern-vector
e blackboard (inchiostro chiaro e sfondo scuro), oltre ai precedenti wire/color.
Le figure 3D restano separate dalle scene 2D; si combinano nello stesso documento
tramite ambienti distinti. La composizione di pannelli 2D/3D nella stessa scena
e' ancora da implementare.

L'editor usa gli stessi pacchetti e la stessa cache degli script. Nei ritocchi:
`set F mediator gluon`, `set bell q0 X, control(pair)`,
`linewidth F.in1 0.8`, `place B below A`. Gli oggetti interni possono essere
modificati con i comandi geometrici gia' esistenti.

## LaTeX e cache

Nell'editor, Pyxis: Compila documento LaTeX produce il PDF con il nome del
documento originale. Al salvataggio dei file .tex con ambienti pyxis, la
stessa build viene eseguita in background; `pyxis.buildOnSave` la disattiva.
`pyxis.latexEngine` seleziona pdflatex/lualatex/xelatex. Due passaggi, nessun
shell escape, sorgente intatto e ausiliari in una directory temporanea rimossa.
Una compilazione fallita conserva il PDF precedente. Se il documento cambia
durante la build, il risultato obsoleto non viene pubblicato. Il pannello Output
Pyxis riporta la diagnostica. Non c'e' ancora orchestrazione BibTeX/Biber.
Da terminale: `node scripts/build-latex.js documento.tex [--engine=lualatex]`.

Usare `node scripts/latex.js input.tex [output.tex] [--compile]`.
Senza compilazione viene conservato il documento derivato. Con --compile
ausiliari e log vengono rimossi; si conserva il PDF e, se richiesto con un
percorso esplicito, anche il documento derivato.
Gli ambienti pyxis si chiudono con `\end{pyxis}` su una propria riga.
Opzioni: width in mm e theme. Commenti LaTeX, verb e ambienti
verbatim/Verbatim/lstlisting/minted/comment non vengono interpretati come figure.
Le dichiarazioni usepackage del preambolo vengono condivise con le etichette,
tranne graphicx/pyxis. Vengono condivisi anche newcommand/renewcommand/providecommand
e DeclareMathOperator; texPreamble nell'API consente altro contesto esplicito.
La build nativa segue input/include letterali e includeonly, con copie temporanee
dei sottofile e diagnostica del loro percorso. Rifiuta cicli e nomi costruiti da macro.
I percorsi si risolvono dalla directory del principale; i file originali sono immutati.
Limiti: 128 file, 8 MiB di sorgenti. Il marker `% !TeX root = ../main.tex`
indirizza la build del capitolo al principale; dopo una prima build l'editor
conosce inoltre i sottofile e reagisce ai loro salvataggi.
Subfiles/import e orchestrazione BibTeX/Biber rimangono fuori dal supporto corrente.

SHA-256 copre sorgente, formati, preview, preambolo delle etichette, compilatore,
eseguibili, DLL Ghostscript, moduli Asymptote locali, ambiente rilevante e file
di dipendenza dichiarati. Hash dei risultati impediscono il riuso di file corrotti.
La pubblicazione usa staging e manifest finale; richieste identiche nello stesso
processo condividono il rendering. Processi distinti possono duplicare il lavoro,
ma i lettori validano gli hash. Una nuova compilazione invalida la cache.
Aggiornamenti a font/pacchetti TeX esterni non sono tutti rilevati automaticamente:
usare dependencies/cacheSalt nell'API o rimuovere la cache dopo tali aggiornamenti.
La cache conserva PDF/SVG utilizzabili e non e' una directory di intermedi.
Le nuove voci hanno un contrassegno di proprieta' Pyxis. Al rendering successivo,
le voci invalidate da cambiamenti al compilatore o al renderer vengono rimosse
automaticamente, se non contengono file estranei. I PDF referenziati da documenti
derivati conservati vengono protetti per non rompere includegraphics.
Non viene promesso un rendering a freddo sotto 150 ms.

## Estensioni del catalogo e del nucleo

Vincoli geometrici simultanei generali, ottimizzazione globale delle etichette e supporto 3D,
clipping contro oggetti arbitrari, grafi QFT arbitrari e loop su percorsi curvi,
stati misti, Kerr fuori dall'asse o estremale, coni/geodetiche per metriche generiche,
diagrammi di fase quantitativi da dati, ODE generiche 3D/eventi complessi, pannelli
misti e distribuzione binaria per Linux/macOS.
La 1.0 contiene il catalogo e gli strumenti descritti sopra. Queste estensioni
richiedono altri modelli e convenzioni, mantenendo lo stesso nucleo condiviso.
