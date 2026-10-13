# Pyxis: note di sviluppo e integrazione

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

Ho raccolto qui le scelte che collegano il nucleo C++, il rendering e l’editor LaTeX. I casi concreti documentano il comportamento della release 1.0; le ipotesi di estensione sono indicate come tali. Il dettaglio delle funzioni e i listati integrali sono in [CODICE-CPP.md](CODICE-CPP.md); la sintassi disponibile è descritta in [COMANDI.md](COMANDI.md) e [PACCHETTI.md](PACCHETTI.md).

## 1. Obiettivo e confini del progetto

Pyxis e' un linguaggio per descrivere figure scientifiche attraverso il loro
significato. Per esempio, una linea e' un propagatore fotonico,
che due gate sono connessi o che una retta e' perpendicolare a un'altra.
Il programma traduce queste istruzioni in geometria e poi in un disegno.

Il nucleo C++ non decide se un processo fisico e' possibile. Per esempio,
sapere disegnare un diagramma di Feynman non significa saper calcolare la
sua ampiezza, assegnare tutte le regole di Feynman o verificarne i numeri quantici.
Le equazioni numeriche presenti nei pacchetti hanno invece modelli espliciti,
con parametri e ipotesi documentati.

Ho preso da LaTeX l’idea di conservare la struttura nel sorgente: la descrizione resta esplicita, mentre molti dettagli della rappresentazione sono affidati al programma.

## 2. Compilazione del nucleo e rendering

I comandi seguenti si eseguono da PowerShell nella radice del repository. Il prefisso `./` indica un percorso relativo alla directory corrente.

```powershell
./scripts/build.ps1
node scripts/render.js examples/constraints.pyxis svg
```

Il primo comando compila i sorgenti C++ e avvia i test del nucleo. Il secondo
legge un esempio e salva la figura in `output/constraints.svg`.
Una modifica al sorgente `.pyxis` richiede soltanto il rendering. Una modifica a `.cpp` o `.hpp` richiede prima una nuova compilazione del nucleo.

Altri casi di rendering presenti nel repository:

```powershell
node scripts/render.js examples/qft.pyxis svg
node scripts/render.js examples/blackboard.pyxis svg
node scripts/render.js examples/bloch.pyxis svg
node scripts/render.js examples/lorenz.pyxis svg
```

SVG e' un formato vettoriale: il disegno e' descritto mediante tracciati, non
mediante una matrice di pixel. I contorni restano nitidi al variare della scala.
PDF è l’altra esportazione usata per gli appunti: lo stesso comando accetta `pdf` al posto di `svg`. I PNG sono anteprime delle figure vettoriali.

## 3. Pipeline di compilazione

Ci sono due trasformazioni diverse:

1. GCC compila i file C++ di Pyxis e produce `build/pyxis.exe`.
2. L'eseguibile Pyxis legge un sorgente `.pyxis` e produce un sorgente `.asy`;
   Asymptote compila quest'ultimo e produce la figura.

Asymptote e' un linguaggio e un motore per disegni scientifici, gia' disponibile
nel sistema di sviluppo. Ho affidato ad Asymptote tracciati, frecce, testo LaTeX e scene 3D: Pyxis conserva la descrizione fisica e genera il programma grafico.

Il flusso completo per una figura e':

```text
testo .pyxis
    ↓ semantic(): riconosce i pacchetti ed espande gli oggetti fisici
istruzioni geometriche
    ↓ normalize(): espande i blocchi di proprieta'
comandi elementari
    ↓ parse(): crea e verifica gli oggetti della scena
Scene
    ↓ layout(), ancoraggi e vincoli: calcola le posizioni finali
Scene risolta
    ↓ asymptote(): scrive un programma per il backend
testo .asy
    ↓ Asymptote e, quando necessario, LaTeX/Ghostscript
SVG oppure PDF
```

Non esiste ancora un parser generale con un AST completo per qualsiasi
costrutto. Il frontend attuale riconosce blocchi e comandi, conserva le righe
del sorgente e abbassa le macro al linguaggio geometrico. "Abbassare" significa
tradurre una descrizione piu' astratta in una piu' concreta.

## 4. Mappa del nucleo C++

La tabella associa i moduli alle rispettive responsabilità.

