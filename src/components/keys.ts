import type { ComputedRef, InjectionKey } from 'vue'
import type { CardStyleProps, FamilyTreeConfig } from '../types'
import type { ResolvedLabels } from './member'

/** Card classes from the VueFamilyTree root, injected by every default LeafCard */
export const cardStyleKey: InjectionKey<ComputedRef<CardStyleProps>> = Symbol('vue-family-tree-card-style')

/** `config.filter` from the VueFamilyTree root, injected by every Branch */
export const filterKey: InjectionKey<ComputedRef<FamilyTreeConfig['filter']>> = Symbol('vue-family-tree-filter')

/** `config.partners` from the VueFamilyTree root, injected by every Branch */
export const partnersKey: InjectionKey<ComputedRef<FamilyTreeConfig['partners']>> = Symbol('vue-family-tree-partners')

/** Labels from the VueFamilyTree root with English defaults filled in, injected by every default LeafCard */
export const labelsKey: InjectionKey<ComputedRef<ResolvedLabels>> = Symbol('vue-family-tree-labels')
