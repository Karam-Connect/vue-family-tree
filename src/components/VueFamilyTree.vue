<template>
  <div
      ref="viewportEl"
      class="vue-family-tree"
      :class="{ 'vue-family-tree_viewport': enableDrag }"
      @mousedown="mousedown"
      @mouseover="unlessPanning(() => emit('mouseover', $event))"
      @mouseleave="unlessPanning(() => emit('mouseleave', $event))"
      @touchstart="touchstart"
      @touchmove="touchmove"
      @touchend="touchend"
      @touchcancel="touchend"
      @wheel="wheel"
      :style="{
      cursor: mouse.dragging ? dragCursor : undefined,
      touchAction,
      '--vue-family-tree-line-color': lines.color,
      '--vue-family-tree-line-width': cssLength(lines.width),
      '--vue-family-tree-line-style': lines.style === 'thick' ? 'solid' : lines.style,
      '--_vft-line-scale': lines.style === 'thick' ? 3 : undefined,
      '--_vft-partners-line-style': lines.style === 'dashed' ? 'dotted' : undefined,
      '--vue-family-tree-card-width': cssLength(config.cards?.width),
    }"
  >
    <div
        ref="contentEl"
        :style="enableDrag ? {
        position: 'absolute',
        top: 0,
        left: 0,
        transformOrigin: '0 0',
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      } : undefined"
    >
      <VueFamilyTreeBranch :tree="tree" @card-click="member => unlessPanning(() => emit('card-click', member))">
        <template #card="{ item }">
          <slot name="card" :item="item"/>
        </template>
      </VueFamilyTreeBranch>
    </div>
    <div
        v-if="enableDrag"
        class="vue-family-tree__hint-region"
        role="status"
    >
      <Transition name="vue-family-tree-hint">
        <div v-if="hintVisible" class="vue-family-tree__hint">
          <slot name="hint" :type="hintType">
            {{ hintText }}
          </slot>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, provide, onMounted, onBeforeUnmount } from 'vue';
import VueFamilyTreeBranch from './components/Branch.vue';
import { cardStyleKey, filterKey, labelsKey, partnersKey } from './keys';
import { resolveLabels } from './member';
import type {
  FamilyNode, FamilyMember, FamilyTreeConfig, GestureHandling, GestureHintType, Position, ZoomConfig
} from '../types';

defineOptions({
  name: 'VueFamilyTree'
});

const props = withDefaults(defineProps<{
  tree?: FamilyNode[];
  /** Everything else: lines, cards, labels, zoom, gestures, drag. Every key is optional. */
  config?: FamilyTreeConfig;
}>(), {
  tree: () => [],
  config: () => ({})
});

// Config with defaults filled in
const enableDrag = computed(() => props.config.drag?.enabled ?? true);
const dragCursor = computed(() => props.config.drag?.cursor ?? 'grabbing');
const dragThreshold = computed(() => props.config.drag?.threshold ?? 2);
const gestureHandling = computed<GestureHandling>(() => props.config.gestures ?? 'auto');
const zoom = computed<ZoomConfig>(() => props.config.zoom ?? {});
const lines = computed(() => props.config.lines ?? {});
const cssLength = (value?: number | string) => typeof value === 'number' ? `${ value }px` : value;

const emit = defineEmits<{
  /** A card was clicked or activated with the keyboard (not at the end of a pan) */
  'card-click': [ member: FamilyMember ]
  /** A mouse or touch pan started, moved, or ended */
  dragstart: [ event: MouseEvent | TouchEvent ]
  drag: [ event: MouseEvent | TouchEvent ]
  dragend: [ event: MouseEvent | TouchEvent ]
  /** The zoom level changed */
  zoom: [ scale: number ]
  /** `centerTree()` moved the tree */
  'center-map': []
  /** The pointer entered or left the tree (not reported while panning) */
  mouseover: [ event: MouseEvent ]
  mouseleave: [ event: MouseEvent ]
}>();

provide(cardStyleKey, computed(() => ({
  cardClass: props.config.cards?.class,
  cardImageClass: props.config.cards?.imageClass,
  cardNameClass: props.config.cards?.nameClass
})));

