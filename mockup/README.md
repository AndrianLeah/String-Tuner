# String Tuner — mockup "Liquid Glass" (v2)

Redesign dell'interfaccia in stile *liquid glass*: tono **giocoso**, vetro usato **con tatto**, regole prese dalle Human Interface Guidelines di Apple. L'app lo implementa come design system in [`src/ui`](../src/ui/README.md).

| File | Contenuto | Su git |
| --- | --- | --- |
| `string-tuner-liquid-glass.figcraft` | Documento FigCraft con 4 pagine: **Cover**, **Foundations** (scuro e chiaro), **Dark** (12 frame), **Light** (12 frame) | Sì, con Git LFS |
| `tokens/` | Le variabili del documento (Theme, Spacing, Radius, Size) esportate da FigCraft: `variables.json` si reimporta, `variables.css` è la versione CSS | Sì |
| `background/` | Sfondo "Corde in risonanza": sorgente VectorCraft (`string-tuner-background.vectorcraft`) e PNG 2000×2000 scuro/chiaro | Sì, con Git LFS |
| `png/foundations-*.png` | Le tavole delle fondamenta: colori, livelli, spaziature, raggi, tipografia, stati dei controlli | Sì, con Git LFS |
| `png/` (il resto) | Un PNG per ogni schermata (telefoni a 2×, tablet, desktop a 1×) | No: si riesportano dal file FigCraft |

Per aprirlo: FigCraft → *Open* → `mockup/string-tuner-liquid-glass.figcraft`. Dopo un clone servono `git lfs install` e `git lfs pull` per avere i file veri al posto dei puntatori.

**Dal design al codice.** Se cambia un colore, una spaziatura o un raggio nel file FigCraft, riesporta le variabili in `tokens/` e riporta il valore in `src/ui/styles/tokens.css`. Lo sfondo dell'app è `src/assets/background/resonance-*.avif` (con `.jpg` di riserva), ricavato dai PNG di `background/` a 1600 px.

---

## Cosa è cambiato rispetto alla v1 e perché

Le regole vengono da HIG → *Materials*, *Color*, *Buttons*, *Layout*, *Accessibility* e da *Adopting Liquid Glass*.

| Problema v1 | Regola Apple | Soluzione v2 |
| --- | --- | --- |
| Vetro ovunque: anello, misuratore, card, chip, ago | "Don't use Liquid Glass in the content layer", "use it sparingly" | Vetro solo su **4 controlli**: pillola dell'accordatura, impostazioni, traccia dei chip, Start/Stop. Anello, misuratore e card usano un **materiale standard** (blur + velo, senza rifrazione né riflesso). |
| Vetro sopra vetro (chip dentro card, ago-lente dentro misuratore, schede dentro fogli) | "Avoid layering Liquid Glass elements on top of each other" | I chip stanno in **una sola traccia di vetro**. Dentro i fogli si usano tracce e righe piene. L'ago è una capsula piena. |
| Viola con 5 significati (chip bloccato, "Tune up", scheda attiva, Start, preset scelto) | "Avoid using the same color to mean different things" | **Un colore = un significato** (vedi sotto). Schede e opzioni attive diventano segmenti neutri (bianco/grigio), come i segmented control di iOS. |
| Stop rosso pieno | Il rosso è il ruolo *destructive*; un solo bottone prominente per vista | Stop è un **bottone di vetro neutro**. Start è l'unico prominente (vetro colorato viola). Il rosso resta solo per gli errori. |
| Tema chiaro "fangoso": aurora satura sotto vetro al 55 % | Il vetro prende il colore dal contenuto; controlli monocromatici su sfondi colorati | Sfondo chiaro pastello, vetro bianco più pulito, etichette nere/grigie. Il colore compare solo per gli stati. |
| Stato "accordato" comunicato solo dal verde | "Convey information with more than color alone" | Ai chip accordati si aggiunge una **✓**. Il fuori tono ha sempre la **freccia** e il testo. |
| Mancavano gli stati dei bottoni | "Always include a press state", minimo 44×44 pt | Matrice completa: default, hover, pressed, focus, disabled, selected/loading (pagina Foundations). |

## Tono giocoso, con tatto

- **Sfondo "Corde in risonanza"**, disegnato in VectorCraft.
  - Sei nastri morbidi vibrano come corde pizzicate: onde stazionarie fissate ai bordi, con spessori diversi come le corde di una chitarra.
  - Colori: viola, ciano, corallo, lavanda, verde, blu, sopra un campo di colore sfocato.
  - Alcune corde sono sfocate per dare profondità.
  - È a tema e dà al vetro qualcosa di ricco da rifrangere.
  - Una **velatura radiale** (`bg/calm`) calma il centro, dove stanno anello e testi, così la leggibilità a riposo è garantita (HIG). I bordi restano vivaci.
- **Font arrotondato**: Nunito, nota in ExtraBold, capsule e raggi generosi.
- Dettagli: la "testina" luminosa dell'arco (come il pallino dell'icona), la ✓ sui chip, lo stato finale con anello verde chiuso.

