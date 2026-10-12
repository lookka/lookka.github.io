# Imparare a sviluppare Pyxis

Questa guida e' per chi conosce il C++ e ha una preparazione universitaria in
fisica, ma non ha ancora costruito un linguaggio, un compilatore o un editor.
Non devi conoscere queste cose prima di cominciare: le incontriamo attraverso
il progetto che stiamo sviluppando insieme.

Gli esempi indicati come eseguibili funzionano nel progetto attuale. Gli
esercizi di estensione richiedono invece di modificare il codice: non sono
comandi gia' presenti. Per l'elenco delle funzionalita' effettive leggi anche
[PACCHETTI.md](PACCHETTI.md).

## 1. Che cosa stiamo costruendo

Pyxis e' un linguaggio per descrivere figure scientifiche attraverso il loro
significato. Per esempio, diciamo che una linea e' un propagatore fotonico,
che due gate sono connessi o che una retta e' perpendicolare a un'altra.
Il programma traduce queste istruzioni in geometria e poi in un disegno.

Il nucleo C++ non decide se un processo fisico e' possibile. Per esempio,
sapere disegnare un diagramma di Feynman non significa saper calcolare la
sua ampiezza, assegnare tutte le regole di Feynman o verificarne i numeri quantici.
Le equazioni numeriche presenti nei pacchetti hanno invece modelli espliciti,
con parametri e ipotesi documentati.

L'analogia con LaTeX riguarda il livello di descrizione: scrivi la struttura
che vuoi ottenere e il sistema si occupa di molti dettagli della rappresentazione.

## 2. Il primo esperimento: dal file alla figura

Apri PowerShell nella cartella del progetto. Nelle seguenti istruzioni `./`
significa "a partire dalla cartella in cui si trova il terminale".

```powershell
./scripts/build.ps1
node scripts/render.js examples/constraints.pyxis svg
```

Il primo comando compila i sorgenti C++ e avvia i test del nucleo. Il secondo
legge un esempio e salva la figura in `output/constraints.svg`.
Se cambi soltanto un file `.pyxis`, non devi ricompilare il C++: basta il
secondo comando. Se cambi un file `.cpp` o `.hpp`, devi eseguire anche il primo.

Prova poi questi esempi, gia' disponibili:

```powershell
node scripts/render.js examples/qft.pyxis svg
node scripts/render.js examples/blackboard.pyxis svg
node scripts/render.js examples/bloch.pyxis svg
node scripts/render.js examples/lorenz.pyxis svg
```

SVG e' un formato vettoriale: il disegno e' descritto mediante tracciati, non
mediante una matrice di pixel. Puoi ingrandirlo mantenendo nitidi i contorni.
PDF e' l'altra esportazione usata per gli appunti; sostituisci `svg` con `pdf`.
Le immagini PNG mostrate in chat sono anteprime dei risultati vettoriali.

## 3. Le due compilazioni che non vanno confuse

Ci sono due trasformazioni diverse:

1. GCC compila i file C++ di Pyxis e produce `build/pyxis.exe`.
2. L'eseguibile Pyxis legge un sorgente `.pyxis` e produce un sorgente `.asy`;
   Asymptote compila quest'ultimo e produce la figura.

Asymptote e' un linguaggio e un motore per disegni scientifici, gia' disponibile
su questo PC. Lo usiamo per tracciati, frecce, testo LaTeX e scene 3D. Non stiamo
riscrivendo da zero un renderer vettoriale.

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

## 4. Come leggere i file C++ senza perdersi

Leggi questi file nell'ordine indicato. Non serve leggerli tutti in una volta.

| File | Domanda a cui risponde |
| --- | --- |
| `src/pyxis.hpp` | Quali dati conserviamo per una figura? |
| `src/main.cpp` | Come apriamo l'input, generiamo l'output e segnaliamo gli errori? |
| `src/semantic.cpp` | Come riconosciamo un pacchetto e scegliamo il suo generatore? |
| `src/packages/common.hpp` | Come descriviamo un blocco e produciamo primitive? |
| `src/packages/quantum.cpp` | Come un circuito diventa linee, nodi e gate? |
| `src/syntax.cpp` | Come un blocco di proprieta' diventa comandi? |
| `src/pyxis.cpp` | Come i comandi diventano oggetti, e gli oggetti diventano Asymptote? |
| `src/constraints.cpp` | Come calcoliamo le relazioni geometriche? |
| `src/layout.cpp` | Come disponiamo gruppi e risolviamo le dipendenze? |
| `tests/core.cpp` | Quali proprieta' del comportamento vengono verificate? |

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

