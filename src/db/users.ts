import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'Comercio';

  try {
    const byUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (byUid[0]) {
      const updated = await db
        .update(users)
        .set({
          email: cleanEmail,
          ...(name?.trim() ? { name: cleanName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, byUid[0].id))
        .returning();
      return updated[0];
    }

    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (byEmail[0]) {
      const claimed = await db
        .update(users)
        .set({
          uid,
          ...(name?.trim() ? { name: cleanName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail[0].id))
        .returning();
      return claimed[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: cleanName,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('Database operation failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function adminPreprovisionUser(
  email: string,
  name: string,
  platformDomain = 'aurentime.shop'
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Comercio';
  const safeDomain = platformDomain.trim().toLowerCase() || 'aurentime.shop';

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(users)
        .set({
          name: name.trim() ? cleanName : existing[0].name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const slugSeed = cleanEmail
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const preUid = `acct-${slugSeed || 'store'}-${Date.now().toString(36).slice(-4)}`;

    const inserted = await db
      .insert(users)
      .values({
        uid: preUid,
        email: cleanEmail,
        name: cleanName,
        platformDomain: safeDomain,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to preprovision merchant user:', error);
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

export async function getAllUsersForAdmin() {
  try {
    return await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        platformDomain: users.platformDomain,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Failed to list all users for admin:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}
