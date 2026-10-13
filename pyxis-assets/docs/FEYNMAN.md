# Feynman: modelli implementati e proposta per grafi generali

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

Aggiornamento 0.2: i modelli 2→2 s/t/u e le bolle sul mediatore sono ora
implementati con sintassi descritta in PACCHETTI.md ed examples/qft.pyxis.
Le forme generali proposte nel resto di questo documento restano obiettivi.

Il pacchetto deve rendere rapide le modifiche a lezione. La struttura di base
e' un grafo con vertici e collegamenti nominati. Geometria, tipo di particella,
freccia di flusso, freccia di momento ed etichette sono proprieta' separate.

## Esempi di design, NON ancora eseguibili

```text
use feynman
vertex A @B4
vertex B @F4
fermion f A B
momentum f "$p$" A->B above
replace f photon
```

`replace` conserva nome, estremi, percorso e annotazioni. Il nuovo tipo sceglie
la sua convenzione visiva: una freccia fermionica non deve restare per errore
su una linea fotonica. Le etichette fisiche restano modificabili dall'utente.

Bosone non indica un unico stile: fotone ondulato, scalare tratteggiato e gluone
arricciato sono predefiniti diversi, con convenzioni modificabili.

```text
# Modifiche indipendenti
flow f reverse
bend f 0.5
move B to=@F2
replace f fermion
```

La linea puo' essere orizzontale, verticale od obliqua senza cambiare significato.
Il verso di flusso non si deduce dal lato destro/sinistro del foglio.

## Loop e piu' linee tra gli stessi vertici

Un loop e' un ciclo del grafo, non necessariamente un cerchio. Servono almeno:
auto-collegamenti, bolle con due collegamenti A-B e cicli con piu' vertici.

```text
# Proposta: bolla esplicita e modificabile
fermion upper A B
fermion lower B A
bend upper 0.6
bend lower 0.6

# Proposta: auto-collegamento
loop tadpole at=A particle=scalar radius=0.7 side=above
replace tadpole photon
```

Un comando abbreviato deve espandersi in componenti ancora accessibili per nome.
Il bend relativo e' positivo a sinistra del percorso; un'abbreviazione `side=above`
deve dichiarare se si riferisce al foglio o al sistema del diagramma.

## Disposizione e geometria

- Disporre orizzontalmente/verticalmente, ruotare l'intero diagramma e spostare
  un singolo vertice sono azioni distinte.
- La disposizione automatica deve rispettare i punti fissati dall'utente.
- Le etichette devono restare leggibili dopo la rotazione.
- Onde e arricciature devono seguire la lunghezza del percorso, anche curvo.
- Ampiezza, spaziatura e spessore devono poter avere dimensioni fisiche coerenti.
- Frecce di flusso e momento hanno verso e posizione propri.
- Un incrocio sul foglio non crea un'interazione: serve un vertice esplicito.
- Ogni collegamento, nodo e annotazione rimane modificabile separatamente.

## Prove prima di fissare la sintassi

- [ ] Albero con linee orizzontali, verticali e oblique.
- [ ] Cambio fotone/scalare mantenendo il percorso.
- [ ] Bolla con flussi e frecce di momento distinti.
- [ ] Auto-collegamento sopra, sotto e a lato di un vertice.
- [ ] Triangolo e box con piu' vertici.
- [ ] Incrocio senza interazione.
- [ ] Diagramma ruotato e nodo spostato senza perdere annotazioni.

Il pacchetto disegna le proprieta' indicate dall'utente; non deriva ampiezze,
regole di Feynman o la validita' fisica del diagramma.
