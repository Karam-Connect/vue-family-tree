<template>
  <!-- One level of the tree: a row of families. Below a parent, each family hangs from the siblings' bar. -->
  <ul class="vue-family-tree__branch" :class="{ 'vue-family-tree__branch_nested': nested }">
    <li
        v-for="(family, index) in families"
        :key="index"
        class="vue-family-tree__family"
        :class="[`vue-family-tree__family_${family.layout}`, nested && placeOf(index)]"
    >
      <template v-if="nested">
        <!-- This family's stretch of the bar joining the siblings, and the stub from it down to the family -->
        <span class="vue-family-tree__bar" aria-hidden="true"/>
        <span class="vue-family-tree__stub" aria-hidden="true"/>
      </template>

      <template v-if="family.layout !== 'chain'">
        <div
            class="vue-family-tree__parents"
            :class="[`vue-family-tree__parents_${family.layout}`, { 'vue-family-tree__parents_with-children': family.children.length }]"
        >
          <template v-for="(person, personIndex) in family.people" :key="person.id">
            <!-- Between partners: their line, and the drop to their children from its middle -->
            <span v-if="personIndex === 1" class="vue-family-tree__union-line">
              <span class="vue-family-tree__union-status" role="img" :title="labels.relationships.married"/>
              <span v-if="family.children.length" class="vue-family-tree__union-drop" aria-hidden="true"/>
            </span>
            <VueFamilyTreePerson :person="person" :placeholder="placeholder(person)" @card-click="handleCardClick">
              <template #card="{ item: member }">
                <slot name="card" :item="member"/>
              </template>
            </VueFamilyTreePerson>
          </template>
          <!-- A single parent's line to the children leaves from under the card -->
          <span
              v-if="family.layout === 'single' && family.people.length && family.children.length"
              class="vue-family-tree__descent"
              aria-hidden="true"
          />
        </div>
        <VueFamilyTreeBranch v-if="family.children.length" nested :tree="family.children" @card-click="handleCardClick">
          <template #card="{ item: member }">
            <slot name="card" :item="member"/>
          </template>
        </VueFamilyTreeBranch>
      </template>

      <!-- Chain: the person, then one union per partner. Each union is the line segment from the previous card, the
           partner's card, and that union's children under the segment. -->
      <div v-else class="vue-family-tree__chain">
        <VueFamilyTreePerson
            class="vue-family-tree__chain-start"
            :person="family.person"
            :placeholder="placeholder(family.person)"
            @card-click="handleCardClick"
        >
          <template #card="{ item: member }">
            <slot name="card" :item="member"/>
          </template>
        </VueFamilyTreePerson>
        <div class="vue-family-tree__unions">
          <div
              v-for="(union, unionIndex) in family.unions"
              :key="unionIndex"
              class="vue-family-tree__union"
              :class="[`vue-family-tree__union_${union.relationship}`, { 'vue-family-tree__union_children': union.hasChildren }]"
          >
            <div class="vue-family-tree__union-line">
              <!-- Dates above the line; the segment grows to fit them -->
              <bdi v-if="union.dates" class="vue-family-tree__union-dates">{{ union.dates }}</bdi>
              <!-- A strip along the line: the status name as tooltip and screen-reader name, and the genogram
                   marks (/ separated, // divorced) -->
              <span class="vue-family-tree__union-status" role="img" :title="labels.relationships[union.relationship]"/>
              <span v-if="union.hasChildren" class="vue-family-tree__union-drop" aria-hidden="true"/>
            </div>
            <VueFamilyTreePerson
                :person="union.partner ?? family.person"
                :placeholder="!!union.partner && placeholder(union.partner)"
                :unknown="!union.partner"
                @card-click="handleCardClick"
            >
              <template #card="{ item: member }">
                <slot name="card" :item="member"/>
              </template>
            </VueFamilyTreePerson>
            <VueFamilyTreeBranch
                v-if="union.hasChildren"
                class="vue-family-tree__union-children"
                nested
                :tree="union.children"
                @card-click="handleCardClick"
            >
              <template #card="{ item: member }">
                <slot name="card" :item="member"/>
              </template>
            </VueFamilyTreeBranch>
          </div>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import VueFamilyTreePerson from './FamilyPerson.vue';
import { filterKey, labelsKey, partnersKey } from '../keys';
import { defaultLabels, unionDates } from '../member';
import { isChain, visibility } from '../visibility';
import type { FamilyNode, FamilyMember } from '../../types';

defineOptions({
  name: 'VueFamilyTreeBranch'
});

const props = defineProps<{
  /** The families on this level: siblings, or the top of the tree */
  tree: FamilyNode[]
  /** Below a parent: each family gets a connector up to the parent's line */
  nested?: boolean
}>()

const filter = inject(filterKey, computed(() => undefined))
const labels = inject(labelsKey, computed(() => defaultLabels))
const partners = inject(partnersKey, computed(() => undefined))

// Who and what is drawn: `hidden`, `config.filter` and `partners.showFormer` (shared with the legend)
const rules = computed(() => visibility({ filter: filter.value, showFormer: partners.value?.showFormer }))
const placeholder = (person: FamilyMember) => rules.value.placeholder(person)

// Each family is drawn one of three ways: one person, a couple side by side over their children, or a chain (the
// person, then a line segment and partner per union, each union's children under its segment)
const families = computed(() => {
  const { isVisible, unionsOf, visiblePeople, hasVisibleChildren } = rules.value
  return props.tree.filter(isVisible).map(node => {
    if (isChain(node)) {
      // Each union with the text above its line, e.g. `m. 1980 · div. 1990`
      const unions = unionsOf(node).map(union => ({ ...union, dates: unionDates(union, labels.value) }))
      return { node, layout: 'chain' as const, person: node.firstPerson!, unions }
    }
    const people = visiblePeople(node)
    return {
      node,
      layout: people.length === 2 ? 'couple' as const : 'single' as const,
      people,
      children: hasVisibleChildren(node) ? node.children! : []
    }
  })
})

// Where a family sits among its siblings decides how much of the siblings' bar it draws
const placeOf = (index: number) => {
  const count = families.value.length
  if (count === 1) return 'vue-family-tree__family_only'
  if (index === 0) return 'vue-family-tree__family_first'
  return index === count - 1 ? 'vue-family-tree__family_last' : undefined
}

defineSlots<{
  card(props: { item: FamilyMember }): any
}>();

const emit = defineEmits<{
  'card-click': [ member: FamilyMember, event: MouseEvent ]
}>()

const handleCardClick = (member: FamilyMember, event: MouseEvent) => {
  emit('card-click', member, event)
}
</script>

<style lang="scss" scoped>
@use '../styles/lines' as *;

// Cards are all one width (cards.width or user CSS); the spacing between them is a fixed 16px
$card-width: var(--vue-family-tree-card-width, 100px);
$gap: 16px;
// How far down the card the line between partners runs: the middle of the default square photo
$couple-line-top: var(--vue-family-tree-couple-line-top, calc(#{$card-width} / 2));

// A row of families, side by side, top-aligned. Below a parent, the first 16px is where the parent's line comes
// down to the siblings' bar.
.vue-family-tree__branch {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: $gap;
  margin: 0;
  padding: 0;
  list-style: none;

  &_nested {
    padding-top: $gap;
  }
}

// A family: its parents over their children, centered on each other. All geometry uses logical properties
// (inline-start / inline-end), so under dir="rtl" the whole tree mirrors.
.vue-family-tree__family {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  // Where the line from the parents lands: the middle of the family, the first partner of a couple (the one
  // descended from those parents), or the person at the start of a chain
  --_vft-anchor: calc(50% - #{$line-shift});

  &_couple {
    --_vft-anchor: calc(50% - #{$card-width} / 2 - #{$gap} - #{$line-shift});
  }

  &_chain {
    align-items: flex-start;
    --_vft-anchor: calc(#{$card-width} / 2 - #{$line-shift});
  }

  // Below a parent: room for the stub between the siblings' bar and the cards
  .vue-family-tree__branch_nested > & {
    padding-top: $gap;
  }

  // An only child sits straight under the parent's line, so a couple pads its start by a card and both gaps
  // to bring its first partner under it
  &_couple.vue-family-tree__family_only {
    padding-inline-start: calc(#{$card-width} + 2 * #{$gap});
    --_vft-anchor: calc(50% - #{$line-shift});
  }

  // A last child that's a chain is drawn mirrored (partners first, the person at the end), so the bar, which
  // ends at each end child's person, always reaches the middle where the parent's line comes down
  &_chain.vue-family-tree__family_last {
    align-items: flex-end;
    --_vft-anchor: calc(100% - #{$card-width} / 2 - #{$line-shift});

    > .vue-family-tree__chain,
    > .vue-family-tree__chain > .vue-family-tree__unions {
      flex-direction: row-reverse;
    }

    > .vue-family-tree__chain > .vue-family-tree__unions > .vue-family-tree__union {
      > .vue-family-tree__union-line,
      > .vue-family-tree__union-children {
        grid-column: 2;
      }

      > .vue-family-tree__person {
        grid-column: 1;
        grid-row: 1;
      }

      &.vue-family-tree__union_children > .vue-family-tree__union-line {
        --_vft-mark-at: 25%;
      }
    }
  }
}

// This family's stretch of the siblings' bar: across its own width and the gap before it. The first and last
// sibling stop at their anchor, so the bar runs exactly from the first stub to the last.
.vue-family-tree__bar {
  position: absolute;
  top: calc(-1 * #{$line-shift});
  inset-inline: calc(-1 * #{$gap}) 0;
  @include horizontal-line;

  .vue-family-tree__family_first > & {
    inset-inline-start: var(--_vft-anchor);
  }

  .vue-family-tree__family_last > & {
    inset-inline-end: calc(100% - var(--_vft-anchor) - #{$line-width});
  }

  // An only child continues the parent's line straight down, without a bar
  .vue-family-tree__family_only > & {
    display: none;
  }

  // ...except an only-child chain: it isn't centered under the parent (that would waste half its width), so the
  // bar runs from where the parent's line comes down, in the middle, to the person at the start
  .vue-family-tree__family_chain.vue-family-tree__family_only > & {
    display: block;
    inset-inline: var(--_vft-anchor) 50%;
  }
}

.vue-family-tree__stub {
  position: absolute;
  top: 0;
  inset-inline-start: var(--_vft-anchor);
  height: $gap;
  @include vertical-line;
}

// The people of a classic family, side by side
.vue-family-tree__parents {
  position: relative;
  display: flex;
}

// A single parent's line to the children drops from the bottom of the card
.vue-family-tree__descent {
  position: absolute;
  top: 100%;
  inset-inline-start: 50%;
  margin-inline-start: calc(-1 * #{$line-shift});
  height: $gap;
  @include vertical-line;
}

// Cards sit above the lines
.vue-family-tree__person {
  position: relative;
  z-index: 10;
}

// Chain: [person][union][union]..., each union a grid of [line segment | partner] over [children | -]
.vue-family-tree__chain,
.vue-family-tree__unions {
  display: flex;
  align-items: flex-start;
}

.vue-family-tree__union {
  display: grid;
  // max-content, not auto: a wide tree squeezes its families, and auto tracks would give in down to the segment's
  // min-width, under its dates and children
  grid-template-columns: max-content max-content;
}

.vue-family-tree__union-children {
  grid-column: 1;
  grid-row: 2;
}

// The line between two partners. In a chain it's a grid cell that stretches to fit the union's children and
// dates; between a classic couple it's the 32px gap.
.vue-family-tree__union-line {
  position: relative;
  min-width: 2 * $gap;
  // Where the status marks sit: the middle, or between the children's drop and the partner
  --_vft-mark-at: 50%;

  &::before {
    content: '';
    position: absolute;
    top: $couple-line-top;
    inset-inline: 0;
    margin-top: calc(-1 * #{$line-shift});
    @include horizontal-line;
  }

  .vue-family-tree__union_partners > &::before {
    border-top-style: $partners-line-style;
    border-top-color: $mark-color;
  }

  .vue-family-tree__union_children > & {
    --_vft-mark-at: 75%;
  }
}

// The line to the children leaves from the middle of the partners' line, with a dot where they meet
.vue-family-tree__union-drop {
  position: absolute;
  top: $couple-line-top;
  inset-inline-start: 50%;
  margin-inline-start: calc(-1 * #{$line-shift});
  // Down to the children's bar, 16px below the cards
  height: calc(100% + #{$gap} - #{$couple-line-top});
  @include vertical-line;

  // Positioned from the padding box, which starts after the line's own border
  &::after {
    content: '';
    position: absolute;
    top: calc(-2px - #{$line-shift});
    inset-inline-start: calc(-3px - #{$line-width});
    width: calc(#{$line-width} + 5px);
    height: calc(#{$line-width} + 5px);
    border-radius: 50%;
    background-color: $line-color;
  }
}

// In flow, so the segment grows to fit; the text's bottom sits 4px above the line
.vue-family-tree__union-dates {
  display: block;
  margin-top: calc(#{$couple-line-top} - 18px);
  padding-inline: 8px;
  line-height: 14px;
  white-space: nowrap;
  text-align: center;
}

// A strip along the line, for the tooltip and the marks
.vue-family-tree__union-status {
  position: absolute;
  top: calc(#{$couple-line-top} - 5.5px);
  inset-inline: 0;
  height: 12px;
}

// Genogram marks across the line, solid whatever the line style: / separated, // divorced
.vue-family-tree__union_separated,
.vue-family-tree__union_divorced {
  > .vue-family-tree__union-line {
    min-width: 3 * $gap;

    > .vue-family-tree__union-status::before {
      @include mark;
      inset-inline-start: calc(var(--_vft-mark-at) - #{$line-shift} + var(--_vft-mark-offset, 0px));
    }
  }
}

.vue-family-tree__union_divorced > .vue-family-tree__union-line > .vue-family-tree__union-status {
  &::before {
    --_vft-mark-offset: calc(-1 * (2px + #{$line-width}));
  }

  &::after {
    @include mark;
    inset-inline-start: calc(var(--_vft-mark-at) - #{$line-shift} + 2px + #{$line-width});
  }
}
</style>

<style lang="scss">
// Unscoped + :where() = zero specificity, so any user class restyles the dates between partners
:where(.vue-family-tree__union-dates) {
  font-size: 11px;
  color: #666;
}
</style>