| File | Responsabilità |
| --- | --- |
| `src/pyxis.hpp` | Dati della figura e della scena |
| `src/main.cpp` | Input, output e diagnostica |
| `src/semantic.cpp` | Riconoscimento dei pacchetti e selezione del generatore |
| `src/packages/common.hpp` | Rappresentazione dei blocchi e costruzione delle primitive |
| `src/packages/quantum.cpp` | Traduzione dei circuiti in geometria |
| `src/syntax.cpp` | Normalizzazione dei blocchi in comandi |
| `src/pyxis.cpp` | Parsing della scena e generazione Asymptote |
| `src/constraints.cpp` | Risoluzione delle relazioni geometriche |
| `src/layout.cpp` | Layout dei gruppi e dipendenze |
| `tests/core.cpp` | Verifica dei contratti del nucleo |

### Scene e Object: i dati prima del disegno

In `pyxis.hpp`, `Scene` contiene una collezione di `Object`. Ogni oggetto ha
un nome, un tipo (`Kind`) e attributi geometrici/grafici. `Kind` e' un `enum class`:
permette di distinguere un cerchio, una linea, un'etichetta e cosi' via.

La scena e' una rappresentazione intermedia: e' gia' piu' concreta del testo
fisico, ma non e' ancora codice Asymptote. Tenerla separata dal renderer rende
possibile fare calcoli, controlli e trasformazioni senza disegnare ogni volta.

Nel prototipo alcuni campi sono riutilizzati secondo il tipo. Per un cerchio
`x,y` sono il centro e `a` e' il raggio; per una linea `x,y` sono il primo
estremo e `a,b` il secondo. E' una scelta compatta del prototipo, non una
notazione universale di geometria. Una futura struttura con tipi geometrici
separati potra' rendere queste associazioni piu' esplicite.

## 5. Traccia di una dichiarazione: tangenza fra cerchi

Questa sintassi e' eseguibile:

```text
circle A {
    radius: 0.5
}
circle B {
    tangent-to: A
    direction: east
    radius: 0.3
}
```

In `syntax.cpp`, `normalize()` legge le proprieta' e genera comandi
equivalenti a questi:

```text
circle A 0 0 0.5
tangent-circle B A east 0.3
```

Il blocco e' una forma comoda per l'utente; il comando e' una forma semplice
per il nucleo. Entrambi rappresentano la stessa richiesta.

Per un file `examples/mia-prova.pyxis` contenente i due blocchi, il comando di rendering è:

```powershell
node scripts/render.js examples/mia-prova.pyxis svg
```

In `parse()` il secondo comando crea un cerchio B con raggio 0.3 e conserva
un vincolo verso A. Non deve calcolare il centro subito: A potrebbe essere
spostato piu' avanti nel sorgente.

Quando risolviamo i vincoli, A deve essere gia' risolto. Per una tangenza
esterna, la distanza tra i centri deve essere la somma dei raggi:

```text
|c_B - c_A| = r_A + r_B
```

La direzione east corrisponde al versore (1,0), quindi il centro di B e'
(0.8,0). Per ne il versore e' (1,1)/sqrt(2). Il calcolo viene eseguito
in `resolve_constraint()`, non richiesto all'utente.

**Caso di controllo.** Con `move A 1 0` dopo i due blocchi, il centro di B segue A e la tangenza rimane valida. È questa relazione, oltre alle coordinate iniziali, che il risolutore deve conservare.

## 6. Ancoraggi e vincoli: la differenza pratica

Un ancoraggio e' un punto nominato dell'oggetto: A.center, A.north, A.east.
Una linea puo' usare `from: A.center` e `to: B.center`. Conserviamo i riferimenti,
poi li risolviamo usando le posizioni finali. Non copiamo una coordinata e la
dimentichiamo: se A viene spostato, il riferimento continua a indicare A.

Un vincolo esprime invece una relazione da calcolare. Per esempio:

```text
line baseline {
    from: A.center
    to: B.center
}
line normal {
    through: A.center
    perpendicular-to: baseline
    length: 2
}
```

Se d e' la direzione della baseline, la perpendicolare usa (-d_y,d_x).
Prima normalizziamo d, poi scegliamo un segmento di lunghezza 2 centrato
sul punto through. Non occorre trovare una pendenza, e le rette verticali
non creano un caso di divisione per zero.

Il test controlla d·n=0, entro una tolleranza. Per una parallela controlla
che il determinante d_x p_y - d_y p_x sia zero. La forma vettoriale e'
piu' robusta della rappresentazione y=mx+q.

### Perche' usiamo tre stati per le dipendenze

Durante la risoluzione ogni oggetto e' in uno di tre stati:

- 0: non ancora visitato;
- 1: in corso di risoluzione;
- 2: risolto.

