import { PrismaClient } from '@prisma/client';

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { id: SYSTEM_USER_ID },
      create: {
        id: SYSTEM_USER_ID,
        role: 'admin',
        displayName: 'System',
        email: null,
        passwordHash: null,
        active: true,
        emailConfirmed: false,
      },
      update: { displayName: 'System', active: true },
    });
    console.log(`[seed:system-user] ensured system user ${SYSTEM_USER_ID}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed:system-user] failed', error);
  process.exit(1);
});
