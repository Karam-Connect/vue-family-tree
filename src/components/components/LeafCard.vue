<template>
  <!-- One button per card: a single tab stop, Enter / Space activate it, and screen readers read the name and dates -->
  <button
      type="button"
      class="vue-family-card"
      :class="[cardStyle.cardClass, { 'vue-family-card_deceased': deceased }]"
      @click="emit('card-click', member, $event)"
  >
    <img
        v-if="member.image"
        class="vue-family-card__image"
        :class="cardStyle.cardImageClass"
        :src="member.image"
        alt=""
        draggable="false"
    >
    <span v-else class="vue-family-card__image" :class="cardStyle.cardImageClass" />
    <span class="vue-family-card__details">
      <span class="vue-family-card__name" :class="cardStyle.cardNameClass">
        <!-- bdi: the name keeps its own direction (a Latin name in an RTL page, or the reverse). The symbol sits at
             its start, on the first word's line when both fit, otherwise above the name rather than breaking it. -->
        <bdi><DeceasedSymbol :member="member" />{{ member.name }}</bdi>
      </span>
      <Lifespan :member="member" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { cardStyleKey } from '../keys';
import { isDeceased } from '../member';
import DeceasedSymbol from './DeceasedSymbol.vue';
import Lifespan from './Lifespan.vue';
import type { CardStyleProps, FamilyMember } from '../../types';

// The built-in card: a square photo (or a grey square without one), the name, and the dates
defineOptions({
  name: 'VueFamilyTreeDefaultCard'
});

const props = defineProps<{
  member: FamilyMember
}>();

const emit = defineEmits<{
  'card-click': [member: FamilyMember, event: MouseEvent]
}>();

// cards.class / imageClass / nameClass from the tree's config
const cardStyle = inject(cardStyleKey, computed<CardStyleProps>(() => ({})));
const deceased = computed(() => isDeceased(props.member));
</script>

<style lang="scss">
// Defaults live in :where() (zero specificity) and outside scoped CSS, so any class from cards.* or user CSS wins.
// The width is --vue-family-tree-card-width (cards.width): Branch.vue lays the connectors out for that same width, so
// resize cards there, not through cards.class.
$card-width: var(--vue-family-tree-card-width, 100px);

:where(.vue-family-card) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: $card-width;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: center;
  cursor: pointer;
}

// The photo is a square as wide as the card; the line between partners is drawn across its middle
:where(.vue-family-card__image) {
  display: block;
  width: $card-width;
  height: $card-width;
  object-fit: cover;
  background-color: #e0e0e0;
}

// Tall enough for a two-line name and a line of dates, so every card in a generation is the same height and the
// next generation starts at the same height across branches
:where(.vue-family-card__details) {
  display: block;
  align-self: stretch;
  min-height: calc(2 * 1.25em + 2px + 0.85em * 1.25);
}

// The name may reach 8px into the 16px gap on either side (half each, so neighbors never collide); a word too long
// even for that wraps anywhere instead of overlapping the next card
:where(.vue-family-card__name) {
  display: block;
  margin-inline: -8px;
  font-weight: 600;
  line-height: 1.25;
  color: #111;
  overflow-wrap: anywhere;
}

:where(.vue-family-card__lifespan) {
  display: block;
  margin-top: 2px;
  font-size: 0.85em;
  line-height: 1.25;
  color: #666;
}

// The genogram symbol says "deceased"; a greyscale photo adds a quieter hint
:where(.vue-family-card_deceased .vue-family-card__image) {
  filter: grayscale(1);
}
</style>