Se per risolvere A occorre B e, mentre risolviamo B, ritroviamo A nello stato 1,
abbiamo un ciclo. Per esempio "A parallela a B, B parallela ad A" non specifica
alcuna direzione iniziale. Invece di ricorrere senza fine, segnaliamo il problema.
Il risolutore attuale usa dipendenze dirette; non e' ancora un solver numerico
generale per sistemi simultanei di vincoli.

## 7. Clipping: conservare la connessione, cambiare il tratto visibile

Una connessione fra i centri di due cerchi attraversa i loro interni. Il clipping permette di conservarne gli estremi logici e limitare il tratto visibile ai bordi:

```text
arrow connection {
    from: A.center
    to: B.center
    path: arc(0.5)
    clip: nodes
}
```

Conserviamo i collegamenti A.center/B.center nella scena: restano il significato
topologico della connessione. Soltanto il tratto visibile viene accorciato.
Questo evita di perdere l'informazione su quali nodi siano connessi.

Per una curva, spostare semplicemente gli estremi lungo una retta cambierebbe
anche la sua forma. Il backend usa invece le intersezioni tra il percorso
effettivo e i bordi, trova i parametri iniziale/finale e prende il `subpath`.
La freccia viene disegnata sul percorso gia' tagliato.

La piccola libreria Asymptote generata e' in `src/asymptote_geometry.hpp`.
Il test `tests/clipping.js` verifica i punti prodotti dal vero Asymptote per
segmenti, curve Bezier, onde e polilinee. Un dettaglio rilevante per la verifica:
Asymptote approssima il cerchio con Bezier cubiche. Verifichiamo prima il bordo
effettivamente disegnato, poi la vicinanza al cerchio analitico entro l'errore
di quell'approssimazione. Non chiediamo una precisione che il modello non ha.

### Etichette automatiche: perche' interviene il backend

Una formula non ha una larghezza prevedibile contando i caratteri: frazioni,
indici e integrali hanno ingombri diversi. Inoltre il testo mantiene dimensioni
tipografiche fisiche mentre le coordinate della figura vengono scalate.
Per questo il C++ conserva richiesta, punto di attacco e preferenza, ma lascia
al backend la misura tramite LaTeX e la scelta nel frame finale.

```text
label momentum {
    at: connection.center
    text: "$p_1+p_2$"
    placement: auto
    prefer: n
    gap: 3
}
```

L'esempio completo e' `examples/auto-labels.pyxis`. Il punto di attacco rimane
un dato geometrico; la posizione effettiva del testo viene decisa in seguito.
Quando momentum è automatico, momentum.center non è un riferimento geometrico disponibile: le costruzioni successive devono riferirsi al nodo o al punto sottostante.

`src/asymptote_labels.hpp` contiene codice Asymptote dentro una stringa C++.
Non e' C++ da eseguire durante il parsing: il generatore lo scrive nel .asy.
`label(frame,...)` fa misurare il testo a LaTeX. La callback
`new void(frame f, transform t)` viene eseguita quando la picture e' adattata
alla dimensione richiesta: t trasforma allora la geometria in coordinate
fisiche. Misure del testo e ostacoli diventano confrontabili nello stesso sistema.

Per ogni etichetta proviamo otto posizioni e scegliamo il punteggio minore.
Le sovrapposizioni con altri testi hanno una penalita' elevata; consideriamo
anche nodi, tratti e la forma delle punte prodotte dal renderer nativo.
Il rettangolo scelto diventa un ostacolo per le etichette successive. E'
un algoritmo greedy: una scelta locale non e' una prova di ottimalita' globale.
Se tutte le posizioni sono occupate, serve una rifinitura o piu' spazio.

Il test `tests/labels.js` misura una formula indipendentemente, confronta
il rettangolo ottenuto e ripete il disegno con width differenti. Verifica
cosi' che ingrandire la geometria non ingrandisca i caratteri. Controlla anche
che un ostacolo cambi la direzione e che due formule si separino.

Un dettaglio di linguaggio incontrato qui: in Asymptote pair.x/pair.y sono
proprieta' in sola lettura. Per modificare una componente si costruisce un
nuovo pair, per esempio `p=(p.x+1,p.y)`. La somiglianza sintattica con C++
non implica che tutte le operazioni abbiano le stesse regole.

## 8. Come nasce un pacchetto scientifico

`circuit()` è definita in `src/packages/quantum.cpp`.
Un `Block` contiene il tipo, il nome, le proprieta' e il loro ordine nel sorgente.
Il `Builder` offre operazioni come line(), label(), path() e object().
Il pacchetto traduce una descrizione del dominio in queste primitive.

