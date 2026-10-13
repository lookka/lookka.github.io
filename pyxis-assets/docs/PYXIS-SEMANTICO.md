# Pyxis: direzione semantica per tutti i pacchetti

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

Proposta di architettura, 12 ottobre 2026. Gli esempi seguenti descrivono il
linguaggio futuro: non sono ancora eseguibili nel prototipo.

## Principio comune

L'utente descrive oggetti fisici, connessioni e relazioni; Pyxis calcola la
geometria. Questo vale per tutti i pacchetti, non soltanto per Feynman.
Coordinate e controlli geometrici rimangono un livello facoltativo di rifinitura.
Un diagramma deve essere utile con i valori predefiniti e modificabile per nome.

I pacchetti si scelgono in base al corso e si possono combinare liberamente
negli appunti e nella tesi. Un profilo di corso seleziona pacchetti, temi e
abbreviazioni; non limita i pacchetti che il documento può usare.

## Linguaggio e pacchetti

Un solo linguaggio comune: nomi, stringhe LaTeX, liste, proprietà, blocchi,
unità, espressioni e riferimenti. Ogni pacchetto introduce oggetti del proprio
dominio, senza introdurre un parser o convenzioni di base differenti.

```text
use qft, quantum, relativity
theme: overleaf-classic

qft.feynman scattering {
    channel: s
    incoming: [electron, positron]
    outgoing: [muon, antimuon]
    mediator: photon
}

quantum.circuit bell {
    q0: H, control(pair)
    q1: _, target(pair), M
}

relativity.penrose spacetime {
    metric: minkowski
}

place bell below scattering
place spacetime right-of scattering
```

Il prefisso identifica il pacchetto e risolve le collisioni. La forma breve
senza prefisso è ammessa quando il nome importato è univoco. Gli identificatori
come `pair` associano i componenti di un gate nella stessa colonna.
Gli oggetti interni generati dalle macro hanno nomi stabili e documentati,
così etichette, linee e vertici restano modificabili individualmente.

Esempi degli altri domini: `statmech.ising` descrive reticolo e configurazione;
`quantum.tensor-network` descrive tensori e contrazioni; `relativity.embedding`
descrive metrica, superficie e intervallo. Posizioni, allineamenti, annotazioni,
stili e unità seguono sempre le medesime regole.

## Pipeline comune

Sorgente standalone `.pyxis` oppure ambiente LaTeX → AST con posizioni nel
sorgente → risoluzione dei pacchetti → oggetti semantici → grafo di vincoli
e layout → scena geometrica → Asymptote → PDF/SVG.

I pacchetti trasformano il modello del dominio in primitive e vincoli comuni.
Il nucleo gestisce dipendenze, trasformazioni, ancoraggi, temi, clipping e
posizionamento delle etichette. Per circuiti e reticoli usa layout a griglia;
per processi e reti usa layout di grafi; per diagrammi conformi usa modelli
specifici. Non serve un unico algoritmo di layout per tutti i domini.

Un incrocio non crea una connessione; i vincoli espliciti hanno precedenza
sui suggerimenti di layout. Vincoli incompatibili producono diagnostica con
riferimenti agli oggetti e alle istruzioni coinvolte.

La composizione comprende inizialmente pannelli 2D, anche contenenti un export
di una scena 3D. Una scena geometrica mista 2D/3D richiede sviluppo separato.
La notazione fisica non implica che Pyxis verifichi un processo o derivi una
metrica: modelli, approssimazioni e convenzioni devono essere documentati.

## Struttura proposta

```text
src/
  language/           lexer, parser, AST, diagnostica
  semantic/           import, registri dei pacchetti, espansione delle macro
  geometry/           scena, unità, ancoraggi, vincoli, clipping
  layout/             grafi, griglie, composizione, etichette
  backends/asymptote/ generazione del codice
  packages/
    qft/
    quantum/
    relativity/
    statmech/
asy/pyxis/            primitive grafiche riutilizzabili del backend
tools/pyxis/          orchestrazione Python, estrazione LaTeX, cache, CLI
latex/pyxis.sty       interfaccia dell'ambiente LaTeX
vscode/              editor e preview sullo stesso servizio di compilazione
examples/            casi per corso e documenti con più pacchetti
tests/               linguaggio, layout, cache, integrazione e rendering
docs/                specifiche comuni e manuali dei pacchetti
```

Conservare il nucleo C++ già funzionante; Python può gestire il documento e i
processi senza sostituirlo. Rust è una possibile scelta futura, non un requisito
per ottenere questa architettura. Separare gradualmente i file attuali invece
di riscrivere subito il sistema. Le librerie `.asy` gestiscono il disegno;
la semantica dei pacchetti rimane nel compilatore.

## LaTeX, cache e tempi

Il preprocessore legge gli ambienti `pyxis`, conserva il sorgente originale e
genera un documento derivato con `includegraphics`. Deve rispettare commenti,
contesti verbatim e diagnostica con righe del documento originale.
Il pacchetto LaTeX da solo non avvia magicamente il preprocessore: il comando
di build e l'estensione devono integrare esplicitamente questa fase.

La chiave SHA-256 comprende sorgente del blocco, opzioni, profilo, tema,
versioni del compilatore e dei pacchetti, backend, formato e dipendenze effettive.
Includere anche il contesto LaTeX che influenza le etichette. Scritture atomiche,
gestione delle compilazioni concorrenti e riuso solo di risultati riusciti.
Modificare un blocco invalida quel blocco e le sue dipendenze, non tutte le figure.

Cache calda, compilazione nuova e latenza dell'editor sono misure distinte.
150 ms è un obiettivo da verificare, non una garanzia di Asymptote e LaTeX.
Debounce, annullamento dei risultati obsoleti e worker in background mantengono
reattiva la scrittura anche quando un rendering richiede più tempo.

## Incrementi

1. Linguaggio comune, nomi dei pacchetti, modello semantico e relazioni di layout.
2. Primo pacchetto verticale completo per verificare l'approccio end-to-end.
3. Secondo pacchetto di natura diversa, per verificare che il nucleo sia condiviso.
4. Composizione di pacchetti, temi, cache e ambienti LaTeX.
5. Estensione ai moduli dei corsi e modelli numerici con ipotesi e tolleranze esplicite.

Feynman può essere il primo banco di prova; non definisce da solo il linguaggio.
La direzione è un framework di figure semantiche per tutta la fisica teorica.
