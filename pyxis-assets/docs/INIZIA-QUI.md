# Pyxis: installazione e uso

**Nota sullo sviluppo.** Ho sviluppato Pyxis con l’assistenza di un’IA, anche nella scrittura e revisione del codice e della documentazione, nella preparazione dei test, nei controlli e nella gestione degli strumenti. Queste note registrano scelte, verifiche e limiti del progetto; l’assistenza dell’IA non costituisce una validazione indipendente dei modelli fisici.

Pyxis trasforma descrizioni fisiche in figure vettoriali. Il sorgente descrive un processo, un circuito o un reticolo; i pacchetti ne costruiscono la geometria.
Il sorgente conserva le scelte; PDF e SVG sono i risultati esportati.

## Installazione su Windows x64

Ho distribuito Pyxis come estensione VS Code in formato VSIX. Il pacchetto
include il compilatore C++ già compilato, gli esempi e la documentazione.
Installa separatamente VS Code 1.90 o successivo, Asymptote, una distribuzione
TeX (per esempio MiKTeX, con dvisvgm) e Ghostscript. I motori grafici esterni
non sono inclusi nel download. Node.js serve solo per gli script da terminale;
non serve installarlo per usare l'estensione in VS Code.

1. Scarica pyxis-1.0.0-win32-x64.vsix dalla pagina del progetto.
2. In VS Code apri Ctrl+Shift+P, cerca **Extensions: Install from VSIX…**
   e seleziona il file. Ricarica la finestra.
3. Se Asymptote e Ghostscript non sono nel PATH, configura pyxis.asymptote
   e pyxis.ghostscript nelle impostazioni. Usa i tuoi percorsi, per esempio:

```json
{
  "pyxis.asymptote": "C:\\Program Files\\Asymptote\\asy.exe",
  "pyxis.ghostscript": "C:\\Program Files\\gs\\VERSIONE\\bin\\gswin64c.exe"
}
```

Il percorso Ghostscript dipende dalla versione installata: VERSIONE è un
segnaposto. Verifica che entrambi gli eseguibili esistano realmente. TeX e
dvisvgm devono essere raggiungibili dal processo di VS Code; dopo aver
cambiato PATH, riavvia VS Code. Apri un documento .tex e prova
**Pyxis: Figura da esempio del corso**.

Se hai solo il VSIX, non eseguire gli script PowerShell del progetto per
installare altri runtime. Se vuoi studiare il codice o usare il terminale,
scarica anche l'archivio completo. Sono distribuiti sorgenti portabili,
ma la sola build binaria verificata di questa release è Windows x64.

## Collegamento rapido sul PC di sviluppo

Apri `Installa Pyxis.cmd` nella cartella del progetto. Il pacchetto installa
l'estensione normale di VS Code e collega Asymptote/Ghostscript gia' presenti.
Ricarica la finestra di VS Code dopo l'installazione. Non serve avviare una
finestra di sviluppo. Conserva `.tools`: contiene il motore grafico necessario.

Comando equivalente da PowerShell:

```powershell
./scripts/install.ps1 -SkipBuild
```

Per un altro PC servono VS Code, Asymptote, una distribuzione TeX con dvisvgm
e Ghostscript. Installa il VSIX da `release` tramite Extensions: Install from
VSIX; imposta pyxis.asymptote e pyxis.ghostscript se i programmi non sono nel
PATH. Il VSIX include il nucleo Windows x64, i sorgenti, gli esempi e la documentazione;
non redistribuisce questi programmi esterni.

## Inserimento di una figura nel documento

In un documento LaTeX, Ctrl+Alt+F apre Pyxis nella posizione del cursore.
Scrivi o modifica il sorgente nella finestra Pyxis. L'anteprima si aggiorna
dopo una breve pausa. Salva figura richiede un nome, crea .pyxis/.svg/.pdf
nella cartella figures e inserisce includegraphics negli appunti.
Nel preambolo serve `\usepackage{graphicx}`.

