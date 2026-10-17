import { describe, it, expect } from 'vitest'
import { isDeceased, lifespan, symbolShape } from '../member'

const member = (extra: object = {}) => ({ id: 1, name: 'A', ...extra })

describe('member helpers', () => {
  it.each([
    [{}, false],
    [{ deceased: true }, true],
    [{ died: 2020 }, true],
    [{ died: '?' }, true],
    [{ died: '' }, false],
    [{ born: 1950 }, false],
  ])('isDeceased(%o) is %s', (extra, expected) => {
    expect(isDeceased(member(extra))).toBe(expected)
  })

  it.each([
    ['male', 'square'],
    ['female', 'circle'],
    ['nonbinary', 'diamond'],
    [undefined, 'diamond'],
  ])('symbolShape for gender %s is a %s', (gender, shape) => {
    expect(symbolShape(member({ gender }))).toBe(shape)
  })

  it.each([
    [{}, ''],
    [{ born: 1945, died: 2020 }, '1945–2020'],
    [{ born: '1945-03-02', died: '2020-11-30T08:00:00Z' }, '1945–2020'],
    [{ born: 1980 }, 'b. 1980'],
    [{ died: '?' }, 'd. ?'],
    // Text with letters is isolated so it keeps its direction in an RTL line
    [{ born: 'c. 1900', died: '?' }, '\u2068c. 1900\u2069–?'],
    [{ born: ' ', died: 2001 }, 'd. 2001'],
  ])('lifespan(%o) is %j', (extra, expected) => {
    expect(lifespan(member(extra))).toBe(expected)
  })
})