provide(filterKey, computed(() => props.config.filter));
provide(partnersKey, computed(() => props.config.partners));

// Recomputed when the labels change, e.g. on a vue-i18n locale switch
const labels = computed(() => resolveLabels(props.config.labels));
provide(labelsKey, labels);

const hintText = computed(() => {
  const { touchHint, wheelHint } = labels.value;
  if (hintType.value === 'touch') return touchHint;
  const key = isMac.value ? '⌘' : 'Ctrl';
  return typeof wheelHint === 'function' ? wheelHint(key) : wheelHint;
});

const HINT_DURATION = 1500;
const WHEEL_ZOOM_SPEED = 0.002;

/** The element that clips and receives input, and the transformed element inside it that holds the tree */
const viewportEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);

// Translation and zoom of the content
const position = reactive<Position>({ x: 0, y: 0 });
const scale = ref(1);

/** The mouse button is down on the tree; it turns into a drag once it has moved past the threshold */
const mouse = reactive({ pressed: false, dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });

/**
 * A pan ends with the button or finger lifting over a card, which the browser reports as a click. Card clicks and
 * hover are ignored while panning and for a moment afterwards, so moving the tree never selects someone.
 */
const PAN_SETTLE_MS = 150;
const panning = ref(false);
const unlessPanning = (report: () => void) => {
  if (!panning.value) report();
};

// `auto` is resolved against the page, which only exists in the browser
const gestureMode = ref<Exclude<GestureHandling, 'auto'>>(
    gestureHandling.value === 'auto' ? 'cooperative' : gestureHandling.value
);
const isMac = ref(false);
const hintVisible = ref(false);
const hintType = ref<GestureHintType>('touch');
let hintTimer: ReturnType<typeof setTimeout> | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
/** Last event of the current mouse/touch pan, so a pan cancelled by a prop change can still emit `dragend` */
let lastDragEvent: MouseEvent | TouchEvent | null = null;
let resizeObserver: ResizeObserver | null = null;

const resolveGestureMode = () => {
  if (gestureHandling.value !== 'auto') {
    gestureMode.value = gestureHandling.value;
    return;
  }
  const root = document.documentElement;
  const pageScrolls = root.scrollHeight > window.innerHeight || root.scrollWidth > window.innerWidth;
  gestureMode.value = pageScrolls || window.self !== window.top ? 'cooperative' : 'greedy';
};

watch(gestureHandling, resolveGestureMode);

// Must be set before a touch starts: the browser reads it on touchstart to decide who handles the gesture
const touchAction = computed(() => {
  if (!enableDrag.value || gestureMode.value === 'none') return undefined;
  return gestureMode.value === 'greedy' ? 'none' : 'pan-x pan-y';
});

onMounted(() => {
  isMac.value = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  resolveGestureMode();
  window.addEventListener('resize', resolveGestureMode);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resolveGestureMode);
    resizeObserver.observe(document.body);
  }
  startAtInlineStart();
});

// The pan/zoom math keeps the tree's origin at the wrapper's left edge. In RTL the tree is mirrored (first child
// on the right), so start it right-aligned, the mirror of LTR's left-aligned start.
const startAtInlineStart = () => {
  if (!enableDrag.value || !viewportEl.value || getComputedStyle(viewportEl.value).direction !== 'rtl') return;
  const viewport = getWrapperClientRect();
  const content = getTreeClientRect();
  if (viewport && content) position.x = viewport.width - content.width;
};

onBeforeUnmount(() => {
  removeMouseListeners();
  clearTimeout(settleTimer);
  window.removeEventListener('resize', resolveGestureMode);
  resizeObserver?.disconnect();
  clearTimeout(hintTimer);
});

const showHint = (type: GestureHintType) => {
  hintType.value = type;
  hintVisible.value = true;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hintVisible.value = false;
  }, HINT_DURATION);
};

// One timer at a time: a pan starting within PAN_SETTLE_MS of the last one must not be cut short by its timer
const startPanning = () => {
  clearTimeout(settleTimer);
  panning.value = true;
};

const stopPanningSoon = () => {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    panning.value = false;
  }, PAN_SETTLE_MS);
};

