<template>
  <main class="demo">
    <h1 class="demo__title">vue-family-tree</h1>

    <div class="demo__controls">
      <label v-for="toggle in toggles" :key="toggle.label">
        <input v-model="toggle.model.value" type="checkbox">
        {{ toggle.label }}
      </label>
      <label>
        Language
        <select v-model="language">
          <option v-for="(locale, code) in locales" :key="code" :value="code">{{ locale.name }}</option>
        </select>
      </label>
      <label>
        Lines
        <select v-model="lineStyle">
          <option v-for="style in lineStyles" :key="style">{{ style }}</option>
        </select>
      </label>
      <label>
        Gestures
        <select v-model="gestures">
          <option v-for="mode in gestureModes" :key="mode">{{ mode }}</option>
        </select>
      </label>
      <span class="demo__zoom">
        <button type="button" aria-label="Zoom out" @click="treeRef?.zoomOut()">−</button>
        <button type="button" aria-label="Zoom in" @click="treeRef?.zoomIn()">+</button>
      </span>
    </div>

    <!-- Keyed on direction: the tree picks its starting position for the direction when it mounts -->
    <VueFamilyTree
        ref="treeRef"
        :key="locale.dir"
        :dir="locale.dir"
        :tree="family"
        :config="config"
        :class="{ 'demo-tree_custom': customCards }"
        @card-click="onCardClick"
    >
      <template v-if="customCards" #card="{ item }">
        <button type="button" class="demo-card" @click="onCardClick(item)">
          <img v-if="item.image" class="demo-card__photo" :src="item.image" alt="" draggable="false">
          <span v-else class="demo-card__photo demo-card__photo_empty"/>
          <span class="demo-card__text">
            <!-- The default card's symbol and dates, exported for custom cards; they follow the tree's labels -->
            <strong class="demo-card__name"><VueFamilyTreeDeceasedSymbol :member="item"/>{{ item.name }}</strong>
            <VueFamilyTreeLifespan :member="item" class="demo-card__meta"/>
            <span v-if="item.hometown" class="demo-card__meta">{{ item.hometown }}</span>
          </span>
        </button>
      </template>
    </VueFamilyTree>

    <p class="demo__status" aria-live="polite">{{
        selected ? `Selected: ${ selected }` : 'Click a card to select it'
      }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { VueFamilyTree, VueFamilyTreeDeceasedSymbol, VueFamilyTreeLifespan, isDeceased } from './index';
import { demoFamily } from './demoFamily';
import type { FamilyMember, FamilyTreeConfig, FamilyTreeLabels, GestureHandling, LineStyle } from './types';

// With vue-i18n you'd build `labels` from `t()` instead, e.g. `{ deceased: t('tree.deceased'), ... }`
const toArabicDigits = (text: string) => text.replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'.charAt(Number(digit)));
const locales: Record<string, { name: string, dir: 'ltr' | 'rtl', labels?: FamilyTreeLabels }> = {
  en: { name: 'English', dir: 'ltr' },
  de: {
    name: 'Deutsch',
    dir: 'ltr',
    labels: {
      deceased: 'Verstorben',
      born: 'geb.',
      died: 'gest.',
      married: 'verh.',
      separated: 'getr.',
      divorced: 'gesch.',
      relationships: { married: 'Verheiratet', partners: 'Partner', separated: 'Getrennt', divorced: 'Geschieden' },
      touchHint: 'Mit zwei Fingern verschieben',
      wheelHint: key => `${ key } + Mausrad zum Zoomen`
    }
  },
  ru: {
    name: 'Русский',
    dir: 'ltr',
    labels: {
      deceased: 'Умер(ла)',
      born: 'род.',
      died: 'ум.',
      married: 'брак',
      separated: 'разъезд',
      divorced: 'развод',
      relationships: { married: 'В браке', partners: 'Партнёры', separated: 'Живут раздельно', divorced: 'В разводе' },
      touchHint: 'Перемещайте дерево двумя пальцами',
      wheelHint: key => `Масштаб: ${ key } + колесо мыши`
    }
  },
  ar: {
    name: 'العربية',
    dir: 'rtl',
    labels: {
      deceased: 'متوفى',
      born: year => `مواليد ${ toArabicDigits(year) }`,
      died: year => `توفي ${ toArabicDigits(year) }`,
      lifespan: (born, died) => `${ toArabicDigits(born) }–${ toArabicDigits(died) }`,
      married: year => `زواج ${ toArabicDigits(year) }`,
      separated: year => `انفصال ${ toArabicDigits(year) }`,
      divorced: year => `طلاق ${ toArabicDigits(year) }`,
      relationships: { married: 'متزوجان', partners: 'شريكان', separated: 'منفصلان', divorced: 'مطلقان' },
      touchHint: 'استخدم إصبعين لتحريك الشجرة',
      wheelHint: key => `استخدم ${ key } + التمرير للتكبير`
    }
  }
};
const language = ref('en');
const locale = computed(() => locales[language.value]!);

const lineStyles: LineStyle[] = [ 'solid', 'dashed', 'dotted', 'thick' ];
const gestureModes: GestureHandling[] = [ 'auto', 'cooperative', 'greedy', 'none' ];
const lineStyle = ref<LineStyle>('solid');
const gestures = ref<GestureHandling>('auto');

const customCards = ref(false);
const showHidden = ref(false);
const showDeceased = ref(true);
const showFormer = ref(true);
const toggles = [
  { label: 'Custom cards', model: customCards },
  { label: 'Show hidden', model: showHidden },
  { label: 'Show deceased', model: showDeceased },
  { label: 'Show former partners', model: showFormer }
];

const treeRef = useTemplateRef('treeRef');

// Rebuilt when "Show hidden" changes; with reactive data you can also flip `hidden` in place
const family = computed(() => demoFamily(showHidden.value));

// Everything but the data goes in one config object
const config = computed<FamilyTreeConfig>(() => ({
  lines: { style: lineStyle.value },
  cards: { width: customCards.value ? 220 : undefined },
  labels: locale.value.labels,
  gestures: gestures.value,
  // Living only: deceased people leave an empty placeholder, so partners and descendants stay in place
  filter: showDeceased.value ? undefined : person => (isDeceased(person) ? 'card' : true),
  // Separated and divorced partners, with their children
  partners: { showFormer: showFormer.value }
}));

const selected = ref('');
const onCardClick = (member: FamilyMember) => {
  selected.value = member.name;
};
</script>

<style lang="scss">
body {
  margin: 0;
}

.demo {
  padding: 32px 16px;
  font-family: system-ui, sans-serif;
  color: #1f2933;

  &__title {
    margin: 0 0 16px;
    font-size: 28px;
    text-align: center;
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 20px;
    margin-bottom: 24px;
    font-size: 14px;

    label, input, select, button {
      cursor: pointer;
    }
  }

  &__zoom {
    display: inline-flex;
    gap: 4px;
  }

  &__status {
    margin: 12px 0 0;
    font-size: 14px;
    text-align: center;
    color: #52606d;
  }
}

// Custom card: photo beside the text, 220px wide (cards.width) so the connector lines land on it
.demo-card {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 220px;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  background: #fff;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;

  &:hover, &:focus-visible {
    border-color: #829ab1;
  }

  &__photo {
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;

    &_empty {
      background: #e4e7eb;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 15px;
  }

  &__meta {
    font-size: 12px;
    color: #616e7c;
  }
}

// The custom cards are 82px tall: put the line between partners at their middle
.demo-tree_custom {
  --vue-family-tree-couple-line-top: 41px;
}

// The tree flags deceased people on the person wrapper, custom cards included
.vue-family-tree__person_deceased .demo-card__photo {
  filter: grayscale(1);
}
</style>
