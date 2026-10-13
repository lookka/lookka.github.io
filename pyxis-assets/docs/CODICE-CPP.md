# Il codice C++ di Pyxis: struttura, motivazioni e modifiche

Questa guida legge **l'implementazione reale di Pyxis 1.0**. Non introduce un
programma alternativo. In fondo trovi tutti i 21 file C++/header di `src` e
il file dei test C++, con spiegazioni e sorgente completo consultabile.

L'obiettivo è capire quali responsabilità servono per ricostruire il progetto,
come sono collegate e dove intervenire. Le scelte attuali sono scelte di
implementazione: alcune sono compatte e pratiche, altre meritano una revisione
prima di ampliare molto il linguaggio.

## 1. Le responsabilità prima dei file

Una figura descritta come testo richiede quattro operazioni diverse:

1. Interpretare quello che è stato scritto: comandi, proprietà, espressioni.
2. Conservare il significato in dati C++ sui quali si possano fare controlli.
3. Risolvere la geometria: coordinate, dipendenze, vincoli, percorsi.
4. Produrre istruzioni per il motore grafico.

Ho separato queste responsabilità perché cambiano per ragioni diverse.
Una nuova proprietà del linguaggio non dovrebbe obbligare a riscrivere il
motore numerico. Un diverso modo di disegnare un cerchio non dovrebbe
cambiare la grammatica dei circuiti.

Nel codice corrente, parsing e generazione Asymptote condividono ancora
`pyxis.cpp`. Sono due funzioni distinte, ma lo stesso file è ormai grande.
Separarle fisicamente sarebbe un refactoring utile; non è necessario per
comprendere il contratto che le collega.

## 2. main.cpp: il confine con il sistema operativo

Il centro di `main()` è questo codice, presente nel progetto:

```cpp
auto scene = pyxis::parse(input);
auto generated = pyxis::asymptote(scene, argc == 4);
```

La prima riga produce dati; la seconda produce una stringa di codice.
`main()` non decide il layout di un circuito né la forma di un propagatore.
Controlla gli argomenti, apre file, richiama il nucleo e gestisce gli errori.
Questo rende il nucleo utilizzabile anche da test che non aprono finestre.

`argc == 4` indica l'opzione `--preview`, già validata all'inizio.
`weakly_canonical()` controlla che sorgente e destinazione non coincidano:
aprire un `ofstream` sul sorgente lo potrebbe troncare.
L'output viene aperto dopo parsing e generazione, così un errore di sintassi
non distrugge un output precedente. Una scrittura su disco può comunque
fallire: il controllo dopo `close()` verifica anche quell'errore.

Il `catch` converte un'eccezione in diagnostica e codice di uscita 1.
Un uso errato della riga di comando restituisce 2. Il successo restituisce 0.
Questi valori permettono agli script di capire se possono proseguire.

## 3. pyxis.hpp: progettare la rappresentazione dei dati

`Kind` distingue i tipi di oggetto. `Object` conserva nome, geometria, stile,
ancoraggi e vincoli. `Scene` possiede il vettore degli oggetti e le
impostazioni della figura. `Group` e `Placement` descrivono composizioni.

`std::vector<Object>` possiede i suoi oggetti: il programma non deve gestire
un `new` e un `delete` per ogni cerchio. L'ordine del vettore è significativo
per alcuni passaggi, compreso l'ordine delle etichette automatiche.
I nomi permettono all'utente di riferirsi agli oggetti dopo la dichiarazione.

I campi `x`, `y`, `a`, `b` sono riutilizzati: in un cerchio `a` è il raggio;
in una linea `a,b` sono il secondo estremo. È compatto, ma introduce stati
che non hanno significato per tutti i `Kind`. Per capire un campo bisogna
guardare il tipo. Una variante con strutture `Circle`, `Line`, `Surface`
separate renderebbe gli invarianti più espliciti, al costo di modificare
parser, layout, vincoli e backend insieme. Non sarebbe un semplice cambio di nome.

`start_anchor` conserva una relazione ancora da risolvere; non è una
coordinata già calcolata. Le coordinate numeriche possono rappresentare
anche un offset da sommare dopo. Questa distinzione è indispensabile quando
un riferimento è dichiarato più avanti o viene spostato.

La firma `Scene parse(std::istream&)` accetta sia file sia stringhe nei test.
`asymptote(const Scene&)` riceve un riferimento costante: legge la scena
senza copiarla e senza modificarla. Sono contratti deliberatamente diversi.

## 4. Ordine reale delle chiamate

`main()` chiama `parse()`. All'interno di `parse()`, `normalize(source)`
chiama prima `semantic(input)`. L'ordine logico è:

```text
testo del file
  → semantic: blocchi dei pacchetti → primitive testuali
  → normalize: blocchi geometrici → comandi normalizzati
  → parse: comandi → Scene e Object
  → layout: collocazione dei gruppi
  → resolve_anchors: ancoraggi e vincoli geometrici
  → resolve_clipping: identificazione dei nodi da tagliare
  → validazione delle regioni
  → asymptote: scena → codice Asymptote
```

Questa descrizione corrisponde all'ordine nel sorgente. Pyxis non costruisce
un AST generale per tutto il linguaggio: usa righe normalizzate come
intermedio fra i primi passaggi e una `Scene` come intermedio geometrico.
Un AST è un albero che conserva strutturalmente istruzioni ed espressioni;
qui sarebbe un'evoluzione dell'architettura, non una struttura già presente.

## 5. semantic.cpp: scegliere il significato di un blocco

Il registro associa una stringa, per esempio `quantum.circuit`, a un
puntatore a funzione. Il tipo reale è:

```cpp
using Generator = void(*)(const Block&, Builder&);
```

La funzione legge un blocco e aggiunge primitive tramite un Builder.
Non è necessario creare una classe con metodi virtuali per ogni pacchetto:
qui tutte le funzioni hanno la stessa firma e non conservano uno stato proprio.

`imports` è un set: evita import duplicati e permette di controllare se un
nome breve è disponibile. `registry` è una map: permette la ricerca del
generatore. Se più import fornissero lo stesso nome breve, il programma
chiederebbe il nome qualificato anziché scegliere in modo arbitrario.

`Block::properties` è una map, ma `Block::order` è un vettore separato.
La map permette di cercare una proprietà; il vettore conserva l'ordine
delle righe, necessario per i qubit. Usare soltanto la map riordinerebbe
i nomi e cambierebbe il circuito scritto dall'utente.

I blocchi diventano comandi primitivi con nomi gerarchici. Questo è il motivo
per cui `F.in1` resta modificabile dopo la creazione di un diagramma Feynman.
Le istruzioni `_use` e `_group` sono interne: non vanno proposte come API utente.

## 6. packages/common.hpp: validazione e costruzione condivise

`trim` elimina spazi esterni; `clean` rimuove commenti rispettando le stringhe.
`split` separa liste solo quando non si trova dentro stringhe o parentesi.
Un semplice split su ogni virgola romperebbe `oracle(id,"formula")`.
`list` verifica le parentesi quadre. `identifier` controlla i nomi locali.
`real` legge un numero finito nell'intervallo richiesto; `integer` aggiunge
il vincolo che il numero non abbia parte frazionaria.

`num` usa la locale classica e 17 cifre significative. La locale evita che
il sistema scriva una virgola decimale in un linguaggio che richiede il punto;
la precisione evita una perdita evitabile nella conversione double→testo.

`Block::get` applica un default esplicito. `allow` rifiuta proprietà sconosciute:
un errore di battitura non deve essere ignorato producendo un disegno plausibile.

`Builder` contiene un riferimento al vettore di output e un riferimento
costante al blocco. Non possiede una copia della scena finale.
`object` crea `nomeGruppo.nomeLocale`, registra il membro e emette il comando.
`line`, `label`, `path`, `path3` sono abbreviazioni di questa operazione.
`connect` usa ancoraggi e attiva il clipping, così lo spostamento del nodo
non lascia il legame attaccato a una vecchia coordinata.
`group` emette gli ingombri conservativi necessari a `place`.

## 7. syntax.cpp: due sintassi, un solo nucleo

`normalize()` riconosce blocchi geometrici come `circle A { … }` e produce
comandi come `circle A 0 0 0.5`. È una traduzione da una forma comoda a una
forma più semplice da interpretare.

`SourceLine` conserva testo e numero di riga. Senza questa informazione,
un errore dopo l'espansione di un blocco indicherebbe una riga del testo
generato anziché una posizione utile nel file scritto dall'utente.

Le proprietà ammesse dipendono dal tipo. I default vengono applicati qui,
poi i comandi numerici risultanti vengono controllati ancora dal parser.
`offset` viene tradotto in `move` o `move3`; `stroke-width` in `linewidth`;
`controls` in `curve`. Questi alias non devono essere implementati due volte.

`without_comment` conta se si è dentro una stringa prima di interpretare #.
Il riconoscimento delle parentesi graffe esclude le righe contenenti stringhe:
le graffe di una formula LaTeX non devono aprire un blocco Pyxis.
È un parser a righe con limiti dichiarati, non un lexer generale con escape
arbitrari. Aggiungere stringhe multilinea richiederebbe ripensare questo passaggio.

## 8. pyxis.cpp: lettura e costruzione della scena

Le funzioni nel namespace anonimo sono dettagli interni di questa unità
di compilazione. `number` controlla estrazione e finitezza; `name` i nomi;
`quoted` legge una stringa conservando le barre inverse; `positive` impone
una dimensione positiva. `point` distingue coordinate da ancoraggi.

`parse()` possiede una scena locale. I comandi globali ne modificano le
impostazioni; i comandi di creazione aggiungono Object; i comandi di modifica
usano `object_named()` e un riferimento all'oggetto esistente.
Quel riferimento evita di modificare una copia che poi andrebbe persa.

La lunga catena if/else distingue i comandi. È leggibile all'inizio, ma con
molti comandi diventa un punto di manutenzione delicato. Un registro di handler
potrebbe suddividerla; occorrerebbe mantenere insieme validazione, accesso
alla scena e diagnostica, non spostare soltanto stringhe in un'altra map.

Per ogni ramo controlla tre cose: quali token legge, quali campi modifica,
quali combinazioni rifiuta. Esempio: `color` legge tre numeri, verifica 0…1,
aggiorna red/green/blue e explicit_color, rifiuta testi e punti invisibili.
I rami di creazione verificano anche nomi duplicati e dimensioni positive.

Il controllo finale sugli argomenti impedisce che `circle A 1 sorpresa`
venga accettato ignorando il testo residuo. Le eccezioni vengono arricchite
con la riga sorgente. Se un passaggio fallisce, la scena parziale non viene
restituita: questo è il significato pratico del parsing transazionale qui.

## 9. layout.cpp: un problema di dipendenze

`place B below A` significa che per collocare B bisogna conoscere A.
Il codice costruisce indici nome→posizione e nome→oggetto, poi usa una visita
ricorsiva. Gli stati 0/1/2 significano non visitato, in visita, risolto.
Trovare di nuovo uno stato 1 segnala un ciclo; trovare 2 permette di riusare
il risultato. Non basta applicare le istruzioni nell'ordine del file.

Gli ingombri del riferimento determinano dx/dy. La traslazione aggiorna
coordinate, punti e controlli Bézier. Gli estremi già ancorati a membri del
gruppo non vengono traslati due volte: seguiranno il loro proprietario.

La map conserva puntatori agli elementi del vettore degli oggetti.
Nel passaggio corrente non si aggiungono nuovi Object: un push_back che
riallocasse il vettore invaliderebbe quei puntatori. Se modifichi layout
per creare oggetti, devi cambiare questo contratto o usare indici stabili.

## 10. resolve_anchors e constraints.cpp

`resolve_anchors()` usa ancora una visita a tre stati. Per `B.center`
cerca B, risolve prima le sue dipendenze e soltanto allora calcola il punto.
Una lookup diretta nelle coordinate iniziali darebbe risultati sbagliati
dopo move/place o con dichiarazioni successive.

Per circle/ellipse l'ancoraggio north aggiunge il semiasse verticale.
Per path/plot node1 è un punto della polilinea; non è il centro di una figura.
Gli ancoraggi di testi automatici vengono rifiutati perché la posizione reale
si decide più tardi nel backend, dopo la misura TeX.

`resolve_constraint()` calcola tangenze esterne e segmenti paralleli/perpendicolari.
Per una tangenza: distanza fra centri = somma dei raggi. La direzione scelta
viene normalizzata. Per una perpendicolare, il versore (dx,dy) diventa (-dy,dx).
Il segmento è centrato su through, quindi i due estremi usano ±length/2.

`resolve_clipping()` non taglia ancora tutte le curve. Identifica quali oggetti
costituiscono i bordi iniziali/finali e conserva i loro nomi. Il taglio effettivo
viene affidato al codice Asymptote: lì sono disponibili curve e misure TeX.

## 11. expression.cpp: la grammatica delle formule

`Expression` conserva stringa, posizione di lettura, valore di x e riferimenti
alle tabelle di costanti/funzioni. Non serve creare una stringa nuova per ogni
token: la posizione avanza dentro il testo posseduto dal chiamante.

La precedenza deriva dalla struttura delle funzioni: sum chiama product,
product chiama unary, unary chiama power, power chiama atom.
atom riconosce numeri, parentesi, nomi e chiamate di funzione.
La ricorsione sul secondo operando della potenza rende `2^3^2` associativo
a destra. I segni unari esterni fanno sì che `-x^2` significhi `-(x^2)`.

`evaluate()` crea un interprete e ne restituisce il valore. Non genera codice
macchina e non effettua algebra simbolica. I controlli su profondità, lunghezza,
divisione per zero e valori non finiti proteggono il calcolo numerico e la figura.
Se aggiungi una funzione come atan, aggiorna riconoscimento, nomi riservati,
documentazione e test del dominio: non basta aggiungere una chiamata a cmath.

## 12. I quattro file packages: modello → primitive

**qft.cpp.** `particle()` converte un nome in etichetta, famiglia grafica e flag
antiparticella. `feynman()` verifica proprietà e canale, costruisce le gambe,
poi una lambda propagator sceglie linea, onda, spirale e freccia di flusso.
La direzione grafica è trasformata dal sistema locale del segmento a quello
del foglio. Il raccordo del gluone attenua le prime/ultime spire: evita che
la curva ripieghi nel vertice. Le bolle sono percorsi campionati, non cerchi
con un significato fisico dedotto automaticamente.

**quantum.cpp.** `circuit()` separa righe e colonne, individua prima gli oracle
condivisi, poi genera fili/gate, infine connessioni. La chiave (colonna,id)
impedisce di collegare per errore controlli omonimi in istanti diversi.
`tensor_network()` converte indici di reticolo in coordinate e costruisce
legami tramite ancoraggi. `bloch()` converte theta/phi in un vettore 3D.
Non viene evoluta una funzione d'onda: sono modelli di rappresentazione.

**statmech.cpp.** `ising()` genera reticolo e frecce usando indici di sito.
L'ordine di spins segue strato, riga, colonna. `phase_flow()` costruisce una
funzione derivata da due espressioni, integra e converte la traiettoria in path.
`integration_options()` applica gli stessi contratti numerici a phase-flow e
Lorenz. `phase_diagram()` costruisce regioni e curve schematiche; non usa
un'equazione di stato. `lorenz()` definisce le tre derivate e chiama l'integratore.

**relativity.cpp.** `penrose()` sceglie modelli conformi schematici documentati.
`embedding()` campiona Flamm con una coordinata quadratica vicino alla gola,
così non concentra una variazione singolare di derivata su un passo uniforme in r.
`light_cones()` usa pendenze nulle locali in carta PG. `geodesic()` integra
l'equazione per u=r_s/r rispetto a phi e sceglie una rappresentazione 2D/3D.
Il modello numerico viene calcolato prima della sua proiezione grafica.

## 13. numerics.hpp: indipendenza dalla grafica

`Options` contiene scelte numeriche. `Trajectory<N>` contiene array di stato,
tempi e diagnostica. Non contiene penne, colori o riferimenti Asymptote.
Questa separazione permette di provare il metodo con un oscillatore noto.

N è un parametro di template: lo stesso codice lavora su array di dimensione
2 o 3 senza vettori dinamici per ogni stato. Derivative è un tipo generico:
una lambda con le equazioni del modello soddisfa il contratto senza ereditarietà.

`rk4()` valuta quattro pendenze e combina k1+2k2+2k3+k4 con fattore h/6.
La lambda add crea gli stati intermedi. `integrate()` gestisce tempi e passi;
nel modo adattivo confronta un passo intero con due mezzi passi. La differenza
divisa per 15 stima l'errore della soluzione fine, normalizzato con atol/rtol.
I passi respinti non diventano punti della traiettoria.

L'evento opzionale è una std::function vuota se non usata. Se cambia da falso
a vero nel passo accettato, il codice localizza il punto con bisezione e
reintegrazione. Non è una garanzia di rilevare eventi multipli fra due campioni.
I limiti su tentativi, dimensione dello stato e durata impediscono di restituire
silenziosamente un percorso incompleto come se fosse una soluzione completa.

## 14. asymptote(): generare un altro linguaggio

Questa funzione percorre la scena e scrive una stringa tramite ostringstream.
La generazione è ordinata per il tipo di scena, poi per gli oggetti.
Coordinate e formule diventano istruzioni Asymptote; non diventano pixel in C++.

Gli helper emit_path/emit_base_path traducono segmenti, Bézier e onde.
markers aggiunge simboli ai vertici. I nodi di clipping e gli ostacoli delle
etichette vengono descritti prima della procedura finale che li usa.
ink/paper selezionano le penne coerenti con il tema; plain_text protegge
i caratteri che LaTeX interpreta quando l'utente ha richiesto testo letterale.

I file asymptote_geometry.hpp e asymptote_labels.hpp contengono raw string
`R"ASY(…)ASY"`. La funzione che restituisce la stringa è C++; il contenuto
è **codice Asymptote**, eseguito dopo dal programma asy. Non va letto come C++.

`pyxis_trim` trova intersezioni e seleziona il sottopercorso visibile.
`pyxis_text_box` costruisce il bordo di una formula misurata.
`pyxis_auto_labels` misura glyph frame TeX, riserva spazio, valuta candidati
nel frame trasformato e sceglie in ordine una posizione a costo basso.
Il callback finale serve perché la trasformazione che fissa la larghezza in mm
non è nota nelle coordinate iniziali. È questo il motivo del taglio del testo
in coordinate fisiche, anziché una stima del suo numero di caratteri.

## 15. Header, compilazione e collegamento

Gli header dichiarano i contratti condivisi; i cpp definiscono le funzioni.
`#pragma once` evita inclusioni ripetute nello stesso processo di compilazione.
Le funzioni inline nei due header Asymptote e in common.hpp possono essere
definite negli header inclusi da più unità di compilazione senza creare normali
definizioni multiple al linker. I template numerici devono essere disponibili
quando vengono istanziati, per questo l'implementazione è nell'header.

`CMakeLists.txt` costruisce una libreria pyxis_core, poi collega sia main sia
i test a quella libreria. `scripts/build.ps1` invoca invece GCC direttamente
con l'elenco dei cpp. I due percorsi non aggiungono nuovi significati al linguaggio:
organizzano compilazione e linking del medesimo nucleo.

Una nuova definizione non inline in un header può causare errori di simboli
duplicati. Una funzione dichiarata ma non collegata produce un simbolo mancante.
Un errore di sintassi C++ si verifica prima, nella compilazione del cpp.
Distinguere questi tre casi rende più semplice capire un messaggio di GCC.

## 16. Test e metodo per una modifica reale

`tests/core.cpp` costruisce input in memoria, richiama parse e verifica scene,
errori, codice generato e risultati numerici. L'integratore viene confrontato
con soluzioni note e quantità fisiche: una figura gradevole non è una prova.
I test JavaScript verificano altri confini, compresi processi esterni e VS Code;
non sono parte del nucleo C++.

Per modificare una funzione identifica prima il suo contratto. Poi segui il
dato interessato: testo → Object → trasformazioni → Asymptote. Una proprietà
nuova richiede spesso parser, normalizzazione dei blocchi, renderer, editor,
manuale e un test del comportamento. Un nuovo modello fatto di primitive può
invece richiedere soltanto generatore, registro, dichiarazione e documentazione.

Per esempio, un nuovo stato Ising non cambia l'integratore. Cambia la
validazione state e il calcolo del segno nei rami 2D e 3D, con test di entrambi.
Una nuova funzione matematica cambia Expression e i contratti dei nomi riservati.
Un nuovo Kind cambia molti visitatori: parser, ancoraggi, layout, stili e backend.

## 17. Ordine per ricostruire il progetto dalle sue responsabilità

1. Definire quali dati minimi rappresentano gli oggetti e la scena.
2. Stabilire firme pubbliche, gestione dell'input e contratti degli errori.
3. Implementare lettura di numeri/nomi/stringhe e costruzione degli Object.
4. Implementare un backend che legga quegli Object senza reinterpretare il testo.
5. Aggiungere normalizzazione della sintassi a blocchi.
6. Aggiungere ancoraggi e risoluzione delle dipendenze, poi layout e vincoli.
7. Costruire Builder e generazione dei modelli sopra primitive già funzionanti.
8. Aggiungere espressioni e numerica con test indipendenti dal disegno.
9. Collegare il processo agli strumenti esterni e all'editor.

Questo è un ordine di ricostruzione ragionato, non una richiesta di creare
un secondo progetto. Ogni punto si può studiare nel codice reale riportato sotto.

## 18. Confine con JavaScript e LaTeX

Il C++ produce il file .asy. `vscode/backend.js` avvia il compilatore e Asymptote,
gestisce SVG/PDF, cache e temporanei. `vscode/extension.js` usa l'API dell'editor.
`tools/pyxis/latex.js` e project.js preparano gli ambienti nei documenti.
La separazione evita di introdurre API VS Code dentro il compilatore C++.
La [guida di sviluppo](GUIDA-SVILUPPO.md) descrive quei componenti e la pipeline
LaTeX. Il codice completo qui sotto riguarda il nucleo C++ e i suoi test.

## Indice del sorgente completo

Le sezioni seguenti contengono i file reali della release, senza versioni
semplificate. Le note precedono il listato; espandi il codice quando vuoi
seguire la spiegazione. I listati sono una fotografia dei sorgenti al momento
di generare questa guida: il progetto rimane l'autorità per modifiche successive.


