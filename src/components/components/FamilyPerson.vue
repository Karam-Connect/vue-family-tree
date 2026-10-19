<template>
  <div
      class="vue-family-tree__person"
      :class="{
        'vue-family-tree__person_deceased': !unknown && isDeceased(person),
        'vue-family-tree__person_filtered': placeholder,
        'vue-family-tree__person_unknown': unknown,
      }"
  >
    <!-- A placeholder (filtered-out person, or an unknown partner) keeps the card's size and place but is invisible
         and inert, so partners, descendants and generation rows stay put; a dashed outline marks the empty spot.
         An unknown partner reuses the person's own card for its size. -->
    <div class="vue-family-tree__card" :inert="placeholder || unknown || undefined">
      <slot
          name="card"
          :item="person"
      >
        <LeafCard
            :member="person"
            @card-click="(member, event) => emit('card-click', member, event)"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import LeafCard from './LeafCard.vue';
import { isDeceased } from '../member';
import type { FamilyMember } from '../../types';

defineOptions({
  name: 'VueFamilyTreePerson'
});

defineProps<{
  person: FamilyMember
  /** Filtered out with `'card'`: an empty placeholder in their place */
  placeholder?: boolean
  /** Stand-in for a partner who isn't in the data, sized like `person`'s card */
  unknown?: boolean
}>();

defineSlots<{
  card(props: { item: FamilyMember }): any
}>();

const emit = defineEmits<{
  'card-click': [member: FamilyMember, event: MouseEvent]
}>();
</script>

<style lang="scss">
@use '../styles/lines' as *;

// Unscoped + :where() = zero specificity, so any user class restyles or removes the placeholder outline.
// The card stays in the layout (same size) but is invisible; `inert` keeps it out of clicks and screen readers.
:where(.vue-family-tree__person_filtered, .vue-family-tree__person_unknown) > :where(.vue-family-tree__card) {
  position: relative;
  visibility: hidden;
}

:where(.vue-family-tree__person_filtered, .vue-family-tree__person_unknown) > :where(.vue-family-tree__card)::after {
  content: '';
  position: absolute;
  inset: 0;
  visibility: visible;
  border: $placeholder-outline;
  border-radius: 4px;
}

// On a default card the outline covers only the photo square, matching the other cards' boxes; a custom card is
// outlined whole, since its own box is the whole card
:where(.vue-family-tree__person_filtered, .vue-family-tree__person_unknown)
  > :where(.vue-family-tree__card:has(> .vue-family-card))::after {
  bottom: auto;
  height: var(--vue-family-tree-card-width, 100px);
  box-sizing: border-box;
}
</style>
