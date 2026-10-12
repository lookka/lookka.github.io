# Dipendenze di Pyxis

Il codice Pyxis e la sua documentazione sono distribuiti con licenza MIT.
La licenza non sostituisce quelle dei programmi esterni.

- Il VSIX Windows include il nucleo Pyxis compilato con GCC/MinGW-w64.
  Le librerie runtime GCC sono soggette alla GCC Runtime Library Exception:
  https://www.gnu.org/licenses/gcc-exception-3.1.html.
- Asymptote, Ghostscript, LaTeX/dvisvgm, Node.js e VS Code sono programmi
  esterni. Il VSIX non li redistribuisce; usa installazioni locali.
- Le copie portatili in `.tools` servono a questo workspace. Mantengono
  licenze, risorse e avvisi propri. Non sono inserite nel pacchetto VSIX.

Per costruire su altri sistemi usare CMake e un compilatore C++17. Il pacchetto
binario prodotto da scripts/package.ps1 e' destinato a Windows x64.
