import { cn, truncate, getInitials, formatDate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'nope', 'yes')).toBe('base yes')
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates long strings with ellipsis', () => {
    const result = truncate('hello world', 8)
    expect(result.length).toBe(8)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('getInitials', () => {
  it('returns first letters of first two words', () => {
    expect(getInitials('Jamie Bartlett')).toBe('JB')
  })

  it('handles single name', () => {
    expect(getInitials('Moana')).toBe('M')
  })

  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })
})

describe('formatDate', () => {
  it('returns Never for null', () => {
    expect(formatDate(null)).toBe('Never')
  })

  it('formats a valid date', () => {
    const result = formatDate(new Date('2024-01-15T10:30:00Z'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
