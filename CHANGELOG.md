# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-16

First release as `@karamconnect/vue-family-tree`, MIT licensed. Inspired by
[vue-family-tree](https://github.com/walkerz88/vue-family-tree) and written from scratch for Vue 3 and TypeScript;
the list below compares it with that package.

### Added

- Tabbing to a card outside the view pans the tree to it.
- Default cards are a single `<button>` with an `<img>`: one tab stop, keyboard activation, and the name and
  dates as its accessible name.
- Siblings render as a list (`<ul>` / `<li>`), with the connector lines as their own hidden elements.
- Vue 3 component written in TypeScript, published as an ES module with type declarations and a separate
  `style.css`.
- `VueFamilyTreePlugin` for global registration; all data types (`FamilyNode`, `FamilyMember`, …) are exported.
- A single `config` prop (`FamilyTreeConfig`) for every option besides the `tree` data; every key is optional.
- `config.gestures` (`auto`, `cooperative`, `greedy`, `none`) so the tree behaves like an embedded map on
  phones: one finger scrolls the page, two fingers pan and pinch-zoom.
- Pinch, ctrl/⌘ + wheel and trackpad zoom, with `config.zoom` for limits, a `zoom` event and `setZoom()`,
  `zoomIn()`, `zoomOut()` methods.
- `hint` slot to customize or translate the gesture hint.
- `config.lines`: `color`, `width` and `style` (`solid`, `dashed`, `dotted`, `thick`), plus
  `--vue-family-tree-line-color` / `-width` / `-style` CSS variables, for the connector lines
  ([upstream #3](https://github.com/walkerz88/vue-family-tree/issues/3)).
- `config.cards`: `class`, `imageClass` and `nameClass` for styling the default cards.
- `config.cards.width` and the `--vue-family-tree-card-width` variable: the connector lines follow the card width,
  so custom `card` slots no longer have to be 100px wide. `--vue-family-tree-couple-line-top` places the line
  between partners.
- `partners` on a `FamilyNode` for several partners, current or former, each with their own children and a
  `relationship` (`married`, `partners`, `separated`, `divorced`). Partners are drawn in a row after the person, and
  each union's children hang from its own stretch of the line
  ([upstream #2](https://github.com/walkerz88/vue-family-tree/issues/2)).
- Relationship status on the line between partners, genogram style: `/` separated, `//` divorced, dashed (or dotted
  on a dashed tree) for unmarried partners, with the status name as tooltip. Marks, the partners' line and placeholder
  outlines use the darker `--vue-family-tree-mark-color` (default `#767676`) for contrast. `start` / `end` dates on partnerships
  (and on the node for `secondPerson`) show above the line as `m. 1980 · div. 1996`. New labels: `married`,
  `separated`, `divorced` and `relationships`.
- `VueFamilyTreeLegend`: a key to the relationship marks, the deceased symbol and placeholders, for touch and
  keyboard users who can't see the tooltips. Given the tree's data and config, it lists only the symbols the tree
  shows, in its line style and language. New `placeholder` label.
- `config.partners.showFormer`: `false` hides all separated and divorced partners, with their children.
- `hidden` on a `FamilyNode` or a `FamilyMember` skips that node (with its descendants) or person, and can be
  toggled at runtime ([upstream #4](https://github.com/walkerz88/vue-family-tree/issues/4)).
- `deceased`, `gender`, `born` and `died` on a `FamilyMember`. Deceased people get the genogram symbol for their
  gender (square, circle, or diamond for other/unknown) crossed by an X, with a "Deceased" tooltip, and a greyscale
  photo; dates show under the name as `1945–2020`, `b. 1980` or `d. ?`. `_deceased` modifier classes allow
  restyling, including custom cards.
- `VueFamilyTreeDeceasedSymbol` and `VueFamilyTreeLifespan` components, the default card's symbol and date line, for
  use in custom `card` slots (they follow the tree's labels).
- `config.filter` to show people by a rule without changing the data: `false` hides a person like `hidden`, and
  `'card'` leaves an empty placeholder so partners and descendants stay in place (for example a "living only"
  view). `isDeceased()` is exported for such filters.
- `config.labels` to translate the text the tree renders itself (deceased symbol name, date prefixes or formats,
  gesture hints), with strings or functions; works with vue-i18n's `t()` and updates on a locale change.
- Right-to-left support: under `dir="rtl"` the tree mirrors (connector lines use logical CSS properties) and the
  viewport starts right-aligned. Names and textual dates keep their own direction.

### Changed

- Requires Vue 3.5 or later.
- Style the component with plain `class` and `style`; default sizes and colors have zero specificity, so any class
  overrides them.
- A mouse drag keeps following the pointer outside the tree and ends wherever the button is released.
- `dragstart` and `dragend` fire only for actual drags, not for clicks.
- Default cards reserve room for two name lines and a date line, so each generation lines up across branches.
  The name and dates are wrapped in `.vue-family-card__details`.

### Fixed

- Connector lines land on the center of single cards (and of the first partner in a couple) instead of up to 150px
  off, and a single parent's line to the children drops from the bottom of the card instead of its left edge.
- An only child sits as far below its parents as children hanging from a branching line, instead of 16px higher.
- Releasing an upward drag over a card no longer counts as a click on that card.
- A drag released outside the tree no longer keeps panning when the mouse comes back.

### Removed

- Vue 2 support.
- `mobile-prevent-scroll` prop. Use `config.gestures` instead.
- `wrapper-styles` prop. Use `class` or `style` on the component instead.
- `enable-drag`, `drag-cursor` and `mouse-change-diff` props. Use `config.drag.enabled`, `config.drag.cursor` and
  `config.drag.threshold` instead.

[1.0.0]: https://github.com/Karam-Connect/vue-family-tree/releases/tag/v1.0.0
