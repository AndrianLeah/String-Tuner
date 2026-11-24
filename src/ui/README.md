# Design system

The interface is built from the pieces in this folder. They come from the Liquid Glass mockups in
[`mockup/`](../../mockup/README.md): the tokens are the variables of the FigCraft file, the icons
are its vectors.

The screens in `src/components` put these pieces together. They size the pieces through tokens and
do not restyle them. A new screen should need no new colours, radii or shadows. If it does, add
them here first.

## Layers

| File | What it holds |
| --- | --- |
| `styles/tokens.css` | Every colour (dark and light), spacing, radius, size, font, shadow, blur and duration, as custom properties |
| `styles/base.css` | Page defaults: reset, font, the focus ring, reduced motion |
| `styles/materials.css` | The three materials as classes, and the shared interaction states |
| `index.css` | Imports the three above; `main.ts` loads it once |
| `icons.ts` | The icon set, on a 24 px grid |
| `index.ts` | Exports every component |

## Materials

Liquid Glass is used sparingly: never in the content layer, and never on top of another glass.

| Class | Use |
| --- | --- |
| `.ui-glass` | Controls on the background: the tuning pill, icon buttons, the chip track, Start/Stop |
| `.ui-glass--sheet` | Sheets and dialogs. Inside them use filled controls only |
| `.ui-material` | Content: the ring lens, the meter, the card on tablet and desktop |
| `.ui-pressable` | Hover and pressed veils, a slight swell when pressed, 40 % when disabled |

## Colour

Each colour has one meaning:

- **Accent** (`--accent`, `--accent-fill`, `--accent-tint`): selection and the one primary action.
- **Green** (`--green…`): in tune.
- **Orange** (`--warn…`): out of tune.
- **Red** (`--error`): errors only.

Everything else is neutral. Selected segments are white or grey, not coloured.

## Components

| Component | Props | Notes |
| --- | --- | --- |
| `UiIcon` | `name`, `size`, `strokeWidth`, `label` | Decorative unless it has a `label` |
| `UiSurface` | `material` (`glass` / `sheet` / `thin`), `radius`, `as` | A container made of one material |
| `UiButton` | `variant` (`primary` / `glass`), `size` (`lg` / `xl`), `align`, `block`, `loading`, `disabled` | Slots: `leading`, default, `trailing`. With `loading` it is busy and shows a spinner |
| `UiIconButton` | `icon`, `label`, `variant` (`glass` / `fill` / `plain`) | `label` is required: the button has no text |
| `UiSegmentedControl` | `options`, `label`, `size` (`sm` / `md` / `lg`), `v-model` | A radio group: arrow keys move the choice |
| `UiSearchField` | `label`, `clearLabel`, `placeholder`, `size`, `autofocus`, `v-model` | Clear button while there is text |
| `UiListRow` | `title`, `selected` | Slots: `meta`, default (second line), `action` (kept outside the row's button) |
| `UiStatusPill` | `tone` (`success` / `warning` / `neutral`), `icon`, `hidden` | Tokens: `--status-pill-height`, `--status-pill-font-size` |
| `UiSection` | `label` | A labelled group inside a sheet |
| `UiSheet` | `title`, `closeLabel`, `size` (`md` / `lg`) | Slots: default (scrolls), `toolbar`, `subheader`. A bottom sheet on a phone, a dialog on wider screens. Closes with Escape or a tap outside, and keeps focus inside. Animate with `<Transition name="ui-sheet">` |

## Accessibility

- Every control is at least 44 pt.
- Keyboard focus shows a 3 pt accent ring.
- A state is never shown by colour alone: tuned chips carry a check, hints carry an arrow and a word.
- *Reduce Transparency* makes the materials solid. *Increase Contrast* strengthens their edges. *Reduce Motion* removes the animations.