## 5. Seguire una singola istruzione, passo per passo

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

Per provare i due blocchi iniziali, salvali come `examples/mia-prova.pyxis`
con un editor di testo, poi esegui:

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

**Esperimento:** aggiungi `move A 1 0` dopo i due blocchi. Il centro di B
deve seguire A e la tangenza deve rimanere valida. Esegui di nuovo il rendering.

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

Se connetti i centri di due cerchi, la linea passa nei loro interni. Di solito
vuoi che il disegno si fermi sui bordi:

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
segmenti, curve Bezier, onde e polilinee. C'e' una sottigliezza utile da imparare:
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
Non usare momentum.center come riferimento di un'altra costruzione quando
momentum e' automatico: scegli il nodo o il punto geometrico sottostante.

In `src/asymptote_labels.hpp` trovi codice Asymptote dentro una stringa C++.
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

Apri `src/packages/quantum.cpp` e cerca `circuit()`.
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
non deve costringerti a riscrivere la pipeline.

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

Salva l'esempio come un file .pyxis e renderizzalo. Dovresti riconoscere il nodo
centrale spostato e i quattro legami che lo seguono. La topologia non cambia.
Puoi confrontarlo con `examples/tensor-networks.pyxis`.

Una sottigliezza del layout: quando spostiamo l'intero gruppo, non dobbiamo
traslare sia il nodo sia l'offset di una linea che segue quel nodo. Altrimenti
la traslazione verrebbe applicata due volte. In layout.cpp distinguiamo le
coordinate autonome dagli ancoraggi interni al gruppo.

### Esercizio guidato: aggiungere una configurazione di spin

Questo esercizio aggiunge una funzionalita' nuova; `state: stripes` non e'
presente nella versione descritta qui.

1. In `src/packages/statmech.cpp`, trova `ising()`.
2. Leggi il controllo dei valori ammessi di state e il calcolo di sign.
3. Aggiungi stripes ai valori ammessi, aggiornando anche il messaggio d'errore.
4. Assegna +1 alle righe pari e -1 alle righe dispari. Nel ciclo C++ r inizia da 0.
5. Aggiungi un test con rows=2 e columns=2: tutti gli spin della prima riga
   devono puntare in alto, tutti quelli della seconda in basso.
6. Verifica che una lista spins esplicita continui ad avere precedenza su state.
7. Compila, prova un esempio e aggiornane il manuale.

Il nuovo ramo del calcolo puo' essere scritto cosi':

```cpp
if (state == "stripes") {
    sign = (r % 2 == 0) ? 1 : -1;
}
```

Non basta aggiungere questo ramo: senza aggiornare la validazione il parser
rifiuterebbe il valore prima di arrivare al calcolo.

## 9. Test: cosa stiamo davvero verificando

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
clipping.js e labels.js richiedono il vero backend installato. Esegui backend.js senza
altri rendering contemporanei: il suo controllo dei temporanei fotografa
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

## 10. La parte JavaScript e la cache, anche se parti dal C++

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

## 11. Provare l'integrazione LaTeX

```powershell
node scripts/latex.js examples/semantic-notes.tex --compile
```

Il preprocessore trova gli ambienti pyxis, renderizza le figure e sostituisce
gli ambienti con includegraphics in un documento derivato. Il file originale
non viene riscritto. Il comando compila il documento e conserva il PDF finale;
ausiliari e documento derivato predefinito vengono rimossi automaticamente.
Se vuoi conservare il derivato per leggerlo, fornisci un percorso esplicito:

```powershell
node scripts/latex.js examples/semantic-notes.tex output/notes-inspect.tex
```

