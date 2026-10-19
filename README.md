<img src="https://raw.githubusercontent.com/karamconnect/vue-family-tree/main/public/vue-family-tree-logo.png" width="50%" alt="Vue Family Tree Logo" style="margin-left: auto; margin-right: auto; display: block;" />

Vue Family Tree is a Vue 3 component for building interactive family trees: pan, pinch and wheel zoom, map-style
mobile gestures, and styling through plain classes and CSS variables. You can play around with a demo of it
[here](https://karam-connect.github.io/vue-family-tree/).

Inspired by [vue-family-tree](https://github.com/walkerz88/vue-family-tree) by walkerz88.

## Installation

Requires Vue 3.5 or later.

```bash
pnpm add @karamconnect/vue-family-tree
# or
npm install @karamconnect/vue-family-tree
# or
yarn add @karamconnect/vue-family-tree
```

Import the stylesheet once (e.g. in `main.ts`):

```typescript
import '@karamconnect/vue-family-tree/style.css';
```

Or register the component globally:

```typescript
import { VueFamilyTreePlugin } from '@karamconnect/vue-family-tree';
import '@karamconnect/vue-family-tree/style.css';

app.use(VueFamilyTreePlugin);
```

## Demo

https://karamconnect.github.io/vue-family-tree/

## Usage

A tree is a list of nodes. Each node holds a person (`firstPerson`), optionally their partner (`secondPerson`), and
their `children`, which are nodes again. Every person needs a unique `id`.

```vue
<script setup lang="ts">
  import VueFamilyTree from '@karamconnect/vue-family-tree';
  import type { FamilyMember, FamilyNode } from '@karamconnect/vue-family-tree';

  const tree: FamilyNode[] = [ {
    firstPerson: { id: 'ruth', name: 'Ruth Okoye', born: 1938, died: 2012, gender: 'female' },
    secondPerson: { id: 'samuel', name: 'Samuel Okoye', born: 1935, gender: 'male', image: '/photos/samuel.jpg' },
    children: [
      {
        firstPerson: { id: 'grace', name: 'Grace' },
        secondPerson: { id: 'tariq', name: 'Tariq' },
        children: [ { firstPerson: { id: 'lina', name: 'Lina' } } ],
      },
      { firstPerson: { id: 'peter', name: 'Peter' } },
    ],
  } ];

  const onCardClick = (person: FamilyMember) => {
    console.log(`${ person.name } was clicked`);
  };
</script>

<template>
  <VueFamilyTree :tree="tree" @card-click="onCardClick"/>
</template>
```

With the Options API, register the component under `components` (or install `VueFamilyTreePlugin`) and keep the
tree in `data()`; props, events and slots work the same.

## Props

| Prop   | Type   | Default | Description                                                   |
|--------|--------|---------|---------------------------------------------------------------|
| tree   | Array  | `[]`    | Your family data (`FamilyNode[]`)                             |
| config | Object | `{}`    | Everything else, see [Config](#config). Every key is optional |

### Config

Pass one object; anything you leave out keeps its default. It's reactive, so a `computed` works well for toggles.

```vue
<VueFamilyTree :tree="tree" :config="{
  lines: { color: '#999', width: 2, style: 'dashed' },
  cards: { width: 220, class: 'my-card' },
  gestures: 'cooperative',
}"/>
```

| Key                   | Type             | Default                           | Description                                                                                  |
|-----------------------|------------------|-----------------------------------|----------------------------------------------------------------------------------------------|
| `lines.color`         | String           | `#ddd`                            | Connector line color                                                                         |
| `lines.width`         | Number \| String | `1`                               | Connector line width; numbers are px, strings any CSS length (`'0.2rem'`)                    |
| `lines.style`         | String           | `solid`                           | `solid`, `dashed`, `dotted`, or `thick` (solid, 3× `lines.width`)                            |
| `cards.width`         | Number \| String | `100`                             | Width of every card (default or `card` slot); numbers are px. The connectors follow it       |
| `cards.class`         | String           | –                                 | Class added to each default card                                                             |
| `cards.imageClass`    | String           | –                                 | Class added to each default card's image                                                     |
| `cards.nameClass`     | String           | –                                 | Class added to each default card's name                                                      |
| `filter`              | Function         | –                                 | Who is shown: `true`, `false` (hide), or `'card'` (placeholder), see [Filtering](#filtering) |
| `partners.showFormer` | Boolean          | `true`                            | `false` hides separated and divorced partners with their children, see [Partners](#partners) |
| `labels`              | Object           | English                           | Translated text the tree renders itself, see [Languages and RTL](#languages-and-rtl)         |
| `zoom`                | Object           | `{ min: 0.1, max: 3, step: 0.1 }` | Zoom limits, > 0 (invalid values use the defaults); `step` is for `zoomIn()` / `zoomOut()`   |
| `gestures`            | String           | `auto`                            | How gestures are shared with the page, see [Gesture handling](#gesture-handling)             |
| `drag.enabled`        | Boolean          | `true`                            | Render inside a pannable, zoomable viewport. `false` renders the tree statically             |
| `drag.cursor`         | String           | `grabbing`                        | Cursor while dragging                                                                        |
| `drag.threshold`      | Number           | `2`                               | Pixels the mouse must move before a press becomes a drag (smaller moves stay clicks)         |

### Partners

`secondPerson` covers one partner. For more, current or former, list them in `partners`; each partnership has its own
children. The tree draws the person first, then each partner in order along one line. Every stretch of that line is
one union, and that union's children hang from its middle, so half-siblings sit in separate groups.

```typescript
const yusuf: FamilyNode = {
    firstPerson: { id: 1, name: 'Yusuf' },
    secondPerson: { id: 2, name: 'Amira' },          // the first union (optional)
    children: [ omar, huda ],                        // Yusuf and Amira's children
    start: 1980,                                     // when Yusuf and Amira married
    partners: [
        { person: { id: 3, name: 'Layla' }, start: 1986, children: [ samir ] },
        { person: { id: 4, name: 'Sara' }, relationship: 'divorced', start: 1990, end: 1996, children: [ rami, nour ] },
    ],
};
```

- **Order** follows the data, for example by date of marriage. Several current partners are fine.
- **`relationship`** is `'married'` (default), `'partners'`, `'separated'` or `'divorced'`; set it on a partnership,
  or on the node for the `secondPerson` union. The line shows it the genogram way: `/` across it for separated, `//`
  for divorced, dashed for unmarried partners (dotted on a dashed tree; set
  `--vue-family-tree-partners-line-style` to choose). These marks and the partners' line are drawn darker than the
  other lines (`#767676`, readable against white; set `--vue-family-tree-mark-color` to change it). Hovering the line
  shows the status name, which screen readers read too. Each union gets a `vue-family-tree__union_<relationship>` class.
- **`start` / `end`** date the relationship (year, ISO date or text, like `born`): the wedding and the separation or
  divorce, or when partners got together and parted. They show above the line as `m. 1980`, `m. 1990 · div. 1996`,
  `m. 1980–2010` (ended without a divorce) or `2001–` (partners), and the line grows to fit them. Restyle them with
  `.vue-family-tree__union-dates`.
- **A couple with a status other than `married`, or with dates,** is drawn the same way as one with `partners`, since
  the short line between a classic couple has no room for marks and dates.
- **Children with no recorded other parent** (`children` without `secondPerson`, next to `partners`) hang from a
  dashed "unknown partner" placeholder.
- **The line from the parents** always lands on the first person. A last child's partners are drawn on the other
  side of them, so the line from the parents always meets the row.
- **Hiding:** `hidden` on a partnership, or on its partner, hides that union with its children, so it stays clear
  whose children are shown. A `'card'` [filter](#filtering) on a partner keeps them. Hiding the first person hides
  the whole family.
- **Former partners:** `config.partners.showFormer: false` hides every `separated` and `divorced` partner at once,
  with their children (the same rule as `hidden`), for a view of current families only.

### Hiding nodes

Set `hidden: true` on a node to skip it and all of its descendants. A parent whose children are all hidden is drawn
without the connector down to them.

`hidden` also works on a person. Hiding one partner draws the other as a single, with the children still attached; a
node whose people are all hidden is skipped with its descendants. A node with no people at all (only `children`)
still renders.

With reactive data you can toggle it, for example from a button:

```typescript
const tree = ref<FamilyNode[]>([ {
    firstPerson: { id: 1, name: 'Anna' },
    children: [
        { firstPerson: { id: 2, name: 'Boris' }, hidden: true },
        { firstPerson: { id: 3, name: 'Clara' } },
    ],
} ]);

const toggleBoris = () => {
    const boris = tree.value[0].children![0];
    boris.hidden = !boris.hidden;
};
```

### Filtering

To hide people by a rule (a "living only" view, a search, a privacy setting), pass `config.filter` instead of
changing your data. It's called for each person and returns:

| Return   | Effect                                                                                                         |
|----------|----------------------------------------------------------------------------------------------------------------|
| `true`   | Shown                                                                                                          |
| `false`  | Hidden like `hidden: true`: the partner stays as a single, and the branch goes once nobody in the node is left |
| `'card'` | The card is replaced by an empty, dashed placeholder; partners and descendants stay where they are             |

`'card'` keeps the tree's shape: a partner doesn't turn into the parents' child, and generations stay lined up. A
placeholder that would hold nothing in place (no partner, no children) is dropped. Placeholders take no clicks and are
skipped by screen readers.

A toggle is a ref and a `computed` config:

```vue
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { VueFamilyTree, isDeceased } from '@karamconnect/vue-family-tree';
  import type { FamilyTreeConfig } from '@karamconnect/vue-family-tree';

  const showDeceased = ref(true);

  const config = computed<FamilyTreeConfig>(() => ({
    filter: showDeceased.value ? undefined : person => (isDeceased(person) ? 'card' : true),
  }));
</script>

<template>
  <label><input v-model="showDeceased" type="checkbox"> Show deceased</label>
  <VueFamilyTree :tree="tree" :config="config"/>
</template>
```

`isDeceased(person)` is `true` for `deceased: true` or any `died` value. Filters combine with plain logic, for example
`person => !isDeceased(person) && person.name.includes(search.value)`. Restyle the placeholder outline with
`.vue-family-tree__person_filtered .vue-family-tree__card::after`, or remove it with `display: none` there.

### Deceased

Mark a person as deceased with `deceased: true` or a `died` date. The default card then shows the genogram symbol
next to the name, a shape crossed by an X (hover it for a "Deceased" tooltip): a square for `gender: 'male'`, a circle
for `'female'`, and a diamond for
any other value or no gender. The photo turns greyscale. A [legend](#legend) explains the symbol where tooltips
don't reach.

`born` and `died` take a year, an ISO date (shown as its year) or text, and appear under the name genogram-style:

```typescript
{ id: 1, name: 'John Walker', gender: 'male', born: 1921, died: 1990 }   // ⊠ John Walker  1921–1990
{ id: 2, name: 'Katia', gender: 'female', born: '1950-04-02' }           //   Katia        b. 1950
{ id: 3, name: 'Oleg', died: '?' }                                       // ◇ Oleg         d. ?
```

Restyle with `.vue-family-card_deceased`, `.vue-family-card__symbol` and `.vue-family-card__lifespan`. Custom `card`
slots can use the same symbol and dates (see [Card](#card)), and `.vue-family-tree__person_deceased` wraps the card of
every deceased person.

### Legend

The relationship marks and the deceased symbol explain themselves only in a tooltip, which touch and keyboard users
never see. `VueFamilyTreeLegend` is a key to them, for you to place wherever it suits your layout (under the tree, in
a collapsible panel, in a drawer on phones). Give it the tree's `tree` and `config`, and it lists only the symbols the
tree actually shows, drawn in the same line style and named in the same language:

```vue
<script setup lang="ts">
  import { VueFamilyTree, VueFamilyTreeLegend } from '@karamconnect/vue-family-tree';
</script>

<template>
  <VueFamilyTree :tree="tree" :config="config"/>
  <VueFamilyTreeLegend :tree="tree" :config="config"/>
</template>
```

| Prop     | Type               | Description                                                                                 |
|----------|--------------------|---------------------------------------------------------------------------------------------|
| `tree`   | `FamilyNode[]`     | List the symbols this tree shows (after `hidden`, `filter` and `partners.showFormer`)       |
| `config` | `FamilyTreeConfig` | The tree's config: `labels` for the text, `lines` for the samples, `filter` and `partners`   |
| `items`  | `LegendItem[]`     | Exactly these entries, in this order, instead of the ones found in `tree`                    |

Without `tree` or `items` it lists everything. The entries are `'married'`, `'partners'`, `'separated'`,
`'divorced'`, `'deceased'` (with the shapes the tree uses) and `'placeholder'` (the dashed box of an unknown partner or
a person filtered out with `'card'`); their text comes from the `relationships`, `deceased` and `placeholder`
[labels](#languages-and-rtl). The legend is a `<ul class="vue-family-legend">`; restyle it and its
`.vue-family-legend__item`, `__sample` and `__text` with plain classes. Line samples follow the
`--vue-family-tree-line-*` variables, so set those on a common ancestor if you style the lines with CSS instead of
`config.lines`. Pass `dir` and `lang` to it like to the tree.

### Languages and RTL

The tree renders a few strings itself: the tooltip and screen-reader name of the deceased symbol, the `b.` / `d.` date
prefixes, the relationship dates and names, and the gesture hints. Pass translations as `config.labels`; anything you
leave out stays English. Strings work for
simple prefixes, and functions give full control over wording, word order and digits. Year text arrives as written
(`'1950'`, `'?'`, `'c. 1900'`).

| Label           | Type                                             | Default                                                                |
|-----------------|--------------------------------------------------|------------------------------------------------------------------------|
| `deceased`      | String                                           | `'Deceased'`                                                           |
| `born`          | String (prefix) \| `(year) => String`            | `'b.'` → `b. 1950`                                                     |
| `died`          | String (prefix) \| `(year) => String`            | `'d.'` → `d. ?`                                                        |
| `lifespan`      | `(born, died) => String`                         | `1945–2020`; also relationship spans (`m. 1980–2010`, `2001–`)         |
| `married`       | String (prefix) \| `(year) => String`            | `'m.'` → `m. 1980`                                                     |
| `separated`     | String (prefix) \| `(year) => String`            | `'sep.'` → `sep. 1990`                                                 |
| `divorced`      | String (prefix) \| `(year) => String`            | `'div.'` → `div. 1990`                                                 |
| `relationships` | `{ married?, partners?, separated?, divorced? }` | `'Married'`, `'Partners'`, `'Separated'`, `'Divorced'` (line tooltips) |
| `placeholder`   | String                                           | `'Unknown or not shown'` ([legend](#legend) text of the dashed box)    |
| `touchHint`     | String                                           | `'Use two fingers to move the tree'`                                   |
| `wheelHint`     | String \| `(key) => String`                      | `` key => `Use ${key} + scroll to zoom` `` (key is `⌘` or `Ctrl`)      |

With [vue-i18n](https://vue-i18n.intlify.dev/), build them from `t()`; they update when the locale changes:

```vue
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { FamilyTreeConfig } from '@karamconnect/vue-family-tree';

  const { t, locale } = useI18n();

  const config = computed<FamilyTreeConfig>(() => ({
    labels: {
      deceased: t('familyTree.deceased'),
      born: year => t('familyTree.born', { year }),                // "born": "geb. {year}" / "مواليد {year}"
      died: year => t('familyTree.died', { year }),
      lifespan: (born, died) => t('familyTree.lifespan', { born, died }),
      married: year => t('familyTree.married', { year }),
      divorced: year => t('familyTree.divorced', { year }),
      relationships: { divorced: t('familyTree.divorcedName') },  // and so on
      touchHint: t('familyTree.touchHint'),
      wheelHint: key => t('familyTree.wheelHint', { key }),
    },
  }));

  const dir = computed(() => ([ 'ar', 'fa', 'he', 'ur' ].includes(locale.value) ? 'rtl' : 'ltr'));
</script>

<template>
  <VueFamilyTree :key="dir" :tree="tree" :config="config" :dir="dir" :lang="locale"/>
</template>
```

**Right-to-left.** Under `dir="rtl"` (on the component or any ancestor) the tree mirrors: the first child and the
first partner of a couple sit on the right, and the pan/zoom viewport starts right-aligned. Put `dir="ltr"` on the
component to keep a left-to-right tree in an RTL page. The viewport picks its starting position when it mounts, so
key the component on the direction if it can change at runtime (as above). Names keep their own direction (a Latin
name in an Arabic page, or the reverse), and date text with letters such as `'c. 1900'` is isolated too. Set `lang` along with `dir` when the tree's
language differs from the page's, so screen readers pronounce the labels correctly.

### Styling

Add a `class` or `style` directly to the component; it lands on the root element. Default styles have zero
specificity, so any class overrides them. Borders and padding don't change the outer size (`box-sizing: border-box`).

```vue
<VueFamilyTree :tree="tree" class="my-tree"/>

<style>
  .my-tree {
    height: 400px; /* default: 600px when drag.enabled is on */
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: grab; /* drag.cursor still applies while dragging */

    /* same as config.lines color / width / style (the config wins if both are set) */
    --vue-family-tree-line-color: #999;
    --vue-family-tree-line-width: 2px;
    --vue-family-tree-line-style: dashed;
  }
</style>
```

Dotted lines are faint at the default 1px; they read better with `lines: { width: 2 }` or more.

Default cards can be styled the same way with `cards.class`, `cards.imageClass` and `cards.nameClass`
(use `.my-card:hover` for hover styles):

```vue
<VueFamilyTree :tree="tree" :config="{ cards: { imageClass: 'avatar', nameClass: 'name' } }"/>

<style>
  .avatar {
    border-radius: 50%;
  }

  .name {
    color: #2c3e50;
    font-weight: 400;
  }
</style>
```

Change the card size with `cards.width` (or `--vue-family-tree-card-width`), not with `cards.class`: the connector
lines are laid out for it. Default cards keep a square photo of that width.

### Gesture handling

Set with `config.gestures`. Works like an embedded map, so visitors can always scroll past the tree on a phone:

| Value         | Touch                                                                      | Mouse wheel / trackpad                                                 |
|---------------|----------------------------------------------------------------------------|------------------------------------------------------------------------|
| `cooperative` | One finger scrolls the page (with a hint); two fingers pan and pinch-zoom  | Scrolls the page (with a hint); ctrl/⌘ + wheel or trackpad pinch zooms |
| `greedy`      | One finger pans; pinch zooms                                               | Zooms                                                                  |
| `none`        | No panning or zooming                                                      | No zooming                                                             |
| `auto`        | `cooperative` when the page scrolls or is in an iframe, otherwise `greedy` |                                                                        |

Mouse drag always pans (unless `none`).

## Events

| Event      | Payload                    | Description                                                                                          |
|------------|----------------------------|------------------------------------------------------------------------------------------------------|
| card-click | `FamilyMember`             | A card was clicked or activated with the keyboard; the payload is that person, extra fields included |
| dragstart  | `MouseEvent \| TouchEvent` | Pan started (mouse: once it moves past `drag.threshold`)                                             |
| drag       | `MouseEvent \| TouchEvent` | Tree moved                                                                                           |
| dragend    | `MouseEvent \| TouchEvent` | Pan ended                                                                                            |
| zoom       | `number`                   | Zoom level changed                                                                                   |
| center-map | –                          | `centerTree()` finished                                                                              |
| mouseover  | `MouseEvent`               | Mouse over the tree (not emitted while dragging)                                                     |
| mouseleave | `MouseEvent`               | Mouse left the tree (not emitted while dragging)                                                     |

## Methods

Call via a template ref:

| Method                   | Description                                                                                |
|--------------------------|--------------------------------------------------------------------------------------------|
| `centerTree()`           | Center the tree in the wrapper. Returns `Promise<boolean>`                                 |
| `zoomIn()` / `zoomOut()` | Zoom by `zoom.step` around the wrapper center                                              |
| `setZoom(scale, focal?)` | Set the zoom level, keeping `focal` (`{x, y}` in wrapper pixels; default: center) in place |
| `getTreeClientRect()`    | Tree's `DOMRect`                                                                           |
| `getWrapperClientRect()` | Wrapper's `DOMRect`                                                                        |

### Card

The `card` slot replaces the built-in card with your own markup; it receives the person as `item`. Make every card the
same width and give that width to `cards.width`, which is what the connector lines are laid out for. The line between
partners sits half a card-width down (the middle
of the default photo); for cards of another shape, set `--vue-family-tree-couple-line-top`:

```vue
<VueFamilyTree :tree="tree" :config="{ cards: { width: 220 } }" class="my-tree">
  <template #card="{ item }">
    <div class="my-card">{{ item.name }}</div>
  </template>
</VueFamilyTree>

<style>
  .my-card {
    width: 220px;
    height: 92px;
  }

  .my-tree {
    --vue-family-tree-couple-line-top: 46px;
  }
</style>
```

The default card's deceased symbol and date line are exported for custom cards. Inside the `card` slot they follow
the tree's `config.labels`; they render nothing when there's nothing to show (the symbol only appears for deceased
people).

```vue
<script setup lang="ts">
  import { VueFamilyTree, VueFamilyTreeDeceasedSymbol, VueFamilyTreeLifespan } from '@karamconnect/vue-family-tree';
</script>

<template>
  <VueFamilyTree :tree="tree" :config="{ cards: { width: 220 } }">
    <template #card="{ item }">
      <div class="my-card">
        <VueFamilyTreeDeceasedSymbol :member="item"/>
        {{ item.name }}
        <VueFamilyTreeLifespan :member="item"/>
      </div>
    </template>
  </VueFamilyTree>
</template>
```

Both are also registered globally by `VueFamilyTreePlugin`, as is `VueFamilyTreeLegend`. Style them with `.vue-family-card__symbol` (sized to the
surrounding text, `1em`) and `.vue-family-card__lifespan` (an inline `span`).

### Hint

Replace the gesture hint with your own markup. `type` is `'touch'` or `'wheel'`. To only translate the text, use
the `touchHint` / `wheelHint` [labels](#languages-and-rtl).

```vue
<VueFamilyTree :tree="tree">
  <template #hint="{ type }">
    {{ type === 'touch' ? 'Utilisez deux doigts' : 'Ctrl + molette pour zoomer' }}
  </template>
</VueFamilyTree>
```

## Development

```
pnpm install
pnpm dev          # demo app + Vue DevTools (Alt+Shift+D); add --host to try touch gestures on a phone
pnpm test         # unit tests (Vitest)
pnpm build        # library -> dist/
pnpm build:demo   # demo app -> demo/
pnpm type-check
pnpm lint
```

## License

[MIT](LICENSE) © 2026 Gabriel Sheeley