Per un circuito:

1. ogni riga descrive un qubit e determina una quota nel disegno;
2. ogni colonna determina un istante grafico, non una durata fisica simulata;
3. un gate H diventa una scatola e una scritta;
4. control(pair) e target(pair) vengono associati attraverso lo stesso nome;
5. vengono prodotte le connessioni e un gruppo per il layout.

Il codice di questo pacchetto non deve gestire file, processi Asymptote o cache.
Questo e' il motivo della separazione dei moduli: una nuova convenzione grafica
non deve richiedere una riscrittura della pipeline.

`src/semantic.cpp` contiene il registro che associa un nome, per esempio
`quantum.circuit`, alla funzione C++ che lo genera. Le funzioni dei pacchetti
sono dichiarate in `src/packages/common.hpp`.

### Seguire i nodi nelle reti tensoriali

In tensor_network() i legami usano ora riferimenti ai centri dei tensori,
anziche' copie delle loro coordinate. Il Builder emette una line e il comando
clip nodes. Le gambe fisiche terminano su point invisibili riferiti al tensore;
le etichette hanno anch'esse un riferimento al nodo.

```text
use quantum
tensor-network net {
    layout: peps
    rows: 3
    columns: 3
}
move net.r2c2 0.25 0.15
```

Il risultato atteso è il nodo centrale spostato con i quattro legami che lo seguono, a topologia invariata. Il caso di confronto è `examples/tensor-networks.pyxis`.

Una sottigliezza del layout: quando spostiamo l'intero gruppo, non dobbiamo
traslare sia il nodo sia l'offset di una linea che segue quel nodo. Altrimenti
la traslazione verrebbe applicata due volte. In layout.cpp distinguiamo le
coordinate autonome dagli ancoraggi interni al gruppo.

### Nota di estensione: una configurazione di spin a strisce

`state: stripes` è un’ipotesi di estensione, assente dalla release 1.0. La modifica coinvolgerebbe questi punti:

1. Generatore `ising()` in `src/packages/statmech.cpp`.
2. Validazione dei valori di state e calcolo di sign.
3. Ammissione di stripes nella validazione e nella diagnostica.
4. Segno +1 sulle righe pari e −1 sulle dispari; l’indice C++ r parte da 0.
5. Test con rows=2 e columns=2: tutti gli spin della prima riga
   devono puntare in alto, tutti quelli della seconda in basso.
6. Precedenza invariata della lista spins esplicita rispetto a state.
7. Compilazione, rendering di controllo e aggiornamento del riferimento.

Il nuovo ramo del calcolo puo' essere scritto cosi':

```cpp
if (state == "stripes") {
    sign = (r % 2 == 0) ? 1 : -1;
}
```

Non basta aggiungere questo ramo: senza aggiornare la validazione il parser
rifiuterebbe il valore prima di arrivare al calcolo.

## 9. Contratti verificati dai test

Un test utile controlla un risultato o un'invariante, non riscrive il codice
con altre parole. Per esempio, per una perpendicolare controlliamo il prodotto
scalare, non che il programma abbia usato un particolare scambio di variabili.

```powershell
./scripts/build.ps1
node tests/source.js
node tests/cache-latex.js
node tests/backend.js
node tests/clipping.js
node tests/labels.js
```

I primi test C++ sono eseguiti dallo script di build. source.js controlla i
ritocchi dell'editor; cache-latex.js controlla cache ed estrazione; backend.js,
clipping.js e labels.js richiedono il vero backend installato. backend.js richiede l’assenza di altri rendering contemporanei: il suo controllo dei temporanei fotografa
anche le cartelle delle altre richieste.

Per verificare la vera estensione VS Code:

```powershell
./scripts/test-editor.ps1
```

Questo comando crea un profilo e un workspace isolati, controlla anteprima,
salvataggio e inserimento LaTeX, e rimuove il materiale temporaneo.
Non sostituisce ogni possibile prova manuale dell'interfaccia.

In C++ `check(condizione, messaggio)` solleva un'eccezione se il controllo fallisce.
Con double usiamo una tolleranza ragionevole. Per un integratore confrontiamo
anche risultati con passi diversi: un grafico plausibile non basta a garantire
la correttezza della numerica.

## 10. Processi JavaScript, cache e temporanei