## Colore: un significato per colore

Tutti i colori sono variabili della collezione **Theme** (modalità Dark / Light). I frame *Light* sono gli stessi dei *Dark* con la modalità cambiata.

| Ruolo | Token | Scuro / Chiaro | Uso |
| --- | --- | --- | --- |
| Accento viola | `accent`, `accent/fill`, `accent/tint` | `#C4B1FF`·`#7C5CFA` / `#6A4FE0` | Selezione e azione primaria: Start, corda bloccata, preset scelto, focus da tastiera |
| Verde | `green`, `green/tint`, `green/glow` | `#30D158` / `#0B7F38` | Intonato: arco, ago in banda, chip accordati, "Hold steady…", "All strings in tune!" |
| Arancione | `warn`, `warn/tint` | `#FF9230` / `#B84D00` | Fuori tono: "Tune up" / "Tune down" (con freccia), nota e ago |
| Rosso | `error` | `#FF6165` / `#D70015` | Solo errori, per esempio il permesso del microfono negato |
| Neutri | `text/primary`, `text/secondary`, `text/tertiary` | bianco o nero con opacità decrescenti | Tutto il resto. I controlli in vetro sono monocromatici |
| Materiali | `glass/fill`, `glass/sheet`, `material/thin`, `fill/secondary`, `fill/tertiary`, `separator` | — | Vetro dei controlli, vetro dei fogli, materiale del contenuto, tracce, righe |

- Verde e arancione partono dai colori di sistema Apple (2025). Nel tema chiaro sono scuriti per i testi piccoli.
- I testi secondari e terziari chiari sono all'85 % e al 70 %, invece del 60 % di sistema.
- L'obiettivo è il minimo HIG/WCAG AA: **4,5:1** fino a 17 pt, **3:1** per testi grandi, in grassetto o per la grafica. I valori sono stimati, non misurati: vanno verificati con Accessibility Inspector sul dispositivo.

## Livelli

1. **Sfondo**: l'illustrazione più la velatura.
2. **Contenuto** (materiale standard): lente dell'anello, misuratore, card su tablet e desktop.
3. **Controlli** (Liquid Glass): pillola dell'accordatura, impostazioni, traccia dei chip, Start/Stop. Ombra morbida, bordo speculare 1 px (`Glass/Edge`), effetto Glass (`Glass/Control`).
4. **Fogli** (Liquid Glass *regular*, più opaco perché pieno di testo): selettore e impostazioni. Dentro solo tracce e righe piene.

## Sistema di spaziatura (griglia da 4 pt)

Collezione di variabili **Spacing**, collegata a gap e padding dei frame.

| Token | pt | Uso |
| --- | --- | --- |
| `space/1` | 4 | Margine interno della selezione dentro una traccia (chip, segmenti) |
| `space/2` | 8 | Icona–testo, gruppi stretti, righe della lista |
| `space/3` | 12 | Tra controlli con bordo (HIG: ~12 pt), anello → info → suggerimento |
| `space/4` | 16 | Padding di controlli, fogli e righe; misuratore → pulsante |
| `space/5` | 20 | Margine laterale iPhone |
| `space/6` | 24 | Tra gruppi ed elementi senza bordo (HIG: ~24 pt) |
| `space/8` | 32 | Tra sezioni; padding della card tablet; margine iPad |
| `space/10` | 40 | Padding della card desktop |
| `space/12` | 48 | Tra colonne (anello \| controlli) |
| `space/16` | 64 | Respiro sulle pagine desktop |

Le aree sicure (notch, Dynamic Island, indicatore home) **si sommano** ai margini.

**Raggi** (collezione *Radius*, regola concentrica: raggio interno = raggio esterno − margine interno):

| Token | pt | Uso |
| --- | --- | --- |
| `radius/lg` | 20 | Chip dentro la traccia |
| `radius/xl` | 24 | Traccia dei chip (24 − 4 = 20), righe della lista (foglio 40 − padding 16) |
| `radius/2xl` | 32 | Misuratore |
| `radius/sheet` | 40 | Fogli e card (angolo del telefono ~48 − 8 di margine) |
| `radius/capsule` | 999 | Pillole, bottoni, suggerimenti |

**Dimensioni** (collezione *Size*): `size/hit-min` 44, `size/control-lg` 52 (pillola, impostazioni), `size/control-xl` 60 (Start/Stop). Icone 16 / 20 / 24.

## Tipografia

Font: **Nunito** (Google Fonts, licenza SIL OFL), arrotondato e giocoso. Si può includere nell'app e rende uguale su iOS, Android e web. È un font variabile (pesi 200–900); nei mockup si usano Medium, SemiBold, Bold ed ExtraBold.

Scala ispirata a Dynamic Type:

