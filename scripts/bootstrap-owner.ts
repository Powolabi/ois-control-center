import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.INITIAL_OWNER_EMAIL
  const password = process.env.INITIAL_OWNER_PASSWORD
  const name = process.env.INITIAL_OWNER_NAME

  if (!email || !password) {
    throw new Error(
      'INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD must be set in environment'
    )
  }

  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log(`User ${email} already exists`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      name: name || 'System Administrator',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  console.log(`✓ Owner account created: ${user.email}`)
  console.log('✓ You can now log in with these credentials')
  console.log('✓ Please change your password after first login')
}

main()
  .catch((e) => {
    console.error('Error creating owner account:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
