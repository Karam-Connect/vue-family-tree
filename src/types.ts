/**
 * Represents a person in the family tree
 */
export interface FamilyMember {
    /** Unique identifier for the family member */
    id: string | number
    /** Display name */
    name: string
    /** Optional image URL */
    image?: string
    /** Skip this person when rendering; a node left without visible people is skipped with its descendants */
    hidden?: boolean
    /** Mark the person as deceased (genogram symbol on the default card, `_deceased` modifier classes) */
    deceased?: boolean
    /** Picks the deceased symbol: square for `male`, circle for `female`, diamond for any other value or none */
    gender?: 'male' | 'female' | (string & {})
    /** Birth year or ISO date (shown as its year), or text such as `'c. 1900'` */
    born?: number | string
    /** Death year or ISO date (shown as its year), or text such as `'?'`; any value also marks the person deceased */
    died?: number | string

    /** Any additional custom data */
    [key: string]: any
}

/**
 * Represents a family node in the tree structure
 */
export interface FamilyNode {
    /** The blood relative: the line from their parents lands on them. A single person has only this. */
    firstPerson?: FamilyMember
    /** Their partner, for the common one-partner case (shorthand for the first entry of `partners`) */
    secondPerson?: FamilyMember
    /** Children of `firstPerson` and `secondPerson` (or of `firstPerson` alone) */
    children?: FamilyNode[]
    /**
     * Status of the `firstPerson` / `secondPerson` relationship (default: `married`). Anything but `married`, or a
     * `start` / `end` date, draws the node like one with `partners`, so the marks and dates have room.
     */
    relationship?: RelationshipStatus
    /** When the `firstPerson` / `secondPerson` relationship began (see `Partnership.start`) */
    start?: number | string
    /** When it ended (see `Partnership.end`) */
    end?: number | string
    /**
     * More partners of `firstPerson`, current or former, each with their own children. They're drawn in a row after
     * `firstPerson` (and `secondPerson`), in this order; each union's children hang from the line between the two.
     */
    partners?: Partnership[]
    /** Skip this node and all of its descendants when rendering */
    hidden?: boolean
}

/**
 * Status of a relationship between partners
 */
export type RelationshipStatus = 'married' | 'partners' | 'separated' | 'divorced'

/**
 * One union of a node's `firstPerson` with a partner, and their children
 */
export interface Partnership {
    /** The partner */
    person: FamilyMember
    /** Status of the relationship (default: `married`) */
    relationship?: RelationshipStatus
    /**
     * When the relationship began: the wedding for `married`, `separated` and `divorced` (`m. 1980`), or when
     * `partners` got together. Year or ISO date (shown as its year), or text such as `'c. 1980'`.
     */
    start?: number | string
    /** When it ended: the separation (`sep. 1990`) or divorce (`div. 1990`), or the end of a marriage or partnership */
    end?: number | string
    /** Children of this union */
    children?: FamilyNode[]
    /** Skip this partner and their children with `firstPerson` */
    hidden?: boolean
}

/**
 * Text the tree renders itself, for translation (e.g. strings from vue-i18n's `t`). Unset entries stay English.
 * Year text is passed as written (`'1950'`, `'?'`, `'c. 1900'`) so functions can reformat or localize digits.
 */
export interface FamilyTreeLabels {
    /** Tooltip and screen-reader name of the deceased symbol (default: `'Deceased'`) */
    deceased?: string
    /** Shown when only the birth date is known: a prefix (default `'b.'` → `b. 1950`) or a function of the year */
    born?: string | ((year: string) => string)
    /** Shown when only the death date is known: a prefix (default `'d.'` → `d. ?`) or a function of the year */
    died?: string | ((year: string) => string)
    /**
     * Shown when both dates are known (default: `1945–2020`). Also the span of a relationship: `m. 1980–2010` for a
     * marriage that ended without a divorce, `2001–2010` for partners (`'?'` for an unknown start, `''` while ongoing).
     */
    lifespan?: (born: string, died: string) => string
    /** Before a wedding year: a prefix (default `'m.'` → `m. 1980`) or a function of the year */
    married?: string | ((year: string) => string)
    /** Before a separation year: a prefix (default `'sep.'` → `sep. 1990`) or a function of the year */
    separated?: string | ((year: string) => string)
    /** Before a divorce year: a prefix (default `'div.'` → `div. 1990`) or a function of the year */
    divorced?: string | ((year: string) => string)
    /** Names of the relationship statuses: the tooltip and screen-reader name of the line between partners */
    relationships?: Partial<Record<RelationshipStatus, string>>
    /** Cooperative-gesture hint on touch (default: `'Use two fingers to move the tree'`) */
    touchHint?: string
    /** Cooperative-gesture hint for the wheel; a function gets the modifier key, `'⌘'` or `'Ctrl'` */
    wheelHint?: string | ((key: string) => string)
}

