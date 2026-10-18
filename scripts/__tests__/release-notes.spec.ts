import { describe, it, expect } from 'vitest'
import { releaseNotes } from '../release-notes.mjs'

const changelog = `# Changelog

Intro.

## [Unreleased]

### Added

- Next thing.

## [1.1.0] - 2026-11-01

### Fixed

- A [linked](https://example.com) fix.

## [1.0.0] - 2026-10-16

First release.

[unreleased]: https://github.com/o/r/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/o/r/releases/tag/v1.1.0
[1.0.0]: https://github.com/o/r/releases/tag/v1.0.0
`

describe('releaseNotes', () => {
  it('returns one version section, without its heading', () => {
    expect(releaseNotes(changelog, '1.1.0')).toBe('### Fixed\n\n- A [linked](https://example.com) fix.')
  })

  it('stops at the link references after the last section', () => {
    expect(releaseNotes(changelog, '1.0.0')).toBe('First release.')
  })

  it('returns undefined for a version without a section', () => {
    expect(releaseNotes(changelog, '2.0.0')).toBeUndefined()
  })

  it('does not match a version that only starts the same', () => {
    expect(releaseNotes(changelog, '1.1')).toBeUndefined()
  })

  it('returns undefined for an empty section', () => {
    expect(releaseNotes('## [1.2.0] - 2026-12-01\n\n## [1.1.0]\n\n- x', '1.2.0')).toBeUndefined()
  })
})
