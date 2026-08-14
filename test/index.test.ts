import { describe, expect, it } from 'vitest'

import { SCHEMA_VERSION } from '../src/index.js'

describe('public surface', () => {
  it('exposes the current SCHEMA_VERSION', () => {
    expect(SCHEMA_VERSION).toBe('0.3.0')
  })
})