/**
 * Props for customizing card appearance
 */
export interface CardStyleProps {
    /** CSS class for the card container */
    cardClass?: string
    /** CSS class for the card image */
    cardImageClass?: string
    /** CSS class for the card name */
    cardNameClass?: string
}

/**
 * Connector line style. `thick` is solid at three times the line width.
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'thick'

/**
 * Everything the tree can be configured with, passed as the `config` prop. Every key is optional.
 */
export interface FamilyTreeConfig {
    /** Connector lines; also settable as `--vue-family-tree-line-*` CSS variables */
    lines?: {
        /** Line color (default: `#ddd`) */
        color?: string
        /** Line width; numbers are px, strings any CSS length (default: `1`) */
        width?: number | string
        /** Line style; `thick` is solid at three times the width (default: `solid`) */
        style?: LineStyle
    }
    /** Cards */
    cards?: {
        /** Width of every card, default or `card` slot; the connectors are laid out for it. Numbers are px (default: `100`) */
        width?: number | string
        /** Class added to each default card */
        class?: string
        /** Class added to each default card's image */
        imageClass?: string
        /** Class added to each default card's name */
        nameClass?: string
    }
    /** Translated text the tree renders itself; unset entries stay English */
    labels?: FamilyTreeLabels
    /**
     * Decides who is shown, without changing the data. Return `true` to show a person, `false` to hide them like
     * `hidden` (with their branch once nobody in their node is left), or `'card'` to leave an empty placeholder in
     * their place and keep their partner and descendants. Applied on top of `hidden`.
     */
    filter?: (person: FamilyMember) => boolean | 'card'
    /** Partners */
    partners?: {
        /**
         * Show `separated` and `divorced` partners; `false` hides them with their children, like `hidden` on each
         * partnership (default: `true`)
         */
        showFormer?: boolean
    }
    /** Zoom limits and the `zoomIn()` / `zoomOut()` step */
    zoom?: ZoomConfig
    /** How touch and wheel gestures are shared with the page (default: `auto`) */
    gestures?: GestureHandling
    /** Pan/zoom viewport */
    drag?: {
        /** Render inside a pannable, zoomable viewport; `false` renders the tree statically (default: `true`) */
        enabled?: boolean
        /** Cursor while dragging (default: `grabbing`) */
        cursor?: string
        /** Pixels the mouse must move before a press becomes a drag (default: `2`) */
        threshold?: number
    }
}

/**
 * Position coordinates
 */
export interface Position {
    x: number
    y: number
}

/**
 * Zoom configuration
 */
export interface ZoomConfig {
    /** Minimum zoom level (default: 0.1) */
    min?: number
    /** Maximum zoom level (default: 3) */
    max?: number
    /** Zoom step used by `zoomIn()` / `zoomOut()` (default: 0.1) */
    step?: number
}

/**
 * How touch and wheel gestures are shared between the tree and the page
 * - `cooperative`: one finger / plain wheel scrolls the page; two fingers pan + pinch-zoom; ctrl/cmd + wheel zooms
 * - `greedy`: one finger pans, wheel zooms
 * - `none`: no gesture panning or zooming
 * - `auto`: `cooperative` when the page scrolls or is in an iframe, otherwise `greedy`
 */
export type GestureHandling = 'auto' | 'cooperative' | 'greedy' | 'none'

/**
 * Which gesture hint is being shown
 */
export type GestureHintType = 'touch' | 'wheel'
