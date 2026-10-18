<template>
  <svg
      v-if="deceased"
      class="vue-family-card__symbol"
      :class="`vue-family-card__symbol_${shape}`"
      viewBox="0 0 20 20"
      role="img"
  >
    <!-- Hover tooltip and the screen-reader name in one; the tree's `deceased` label -->
    <title>{{ labels.deceased }}</title>
    <rect v-if="shape === 'square'" x="3" y="3" width="14" height="14"/>
    <circle v-else-if="shape === 'circle'" cx="10" cy="10" r="7"/>
    <polygon v-else points="10,2.5 17.5,10 10,17.5 2.5,10"/>
    <path :d="shape === 'square' ? 'M1 1L19 19M19 1L1 19' : 'M4 4L16 16M16 4L4 16'"/>
  </svg>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { labelsKey } from '../keys';
import { defaultLabels, isDeceased, symbolShape } from '../member';
import type { FamilyMember } from '../../types';

// Genogram deceased symbol: the person's shape crossed by an X that runs slightly past it. Renders nothing for the
// living. The svg is the only root node, so a class or style given to the component lands on it.
defineOptions({
  name: 'VueFamilyTreeDeceasedSymbol'
});

const props = defineProps<{
  member: FamilyMember
}>();

// The tree's labels inside a VueFamilyTree (default cards and `card` slots); English elsewhere
const labels = inject(labelsKey, computed(() => defaultLabels));
const deceased = computed(() => isDeceased(props.member));
const shape = computed(() => symbolShape(props.member));
</script>

<style lang="scss">
// Unscoped + :where() = zero specificity, so any user class overrides these defaults. Sized to the text around it.
:where(.vue-family-card__symbol) {
  width: 1em;
  height: 1em;
  margin-inline-end: 0.25em;
  vertical-align: -0.125em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}
</style>
