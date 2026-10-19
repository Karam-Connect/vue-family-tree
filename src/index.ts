import type { App } from 'vue'
import VueFamilyTree from './components/VueFamilyTree.vue'
import VueFamilyTreeDeceasedSymbol from './components/components/DeceasedSymbol.vue'
import VueFamilyTreeLifespan from './components/components/Lifespan.vue'
import VueFamilyTreeLegend from './components/components/Legend.vue'
import { isDeceased } from './components/member'

export type * from './types'
export { VueFamilyTree, VueFamilyTreeDeceasedSymbol, VueFamilyTreeLifespan, VueFamilyTreeLegend }

/** `deceased: true` or any `died` value; handy in `config.filter` */
export { isDeceased }

export default VueFamilyTree

export const VueFamilyTreePlugin = {
    install(app: App) {
        app.component('VueFamilyTree', VueFamilyTree)
        app.component('VueFamilyTreeDeceasedSymbol', VueFamilyTreeDeceasedSymbol)
        app.component('VueFamilyTreeLifespan', VueFamilyTreeLifespan)
        app.component('VueFamilyTreeLegend', VueFamilyTreeLegend)
    }
}
