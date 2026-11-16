import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name?.trim() || email.split('@')[0] || 'Administrador',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name?.trim() ? { name: name.trim() } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('Database operation failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateUserPlatformDomain(uid: string, platformDomain: string) {
  try {
    const result = await db
      .update(users)
      .set({
        platformDomain,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Failed to update user platform domain:', error);
    throw new Error('Database operation failed. Please try again later.', {
      cause: error,
    });
  }
}