- Display 112 / ~150 / ~175 ExtraBold: la nota.
- Title 28 Bold, Headline 17 SemiBold, Callout 16, Subhead 15, Footnote 13, Caption 12 / 11 (il minimo di iOS).
- Cifre tabellari per Hz e cent. In Nunito lo sono già di default: non ha la funzione `tnum`, ma le cifre hanno tutte la stessa larghezza.
- Con testo grande barre e chip vanno a capo invece di tagliarsi.

## Stati dei controlli

La matrice completa è nella pagina **Foundations**: righe Primario (Start), Secondario (Stop), Icona (impostazioni), Chip corda, Segmento, Riga lista.

| Stato | Resa |
| --- | --- |
| Default | Come nei frame |
| Hover (puntatore iPad, Mac, web) | Velo `state/hover` |
| Pressed | Velo `state/pressed` e leggero ingrandimento: il vetro "si gonfia e si illumina" al tocco |
| Focus (tastiera) | Anello viola da 3 pt |
| Disabled | Perde il colore e scende al 40 %. È lo stato dei chip quando non si ascolta, come nell'app di oggi |
| Selected | Chip bloccato viola, chip accordato verde con ✓, segmento bianco/grigio, riga con velo viola e ✓ |
| Loading | Start mostra un indicatore di attività ("Starting…") mentre si chiede il permesso del microfono, come suggerisce l'HIG |

## Layout per dimensione

| Dimensione | Layout |
| --- | --- |
| **Telefono verticale** 390×844 | Una colonna, margini 20: barra → traccia dei chip → anello 260 con info e suggerimento → misuratore → Start/Stop in basso, vicino al pollice. Selettore e Impostazioni sono fogli di vetro flottanti (margine 8, raggio 40). |
| **Telefono orizzontale** 844×390 | Due colonne (margini laterali 56 per notch e Dynamic Island): a sinistra barra, chip, misuratore e pulsante; a destra l'anello 220 con info e suggerimento. Il selettore diventa un foglio largo con lista su 2 colonne. |
| **Tablet verticale** 820×1180 | Card di materiale centrata (560, padding 32). Anello 325. |
| **Tablet orizzontale** 1180×820 | Card larga a due zone: anello ≈350 a sinistra; chip, misuratore e pulsante a destra (gap 48). |
| **Desktop** 1440×900 | Come il tablet orizzontale ma più ampio (card 1120, padding 40, anello ≈400). Il selettore diventa una finestra di dialogo centrata con lista su 2 colonne. |

## Frame (pagine Dark e Light)

Per ogni frame scuro c'è il gemello chiaro (`-light-` al posto di `-dark-`), con lo stesso nome del PNG in `png/`.

| Frame | Cosa mostra |
| --- | --- |
| `main-dark-phone-portrait-idle` | Inattivo: chip disabilitati, nota grigia, ago neutro al centro, **Start** prominente |
| `main-dark-phone-portrait-too-low` | Troppo basso: A2 bloccata, nota arancione, "Tune up" con freccia, ago a −30¢, 108.1 Hz |
| `main-dark-phone-portrait-in-tune` | Intonata: D3 bloccata, arco al 65 %, "Hold steady…", ago a +2¢ nella banda verde |
| `main-dark-phone-portrait-all-tuned` | Tutte accordate: chip verdi con ✓, anello chiuso con spunta, "All strings in tune!" (senza misuratore e pulsante, come oggi) |
| `selector-dark-phone-portrait` | Foglio delle accordature: segmenti, ricerca, preset |
| `settings-dark-phone-portrait` | Foglio Impostazioni: tema, lingua |
| `main-dark-phone-landscape` / `selector-dark-phone-landscape` | Orizzontale: anello affiancato al misuratore; lista su 2 colonne |
| `main-dark-tablet-portrait` / `main-dark-tablet-landscape` | Card su materiale, una o due zone |
| `main-dark-desktop` / `selector-dark-desktop` | Card a due zone; selettore in una finestra di dialogo |
| `cover` | Icona, concetto e anteprima dei due temi |
| `foundations-dark` / `foundations-light` | Colori, livelli, spacing, raggi, dimensioni, tipografia, stati dei controlli |

## Note

- **Font.** Nella prima versione v2 c'era SF Pro Rounded, ma la sua licenza vale solo per piattaforme Apple. Ora tutti i testi sono in **Nunito** (OFL), con i pesi equivalenti (Heavy → ExtraBold). In Capacitor si include come file del progetto (per esempio con `@fontsource/nunito`): non serve una CDN. Chi apre il file `.figcraft` su un'altra macchina deve avere Nunito installato.
- **"Tune down"** usa la stessa pillola arancione di "Tune up", con la freccia verso il basso. Non ha un frame dedicato.
- **Non ancora disegnate:** le varianti per *Aumenta contrasto* e *Riduci trasparenza*, che Apple chiede per i colori personalizzati. I token sono pronti per aggiungere una modalità.
- **Numerazione delle corde.** I mockup usano 1 = E4 … 6 = E2, come l'app.
- Il file VectorCraft dello sfondo pesa circa 24 MB per via delle cache delle sfocature.
