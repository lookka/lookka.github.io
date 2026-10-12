# Generalita' di Pyxis: casi di verifica dell'architettura

Questo documento descrive gli obiettivi, non funzionalita' tutte gia' disponibili.
Feynman e' un pacchetto specializzato. Il nucleo deve poter sostenere altre
famiglie di figure senza imitare il modello Feynman quando non e' appropriato.

| Famiglia | Esempi | Capacita' comuni o specifiche necessarie |
| --- | --- | --- |
| QFT | Propagatori, loop, flussi, schemi di rinormalizzazione | Grafi, percorsi decorati, frecce, annotazioni e pacchetti |
| Relativita' | Penrose, coni di luce, diagrammi causali | Regioni, clipping, curve, stili, sistemi di coordinate |
| Geometria | Mappe, griglie deformate, geodetiche, campi | Funzioni multivariate, curve parametriche, numerica, trasformazioni |
| Superfici | Sfere, piani, embedding, z=f(x,y), masse schematiche | Coordinate 3D, camera, proiezione, visibilita' |
| Statistica | Reticoli, spin, fasi, curve critiche | Ripetizioni, simboli, dati, assi, legende e barre d'errore |
| Informazione quantistica | Circuiti, stati, canali, tensor network | Allineamento, porte e nodi composti, fili, gruppi |
| Meccanica quantistica | Livelli, transizioni, potenziali, funzioni d'onda | Curve, segmenti, frecce, formule ed etichette |
| Tesi e ricerca | Risultati numerici, confronti, figure multipannello | Import dati, scale, layout, dimensioni fisiche e riproducibilita' |

## Nucleo da consolidare

1. Percorsi e regioni geometriche, non un elenco chiuso di disegni.
2. Espressioni, funzioni, variabili, cicli e moduli.
3. Oggetti nominati, ancoraggi, gruppi e dipendenze esplicite.
4. Stili, marcatori e simboli riutilizzabili, anche personalizzati.
5. Coordinate, unita', trasformazioni e sistemi di riferimento.
6. Dati e calcolo numerico separati dalle convenzioni visive.
7. Scene 3D e proiezione separate dall'orientamento sul foglio.
8. Backend di anteprima/esportazione e integrazione con l'editor.

I punti della griglia sono riferimenti di costruzione, non elementi della figura
scientifica. I nodi di un percorso sono geometria; i simboli sui nodi sono
marcatori sostituibili. Una proprieta' fisica puo' scegliere uno stile tramite
un pacchetto, ma non deve eliminare l'accesso ai componenti geometrici sottostanti.

## Priorita' dopo il nuovo incremento 2D

- Rendere affidabili PDF ed etichette LaTeX sui backend del PC.
- Provare il flusso VS Code completo.
- Consolidare sintassi, diagnostica e trasformazioni.
- Aggiungere regioni, gruppi, funzioni multivariate e importazione dati.
- Introdurre scene 3D, camera e superfici usando prima il backend Asymptote.
- Costruire i pacchetti sulle primitive effettivamente verificate.

La rappresentazione schematica dello spaziotempo e un embedding derivato da una
metrica devono entrambi essere esprimibili: il secondo richiede formule fisiche
esplicite dell'utente. Il programma non sostituisce quella derivazione.