const toWrapperPoint = (clientX: number, clientY: number): Position => {
  const rect = viewportEl.value?.getBoundingClientRect();
  return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
};

const positiveOr = (value: number | undefined, fallback: number) =>
    value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

// Scale must stay finite and > 0: zooming divides by the current scale
const zoomBounds = computed(() => {
  const min = positiveOr(zoom.value.min, 0.1);
  const max = positiveOr(zoom.value.max, 3);
  return { min: Math.min(min, max), max: Math.max(min, max) };
});

/**
 * Sets the zoom level, keeping `focal` (wrapper coordinates, default: wrapper center) fixed on screen
 */
const setZoom = (next: number, focal?: Position) => {
  if (!Number.isFinite(next)) return;
  const { min, max } = zoomBounds.value;
  const clamped = Math.min(max, Math.max(min, next));
  if (clamped === scale.value) return;
  const rect = viewportEl.value?.getBoundingClientRect();
  const point = focal ?? { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 };
  const ratio = clamped / scale.value;
  position.x = point.x - (point.x - position.x) * ratio;
  position.y = point.y - (point.y - position.y) * ratio;
  scale.value = clamped;
  emit("zoom", clamped);
};

const zoomIn = () => setZoom(scale.value + (zoom.value.step ?? 0.1));
const zoomOut = () => setZoom(scale.value - (zoom.value.step ?? 0.1));

// Move/up are tracked on window so a drag keeps following the mouse outside the tree and ends wherever it's released
const mousedown = (event: MouseEvent) => {
  if (!enableDrag.value || gestureMode.value === 'none') return;
  mouse.pressed = true;
  mouse.startX = mouse.lastX = event.clientX;
  mouse.startY = mouse.lastY = event.clientY;
  window.addEventListener('mousemove', mousemove);
  window.addEventListener('mouseup', mouseup);
};

const removeMouseListeners = () => {
  window.removeEventListener('mousemove', mousemove);
  window.removeEventListener('mouseup', mouseup);
};

const mousemove = (event: MouseEvent) => {
  // Button released somewhere we never got a mouseup (outside the browser window, over an iframe)
  if (event.buttons === 0) {
    mouseup(event);
    return;
  }
  if (!mouse.pressed) return;
  if (!mouse.dragging) {
    // A press only becomes a drag past the threshold, so clicks with a little jitter stay clicks
    const moved = Math.max(Math.abs(event.clientX - mouse.startX), Math.abs(event.clientY - mouse.startY));
    if (moved <= dragThreshold.value) return;
    mouse.dragging = true;
    startPanning();
    emit('dragstart', event);
  }
  position.x += event.clientX - mouse.lastX;
  position.y += event.clientY - mouse.lastY;
  mouse.lastX = event.clientX;
  mouse.lastY = event.clientY;
  lastDragEvent = event;
  emit('drag', event);
};

const endMouseDrag = (event: MouseEvent | null) => {
  removeMouseListeners();
  const wasDragging = mouse.dragging;
  mouse.pressed = false;
  mouse.dragging = false;
  if (!wasDragging) return;
  stopPanningSoon();
  const endEvent = event ?? lastDragEvent;
  if (endEvent) emit('dragend', endEvent);
};

const mouseup = (event: MouseEvent) => endMouseDrag(event);

const wheel = (event: WheelEvent) => {
  if (!enableDrag.value || gestureMode.value === 'none') return;
  if (gestureMode.value === 'cooperative' && !event.ctrlKey && !event.metaKey) {
    showHint('wheel');
    return;
  }
  event.preventDefault();
  // deltaMode 1 = lines (Firefox); normalize to pixels
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  setZoom(scale.value * Math.exp(-delta * WHEEL_ZOOM_SPEED), toWrapperPoint(event.clientX, event.clientY));
};

interface TouchState extends Position {
  /** Distance between the first two touches, 0 for a single touch */
  distance: number
}

let lastTouch: TouchState | null = null;
let touchPanning = false;

// `event.touches` includes fingers anywhere on the page; only count the ones that started on the tree
const treeTouches = (event: TouchEvent) =>
    Array.from(event.touches).filter(touch => viewportEl.value?.contains(touch.target as Node));

