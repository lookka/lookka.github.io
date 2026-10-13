# Decisioni provvisorie di Pyxis

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

## Obiettivo

Creare figure scientifiche da tastiera senza interrompere gli appunti in VS Code.
Il sorgente `.pyxis` e' il progetto; SVG/PDF sono esportazioni.
Asymptote e' il backend scelto. L'anteprima usa inizialmente lo stesso backend:
misureremo i tempi prima di costruire un secondo renderer.

## Percorso dei dati

Editor Pyxis nella webview VS Code → sorgente → eseguibile C++ → scena →
generatore Asymptote → processo asy → SVG nell'anteprima / PDF negli appunti.

Il nucleo non dipende da VS Code. L'estensione gestisce interfaccia, processi,
salvataggio e inserimento attraverso le API dell'editor.

## Sintassi da discutere insieme

La prima sintassi posizionale serve a verificare l'intera catena. La proposta
successiva dovra' privilegiare termini espliciti e parametri nominati:

```text
# ESEMPI DI DESIGN: NON ANCORA IMPLEMENTATI
circle S center=(0,0) radius=1
label T at=S.north text="$S^2$"
move S by=(1,0)
rotate S angle=15deg axis=world.z
camera orbit azimuth=30deg elevation=20deg
view rotate angle=15deg
attach P to=S mode=rigid
detach P
```

- Un nome identifica sempre lo stesso oggetto all'interno del sorgente.
- Angoli geometrici con unita' esplicite; funzioni trigonometriche da documentare.
- `rotate` modifica un oggetto nello spazio, `camera` cambia il punto di vista,
  `view rotate` ruota il disegno sul foglio.
- Un ancoraggio e' un punto nominato ricalcolato dall'oggetto, non una coordinata copiata.
- `attach` stabilisce una dipendenza diretta; `detach` deve conservare la posa corrente.
- Ritaglio del disegno 2D e intersezione geometrica 3D sono operazioni distinte.
- Le dipendenze cicliche devono essere rifiutate, con un messaggio utile.

Prima di fissare queste forme, proveremo esempi di Feynman, livelli energetici,
Penrose, reticoli, circuiti quantistici e superfici. Sintassi corta e comprensibile:
le abbreviazioni saranno alias, non il solo modo di leggere un progetto.

La proposta Feynman e' in `FEYNMAN.md`; le altre famiglie di figure e i requisiti
comuni sono in `FIGURE-TEORICHE.md`. Questi documenti distinguono gli obiettivi
dalle capacita' gia' implementate. Percorso, tratto e marcatori sono componenti
indipendenti; i simboli poligonali personalizzati sono gia' supportati.

## Confini dello scheletro

Ci sono un primo valutatore matematico, curve campionate e ancoraggi di base.
Sono disponibili sfere, superfici z=f(x,y), mesh parametriche campionate,
camera ortografica ed etichette 3D. I quattro pacchetti semantici e i vincoli
direzionali/tangenza sono implementati; non c'e' ancora un risolutore generale
di vincoli simultanei. Funzionalita' attuali e limiti sono in PACCHETTI.md.
La struttura attuale permette di aggiungerli.
Non possiamo dichiarare adozione generale prima di prove con altri utenti.
La release 1.0 usa MIT per Pyxis e distribuisce un VSIX Windows x64; i backend
rimangono installazioni esterne con le proprie licenze. La pubblicazione remota
e' distinta dal pacchetto locale.

## Generalita' richiesta e ordine degli incrementi

1. Primitivi: punti, segmenti, frecce, curve, aree e testi.
2. Linguaggio: espressioni, funzioni con piu' argomenti, cicli, moduli e diagnostica.
3. Figure: stili, unita', ancoraggi, gruppi, layer e vincoli espliciti.
4. Dati: tabelle da file, assi, scale lineari/logaritmiche, legende e incertezze.
5. Geometria 3D: trasformazioni locali/mondiali, camera ortografica, superfici
   parametriche e z=f(x,y), sfere/piani e visibilita'.
6. Pacchetti: Feynman, livelli energetici, Penrose, reticoli, campi vettoriali,
   circuiti quantistici, varieta' e figure di relativita'.
7. Numerica: mappe, campionamento adattivo e ODE fornite dall'utente, con tolleranze
   e controlli di convergenza. Pyxis non deriva la fisica del problema.
8. Distribuzione: manuale, esempi, compatibilita' dei sorgenti, installazione
   riproducibile e prove con utenti esterni.

Le figure con superfici curve e sfere rappresentanti masse appartengono al punto 5.
Una superficie z=f(x,y) puo' essere una visualizzazione schematica; un diagramma
di embedding da una metrica richiede invece formule e ipotesi fisiche specificate.
Prima di implementare visibilita' proprietaria, sfrutteremo e verificheremo le
capacita' vettoriali del backend Asymptote. Floating horizon resta una possibilita'
specializzata per superfici altezza, non la soluzione generale per scene arbitrarie.

