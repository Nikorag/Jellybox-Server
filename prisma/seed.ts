import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.warn('Seeding development database…')

  // Create a test user
  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await db.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: new Date(),
      passwordHash,
    },
  })

  console.warn(`Created user: ${user.email} (id: ${user.id})`)
  console.warn('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
