import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { catalogs, products, users } from './schema.ts';
import type { CatalogWorkspace, Product, StoreTheme } from '../utils/catalogLogic.ts';

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mi-tienda';
}

function normalizeTheme(raw: string): StoreTheme {
  if (
    raw === 'dark' ||
    raw === 'galaxy' ||
    raw === 'light' ||
    raw === 'rosegold' ||
    raw === 'emerald' ||
    raw === 'sunset'
  ) {
    return raw;
  }
  return 'light';
}

function mapRowsToWorkspace(
  row: typeof catalogs.$inferSelect,
  productRows: Array<typeof products.$inferSelect>
): CatalogWorkspace {
  const mappedProducts: Product[] = productRows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precioActual: p.precioActual,
    precioAnterior: p.precioAnterior,
    descripcion: p.descripcion,
    imagen: p.imagen,
  }));

  return {
    id: row.id,
    ownerEmail: row.ownerEmail,
    config: {
      nombre: row.nombre,
      subdominio: row.subdominio,
      dominioBase: row.dominioBase,
      descripcion: row.descripcion,
      whatsapp: row.whatsapp,
      tema: normalizeTheme(row.tema),
      isPro: row.isPro,
      logoUrl: row.logoUrl,
    },
    products: mappedProducts,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getUserCatalogs(userId: number): Promise<CatalogWorkspace[]> {
  try {
    const userCatalogRows = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.userId, userId))
      .orderBy(asc(catalogs.createdAt));

    const results: CatalogWorkspace[] = [];
    for (const row of userCatalogRows) {
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.catalogId, row.id))
        .orderBy(asc(products.sortOrder), asc(products.id));
      results.push(mapRowsToWorkspace(row, productRows));
    }

    return results;
  } catch (error) {
    console.error('Failed to fetch user catalogs:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function getPublicCatalogBySlug(
  rawSlug: string
): Promise<CatalogWorkspace | null> {
  try {
    const slug = normalizeSlug(rawSlug);
    const rows = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.subdominio, slug))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.catalogId, row.id))
      .orderBy(asc(products.sortOrder), asc(products.id));

    return mapRowsToWorkspace(row, productRows);
  } catch (error) {
    console.error('Failed to fetch public catalog:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function replaceUserCatalogs(
  userId: number,
  ownerEmail: string,
  incoming: CatalogWorkspace[]
): Promise<CatalogWorkspace[]> {
  try {
    await db.transaction(async (tx) => {
      const existingOwned = await tx
        .select({ id: catalogs.id })
        .from(catalogs)
        .where(eq(catalogs.userId, userId));

      const incomingIds = new Set<string>();

      for (const workspace of incoming.slice(0, 50)) {
        let targetId = workspace.id?.trim() || `cat-${userId}-${Date.now().toString(36)}`;
        const collisionById = await tx
          .select({ userId: catalogs.userId })
          .from(catalogs)
          .where(eq(catalogs.id, targetId))
          .limit(1);

        if (collisionById[0] && collisionById[0].userId !== userId) {
          targetId = `${targetId}-u${userId}`;
        }

        let targetSlug = normalizeSlug(workspace.config?.subdominio || workspace.config?.nombre || 'tienda');
        const collisionBySlug = await tx
          .select({ id: catalogs.id, userId: catalogs.userId })
          .from(catalogs)
          .where(eq(catalogs.subdominio, targetSlug))
          .limit(1);

        if (collisionBySlug[0] && collisionBySlug[0].userId !== userId) {
          targetSlug = `${targetSlug}-${userId}`;
        }

        incomingIds.add(targetId);

        await tx
          .insert(catalogs)
          .values({
            id: targetId,
            userId,
            ownerEmail,
            nombre: workspace.config?.nombre?.trim() || 'Mi Tienda',
            subdominio: targetSlug,
            dominioBase: workspace.config?.dominioBase?.trim() || 'aurentime.shop',
            descripcion: workspace.config?.descripcion || '',
            whatsapp: workspace.config?.whatsapp || '573001234567',
            tema: workspace.config?.tema || 'light',
            isPro: Boolean(workspace.config?.isPro ?? true),
            logoUrl: workspace.config?.logoUrl || '',
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: catalogs.id,
            set: {
              ownerEmail,
              nombre: workspace.config?.nombre?.trim() || 'Mi Tienda',
              subdominio: targetSlug,
              dominioBase: workspace.config?.dominioBase?.trim() || 'aurentime.shop',
              descripcion: workspace.config?.descripcion || '',
              whatsapp: workspace.config?.whatsapp || '573001234567',
              tema: workspace.config?.tema || 'light',
              isPro: Boolean(workspace.config?.isPro ?? true),
              logoUrl: workspace.config?.logoUrl || '',
              updatedAt: new Date(),
            },
          });

        await tx.delete(products).where(eq(products.catalogId, targetId));

        if (Array.isArray(workspace.products) && workspace.products.length > 0) {
          await tx.insert(products).values(
            workspace.products.slice(0, 200).map((item, idx) => ({
              catalogId: targetId,
              sortOrder: idx,
              nombre: item.nombre?.trim() || 'Producto',
              categoria: item.categoria?.trim() || 'General',
              precioActual: Math.max(0, Math.round(Number(item.precioActual) || 0)),
              precioAnterior: Math.max(0, Math.round(Number(item.precioAnterior) || 0)),
              descripcion: item.descripcion || '',
              imagen: item.imagen || '',
            }))
          );
        }
      }

      for (const oldRow of existingOwned) {
        if (!incomingIds.has(oldRow.id)) {
          await tx
            .delete(catalogs)
            .where(and(eq(catalogs.id, oldRow.id), eq(catalogs.userId, userId)));
        }
      }
    });

    return await getUserCatalogs(userId);
  } catch (error) {
    console.error('Failed to sync user catalogs:', error);
    throw new Error('Database update failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function getAllCatalogsForAdmin(): Promise<
  Array<CatalogWorkspace & { ownerUid: string }>
> {
  try {
    const rows = await db
      .select({
        catalog: catalogs,
        ownerUid: users.uid,
      })
      .from(catalogs)
      .leftJoin(users, eq(catalogs.userId, users.id))
      .orderBy(desc(catalogs.updatedAt));

    const results: Array<CatalogWorkspace & { ownerUid: string }> = [];
    for (const entry of rows) {
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.catalogId, entry.catalog.id))
        .orderBy(asc(products.sortOrder), asc(products.id));
      results.push({
        ...mapRowsToWorkspace(entry.catalog, productRows),
        ownerUid: entry.ownerUid || `sql-user-${entry.catalog.userId}`,
      });
    }
    return results;
  } catch (error) {
    console.error('Failed to fetch all catalogs for admin:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function adminUpsertCatalog(
  fallbackUserId: number,
  workspace: CatalogWorkspace
): Promise<CatalogWorkspace> {
  try {
    let savedId = workspace.id?.trim() || `cat-admin-${Date.now().toString(36)}`;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(catalogs)
        .where(eq(catalogs.id, savedId))
        .limit(1);

      const targetUserId = existing[0]?.userId ?? fallbackUserId;
      const ownerEmail =
        workspace.ownerEmail?.trim() || existing[0]?.ownerEmail || 'agencialeps@gmail.com';
      let targetSlug = normalizeSlug(
        workspace.config?.subdominio || workspace.config?.nombre || 'tienda'
      );

      const slugCollision = await tx
        .select({ id: catalogs.id })
        .from(catalogs)
        .where(eq(catalogs.subdominio, targetSlug))
        .limit(1);

      if (slugCollision[0] && slugCollision[0].id !== savedId) {
        targetSlug = `${targetSlug}-${Date.now().toString(36).slice(-4)}`;
      }

      await tx
        .insert(catalogs)
        .values({
          id: savedId,
          userId: targetUserId,
          ownerEmail,
          nombre: workspace.config?.nombre?.trim() || 'Mi Tienda',
          subdominio: targetSlug,
          dominioBase: workspace.config?.dominioBase?.trim() || 'aurentime.shop',
          descripcion: workspace.config?.descripcion || '',
          whatsapp: workspace.config?.whatsapp || '573001234567',
          tema: normalizeTheme(workspace.config?.tema || 'light'),
          isPro: Boolean(workspace.config?.isPro ?? true),
          logoUrl: workspace.config?.logoUrl || '',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: catalogs.id,
          set: {
            nombre: workspace.config?.nombre?.trim() || 'Mi Tienda',
            subdominio: targetSlug,
            dominioBase: workspace.config?.dominioBase?.trim() || 'aurentime.shop',
            descripcion: workspace.config?.descripcion || '',
            whatsapp: workspace.config?.whatsapp || '573001234567',
            tema: normalizeTheme(workspace.config?.tema || 'light'),
            isPro: Boolean(workspace.config?.isPro ?? true),
            logoUrl: workspace.config?.logoUrl || '',
            updatedAt: new Date(),
          },
        });

      await tx.delete(products).where(eq(products.catalogId, savedId));

      if (Array.isArray(workspace.products) && workspace.products.length > 0) {
        await tx.insert(products).values(
          workspace.products.slice(0, 200).map((item, idx) => ({
            catalogId: savedId,
            sortOrder: idx,
            nombre: item.nombre?.trim() || 'Producto',
            categoria: item.categoria?.trim() || 'General',
            precioActual: Math.max(0, Math.round(Number(item.precioActual) || 0)),
            precioAnterior: Math.max(0, Math.round(Number(item.precioAnterior) || 0)),
            descripcion: item.descripcion || '',
            imagen: item.imagen || '',
          }))
        );
      }
    });

    const rows = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.id, savedId))
      .limit(1);
    const prodRows = await db
      .select()
      .from(products)
      .where(eq(products.catalogId, savedId))
      .orderBy(asc(products.sortOrder), asc(products.id));

    return mapRowsToWorkspace(rows[0], prodRows);
  } catch (error) {
    console.error('Failed to upsert catalog as admin:', error);
    throw new Error('Database update failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function adminDeleteCatalogById(catalogId: string): Promise<boolean> {
  try {
    const deleted = await db
      .delete(catalogs)
      .where(eq(catalogs.id, catalogId))
      .returning({ id: catalogs.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Failed to delete catalog as admin:', error);
    throw new Error('Database delete failed. Please try again later.', {
      cause: error,
    });
  }
}