Il secondo comando non avvia pdflatex: ti lascia vedere la trasformazione.
Quel file e' un risultato chiesto da te, non un intermedio da cancellare in
modo automatico. La compilazione automatica aggiunge al percorso di ricerca
LaTeX la cartella `latex`, che contiene `pyxis.sty`.

## 12. Un metodo pratico per lavorare insieme

Per ogni funzionalita' prendiamo una figura concreta e scriviamo prima il
sorgente che vorremmo poter usare. Poi fissiamo nomi, convenzioni, modello
matematico e limiti. Implementiamo una modifica piccola e verificabile,
aggiungiamo i test necessari e guardiamo il rendering reale.

Una buona prima divisione del lavoro e' questa:

- tu scegli le convenzioni fisiche del corso e aggiungi configurazioni o
  oggetti a un pacchetto esistente, con un esempio e un test;
- io curo inizialmente le parti comuni del linguaggio, la gestione delle
  dipendenze e la pipeline, e revisiono con te le modifiche;
- quando padroneggi quel percorso, puoi implementare un nuovo generatore,
  poi un vincolo o un algoritmo numerico.

Questa e' una proposta di progressione, non una separazione rigida dei compiti.
Il primo risultato da raggiungere e' saper spiegare dove passa una tua
istruzione e modificare un comportamento senza rompere gli altri pacchetti.

Quando una prova fallisce, conserva il piu' piccolo sorgente che la riproduce.
Controlla prima se l'errore e' di sintassi, di geometria, di numerica o di backend.
Non correggere simultaneamente tutti i livelli: altrimenti non saprai quale
modifica ha risolto il problema.

Gli esempi e i test riutilizzabili fanno parte del progetto. Script di migrazione,
log, profili di prova e intermedi di compilazione vengono invece rimossi.

## 13. Capire e modificare l'integratore adattivo

Apri `src/numerics.hpp`: qui la numerica e' separata dai nomi degli oggetti,
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
Non stiamo usando un integratore embedded RK45: questo e' RK4 con step doubling.
Puoi confrontare la descrizione con il
[manuale ufficiale GSL](https://www.gnu.org/software/gsl/doc/html/ode-initval.html).

Esegui il caso concreto:

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

Per un esperimento cambia abs-tol/rel-tol da 1e-9 a 1e-7, ricompila
la figura e confronta il risultato. Cambiare questi valori nel sorgente
non richiede ricompilare l'eseguibile. Riduci max-step se i segmenti
appaiono troppo distanti: la precisione del calcolo e il campionamento
grafico sono problemi collegati, ma diversi. Se usi componenti con unita'
e scale molto diverse, considera prima una nondimensionalizzazione;
attualmente la tolleranza assoluta e' comune a tutte le componenti.

I test confrontano anche il decadimento esponenziale con exp(-t), una
componente non autonoma con t^2 e Lorenz a breve termine con un RK4
molto raffinato. Stringere le tolleranze deve migliorare l'accordo e
aumentare il lavoro. Non interpretare abs-tol come una garanzia sull'errore
totale: controlliamo una stima locale. Per sistemi stiff, eventi complessi e
osservabili caotiche a lungo termine servono strumenti e verifiche ulteriori.

## 14. Regioni, profili e composizione dei pacchetti

Un `profile` importa i pacchetti del corso; un successivo use ne aggiunge altri.
Non blocca la tua tesi in un dominio. In `src/semantic.cpp` trovi la tabella
dei profili e il registry degli oggetti. Il profilo research abilita tutti.

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

Leggi phase_diagram in `src/packages/statmech.cpp`: costruisce quattro regioni,
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
di riga+colonna+strato. Prova examples/ising3d.pyxis; nel test del cubo 2x2x2
trovi otto spin e dodici legami. Questo controlla la topologia, non soltanto
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
con una regex: potresti interpretare un esempio stampato negli appunti come
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
Se aggiungi import/subfiles in futuro, devi specificare le nuove regole dei
percorsi prima di modificarne il parser.

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
ma non e' la scelta adatta quando vuoi ispezionarlo passo per passo in un debugger.
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
