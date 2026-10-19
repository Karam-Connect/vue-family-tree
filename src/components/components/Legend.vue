<template>
  <ul class="vue-family-legend" :style="lineVariables(config)">
    <li
        v-for="item in entries"
        :key="item"
        class="vue-family-legend__item"
        :class="`vue-family-legend__item_${item}`"
    >
      <span class="vue-family-legend__sample" aria-hidden="true">
        <span
            v-if="isRelationship(item)"
            class="vue-family-legend__line"
            :class="`vue-family-legend__line_${item}`"
        >
          <span v-if="item === 'separated' || item === 'divorced'" class="vue-family-legend__marks" />
        </span>
        <template v-else-if="item === 'deceased'">
          <DeceasedSymbol v-for="shape in shapes" :key="shape" :member="symbolMember(shape)" />
        </template>
        <span v-else class="vue-family-legend__placeholder" />
      </span>
      <span class="vue-family-legend__text">{{ textOf(item) }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue';
import DeceasedSymbol from './DeceasedSymbol.vue';
import { labelsKey } from '../keys';
import { allShapes, legendItemOrder, legendOf, type SymbolShape } from '../legend';
import { lineVariables } from '../lines';
import { resolveLabels } from '../member';
import type { FamilyMember, FamilyNode, FamilyTreeConfig, LegendItem, RelationshipStatus } from '../../types';

// A key to the tree's symbols, for everyone who can't hover the lines for their tooltip (touch, keyboard). Each
// sample is drawn the way the tree draws it and hidden from screen readers, which read the text. The <ul> is the only
// root node, so a class, style, dir or lang given to the component lands on it.
defineOptions({
  name: 'VueFamilyTreeLegend'
});

const props = withDefaults(defineProps<{
  /** The tree's data: the legend lists only the symbols it draws. Without it (and without `items`), all of them. */
  tree?: FamilyNode[]
  /** The tree's config: labels, lines, `filter` and `partners.showFormer`, so the legend matches the tree */
  config?: FamilyTreeConfig
  /** Exactly these entries, in this order, instead of the ones found in `tree` */
  items?: LegendItem[]
}>(), {
  config: () => ({})
});

const labels = computed(() => resolveLabels(props.config.labels));
// The deceased symbols in the legend take its labels, like the ones in the tree
provide(labelsKey, labels);

const found = computed(() => props.tree &&
    legendOf(props.tree, { filter: props.config.filter, showFormer: props.config.partners?.showFormer }));

const entries = computed(() => props.items ?? found.value?.items ?? legendItemOrder);
// The deceased shapes the tree uses (square, circle, diamond), or all three
const shapes = computed(() => (found.value?.shapes.length ? found.value.shapes : allShapes));

const isRelationship = (item: LegendItem): item is RelationshipStatus => item in labels.value.relationships;

const genders: Record<SymbolShape, string | undefined> = { square: 'male', circle: 'female', diamond: undefined };
const symbolMember = (shape: SymbolShape): FamilyMember =>
    ({ id: `legend-${shape}`, name: '', gender: genders[shape], deceased: true });

const textOf = (item: LegendItem) => {
  if (isRelationship(item)) return labels.value.relationships[item];
  return item === 'deceased' ? labels.value.deceased : labels.value.placeholder;
};
</script>

<style lang="scss">
@use '../styles/lines' as *;

// Unscoped + :where() = zero specificity, so any user class restyles the legend
:where(.vue-family-legend) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875em;
  color: #444;
}

:where(.vue-family-legend__item) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

:where(.vue-family-legend__sample) {
  display: inline-flex;
  flex: none;
  align-items: center;
}

// The line between partners, 40px of it, with the marks across its middle as on the tree
:where(.vue-family-legend__line) {
  position: relative;
  width: 40px;
  height: 12px;

  &::before {
    content: '';
    position: absolute;
    top: 5.5px;
    inset-inline: 0;
    margin-top: calc(-1 * #{$line-shift});
    @include horizontal-line;
  }
}

:where(.vue-family-legend__line_partners)::before {
  border-top-style: $partners-line-style;
  border-top-color: $mark-color;
}

// The genogram marks: / separated, // divorced
:where(.vue-family-legend__marks) {
  position: absolute;
  inset: 0;

  &::before {
    @include mark;
    inset-inline-start: calc(50% - #{$line-shift});
  }
}

:where(.vue-family-legend__line_divorced) > :where(.vue-family-legend__marks) {
  &::before {
    inset-inline-start: calc(50% - #{$line-shift} - 2px - #{$line-width});
  }

  &::after {
    @include mark;
    inset-inline-start: calc(50% - #{$line-shift} + 2px + #{$line-width});
  }
}

:where(.vue-family-legend__placeholder) {
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  border: $placeholder-outline;
  border-radius: 4px;
}

// The deceased symbols side by side, without the gap they keep before a name
:where(.vue-family-legend__sample) > :where(.vue-family-card__symbol) {
  margin-inline-end: 0;
}

:where(.vue-family-legend__item_deceased .vue-family-legend__sample) {
  gap: 4px;
}
</style>
