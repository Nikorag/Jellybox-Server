import { createDeviceAction, deleteDeviceAction, rotateDeviceKeyAction } from '@/app/dashboard/devices/actions'

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  db: {
    device: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/crypto', () => ({
  generateDeviceApiKey: jest.fn().mockResolvedValue({
    rawKey: 'jb_testrawkey',
    hash: '$2b$12$hash',
    prefix: 'jb_testkey',
  }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const { auth } = jest.requireMock('@/auth')
const { db } = jest.requireMock('@/lib/db')

const mockSession = { user: { id: 'user-1' } }

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue(mockSession)
})

describe('createDeviceAction', () => {
  it('returns error when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const fd = new FormData()
    fd.set('name', 'Test')
    const result = await createDeviceAction(fd)
    expect(result.error).toBe('Unauthorised')
  })

  it('returns error for empty name', async () => {
    const fd = new FormData()
    fd.set('name', '')
    const result = await createDeviceAction(fd)
    expect(result.error).toBeTruthy()
  })

  it('creates device and returns rawKey', async () => {
    db.device.create.mockResolvedValue({ id: 'device-1' })
    const fd = new FormData()
    fd.set('name', 'Living Room Box')
    const result = await createDeviceAction(fd)
    expect(result.error).toBeUndefined()
    expect(result.rawKey).toBe('jb_testrawkey')
    expect(result.deviceId).toBe('device-1')
    expect(db.device.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Living Room Box',
          userId: 'user-1',
        }),
      }),
    )
  })
})

describe('deleteDeviceAction', () => {
  it('deletes device for authenticated user', async () => {
    db.device.deleteMany.mockResolvedValue({ count: 1 })
    const result = await deleteDeviceAction('device-1')
    expect(result.error).toBeUndefined()
    expect(db.device.deleteMany).toHaveBeenCalledWith({
      where: { id: 'device-1', userId: 'user-1' },
    })
  })
})

describe('rotateDeviceKeyAction', () => {
  it('rotates key and returns new rawKey', async () => {
    db.device.findFirst.mockResolvedValue({ id: 'device-1' })
    db.device.update.mockResolvedValue({})
    const result = await rotateDeviceKeyAction('device-1')
    expect(result.error).toBeUndefined()
    expect(result.rawKey).toBe('jb_testrawkey')
  })

  it('returns error when device not found', async () => {
    db.device.findFirst.mockResolvedValue(null)
    const result = await rotateDeviceKeyAction('not-found')
    expect(result.error).toBe('Device not found.')
  })
})