Il C++ calcola e genera il programma grafico. Node.js gestisce i processi,
i file temporanei e l'editor. In JavaScript `await` aspetta il risultato di
un'operazione asincrona senza bloccare l'intero processo come un'attesa sincrona.
`execFile` avvia un eseguibile con argomenti separati, senza costruire un comando
da interpretare attraverso una shell.

In `vscode/backend.js`, render() e' il servizio comune a editor e script.
Il programma crea una cartella temporanea distinta per richiesta; nel blocco
`finally` la elimina sia dopo un successo sia dopo un errore. `finally` non
significa "esegui solo se tutto e' riuscito": e' proprio il posto per la pulizia.

La cache conserva invece risultati riutilizzabili. Un hash SHA-256 riassume
sorgente, opzioni e dipendenze rilevanti. Se cambia un ingrediente, cambia
la chiave. Il risultato viene verificato con un altro hash prima di riusarlo.
Questo evita di accettare un PDF troncato soltanto perche' il nome esiste.

La cache non e' un parser e non verifica la fisica. Inoltre non rileviamo
automaticamente ogni modifica dell'intera installazione TeX: le dipendenze
aggiuntive vanno dichiarate o la cache va invalidata dopo aggiornamenti esterni.
Le nuove voci conservano anche l'identita' del compilatore/renderer: una build
nuova consente di ripulire le voci obsolete. Un PDF ancora referenziato da un
documento derivato conservato viene invece protetto, per non rompere il documento.

## 11. Preparazione degli ambienti LaTeX

```powershell
node scripts/latex.js examples/semantic-notes.tex --compile
```

Il preprocessore trova gli ambienti pyxis, renderizza le figure e sostituisce
gli ambienti con includegraphics in un documento derivato. Il file originale
non viene riscritto. Il comando compila il documento e conserva il PDF finale;
ausiliari e documento derivato predefinito vengono rimossi automaticamente.
Un percorso di destinazione esplicito conserva il documento derivato per l’ispezione:

```powershell
node scripts/latex.js examples/semantic-notes.tex output/notes-inspect.tex
```

Il secondo comando produce il derivato senza avviare pdflatex. La destinazione esplicita rende il file un risultato da conservare, quindi la pulizia automatica non lo elimina. La compilazione automatica aggiunge al percorso di ricerca
LaTeX la cartella `latex`, che contiene `pyxis.sty`.

## 12. Metodo di sviluppo e gestione dei casi di errore

Ho preso come punto di partenza figure concrete e sorgenti che ne esprimessero la struttura. Per ogni oggetto ho fissato nomi, convenzioni, modello matematico e limiti; l’implementazione è accompagnata da controlli del comportamento e rendering con il backend reale.

L’assistenza dell’IA ha riguardato anche implementazione, revisione e preparazione delle verifiche. Mantengo nel repository i sorgenti e i casi riproducibili, così che una decisione possa essere ricontrollata senza dipendere dalla conversazione in cui è nata.

Un errore viene isolato nel più piccolo sorgente che lo riproduce e attribuito al livello interessato: sintassi, geometria, numerica o backend. Una modifica a un solo contratto per volta rende riconoscibile la causa della correzione.

Esempi e test riutilizzabili appartengono al progetto; script occasionali di migrazione, log, profili di prova e intermedi vengono rimossi.

## 13. Integratore adattivo: algoritmo e controlli

In `src/numerics.hpp` la numerica è separata dai nomi degli oggetti,
dai pacchetti e dal rendering. `std::array<double,N>` rappresenta uno stato
di dimensione N fissata in compilazione; `integrate<2>` e `integrate<3>`
riusano lo stesso algoritmo. Il parametro Derivative e' una funzione/lambda
che riceve lo stato e il tempo e restituisce le derivate.

`src/packages/statmech.cpp` traduce le proprieta' del blocco in Options.
Per phase-flow, la lambda valuta le espressioni dx e dy; per Lorenz usa
direttamente le tre equazioni. Il risultato contiene punti, tempi accettati
e numero dei tentativi respinti. Il pacchetto converte i punti in un percorso:
Asymptote riceve geometria gia' calcolata, non integra le equazioni.

RK4 classico stima quattro pendenze e le combina con pesi 1,2,2,1 divisi
per 6. Nel modo adaptive facciamo una previsione con passo h e una con
due passi h/2. L'errore locale principale di RK4 e' proporzionale a h^5:
i due mezzi passi ne accumulano circa 1/16. La differenza fra le due
previsioni e' quindi circa 15 volte l'errore della previsione piu' fine.
Dividiamo per 15, poi normalizziamo componente per componente con:

