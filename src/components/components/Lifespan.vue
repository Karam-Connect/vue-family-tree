<template>
  <span v-if="text" class="vue-family-card__lifespan">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { labelsKey } from '../keys';
import { defaultLabels, lifespan } from '../member';
import type { FamilyMember } from '@/types.ts';

defineOptions({
  name: 'VueFamilyTreeLifespan'
});

const props = defineProps<{
  member: FamilyMember
}>();

// The tree's labels inside a VueFamilyTree (default cards and `card` slots); English elsewhere
const labels = inject(labelsKey, computed(() => defaultLabels));
const text = computed(() => lifespan(props.member, labels.value));
</script>