Per partire da una figura del corso, cerca **Pyxis: Figura da esempio del corso**
nella palette dei comandi (Ctrl+Shift+P). Scegli QFT, quantistica, statistica
o relativita'. L'esempio diventa una nuova bozza: il modello originale rimane intatto.

Un sorgente breve per il circuito di Bell:

```text
profile quantum
grid off
circuit bell {
    q0: H, control(pair)
    q1: _, target(pair), M
}
```

`pair` collega il controllo e il target nella stessa colonna; `_` e' un filo.
Pyxis disegna il circuito, non simula lo stato o la misura.

## Scrivere la figura direttamente nel documento

```latex
\documentclass{article}
\usepackage{pyxis}
\begin{document}
\begin{pyxis}[width=90]
profile qft
feynman scattering {
    channel: s
    incoming: [electron, positron]
    outgoing: [muon, antimuon]
    mediator: photon
}
\end{pyxis}
\end{document}
```

Salva il documento: l'estensione prepara le figure e compila il PDF con il
nome degli appunti. Il sorgente originale resta identico. Devi chiudere
`\end{pyxis}` su una propria riga. La diagnostica si trova nel pannello Output
Pyxis. Puoi avviare la stessa procedura con **Pyxis: Compila documento LaTeX**.
pyxis.buildOnSave disattiva la build automatica; pyxis.latexEngine sceglie il motore.

Quando l'estensione e' installata, il pacchetto pyxis.sty e' trovato dalla sua
procedura di build. Un pdflatex lanciato direttamente non esegue Pyxis:
usa il comando dell'estensione oppure `node scripts/build-latex.js appunti.tex`.

## Capitoli della tesi

La procedura segue input/include con nomi file letterali e rispetta includeonly.
I percorsi dei sottofile si risolvono dalla cartella del documento principale,
come nella compilazione LaTeX abituale. I file originali non vengono riscritti.
Nei capitoli puoi indicare il documento principale:

```latex
% !TeX root = ../tesi.tex
```

La build dall'editor del capitolo viene cosi' indirizzata alla tesi. Dopo la
prima compilazione del principale, l'estensione conosce anche i suoi sottofile
e li ricompila al salvataggio. Non supportiamo nomi di input costruiti da macro,
subfiles/import o l'orchestrazione automatica di BibTeX/Biber.
Per riferimenti a capitoli esclusi da includeonly, una build pulita non dispone
degli ausiliari delle vecchie compilazioni: compila prima il documento completo.

## Combinare corsi e rifinire

```text
profile quantum
use qft, relativity, statmech
theme: overleaf-classic
```

Il profilo importa un pacchetto, use ne aggiunge altri. Usa place per affiancare
o sovrapporre verticalmente i gruppi 2D; le figure 3D usano ambienti distinti.
Nei ritocchi rapidi dell'editor puoi scrivere `set F mediator gluon`,
`place B below A`, `move A 1 0` oppure `theme blackboard`.

Gli esempi non sono tutti modelli quantitativi: phase-diagram e' schematico;
Kerr e' un diagramma sull'asse subestremale; le geodetiche sono raggi nulli
equatoriali di Schwarzschild. Le ipotesi e i limiti sono in PACCHETTI.md.
Pyxis non verifica conservazione di cariche o validita' dei vertici QFT.

## Architettura e sviluppo

Le [note di sviluppo](GUIDA-SVILUPPO.md) documentano pipeline, integrazione e casi di controllo. [Architettura e sorgenti C++](CODICE-CPP.md) contiene i contratti delle funzioni, le motivazioni e i listati completi.

Per cercare una sintassi specifica usa [il riferimento dei comandi](COMANDI.md).
Se l'anteprima fallisce, controlla i percorsi degli eseguibili e il pannello
Output Pyxis. Nel progetto completo `node scripts/doctor.js` verifica gli
strumenti. Il compilatore incluso non richiede GCC; GCC serve per ricompilarlo.

Le cartelle temporanee, i profili di prova e gli ausiliari vengono eliminati.
Codice, test sorgente, documentazione, esempi, figure esportate e dipendenze rimangono:
costituiscono i materiali di uso, verifica e sviluppo del progetto.