- [src/main.cpp](#src-main-cpp)
- [src/pyxis.hpp](#src-pyxis-hpp)
- [src/syntax.hpp](#src-syntax-hpp)
- [src/semantic.hpp](#src-semantic-hpp)
- [src/semantic.cpp](#src-semantic-cpp)
- [src/syntax.cpp](#src-syntax-cpp)
- [src/pyxis.cpp](#src-pyxis-cpp)
- [src/layout.hpp](#src-layout-hpp)
- [src/layout.cpp](#src-layout-cpp)
- [src/constraints.hpp](#src-constraints-hpp)
- [src/constraints.cpp](#src-constraints-cpp)
- [src/expression.hpp](#src-expression-hpp)
- [src/expression.cpp](#src-expression-cpp)
- [src/packages/common.hpp](#src-packages-common-hpp)
- [src/packages/qft.cpp](#src-packages-qft-cpp)
- [src/packages/quantum.cpp](#src-packages-quantum-cpp)
- [src/packages/statmech.cpp](#src-packages-statmech-cpp)
- [src/packages/relativity.cpp](#src-packages-relativity-cpp)
- [src/numerics.hpp](#src-numerics-hpp)
- [src/asymptote_geometry.hpp](#src-asymptote-geometry-hpp)
- [src/asymptote_labels.hpp](#src-asymptote-labels-hpp)
- [tests/core.cpp](#tests-core-cpp)

## src/main.cpp

Punto di ingresso: main valida gli argomenti, protegge il sorgente, apre input/output e converte eccezioni in exit status. Le due chiamate parse/asymptote sono il confine fra I/O e nucleo.

<details>
<summary>Codice reale completo: src/main.cpp</summary>

```cpp
#include "pyxis.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>

int main(int argc, char** argv) {
    if ((argc != 3 && argc != 4) || (argc == 4 && std::string(argv[3]) != "--preview")) {
        std::cerr << "Pyxis 1.0\nUso: pyxis input.pyxis output.asy [--preview]\n";
        return 2;
    }
    try {
        if (std::filesystem::weakly_canonical(argv[1]) == std::filesystem::weakly_canonical(argv[2]))
            throw std::runtime_error("sorgente e destinazione devono essere diversi");
        std::ifstream input(argv[1]);
        if (!input) throw std::runtime_error("impossibile aprire il sorgente");
        auto scene = pyxis::parse(input);
        auto generated = pyxis::asymptote(scene, argc == 4);
        std::ofstream output(argv[2]);
        if (!output) throw std::runtime_error("impossibile creare il file Asymptote");
        output << generated;
        output.close();
        if (!output) throw std::runtime_error("errore nella scrittura del file Asymptote");
        std::cout << "Generato " << argv[2] << " (" << scene.objects.size() << " oggetti)\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Pyxis: " << e.what() << '\n';
        return 1;
    }
}
```

</details>

## src/pyxis.hpp

Contratto pubblico: Kind discrimina gli oggetti; Controls descrive i due controlli di un segmento; Object contiene geometria/stili/relazioni; Group e Placement descrivono layout; Scene possiede i dati. parse e asymptote sono le due funzioni pubbliche.

<details>
<summary>Codice reale completo: src/pyxis.hpp</summary>

```cpp
#pragma once
#include <istream>
#include <string>
#include <vector>
#include <utility>
#include <unordered_map>
#include <array>

namespace pyxis {
enum class Kind { Circle, Ellipse, Line, Arrow, Label, Text, Plot, Path, Sphere, Surface, Label3, Text3, GateBox, Path3, Arrow3, Mesh3, Point };
struct Controls {
    size_t segment;
    std::pair<double, double> first, second;
};
struct Object {
    Kind kind;
    std::string name;
    double x = 0, y = 0, a = 0, b = 0;
    std::string text;
    std::vector<std::pair<double, double>> points;
    std::string start_anchor, end_anchor;
    std::vector<std::string> point_anchors;
    std::vector<Controls> controls;
    std::string stroke = "solid", marker = "none";
    bool marker_filled = true;
    double marker_size = 0.08, bend = 0;
    double wave_amplitude = 0;
    unsigned wave_turns = 0;
    double z = 0;
    unsigned mesh = 16;
    std::vector<double> heights;
    double red = 0.65, green = 0.75, blue = 0.85;
    std::string fill = "auto", detail = "minimal";
    double stroke_width = 0.5, shading = 0.14;
    std::string flow = "none", node_fill = "none";
    bool background = false;
    bool region = false, explicit_color = false;
    bool outline = true;
    double opacity = 0.25;
    std::vector<std::array<double,3>> vertices3;
    unsigned mesh_rows = 0, mesh_columns = 0;
    std::string constraint, constraint_reference, constraint_direction;
    double constraint_length = 2;
    bool clip_nodes = false;
    std::string clip_start, clip_end;
    bool automatic_label = false;
    std::string label_preference = "n";
    double label_gap_bp = 3;
};
struct Group {
    std::string name;
    double left, bottom, right, top;
    std::vector<std::string> members;
};
struct Placement {
    std::string object, relation, reference;
    double gap = 1;
    size_t line;
};
struct Scene {
    double width_mm = 100;
    std::vector<Object> objects;
    double grid_step = 1;
    bool grid_visible = true;
    std::unordered_map<std::string, std::vector<std::pair<double, double>>> symbols;
    double camera_x = 5, camera_y = -7, camera_z = 5;
    std::string theme = "paper";
    std::vector<Group> groups;
    std::vector<Placement> placements;
    std::vector<std::string> packages;
};
// Parsing is transactional: an invalid source produces no partially usable scene.
Scene parse(std::istream& source);
std::string asymptote(const Scene& scene, bool preview = false);
}
```

</details>

## src/syntax.hpp

SourceLine contiene testo e numero di riga. normalize restituisce righe primitive, mantenendo la possibilità di attribuire una diagnostica al sorgente dell’utente. Il riferimento istream evita di imporre un filesystem al parser.

<details>
<summary>Codice reale completo: src/syntax.hpp</summary>

```cpp
#pragma once
#include <istream>
#include <string>
#include <vector>
namespace pyxis {
struct SourceLine { std::string text; size_t number; };
// Expand declarative blocks to the existing core commands, retaining diagnostics.
std::vector<SourceLine> normalize(std::istream& input);
}
```

</details>

## src/semantic.hpp

semantic è il passaggio di espansione dei pacchetti. Include syntax.hpp perché restituisce SourceLine. È una dipendenza sui dati dell’interfaccia, non sulla funzione normalize: non c’è ricorsione tra i due passaggi.

<details>
<summary>Codice reale completo: src/semantic.hpp</summary>

```cpp
#pragma once
#include "syntax.hpp"
namespace pyxis {
// Domain blocks lower to the existing geometric language, preserving source lines.
std::vector<SourceLine> semantic(std::istream& input);
}
```

</details>

## src/semantic.cpp

registry è il dispatch dei generatori. semantic mantiene imports/ids, riconosce profile/use e i blocchi, cerca il nome qualificato, costruisce Block, poi richiama la funzione tramite Generator. La riga originale accompagna ogni comando emesso. I blocchi non semantici sono lasciati al normalizzatore.

<details>
<summary>Codice reale completo: src/semantic.cpp</summary>

```cpp
#include "packages/common.hpp"
namespace pyxis {
namespace {
using namespace packages;
using Generator=void(*)(const Block&,Builder&);
const std::map<std::string,Generator> registry{{"qft.feynman",feynman},{"quantum.circuit",circuit},{"quantum.tensor-network",tensor_network},{"quantum.bloch",bloch},{"statmech.ising",ising},{"statmech.phase-flow",phase_flow},{"statmech.phase-diagram",phase_diagram},{"statmech.lorenz",lorenz},{"relativity.penrose",penrose},{"relativity.embedding",embedding},{"relativity.light-cones",light_cones},{"relativity.geodesic",geodesic}};
}
std::vector<SourceLine> semantic(std::istream& input) {
    using namespace packages;
    std::vector<SourceLine> out;std::set<std::string> imports,ids;
    std::string raw;size_t n=0;
    while(std::getline(input,raw)){
        ++n;auto s=clean(raw);
        try {
            if(s.rfind("profile ",0)==0){
                auto profile=trim(s.substr(8));
                static const std::map<std::string,std::vector<std::string>> profiles{{"qft",{"qft"}},{"quantum",{"quantum"}},{"relativity",{"relativity"}},{"statmech",{"statmech"}},{"research",{"qft","quantum","relativity","statmech"}}};
                auto preset=profiles.find(profile);if(preset==profiles.end())throw std::runtime_error("profile: qft, quantum, relativity, statmech, research");
                for(const auto& p:preset->second)if(imports.insert(p).second)out.push_back({"_use "+p,n});
                continue;
            }
            if(s.rfind("use ",0)==0){for(auto p:split(s.substr(4))){if(p!="qft"&&p!="quantum"&&p!="statmech"&&p!="relativity")throw std::runtime_error("pacchetto sconosciuto: "+p);if(imports.insert(p).second)out.push_back({"_use "+p,n});}continue;}
            if(s.rfind("theme:",0)==0){out.push_back({"theme "+trim(s.substr(6)),n});continue;}
            if(s.empty()||s.back()!='{'||s.find('"')!=std::string::npos){out.push_back({raw,n});continue;}
            std::istringstream header(s.substr(0,s.size()-1));std::string type,id,extra;header>>type>>id;
            std::string qualified=type;
            if(type.find('.')==std::string::npos){
                std::vector<std::string> matches;for(const auto& p:imports)if(registry.count(p+"."+type))matches.push_back(p+"."+type);
                if(matches.size()>1)throw std::runtime_error("nome ambiguo: usa il prefisso del pacchetto");
                if(matches.size()==1)qualified=matches.front();
            }
            auto generator=registry.find(qualified);
            if(generator==registry.end()){
                if(type.find('.')!=std::string::npos)throw std::runtime_error("oggetto del pacchetto non disponibile: "+type);
                out.push_back({raw,n});continue;
            }
            if(!imports.count(qualified.substr(0,qualified.find('.'))))throw std::runtime_error("importa prima il pacchetto con use");
            if(!identifier(id)||header>>extra)throw std::runtime_error("intestazione attesa: tipo nome {");
            if(!ids.insert(id).second)throw std::runtime_error("nome del gruppo gia' utilizzato: "+id);
            Block b{qualified,id,n,{}, {}};bool closed=false;
            while(std::getline(input,raw)){
                ++n;auto prop=clean(raw);if(prop.empty())continue;if(prop=="}"){closed=true;break;}
                auto colon=prop.find(':');if(colon==std::string::npos)throw std::runtime_error("proprieta' attesa: nome: valore");
                auto k=trim(prop.substr(0,colon)),v=trim(prop.substr(colon+1));
                if(k.empty()||v.empty()||b.properties.count(k))throw std::runtime_error("proprieta' vuota o duplicata");
                b.properties.emplace(k,SourceLine{v,n});b.order.push_back(k);
            }
            if(!closed)throw std::runtime_error("blocco non chiuso, iniziato alla riga "+std::to_string(b.line));
            Builder builder{out,b,{}};generator->second(b,builder);
        }catch(const std::exception& e){throw std::runtime_error("riga "+std::to_string(n)+": "+e.what());}
    }
    if(input.bad())throw std::runtime_error("errore durante la lettura del sorgente");
    return out;
}
}
```

</details>

## src/syntax.cpp

trim e without_comment normalizzano la riga; coordinates normalizza parentesi/virgole; call_contents riconosce le forme arc/wave. normalize applica semantic, verifica proprietà e incompatibilità, traduce ciascun tipo in un comando e aggiunge le operazioni di stile/offset. Le lambda value/emit condividono rispettivamente default e provenienza della riga.

<details>
<summary>Codice reale completo: src/syntax.cpp</summary>

```cpp
#include "syntax.hpp"
#include "semantic.hpp"
#include <algorithm>
#include <cctype>
#include <map>
#include <sstream>
#include <stdexcept>
#include <set>

namespace pyxis {
namespace {
std::string trim(std::string value) {
    auto first = value.find_first_not_of(" \t\r\n"), last = value.find_last_not_of(" \t\r\n");
    return first == std::string::npos ? "" : value.substr(first, last - first + 1);
}
std::string without_comment(const std::string& value) {
    bool quoted = false;
    for (size_t i = 0; i < value.size(); ++i) {
        if (value[i] == '"') quoted = !quoted;
        if (!quoted && value[i] == '#') return value.substr(0, i);
    }
    return value;
}
std::string coordinates(std::string value) {
    value = trim(value);
    if (value.size() >= 2 && value.front() == '(' && value.back() == ')') value = value.substr(1, value.size() - 2);
    std::replace(value.begin(), value.end(), ',', ' ');
    return trim(value);
}
std::string call_contents(const std::string& value, const std::string& function) {
    if (value.size() <= function.size() + 2 || value.substr(0, function.size() + 1) != function + "(" || value.back() != ')') return "";
    return coordinates(value.substr(function.size() + 1, value.size() - function.size() - 2));
}
}
std::vector<SourceLine> normalize(std::istream& input) {
    const auto lines = semantic(input);
    std::vector<SourceLine> result;
    std::string raw;
    size_t line_number = 0;
    for (size_t cursor = 0; cursor < lines.size(); ++cursor) {
        raw = lines[cursor].text;
        line_number = lines[cursor].number;
        auto line = trim(without_comment(raw));
        // Braces in quoted LaTeX strings do not introduce object blocks.
        if (line.empty() || line.back() != '{' || line.find('"') != std::string::npos) { result.push_back({raw, line_number}); continue; }
        size_t header_line = line_number;
        std::istringstream header(line.substr(0, line.size() - 1));
        std::string kind, id, extra;
        if (!(header >> kind >> id) || header >> extra) throw std::runtime_error("riga " + std::to_string(line_number) + ": intestazione attesa: tipo nome {");
        const std::set<std::string> supported{"circle","ellipse","line","arrow","path","region","label","text","sphere","surface","label3","text3","point"};
        if (!supported.count(kind)) throw std::runtime_error("riga " + std::to_string(line_number) + ": tipo di oggetto non disponibile: " + kind);
        std::map<std::string, SourceLine> properties;
        bool closed = false;
        while (++cursor < lines.size()) {
            raw = lines[cursor].text;
            line_number = lines[cursor].number;
            auto property = trim(without_comment(raw));
            if (property.empty()) continue;
            if (property == "}") { closed = true; break; }
            auto colon = property.find(':');
            if (colon == std::string::npos) throw std::runtime_error("riga " + std::to_string(line_number) + ": proprieta' attesa: nome: valore");
            auto key = trim(property.substr(0, colon)), value = trim(property.substr(colon + 1));
            if (key.empty() || value.empty() || properties.count(key)) throw std::runtime_error("riga " + std::to_string(line_number) + ": proprieta' vuota o duplicata");
            properties.emplace(key, SourceLine{value, line_number});
        }
        if (!closed) throw std::runtime_error("riga " + std::to_string(header_line) + ": blocco non chiuso");
        auto value = [&](const std::string& key, const std::string& fallback) {
            auto p = properties.find(key); return p == properties.end() ? fallback : p->second.text;
        };
        auto emit = [&](const std::string& command, const std::string& property = "") {
            auto p = properties.find(property);
            result.push_back({command, p == properties.end() ? header_line : p->second.number});
        };
        std::set<std::string> allowed;
        if(kind=="point"){
            allowed={"at"};emit("point "+id+" "+coordinates(value("at","0 0")),"at");
        }else if (kind == "circle") {
            allowed = {"center","radius","stroke","tangent-to","direction"};
            if(properties.count("tangent-to")){
                if(properties.count("center"))throw std::runtime_error("riga "+std::to_string(header_line)+": center e tangent-to incompatibili");
                emit("tangent-circle "+id+" "+value("tangent-to","")+" "+value("direction","east")+" "+value("radius","1"),"tangent-to");
            }else{
                if(properties.count("direction"))throw std::runtime_error("riga "+std::to_string(header_line)+": direction richiede tangent-to");
                emit("circle " + id + " " + coordinates(value("center", "0 0")) + " " + value("radius", "1"));
            }
        } else if (kind == "ellipse") {
            allowed = {"center","radii","stroke"};
            emit("ellipse " + id + " " + coordinates(value("center", "0 0")) + " " + coordinates(value("radii", "1 0.5")));
        } else if (kind == "sphere") {
            allowed = {"center","radius","color","fill","detail","shading"};
            emit("sphere " + id + " " + coordinates(value("center", "0 0 0")) + " " + value("radius", "1"));
        } else if (kind == "line" || kind == "arrow") {
            allowed = {"from","to","path","route","stroke","markers","controls","through","parallel-to","perpendicular-to","length","clip"};
            bool parallel=properties.count("parallel-to"),perpendicular=properties.count("perpendicular-to");
            if(parallel||perpendicular){
                if(parallel&&perpendicular)throw std::runtime_error("riga "+std::to_string(header_line)+": parallel-to e perpendicular-to incompatibili");
                if(!properties.count("through")||properties.count("from")||properties.count("to"))throw std::runtime_error("riga "+std::to_string(header_line)+": vincolo richiede through, senza from/to");
                auto relation=parallel?"parallel":"perpendicular";
                emit(std::string(relation)+(kind=="arrow"?"-arrow":"")+" "+id+" "+coordinates(value("through",""))+" "+value(std::string(relation)+"-to","")+" "+value("length","2"),std::string(relation)+"-to");
            }else{
                if(properties.count("through")||properties.count("length"))throw std::runtime_error("riga "+std::to_string(header_line)+": through/length richiedono parallel-to o perpendicular-to");
                emit(kind + " " + id + " " + coordinates(value("from", "-0.5 0")) + " " + coordinates(value("to", "0.5 0")));
            }
        } else if (kind == "region") {
            allowed = {"points","color","fill","opacity","stroke","outline"};
            if(!properties.count("points"))throw std::runtime_error("riga "+std::to_string(header_line)+": region richiede points");
            emit("region "+id+" "+value("points",""),"points");
        } else if (kind == "path") {
            allowed = {"points","route","stroke","markers","controls","clip"};
            emit("path " + id + " " + value("points", "\"-0.5 0;0.5 0\""), "points");
        } else if (kind == "surface") {
            allowed = {"xrange","yrange","mesh","formula","color","fill"};
            emit("surface " + id + " " + coordinates(value("xrange", "-3 3")) + " " + coordinates(value("yrange", "-3 3")) + " " + value("mesh", "16") + " " + value("formula", "\"0\""), "formula");
        } else {
            allowed = {"at","text"};
            if(kind=="label"||kind=="text")allowed.insert({"placement","prefer","gap"});
            emit(kind + " " + id + " " + coordinates(value("at", kind == "label3" || kind == "text3" ? "0 0 0" : "0 0")) + " " + value("text", "\"\""), "text");
        }
        allowed.insert("offset");
        if(kind=="circle"||kind=="ellipse"||kind=="line"||kind=="arrow"||kind=="path")allowed.insert("color");
        if (kind != "label" && kind != "text" && kind != "label3" && kind != "text3" && kind!="point") allowed.insert("stroke-width");
        for (const auto& p : properties) if (!allowed.count(p.first))
            throw std::runtime_error("riga " + std::to_string(p.second.number) + ": proprieta' sconosciuta per " + kind + ": " + p.first);
        if(properties.count("prefer")||properties.count("gap")){
            if(value("placement","fixed")!="auto")throw std::runtime_error("riga "+std::to_string(header_line)+": prefer/gap richiedono placement: auto");
        }
        if(properties.count("placement"))emit("placement "+id+" "+value("placement","fixed")+" "+value("prefer","n")+" "+value("gap","3"),"placement");
        if (properties.count("route") && properties.count("path")) throw std::runtime_error("riga " + std::to_string(header_line) + ": scegli una sola proprieta' tra route e path");
        const std::string route_key = properties.count("route") ? "route" : "path";
        if (properties.count(route_key)) {
            auto route = properties.at(route_key).text;
            if (route == "straight") emit("bend " + id + " 0", route_key);
            else if (!call_contents(route, "arc").empty()) emit("bend " + id + " " + call_contents(route, "arc"), route_key);
            else if (!call_contents(route, "wave").empty()) emit("wave " + id + " " + call_contents(route, "wave"), route_key);
            else throw std::runtime_error("riga " + std::to_string(properties.at(route_key).number) + ": percorso atteso: straight, arc(altezza), wave(ampiezza,oscillazioni)");
        }
        for (const auto& key : {"stroke","stroke-width","markers","controls","color","fill","opacity","outline","detail","shading","offset","clip"}) if (properties.count(key)) {
            std::string property = properties.at(key).text;
            if (std::string(key) == "markers") {
                auto bracket = property.find('(');
                if (bracket != std::string::npos && property.back() == ')') property = property.substr(0, bracket) + " " + coordinates(property.substr(bracket + 1, property.size() - bracket - 2));
            }
            if (std::string(key) == "color" || std::string(key) == "offset") property = coordinates(property);
            std::string operation = key;
            if (operation == "controls") operation = "curve";
            if (operation == "stroke-width") operation = "linewidth";
            if (operation == "offset") operation = kind == "sphere" || kind == "surface" || kind == "label3" || kind == "text3" ? "move3" : "move";
            emit(operation + " " + id + " " + property, key);
        }
    }
    if (input.bad()) throw std::runtime_error("errore durante la lettura del sorgente");
    return result;
}
}
```

</details>

## src/pyxis.cpp

Prima parte: helper di estrazione, escape, penne, punti, lookup e testo letterale. resolve_anchors contiene una visita ricorsiva e il calcolo degli ancoraggi. parse è il dispatcher dei 50 comandi diretti del nucleo; use/profile vengono risolti prima. Alla fine esegue layout, ancoraggi, clipping e controlli sui poligoni. Seconda parte: helper per percorsi, nodi, marcatori e griglia; asymptote emette scene 3D oppure 2D, prepara gli ostacoli e inserisce le librerie geometriche. Per studiare un ramo del dispatcher, confrontalo con la scheda del comando e segui i campi dell’Object che quel ramo modifica.

<details>
<summary>Codice reale completo: src/pyxis.cpp</summary>

```cpp
#include "pyxis.hpp"
#include "expression.hpp"
#include "syntax.hpp"
#include "layout.hpp"
#include "constraints.hpp"
#include "asymptote_geometry.hpp"
#include "asymptote_labels.hpp"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <iomanip>
#include <locale>
#include <sstream>
#include <stdexcept>
#include <functional>

namespace pyxis {
namespace {
double number(std::istringstream& in) {
    double value;
    if (!(in >> value) || !std::isfinite(value))
        throw std::runtime_error("numero finito atteso");
    return value;
}
std::string name(std::istringstream& in) {
    std::string value;
    in >> value;
    if (value.empty() || !(std::isalpha(static_cast<unsigned char>(value[0])) || value[0] == '_') ||
        !std::all_of(value.begin(), value.end(), [](unsigned char c) { return std::isalnum(c) || c == '_' || c == '.'; }) ||
        value.back() == '.' || value.find("..") != std::string::npos)
        throw std::runtime_error("nome atteso: lettere, cifre e underscore; prima lettera non numerica");
    return value;
}
std::string quoted(std::istringstream& in) {
    in >> std::ws;
    if (in.get() != '"') throw std::runtime_error("etichetta tra virgolette attesa");
    std::string result;
    char c;
    while (in.get(c)) {
        if (c == '"') return result;
        // LaTeX backslashes are preserved literally. Escaped quotes are not yet supported.
        result += c;
    }
    throw std::runtime_error("virgolette dell'etichetta non chiuse");
}
std::string escape(const std::string& text) {
    std::string out;
    for (char c : text) {
        if (c == '\\' || c == '\'') out += '\\';
        out += c;
    }
    return out;
}
void positive(double value) {
    if (value <= 0) throw std::runtime_error("dimensione strettamente positiva attesa");
}
std::string ink(const Scene& scene) {
    return scene.theme=="blackboard"?"white":scene.theme=="modern-vector"?"rgb(0.18,0.23,0.29)":"black";
}
std::string paper(const Scene& scene) {
    return scene.theme=="blackboard"?"rgb(0.07,0.12,0.12)":"white";
}
void point(std::istringstream& in, double& x, double& y, std::string& anchor) {
    std::string token;
    if (!(in >> token)) throw std::runtime_error("punto atteso");
    if (token[0] == '@' || (token.find('.') != std::string::npos && (std::isalpha(static_cast<unsigned char>(token[0])) || token[0] == '_'))) {
        anchor = token;
        return;
    }
    std::istringstream coordinate(token); coordinate.imbue(std::locale::classic());
    x = number(coordinate);
    if (coordinate.peek() != std::char_traits<char>::eof()) throw std::runtime_error("coordinata non valida");
    y = number(in);
}
std::vector<double> remaining_numbers(std::istringstream& in) {
    std::vector<double> result;
    for (;;) {
        in >> std::ws;
        if (in.peek() == '#' || in.peek() == std::char_traits<char>::eof()) return result;
        result.push_back(number(in));
        if (result.size() > 4) throw std::runtime_error("troppi parametri geometrici");
    }
}
Object& object_named(Scene& scene, const std::string& id) {
    auto it = std::find_if(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return o.name == id; });
    if (it == scene.objects.end()) throw std::runtime_error("oggetto sconosciuto: " + id);
    return *it;
}
bool is_path(const Object& object) {
    return object.kind == Kind::Line || object.kind == Kind::Arrow || object.kind == Kind::Path || object.kind == Kind::Plot;
}
std::string plain_text(const std::string& input) {
    std::string result;
    for (char c : input) {
        if (c == '\\') result += "\\textbackslash{}";
        else if (c == '^') result += "\\textasciicircum{}";
        else if (c == '~') result += "\\textasciitilde{}";
        else {
            if (c == '#' || c == '$' || c == '%' || c == '&' || c == '_' || c == '{' || c == '}') result += '\\';
            result += c;
        }
    }
    return result;
}
void resolve_anchors(Scene& scene) {
    std::vector<int> state(scene.objects.size());
    std::function<void(size_t)> resolve;
    auto anchor_point = [&](const std::string& reference) -> std::pair<double, double> {
        if (reference[0] == '@') {
            if (reference.size() != 3 || reference[1] < 'A' || reference[1] > 'G' || reference[2] < '1' || reference[2] > '7')
                throw std::runtime_error("punto della griglia atteso: @A1 ... @G7");
            return {(reference[1] - 'D') * scene.grid_step, ('4' - reference[2]) * scene.grid_step};
        }
        auto dot = reference.rfind('.');
        auto id = reference.substr(0, dot), anchor = reference.substr(dot + 1);
        auto it = std::find_if(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return o.name == id; });
        if (it == scene.objects.end()) throw std::runtime_error("oggetto dell'ancoraggio sconosciuto: " + id);
        resolve(static_cast<size_t>(it - scene.objects.begin()));
        if(it->automatic_label)throw std::runtime_error("un'etichetta automatica non definisce ancoraggi geometrici: "+reference+"; usa il nodo a cui e' associata");
        double x = it->x, y = it->y;
        if (it->kind == Kind::Path || it->kind == Kind::Plot) {
            if (anchor == "start") return it->points.front();
            if (anchor == "end") return it->points.back();
            if (anchor.size() > 4 && anchor.substr(0, 4) == "node") {
                std::istringstream index_input(anchor.substr(4));
                double index = number(index_input);
                if (index_input.peek() == std::char_traits<char>::eof() && index >= 1 && index <= it->points.size() && std::floor(index) == index)
                    return it->points[static_cast<size_t>(index) - 1];
            }
            throw std::runtime_error("ancoraggio del percorso atteso: start, end o node1, node2, ...");
        }
        if (it->kind == Kind::Line || it->kind == Kind::Arrow) {
            if (anchor == "start") return {x, y};
            if (anchor == "end") return {it->a, it->b};
            if (anchor == "center") return {x * 0.5 + it->a * 0.5, y * 0.5 + it->b * 0.5};
        } else if (it->kind == Kind::Circle || it->kind == Kind::Ellipse) {
            double ry = it->kind == Kind::Circle ? it->a : it->b;
            if (anchor == "north") return {x, y + ry};
            if (anchor == "south") return {x, y - ry};
            if (anchor == "east") return {x + it->a, y};
            if (anchor == "west") return {x - it->a, y};
            if (anchor == "center") return {x, y};
        } else if (it->kind == Kind::GateBox) {
            if (anchor == "center") return {x,y};
            if (anchor == "north") return {x,y+it->b/2};
            if (anchor == "south") return {x,y-it->b/2};
            if (anchor == "east") return {x+it->a/2,y};
            if (anchor == "west") return {x-it->a/2,y};
        } else if ((it->kind == Kind::Label || it->kind == Kind::Text || it->kind==Kind::Point) && anchor == "center") return {x, y};
        throw std::runtime_error("ancoraggio non disponibile: " + reference);
    };
    resolve = [&](size_t index) {
        if (state[index] == 2) return;
        if (state[index] == 1) throw std::runtime_error("dipendenza ciclica negli ancoraggi o vincoli: "+scene.objects[index].name);
        state[index] = 1;
        auto& object = scene.objects[index];
        if (!object.start_anchor.empty()) { auto p = anchor_point(object.start_anchor); object.x += p.first; object.y += p.second; }
        if (!object.end_anchor.empty()) { auto p = anchor_point(object.end_anchor); object.a += p.first; object.b += p.second; }
        resolve_constraint(scene,object,resolve);
        for (size_t i = 0; i < object.point_anchors.size(); ++i) {
            if (!object.point_anchors[i].empty()) {
                auto p = anchor_point(object.point_anchors[i]);
                object.points[i].first += p.first; object.points[i].second += p.second;
            }
        }
        for (const auto& p : object.points)
            if (!std::isfinite(p.first) || !std::isfinite(p.second)) throw std::runtime_error("overflow nel percorso");
        if (!std::isfinite(object.x) || !std::isfinite(object.y) || !std::isfinite(object.a) || !std::isfinite(object.b))
            throw std::runtime_error("overflow durante la risoluzione degli ancoraggi");
        state[index] = 2;
    };
    for (size_t i = 0; i < scene.objects.size(); ++i) resolve(i);
}
}

Scene parse(std::istream& source) {
    Scene scene;
    std::unordered_map<std::string, double> variables;
    std::unordered_map<std::string, std::string> functions;
    size_t line_number = 0;
    for (const auto& source_line : normalize(source)) {
        line_number = source_line.number;
        std::istringstream in(source_line.text);
        in.imbue(std::locale::classic());
        std::string command;
        in >> command;
        if (command.empty() || command[0] == '#') continue;
        try {
            if (command == "_use") {
                auto package = name(in);
                scene.packages.push_back(package);
            } else if (command == "_group") {
                Group g; g.name=name(in);g.left=number(in);g.bottom=number(in);g.right=number(in);g.top=number(in);
                if(g.left>=g.right||g.bottom>=g.top)throw std::runtime_error("limiti del gruppo non validi");
                for(;;){in>>std::ws;if(in.peek()==std::char_traits<char>::eof())break;g.members.push_back(name(in));}
                scene.groups.push_back(std::move(g));
            } else if (command == "place") {
                Placement p; p.line=line_number;p.object=name(in);in>>p.relation;p.reference=name(in);
                if(p.relation!="above"&&p.relation!="below"&&p.relation!="right-of"&&p.relation!="left-of")throw std::runtime_error("place: above, below, right-of, left-of");
                in>>std::ws;if(in.peek()!=std::char_traits<char>::eof()&&in.peek()!='#'){
                    std::string token;in>>token;if(token.rfind("gap=",0)!=0)throw std::runtime_error("place: opzione gap=numero attesa");
                    std::istringstream gap(token.substr(4));gap.imbue(std::locale::classic());p.gap=number(gap);
                    if(gap.peek()!=std::char_traits<char>::eof()||p.gap<0||p.gap>1000)throw std::runtime_error("gap tra 0 e 1000");
                }
                scene.placements.push_back(p);
            } else if(command=="placement") {
                auto& o=object_named(scene,name(in));
                if(o.kind!=Kind::Label&&o.kind!=Kind::Text)throw std::runtime_error("placement richiede label o text 2D");
                std::string mode;in>>mode;if(mode!="auto"&&mode!="fixed")throw std::runtime_error("placement: auto, fixed");
                o.automatic_label=mode=="auto";
                if(o.automatic_label&&o.text.empty())throw std::runtime_error("un'etichetta automatica deve avere testo");
                in>>std::ws;if(in.peek()!='#'&&!in.eof())in>>o.label_preference;
                const std::vector<std::string> directions{"n","ne","e","se","s","sw","w","nw"};
                if(std::find(directions.begin(),directions.end(),o.label_preference)==directions.end())throw std::runtime_error("prefer: n, ne, e, se, s, sw, w, nw");
                in>>std::ws;if(in.peek()!='#'&&!in.eof())o.label_gap_bp=number(in);
                if(o.label_gap_bp<0||o.label_gap_bp>100)throw std::runtime_error("gap delle etichette tra 0 e 100 bp");
            } else if(command=="flow"||command=="nodefill"||command=="background"||command=="clip") {
                auto& o=object_named(scene,name(in));
                if(command=="flow"){
                    if(!is_path(o))throw std::runtime_error("flow richiede un percorso");
                    in>>o.flow;if(o.flow!="none"&&o.flow!="forward"&&o.flow!="reverse")throw std::runtime_error("flow: none, forward, reverse");
                }else if(command=="nodefill"){
                    if(o.kind!=Kind::Circle)throw std::runtime_error("nodefill richiede un cerchio");
                    in>>o.node_fill;if(o.node_fill!="black"&&o.node_fill!="white"&&o.node_fill!="none")throw std::runtime_error("nodefill: black, white, none");
                }else if(command=="clip"){
                    std::string mode;in>>mode;if(mode!="nodes"&&mode!="off")throw std::runtime_error("clip: nodes, off");
                    if(o.kind!=Kind::Line&&o.kind!=Kind::Arrow&&o.kind!=Kind::Path)throw std::runtime_error("clip richiede line, arrow o path");
                    o.clip_nodes=mode=="nodes";
                }else o.background=true;
            } else if (command == "theme") {
                in >> scene.theme;
                if(scene.theme=="overleaf-classic")scene.theme="paper";
                if (scene.theme != "paper" && scene.theme != "wire" && scene.theme != "color" && scene.theme != "blackboard" && scene.theme != "modern-vector") throw std::runtime_error("tema atteso: paper, wire, color, blackboard, modern-vector, overleaf-classic");
            } else if (command == "linewidth" || command == "shading") {
                auto& object = object_named(scene, name(in));
                double value = number(in);
                if (command == "linewidth") {
                    if (object.kind == Kind::Label || object.kind == Kind::Text || object.kind == Kind::Label3 || object.kind == Kind::Text3) throw std::runtime_error("linewidth richiede una figura o percorso");
                    if (value <= 0 || value > 20) throw std::runtime_error("linewidth richiede un valore tra 0 e 20 bp, escluso 0");
                    object.stroke_width = value;
                } else {
                    if (object.kind != Kind::Sphere || value < 0 || value > 0.8) throw std::runtime_error("shading: sfera e valore tra 0 e 0.8 richiesti");
                    object.shading = value;
                }
            } else if(command=="outline") {
                auto& object=object_named(scene,name(in));if(!object.region)throw std::runtime_error("outline richiede region");
                std::string value;in>>value;if(value!="on"&&value!="off")throw std::runtime_error("outline: on, off");object.outline=value=="on";
            } else if(command=="opacity") {
                auto& object=object_named(scene,name(in));
                if(!object.region)throw std::runtime_error("opacity richiede una region");
                object.opacity=number(in);if(object.opacity<0||object.opacity>1)throw std::runtime_error("opacity tra 0 e 1");
            } else if (command == "fill" || command == "detail") {
                auto& object = object_named(scene, name(in));
                if (object.kind != Kind::Sphere && object.kind != Kind::Surface && object.kind != Kind::Mesh3 && !object.region) throw std::runtime_error("fill richiede sfera, superficie o region");
                std::string value; in >> value;
                if (command == "fill") {
                    if (value != "auto" && value != "none" && value != "white" && value != "color") throw std::runtime_error("fill: auto, none, white, color");
                    object.fill = value;
                } else {
                    if (object.kind != Kind::Sphere || (value != "minimal" && value != "outline" && value != "mesh")) throw std::runtime_error("detail: minimal, outline, mesh, soltanto per le sfere");
                    object.detail = value;
                }
            } else if (command == "camera") {
                scene.camera_x = number(in); scene.camera_y = number(in); scene.camera_z = number(in);
                if (scene.camera_x == 0 && scene.camera_y == 0 && scene.camera_z == 0) throw std::runtime_error("camera: direzione non nulla richiesta");
            } else if (command == "move3" || command == "color") {
                auto& object = object_named(scene, name(in));
                if (command=="move3"&&object.kind != Kind::Sphere && object.kind != Kind::Surface && object.kind != Kind::Label3 && object.kind != Kind::Text3 && object.kind != Kind::Path3 && object.kind != Kind::Arrow3 && object.kind != Kind::Mesh3)
                    throw std::runtime_error("comando 3D su oggetto 2D");
                double a = number(in), b = number(in), c = number(in);
                if (command == "color") {
                    if (object.kind == Kind::Label3 || object.kind == Kind::Text3 || object.kind==Kind::Label || object.kind==Kind::Text || object.kind==Kind::Point) throw std::runtime_error("color richiede una figura o un percorso");
                    if (a < 0 || a > 1 || b < 0 || b > 1 || c < 0 || c > 1) throw std::runtime_error("color richiede tre componenti tra 0 e 1");
                    object.red = a; object.green = b; object.blue = c;
                    object.explicit_color=true;
                } else {
                    object.x += a; object.y += b; object.z += c;
                    for(auto& v:object.vertices3){v[0]+=a;v[1]+=b;v[2]+=c;if(!std::isfinite(v[0])||!std::isfinite(v[1])||!std::isfinite(v[2]))throw std::runtime_error("overflow nella traslazione 3D");}
                    if (object.kind == Kind::Surface) { object.a += a; object.b += b; }
                    if (!std::isfinite(object.x) || !std::isfinite(object.y) || !std::isfinite(object.z) || !std::isfinite(object.a) || !std::isfinite(object.b)) throw std::runtime_error("overflow nella traslazione 3D");
                }
            } else if (command == "grid") {
                in >> std::ws;
                if (in.peek() == 'o') {
                    std::string option; in >> option;
                    if (option != "off" && option != "on") throw std::runtime_error("grid richiede on, off o un passo numerico");
                    scene.grid_visible = option == "on";
                } else {
                    scene.grid_step = number(in);
                    if (scene.grid_step < 1e-6 || scene.grid_step > 1e6) throw std::runtime_error("passo della griglia tra 0.000001 e 1000000");
                    scene.grid_visible = true;
                }
            } else if (command == "symbol") {
                auto id = name(in);
                if (id == "none" || id == "circle" || id == "square" || id == "triangle" || id == "diamond" || scene.symbols.count(id))
                    throw std::runtime_error("nome del simbolo gia' utilizzato o riservato");
                auto specification = quoted(in);
                std::istringstream parts(specification);
                std::vector<std::pair<double, double>> vertices;
                std::string part;
                while (std::getline(parts, part, ';')) {
                    std::istringstream coordinates(part); coordinates.imbue(std::locale::classic());
                    double x = number(coordinates), y = number(coordinates);
                    coordinates >> std::ws;
                    if (coordinates.peek() != std::char_traits<char>::eof()) throw std::runtime_error("simbolo: ogni vertice richiede x y");
                    vertices.emplace_back(x, y);
                    if (vertices.size() > 1000) throw std::runtime_error("troppi vertici nel simbolo");
                }
                if (vertices.size() < 3) throw std::runtime_error("simbolo poligonale: almeno tre vertici");
                scene.symbols.emplace(id, std::move(vertices));
            } else if (command == "stroke" || command == "markers" || command == "bend" || command == "curve" || command == "wave") {
                auto& object = object_named(scene, name(in));
                if (command == "stroke") {
                    if (object.kind == Kind::Label || object.kind == Kind::Text || object.kind == Kind::Sphere || object.kind == Kind::Surface || object.kind == Kind::Label3 || object.kind == Kind::Text3) throw std::runtime_error("stroke richiede una figura o un percorso 2D");
                    in >> object.stroke;
                    if (object.stroke != "solid" && object.stroke != "dashed" && object.stroke != "dotted")
                        throw std::runtime_error("tratto atteso: solid, dashed, dotted");
                } else {
                    if (!is_path(object)) throw std::runtime_error("il comando richiede una linea o un percorso");
                    if (command == "markers") {
                        in >> object.marker;
                        if (object.marker != "none" && object.marker != "circle" && object.marker != "square" && object.marker != "triangle" && object.marker != "diamond" && !scene.symbols.count(object.marker))
                            throw std::runtime_error("simbolo sconosciuto: " + object.marker);
                        in >> std::ws;
                        if (in.peek() != '#' && in.peek() != std::char_traits<char>::eof()) {
                            std::string fill; in >> fill;
                            if (fill != "filled" && fill != "hollow") throw std::runtime_error("riempimento atteso: filled o hollow");
                            object.marker_filled = fill == "filled";
                            in >> std::ws;
                            if (in.peek() != '#' && in.peek() != std::char_traits<char>::eof()) { object.marker_size = number(in); positive(object.marker_size); }
                        }
                    } else if (command == "wave") {
                        object.wave_amplitude = number(in);
                        double turns = number(in);
                        if (turns < 1 || turns > 64 || std::floor(turns) != turns) throw std::runtime_error("wave richiede da 1 a 64 oscillazioni intere");
                        object.wave_turns = static_cast<unsigned>(turns);
                        object.bend = 0; object.controls.clear();
                    } else if (command == "bend") {
                        object.bend = number(in);
                        object.wave_turns = 0;
                        object.controls.clear();
                    } else {
                        object.wave_turns = 0;
                        double segment = number(in);
                        size_t count = (object.kind == Kind::Line || object.kind == Kind::Arrow) ? 1 : object.points.size() - 1;
                        if (segment < 1 || segment > count || std::floor(segment) != segment) throw std::runtime_error("indice del segmento non valido (parte da 1)");
                        Controls controls; controls.segment = static_cast<size_t>(segment) - 1;
                        controls.first.first = number(in); controls.first.second = number(in);
                        controls.second.first = number(in); controls.second.second = number(in);
                        auto old = std::find_if(object.controls.begin(), object.controls.end(), [&](const Controls& c) { return c.segment == controls.segment; });
                        if (old == object.controls.end()) object.controls.push_back(controls); else *old = controls;
                    }
                }
            } else if (command == "let" || command == "function") {
                auto id = name(in);
                if (id == "x" || id == "pi" || id == "sin" || id == "cos" || id == "tan" || id == "exp" || id == "log" || id == "sqrt" || id == "abs")
                    throw std::runtime_error("nome matematico riservato: " + id);
                if (variables.count(id) || functions.count(id)) throw std::runtime_error("simbolo matematico gia' definito: " + id);
                auto expr = quoted(in);
                if (command == "let") variables.emplace(id, evaluate(expr, 0, variables, functions));
                else functions.emplace(id, expr);
            } else if (command == "width") {
                scene.width_mm = number(in);
                positive(scene.width_mm);
            } else if (command == "move") {
                auto id = name(in);
                double dx = number(in), dy = number(in);
                auto it = std::find_if(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return o.name == id; });
                if (it == scene.objects.end()) throw std::runtime_error("oggetto sconosciuto: " + id);
                if (it->kind == Kind::Sphere || it->kind == Kind::Surface || it->kind == Kind::Label3 || it->kind == Kind::Text3 || it->kind == Kind::Path3 || it->kind == Kind::Arrow3 || it->kind == Kind::Mesh3)
                    throw std::runtime_error("usa move3 per un oggetto 3D");
                it->x += dx; it->y += dy;
                if (it->kind == Kind::Line || it->kind == Kind::Arrow) { it->a += dx; it->b += dy; }
                for (auto& p : it->points) {
                    p.first += dx; p.second += dy;
                    if (!std::isfinite(p.first) || !std::isfinite(p.second)) throw std::runtime_error("overflow nella curva");
                }
                for (auto& c : it->controls) {
                    c.first.first += dx; c.first.second += dy; c.second.first += dx; c.second.second += dy;
                    if (!std::isfinite(c.first.first) || !std::isfinite(c.first.second) || !std::isfinite(c.second.first) || !std::isfinite(c.second.second)) throw std::runtime_error("overflow nei controlli della curva");
                }
                if (!std::isfinite(it->x) || !std::isfinite(it->y) || !std::isfinite(it->a) || !std::isfinite(it->b))
                    throw std::runtime_error("overflow nella traslazione");
            } else {
                Kind kind;
                if (command == "circle") kind = Kind::Circle;
                else if (command == "ellipse") kind = Kind::Ellipse;
                else if (command == "line") kind = Kind::Line;
                else if (command == "arrow") kind = Kind::Arrow;
                else if (command == "label") kind = Kind::Label;
                else if (command == "text") kind = Kind::Text;
                else if (command == "plot") kind = Kind::Plot;
                else if (command == "path" || command=="region") kind = Kind::Path;
                else if (command == "sphere") kind = Kind::Sphere;
                else if (command == "surface") kind = Kind::Surface;
                else if (command == "label3") kind = Kind::Label3;
                else if (command == "text3") kind = Kind::Text3;
                else if (command == "gatebox") kind = Kind::GateBox;
                else if (command == "path3") kind = Kind::Path3;
                else if (command == "arrow3") kind = Kind::Arrow3;
                else if (command == "mesh3") kind = Kind::Mesh3;
                else if (command == "point") kind = Kind::Point;
                else if (command == "tangent-circle") kind = Kind::Circle;
                else if(command=="parallel"||command=="perpendicular")kind=Kind::Line;
                else if(command=="parallel-arrow"||command=="perpendicular-arrow")kind=Kind::Arrow;
                else throw std::runtime_error("comando sconosciuto: " + command);
                Object object{};
                object.kind = kind; object.name = name(in);
                if (kind == Kind::Surface) object.stroke_width = 0.25;
                if (kind == Kind::Sphere) object.stroke_width = 0.45;
                if (std::any_of(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return o.name == object.name; }))
                    throw std::runtime_error("nome gia' utilizzato: " + object.name);
                if(kind==Kind::Point){
                    in>>std::ws;if(in.peek()!='#'&&!in.eof())point(in,object.x,object.y,object.start_anchor);
                    in>>std::ws;if(in.peek()!='#'&&!in.eof())throw std::runtime_error("argomenti in eccesso");
                    scene.objects.push_back(std::move(object));continue;
                }
                if(command=="tangent-circle"||command=="parallel"||command=="perpendicular"||command=="parallel-arrow"||command=="perpendicular-arrow"){
                    if(command=="tangent-circle"){
                        object.constraint=command;object.constraint_reference=name(in);in>>object.constraint_direction;object.a=number(in);positive(object.a);
                    }else{
                        object.constraint=command.rfind("parallel",0)==0?"parallel":"perpendicular";
                        point(in,object.x,object.y,object.start_anchor);object.constraint_reference=name(in);object.constraint_length=number(in);positive(object.constraint_length);
                    }
                    in>>std::ws;if(in.peek()!='#'&&!in.eof())throw std::runtime_error("argomenti in eccesso");
                    scene.objects.push_back(std::move(object));continue;
                }
                if(kind==Kind::Path3||kind==Kind::Arrow3||kind==Kind::Mesh3){
                    if(kind==Kind::Mesh3){
                        double rows=number(in),columns=number(in);
                        if(rows<2||rows>61||columns<2||columns>61||std::floor(rows)!=rows||std::floor(columns)!=columns)throw std::runtime_error("mesh3: righe e colonne intere tra 2 e 61");
                        object.mesh_rows=static_cast<unsigned>(rows);object.mesh_columns=static_cast<unsigned>(columns);
                    }
                    auto specification=quoted(in);std::istringstream parts(specification);std::string part;
                    while(std::getline(parts,part,';')){
                        std::istringstream vertex(part);vertex.imbue(std::locale::classic());
                        double x=number(vertex),y=number(vertex),z=number(vertex);vertex>>std::ws;
                        if(!vertex.eof())throw std::runtime_error("vertice 3D: tre coordinate richieste");
                        object.vertices3.push_back({x,y,z});if(object.vertices3.size()>10000)throw std::runtime_error("troppi vertici 3D");
                    }
                    if(object.vertices3.size()<2||(kind==Kind::Mesh3&&object.vertices3.size()!=object.mesh_rows*object.mesh_columns))throw std::runtime_error("numero di vertici 3D non valido");
                    in>>std::ws;if(in.peek()!='#'&&!in.eof())throw std::runtime_error("argomenti in eccesso");
                    scene.objects.push_back(std::move(object));continue;
                }
                if (kind == Kind::Sphere) {
                    auto values = remaining_numbers(in);
                    if (values.empty()) object.a = 1;
                    else if (values.size() == 1) object.a = values[0];
                    else if (values.size() == 4) { object.x = values[0]; object.y = values[1]; object.z = values[2]; object.a = values[3]; }
                    else throw std::runtime_error("sphere: nome [raggio] oppure nome x y z raggio");
                    positive(object.a);
                    scene.objects.push_back(object); continue;
                }
                if (kind == Kind::Surface) {
                    object.x = number(in); object.a = number(in); object.y = number(in); object.b = number(in);
                    double mesh = number(in);
                    if (object.x >= object.a || object.y >= object.b || mesh < 2 || mesh > 60 || std::floor(mesh) != mesh)
                        throw std::runtime_error("surface: xmin<xmax, ymin<ymax e mesh intera tra 2 e 60");
                    object.mesh = static_cast<unsigned>(mesh); object.text = quoted(in);
                    auto local_variables = variables;
                    for (unsigned i = 0; i <= object.mesh; ++i) {
                        double t = static_cast<double>(i) / object.mesh;
                        double x = (1 - t) * object.x + t * object.a;
                        for (unsigned j = 0; j <= object.mesh; ++j) {
                            double u = static_cast<double>(j) / object.mesh;
                            local_variables["y"] = (1 - u) * object.y + u * object.b;
                            object.heights.push_back(evaluate(object.text, x, local_variables, functions));
                        }
                    }
                    scene.objects.push_back(object);
                    in >> std::ws;
                    if (in.peek() != '#' && in.peek() != std::char_traits<char>::eof()) throw std::runtime_error("argomenti in eccesso");
                    continue;
                }
                if (kind == Kind::Label3 || kind == Kind::Text3) {
                    in >> std::ws;
                    if (in.peek() != '"') { object.x = number(in); object.y = number(in); object.z = number(in); }
                    object.text = quoted(in);
                    scene.objects.push_back(object);
                    in >> std::ws;
                    if (in.peek() != '#' && in.peek() != std::char_traits<char>::eof()) throw std::runtime_error("argomenti in eccesso");
                    continue;
                }
                if (kind == Kind::Circle || kind == Kind::Ellipse) {
                    in >> std::ws;
                    bool anchored = in.peek() == '@' || std::isalpha(static_cast<unsigned char>(in.peek())) || in.peek() == '_';
                    if (anchored) point(in, object.x, object.y, object.start_anchor);
                    auto values = remaining_numbers(in);
                    if (kind == Kind::Circle) {
                        if (values.empty()) object.a = 1;
                        else if (values.size() == 1) object.a = values[0];
                        else if (!anchored && values.size() == 3) { object.x = values[0]; object.y = values[1]; object.a = values[2]; }
                        else throw std::runtime_error("circle: nome [raggio] oppure nome x y raggio");
                        positive(object.a);
                    } else {
                        if (values.empty()) { object.a = 1; object.b = 0.5; }
                        else if (values.size() == 2) { object.a = values[0]; object.b = values[1]; }
                        else if (!anchored && values.size() == 4) { object.x = values[0]; object.y = values[1]; object.a = values[2]; object.b = values[3]; }
                        else throw std::runtime_error("ellipse: nome [semiasse_x semiasse_y] oppure nome x y semiasse_x semiasse_y");
                        positive(object.a); positive(object.b);
                    }
                    scene.objects.push_back(object);
                    continue;
                }
                if (kind == Kind::Path) {
                    object.region=command=="region";object.background=object.region;
                    in >> std::ws;
                    std::string specification;
                    bool list = in.peek() == '"';
                    if (list) specification = quoted(in);
                    auto read_vertex = [&](std::istringstream& vertex) {
                        double x = 0, y = 0; std::string anchor;
                        point(vertex, x, y, anchor);
                        object.points.emplace_back(x, y); object.point_anchors.push_back(anchor);
                        if (object.points.size() > 10000) throw std::runtime_error("troppi punti nel percorso");
                    };
                    if (list) {
                        std::istringstream parts(specification); std::string part;
                        while (std::getline(parts, part, ';')) {
                            std::istringstream vertex(part); vertex.imbue(std::locale::classic()); read_vertex(vertex);
                            vertex >> std::ws;
                            if (vertex.peek() != std::char_traits<char>::eof()) throw std::runtime_error("punto del percorso non valido");
                        }
                    } else {
                        for (;;) { in >> std::ws; if (in.peek() == '#' || in.peek() == std::char_traits<char>::eof()) break; read_vertex(in); }
                    }
                    if (object.points.size() < 2) throw std::runtime_error("path richiede almeno due punti");
                    if(object.region){
                        if(object.points.size()<3||object.points.size()>512)throw std::runtime_error("region richiede da 3 a 512 vertici");
                        if(object.points.front()!=object.points.back()||object.point_anchors.front()!=object.point_anchors.back()){
                            object.points.push_back(object.points.front());object.point_anchors.push_back(object.point_anchors.front());
                        }
                    }
                    scene.objects.push_back(object);
                    in >> std::ws;
                    if (in.peek() != '#' && in.peek() != std::char_traits<char>::eof()) throw std::runtime_error("argomenti in eccesso");
                    continue;
                }
                in >> std::ws;
                if ((kind == Kind::Line || kind == Kind::Arrow) && (in.peek() == '#' || in.peek() == std::char_traits<char>::eof())) {
                    object.x = -0.5; object.a = 0.5; scene.objects.push_back(object); continue;
                }
                if ((kind == Kind::Label || kind == Kind::Text) && in.peek() == '"') {}
                else if (kind == Kind::Label || kind == Kind::Text || kind == Kind::Line || kind == Kind::Arrow)
                    point(in, object.x, object.y, object.start_anchor);
                else { object.x = number(in); object.y = number(in); }
                if (kind == Kind::Plot) {
                    double count = number(in);
                    if (count < 2 || count > 10000 || std::floor(count) != count || object.x >= object.y)
                        throw std::runtime_error("plot richiede xmin < xmax e da 2 a 10000 campioni interi");
                    object.text = quoted(in);
                    for (int i = 0; i < static_cast<int>(count); ++i) {
                        double fraction = i / (count - 1);
                        double coordinate = (1 - fraction) * object.x + fraction * object.y;
                        if (!std::isfinite(coordinate)) throw std::runtime_error("intervallo non rappresentabile");
                        object.points.emplace_back(coordinate, evaluate(object.text, coordinate, variables, functions));
                    }
                } else if (kind == Kind::Label || kind == Kind::Text) object.text = quoted(in);
                else if (kind == Kind::Line || kind == Kind::Arrow) point(in, object.a, object.b, object.end_anchor);
                else {
                    object.a = number(in);
                    if (kind != Kind::Circle) object.b = number(in);
                    if (kind == Kind::Circle || kind == Kind::Ellipse) positive(object.a);
                    if (kind == Kind::Ellipse) positive(object.b);
                    if (kind == Kind::GateBox) { positive(object.a); positive(object.b); }
                }
                scene.objects.push_back(object);
            }
            in >> std::ws;
            if (in.peek() != std::char_traits<char>::eof() && in.peek() != '#')
                throw std::runtime_error("argomenti in eccesso");
        } catch (const std::exception& e) {
            throw std::runtime_error("riga " + std::to_string(line_number) + ": " + e.what());
        }
    }
    if (source.bad()) throw std::runtime_error("errore nella lettura del sorgente");
    layout(scene);
    resolve_anchors(scene);
    resolve_clipping(scene);
    for(const auto& o:scene.objects)if(o.region){
        if(o.bend!=0||o.wave_turns||!o.controls.empty()||o.flow!="none"||o.clip_nodes)throw std::runtime_error("region usa bordi poligonali senza flow o clipping: "+o.name);
        double area=0;const auto origin=o.points.front();
        for(size_t i=1;i+1<o.points.size();++i)area+=(o.points[i].first-origin.first)*(o.points[i+1].second-origin.second)-(o.points[i].second-origin.second)*(o.points[i+1].first-origin.first);
        if(!std::isfinite(area)||std::abs(area)<1e-14)throw std::runtime_error("region con area nulla o non rappresentabile: "+o.name);
        auto cross=[](const auto& a,const auto& b,const auto& c){return (b.first-a.first)*(c.second-a.second)-(b.second-a.second)*(c.first-a.first);};
        auto between=[](const auto& a,const auto& b,const auto& c){return c.first>=std::min(a.first,b.first)&&c.first<=std::max(a.first,b.first)&&c.second>=std::min(a.second,b.second)&&c.second<=std::max(a.second,b.second);};
        size_t count=o.points.size()-1;
        for(size_t i=0;i<count;++i){
            const auto& a=o.points[i];const auto& b=o.points[i+1];
            if(a==b)throw std::runtime_error("region con vertici consecutivi coincidenti: "+o.name);
            for(size_t j=i+1;j<count;++j){
                if(j==i+1||(i==0&&j+1==count))continue;
                const auto& c=o.points[j];const auto& d=o.points[j+1];
                double abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
                if((((abC>0&&abD<0)||(abC<0&&abD>0))&&((cdA>0&&cdB<0)||(cdA<0&&cdB>0)))||
                   (abC==0&&between(a,b,c))||(abD==0&&between(a,b,d))||(cdA==0&&between(c,d,a))||(cdB==0&&between(c,d,b)))
                    throw std::runtime_error("region con bordi che si intersecano: "+o.name);
            }
        }
    }
    return scene;
}

namespace {
using Point = std::pair<double, double>;
void emit_point(std::ostream& out, Point p) { out << '(' << p.first << ',' << p.second << ')'; }
void emit_boundary(std::ostream& out,const Scene& scene,const std::string& id){
    if(id.empty()){out<<"nullpath";return;}
    auto target=std::find_if(scene.objects.begin(),scene.objects.end(),[&](const Object& o){return o.name==id;});
    if(target==scene.objects.end())throw std::runtime_error("nodo di clipping sconosciuto: "+id);
    const auto& o=*target;
    if(o.kind==Kind::Circle)out<<"circle(("<<o.x<<','<<o.y<<"),"<<o.a<<')';
    else if(o.kind==Kind::Ellipse)out<<"shift(("<<o.x<<','<<o.y<<"))*scale("<<o.a<<','<<o.b<<")*unitcircle";
    else if(o.kind==Kind::GateBox)out<<"box(("<<o.x-o.a/2<<','<<o.y-o.b/2<<"),("<<o.x+o.a/2<<','<<o.y+o.b/2<<"))";
    else throw std::runtime_error("nodo di clipping non disponibile: "+id);
}
std::string label_owner(const Scene& scene,const Object& label){
    if(label.start_anchor.empty()||label.start_anchor.front()=='@')return "";
    const auto id=label.start_anchor.substr(0,label.start_anchor.rfind('.'));
    auto owner=std::find_if(scene.objects.begin(),scene.objects.end(),[&](const Object& o){return o.name==id;});
    if(owner!=scene.objects.end()&&(owner->kind==Kind::Circle||owner->kind==Kind::Ellipse||owner->kind==Kind::GateBox))return id;
    return "";
}
void emit_path(std::ostream& out, const Object& object, const std::vector<Point>& points) {
    if(object.region){
        for(size_t i=0;i+1<points.size();++i){if(i)out<<"--";emit_point(out,points[i]);}
        out<<"--cycle";return;
    }
    if(points.size()>128 && !object.wave_turns && object.controls.empty() && object.bend==0){
        out<<"operator --(...new guide[] {";
        for(size_t i=0;i<points.size();++i){if(i)out<<',';emit_point(out,points[i]);}
        out<<"})";return;
    }
    emit_point(out, points.front());
    for (size_t i = 1; i < points.size(); ++i) {
        if (object.wave_turns) {
            auto p = points[i - 1], q = points[i];
            double dx = q.first - p.first, dy = q.second - p.second;
            double length = std::hypot(dx, dy);
            if (length == 0 || !std::isfinite(length)) throw std::runtime_error("wave richiede segmenti di lunghezza finita e non nulla");
            double nx = -dy / length, ny = dx / length;
            unsigned pieces = object.wave_turns * 16;
            double k = 2 * std::acos(-1.0) * object.wave_turns;
            auto sample = [&](double t) -> Point {
                return {p.first + dx * t + nx * object.wave_amplitude * std::sin(k * t), p.second + dy * t + ny * object.wave_amplitude * std::sin(k * t)};
            };
            auto derivative = [&](double t) -> Point {
                return {dx + nx * object.wave_amplitude * k * std::cos(k * t), dy + ny * object.wave_amplitude * k * std::cos(k * t)};
            };
            for (unsigned j = 0; j < pieces; ++j) {
                double t0 = static_cast<double>(j) / pieces, t1 = static_cast<double>(j + 1) / pieces;
                auto a = sample(t0), b = j + 1 == pieces ? q : sample(t1), d0 = derivative(t0), d1 = derivative(t1);
                double dt = (t1 - t0) / 3;
                Point c1{a.first + dt * d0.first, a.second + dt * d0.second};
                Point c2{b.first - dt * d1.first, b.second - dt * d1.second};
                if (!std::isfinite(c1.first) || !std::isfinite(c1.second) || !std::isfinite(c2.first) || !std::isfinite(c2.second) || !std::isfinite(b.first) || !std::isfinite(b.second)) throw std::runtime_error("serpentina non rappresentabile");
                out << "..controls "; emit_point(out, c1); out << " and "; emit_point(out, c2); out << ".."; emit_point(out, b);
            }
            continue;
        }
        auto control = std::find_if(object.controls.begin(), object.controls.end(), [&](const Controls& c) { return c.segment == i - 1; });
        if (control != object.controls.end() || object.bend != 0) {
            Point c1, c2;
            if (control != object.controls.end()) { c1 = control->first; c2 = control->second; }
            else {
                auto p = points[i - 1], q = points[i];
                double dx = q.first - p.first, dy = q.second - p.second;
                double length = std::hypot(dx, dy);
                if (length == 0 || !std::isfinite(length)) throw std::runtime_error("bend richiede segmenti di lunghezza finita e non nulla");
                double nx = -dy / length, ny = dx / length;
                double h = (4.0 / 3.0) * object.bend;
                c1 = {p.first + dx / 3 + nx * h, p.second + dy / 3 + ny * h};
                c2 = {p.first + 2 * dx / 3 + nx * h, p.second + 2 * dy / 3 + ny * h};
            }
            if (!std::isfinite(c1.first) || !std::isfinite(c1.second) || !std::isfinite(c2.first) || !std::isfinite(c2.second))
                throw std::runtime_error("controlli della curva non rappresentabili");
            out << "..controls "; emit_point(out, c1); out << " and "; emit_point(out, c2); out << "..";
        } else out << "--";
        emit_point(out, points[i]);
    }
}
void emit_marker(std::ostream& out, const Scene& scene, const Object& object, Point position) {
    if (object.marker == "none") return;
    out << "filldraw(";
    if (object.marker == "circle") {
        out << "circle("; emit_point(out, position); out << ',' << object.marker_size << ')';
    } else {
        std::vector<Point> shape;
        if (object.marker == "triangle") shape = {{0,1},{-1,-1},{1,-1}};
        else if (object.marker == "square") shape = {{-1,-1},{1,-1},{1,1},{-1,1}};
        else if (object.marker == "diamond") shape = {{0,1},{1,0},{0,-1},{-1,0}};
        else shape = scene.symbols.at(object.marker);
        for (size_t i = 0; i < shape.size(); ++i) {
            Point vertex{position.first + shape[i].first * object.marker_size, position.second + shape[i].second * object.marker_size};
            if (!std::isfinite(vertex.first) || !std::isfinite(vertex.second)) throw std::runtime_error("simbolo non rappresentabile");
            if (i) out << "--";
            emit_point(out, vertex);
        }
        out << "--cycle";
    }
    out << ',' << (object.marker_filled ? ink(scene) : paper(scene)) << ',' << ink(scene) << "+linewidth(0.5bp));\n";
}
// Small stroke glyphs keep grid labels independent of the broken local TeX pipe.
void emit_grid(std::ostream& out, const Scene& scene) {
    out << "// Pyxis preview-only navigation grid\n";
    const double step = scene.grid_step;
    auto stroke = [&](const std::vector<Point>& vertices, Point origin, double scale) {
        out << "draw(";
        for (size_t i = 0; i < vertices.size(); ++i) {
            if (i) out << "--";
            emit_point(out, {origin.first + vertices[i].first * scale, origin.second + vertices[i].second * scale});
        }
        out << ",gray(0.65)+linewidth(0.3bp));\n";
    };
    const std::vector<std::vector<Point>> letters{
        {{0,0},{0.5,1},{1,0},{0.75,0.5},{0.25,0.5}},
        {{0,0},{0,1},{0.7,1},{1,0.75},{0.7,0.5},{0,0.5},{0.7,0.5},{1,0.25},{0.7,0},{0,0}},
        {{1,1},{0,1},{0,0},{1,0}},
        {{0,0},{0,1},{0.7,1},{1,0.7},{1,0.3},{0.7,0},{0,0}},
        {{1,1},{0,1},{0,0},{1,0},{0,0},{0,0.5},{0.8,0.5}},
        {{0,0},{0,1},{1,1},{0,1},{0,0.5},{0.8,0.5}},
        {{1,1},{0,1},{0,0},{1,0},{1,0.5},{0.5,0.5}}
    };
    const int masks[]{0,6,91,79,102,109,125,7};
    const std::vector<std::vector<Point>> segments{
        {{0,1},{1,1}},{{1,1},{1,0.5}},{{1,0.5},{1,0}},{{1,0},{0,0}},
        {{0,0},{0,0.5}},{{0,0.5},{0,1}},{{0,0.5},{1,0.5}}
    };
    for (int i = -3; i <= 3; ++i) {
        out << "draw((" << i * step << ',' << -3 * step << ")--(" << i * step << ',' << 3 * step << "),gray(0.9)+linewidth(0.25bp));\n";
        out << "draw((" << -3 * step << ',' << i * step << ")--(" << 3 * step << ',' << i * step << "),gray(0.9)+linewidth(0.25bp));\n";
        stroke(letters[static_cast<size_t>(i + 3)], {i * step - 0.05 * step, 3.2 * step}, 0.1 * step);
        int row = i + 4;
        for (int bit = 0; bit < 7; ++bit) if (masks[row] & (1 << bit))
            stroke(segments[static_cast<size_t>(bit)], {-3.3 * step, -i * step - 0.05 * step}, 0.1 * step);
    }
}
}

std::string asymptote(const Scene& scene, bool preview) {
    std::ostringstream out;
    out.imbue(std::locale::classic());
    out << std::setprecision(17);
    auto is3d = [](Kind kind) { return kind == Kind::Sphere || kind == Kind::Surface || kind == Kind::Label3 || kind == Kind::Text3 || kind == Kind::Path3 || kind == Kind::Arrow3 || kind == Kind::Mesh3; };
    bool three = std::any_of(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return is3d(o.kind); });
    if (three) {
        if (std::any_of(scene.objects.begin(), scene.objects.end(), [&](const Object& o) { return !is3d(o.kind); }))
            throw std::runtime_error("la combinazione di oggetti 2D e 3D nella stessa scena non e' ancora supportata");
        double norm = std::max({std::abs(scene.camera_x), std::abs(scene.camera_y), std::abs(scene.camera_z)});
        out << "// Generated by Pyxis: vector 3D projection\nimport graph3;\nsettings.render=0;\nsettings.prc=false;\nsettings.axes3=false;\nsize(" << scene.width_mm << "mm,0);\ndefaultpen(" << ink(scene) << "+linewidth(0.5bp));\n";
        out << "currentprojection=orthographic((" << scene.camera_x / norm << ',' << scene.camera_y / norm << ',' << scene.camera_z / norm << "),up=" << ((scene.camera_x == 0 && scene.camera_y == 0) ? "Y" : "Z") << ",showtarget=false,center=false);\n";
        size_t serial=0;
        for (const auto& object : scene.objects) {
            const auto symbol=std::to_string(serial++);
            out << "// " << object.name << '\n';
            std::string fill = object.fill == "auto" ? (scene.theme == "wire" ? "none" : scene.theme == "color" ? "color" : "white") : object.fill;
            std::ostringstream material;
            material.imbue(std::locale::classic()); material << std::setprecision(17);
            if (fill == "none") material << "nullpen";
            else if (fill == "white") material << "white";
            else material << "rgb(" << object.red << ',' << object.green << ',' << object.blue << ')';
            if (object.kind == Kind::Sphere) {
                out << "triple pyxis_c_" << symbol << "=(" << object.x << ',' << object.y << ',' << object.z << ");\n";
                if (fill != "none") {
                    std::string shaded = material.str(), light = "nolight";
                    if (object.detail == "minimal" && object.shading > 0) {
                        if (fill == "white") {
                            std::ostringstream sphere_material; sphere_material.imbue(std::locale::classic());
                            sphere_material << std::setprecision(17) << "material(gray(" << object.shading << "),gray(" << 0.98 - object.shading << "),black)";
                            shaded = sphere_material.str(); light = "Viewport";
                        } else light = "Headlamp";
                    }
                    out << "draw(shift(pyxis_c_" << symbol << ")*scale3(" << object.a << ")*unitsphere," << shaded << ",meshpen=" << (object.detail == "mesh" ? "black+linewidth(" + std::to_string(object.stroke_width) + "bp)" : "nullpen") << ",light=" << light << ");\n";
                }
                out << "draw(Circle(pyxis_c_" << symbol << ',' << object.a * 1.00001 << ",normal=(" << scene.camera_x / norm << ',' << scene.camera_y / norm << ',' << scene.camera_z / norm << "))," << ink(scene) << "+linewidth(" << object.stroke_width << "bp));\n";
                if (fill == "none" && object.detail == "mesh") {
                    for (unsigned meridian = 0; meridian < 8; ++meridian) {
                        double angle = std::acos(-1.0) * meridian / 8;
                        out << "draw(Circle(pyxis_c_" << symbol << ',' << object.a << ",normal=(" << std::cos(angle) << ',' << std::sin(angle) << ",0)),black+linewidth(0.3bp));\n";
                    }
                }
            } else if (object.kind == Kind::Surface) {
                if (fill == "none") {
                    auto vertex = [&](unsigned i, unsigned j) {
                        double u = static_cast<double>(i) / object.mesh, v = static_cast<double>(j) / object.mesh;
                        double z = object.heights[i * (object.mesh + 1) + j] + object.z;
                        if (!std::isfinite(z)) throw std::runtime_error("superficie traslata non rappresentabile");
                        out << '(' << (1 - u) * object.x + u * object.a << ',' << (1 - v) * object.y + v * object.b << ',' << z << ')';
                    };
                    for (unsigned i = 0; i <= object.mesh; ++i) {
                        out << "draw(";
                        for (unsigned j = 0; j <= object.mesh; ++j) { if (j) out << ".."; vertex(i,j); }
                        out << ",black+linewidth(" << object.stroke_width << "bp));\n";
                        out << "draw(";
                        for (unsigned j = 0; j <= object.mesh; ++j) { if (j) out << ".."; vertex(j,i); }
                        out << ",black+linewidth(" << object.stroke_width << "bp));\n";
                    }
                    continue;
                }
                out << "real[][] pyxis_heights_" << symbol << "={";
                for (unsigned i = 0; i <= object.mesh; ++i) {
                    if (i) out << ',';
                    out << '{';
                    for (unsigned j = 0; j <= object.mesh; ++j) {
                        if (j) out << ',';
                        double height = object.heights[i * (object.mesh + 1) + j] + object.z;
                        if (!std::isfinite(height)) throw std::runtime_error("superficie traslata non rappresentabile");
                        out << height;
                    }
                    out << '}';
                }
                out << "};\ndraw(surface(pyxis_heights_" << symbol << ",(" << object.x << ',' << object.y << "),(" << object.a << ',' << object.b << "))," << material.str() << ",meshpen=black+linewidth(" << object.stroke_width << "bp),light=nolight);\n";
            } else if(object.kind==Kind::Path3||object.kind==Kind::Arrow3){
                out<<"guide3[] pyxis_path_"<<symbol<<"={";
                for(size_t i=0;i<object.vertices3.size();++i){if(i)out<<',';auto v=object.vertices3[i];out<<'('<<v[0]<<','<<v[1]<<','<<v[2]<<')';}
                out<<"};\ndraw(operator --(...pyxis_path_"<<symbol<<')';
                if(object.red==0&&object.green==0&&object.blue==0)out<<','<<ink(scene);
                else out<<",rgb("<<object.red<<','<<object.green<<','<<object.blue<<')';
                out<<"+linewidth("<<object.stroke_width<<"bp)"<<(object.stroke=="solid"?"":"+"+object.stroke)<<(object.kind==Kind::Arrow3?",Arrow3":"")<<");\n";
            } else if(object.kind==Kind::Mesh3){
                out<<"triple[][] pyxis_mesh_"<<symbol<<"={";
                for(unsigned r=0;r<object.mesh_rows;++r){if(r)out<<',';out<<'{';for(unsigned c=0;c<object.mesh_columns;++c){if(c)out<<',';auto v=object.vertices3[r*object.mesh_columns+c];out<<'('<<v[0]<<','<<v[1]<<','<<v[2]<<')';}out<<'}';}
                out<<"};\ndraw(surface(pyxis_mesh_"<<symbol<<"),"<<material.str()<<",meshpen=black+linewidth("<<object.stroke_width<<"bp),light=nolight);\n";
            } else {
                out << "label('" << escape(object.kind == Kind::Text3 ? plain_text(object.text) : object.text) << "',(" << object.x << ',' << object.y << ',' << object.z << "));\n";
            }
        }
        out<<"shipout(bbox(xmargin=2mm,p=invisible"<<(scene.theme=="blackboard"?",filltype=Fill("+paper(scene)+")":"")<<"));\n";
        return out.str();
    }
    out << "// Generated by Pyxis 1.0. Edit the .pyxis source.\nimport graph;\nsize(" << scene.width_mm << "mm,0);\ndefaultpen(" << ink(scene) << "+linewidth(0.5bp));\n";
    const bool automatic=std::any_of(scene.objects.begin(),scene.objects.end(),[](const Object& o){return o.automatic_label;});
    if(automatic){
        out<<automatic_label_library();
        out<<"path[] pyxis_label_strokes,pyxis_label_nodes,pyxis_label_owners;\nreal[] pyxis_label_widths,pyxis_label_gaps;\nstring[] pyxis_label_texts,pyxis_label_names,pyxis_fixed_texts;\npair[] pyxis_label_anchors,pyxis_fixed_anchors;\nint[] pyxis_label_preferences,pyxis_label_arrows;\n";
    }
    if(std::any_of(scene.objects.begin(),scene.objects.end(),[](const Object& o){return !o.clip_start.empty()||!o.clip_end.empty();}))out<<clipping_library();
    if (preview && scene.grid_visible) emit_grid(out, scene);
    auto render_order = scene.objects;
    std::stable_sort(render_order.begin(),render_order.end(),[](const Object& a,const Object& b){return a.background&&!b.background;});
    size_t serial=0;
    for (const auto& o : render_order) {
        const auto symbol=std::to_string(serial++);
        if(o.kind==Kind::Point)continue;
        out << "// " << o.name << '\n';
        std::ostringstream stroke_pen; stroke_pen.imbue(std::locale::classic()); stroke_pen << std::setprecision(17);
        if(o.explicit_color&&!o.region)stroke_pen<<"rgb("<<o.red<<','<<o.green<<','<<o.blue<<')';else stroke_pen<<ink(scene);
        stroke_pen << "+linewidth(" << o.stroke_width << "bp)";
        const std::string pen = stroke_pen.str() + (o.stroke == "solid" ? std::string{} : "+" + o.stroke);
        if (o.kind == Kind::Circle) {
            if(o.node_fill=="none")out << "draw(";
            else out << "filldraw(";
            out << "circle((" << o.x << ',' << o.y << ")," << o.a << "),";
            if(o.node_fill!="none")out << (o.node_fill=="black"?ink(scene):paper(scene)) << ',';
            out << pen << ");\n";
        }
        else if(o.kind==Kind::GateBox)
            out << "filldraw(box((" << o.x-o.a/2 << ',' << o.y-o.b/2 << "),(" << o.x+o.a/2 << ',' << o.y+o.b/2 << "))," << paper(scene) << ',' << pen << ");\n";
        else if (o.kind == Kind::Ellipse)
            out << "draw(shift((" << o.x << ',' << o.y << "))*scale(" << o.a << ',' << o.b << ")*unitcircle," << pen << ");\n";
        else if (o.kind == Kind::Label || o.kind == Kind::Text) {
            const auto text=escape(o.kind==Kind::Text?plain_text(o.text):o.text);
            if(!o.automatic_label){
                out<<"label('"<<text<<"',("<<o.x<<','<<o.y<<"));\n";
                if(automatic&&!o.text.empty())out<<"pyxis_fixed_texts.push('"<<text<<"');pyxis_fixed_anchors.push(("<<o.x<<','<<o.y<<"));\n";
            }else{
                const std::vector<std::string> directions{"n","ne","e","se","s","sw","w","nw"};
                const auto preference=std::find(directions.begin(),directions.end(),o.label_preference)-directions.begin();
                out<<"pyxis_label_names.push('"<<o.name<<"');pyxis_label_texts.push('"<<text<<"');\npyxis_label_anchors.push(("<<o.x<<','<<o.y<<"));pyxis_label_preferences.push("<<preference<<");pyxis_label_gaps.push("<<o.label_gap_bp<<");\npyxis_label_owners.push(";
                emit_boundary(out,scene,label_owner(scene,o));out<<");\n";
            }
        }
        else {
            std::vector<Point> vertices = (o.kind == Kind::Line || o.kind == Kind::Arrow) ? std::vector<Point>{{o.x,o.y},{o.a,o.b}} : o.points;
            bool clipped=!o.clip_start.empty()||!o.clip_end.empty();
            auto textEndpoint=[&](const std::string& id)->const Object*{
                for(const auto& candidate:scene.objects)if(candidate.name==id&&(candidate.kind==Kind::Label||candidate.kind==Kind::Text))return &candidate;
                return nullptr;
            };
            const auto firstText=textEndpoint(o.clip_start),lastText=textEndpoint(o.clip_end);
            if(firstText||lastText){
                out<<"path pyxis_geometry_"<<symbol<<'=';emit_path(out,o,vertices);out<<";\npath pyxis_physical_clipped_"<<symbol<<";transform pyxis_clip_transform_"<<symbol<<";\n";
                auto measure=[&](const Object* label,const std::string& end){if(label)out<<"frame pyxis_clip_glyph_"<<symbol<<'_'<<end<<";label(pyxis_clip_glyph_"<<symbol<<'_'<<end<<",'"<<escape(label->kind==Kind::Text?plain_text(label->text):label->text)<<"',(0,0));\n";};
                measure(firstText,"first");measure(lastText,"last");
                if(automatic){
                    int arrow=o.kind==Kind::Arrow?(o.flow=="reverse"?4:1):o.flow=="forward"?2:o.flow=="reverse"?3:0;
                    out<<"int pyxis_clip_index_"<<symbol<<"=pyxis_label_strokes.length;pyxis_label_strokes.push(pyxis_geometry_"<<symbol<<");pyxis_label_widths.push("<<o.stroke_width<<");pyxis_label_arrows.push("<<arrow<<");\n";
                }
                out<<"currentpicture.addBox(min(pyxis_geometry_"<<symbol<<"),max(pyxis_geometry_"<<symbol<<"),(-8,-8),(8,8));\ncurrentpicture.add(new void(frame f, transform t) {\npyxis_clip_transform_"<<symbol<<"=t;\npyxis_physical_clipped_"<<symbol<<"=pyxis_trim(t*pyxis_geometry_"<<symbol<<',';
                auto boundary=[&](const Object* label,const std::string& id,const std::string& end){
                    if(label)out<<"pyxis_text_box(pyxis_clip_glyph_"<<symbol<<'_'<<end<<",("<<label->x<<','<<label->y<<"),t,"<<1.5+o.stroke_width/2<<")";
                    else{out<<"t*(";emit_boundary(out,scene,id);out<<')';}
                };
                boundary(firstText,o.clip_start,"first");out<<',';boundary(lastText,o.clip_end,"last");out<<",\""<<o.name<<"\");\n";
                if(automatic)out<<"pyxis_label_strokes[pyxis_clip_index_"<<symbol<<"]=inverse(t)*pyxis_physical_clipped_"<<symbol<<";\n";
                out<<"draw(f,"<<(o.flow=="reverse"?"reverse(":"")<<"pyxis_physical_clipped_"<<symbol<<(o.flow=="reverse"?")":"")<<','<<pen<<(o.kind==Kind::Arrow?",Arrow":o.flow!="none"?",MidArrow":"")<<");\n});\n";
                for(size_t i=0;i<vertices.size();++i){if((i==0&&!o.clip_start.empty())||(i+1==vertices.size()&&!o.clip_end.empty()))continue;emit_marker(out,scene,o,vertices[i]);}
                continue;
            }
            if(clipped){
                out<<"path pyxis_clipped_"<<symbol<<"=pyxis_trim(";emit_path(out,o,vertices);out<<',';
                emit_boundary(out,scene,o.clip_start);out<<',';emit_boundary(out,scene,o.clip_end);out<<",\""<<o.name<<"\");\n";
            }
            if(automatic&&!clipped){out<<"path pyxis_geometry_"<<symbol<<'=';emit_path(out,o,vertices);out<<";\n";}
            bool fillRegion=o.region&&o.fill!="none";
            out << (fillRegion?(o.outline?"filldraw(":"fill("):"draw(");
            if(o.flow=="reverse")out << "reverse(";
            if(clipped)out<<"pyxis_clipped_"<<symbol;
            else if(automatic)out<<"pyxis_geometry_"<<symbol;
            else emit_path(out, o, vertices);
            if(o.flow=="reverse")out << ')';
            if(fillRegion){
                if(o.fill=="white")out<<','<<paper(scene);else out<<",rgb("<<o.red<<','<<o.green<<','<<o.blue<<')';
                out<<"+opacity("<<o.opacity<<')';
            }
            if(!fillRegion||o.outline)out << ',' << pen << (o.kind == Kind::Arrow ? ",Arrow" : o.flow!="none"?",MidArrow":"");
            out<<");\n";
            if(automatic&&(!o.region||o.outline)){
                int arrow=o.kind==Kind::Arrow?(o.flow=="reverse"?4:1):o.flow=="forward"?2:o.flow=="reverse"?3:0;
                out<<"pyxis_label_strokes.push("<<(clipped?"pyxis_clipped_":"pyxis_geometry_")<<symbol<<");pyxis_label_widths.push("<<o.stroke_width<<");pyxis_label_arrows.push("<<arrow<<");\n";
            }
            for(size_t i=0;i<vertices.size();++i){
                // Endpoint markers describe the original nodes, not the clipped line.
                // Avoid planting a duplicate marker inside an endpoint node.
                if((i==0&&!o.clip_start.empty())||(i+1==vertices.size()&&!o.clip_end.empty()))continue;
                emit_marker(out,scene,o,vertices[i]);
            }
        }
        if(automatic&&(o.kind==Kind::Circle||o.kind==Kind::Ellipse||o.kind==Kind::GateBox)){
            out<<"path pyxis_node_"<<symbol<<'=';emit_boundary(out,scene,o.name);out<<";\npyxis_label_strokes.push(pyxis_node_"<<symbol<<");pyxis_label_widths.push("<<o.stroke_width<<");pyxis_label_arrows.push(0);pyxis_label_nodes.push(pyxis_node_"<<symbol<<");\n";
        }
    }
    if(automatic)out<<"pyxis_auto_labels(pyxis_label_texts,pyxis_label_anchors,pyxis_label_owners,pyxis_label_preferences,pyxis_label_gaps,pyxis_label_strokes,pyxis_label_widths,pyxis_label_arrows,pyxis_label_nodes,pyxis_fixed_texts,pyxis_fixed_anchors);\n";
    out<<"shipout(bbox(xmargin=2mm,p=invisible"<<(scene.theme=="blackboard"?",filltype=Fill("+paper(scene)+")":"")<<"));\n";
    return out.str();
}
}
```

</details>

## src/layout.hpp

Dichiara layout(Scene&): riceve una scena modificabile perché aggiorna coordinate e ingombri. L’header non espone gli indici temporanei o la strategia di visita.

<details>
<summary>Codice reale completo: src/layout.hpp</summary>

```cpp
#pragma once
#include "pyxis.hpp"
namespace pyxis { void layout(Scene& scene); }
```

</details>

## src/layout.cpp

layout prepara indici e controlli di unicità. resolve visita prima il gruppo di riferimento, calcola dx/dy e trasla i membri. followsMember distingue estremi numerici e ancoraggi interni al gruppo per evitare traslazioni doppie. I tre stati rilevano dipendenze cicliche.

<details>
<summary>Codice reale completo: src/layout.cpp</summary>

```cpp
#include "layout.hpp"
#include <algorithm>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
namespace pyxis {
void layout(Scene& scene) {
    std::unordered_map<std::string,size_t> names, placements;
    std::unordered_map<std::string,Object*> objects;
    std::unordered_set<std::string> assigned;
    for(auto& o:scene.objects)objects.emplace(o.name,&o);
    for(size_t i=0;i<scene.groups.size();++i){
        const auto& g=scene.groups[i];
        if(objects.count(g.name)||!names.emplace(g.name,i).second)throw std::runtime_error("nome del gruppo gia' utilizzato: "+g.name);
        for(const auto& m:g.members){
            if(!objects.count(m))throw std::runtime_error("membro del gruppo sconosciuto: "+m);
            if(!assigned.insert(m).second)throw std::runtime_error("oggetto assegnato a piu' gruppi: "+m);
        }
    }
    for(size_t i=0;i<scene.placements.size();++i){
        auto& p=scene.placements[i];
        if(!names.count(p.object)||!names.count(p.reference))throw std::runtime_error("riga "+std::to_string(p.line)+": place richiede nomi di gruppi esistenti: "+p.object+", "+p.reference);
        if(!placements.emplace(p.object,i).second)throw std::runtime_error("riga "+std::to_string(p.line)+": disposizione duplicata per "+p.object);
    }
    std::vector<int> state(scene.groups.size());
    std::function<void(size_t)> resolve=[&](size_t i){
        if(state[i]==2)return;
        if(state[i]==1)throw std::runtime_error("dipendenza ciclica nella disposizione del gruppo "+scene.groups[i].name);
        state[i]=1;auto& g=scene.groups[i];auto it=placements.find(g.name);
        if(it!=placements.end()){
            auto& p=scene.placements[it->second];size_t j=names.at(p.reference);resolve(j);auto& target=scene.groups[j];
            double dx=(target.left+target.right-g.left-g.right)/2,dy=(target.bottom+target.top-g.bottom-g.top)/2;
            if(p.relation=="below")dy=target.bottom-p.gap-g.top;
            else if(p.relation=="above")dy=target.top+p.gap-g.bottom;
            else if(p.relation=="right-of")dx=target.right+p.gap-g.left;
            else dx=target.left-p.gap-g.right;
            const std::unordered_set<std::string> members(g.members.begin(),g.members.end());
            auto followsMember=[&](const std::string& anchor){
                if(anchor.empty()||anchor.front()=='@')return false;
                auto owner=anchor.substr(0,anchor.rfind('.'));
                if(!members.count(owner))throw std::runtime_error("ancoraggio esterno al gruppo "+g.name+": "+anchor);
                return true;
            };
            for(const auto& id:g.members){
                auto& o=*objects.at(id);
                if(o.constraint=="tangent-circle"){
                    if(!members.count(o.constraint_reference))throw std::runtime_error("tangenza esterna al gruppo "+g.name);
                }else if(!followsMember(o.start_anchor)){o.x+=dx;o.y+=dy;}
                if((o.kind==Kind::Line||o.kind==Kind::Arrow)&&!followsMember(o.end_anchor)){o.a+=dx;o.b+=dy;}
                for(size_t v=0;v<o.points.size();++v){
                    if(v<o.point_anchors.size()&&followsMember(o.point_anchors[v]))continue;
                    o.points[v].first+=dx;o.points[v].second+=dy;
                }
                for(auto& c:o.controls){c.first.first+=dx;c.first.second+=dy;c.second.first+=dx;c.second.second+=dy;}
                if(!std::isfinite(o.x)||!std::isfinite(o.y)||!std::isfinite(o.a)||!std::isfinite(o.b))throw std::runtime_error("overflow nella disposizione");
            }
            g.left+=dx;g.right+=dx;g.bottom+=dy;g.top+=dy;
        }
        state[i]=2;
    };
    for(size_t i=0;i<scene.groups.size();++i)resolve(i);
}
}
```

</details>

## src/constraints.hpp

resolve_constraint riceve Scene&, Object& e un callback resolve, così può chiedere la risoluzione del riferimento prima di calcolare la propria geometria. resolve_clipping opera sulla scena già risolta. Le firme documentano chi ha il diritto di modificare i dati.

<details>
<summary>Codice reale completo: src/constraints.hpp</summary>

```cpp
#pragma once
#include "pyxis.hpp"
#include <functional>
namespace pyxis {
void resolve_constraint(Scene&, Object&, const std::function<void(size_t)>& resolve);
void resolve_clipping(Scene&);
}
```

</details>

## src/constraints.cpp

resolve_constraint distingue cerchi tangenti e segmenti direzionali. straight verifica che il riferimento non sia una curva. resolve_clipping usa endpoint per scegliere il bordo del nodo; namedAnchor verifica che esista un riferimento geometricamente significativo. Lo stato clip_start/clip_end viene poi consumato dal backend.

<details>
<summary>Codice reale completo: src/constraints.cpp</summary>

```cpp
#include "constraints.hpp"
#include <algorithm>
#include <cmath>
#include <map>
#include <stdexcept>
namespace pyxis {
void resolve_constraint(Scene& scene, Object& object, const std::function<void(size_t)>& resolve) {
    if(object.constraint.empty()) return;
    auto target=std::find_if(scene.objects.begin(),scene.objects.end(),[&](const Object& o){return o.name==object.constraint_reference;});
    if(target==scene.objects.end())throw std::runtime_error("vincolo di "+object.name+": oggetto sconosciuto "+object.constraint_reference);
    resolve(static_cast<size_t>(target-scene.objects.begin()));
    if(object.constraint=="tangent-circle"){
        if(target->kind!=Kind::Circle)throw std::runtime_error("tangent-to richiede un cerchio: "+target->name);
        if(object.x!=0||object.y!=0)throw std::runtime_error("offset/move incompatibile con la tangenza di "+object.name);
        static const std::map<std::string,std::pair<double,double>> directions{
            {"east",{1,0}},{"west",{-1,0}},{"north",{0,1}},{"south",{0,-1}},
            {"ne",{1,1}},{"nw",{-1,1}},{"se",{1,-1}},{"sw",{-1,-1}}};
        auto direction=directions.find(object.constraint_direction);
        if(direction==directions.end())throw std::runtime_error("direction: north, south, east, west, ne, nw, se, sw");
        auto v=direction->second;double distance=target->a+object.a,length=std::hypot(v.first,v.second);
        object.x=target->x+distance*v.first/length;object.y=target->y+distance*v.second/length;
    }else{
        auto straight=[](const Object& o){return(o.kind==Kind::Line||o.kind==Kind::Arrow)&&o.bend==0&&o.controls.empty()&&o.wave_turns==0;};
        if(!straight(*target)||!straight(object))throw std::runtime_error("parallel/perpendicular richiedono segmenti rettilinei: "+object.name);
        double dx=target->a-target->x,dy=target->b-target->y,length=std::hypot(dx,dy);
        if(!std::isfinite(length)||length==0)throw std::runtime_error("direzione del vincolo non definita: "+target->name);
        dx/=length;dy/=length;
        if(object.constraint=="perpendicular"){double swap=dx;dx=-dy;dy=swap;}
        double x=object.x,y=object.y,half=object.constraint_length/2;
        object.x=x-half*dx;object.y=y-half*dy;object.a=x+half*dx;object.b=y+half*dy;
    }
}
void resolve_clipping(Scene& scene) {
    auto endpoint=[&](const std::string& anchor,double x,double y)->std::string{
        if(anchor.empty()||anchor.front()=='@')return "";
        auto dot=anchor.rfind('.');auto id=anchor.substr(0,dot);
        auto target=std::find_if(scene.objects.begin(),scene.objects.end(),[&](const Object& o){return o.name==id;});
        if(target==scene.objects.end())throw std::runtime_error("nodo di clipping sconosciuto: "+id);
        if(target->kind==Kind::Point)return "";
        if(target->kind==Kind::Label||target->kind==Kind::Text){
            if(target->automatic_label||target->text.empty())throw std::runtime_error("clip richiede un'etichetta fissa non vuota: "+id);
            return id;
        }
        double dx=x-target->x,dy=y-target->y;
        if(target->kind==Kind::Circle||target->kind==Kind::Ellipse){
            double ry=target->kind==Kind::Circle?target->a:target->b;
            if(std::hypot(dx/target->a,dy/ry)<1-1e-12)return id;
            return "";
        }
        if(target->kind==Kind::GateBox){
            if(std::abs(dx)<target->a/2-1e-12&&std::abs(dy)<target->b/2-1e-12)return id;
            return "";
        }
        throw std::runtime_error("clip nodes richiede cerchi, ellissi o gatebox: "+id);
    };
    for(auto& o:scene.objects)if(o.clip_nodes){
        if(!o.constraint.empty())throw std::runtime_error("clip nodes usa from/to, non il punto through di "+o.name);
        auto namedAnchor=[](const std::string& anchor){return !anchor.empty()&&anchor.front()!='@'&&anchor.rfind('.')!=std::string::npos;};
        if(!namedAnchor(o.start_anchor)&&!namedAnchor(o.end_anchor)&&!std::any_of(o.point_anchors.begin(),o.point_anchors.end(),namedAnchor))
            throw std::runtime_error("clip nodes richiede estremi con ancoraggi nominati: "+o.name);
        if(o.kind==Kind::Line||o.kind==Kind::Arrow){o.clip_start=endpoint(o.start_anchor,o.x,o.y);o.clip_end=endpoint(o.end_anchor,o.a,o.b);}
        else if(o.kind==Kind::Path){
            o.clip_start=endpoint(o.point_anchors.front(),o.points.front().first,o.points.front().second);
            o.clip_end=endpoint(o.point_anchors.back(),o.points.back().first,o.points.back().second);
        }else throw std::runtime_error("clip nodes richiede line, arrow o path");
    }
}
}
```

</details>

## src/expression.hpp

evaluate restituisce un double. variables contiene costanti numeriche, functions contiene corpi testuali di funzioni, x è il valore dell’argomento. depth limita le chiamate ricorsive. Le tabelle sono riferimenti costanti perché l’interprete deve soltanto leggerle.

<details>
<summary>Codice reale completo: src/expression.hpp</summary>

```cpp
#pragma once
#include <string>
#include <unordered_map>
namespace pyxis {
double evaluate(const std::string& expression, double x,
                const std::unordered_map<std::string, double>& variables,
                const std::unordered_map<std::string, std::string>& functions,
                unsigned depth = 0);
}
```

</details>

## src/expression.cpp

Expression::space salta spazi; take consuma un simbolo se presente. sum/product/unary/power implementano precedenza e associatività. atom interpreta numeri, parentesi, funzioni e nomi. value controlla limiti, residuo e finitezza. evaluate è il wrapper pubblico: crea l’interprete e restituisce il risultato.

<details>
<summary>Codice reale completo: src/expression.cpp</summary>

```cpp
#include "expression.hpp"
#include <cctype>
#include <cmath>
#include <sstream>
#include <locale>
#include <stdexcept>

namespace pyxis {
namespace {
class Expression {
    const std::string& text;
    size_t position = 0;
    double x;
    const std::unordered_map<std::string, double>& variables;
    const std::unordered_map<std::string, std::string>& functions;
    unsigned depth;
    void space() { while (position < text.size() && std::isspace(static_cast<unsigned char>(text[position]))) ++position; }
    bool take(char c) { space(); if (position < text.size() && text[position] == c) { ++position; return true; } return false; }
    double sum() {
        double v = product();
        for (;;) { if (take('+')) v += product(); else if (take('-')) v -= product(); else return v; }
    }
    double product() {
        double v = unary();
        for (;;) {
            if (take('*')) v *= unary();
            else if (take('/')) { double d = unary(); if (d == 0) throw std::runtime_error("divisione per zero"); v /= d; }
            else return v;
        }
    }
    double unary() { if (take('+')) return unary(); if (take('-')) return -unary(); return power(); }
    double power() { double v = atom(); if (take('^')) v = std::pow(v, unary()); return v; }
    double atom() {
        space();
        if (take('(')) { double v = sum(); if (!take(')')) throw std::runtime_error("parentesi non chiusa"); return v; }
        if (position >= text.size()) throw std::runtime_error("espressione incompleta");
        if (std::isdigit(static_cast<unsigned char>(text[position])) || text[position] == '.') {
            std::istringstream input(text.substr(position)); input.imbue(std::locale::classic());
            double v;
            if (!(input >> v)) throw std::runtime_error("numero non valido nell'espressione");
            auto used = input.tellg();
            position = used == std::streampos(-1) ? text.size() : position + static_cast<size_t>(used);
            return v;
        }
        auto start = position;
        while (position < text.size() && (std::isalnum(static_cast<unsigned char>(text[position])) || text[position] == '_')) ++position;
        if (start == position) throw std::runtime_error("simbolo inatteso nell'espressione");
        auto id = text.substr(start, position - start);
        if (take('(')) {
            double argument = sum();
            if (!take(')')) throw std::runtime_error("parentesi della funzione non chiusa");
            if (id == "sin") return std::sin(argument);
            if (id == "cos") return std::cos(argument);
            if (id == "tan") return std::tan(argument);
            if (id == "exp") return std::exp(argument);
            if (id == "log") return std::log(argument);
            if (id == "sqrt") return std::sqrt(argument);
            if (id == "abs") return std::abs(argument);
            auto f = functions.find(id);
            if (f != functions.end()) return evaluate(f->second, argument, variables, functions, depth + 1);
            throw std::runtime_error("funzione sconosciuta: " + id);
        }
        if (id == "x") return x;
        if (id == "pi") return std::acos(-1.0);
        auto v = variables.find(id);
        if (v != variables.end()) return v->second;
        throw std::runtime_error("variabile sconosciuta: " + id);
    }
public:
    Expression(const std::string& t, double value, const std::unordered_map<std::string, double>& vars,
               const std::unordered_map<std::string, std::string>& funcs, unsigned d)
        : text(t), x(value), variables(vars), functions(funcs), depth(d) {}
    double value() {
        if (depth > 64 || text.size() > 4096) throw std::runtime_error("espressione troppo profonda o troppo lunga");
        // Bound recursive syntax nesting, including repeated unary operators.
        unsigned nesting = 0, signs = 0;
        for (char c : text) {
            if (c == '(' && ++nesting > 64) throw std::runtime_error("troppe parentesi annidate");
            if (c == ')' && nesting) --nesting;
            if ((c == '+' || c == '-' || c == '^') && ++signs > 128) throw std::runtime_error("espressione troppo complessa");
        }
        double v = sum(); space();
        if (position != text.size()) throw std::runtime_error("testo inatteso dopo l'espressione");
        if (!std::isfinite(v)) throw std::runtime_error("risultato non finito o fuori dal dominio reale");
        return v;
    }
};
}
double evaluate(const std::string& expression, double x, const std::unordered_map<std::string, double>& variables,
                const std::unordered_map<std::string, std::string>& functions, unsigned depth) {
    return Expression(expression, x, variables, functions, depth).value();
}
}
```

</details>

## src/packages/common.hpp

Block conserva proprietà, ordine e provenienza. Builder registra membri e produce primitive, senza disegnare. I piccoli helper condividono liste, numeri e formattazione. Le dichiarazioni finali collegano i quattro cpp dei pacchetti al registro: dimenticarne una o non compilare un cpp rompe il collegamento.

<details>
<summary>Codice reale completo: src/packages/common.hpp</summary>

```cpp
#pragma once
#include "../semantic.hpp"
#include "../expression.hpp"
#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <functional>
#include <iomanip>
#include <locale>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>


namespace pyxis::packages {
inline std::string trim(const std::string& s) {
    auto a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
    return a == std::string::npos ? "" : s.substr(a, b-a+1);
}
inline std::string clean(const std::string& s) {
    bool quote = false;
    for (size_t i=0; i<s.size(); ++i) {
        if (s[i]=='"') quote=!quote;
        if (!quote && s[i]=='#') return trim(s.substr(0,i));
    }
    return trim(s);
}
inline std::vector<std::string> split(const std::string& s) {
    std::vector<std::string> out;
    size_t start=0; int depth=0; bool quote=false;
    for (size_t i=0;i<s.size();++i) {
        char c=s[i];
        if(c=='"') quote=!quote;
        if(!quote) {
            if(c=='('||c=='[') ++depth;
            if(c==')'||c==']') --depth;
            if(depth<0) throw std::runtime_error("parentesi non bilanciate");
            if(c==',' && depth==0) {out.push_back(trim(s.substr(start,i-start)));start=i+1;}
        }
    }
    if(quote||depth) throw std::runtime_error("stringa o parentesi non chiusa");
    out.push_back(trim(s.substr(start)));
    for(const auto& v:out) if(v.empty()) throw std::runtime_error("elemento di lista vuoto");
    return out;
}
inline std::vector<std::string> list(std::string s) {
    s=trim(s);
    if(s.size()<2||s.front()!='['||s.back()!=']') throw std::runtime_error("lista attesa: [elementi]");
    s=trim(s.substr(1,s.size()-2));
    return s.empty()?std::vector<std::string>{}:split(s);
}
inline bool identifier(const std::string& s) {
    if(s.empty() || !(std::isalpha(static_cast<unsigned char>(s[0]))||s[0]=='_')) return false;
    return std::all_of(s.begin(),s.end(),[](unsigned char c){return std::isalnum(c)||c=='_';});
}
inline double real(const std::string& s, double low, double high) {
    std::istringstream in(s); in.imbue(std::locale::classic());
    double v; if(!(in>>v)||!std::isfinite(v)) throw std::runtime_error("numero finito atteso");
    in>>std::ws;
    if(!in.eof()||v<low||v>high) throw std::runtime_error("valore fuori intervallo: "+s);
    return v;
}
inline unsigned integer(const std::string& s, unsigned low,unsigned high) {
    double v=real(s,low,high);
    if(std::floor(v)!=v) throw std::runtime_error("intero atteso: "+s);
    return static_cast<unsigned>(v);
}
inline std::string num(double v) {
    std::ostringstream s; s.imbue(std::locale::classic());s<<std::setprecision(17)<<v;return s.str();
}
struct Block {
    std::string type,id; size_t line;
    std::map<std::string,SourceLine> properties;
    std::vector<std::string> order;
    std::string get(const std::string& k,const std::string& fallback="") const {
        auto it=properties.find(k);return it==properties.end()?fallback:it->second.text;
    }
    void allow(const std::set<std::string>& keys) const {
        for(const auto& p:properties) if(!keys.count(p.first))
            throw std::runtime_error("riga "+std::to_string(p.second.number)+": proprieta' sconosciuta: "+p.first);
    }
};
struct Builder {
    std::vector<SourceLine>& output; const Block& b;
    std::vector<std::string> members;
    void emit(const std::string& s) {output.push_back({s,b.line});}
    std::string object(const std::string& type,const std::string& local,const std::string& args) {
        std::string id=b.id+"."+local;
        members.push_back(id);emit(type+" "+id+" "+args);return id;
    }
    std::string line(const std::string& local,double x,double y,double a,double z,bool arrow=false) {
        return object(arrow?"arrow":"line",local,num(x)+" "+num(y)+" "+num(a)+" "+num(z));
    }
    std::string connect(const std::string& local,const std::string& from,const std::string& to) {
        auto name=object("line",local,from+" "+to);emit("clip "+name+" nodes");return name;
    }
    void label(const std::string& local,double x,double y,const std::string& text,bool tex=false) {
        object(tex?"label":"text",local,num(x)+" "+num(y)+" \""+text+"\"");
    }
    void path(const std::string& local,const std::vector<std::pair<double,double>>& points) {
        std::string s="\"";for(size_t i=0;i<points.size();++i){if(i)s+=';';s+=num(points[i].first)+" "+num(points[i].second);} object("path",local,s+"\"");
    }
    void box(const std::string& local,double x,double y,double w,double h) {
        path(local,{{x-w/2,y-h/2},{x+w/2,y-h/2},{x+w/2,y+h/2},{x-w/2,y+h/2},{x-w/2,y-h/2}});
    }
    std::string path3(const std::string& local,const std::vector<std::array<double,3>>& vertices,bool arrow=false) {
        std::string s="\"";for(size_t i=0;i<vertices.size();++i){if(i)s+=';';s+=num(vertices[i][0])+" "+num(vertices[i][1])+" "+num(vertices[i][2]);}
        auto name=object(arrow?"arrow3":"path3",local,s+"\"");emit("color "+name+" 0 0 0");return name;
    }
    void group(double x,double y,double a,double z) {
        std::string s="_group "+b.id+" "+num(x)+" "+num(y)+" "+num(a)+" "+num(z);
        for(const auto& m:members)s+=" "+m;
        emit(s);
    }
};
void feynman(const Block&, Builder&);
void circuit(const Block&, Builder&);
void tensor_network(const Block&, Builder&);
void bloch(const Block&, Builder&);
void ising(const Block&, Builder&);
void phase_flow(const Block&, Builder&);
void phase_diagram(const Block&, Builder&);
void lorenz(const Block&, Builder&);
void penrose(const Block&, Builder&);
void embedding(const Block&, Builder&);
void light_cones(const Block&, Builder&);
void geodesic(const Block&, Builder&);
}
```

</details>

## src/packages/qft.cpp

Particle separa nome fisico, etichetta e famiglia grafica. particle esegue la lookup. feynman valida proprietà/liste/canale, forma le gambe e usa propagator per la convenzione visiva. La lambda ramp raccorda il gluone; il loop finale crea le due branche della bolla. group dichiara ingombri utilizzabili dal layout.

<details>
<summary>Codice reale completo: src/packages/qft.cpp</summary>

```cpp
#include "common.hpp"
namespace pyxis::packages {
struct Particle {std::string label,kind; bool anti=false;};
Particle particle(const std::string& s) {
    static const std::map<std::string,Particle> particles{
        {"electron",{"e^-","fermion",false}},{"positron",{"e^+","fermion",true}},
        {"muon",{"\\mu^-","fermion",false}},{"antimuon",{"\\mu^+","fermion",true}},
        {"photon",{"\\gamma","photon",false}},{"scalar",{"\\phi","scalar",false}},
        {"gluon",{"g","gluon",false}},
        {"ghost",{"c","ghost",false}},{"fermion",{"f","fermion",false}},
        {"antifermion",{"\\bar f","fermion",true}}};
    auto it=particles.find(s);if(it==particles.end()) throw std::runtime_error("particella non disponibile: "+s);return it->second;
}
void feynman(const Block& b,Builder& out) {
    b.allow({"channel","incoming","outgoing","mediator","labels","loop","loop-position","loop-radius","label-placement"});
    auto labelPlacement=b.get("label-placement","auto");
    if(labelPlacement!="auto"&&labelPlacement!="fixed")throw std::runtime_error("label-placement: auto, fixed");
    auto incoming=list(b.get("incoming","[electron, positron]"));
    auto outgoing=list(b.get("outgoing","[muon, antimuon]"));
    if(incoming.size()!=2||outgoing.size()!=2) throw std::runtime_error("feynman: questo layout richiede due particelle entranti e due uscenti");
    std::string channel=b.get("channel","s");
    if(channel!="s"&&channel!="t"&&channel!="u") throw std::runtime_error("canale atteso: s, t, u");
    auto mediator=particle(b.get("mediator","photon"));
    struct Leg {std::string id;double x,y,a,z;Particle p;bool in;};
    std::vector<Leg> legs;
    if(channel=="s") legs={{"in1",-2.5,1.2,-0.7,0,particle(incoming[0]),true},{"in2",-2.5,-1.2,-0.7,0,particle(incoming[1]),true},
        {"out1",0.7,0,2.5,1.2,particle(outgoing[0]),false},{"out2",0.7,0,2.5,-1.2,particle(outgoing[1]),false}};
    else {
        legs={{"in1",-2.5,1.2,0,1.2,particle(incoming[0]),true},{"in2",-2.5,-1.2,0,-1.2,particle(incoming[1]),true},
            {"out1",0,channel=="t"?1.2:-1.2,2.5,1.2,particle(outgoing[0]),false},
            {"out2",0,channel=="t"?-1.2:1.2,2.5,-1.2,particle(outgoing[1]),false}};
    }
    auto propagator=[&](const std::string& id,double x,double y,double a,double z,const Particle& p,bool reverse){
        std::string name;
        if(p.kind=="gluon"){
            std::vector<std::pair<double,double>> points;double dx=a-x,dy=z-y,length=std::hypot(dx,dy),turns=std::max(3.0,std::floor(length*6)),k=2*std::acos(-1.0)*turns;
            auto ramp=[](double value){value=std::clamp(value,0.0,1.0);return value*value*(3-2*value);};
            for(unsigned i=0;i<=static_cast<unsigned>(turns)*24;++i){
                double t=i/(turns*24);
                // Fade the first/last two turns with zero endpoint derivative.
                // The coil cannot fold back through its interaction vertex.
                double envelope=ramp(t*turns/2)*ramp((1-t)*turns/2);
                double amplitude=std::min(0.12,0.7*length/turns);
                // Sinusoidal advance gives the two endpoints matching tapers:
                // x(1-t)=length-x(t), y(1-t)=y(t) in local coordinates.
                double advance=amplitude*envelope*std::sin(k*t),side=amplitude*envelope*std::cos(k*t);
                points.push_back({x+t*dx+(advance*dx-side*dy)/length,y+t*dy+(advance*dy+side*dx)/length});
            }
            out.path(id,points);name=b.id+"."+id;
        }else name=out.line(id,x,y,a,z);
        if(p.kind=="fermion")out.emit("flow "+name+(reverse?" reverse":" forward"));
        if(p.kind=="photon")out.emit("wave "+name+" 0.1 "+std::to_string(std::max(2,static_cast<int>(std::hypot(a-x,z-y)*5))));
        if(p.kind=="scalar"||p.kind=="ghost")out.emit("stroke "+name+" dashed");
    };
    auto labels=b.properties.count("labels")?list(b.get("labels")):std::vector<std::string>{};
    if(!labels.empty()&&labels.size()!=4)throw std::runtime_error("labels richiede quattro stringhe LaTeX");
    for(size_t i=0;i<legs.size();++i){
        const auto& l=legs[i];propagator(l.id,l.x,l.y,l.a,l.z,l.p,l.p.anti);
        double x=l.in?l.x:l.a,y=l.in?l.y:l.z;
        std::string label="$"+l.p.label+"$";
        if(!labels.empty()){
            if(labels[i].size()<2||labels[i].front()!='"'||labels[i].back()!='"')throw std::runtime_error("labels: stringhe tra virgolette richieste");
            label=labels[i].substr(1,labels[i].size()-2);
        }
        out.label(l.id+"_label",x,y+(labelPlacement=="fixed"?(y>0?0.35:-0.35):0),label,true);
        if(labelPlacement=="auto")out.emit("placement "+b.id+"."+l.id+"_label auto "+(y>0?"n":"s")+" 3");
    }
    if(b.properties.count("loop")){
        auto loopParticle=particle(b.get("loop"));
        if(loopParticle.kind!="fermion"&&loopParticle.kind!="scalar"&&loopParticle.kind!="ghost"&&loopParticle.kind!="photon")throw std::runtime_error("loop: tipi implementati fermion, scalar, ghost, photon");
        double position=real(b.get("loop-position","0.5"),0.05,0.95),radius=real(b.get("loop-radius","0.25"),0.05,0.5);
        double x=channel=="s"?-0.7:0,y=channel=="s"?0:1.2,a=channel=="s"?0.7:0,z=channel=="s"?0:-1.2;
        double dx=a-x,dy=z-y,length=std::hypot(dx,dy),ux=dx/length,uy=dy/length,cx=x+position*dx,cy=y+position*dy;
        if(radius>=length*std::min(position,1-position))throw std::runtime_error("loop-radius troppo grande per la posizione richiesta");
        propagator("mediator_in",x,y,cx-radius*ux,cy-radius*uy,mediator,false);
        propagator("mediator_out",cx+radius*ux,cy+radius*uy,a,z,mediator,false);
        for(unsigned branch=0;branch<2;++branch){
            std::vector<std::pair<double,double>> points;
            unsigned samples=loopParticle.kind=="photon"?192:48;
            for(unsigned i=0;i<=samples;++i){double t=std::acos(-1.0)*(1-static_cast<double>(i)/samples),r=radius;
                if(loopParticle.kind=="photon")r*=1+0.12*std::sin(16*t)*std::pow(std::sin(t),2);
                double along=r*std::cos(t),side=(branch?-1:1)*r*std::sin(t);points.push_back({cx+along*ux-side*uy,cy+along*uy+side*ux});}
            std::string id=branch?"loop_lower":"loop_upper";out.path(id,points);
            if(loopParticle.kind=="fermion")out.emit("flow "+b.id+"."+id+(branch?" reverse":" forward"));
            else if(loopParticle.kind!="photon")out.emit("stroke "+b.id+"."+id+" dashed");
        }
    }else{
        if(b.properties.count("loop-position")||b.properties.count("loop-radius"))throw std::runtime_error("specifica loop prima delle sue opzioni");
        if(channel=="s")propagator("mediator",-0.7,0,0.7,0,mediator,false);
        else propagator("mediator",0,1.2,0,-1.2,mediator,false);
    }
    out.group(-3,-1.9,3,1.9);
}
}
```

</details>

## src/packages/quantum.cpp

circuit effettua prima una lettura per identificare oracle, poi genera fili/gate e collegamenti; gli identificatori sono riferiti alla colonna. tensor_network costruisce MPS/PEPS e attacca legami a centri/point. bloch valida angoli e genera sfera/vettore tramite le formule dello stato puro. Le tre funzioni condividono Builder, non un motore di simulazione quantistica.

<details>
<summary>Codice reale completo: src/packages/quantum.cpp</summary>

```cpp
#include "common.hpp"
namespace pyxis::packages {
void circuit(const Block& b,Builder& out) {
    if(b.order.empty()||b.order.size()>32)throw std::runtime_error("circuit: da 1 a 32 qubit");
    std::vector<std::vector<std::string>> rows;
    size_t columns=0;
    for(const auto& row:b.order){if(!identifier(row))throw std::runtime_error("nome qubit non valido: "+row);rows.push_back(split(b.get(row)));columns=std::max(columns,rows.back().size());}
    if(columns>128)throw std::runtime_error("circuit: massimo 128 colonne");
    struct Oracle {std::string label;std::vector<size_t> rows;};
    std::map<std::pair<size_t,std::string>,Oracle> oracles;
    for(size_t r=0;r<rows.size();++r)for(size_t c=0;c<rows[r].size();++c){
        const auto& gate=rows[r][c];if(gate.rfind("oracle(",0)!=0)continue;
        if(gate.back()!=')')throw std::runtime_error("oracle non chiuso");
        auto arguments=split(gate.substr(7,gate.size()-8));
        if(arguments.size()!=2||!identifier(arguments[0])||arguments[1].size()<3||arguments[1].front()!='"'||arguments[1].back()!='"')throw std::runtime_error("oracle(id,\"formula LaTeX\") atteso");
        auto text=arguments[1].substr(1,arguments[1].size()-2);if(text.size()>128)throw std::runtime_error("oracle: formula troppo lunga");
        auto& oracle=oracles[{c,arguments[0]}];if(!oracle.rows.empty()&&oracle.label!=text)throw std::runtime_error("oracle: le righe devono condividere la stessa formula");
        oracle.label=text;oracle.rows.push_back(r);
    }
    for(const auto& entry:oracles){const auto& span=entry.second.rows;if(span.size()<2)throw std::runtime_error("oracle richiede almeno due qubit contigui");for(size_t i=1;i<span.size();++i)if(span[i]!=span[i-1]+1)throw std::runtime_error("oracle richiede qubit contigui nella stessa colonna");}
    struct Endpoint{size_t row;bool target;};
    std::map<std::pair<size_t,std::string>,std::vector<Endpoint>> links;
    double step=1.3;
    for(size_t r=0;r<rows.size();++r){
        double y=-1.1*r;out.label(b.order[r]+"_label",-0.65,y,b.order[r]);
        for(size_t c=0;c<=columns;++c)out.line(b.order[r]+"_wire"+std::to_string(c),c*step-0.35,y,(c+1)*step-0.35,y);
        for(size_t c=0;c<rows[r].size();++c){
            auto gate=rows[r][c];std::string id=b.order[r]+"_step"+std::to_string(c+1);double x=(c+0.5)*step;
            if(gate=="_")continue;
            if(gate.rfind("oracle(",0)==0)continue;
            bool ctrl=gate.rfind("control(",0)==0, tgt=gate.rfind("target(",0)==0;
            if(ctrl||tgt){
                if(gate.back()!=')')throw std::runtime_error("gate di controllo non chiuso");
                auto key=gate.substr(ctrl?8:7,gate.size()-(ctrl?9:8));if(!identifier(key))throw std::runtime_error("identificatore del collegamento non valido");
                links[{c,key}].push_back({r,tgt});
                auto dot=out.object("circle",id,num(x)+" "+num(y)+" "+(ctrl?"0.055":"0.16"));
                if(ctrl)out.emit("nodefill "+dot+" black");
                if(tgt)out.line(id+"_plus",x,y-0.16,x,y+0.16);
                continue;
            }
            bool oracle=gate.rfind("gate(\"",0)==0&&gate.size()>=9&&gate.substr(gate.size()-2)=="\")";
            static const std::set<std::string> supported{"H","X","Y","Z","S","T","M"};
            if(!supported.count(gate)&&!oracle)throw std::runtime_error("gate non disponibile: "+gate);
            std::string text=oracle?gate.substr(6,gate.size()-8):gate;
            if(text.size()>12)throw std::runtime_error("gate personalizzato: massimo 12 caratteri in questa versione");
            // Segment gaps avoid any line running through gate labels.
            auto rect=out.object("gatebox",id,num(x)+" "+num(y)+" "+num(std::max(0.65,0.08*text.size()+0.25))+" 0.65");
            (void)rect;
            if(gate=="M"){
                std::vector<std::pair<double,double>> arc;for(unsigned i=0;i<=16;++i){double t=std::acos(-1.0)*i/16;arc.push_back({x+0.22*std::cos(t),y-0.1+0.22*std::sin(t)});}out.path(id+"_meter",arc);out.line(id+"_needle",x,y-0.1,x+0.17,y+0.2,true);
            } else out.label(id+"_label",x,y,text);
        }
    }
    for(const auto& entry:oracles){
        const auto& oracle=entry.second;double x=(entry.first.first+0.5)*step,y=-0.55*(oracle.rows.front()+oracle.rows.back());
        std::string id="oracle_"+entry.first.second+"_"+std::to_string(entry.first.first+1);
        out.object("gatebox",id,num(x)+" "+num(y)+" 1.05 "+num(1.1*(oracle.rows.back()-oracle.rows.front())+0.65));
        out.label(id+"_label",x,y,oracle.label,true);
    }
    for(const auto& link:links){
        auto endpoints=link.second;
        size_t targets=0;for(auto e:endpoints)targets+=e.target;
        auto oracle=oracles.find(link.first);
        if(oracle!=oracles.end()){
            if(targets)throw std::runtime_error("controllo: target e oracle con lo stesso id sono ambigui");
            endpoints.push_back({oracle->second.rows.front(),true});++targets;
        }
        if(targets!=1||endpoints.size()<2)throw std::runtime_error("controllo "+link.first.second+": un target e almeno un control nella stessa colonna richiesti");
        std::sort(endpoints.begin(),endpoints.end(),[](Endpoint a,Endpoint b){return a.row<b.row;});
        double x=(link.first.first+0.5)*step;
        // Connections precede their glyphs in the final scene via an explicit background flag.
        auto name=out.line("link_"+link.first.second+"_"+std::to_string(link.first.first+1),x,-1.1*endpoints.front().row,x,-1.1*endpoints.back().row);
        out.emit("background "+name);
    }
    out.group(-1.2,-1.1*(rows.size()-1)-0.55,(columns+1)*step,0.55);
}

void tensor_network(const Block& b,Builder& out) {
    b.allow({"sites","labels","layout","rows","columns"});auto layout=b.get("layout","mps");
    if(layout!="mps"&&layout!="peps")throw std::runtime_error("tensor-network layout: mps, peps");
    bool peps=layout=="peps";
    if(peps&&b.properties.count("sites"))throw std::runtime_error("PEPS usa rows/columns, non sites");
    if(!peps&&(b.properties.count("rows")||b.properties.count("columns")))throw std::runtime_error("MPS usa sites, non rows/columns");
    unsigned rows=peps?integer(b.get("rows","3"),1,16):1,columns=peps?integer(b.get("columns","3"),1,16):integer(b.get("sites","4"),1,32),sites=rows*columns;
    if(sites>128)throw std::runtime_error("tensor-network: massimo 128 siti");
    auto labels=b.properties.count("labels")?list(b.get("labels")):std::vector<std::string>{};
    if(!labels.empty()&&labels.size()!=sites)throw std::runtime_error("labels richiede una stringa per tensore");
    for(unsigned i=0;i<sites;++i){
        unsigned row=i/columns,column=i%columns;
        double x=1.6*column,y=-1.6*row;std::string id=peps?"r"+std::to_string(row+1)+"c"+std::to_string(column+1):"site"+std::to_string(i+1);
        auto center=out.object("circle",id,num(x)+" "+num(y)+" 0.28");
        if(column+1<columns){auto next=peps?"r"+std::to_string(row+1)+"c"+std::to_string(column+2):"site"+std::to_string(i+2);out.connect(id+"_bond",center+".center",b.id+"."+next+".center");}
        if(row+1<rows)out.connect(id+"_bond_y",center+".center",b.id+".r"+std::to_string(row+2)+"c"+std::to_string(column+1)+".center");
        auto tip=out.object("point",id+"_physical_tip",center+".center");out.emit("move "+tip+(peps?" 0.55 0.6":" 0 0.95"));
        out.connect(id+"_physical",center+".center",tip+".center");
        std::string label="$A_{"+std::to_string(i+1)+"}$";
        if(!labels.empty()){
            if(labels[i].size()<2||labels[i].front()!='"'||labels[i].back()!='"')throw std::runtime_error("labels: stringhe richieste");
            label=labels[i].substr(1,labels[i].size()-2);
        }
        auto annotation=out.object("label",id+"_label",center+".center \""+label+"\"");
        if(!peps)out.emit("move "+annotation+" 0 -0.6");
    }
    out.group(-0.6,-1.6*(rows-1)-1,1.6*(columns-1)+0.85,1.2);
}

void bloch(const Block& b,Builder& out) {
    b.allow({"theta","phi"});
    auto angle=[](const std::string& s){if(s.size()<4)throw std::runtime_error("angolo richiesto con unita': deg oppure rad");auto unit=s.substr(s.size()-3);double v=real(s.substr(0,s.size()-3),-1e6,1e6);if(unit=="deg")return v*std::acos(-1.0)/180;if(unit=="rad")return v;throw std::runtime_error("unita' angolare attesa: deg, rad");};
    double theta=angle(b.get("theta","60deg")),phi=angle(b.get("phi","35deg"));
    if(theta<0||theta>std::acos(-1.0))throw std::runtime_error("theta deve essere tra 0 e 180deg");
    auto sphere=out.object("sphere","sphere","0 0 0 1");out.emit("fill "+sphere+" none");
    for(unsigned axis=0;axis<3;++axis){std::vector<std::array<double,3>> circle;for(unsigned i=0;i<=80;++i){double t=2*std::acos(-1.0)*i/80;std::array<double,3> v{0,0,0};v[(axis+1)%3]=std::cos(t);v[(axis+2)%3]=std::sin(t);circle.push_back(v);}auto name=out.path3("circle"+std::to_string(axis),circle);out.emit("linewidth "+name+" 0.25");out.emit("stroke "+name+" dashed");}
    out.path3("x",{{-1.2,0,0},{1.2,0,0}},true);out.path3("y",{{0,-1.2,0},{0,1.2,0}},true);out.path3("z",{{0,0,-1.2},{0,0,1.2}},true);
    auto state=out.path3("state",{{0,0,0},{std::sin(theta)*std::cos(phi),std::sin(theta)*std::sin(phi),std::cos(theta)}},true);
    out.emit("linewidth "+state+" 1.3");out.emit("color "+state+" 0.18 0.36 0.55");
    out.object("label3","zero","0 0 1.4 \"$\\vert0\\rangle$\"");out.object("label3","one","0 0 -1.4 \"$\\vert1\\rangle$\"");
    out.object("label3","plus","1.4 0 0 \"$\\vert+\\rangle$\"");out.object("label3","minus","-1.4 0 0 \"$\\vert-\\rangle$\"");
}
}
```

</details>

## src/packages/statmech.cpp

integration_options centralizza il contratto numerico. ising valida dimensione/reticolo/spin e genera legami e frecce nei rami 2D/3D. phase_flow converte dx/dy in una lambda derivata e crea path dalla Trajectory. phase_diagram costruisce regioni e curve schematiche. lorenz definisce il campo vettoriale e usa integrate<3>. Non confondere costruzione di un reticolo con campionamento termodinamico.

<details>
<summary>Codice reale completo: src/packages/statmech.cpp</summary>

```cpp
#include "common.hpp"
#include "../numerics.hpp"
#include <tuple>
namespace pyxis::packages {
namespace {
numerics::Options integration_options(const Block& b, double duration, unsigned steps) {
    numerics::Options options;
    options.duration=duration; options.steps=steps;
    auto method=b.get("integrator","rk4");
    if(method!="rk4"&&method!="adaptive") throw std::runtime_error("integrator: rk4 oppure adaptive");
    options.adaptive=method=="adaptive";
    for(const auto& key:{"abs-tol","rel-tol","max-step","max-steps"})
        if(!options.adaptive&&b.properties.count(key)) throw std::runtime_error(std::string(key)+" richiede integrator: adaptive");
    options.absolute_tolerance=real(b.get("abs-tol","1e-8"),1e-14,1);
    options.relative_tolerance=real(b.get("rel-tol","1e-6"),0,1);
    options.maximum_step=real(b.get("max-step",num(duration/steps)),1e-12,1e4);
    options.maximum_steps=integer(b.get("max-steps","9999"),1,9999);
    return options;
}
}
void ising(const Block& b,Builder& out) {
    b.allow({"rows","columns","state","spins","dimension","layers"});
    unsigned rows=integer(b.get("rows","4"),1,32), cols=integer(b.get("columns","4"),1,32);
    unsigned dimension=integer(b.get("dimension","2"),2,3),layers=dimension==3?integer(b.get("layers","3"),1,16):1;
    if(dimension==2&&b.properties.count("layers"))throw std::runtime_error("layers richiede dimension: 3");
    if(dimension==3&&rows*cols*layers>512)throw std::runtime_error("Ising 3D: massimo 512 siti");
    auto state=b.get("state","up");
    if(state!="up"&&state!="down"&&state!="checkerboard"&&state!="domains")throw std::runtime_error("state: up, down, checkerboard, domains");
    auto spins=b.properties.count("spins")?list(b.get("spins")):std::vector<std::string>{};
    if(!spins.empty()&&spins.size()!=rows*cols*layers)throw std::runtime_error("spins: un valore +1 o -1 per sito, per strati e righe");
    if(dimension==3){
        for(unsigned layer=0;layer<layers;++layer)for(unsigned r=0;r<rows;++r)for(unsigned c=0;c<cols;++c){
            std::string id="l"+std::to_string(layer+1)+"r"+std::to_string(r+1)+"c"+std::to_string(c+1);
            std::array<double,3> p{static_cast<double>(c),-static_cast<double>(r),static_cast<double>(layer)};
            auto bond=[&](const std::string& suffix,unsigned axis,double delta){auto q=p;q[axis]+=delta;auto name=out.path3(id+suffix,{p,q});out.emit("linewidth "+name+" 0.2");out.emit("color "+name+" 0.65 0.65 0.65");};
            if(c+1<cols)bond("_bond_x",0,1);
            if(r+1<rows)bond("_bond_y",1,-1);
            if(layer+1<layers)bond("_bond_z",2,1);
            int sign=state=="down"?-1:state=="checkerboard"?((r+c+layer)%2?-1:1):state=="domains"?(c<cols/2?1:-1):1;
            if(!spins.empty()){auto spin=spins[(layer*rows+r)*cols+c];if(spin!="1"&&spin!="+1"&&spin!="-1")throw std::runtime_error("spin atteso: +1 o -1");sign=spin=="-1"?-1:1;}
            auto from=p,to=p;from[2]-=0.28*sign;to[2]+=0.28*sign;out.path3(id+"_spin",{from,to},true);
        }
        return;
    }
    for(unsigned r=0;r<rows;++r)for(unsigned c=0;c<cols;++c){
        std::string id="r"+std::to_string(r+1)+"c"+std::to_string(c+1);double x=c,y=-static_cast<double>(r);
        if(c+1<cols){auto l=out.line(id+"_bond_x",x,y,x+1,y);out.emit("stroke "+l+" dotted");}
        if(r+1<rows){auto l=out.line(id+"_bond_y",x,y,x,y-1);out.emit("stroke "+l+" dotted");}
        int sign=state=="down"?-1:state=="checkerboard"?((r+c)%2?-1:1):state=="domains"?(c<cols/2?1:-1):1;
        if(!spins.empty()){if(spins[r*cols+c]!="1"&&spins[r*cols+c]!="+1"&&spins[r*cols+c]!="-1")throw std::runtime_error("spin atteso: +1 o -1");sign=spins[r*cols+c]=="-1"?-1:1;}
        out.line(id+"_spin",x,y-0.3*sign,x,y+0.3*sign,true);
    }
    out.group(-0.6,-static_cast<double>(rows)+0.4,cols-0.4,0.6);
}

void phase_flow(const Block& b,Builder& out) {
    b.allow({"dx","dy","start","duration","steps","integrator","abs-tol","rel-tol","max-step","max-steps"});
    auto expression=[&](const std::string& key,const std::string& fallback){auto s=b.get(key,fallback);if(s.size()<2||s.front()!='"'||s.back()!='"')throw std::runtime_error("equazione tra virgolette richiesta: "+key);return s.substr(1,s.size()-2);};
    auto dx=expression("dx","\"y\""),dy=expression("dy","\"-x\"");
    auto initial=list(b.get("start","[1, 0]"));if(initial.size()!=2)throw std::runtime_error("start richiede due valori");
    double x=real(initial[0],-1e6,1e6),y=real(initial[1],-1e6,1e6);
    double duration=real(b.get("duration","6.283185307179586"),1e-6,1e4);unsigned steps=integer(b.get("steps","400"),4,9999);
    auto options=integration_options(b,duration,steps);
    auto derivative=[&](const std::array<double,2>& p,double t){std::unordered_map<std::string,double> vars{{"y",p[1]},{"t",t}};return std::array<double,2>{evaluate(dx,p[0],vars,{}),evaluate(dy,p[0],vars,{})};};
    auto trajectory=numerics::integrate<2>({x,y},options,derivative);
    std::vector<std::pair<double,double>> points;
    double left=x,right=x,bottom=y,top=y;
    for(const auto& p:trajectory.points){x=p[0];y=p[1];
        points.push_back({x,y});left=std::min(left,x);right=std::max(right,x);bottom=std::min(bottom,y);top=std::max(top,y);
    }
    out.path("orbit",points);out.emit("flow "+b.id+".orbit forward");
    out.object("point","caption",num((left+right)/2)+" "+num(bottom-0.5));
    out.group(left-0.5,bottom-0.5,right+0.5,top+0.5);
}

void phase_diagram(const Block& b,Builder& out) {
    b.allow({"model","melting","labels","point-labels","opacity"});
    if(b.get("model","schematic")!="schematic")throw std::runtime_error("phase-diagram: modello disponibile schematic");
    auto melting=b.get("melting","positive");if(melting!="positive"&&melting!="negative")throw std::runtime_error("melting: positive, negative");
    double alpha=real(b.get("opacity","0.22"),0,1);
    auto labels=b.properties.count("labels")?list(b.get("labels")):std::vector<std::string>{"\"Solid\"","\"Liquid\"","\"Gas\"","\"Supercritical\""};
    if(labels.size()!=4)throw std::runtime_error("labels: quattro stringhe per solid/liquid/gas/supercritical");
    for(auto& label:labels){if(label.size()<2||label.front()!='"'||label.back()!='"')throw std::runtime_error("labels: stringhe richieste");label=label.substr(1,label.size()-2);}
    auto pointLabels=b.properties.count("point-labels")?list(b.get("point-labels")):std::vector<std::string>{"\"TP\"","\"CP\""};
    if(pointLabels.size()!=2)throw std::runtime_error("point-labels: due stringhe per punto triplo e critico");
    for(auto& label:pointLabels){if(label.size()<2||label.front()!='"'||label.back()!='"')throw std::runtime_error("point-labels: stringhe richieste");label=label.substr(1,label.size()-2);}
    const double tx=2,ty=1.5,cx=4.6,cy=3.2,top=4.4,right=6;
    const double mx=melting=="positive"?2.65:1.1;
    std::vector<std::pair<double,double>> sublimation,vaporization;
    for(unsigned i=0;i<=40;++i){double t=static_cast<double>(i)/40;sublimation.push_back({tx*t,ty*t*t});vaporization.push_back({tx+(cx-tx)*t,ty+(cy-ty)*(0.65*t+0.35*t*t)});}
    auto region=[&](const std::string& id,std::vector<std::pair<double,double>> vertices,const std::string& color){
        std::string specification="\"";for(size_t i=0;i<vertices.size();++i){if(i)specification+=';';specification+=num(vertices[i].first)+" "+num(vertices[i].second);}auto name=out.object("region",id,specification+"\"");out.emit("color "+name+" "+color);out.emit("opacity "+name+" "+num(alpha));out.emit("outline "+name+" off");
    };
    auto solid=sublimation;solid.push_back({mx,top});solid.push_back({0,top});
    region("solid",solid,"0.25 0.45 0.7");
    auto liquid=vaporization;liquid.push_back({cx,top});liquid.push_back({mx,top});
    region("liquid",liquid,"0.3 0.65 0.48");
    auto gas=sublimation;gas.insert(gas.end(),vaporization.begin()+1,vaporization.end());gas.push_back({right,cy});gas.push_back({right,0});
    region("gas",gas,"0.9 0.64 0.2");
    region("supercritical",{{cx,cy},{right,cy},{right,top},{cx,top}},"0.62 0.46 0.7");
    out.path("sublimation",sublimation);out.path("vaporization",vaporization);out.line("melting",tx,ty,mx,top);
    out.line("temperature_axis",0,0,right+0.3,0,true);out.line("pressure_axis",0,0,0,top+0.3,true);
    out.label("temperature",right+0.25,-0.3,"$T$",true);out.label("pressure",-0.3,top+0.25,"$P$",true);
    out.label("solid_label",0.75,2.5,labels[0]);out.label("liquid_label",3.25,3.1,labels[1]);out.label("gas_label",3.8,0.65,labels[2]);out.label("supercritical_label",5.3,3.8,labels[3]);
    for(const auto& marker:std::vector<std::tuple<std::string,double,double>>{{"triple",tx,ty},{"critical",cx,cy}}){
        auto name=out.object("circle",std::get<0>(marker),num(std::get<1>(marker))+" "+num(std::get<2>(marker))+" 0.055");out.emit("nodefill "+name+" black");
        auto annotation=out.object("text",std::get<0>(marker)+"_label",name+".center \""+pointLabels[std::get<0>(marker)=="triple"?0:1]+"\"");out.emit("placement "+annotation+" auto se 4");
    }
    out.group(-0.5,-0.55,right+0.65,top+0.65);
}

void lorenz(const Block& b,Builder& out) {
    b.allow({"sigma","rho","beta","start","duration","steps","integrator","abs-tol","rel-tol","max-step","max-steps"});
    double sigma=real(b.get("sigma","10"),0.001,100),rho=real(b.get("rho","28"),0.001,100),beta=real(b.get("beta","2.6666666666666665"),0.001,100);
    auto initial=list(b.get("start","[1, 1, 1]"));if(initial.size()!=3)throw std::runtime_error("start richiede tre valori");
    std::array<double,3> p{real(initial[0],-1000,1000),real(initial[1],-1000,1000),real(initial[2],-1000,1000)};
    double duration=real(b.get("duration","30"),1e-4,100);unsigned steps=integer(b.get("steps","6000"),10,9999);double h=duration/steps;
    auto options=integration_options(b,duration,steps);
    if(!options.adaptive&&h>0.02)throw std::runtime_error("Lorenz: duration/steps deve essere <=0.02");
    if(options.adaptive&&options.maximum_step>0.02)throw std::runtime_error("Lorenz: max-step deve essere <=0.02");
    auto d=[&](const std::array<double,3>& v,double){return std::array<double,3>{sigma*(v[1]-v[0]),v[0]*(rho-v[2])-v[1],v[0]*v[1]-beta*v[2]};};
    auto trajectory=numerics::integrate<3>(p,options,d);
    auto name=out.path3("orbit",trajectory.points);out.emit("linewidth "+name+" 0.35");
}
}
```

</details>

## src/packages/relativity.cpp

penrose seleziona schematicamente Minkowski/Schwarzschild/Kerr sull’asse. embedding campiona la superficie di Flamm; light_cones costruisce coni tangenti in coordinate PG. geodesic valida il problema e definisce derivative/event per integrate<2>, poi converte u,phi in coordinate del foglio o vertici sull’embedding. Le scale sono definite dal modello, non da coordinate del renderer.

<details>
<summary>Codice reale completo: src/packages/relativity.cpp</summary>

```cpp
#include "common.hpp"
#include "../numerics.hpp"
namespace pyxis::packages {
void penrose(const Block& b,Builder& out) {
    b.allow({"metric","spin","bands"});auto metric=b.get("metric","minkowski");
    if(metric!="kerr"&&(b.properties.count("spin")||b.properties.count("bands")))throw std::runtime_error("spin/bands richiedono metric: kerr");
    if(metric=="kerr"){
        double spin=real(b.get("spin","0.7"),1e-6,0.999999);
        unsigned bands=integer(b.get("bands","3"),3,7);if(bands%2==0)throw std::runtime_error("Kerr: bands dispari (3,5,7)");
        int half=static_cast<int>(bands/2);
        for(int band=-half;band<=half;++band){
            double y=2*band;bool outer=band%2==0;std::string id="band"+std::to_string(band+half+1);
            out.path(id+"_right_infinity",{{1,y-1},{2,y},{1,y+1}});out.path(id+"_left_infinity",{{-1,y-1},{-2,y},{-1,y+1}});
            for(unsigned side=0;side<2;++side)for(unsigned future=0;future<2;++future){auto name=out.line(id+"_horizon"+std::to_string(side*2+future),0,y,side?-1:1,y+(future?1:-1));if(!outer)out.emit("stroke "+name+" dashed");}
            out.label(id+"_right",1.1,y,outer?"$r>r_+$":"$r<r_-$",true);out.label(id+"_left",-1.1,y,outer?"$r>r_+$":"$r<r_-$",true);
            out.label(id+"_right_spatial",2.35,y,outer?"$i^0_+$":"$i^0_-$",true);out.label(id+"_left_spatial",-2.35,y,outer?"$i^0_+$":"$i^0_-$",true);
            auto label=out.object("label",id+"_horizon_label",b.id+"."+id+"_horizon1.center \""+(outer?"$r_+$":"$r_-$")+"\"");out.emit("placement "+label+" auto n 4");
            if(band<half)out.label(id+"_between",0,y+1,"$r_-<r<r_+$",true);
        }
        double edge=2*half+1;
        out.label("continued_future",0,edge+0.4,"$\\vdots$",true);out.label("continued_past",0,-edge-0.4,"$\\vdots$",true);
        std::ostringstream spinLabel;spinLabel<<std::setprecision(8)<<spin;
        out.label("axis",0,-edge-1,"$\\theta=0,\\quad a/M="+spinLabel.str()+"$",true);
        out.label("regular",0,edge+1,"Kerr axis: r=0 regular");out.group(-2.8,-edge-1.5,2.8,edge+1.5);return;
    }
    if(metric=="schwarzschild"){
        out.path("right_infinity",{{1,1},{2,0},{1,-1}});out.path("left_infinity",{{-1,1},{-2,0},{-1,-1}});
        for(unsigned sign=0;sign<2;++sign){std::vector<std::pair<double,double>> zigzag;for(unsigned i=0;i<=40;++i){double x=-1+i*0.05,y=(sign?-1:1)+(i==0||i==40?0:(i%2?0.035:-0.035));zigzag.push_back({x,y});}out.path(sign?"past_singularity":"future_singularity",zigzag);}
        out.line("horizon1",-1,-1,1,1);out.line("horizon2",-1,1,1,-1);
        out.label("regionI",1,0,"I");out.label("regionII",0,0.55,"II");out.label("regionIII",-1,0,"III");out.label("regionIV",0,-0.55,"IV");
        out.label("future",0,1.3,"$r=0$",true);out.label("past",0,-1.3,"$r=0$",true);
        out.label("right",2.35,0,"$i^0$",true);out.label("left",-2.35,0,"$i^0$",true);
        out.label("null_future",1.7,0.7,"$\\mathcal{I}^+$",true);out.label("null_past",1.7,-0.7,"$\\mathcal{I}^-$",true);
        out.group(-2.8,-1.7,2.8,1.7);return;
    }
    if(metric!="minkowski")throw std::runtime_error("penrose: metriche implementate minkowski, schwarzschild, kerr (asse)");
    out.path("boundary",{{0,2},{2,0},{0,-2},{-2,0},{0,2}});
    out.label("future",0,2.35,"$i^+$",true);out.label("past",0,-2.35,"$i^-$",true);
    out.label("left",-2.35,0,"$i^0$",true);out.label("right",2.35,0,"$i^0$",true);
    out.label("null_future",1.35,1.35,"$\\mathcal{I}^+$",true);out.label("null_past",1.35,-1.35,"$\\mathcal{I}^-$",true);
    out.group(-2.8,-2.7,2.8,2.7);
}

void embedding(const Block& b,Builder& out) {
    b.allow({"metric","radius","extent","mesh","branch"});
    if(b.get("metric","schwarzschild")!="schwarzschild")throw std::runtime_error("embedding: metrica implementata schwarzschild (sezione equatoriale spaziale)");
    double rs=real(b.get("radius","1"),1e-4,1e4),extent=real(b.get("extent","4"),1.01,100);
    unsigned mesh=integer(b.get("mesh","16"),4,30);auto branch=b.get("branch","upper");if(branch!="upper"&&branch!="lower")throw std::runtime_error("branch: upper, lower");
    double sign=branch=="upper"?1:-1;std::string points="\"";
    // Use u=sqrt((r-r_s)/(r_max-r_s)): smooth sampling at the throat.
    for(unsigned i=0;i<=mesh;++i)for(unsigned j=0;j<=mesh*2;++j){
        double u=static_cast<double>(i)/mesh,r=rs*(1+(extent-1)*u*u),phi=2*std::acos(-1.0)*j/(mesh*2);
        if(i||j)points+=';';
        points+=num(r*std::cos(phi))+" "+num(r*std::sin(phi))+" "+num(sign*2*std::sqrt(rs*(r-rs)));
    }
    auto name=out.object("mesh3","surface",std::to_string(mesh+1)+" "+std::to_string(mesh*2+1)+" "+points+"\"");out.emit("fill "+name+" white");out.emit("linewidth "+name+" 0.25");
}

void light_cones(const Block& b,Builder& out) {
    b.allow({"metric","chart","radii","rows","height"});
    if(b.get("metric","schwarzschild")!="schwarzschild"||b.get("chart","painleve-gullstrand")!="painleve-gullstrand")throw std::runtime_error("light-cones: Schwarzschild in coordinate Painleve-Gullstrand ingoing");
    auto values=list(b.get("radii","[0.6, 1, 1.8, 3.2, 5]"));if(values.empty()||values.size()>16)throw std::runtime_error("radii: da 1 a 16 raggi in unita' r_s");
    unsigned rows=integer(b.get("rows","2"),1,8);double height=real(b.get("height","0.32"),0.01,0.5),maximum=1;
    std::vector<double> radii;for(const auto& value:values){double r=real(value,0.1,100);if(!radii.empty()&&r<=radii.back())throw std::runtime_error("radii devono essere crescenti");radii.push_back(r);maximum=std::max(maximum,r);}
    for(unsigned row=0;row<rows;++row)for(size_t i=0;i<radii.size();++i){
        double r=radii[i],time=1+row*1.25,flow=-std::sqrt(1/r);
        double dt=std::min(height,0.4*r/(1+std::abs(flow)));
        std::string id="row"+std::to_string(row+1)+"_cone"+std::to_string(i+1);
        out.line(id+"_ingoing",r,time,r+dt*(flow-1),time+dt,true);
        out.line(id+"_outgoing",r,time,r+dt*(flow+1),time+dt,true);
        out.path(id+"_rim",{{r+dt*(flow-1),time+dt},{r+dt*(flow+1),time+dt}});
    }
    double top=rows*1.25+0.75;
    auto horizon=out.line("horizon",1,0,1,top);out.emit("stroke "+horizon+" dashed");
    out.line("radius_axis",0,0,maximum+0.7,0,true);out.line("time_axis",0,0,0,top+0.35,true);
    out.label("radius_label",maximum+0.65,-0.3,"$r/r_s$",true);out.label("time_label",-0.35,top+0.2,"$t_{PG}/r_s$",true);
    out.label("horizon_label",1,top+0.25,"$r=r_s$",true);out.group(-0.6,-0.55,maximum+1,top+0.7);
}

void geodesic(const Block& b,Builder& out) {
    b.allow({"metric","kind","impact","extent","max-angle","max-step","abs-tol","rel-tol","max-steps","photon-sphere","view","mesh"});
    auto view=b.get("view","plane");if(view!="plane"&&view!="embedding")throw std::runtime_error("view: plane, embedding");
    if(view=="plane"&&b.properties.count("mesh"))throw std::runtime_error("mesh richiede view: embedding");
    auto photon=b.get("photon-sphere","on");if(photon!="on"&&photon!="off")throw std::runtime_error("photon-sphere: on, off");
    if(b.get("metric","schwarzschild")!="schwarzschild"||b.get("kind","null")!="null")throw std::runtime_error("geodesic: metrica Schwarzschild, geodetica nulla equatoriale");
    double impact=real(b.get("impact","3"),0.1,100),extent=real(b.get("extent","12"),2,1000),u=1/extent;
    double energy=1/(impact*impact)-u*u+u*u*u;if(energy<=0)throw std::runtime_error("impact/extent: il raggio iniziale non appartiene al ramo entrante consentito");
    numerics::Options options;options.adaptive=true;options.duration=real(b.get("max-angle","37.69911184307752"),0.01,100);
    options.maximum_step=real(b.get("max-step","0.01"),1e-6,0.05);options.absolute_tolerance=real(b.get("abs-tol","1e-10"),1e-14,1e-3);options.relative_tolerance=real(b.get("rel-tol","1e-10"),0,1e-3);options.maximum_steps=integer(b.get("max-steps","9999"),1,9999);
    auto derivative=[](const std::array<double,2>& p,double){return std::array<double,2>{p[1],1.5*p[0]*p[0]-p[0]};};
    auto event=[&](const std::array<double,2>& p,double){return p[0]>=1||(p[0]<=u&&p[1]<0);};
    auto trajectory=numerics::integrate<2>({u,std::sqrt(energy)},options,derivative,event);
    if(!trajectory.stopped)throw std::runtime_error("geodesic: max-angle raggiunto prima dell'uscita o dell'orizzonte; aumenta max-angle");
    std::vector<std::pair<double,double>> points;double left=-1,right=1,bottom=-1,top=1;
    for(size_t i=0;i<trajectory.points.size();++i){double r=1/trajectory.points[i][0],angle=trajectory.times[i];double x=r*std::cos(angle),y=r*std::sin(angle);points.push_back({x,y});left=std::min(left,x);right=std::max(right,x);bottom=std::min(bottom,y);top=std::max(top,y);}
    if(view=="embedding"){
        Block surface{"relativity.embedding",b.id,b.line,{{"extent",{num(extent),b.line}},{"mesh",{b.get("mesh","12"),b.line}}},{}};
        embedding(surface,out);
        std::vector<std::array<double,3>> lifted;
        for(const auto& p:points){double r=std::hypot(p.first,p.second);lifted.push_back({p.first,p.second,2*std::sqrt(std::max(0.0,r-1))+0.015});}
        auto ray=out.path3("ray",lifted,true);out.emit("linewidth "+ray+" 1.1");out.emit("color "+ray+" 0.15 0.32 0.55");
        std::vector<std::array<double,3>> rim;for(unsigned i=0;i<=96;++i){double angle=2*std::acos(-1.0)*i/96;rim.push_back({std::cos(angle),std::sin(angle),0.01});}out.path3("horizon",rim);
        if(photon=="on"){std::vector<std::array<double,3>> ring;for(unsigned i=0;i<=96;++i){double angle=2*std::acos(-1.0)*i/96;ring.push_back({1.5*std::cos(angle),1.5*std::sin(angle),std::sqrt(2.0)+0.01});}auto name=out.path3("photon_sphere",ring);out.emit("stroke "+name+" dashed");}
        out.object("label3","horizon_label","1.6 0 0 \"$r=r_s$\"");return;
    }
    auto horizon=out.object("circle","horizon","0 0 1");out.emit("nodefill "+horizon+" black");
    if(photon=="on"){auto sphere=out.object("circle","photon_sphere","0 0 1.5");out.emit("stroke "+sphere+" dashed");}
    out.path("ray",points);out.emit("flow "+b.id+".ray forward");
    out.object("point","caption",num((left+right)/2)+" "+num(bottom-0.5));out.group(left-0.5,bottom-0.6,right+0.5,top+0.5);
}
}
```

</details>

## src/numerics.hpp

Options specifica parametri; Trajectory<N> possiede stati/tempi e diagnostica. rk4 calcola un singolo passo. integrate gestisce durata, step doubling, rifiuti, evento e limiti. Gli algoritmi sono template perché N e il tipo della derivata vengono scelti dal modello. I risultati non contengono oggetti grafici.

<details>
<summary>Codice reale completo: src/numerics.hpp</summary>

```cpp
#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <vector>

namespace pyxis::numerics {
struct Options {
    bool adaptive = false;
    double duration = 1, absolute_tolerance = 1e-8, relative_tolerance = 1e-6;
    double maximum_step = 0.01;
    unsigned steps = 100, maximum_steps = 9999;
};
template<size_t N> struct Trajectory {
    std::vector<std::array<double,N>> points;
    std::vector<double> times;
    unsigned rejected_steps = 0;
    bool stopped = false;
};
template<size_t N, class Derivative>
std::array<double,N> rk4(const std::array<double,N>& y, double t, double h, Derivative& derivative) {
    auto add = [&](const auto& k, double scale) {
        auto value=y;
        for(size_t i=0;i<N;++i) value[i]+=scale*k[i];
        return value;
    };
    auto k1=derivative(y,t), k2=derivative(add(k1,h/2),t+h/2);
    auto k3=derivative(add(k2,h/2),t+h/2), k4=derivative(add(k3,h),t+h);
    auto next=y;
    for(size_t i=0;i<N;++i) {
        next[i]+=h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6;
        if(!std::isfinite(next[i])) throw std::runtime_error("integrazione: stato non finito");
    }
    return next;
}
template<size_t N, class Derivative>
Trajectory<N> integrate(std::array<double,N> y, const Options& options, Derivative derivative,
                        std::function<bool(const std::array<double,N>&,double)> event = {}) {
    if(!std::isfinite(options.duration)||options.duration<=0||options.steps==0||options.maximum_steps==0)
        throw std::runtime_error("integrazione: durata e numero di passi devono essere positivi");
    if(options.adaptive&&(!std::isfinite(options.maximum_step)||options.maximum_step<=0||
       !std::isfinite(options.absolute_tolerance)||options.absolute_tolerance<=0||
       !std::isfinite(options.relative_tolerance)||options.relative_tolerance<0))
        throw std::runtime_error("integrazione: passo massimo e tolleranze non validi");
    for(double value:y) if(!std::isfinite(value)||std::abs(value)>1e6)
        throw std::runtime_error("integrazione: stato iniziale non valido");
    Trajectory<N> result{{y},{0},0};
    if(event&&event(y,0)){result.stopped=true;return result;}
    double t=0, h=options.adaptive?options.maximum_step:options.duration/options.steps;
    unsigned attempts=0;
    while(t<options.duration) {
        if(++attempts>20*options.maximum_steps) throw std::runtime_error("integrazione: troppi tentativi, modifica tolleranze o durata");
        bool final=h>=options.duration-t;
        double step=std::min(h,options.duration-t);
        if(t+step==t) throw std::runtime_error("integrazione: passo sotto la precisione disponibile");
        auto next=rk4(y,t,step,derivative);
        double error=0;
        if(options.adaptive) {
            auto half=rk4(y,t,step/2,derivative);
            auto fine=rk4(half,t+step/2,step/2,derivative);
            for(size_t i=0;i<N;++i) {
                double scale=options.absolute_tolerance+options.relative_tolerance*std::max(std::abs(y[i]),std::abs(fine[i]));
                // RK4 local error scales as h^5: two half steps have 1/16
                // of the coarse error, so their estimate is (fine-coarse)/15.
                error=std::max(error,std::abs(fine[i]-next[i])/(15*scale));
            }
            next=fine;
            double factor=error==0?2:std::clamp(0.9*std::pow(error,-0.2),0.2,2.0);
            h=std::min(options.maximum_step,step*factor);
            if(error>1) { ++result.rejected_steps; continue; }
        }
        if(event&&event(next,t+step)){
            double lo=0,hi=step;
            auto advance=[&](double dt){auto value=rk4(y,t,dt,derivative);if(options.adaptive){auto half=rk4(y,t,dt/2,derivative);value=rk4(half,t+dt/2,dt/2,derivative);}return value;};
            for(unsigned iteration=0;iteration<48;++iteration){double mid=(lo+hi)/2;if(mid==lo||mid==hi)break;if(event(advance(mid),t+mid))hi=mid;else lo=mid;}
            step=hi;next=advance(step);result.stopped=true;
        }
        for(double value:next) if(std::abs(value)>1e6) throw std::runtime_error("integrazione divergente: stato oltre 1e6");
        if(result.points.size()>=(options.adaptive?options.maximum_steps:options.steps)+1)
            throw std::runtime_error("integrazione: limite di passi raggiunto prima della durata richiesta");
        y=next;
        // Fixed stepping uses integer multiples to avoid a spurious tiny last step.
        t=result.stopped?t+step:final?options.duration:options.adaptive?t+step:result.points.size()*(options.duration/options.steps);
        result.points.push_back(y); result.times.push_back(t);
        if(result.stopped)return result;
    }
    return result;
}
}
```

</details>

## src/asymptote_geometry.hpp

clipping_library restituisce una raw string. Al suo interno pyxis_text_box e pyxis_trim sono funzioni Asymptote: rispettivamente misurano il bordo del testo nel frame fisico e selezionano il percorso fra le intersezioni dei nodi. Non sono funzioni eseguite dal compilatore C++.

<details>
<summary>Codice reale completo: src/asymptote_geometry.hpp</summary>

```cpp
#pragma once
#include <string>
namespace pyxis {
inline std::string clipping_library() {
    return R"ASY(
// Cut the actual Bezier/wave path, preserving tangents and arrow geometry.
path pyxis_text_box(frame glyph, pair anchor, transform t, real margin=1.5) {
  pair padding=(margin,margin);
  return box(t*anchor+min(glyph)-padding,t*anchor+max(glyph)+padding);
}
path pyxis_trim(path curve, path first, path last, string objectName) {
  real lo=0, hi=length(curve);
  if(length(first)>0) {
    real[][] hits=intersections(curve,first);
    if(hits.length==0) abort("clip: no exit from starting node of "+objectName);
    lo=infinity;
    for(real[] hit:hits) lo=min(lo,hit[0]);
  }
  if(length(last)>0) {
    real[][] hits=intersections(curve,last);
    if(hits.length==0) abort("clip: no entry into ending node of "+objectName);
    hi=-infinity;
    for(real[] hit:hits) hi=max(hi,hit[0]);
  }
  if(lo>=hi) abort("clip: endpoint nodes cover the path of "+objectName);
  return subpath(curve,lo,hi);
}
)ASY";
}
}
```

</details>

## src/asymptote_labels.hpp

automatic_label_library restituisce una raw string Asymptote. pyxis_bbox_overlap/pyxis_box_area sono valutazioni di rettangoli; pyxis_auto_labels misura i testi, riserva spazio, costruisce ostacoli e differisce il posizionamento al frame finale. I candidati vengono valutati greedy; le frecce native sono incluse nei costi. È un algoritmo grafico basato su misure TeX, non sul numero di lettere.

<details>
<summary>Codice reale completo: src/asymptote_labels.hpp</summary>

```cpp
#pragma once
#include <string>
namespace pyxis {
inline std::string automatic_label_library() {
    return R"ASY(
// Labels use TeX glyph bounds in physical bp, after the final picture transform.
pair[] pyxis_auto_centers;
path[] pyxis_auto_boxes;
path[] pyxis_auto_heads;
int[] pyxis_auto_directions;
real[] pyxis_auto_scores;
transform pyxis_auto_transform;

bool pyxis_bbox_overlap(path a, path b, real padding=0) {
  pair lo=min(a),hi=max(a),bl=min(b),bh=max(b);
  return hi.x+padding>=bl.x && bh.x+padding>=lo.x &&
         hi.y+padding>=bl.y && bh.y+padding>=lo.y;
}
real pyxis_box_area(path a, path b) {
  pair lo=min(a),hi=max(a),bl=min(b),bh=max(b);
  return max(0,min(hi.x,bh.x)-max(lo.x,bl.x))*
         max(0,min(hi.y,bh.y)-max(lo.y,bl.y));
}
void pyxis_auto_labels(string[] texts, pair[] anchors, path[] owners,
                       int[] preferences, real[] gaps,
                       path[] strokes, real[] widths, int[] arrows, path[] nodes,
                       string[] fixedTexts, pair[] fixedAnchors) {
  frame[] glyphs,fixedGlyphs;
  pen labelPen=currentpen;
  for(int i=0;i<texts.length;++i) {
    frame glyph; label(glyph,texts[i],(0,0),p=labelPen);
    pair dimensions=max(glyph)-min(glyph);
    if(!(dimensions.x>0 && dimensions.y>0))
      abort("automatic label has no visible glyphs: "+texts[i]);
    glyphs.push(glyph);
    pair lo=anchors[i],hi=anchors[i];
    if(length(owners[i])>0) {
      pair nl=min(owners[i]),nh=max(owners[i]);
      lo=(min(lo.x,nl.x),min(lo.y,nl.y));hi=(max(hi.x,nh.x),max(hi.y,nh.y));
    }
    // Reserve every allowed placement in the fitting bounds. Text never scales.
    pair margin=dimensions+(gaps[i],gaps[i]);
    currentpicture.addBox(lo,hi,-margin,margin);
  }
  for(string text:fixedTexts) {
    frame glyph; label(glyph,text,(0,0),p=labelPen); fixedGlyphs.push(glyph);
  }
  currentpicture.add(new void(frame f, transform t) {
    path[] used,physicalStrokes,physicalNodes;
    pyxis_auto_heads.delete();
    real[] physicalWidths;
    for(int j=0;j<strokes.length;++j) {
      path stroke=t*strokes[j];physicalStrokes.push(stroke);physicalWidths.push(widths[j]);
      if(arrows[j]>0 && arclength(stroke)>realEpsilon) {
        path g=(arrows[j]==3 || arrows[j]==4)?reverse(stroke):stroke;
        pen p=linewidth(widths[j]);
        real size=min(arrowsizelimit*arclength(g),arrowsize(p));
        real position=(arrows[j]==1 || arrows[j]==4)?length(g):arctime(g,0.5*arclength(g)+0.5*size);
        size=min(arrowsizelimit*arclength(subpath(g,position,0)),size);
        path head=DefaultHead.head(g,position,p,size);
        pyxis_auto_heads.push(head);
        physicalStrokes.push(head);physicalWidths.push(widths[j]);physicalNodes.push(head);
      }
    }
    for(path node:nodes) physicalNodes.push(t*node);
    for(int i=0;i<fixedGlyphs.length;++i) {
      pair lo=min(fixedGlyphs[i]),hi=max(fixedGlyphs[i]);
      if(hi.x>lo.x && hi.y>lo.y) {
        pair at=t*fixedAnchors[i]; used.push(box(at+lo,at+hi));
      }
    }
    // Reset per fit; picture.fit() may call this closure more than once.
    pyxis_auto_centers.delete();pyxis_auto_boxes.delete();
    pyxis_auto_directions.delete();pyxis_auto_scores.delete();
    pyxis_auto_transform=t;
    pair[] directions={(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1),(-1,0),(-1,1)};
    for(int i=0;i<glyphs.length;++i) {
      pair at=t*anchors[i],lo=at,hi=at;
      if(length(owners[i])>0) {path owner=t*owners[i];lo=min(owner);hi=max(owner);}
      pair half=(max(glyphs[i])-min(glyphs[i]))/2;
      real best=infinity;pair selected=at;path selectedBox=nullpath;int selectedDirection=0;
      for(int rank=0;rank<8;++rank) {
        int index=(preferences[i]+rank)%8;pair d=directions[index];
        real cx=at.x,cy=at.y;
        if(d.x>0)cx=max(at.x,hi.x)+half.x+gaps[i];
        if(d.x<0)cx=min(at.x,lo.x)-half.x-gaps[i];
        if(d.y>0)cy=max(at.y,hi.y)+half.y+gaps[i];
        if(d.y<0)cy=min(at.y,lo.y)-half.y-gaps[i];
        pair candidate=(cx,cy);
        path area=box(candidate-half,candidate+half);
        // Conservative 1 bp safety area around the measured ink box.
        path clearance=box(candidate-half-(1,1),candidate+half+(1,1));
        real score=0.001*rank;
        for(path occupied:used) score+=1e8*pyxis_box_area(clearance,occupied);
        for(path node:physicalNodes) {
          if(!pyxis_bbox_overlap(clearance,node))continue;
          if(inside(node,candidate))score+=1e7;
        }
        for(int j=0;j<physicalStrokes.length;++j) {
          path stroke=physicalStrokes[j];real padding=physicalWidths[j]/2;
          if(!pyxis_bbox_overlap(clearance,stroke,padding))continue;
          path padded=box(min(clearance)-(padding,padding),max(clearance)+(padding,padding));
          int hits=intersections(padded,stroke).length;
          if(inside(padded,point(stroke,0)))hits+=2;
          score+=1e5*hits;
        }
        if(score<best) {best=score;selected=candidate;selectedBox=area;selectedDirection=index;}
      }
      pair glyphCenter=(min(glyphs[i])+max(glyphs[i]))/2;
      add(f,shift(selected-glyphCenter)*glyphs[i]);
      used.push(selectedBox);
      pyxis_auto_centers.push(selected);pyxis_auto_boxes.push(selectedBox);
      pyxis_auto_directions.push(selectedDirection);pyxis_auto_scores.push(best);
    }
  },true);
}
)ASY";
}
}
```

</details>

## tests/core.cpp

Questo file non è una funzione dell’applicazione: è il programma di verifica C++. I test richiamano il nucleo senza VS Code. Comprendono input validi/invalidi, geometria, espansione dei modelli e numerica. Leggi ogni condizione come proprietà del comportamento atteso; quando cambi una regola, verifica prima se quel cambiamento è intenzionale.

<details>
<summary>Codice reale completo: tests/core.cpp</summary>

```cpp
#include "pyxis.hpp"
#include "expression.hpp"
#include "numerics.hpp"
#include <cmath>
#include <iostream>
#include <sstream>
#include <stdexcept>

void check(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void rejects(const char* source) {
    std::istringstream input(source);
    bool failed = false;
    try { pyxis::parse(input); } catch (const std::runtime_error&) { failed = true; }
    check(failed, source);
}
int main() {
    try {
        std::istringstream input("circle S 0 0 1\nline L 0 0 2 3\nmove L 4 -2\nlabel T 0 1 \"$\\alpha$\" # comment\n");
        auto scene = pyxis::parse(input);
        std::istringstream regionSource("point A 0 0\npoint B 2 0\npoint C 1 1\nregion R {\n points: \"A.center;B.center;C.center\"\n color: (0.2,0.4,0.6)\n opacity: 0.3\n outline: off\n}\n");
        auto regionScene=pyxis::parse(regionSource);
        check(regionScene.objects[3].region&&regionScene.objects[3].points.size()==4,"region closes anchored vertices");
        auto regionAsy=pyxis::asymptote(regionScene);
        check(regionAsy.find("--cycle,rgb(")!=std::string::npos&&regionAsy.find("+opacity(")!=std::string::npos,"regions generate cyclic vector fills with transparency");
        rejects("region R \"0 0;1 0;2 0\"\n");
        rejects("region R \"0 0;3 3;0 3;2 0;4 1\"\n");
        rejects("region R \"0 0;1 0;1 0;0 1\"\n");
        rejects("region R \"0 0;1 0;0 1\"\nopacity R 2\n");
        rejects("line L\nopacity L 0.3\n");
        std::istringstream course("profile quantum\nuse qft\ncircuit B {\n q0: H\n}\nfeynman F {\n}\n");
        auto courseScene=pyxis::parse(course);check(courseScene.packages.size()==2,"course profile permits additional packages");
        rejects("profile unknown\n");
        std::istringstream research("profile research\nuse qft\n");check(pyxis::parse(research).packages.size()==4,"research profile imports all packages without duplicates");
        check(scene.objects.size() == 3, "object count");
        check(scene.objects[1].x == 4 && scene.objects[1].y == -2 && scene.objects[1].a == 6 && scene.objects[1].b == 1, "line translation");
        check(scene.objects[2].text == "$\\alpha$", "LaTeX preservation");
        check(pyxis::asymptote(scene).find("$\\\\alpha$") != std::string::npos, "Asymptote escaping");
        rejects("circle S 0 0 -1");
        rejects("ellipse E 0 0 1 0");
        rejects("circle S 0 0 1\ncircle S 1 1 2");
        rejects("move unknown 1 2");
        rejects("circle S 0 0 1 extra");
        rejects("circle S 0 0");
        rejects("label T 0 0 \"unclosed");
        rejects("circle S 0 0 nan");
        rejects("circle S 1e308 0 1\nmove S 1e308 0");
        check(pyxis::evaluate("-2^2", 0, {}, {}) == -4, "power before unary minus");
        check(pyxis::evaluate("2^3^2", 0, {}, {}) == 512, "right associative powers");
        check(std::abs(pyxis::evaluate("sin(pi/2)+sqrt(4)", 0, {}, {}) - 3) < 1e-12, "math functions");
        std::istringstream plot("let a \"2\"\nfunction wave \"a*sin(x)\"\nplot P 0 3.141592653589793 3 \"wave(x)\"\n");
        auto curve = pyxis::parse(plot);
        check(curve.objects[0].points.size() == 3, "sample count");
        check(std::abs(curve.objects[0].points[1].second - 2) < 1e-12, "user function");
        rejects("plot P 0 1 2 \"sqrt(-1)\"");
        rejects("plot P 0 1 2 \"1/0\"");
        rejects("plot P 0 1 1 \"x\"");
        rejects("plot P 0 1 2 \"unknown(x)\"");
        rejects("function f \"f(x)\"\nplot P 0 1 2 \"f(x)\"");
        std::istringstream anchored("circle S 0 0 1\narrow A -2 2 S.north\nmove S 3 4\ntext T S.east \"100%\"\n");
        auto annotation = pyxis::parse(anchored);
        check(annotation.objects[1].a == 3 && annotation.objects[1].b == 5, "arrow follows translated object");
        check(annotation.objects[2].x == 4 && annotation.objects[2].y == 4, "anchored text");
        check(pyxis::asymptote(annotation).find(",Arrow)") != std::string::npos, "arrow head export");
        check(pyxis::asymptote(annotation).find("100\\\\%") != std::string::npos, "plain text escaping");
        rejects("arrow A B.start B.end\narrow B A.start A.end");
        rejects("circle S 0 0 1\narrow A 0 2 S.typo");
        rejects("arrow A 0 2 missing.north");
        std::istringstream defaults("circle S\nellipse E\nline L\ntext T \"Centro\"\n");
        auto centered = pyxis::parse(defaults);
        check(centered.objects[0].x == 0 && centered.objects[0].y == 0 && centered.objects[0].a == 1, "default circle");
        check(centered.objects[1].a == 1 && centered.objects[1].b == 0.5, "default ellipse");
        check(centered.objects[2].x == -0.5 && centered.objects[2].a == 0.5, "default centered line");
        check(centered.objects[3].x == 0 && centered.objects[3].y == 0, "default text");
        std::istringstream paths("grid 0.5\npath P @A4 @D2 @G4\nstroke P dashed\nmarkers P triangle hollow 0.1\nbend P 0.4\narrow A @B1 P.node2\nmove P 1 0\n");
        auto drawing = pyxis::parse(paths);
        check(drawing.objects[0].points[0].first == -0.5 && drawing.objects[0].points[1].second == 1, "grid anchored vertices and move");
        check(drawing.objects[1].a == 1 && drawing.objects[1].b == 1, "arrow follows path vertex");
        auto exported = pyxis::asymptote(drawing);
        check(exported.find("..controls ") != std::string::npos && exported.find("+dashed") != std::string::npos, "curved dashed path");
        check(exported.find("--cycle,white") != std::string::npos, "hollow triangle markers");
        check(exported.find("preview-only") == std::string::npos, "grid excluded from export");
        check(pyxis::asymptote(drawing, true).find("preview-only") != std::string::npos, "grid included in preview");
        std::istringstream custom("symbol star \"0 1;0.3 0.3;1 0;0.3 -0.3;0 -1;-0.3 -0.3;-1 0;-0.3 0.3\"\npath P \"-1 0;1 0\"\nmarkers P star\ncurve P 1 -1 1 1 -1\nmove P 2 0\n");
        auto symbol_scene = pyxis::parse(custom);
        check(symbol_scene.symbols.at("star").size() == 8, "custom polygon symbol");
        check(symbol_scene.objects[0].controls[0].first.first == 1, "control moves with path");
        check(pyxis::asymptote(symbol_scene).find("..controls (1,1) and (3,-1)..") != std::string::npos, "free Bezier controls");
        rejects("path P @A4");
        rejects("line L @H1 @A1");
        rejects("path P @A4 @G4\ncurve P 2 0 0 1 1");
        rejects("path P @A4 @G4\nmarkers P unknown");
        rejects("symbol S \"0 0;1 0\"");
        rejects("circle S\nbend S 1");
        rejects("grid 0");
        rejects("path P P.node1 @A1");
        std::istringstream wave("circle A @A4 0.2\ncircle B @G4 0.2\nline L A.center B.center\nwave L 0.3 3\nmove B 1 0\n");
        auto serpentine = pyxis::parse(wave);
        check(serpentine.objects[2].x == -3 && serpentine.objects[2].a == 4 && serpentine.objects[2].wave_turns == 3, "wave retains anchored endpoints");
        check(pyxis::asymptote(serpentine).find("..controls ") != std::string::npos, "wave Bezier output");
        rejects("line L\nwave L 0.2 0");
        std::istringstream spatial("camera 0 0 1\nsurface F -1 1 -1 1 2 \"x^2+y^2\"\nsphere S 0 0 1 0.2\nmove3 S 1 2 3\n");
        auto space = pyxis::parse(spatial);
        check(space.objects[0].heights.size() == 9 && space.objects[0].heights[4] == 0, "two-variable surface samples");
        check(space.objects[1].x == 1 && space.objects[1].y == 2 && space.objects[1].z == 4, "3D translation");
        check(pyxis::asymptote(space).find("settings.render=0") != std::string::npos, "vector 3D mode");
        rejects("camera 0 0 0");
        rejects("surface F -1 1 -1 1 2 \"sqrt(-1)\"");
        rejects("sphere S -1");
        std::istringstream declarations("circle A {\n radius: 0.2\n center: @A4\n}\nline L {\n to: @G4\n from: A.center\n path: wave(0.3,3)\n markers: circle(hollow,0.1)\n}\n");
        auto declarative = pyxis::parse(declarations);
        check(declarative.objects[0].x == -3 && declarative.objects[1].wave_turns == 3, "declarative object properties");
        rejects("circle S {\n radius: 1\n radius: 2\n}\n");
        rejects("circle S {\n raduis: 1\n}\n");
        rejects("circle S {\n radius: 1\n");
        std::istringstream offset_block("circle S {\n center: @D4\n radius: 1\n offset: (2,3)\n}\n");
        auto translated_block = pyxis::parse(offset_block);
        check(translated_block.objects[0].x == 2 && translated_block.objects[0].y == 3, "declarative offset preserves anchor");
        std::istringstream minimal("sphere S {\n radius: 1\n detail: outline\n}\n");
        auto minimal_scene = pyxis::parse(minimal);
        auto minimal_export = pyxis::asymptote(minimal_scene);
        check(minimal_export.find("meshpen=nullpen") != std::string::npos && minimal_export.find("*unitsphere,white") != std::string::npos, "monochrome sphere without triangulation");
        rejects("sphere S\ndetail S dense");
        std::istringstream widths("surface F {\n formula: \"0\"\n stroke-width: 0.2\n fill: none\n}\nsphere S {\n shading: 0.12\n stroke-width: 0.4\n}\n");
        auto styled = pyxis::parse(widths);
        check(styled.objects[0].stroke_width == 0.2 && styled.objects[1].shading == 0.12, "editable scientific styling");
        check(pyxis::asymptote(styled).find("normal=Z") == std::string::npos, "minimal sphere without equator");
        rejects("sphere S\nshading S -1");
        rejects("line L\nlinewidth L 0");
        std::istringstream packages(
            "use qft, quantum, relativity, statmech\ntheme: overleaf-classic\n"
            "feynman scatter {\n channel: s\n}\n"
            "quantum.circuit bell {\n q0: H, control(pair)\n q1: _, target(pair), M\n}\n"
            "place bell below scatter gap=2\n"
            "text note bell.q0_step1.north \"H gate\"\n"
            "statmech.ising spins {\n rows: 2\n columns: 3\n state: checkerboard\n}\n"
            "place spins right-of bell\n");
        auto sem = pyxis::parse(packages);
        check(sem.groups.size()==3 && sem.packages.size()==4,"packages and semantic groups");
        check(std::abs(sem.groups[1].top-(sem.groups[0].bottom-2))<1e-12,"semantic layout exact gap");
        check(std::abs(sem.groups[2].left-(sem.groups[1].right+1))<1e-12,"chained group layout");
        auto named=[&](const std::string& id)->const pyxis::Object&{for(const auto& o:sem.objects)if(o.name==id)return o;throw std::runtime_error("missing semantic object: "+id);};
        check(named("scatter.in1").flow=="forward" && named("scatter.in2").flow=="reverse","antiparticle flow");
        check(named("scatter.mediator").wave_turns>0,"photon semantic rendering");
        check(named("bell.q0_step1").kind==pyxis::Kind::GateBox,"gate glyph");
        check(named("bell.q0_step2").node_fill=="black","filled quantum control");
        check(named("note").y==named("bell.q0_step1").y+named("bell.q0_step1").b/2,"external anchor follows group placement");
        check(named("spins.r1c1_spin").b>named("spins.r1c1_spin").y && named("spins.r1c2_spin").b<named("spins.r1c2_spin").y,"alternating spin directions");
        auto semAsy=pyxis::asymptote(sem);
        check(named("scatter.in1_label").automatic_label,"QFT external labels use the common placement engine by default");
        check(semAsy.find("MidArrow")!=std::string::npos && semAsy.find("reverse(")!=std::string::npos,"fermion flow code");
        check(semAsy.find("filldraw(box(")!=std::string::npos,"gate fill masks underlying wire");
        rejects("qft.feynman F {\n channel: s\n}\n");
        rejects("use unknown\n");
        rejects("use qft\nfeynman F {\n channel: z\n}\n");
        rejects("use qft\nfeynman F {\n incoming: [electron]\n}\n");
        rejects("use quantum\ncircuit C {\n q0: control(p)\n q1: _\n}\n");
        rejects("use quantum\ncircuit C {\n q0: control(p)\n q1: _, target(p)\n}\n");
        rejects("use quantum\ncircuit C {\n q0: target(p)\n q1: target(p)\n}\n");
        rejects("use quantum\ncircuit C {\n q0: UNKNOWN\n}\n");
        std::istringstream oracleSource("profile quantum\ncircuit C {\n q0: control(f)\n q1: oracle(f,\"$U_f$\")\n q2: oracle(f,\"$U_f$\")\n}\n");
        auto oracleScene=pyxis::parse(oracleSource);bool oracleBox=false,oracleControl=false;
        for(const auto& o:oracleScene.objects){if(o.name=="C.oracle_f_1")oracleBox=o.kind==pyxis::Kind::GateBox&&std::abs(o.b-1.75)<1e-12;if(o.name=="C.link_f_1")oracleControl=o.background;}
        check(oracleBox&&oracleControl,"controlled oracle spans adjacent target qubits and masks background wires");
        rejects("profile quantum\ncircuit C {\n q0: oracle(f,\"U\")\n}\n");
        rejects("profile quantum\ncircuit C {\n q0: oracle(f,\"U\")\n q1: _\n q2: oracle(f,\"U\")\n}\n");
        rejects("profile quantum\ncircuit C {\n q0: oracle(f,\"U\")\n q1: oracle(f,\"V\")\n}\n");
        rejects("use statmech\nising S {\n spins: [0]\n}\n");
        std::istringstream spin3d("use statmech\nising S {\n dimension: 3\n rows: 2\n columns: 2\n layers: 2\n state: checkerboard\n}\n");
        auto spinCube=pyxis::parse(spin3d);unsigned spins3=0,bonds3=0;
        for(const auto& o:spinCube.objects){if(o.name.find("_spin")!=std::string::npos)++spins3;else ++bonds3;}
        check(spins3==8&&bonds3==12,"Ising cube has eight spins and twelve open bonds");
        for(const auto& o:spinCube.objects)if(o.name=="S.l1r1c1_spin")check(o.vertices3.back()[2]>o.vertices3.front()[2],"first 3D checkerboard spin points up");
        for(const auto& o:spinCube.objects)if(o.name=="S.l2r1c1_spin")check(o.vertices3.back()[2]<o.vertices3.front()[2],"checkerboard alternates between layers");
        rejects("use statmech\nising S {\n layers: 2\n}\n");
        rejects("use statmech\nising S {\n dimension: 3\n spins: [1]\n}\n");
        std::istringstream phases("profile statmech\nphase-diagram P {\n melting: negative\n}\n");
        auto phaseScene=pyxis::parse(phases);unsigned regionCount=0;
        for(const auto& o:phaseScene.objects)if(o.region){++regionCount;check(!o.outline,"phase regions do not draw artificial frame edges");}
        check(regionCount==4,"phase diagram contains four filled regions");
        auto phaseObject=[&](const std::string& id)->const pyxis::Object&{for(const auto& o:phaseScene.objects)if(o.name==id)return o;throw std::runtime_error("missing phase object");};
        check(phaseObject("P.sublimation").points.back()==phaseObject("P.vaporization").points.front(),"coexistence curves meet at triple point");
        check(phaseObject("P.vaporization").points.back().first==phaseObject("P.critical").x,"vaporization curve terminates at critical point");
        check(phaseObject("P.melting").a<phaseObject("P.melting").x,"negative melting slope selected semantically");
        rejects("profile statmech\nphase-diagram P {\n model: real-water\n}\n");
        rejects("use qft\nfeynman A {\n}\nfeynman B {\n}\nplace A below B\nplace B below A\n");
        rejects("use qft\nfeynman A {\n}\nplace A below missing\n");
        rejects("use qft\nfeynman A {\n}\nfeynman B {\n}\nplace A below B\nplace A above B\n");
        std::istringstream orbit("use statmech\nphase-flow O {\n steps: 400\n}\n");
        auto orbitScene=pyxis::parse(orbit);
        auto end=orbitScene.objects[0].points.back();
        check(std::abs(end.first-1)<1e-8&&std::abs(end.second)<1e-8,"RK4 oscillator returns to initial point");
        std::istringstream orbitFine("use statmech\nphase-flow O {\n steps: 800\n}\n");
        auto fine=pyxis::parse(orbitFine).objects[0].points.back();
        check(std::hypot(fine.first-1,fine.second)<std::hypot(end.first-1,end.second)/10,"RK4 step refinement converges");
        pyxis::numerics::Options adaptive;
        adaptive.adaptive=true; adaptive.duration=5; adaptive.maximum_step=1;
        adaptive.absolute_tolerance=1e-6; adaptive.relative_tolerance=0;
        auto decay=[](const std::array<double,2>& v,double t){return std::array<double,2>{-v[0],2*t};};
        auto loose=pyxis::numerics::integrate<2>({1,0},adaptive,decay);
        adaptive.absolute_tolerance=1e-10;
        auto tight=pyxis::numerics::integrate<2>({1,0},adaptive,decay);
        check(tight.rejected_steps>0,"adaptive integration rejects inaccurate trial steps");
        check(tight.times.back()==5&&std::abs(tight.points.back()[1]-25)<1e-11,"nonautonomous integration reaches exact final time");
        check(std::abs(tight.points.back()[0]-std::exp(-5))<std::abs(loose.points.back()[0]-std::exp(-5))/100,"adaptive tolerance refinement converges against exact solution");
        check(tight.points.size()>loose.points.size(),"tighter tolerance increases accepted sample count");
        for(size_t i=1;i<tight.times.size();++i)check(tight.times[i]>tight.times[i-1]&&tight.times[i]-tight.times[i-1]<=1,"accepted times increase and respect maximum step");
        pyxis::numerics::Options eventOptions;eventOptions.adaptive=true;eventOptions.duration=2;eventOptions.maximum_step=0.5;
        auto constant=[](const std::array<double,2>&,double){return std::array<double,2>{1,0};};
        auto located=pyxis::numerics::integrate<2>({0,0},eventOptions,constant,[](const std::array<double,2>& p,double){return p[0]>=0.37;});
        check(located.stopped&&std::abs(located.times.back()-0.37)<1e-12&&std::abs(located.points.back()[0]-0.37)<1e-12,"event localization stops at analytic crossing");
        std::istringstream adaptiveOrbit("use statmech\nphase-flow A {\n integrator: adaptive\n max-step: 0.3\n abs-tol: 1e-11\n rel-tol: 1e-11\n}\n");
        auto adaptiveEnd=pyxis::parse(adaptiveOrbit).objects[0].points.back();
        check(std::hypot(adaptiveEnd.first-1,adaptiveEnd.second)<1e-8,"adaptive oscillator closes against analytic solution");
        std::istringstream pendulum("use statmech\nphase-flow A {\n dx: \"y\"\n dy: \"-sin(x)\"\n start: [1.5,0]\n duration: 15\n integrator: adaptive\n abs-tol: 1e-9\n rel-tol: 1e-9\n max-step: 0.08\n}\n");
        auto pendulumScene=pyxis::parse(pendulum);
        for(auto p:pendulumScene.objects[0].points)check(std::abs(p.second*p.second/2+1-std::cos(p.first)-(1-std::cos(1.5)))<1e-6,"adaptive pendulum approximately conserves analytic energy");
        check(pendulumScene.objects[1].kind==pyxis::Kind::Point&&pendulumScene.objects[1].name=="A.caption","phase-flow exposes an invisible caption anchor");
        rejects("use statmech\nphase-flow A {\n integrator: unknown\n}\n");
        rejects("use statmech\nphase-flow A {\n abs-tol: 1e-8\n}\n");
        rejects("use statmech\nphase-flow A {\n integrator: adaptive\n abs-tol: 0\n}\n");
        rejects("use statmech\nphase-flow A {\n integrator: adaptive\n max-step: 0.1\n max-steps: 1\n}\n");
        rejects("use statmech\nphase-flow A {\n integrator: adaptive\n dx: \"sqrt(-1)\"\n}\n");
        std::istringstream bloch("use quantum\nbloch B {\n theta: 90deg\n phi: 0deg\n}\n");
        auto blochScene=pyxis::parse(bloch);
        for(const auto& o:blochScene.objects)if(o.name=="B.state"){
            const auto v=o.vertices3.back();check(std::abs(v[0]-1)<1e-12&&std::abs(v[1])<1e-12&&std::abs(v[2])<1e-12,"Bloch plus state");
        }
        check(pyxis::asymptote(blochScene).find("triple pyxis_c_0=")!=std::string::npos,"hierarchical names produce valid Asymptote identifiers");
        std::istringstream embedding("use relativity\nembedding F {\n mesh: 4\n}\n");
        auto embedded=pyxis::parse(embedding);
        const auto& mesh=embedded.objects[0];
        check(mesh.vertices3.size()==45,"polar surface sample count");
        check(mesh.vertices3.front()[0]==1&&mesh.vertices3.front()[2]==0,"Flamm throat at r_s");
        for(auto v:mesh.vertices3){double r=std::hypot(v[0],v[1]);check(std::abs(v[2]*v[2]-4*(r-1))<1e-11,"Flamm analytic embedding relation");}
        rejects("use relativity\nembedding E {\n metric: kerr\n}\n");
        rejects("use quantum\nbloch B {\n theta: 190deg\n}\n");
        rejects("use quantum\nbloch B {\n theta: 1\n}\n");
        rejects("mesh3 M 2 2 \"0 0 0;1 0 0\"");
        std::istringstream lorenz("use statmech\nlorenz L {\n start: [0,0,0]\n duration: 1\n steps: 100\n}\n");
        auto trajectory=pyxis::parse(lorenz);
        check(trajectory.objects[0].vertices3.size()==101,"Lorenz RK4 sample count");
        for(auto v:trajectory.objects[0].vertices3)check(v[0]==0&&v[1]==0&&v[2]==0,"Lorenz fixed point preserved");
        std::istringstream adaptiveLorenz("use statmech\nlorenz A {\n integrator: adaptive\n start: [0,0,0]\n duration: 1\n max-step: 0.02\n}\n");
        auto adaptiveEquilibrium=pyxis::parse(adaptiveLorenz);
        for(auto v:adaptiveEquilibrium.objects[0].vertices3)check(v[0]==0&&v[1]==0&&v[2]==0,"adaptive Lorenz preserves equilibrium");
        std::istringstream shortLorenz("use statmech\nlorenz A {\n duration: 0.5\n steps: 5000\n}\n");
        const auto reference=pyxis::parse(shortLorenz).objects[0].vertices3.back();
        std::istringstream adaptiveShort("use statmech\nlorenz A {\n integrator: adaptive\n duration: 0.5\n max-step: 0.02\n abs-tol: 1e-10\n rel-tol: 1e-10\n}\n");
        const auto adaptiveReference=pyxis::parse(adaptiveShort).objects[0].vertices3.back();
        for(size_t i=0;i<3;++i)check(std::abs(reference[i]-adaptiveReference[i])<1e-7,"adaptive Lorenz agrees with refined RK4 on short interval");
        rejects("use statmech\nlorenz A {\n integrator: adaptive\n max-step: 0.1\n}\n");
        std::istringstream loop("use qft\nfeynman F {\n loop: fermion\n}\n");
        auto bubble=pyxis::parse(loop);unsigned loopBranches=0;
        for(const auto& o:bubble.objects)if(o.name=="F.loop_upper"||o.name=="F.loop_lower"){
            ++loopBranches;check(o.points.size()==49,"loop sample count");
            check(std::abs(o.points.front().first+0.25)<1e-12&&std::abs(o.points.back().first-0.25)<1e-12,"loop joins mediator endpoints");
        }
        check(loopBranches==2,"self energy has two graph branches");
        std::istringstream photonLoop("profile qft\nfeynman F {\n loop: photon\n}\n");
        auto photonBubble=pyxis::parse(photonLoop);
        for(const auto& o:photonBubble.objects)if(o.name=="F.loop_upper")check(o.points.size()==193&&o.flow=="none"&&o.stroke=="solid","photon bubble uses sampled undulations without fermion flow");
        rejects("use qft\nfeynman F {\n loop: fermion\n loop-position: 0.05\n loop-radius: 0.3\n}\n");
        std::istringstream strong("use qft\nfeynman F {\n mediator: gluon\n}\n");
        auto gluon=pyxis::parse(strong);bool coil=false;
        for(const auto& o:gluon.objects)if(o.name=="F.mediator"){
            coil=o.kind==pyxis::Kind::Path&&o.points.size()>50;
            check(std::abs(o.points.front().first+0.7)<1e-12&&std::abs(o.points.back().first-0.7)<1e-12,"gluon meets exact vertices");
            for(auto p:o.points)check(p.first>=-0.7-1e-12&&p.first<=0.7+1e-12,"gluon stays inside vertex endpoints");
            check(std::abs(o.points[1].second)<0.001&&std::abs(o.points[o.points.size()-2].second)<0.001,"gluon smooth endpoint tangent");
            for(size_t i=0;i<o.points.size();++i){const auto& mirror=o.points[o.points.size()-1-i];check(std::abs(o.points[i].first+mirror.first)<1e-12&&std::abs(o.points[i].second-mirror.second)<1e-12,"gluon has matching tapers at both vertices");}
        }
        check(coil,"gluon sampled cycloidal coil");
        std::istringstream kruskal("use relativity\npenrose P {\n metric: schwarzschild\n}\n");
        auto conformal=pyxis::parse(kruskal);unsigned horizons=0,singularities=0;
        for(const auto& o:conformal.objects){if(o.name.rfind("P.horizon",0)==0)++horizons;if(o.name.find("singularity")!=std::string::npos)++singularities;}
        check(horizons==2&&singularities==2,"Schwarzschild maximal extension topology");
        std::istringstream kerrSource("profile relativity\npenrose K {\n metric: kerr\n spin: 0.7\n bands: 3\n}\n");
        auto kerrScene=pyxis::parse(kerrSource);unsigned innerHorizons=0,outerHorizons=0;
        for(const auto& o:kerrScene.objects)if(o.kind==pyxis::Kind::Line){if(o.stroke=="dashed")++innerHorizons;else ++outerHorizons;}
        check(innerHorizons==8&&outerHorizons==4,"Kerr axis window distinguishes outer and Cauchy horizons");
        for(const auto& o:kerrScene.objects)check(o.name.find("singularity")==std::string::npos,"Kerr rotation axis has no ring singularity border");
        rejects("profile relativity\npenrose K {\n metric: kerr\n spin: 1\n}\n");
        rejects("profile relativity\npenrose K {\n metric: kerr\n bands: 4\n}\n");
        std::istringstream nearExtreme("profile relativity\npenrose K {\n metric: kerr\n spin: 0.999999\n}\n");
        auto nearExtremeScene=pyxis::parse(nearExtreme);
        for(const auto& o:nearExtremeScene.objects)if(o.name=="K.axis")check(o.text.find("0.999999")!=std::string::npos,"subextremal spin caption must not round to extremal one");
        std::istringstream cones("profile relativity\nlight-cones C {\n radii: [0.5,1,2]\n rows: 1\n}\n");
        auto coneScene=pyxis::parse(cones);
        for(const auto& o:coneScene.objects){
            if(o.name=="C.row1_cone1_outgoing")check(o.a<o.x&&o.b>o.y,"inside horizon both future null directions decrease radius");
            if(o.name=="C.row1_cone2_outgoing")check(o.a==o.x&&o.b>o.y,"outgoing cone generator vertical at horizon");
            if(o.name=="C.row1_cone3_outgoing")check(std::abs((o.a-o.x)/(o.b-o.y)-(1-std::sqrt(0.5)))<1e-12,"outgoing null slope satisfies Painleve-Gullstrand metric");
        }
        std::istringstream scatteringRay("profile relativity\ngeodesic G {\n impact: 3\n}\n");
        auto rayScene=pyxis::parse(scatteringRay);
        for(const auto& o:rayScene.objects)if(o.name=="G.ray"){
            check(std::abs(std::hypot(o.points.back().first,o.points.back().second)-12)<1e-8,"scattered ray exits at initial radius");
            for(auto p:o.points)check(std::hypot(p.first,p.second)>1.5,"scattering above critical impact stays outside photon sphere");
        }
        std::istringstream capturedRay("profile relativity\ngeodesic G {\n impact: 2\n}\n");
        auto capturedScene=pyxis::parse(capturedRay);
        for(const auto& o:capturedScene.objects)if(o.name=="G.ray")check(std::abs(std::hypot(o.points.back().first,o.points.back().second)-1)<1e-8,"captured ray stops at horizon");
        rejects("profile relativity\ngeodesic G {\n impact: 3\n max-angle: 0.1\n}\n");
        rejects("profile relativity\ngeodesic G {\n kind: timelike\n}\n");
        rejects("profile relativity\nlight-cones C {\n radii: [2,1]\n}\n");
        std::istringstream liftedSource("profile relativity\ngeodesic G {\n impact: 3\n extent: 6\n view: embedding\n mesh: 4\n}\n");
        auto liftedScene=pyxis::parse(liftedSource);
        for(const auto& o:liftedScene.objects)if(o.name=="G.ray"){
            check(o.kind==pyxis::Kind::Arrow3,"embedding view produces a 3D ray");
            for(auto v:o.vertices3)check(std::abs((v[2]-0.015)*(v[2]-0.015)-4*(std::hypot(v[0],v[1])-1))<1e-10,"lifted null ray follows Flamm height with rendering offset");
        }
        std::istringstream dark("theme: blackboard\nuse quantum\ncircuit C {\n q0: H\n}\n");
        auto darkAsy=pyxis::asymptote(pyxis::parse(dark));
        check(darkAsy.find("defaultpen(white+")!=std::string::npos&&darkAsy.find("filltype=Fill(rgb(0.07,0.12,0.12))")!=std::string::npos,"blackboard ink and background");
        std::istringstream constrained(
            "line perpendicularLine {\n through: A.center\n perpendicular-to: baseline\n length: 4\n}\n"
            "circle tangent {\n tangent-to: A\n radius: 0.5\n direction: ne\n}\n"
            "circle A {\n radius: 1\n}\nline baseline 0 0 3 4\nmove A 2 -1\n"
            "line parallelLine {\n through: tangent.center\n parallel-to: baseline\n length: 2\n}\n");
        auto construction=pyxis::parse(constrained);
        const auto& perpendicularLine=construction.objects[0];const auto& tangent=construction.objects[1];const auto& parallelLine=construction.objects[4];
        check(std::abs((perpendicularLine.a-perpendicularLine.x)*3+(perpendicularLine.b-perpendicularLine.y)*4)<1e-12,"perpendicular direction dot product");
        check(std::abs((perpendicularLine.x+perpendicularLine.a)/2-2)<1e-12&&std::abs((perpendicularLine.y+perpendicularLine.b)/2+1)<1e-12,"through point follows moved dependency");
        check(std::abs(std::hypot(tangent.x-2,tangent.y+1)-1.5)<1e-12,"exact external circle tangency after move");
        check(std::abs((parallelLine.a-parallelLine.x)*4-(parallelLine.b-parallelLine.y)*3)<1e-12,"parallel direction cross product");
        check(std::abs(std::hypot(parallelLine.a-parallelLine.x,parallelLine.b-parallelLine.y)-2)<1e-12,"constraint length");
        rejects("parallel A 0 0 B 2\nparallel B 0 0 A 2\n");
        rejects("tangent-circle A B east 1\ntangent-circle B A east 1\n");
        rejects("line L 0 0 0 0\nparallel P 0 0 L 2\n");
        rejects("circle A\ntangent-circle B A wrong 1\n");
        rejects("circle A\ntangent-circle B A east 1\nmove B 1 0\n");
        rejects("circle A {\n center: @A4\n tangent-to: B\n}\n");
        rejects("line L {\n perpendicular-to: P\n}\n");
        rejects("line L\nbend L 1\nparallel P 0 0 L 2\n");
        std::istringstream clipping("circle A 0 0 1\nellipse B 4 0 1 0.5\narrow L {\n from: A.center\n to: B.center\n clip: nodes\n path: arc(0.3)\n}\n");
        auto clipped=pyxis::parse(clipping);
        check(clipped.objects[2].clip_start=="A"&&clipped.objects[2].clip_end=="B","clipping resolves endpoint node owners");
        check(clipped.objects[2].x==0&&clipped.objects[2].a==4,"clipping preserves topological anchors");
        auto clippedCode=pyxis::asymptote(clipped);
        check(clippedCode.find("intersections(curve,first)")!=std::string::npos&&clippedCode.find("subpath(curve,lo,hi)")!=std::string::npos,"clip uses actual path intersections");
        check(clippedCode.find("draw(pyxis_clipped_2,")!=std::string::npos,"arrow draws clipped path");
        rejects("line L\nclip L nodes\n");
        rejects("path P \"0 0;1 1\"\nclip P nodes\n");
        rejects("line L @A4 @G4\nclip L nodes\n");
        rejects("label T \"\"\nline L T.center 2 0\nclip L nodes\n");
        std::istringstream networks("use quantum\ntensor-network chain {\n sites: 2\n}\n"
            "tensor-network net {\n layout: peps\n rows: 2\n columns: 3\n}\n"
            "place net below chain gap=2\nmove net.r1c1 0.25 0.15\n");
        auto tensors=pyxis::parse(networks);
        auto tensorObject=[&](const std::string& id)->const pyxis::Object&{for(const auto& o:tensors.objects)if(o.name==id)return o;throw std::runtime_error("missing tensor object: "+id);};
        const auto& site=tensorObject("net.r1c1");const auto& bond=tensorObject("net.r1c1_bond");
        check(bond.x==site.x&&bond.y==site.y,"PEPS bond follows moved tensor inside translated group");
        check(bond.clip_start=="net.r1c1"&&bond.clip_end=="net.r1c2","PEPS bond clips both tensor boundaries");
        check(tensorObject("net.r1c1_label").x==site.x&&tensorObject("net.r1c1_label").y==site.y,"PEPS label follows node");
        check(std::abs(tensorObject("net.r1c1_physical_tip").x-site.x-0.55)<1e-12&&std::abs(tensorObject("net.r1c1_physical_tip").y-site.y-0.6)<1e-12,"physical leg follows node with retained offset");
        check(std::abs(tensors.groups[1].top-tensors.groups[0].bottom+2)<1e-12,"internal anchors do not double translate groups");
        unsigned bonds=0;for(const auto& o:tensors.objects)if(o.name.rfind("net.",0)==0&&o.name.find("_bond")!=std::string::npos)++bonds;
        check(bonds==7,"PEPS 2x3 has seven virtual bonds");
        rejects("use quantum\ntensor-network N {\n layout: peps\n sites: 3\n}\n");
        rejects("use quantum\ntensor-network N {\n rows: 3\n}\n");
        std::istringstream invisible("point A\npoint B A.center\nmove B 1 2\nline L A.center B.center\n");
        auto points=pyxis::parse(invisible);
        check(points.objects[1].x==1&&points.objects[1].y==2&&points.objects[2].a==1&&points.objects[2].b==2,"named invisible points retain relative coordinates");
        std::istringstream automaticText("circle C\nlabel T {\n at: C.center\n text: \"$p_1+p_2$\"\n placement: auto\n prefer: sw\n gap: 4\n}\n");
        auto labeling=pyxis::parse(automaticText);
        check(labeling.objects[1].automatic_label&&labeling.objects[1].label_preference=="sw"&&labeling.objects[1].label_gap_bp==4,"automatic label properties");
        auto labelingCode=pyxis::asymptote(labeling);
        check(labelingCode.find("label(glyph,texts[i]")!=std::string::npos&&labelingCode.find("new void(frame f, transform t)")!=std::string::npos,"labels measured through TeX in final physical coordinates");
        check(labelingCode.find("pyxis_label_owners.push(circle((0,0),1))")!=std::string::npos,"label knows associated node silhouette");
        rejects("label T \"label\"\nplacement T auto wrong 3\n");
        rejects("label T \"label\"\nplacement T auto n -1\n");
        rejects("label T \"\"\nplacement T auto\n");
        rejects("circle C\nplacement C auto\n");
        rejects("label T {\n text: \"x\"\n prefer: n\n}\n");
        rejects("label T \"x\"\nplacement T auto\nline L T.center 1 0\n");
        std::istringstream textClip("label A 0 0 \"$x$\"\nlabel B 4 0 \"$y$\"\narrow L A.center B.center\nclip L nodes\n");
        auto textClipped=pyxis::parse(textClip);check(textClipped.objects[2].clip_start=="A"&&textClipped.objects[2].clip_end=="B","fixed labels become clipping targets");
        check(pyxis::asymptote(textClipped).find("pyxis_text_box(pyxis_clip_glyph_2_first")!=std::string::npos,"text clipping deferred until final transform");
        std::istringstream fixedFeynman("use qft\nfeynman F {\n label-placement: fixed\n}\n");
        auto fixedDiagram=pyxis::parse(fixedFeynman);
        for(const auto& o:fixedDiagram.objects)if(o.kind==pyxis::Kind::Label)check(!o.automatic_label,"fixed QFT layout remains available");
        std::cout << "Tutti i test del nucleo, vincoli e pacchetti sono passati.\n";
        return 0;
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
```

</details>