const readTouches = (touches: Touch[]): TouchState => {
  const [ a, b ] = touches;
  if (!b) return { x: a.clientX, y: a.clientY, distance: 0 };
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
    distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  };
};

const touchstart = (event: TouchEvent) => {
  if (!enableDrag.value || gestureMode.value === 'none') return;
  const touches = treeTouches(event);
  if (touches.length) lastTouch = readTouches(touches);
};

const touchmove = (event: TouchEvent) => {
  if (!enableDrag.value || gestureMode.value === 'none' || !lastTouch) return;
  const touches = treeTouches(event);
  if (!touches.length) return;
  const minTouches = gestureMode.value === 'greedy' ? 1 : 2;
  if (touches.length < minTouches) {
    // Let the page scroll, but tell the user how to move the tree
    if (gestureMode.value === 'cooperative') showHint('touch');
    lastTouch = readTouches(touches);
    return;
  }
  event.preventDefault();
  hintVisible.value = false;
  const current = readTouches(touches);
  if (!touchPanning) {
    touchPanning = true;
    startPanning();
    emit('dragstart', event);
  }
  // Zoom around where the fingers were, then follow them to where they are
  if (lastTouch.distance && current.distance) {
    setZoom(scale.value * (current.distance / lastTouch.distance), toWrapperPoint(lastTouch.x, lastTouch.y));
  }
  position.x += current.x - lastTouch.x;
  position.y += current.y - lastTouch.y;
  lastTouch = current;
  lastDragEvent = event;
  emit('drag', event);
};

const endTouchPan = (event: TouchEvent | null) => {
  lastTouch = null;
  if (!touchPanning) return;
  touchPanning = false;
  stopPanningSoon();
  const endEvent = event ?? lastDragEvent;
  if (endEvent) emit('dragend', endEvent);
};

// Runs even if gestures were disabled mid-pan, so click suppression is always released
const touchend = (event: TouchEvent) => {
  if (!lastTouch && !touchPanning) return;
  const touches = treeTouches(event);
  if (touches.length && enableDrag.value && gestureMode.value !== 'none') {
    // A finger lifted mid-gesture: re-anchor on the remaining touches so the tree doesn't jump
    lastTouch = readTouches(touches);
    return;
  }
  endTouchPan(event);
};

// Turning gestures off mid-pan ends the pan instead of leaving it half-active
watch([ enableDrag, gestureMode ], ([ enabled, mode ]) => {
  if (enabled && mode !== 'none') return;
  endMouseDrag(null);
  endTouchPan(null);
});

/** On-screen box of the tree itself (zoom included) */
const getTreeClientRect = () => contentEl.value?.getBoundingClientRect();

/** On-screen box of the viewport around it */
const getWrapperClientRect = () => viewportEl.value?.getBoundingClientRect();

/** Moves the tree to the middle of the viewport; resolves `false` before the component has rendered */
const centerTree = async () => {
  const viewport = getWrapperClientRect();
  const content = getTreeClientRect();
  if (!viewport || !content) return false;
  position.x = (viewport.width - content.width) / 2;
  position.y = (viewport.height - content.height) / 2;
  emit('center-map');
  return true;
};

defineExpose({ centerTree, getTreeClientRect, getWrapperClientRect, setZoom, zoomIn, zoomOut });
</script>

<style lang="scss">
// Unscoped + :where() = zero specificity, so any user class or style overrides these defaults
:where(.vue-family-tree) {
  position: relative;
  box-sizing: border-box;
}

:where(.vue-family-tree_viewport) {
  width: 100%;
  height: 600px;
  overflow: hidden;
}
</style>

<style lang="scss" scoped>
.vue-family-tree {
  &__hint-region {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
  }

  &__hint {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
    background-color: rgba(#000, .45);
    color: #fff;
    font-size: 18px;
    text-align: center;
  }
}

.vue-family-tree-hint-enter-active,
.vue-family-tree-hint-leave-active {
  transition: opacity .3s ease;
}

.vue-family-tree-hint-enter-from,
.vue-family-tree-hint-leave-to {
  opacity: 0;
}
</style>