```cpp
scale = abs_tol + rel_tol * std::max(std::abs(before), std::abs(after));
ratio = std::abs(fine - coarse) / (15 * scale);
```

Se il rapporto massimo supera 1, riduciamo h e riproviamo dallo stato
precedente. Non spostiamo il tempo e non salviamo il tentativo respinto.
Altrimenti accettiamo fine. Il nuovo passo usa una potenza -1/5 del
rapporto, un fattore prudenziale 0.9 e limiti alla variazione. Il passo
non supera max-step; l'ultimo viene tagliato per arrivare alla durata.
Il metodo implementato è RK4 con step doubling; non usa una coppia embedded RK45.
Il riferimento per il confronto fra metodi è il
[manuale ufficiale GSL](https://www.gnu.org/software/gsl/doc/html/ode-initval.html).

Comandi del caso di controllo:

```powershell
./scripts/build.ps1
node scripts/render.js examples/adaptive-flow.pyxis pdf
```

Nel pendolo, x e' theta e y e' omega. Il tempo e' adimensionale: abbiamo
assorbito la frequenza sqrt(g/l), percio' dy = -sin(x). Nel pannello
smorzato aggiungiamo -0.2*y. Il pendolo conservativo mantiene circa
`E = omega^2/2 + 1 - cos(theta)`; quello smorzato perde energia.
Questo offre un controllo fisico oltre al confronto visivo delle orbite.
Il test C++ verifica la conservazione entro una soglia, senza pretendere
che RK4 sia un metodo simplettico o conservi l'energia esattamente.

Il confronto fra tolleranze 1e-9 e 1e-7 riguarda il rendering del medesimo modello e non richiede ricompilare l’eseguibile. max-step controlla anche la distanza fra i punti della rappresentazione: precisione numerica e campionamento grafico hanno ruoli distinti. Con componenti di scale o unità molto diverse, la nondimensionalizzazione è rilevante perché la tolleranza assoluta attuale è comune a tutte le componenti.

I test confrontano anche il decadimento esponenziale con exp(-t), una
componente non autonoma con t^2 e Lorenz a breve termine con un RK4
molto raffinato. Stringere le tolleranze deve migliorare l'accordo e
aumentare il lavoro. Non interpretare abs-tol come una garanzia sull'errore
totale: controlliamo una stima locale. Per sistemi stiff, eventi complessi e
osservabili caotiche a lungo termine servono strumenti e verifiche ulteriori.

## 14. Regioni, profili e composizione dei pacchetti

Un `profile` importa i pacchetti del corso; un successivo use ne aggiunge altri.
La selezione rimane additiva. `src/semantic.cpp` contiene la tabella dei profili e il registro degli oggetti. Il profilo research li abilita tutti.

```text
profile statmech
use quantum
phase-diagram phases {
    melting: negative
}
```

Il diagramma P-T e' un modello topologico per gli appunti. Tre curve si
incontrano al punto triplo; la curva liquido-vapore termina al punto critico.
Le zone colorate oltre il critico non sono nuove transizioni. La forma delle
curve e le scale sono schematiche. Per un materiale reale servono i suoi dati
o un'equazione di stato, che questo comando non calcola.

phase_diagram in `src/packages/statmech.cpp` costruisce quattro regioni,
poi curve, assi e annotazioni. `region` riusa la geometria dei percorsi ma
chiude il bordo con `--cycle` e usa un riempimento. Gli incroci tra bordi
non adiacenti e l'area nulla vengono rifiutati. I vertici possono anche
usare point e ancoraggi, per seguire i nodi spostati.

```text
region domain {
    points: "0 0;2 0;1 1"
    color: (0.2,0.4,0.6)
    opacity: 0.25
    outline: off
}
```

Il compilatore conserva RGB e opacity, il backend genera primitive vettoriali.
outline off evita di trasformare i bordi ausiliari di una zona in linee
fisiche. Le regioni sono sullo sfondo per lasciare visibili curve ed etichette.
Per sperimentare: cambia il segno di melting e confronta i due schemi.

Ising 3D aggiunge un ciclo sugli strati al ciclo riga/colonna. Il punto
spaziale e' (colonna,-riga,strato), lo spin punta lungo +/-z e i legami
collegano soltanto i vicini esistenti. `checkerboard` dipende dalla parita'
di riga+colonna+strato. Il caso è examples/ising3d.pyxis; il test del cubo 2x2x2 contiene otto spin e dodici legami. Questo controlla la topologia, non soltanto
che il renderer produca un file.

## 15. Perche' il clipping del testo avviene alla fine

La larghezza della formula e' in bp, la geometria degli oggetti e' in unita'
del disegno. Prima del fitting non conosci il rapporto tra le due. Il caso
e' in examples/text-clipping.pyxis: frecce tra ket e operatore, tagliate
senza inventare coordinate per il bordo delle formule.

In `src/asymptote_geometry.hpp`, pyxis_text_box usa min/max di un frame
misurato da LaTeX. In `src/pyxis.cpp` il percorso viene disegnato attraverso
un callback che riceve la trasformazione finale t. Trasformiamo la curva
con t, costruiamo le scatole nel medesimo spazio fisico e cerchiamo le
intersezioni reali. La punta della freccia viene applicata dopo il taglio.
Il margine contiene 1.5bp e meta' dello spessore della linea.

Il testo resta fisso, percio' puo' essere un ancoraggio. Un'etichetta automatica
non puo': la sua posizione dipende a sua volta dalle linee, e introdurrebbe
una dipendenza circolare. Per quel caso usa un point geometrico separato.
`node tests/clipping.js` verifica sia le intersezioni sia l'invarianza delle
dimensioni fisiche del testo quando cambia la larghezza del disegno.

## 16. Dal modello relativistico al percorso numerico

Il package relativity non deriva da solo una metrica. Ogni generatore espone
un modello e una carta. Nei coni di luce abbiamo scelto la carta ingoing di
Painleve-Gullstrand, con c=1:

```text
ds^2 = -dt^2 + (dr + sqrt(r_s/r) dt)^2 + r^2 dOmega^2
dr/dt = -sqrt(r_s/r) +/- 1
```

La seconda relazione segue da ds²=0 per moto radiale. All'orizzonte il
generatore uscente ha dr/dt=0; dentro l'orizzonte entrambe le direzioni future
hanno dr/dt<0. Il test controlla questi segni e le pendenze. I triangoli sono
coni tangenti locali: i lati non sono geodesiche finite rettilinee.

Per il raggio nullo equatoriale di Schwarzschild poniamo u=r_s/r e usiamo
phi come variabile indipendente. Il sistema e' u'=v, v'=1.5u²-u. Il dato
iniziale v viene dall'integrale v²=1/b²-u²+u³, con b in unita' r_s.
Quindi impact non e' una posizione scelta sul foglio: e' il parametro
d'impatto fisico normalizzato. extent e' il raggio di ingresso normalizzato.

L'integratore comune accetta un callback di evento. Dopo un passo accettato
che attraversa l'evento, riduce l'intervallo con bisezione e reintegra fino
alla radice. Per il raggio si ferma all'orizzonte oppure al raggio iniziale
sul ramo uscente. Il test controlla cattura per b=2r_s e scattering per
b=3r_s; il cerchio tratteggiato e' la sfera dei fotoni r=1.5r_s.

```powershell
node scripts/render.js examples/geodesics.pyxis pdf
node scripts/render.js examples/light-cones.pyxis pdf
node scripts/render.js examples/geodesic-embedding.pyxis pdf
```

La vista embedding trasforma il percorso spaziale in punti sulla superficie
di Flamm. Non confondere il raggio nullo dello spaziotempo con una geodetica
intrinseca della sola superficie a tempo costante. Un piccolo offset grafico
evita che il renderer nasconda la linea nella mesh. Queste convenzioni e i
riferimenti sono nel manuale PACCHETTI.md.

## 17. Compilare gli ambienti direttamente dagli appunti

Nell'estensione usa Pyxis: Compila documento LaTeX, oppure salva un file .tex
che contiene un ambiente pyxis. La build automatica e' configurabile con
pyxis.buildOnSave; pyxis.latexEngine sceglie il motore. Il PDF prende il nome
standard del documento. Il sorgente resta identico e gli ausiliari vengono
rimossi, anche dopo un errore. Da terminale:

```powershell
node scripts/build-latex.js examples/semantic-notes.tex
node tests/native-latex.js
```

`vscode/native-latex.js` riusa il preprocessore e il servizio di rendering;
non e' un secondo compilatore. Fa due passaggi LaTeX, verifica che il sorgente
non sia cambiato e pubblica il PDF soltanto dopo successo. La coda dell'editor
accorpa i salvataggi mentre una build e' gia' in corso. Il test controlla anche
che un errore conservi il PDF precedente. Ora la build segue anche i capitoli
input/include: il paragrafo seguente spiega il passaggio aggiuntivo.
L'orchestrazione BibTeX/Biber rimane distinta dalla preparazione delle figure.

## 18. Una tesi e' un grafo di file

`tools/pyxis/project.js` tratta ogni file .tex come un nodo e ogni input/include
come un arco. `references` trova i comandi ignorando commenti, verbatim e
stringhe degli ambienti Pyxis. Non basta cercare tutte le occorrenze di input
con una regex: un esempio stampato negli appunti potrebbe essere interpretato come
un vero capitolo da compilare.

La funzione visit legge il file, prepara le figure, visita i figli e scrive
una copia temporanea. `stack` contiene il cammino corrente: se il prossimo
file e' gia' nello stack abbiamo un ciclo. `outputs` contiene invece i file
gia' preparati, per riusarli se un capitolo viene incluso due volte.
Sono due informazioni diverse: un file visitato non implica da solo un ciclo.

Le copie hanno nomi basati sull'hash del percorso. Riscriviamo i riferimenti
verso queste copie e aggiungiamo la directory temporanea a TEXINPUTS.
Con include conserviamo anche la semantica di pagina e degli ausiliari;
includeonly viene riscritto con gli stessi nomi temporanei e filtra i capitoli.
Non riscriviamo nessun originale. I percorsi letterali si risolvono dalla
directory del principale, come in una compilazione LaTeX normale.

Il preambolo principale fornisce pacchetti e macro alle etichette dei figli.
newcommand e DeclareMathOperator possono contenere gruppi annidati: il parser
dei gruppi bilanciati mantiene il loro testo completo. L'hash della figura
include questo contesto, quindi cambiare la definizione di ket invalida anche
le figure che lo usano.

Prima di pubblicare il PDF rileggiamo gli originali preparati: se un capitolo
e' cambiato durante il rendering, il risultato obsoleto viene scartato.
Il marker `% !TeX root = main.tex` permette all'editor di risalire dal capitolo
alla tesi. Dopo una build, l'editor conserva inoltre la mappa dei sottofile.

```powershell
node scripts/build-latex.js examples/thesis/main.tex
node tests/native-latex.js
```

Questo test controlla file inclusi su piu' livelli, macro del principale,
includeonly, cicli, PDF precedente conservato su errore e originali immutati.
Un eventuale supporto per import/subfiles richiederebbe prima un contratto esplicito sulla risoluzione dei percorsi, poi la modifica del parser.

## 19. Dalla cartella sorgente all'estensione installabile

Durante lo sviluppo VS Code carica direttamente vscode/extension.js. Nella
release legge il medesimo codice dal VSIX e usa bin/pyxis.exe. La funzione
compilerPath in vscode/environment.js distingue questi due percorsi.
Il pacchetto contiene anche il codice C++, le guide e gli esempi, per poterli
leggere e modificare; i programmi esterni rimangono installazioni separate.

```powershell
./scripts/build.ps1 -Release
./scripts/package.ps1 -SkipBuild
./scripts/test-package.ps1
./scripts/install.ps1 -SkipBuild
```

Release abilita -O2 e rimuove i simboli di debug: l'eseguibile e' piu' piccolo,
ma limita l’ispezione nel debugger.
La build senza Release conserva -g. I test C++ vengono compilati ed eseguiti
in entrambi i casi.

Un VSIX e' un archivio ZIP con un manifest, i file dell'estensione e il nucleo.
package.ps1 usa le API ZIP di .NET e una lista di cartelle sorgenti. Esclude
cache, intermedi, output e runtime .tools; l'archivio temporaneo viene eliminato
se qualcosa fallisce. Non richiede scaricare un nuovo strumento npm per confezionarlo.
Le regole standard di distribuzione sono nella
[documentazione di VS Code](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

test-package.ps1 installa l'archivio in un profilo isolato e punta il test host
ai file installati, usando il loro compilatore. Cosi' non basta che funzioni
la cartella sorgente: devono essere corretti anche main, risorse, grammar e
dipendenze relative nel pacchetto. Il profilo viene rimosso alla fine.
L'installer normale collega le copie Asymptote/Ghostscript del workspace con
pyxis-runtime.json nell'estensione installata; questo e' un file di configurazione
utile, non un intermedio. Non modifica impostazioni di altre estensioni.

Il codice Pyxis e' MIT; THIRD-PARTY.md distingue i programmi esterni e il
runtime del compilatore. Pubblicare su un marketplace o un repository remoto
e' un'operazione separata dall'installazione locale.
