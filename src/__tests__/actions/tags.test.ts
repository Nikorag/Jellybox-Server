import { createTagAction, deleteTagAction, updateTagAction } from '@/app/dashboard/tags/actions'

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  db: {
    rfidTag: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const { auth } = jest.requireMock('@/auth')
const { db } = jest.requireMock('@/lib/db')

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('createTagAction', () => {
  it('rejects duplicate tag ID', async () => {
    db.rfidTag.findFirst.mockResolvedValue({ id: 'existing' })
    const fd = new FormData()
    fd.set('tagId', 'A1B2C3D4')
    fd.set('label', 'My tag')
    const result = await createTagAction(fd)
    expect(result.error).toContain('already registered')
  })

  it('creates tag successfully', async () => {
    db.rfidTag.findFirst.mockResolvedValue(null)
    db.rfidTag.create.mockResolvedValue({ id: 'tag-1' })
    const fd = new FormData()
    fd.set('tagId', 'A1B2C3D4')
    fd.set('label', 'The Lion King')
    const result = await createTagAction(fd)
    expect(result.error).toBeUndefined()
    expect(result.tagId).toBe('tag-1')
  })

  it('returns error for missing tagId', async () => {
    const fd = new FormData()
    fd.set('label', 'test')
    const result = await createTagAction(fd)
    expect(result.error).toBeTruthy()
  })
})

describe('deleteTagAction', () => {
  it('deletes tag for authenticated user', async () => {
    db.rfidTag.deleteMany.mockResolvedValue({ count: 1 })
    const result = await deleteTagAction('tag-1')
    expect(result.error).toBeUndefined()
    expect(db.rfidTag.deleteMany).toHaveBeenCalledWith({
      where: { id: 'tag-1', userId: 'user-1' },
    })
  })
})

describe('updateTagAction', () => {
  it('updates tag label and content assignment', async () => {
    db.rfidTag.updateMany.mockResolvedValue({ count: 1 })
    const fd = new FormData()
    fd.set('label', 'Updated Label')
    fd.set('jellyfinItemId', 'item-123')
    fd.set('jellyfinItemType', 'MOVIE')
    fd.set('jellyfinItemTitle', 'Finding Nemo')
    fd.set('jellyfinItemImageTag', 'abc123')
    const result = await updateTagAction('tag-1', fd)
    expect(result.error).toBeUndefined()
    expect(db.rfidTag.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tag-1', userId: 'user-1' },
      }),
    )
  })
})
