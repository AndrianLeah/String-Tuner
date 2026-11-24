# Design system

The interface is built from the pieces in this folder. They come from the Liquid Glass mockups in
[`mockup/`](../../mockup/README.md): the tokens are the variables of the FigCraft file, the icons
are its vectors.

The screens in `src/components` put these pieces together. They size the pieces through tokens and
do not restyle them. A new screen should need no new colours, radii or shadows. If it does, add
them here first.

## Layers

| File                   | What it holds                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `styles/tokens.css`    | Every colour (dark and light), spacing, radius, size, font, shadow, blur and duration, as custom properties |
| `styles/base.css`      | Page defaults: reset, font, the focus ring, reduced motion                                                  |
| `styles/materials.css` | The three materials as classes, and the shared interaction states                                           |
| `styles/motion.css`    | The shared transitions (`ui-fade`, `ui-swap`, `ui-pop`) and keyframes (`ui-rise`, `ui-draw`)                |
| `index.css`            | Imports the styles above; `main.ts` loads it once                                                           |
| `icons.ts`             | The icon set, on a 24 px grid                                                                               |
| `motion.ts`            | `revealChange()`: a whole-page change that opens as a circle from the last tap                              |
| `index.ts`             | Exports every component                                                                                     |

## Materials

Liquid Glass is used sparingly: never in the content layer, and never on top of another glass.

| Class              | Use                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------- |
| `.ui-glass`        | Controls on the background: the tuning pill, icon buttons, the chip track, Start/Stop |
| `.ui-glass--sheet` | Sheets and dialogs. Inside them use filled controls only                              |
| `.ui-material`     | Content: the ring lens, the meter, the card on tablet and desktop                     |
| `.ui-pressable`    | Hover and pressed veils, a slight swell when pressed, 40 % when disabled              |

## Colour

Each colour has one meaning:

- **Accent** (`--accent`, `--accent-fill`, `--accent-tint`): selection and the one primary action.
- **Green** (`--green…`): in tune.
- **Orange** (`--warn…`): out of tune.
- **Red** (`--error`): errors only.

Everything else is neutral. Selected segments are white or grey, not coloured.

## Components

| Component            | Props                                                                                          | Notes                                                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UiIcon`             | `name`, `size`, `strokeWidth`, `label`, `draw`                                                 | Decorative unless it has a `label`. With `draw` its strokes draw themselves in                                                                                                                                   |
| `UiSurface`          | `material` (`glass` / `sheet` / `thin`), `radius`, `as`                                        | A container made of one material                                                                                                                                                                                 |
| `UiButton`           | `variant` (`primary` / `glass`), `size` (`lg` / `xl`), `align`, `block`, `loading`, `disabled` | Slots: `leading`, default, `trailing`. With `loading` it is busy and shows a spinner                                                                                                                             |
| `UiIconButton`       | `icon`, `label`, `variant` (`glass` / `fill` / `plain`)                                        | `label` is required: the button has no text                                                                                                                                                                      |
| `UiSegmentedControl` | `options`, `label`, `size` (`sm` / `md` / `lg`), `v-model`                                     | A radio group: arrow keys move the choice                                                                                                                                                                        |
| `UiSearchField`      | `label`, `clearLabel`, `placeholder`, `size`, `autofocus`, `v-model`                           | Clear button while there is text                                                                                                                                                                                 |
| `UiListRow`          | `title`, `selected`                                                                            | Slots: `meta`, default (second line), `action` (kept outside the row's button)                                                                                                                                   |
| `UiStatusPill`       | `tone` (`success` / `warning` / `neutral`), `icon`, `hidden`                                   | Tokens: `--status-pill-height`, `--status-pill-font-size`                                                                                                                                                        |
| `UiSection`          | `label`                                                                                        | A labelled group inside a sheet                                                                                                                                                                                  |
| `UiSheet`            | `title`, `closeLabel`, `size` (`md` / `lg`)                                                    | Slots: default (scrolls), `toolbar`, `subheader`. A bottom sheet on a phone, a dialog on wider screens. Closes with Escape or a tap outside, and keeps focus inside. Animate with `<Transition name="ui-sheet">` |

## Motion

Things arrive with `--ease-out` or a gentle `--ease-spring` and leave faster with `--ease-in`.
Durations are `--duration-fast` (150 ms), `--duration-base` (250 ms) and `--duration-slow` (420 ms).

| What moves        | How                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme             | The new theme opens as a circle from the tapped button (`revealChange`, View Transitions API). Browsers without the API switch at once       |
| Segmented control | One thumb slides under the chosen option; the label's weight eases (Nunito is variable)                                                      |
| Sheet             | The scrim darkens and blurs in while the panel slides up whole. On wider screens the dialog rises and grows a little                         |
| Buttons           | Press: a slight swell that springs back. Start turning into Stop eases between the two colours                                               |
| String chips      | The locked outline is one cursor that slides to the next string; a tuned string's check pops in                                              |
| Ring              | The note is replaced by the next one (`ui-swap`). A confirmed string's arc fades out. At the end the check draws itself and the ring bounces |
| Screen            | The pieces rise into place one after another when the app opens                                                                              |

Use the shared transitions with Vue: `<Transition name="ui-fade">`, `<Transition name="ui-swap" mode="out-in">`, `<Transition name="ui-pop">`. An element that declares its own `transition` replaces theirs, so it must list `opacity` and `transform` too.

**Reduce Motion** turns every animation off, the theme reveal included.

## Accessibility

- Every control is at least 44 pt.
- Keyboard focus shows a 3 pt accent ring.
- A state is never shown by colour alone: tuned chips carry a check, hints carry an arrow and a word.
- _Reduce Transparency_ makes the materials solid. _Increase Contrast_ strengthens their edges. _Reduce Motion_ removes the animations.
