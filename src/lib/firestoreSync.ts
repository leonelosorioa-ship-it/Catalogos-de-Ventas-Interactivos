import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  DEFAULT_DOMAIN_BASE,
  PLATFORM_ADMIN_EMAIL,
  migrateCatalogWorkspace,
  type CatalogWorkspace,
  type Product,
  type StoreTheme,
} from '../utils/catalogLogic.ts';
import {
  sanitizeCatalogForFirestore,
  sanitizeIdForFirestore,
  sanitizeProductForFirestore,
  sanitizeSlugForFirestore,
  sanitizeUserProfileForFirestore,
} from './blueprintConstraints.ts';
import { OperationType, db, handleFirestoreError } from './firebase.ts';

const MAX_PRODUCTS_PER_BATCH = 10;

function toIsoString(ts: unknown): string {
  if (
    ts &&
    typeof ts === 'object' &&
    'toDate' in ts &&
    typeof (ts as { toDate: () => Date }).toDate === 'function'
  ) {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export async function ensureUserProfileInFirestore(
  fbUser: User,
  platformDomain: string
): Promise<string | null> {
  if (!fbUser.emailVerified) return null;

  const path = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);
  const sanitized = sanitizeUserProfileForFirestore({
    uid: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
    platformDomain: platformDomain || DEFAULT_DOMAIN_BASE,
  });

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return sanitized.platformDomain;
    }

    const existingData = snap.data();
    const existingDomain =
      typeof existingData.platformDomain === 'string' && existingData.platformDomain.trim()
        ? existingData.platformDomain
        : sanitized.platformDomain;

    await updateDoc(userRef, {
      name: sanitized.name,
      email: sanitized.email,
      platformDomain: existingDomain,
      updatedAt: serverTimestamp(),
    });
    return existingDomain;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePlatformDomainInFirestore(
  fbUser: User,
  platformDomain: string
): Promise<void> {
  if (!fbUser.emailVerified) return;
  const path = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);
  const sanitized = sanitizeUserProfileForFirestore({
    uid: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
    platformDomain,
  });

  try {
    await updateDoc(userRef, {
      platformDomain: sanitized.platformDomain,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function fetchProductsForCatalog(
  catalogId: string,
  ownerUid?: string,
  asAdmin = false
): Promise<Product[]> {
  const path = `catalogs/${catalogId}/products`;
  const colRef = collection(db, 'catalogs', catalogId, 'products');
  const q = asAdmin
    ? colRef
    : ownerUid
      ? query(colRef, where('ownerUid', '==', ownerUid))
      : query(colRef, where('isPublic', '==', true));

  try {
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        sortOrder: Number(data.sortOrder ?? 0),
        product: {
          id: Number(data.id ?? 1),
          categoria: String(data.categoria || 'General'),
          nombre: String(data.nombre || 'Producto'),
          precioActual: Number(data.precioActual ?? 1000),
          precioAnterior: Number(data.precioAnterior ?? 0),
          descripcion: String(data.descripcion || ''),
          imagen: String(data.imagen || ''),
        } satisfies Product,
      };
    });
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    return items.map((i) => i.product);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeUserCatalogsInFirestore(
  fbUser: User,
  ownerEmail: string,
  onCatalogs: (catalogs: CatalogWorkspace[]) => void
): Unsubscribe {
  const catalogsQuery = query(
    collection(db, 'catalogs'),
    where('ownerUid', '==', fbUser.uid)
  );

  return onSnapshot(
    catalogsQuery,
    async (snapshot) => {
      try {
        const workspaces = await Promise.all(
          snapshot.docs.map(async (catDoc) => {
            const data = catDoc.data();
            const products = await fetchProductsForCatalog(catDoc.id, fbUser.uid);
            return migrateCatalogWorkspace({
              id: catDoc.id,
              ownerEmail,
              config: {
                nombre: String(data.nombre || 'Mi Catálogo'),
                subdominio: String(data.subdominio || catDoc.id),
                dominioBase: String(data.dominioBase || DEFAULT_DOMAIN_BASE),
                descripcion: String(data.descripcion || ''),
                whatsapp: String(data.whatsapp || '573001234567'),
                tema: (data.tema as StoreTheme) || 'light',
                isPro: Boolean(data.isPro),
                logoUrl: String(data.logoUrl || ''),
              },
              products,
              updatedAt: toIsoString(data.updatedAt),
            });
          })
        );
        onCatalogs(workspaces);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'catalogs');
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'catalogs');
    }
  );
}

async function resolveNonCollidingCatalogIds(
  fbUser: User,
  workspace: CatalogWorkspace
): Promise<{
  cleanCat: ReturnType<typeof sanitizeCatalogForFirestore>;
  changed: boolean;
}> {
  const baseCat = sanitizeCatalogForFirestore(workspace, fbUser.uid);
  const uidTag = fbUser.uid.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, 'u');
  let resolvedId = baseCat.id;
  let resolvedSlug = baseCat.subdominio;
  let changed = false;

  // Check if catalogId already belongs to a different user
  try {
    const catSnap = await getDoc(doc(db, 'catalogs', resolvedId));
    if (catSnap.exists() && catSnap.data().ownerUid !== fbUser.uid) {
      resolvedId = sanitizeIdForFirestore(`cat-${uidTag}-${resolvedSlug}`);
      changed = true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `catalogs/${resolvedId}`);
  }

  // Check if subdomain slug already belongs to a different user
  try {
    const slugSnap = await getDoc(doc(db, 'slugs', resolvedSlug));
    if (slugSnap.exists() && slugSnap.data().ownerUid !== fbUser.uid) {
      resolvedSlug = sanitizeSlugForFirestore(
        `${resolvedSlug.slice(0, 48)}-${uidTag}`
      );
      changed = true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `slugs/${resolvedSlug}`);
  }

  return {
    cleanCat: {
      ...baseCat,
      id: resolvedId,
      subdominio: resolvedSlug,
    },
    changed,
  };
}

export async function syncCatalogsToFirestore(
  fbUser: User,
  catalogs: CatalogWorkspace[],
  platformDomain: string
): Promise<{ catalogs: CatalogWorkspace[]; idsUpdated: boolean }> {
  if (!fbUser.emailVerified) {
    return { catalogs, idsUpdated: false };
  }

  await ensureUserProfileInFirestore(fbUser, platformDomain);

  const ownerQuery = query(
    collection(db, 'catalogs'),
    where('ownerUid', '==', fbUser.uid)
  );

  let existingCatalogDocs;
  try {
    existingCatalogDocs = await getDocs(ownerQuery);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'catalogs');
  }

  const existingById = new Map(existingCatalogDocs.docs.map((d) => [d.id, d.data()]));

  const resolvedPairs: Array<{
    original: CatalogWorkspace;
    cleanCat: ReturnType<typeof sanitizeCatalogForFirestore>;
  }> = [];
  let idsUpdated = false;

  for (const workspace of catalogs) {
    const { cleanCat, changed } = await resolveNonCollidingCatalogIds(fbUser, workspace);
    if (changed) idsUpdated = true;
    resolvedPairs.push({
      original: {
        ...workspace,
        id: cleanCat.id,
        ownerEmail: fbUser.email || workspace.ownerEmail,
        config: {
          ...workspace.config,
          subdominio: cleanCat.subdominio,
          dominioBase: cleanCat.dominioBase,
        },
      },
      cleanCat,
    });
  }

  const desiredCatalogIds = new Set(resolvedPairs.map((p) => p.cleanCat.id));

  // 1. Delete removed catalogs (products in chunks first to stay below batch lookup limits)
  for (const existingDoc of existingCatalogDocs.docs) {
    if (!desiredCatalogIds.has(existingDoc.id)) {
      const productsSnap = await getDocs(
        query(
          collection(db, 'catalogs', existingDoc.id, 'products'),
          where('ownerUid', '==', fbUser.uid)
        )
      );
      for (let i = 0; i < productsSnap.docs.length; i += MAX_PRODUCTS_PER_BATCH) {
        const prodDelBatch = writeBatch(db);
        for (const pDoc of productsSnap.docs.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
          prodDelBatch.delete(pDoc.ref);
        }
        try {
          await prodDelBatch.commit();
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.DELETE,
            `catalogs/${existingDoc.id}/products`
          );
        }
      }

      const batch = writeBatch(db);
      const oldSlug = sanitizeSlugForFirestore(String(existingDoc.data().subdominio || ''));
      if (oldSlug) {
        try {
          const oldSlugSnap = await getDoc(doc(db, 'slugs', oldSlug));
          if (oldSlugSnap.exists() && oldSlugSnap.data().ownerUid === fbUser.uid) {
            batch.delete(oldSlugSnap.ref);
          }
        } catch {
          // ignore non-owned slug
        }
      }
      batch.delete(existingDoc.ref);
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `catalogs/${existingDoc.id}`);
      }
    }
  }

  // 2. Upsert active catalogs + slugs first, then products in batches of <= 10
  for (const { original: workspace, cleanCat } of resolvedPairs) {
    const catRef = doc(db, 'catalogs', cleanCat.id);
    const existingCat = existingById.get(cleanCat.id);

    const catBatch = writeBatch(db);
    if (existingCat) {
      catBatch.update(catRef, {
        nombre: cleanCat.nombre,
        subdominio: cleanCat.subdominio,
        dominioBase: cleanCat.dominioBase,
        descripcion: cleanCat.descripcion,
        whatsapp: cleanCat.whatsapp,
        tema: cleanCat.tema,
        isPro: cleanCat.isPro,
        isPublic: cleanCat.isPublic,
        logoUrl: cleanCat.logoUrl,
        updatedAt: serverTimestamp(),
      });

      const prevSlug = sanitizeSlugForFirestore(String(existingCat.subdominio || ''));
      if (prevSlug && prevSlug !== cleanCat.subdominio) {
        const prevSlugSnap = await getDoc(doc(db, 'slugs', prevSlug));
        if (prevSlugSnap.exists() && prevSlugSnap.data().ownerUid === fbUser.uid) {
          catBatch.delete(prevSlugSnap.ref);
        }
      }
    } else {
      catBatch.set(catRef, {
        ...cleanCat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const slugRef = doc(db, 'slugs', cleanCat.subdominio);
    const slugSnap = await getDoc(slugRef);
    if (slugSnap.exists() && slugSnap.data().ownerUid === fbUser.uid) {
      catBatch.update(slugRef, {
        catalogId: cleanCat.id,
        isPublic: cleanCat.isPublic,
        updatedAt: serverTimestamp(),
      });
    } else if (!slugSnap.exists()) {
      catBatch.set(slugRef, {
        slug: cleanCat.subdominio,
        catalogId: cleanCat.id,
        ownerUid: fbUser.uid,
        isPublic: cleanCat.isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await catBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `catalogs/${cleanCat.id}`);
    }

    const existingProductsSnap = await getDocs(
      query(
        collection(db, 'catalogs', cleanCat.id, 'products'),
        where('ownerUid', '==', fbUser.uid)
      )
    );
    const existingProductsMap = new Map(
      existingProductsSnap.docs.map((d) => [d.id, d.data()])
    );

    const desiredProductIds = new Set<string>();
    const productOps: Array<{
      docId: string;
      isUpdate: boolean;
      data: ReturnType<typeof sanitizeProductForFirestore>;
    }> = [];

    workspace.products.forEach((prod, index) => {
      const cleanProd = sanitizeProductForFirestore(
        prod,
        cleanCat.id,
        fbUser.uid,
        index,
        cleanCat.isPublic
      );
      const prodDocId = `prod-${cleanProd.id}`;
      desiredProductIds.add(prodDocId);
      productOps.push({
        docId: prodDocId,
        isUpdate: existingProductsMap.has(prodDocId),
        data: cleanProd,
      });
    });

    for (let i = 0; i < productOps.length; i += MAX_PRODUCTS_PER_BATCH) {
      const prodBatch = writeBatch(db);
      for (const op of productOps.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
        const prodRef = doc(db, 'catalogs', cleanCat.id, 'products', op.docId);
        if (op.isUpdate) {
          prodBatch.update(prodRef, {
            nombre: op.data.nombre,
            categoria: op.data.categoria,
            precioActual: op.data.precioActual,
            precioAnterior: op.data.precioAnterior,
            descripcion: op.data.descripcion,
            imagen: op.data.imagen,
            sortOrder: op.data.sortOrder,
            isPublic: op.data.isPublic,
            updatedAt: serverTimestamp(),
          });
        } else {
          prodBatch.set(prodRef, {
            ...op.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      try {
        await prodBatch.commit();
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `catalogs/${cleanCat.id}/products`
        );
      }
    }

    const removedProductDocs = existingProductsSnap.docs.filter(
      (d) => !desiredProductIds.has(d.id)
    );
    for (let i = 0; i < removedProductDocs.length; i += MAX_PRODUCTS_PER_BATCH) {
      const delBatch = writeBatch(db);
      for (const d of removedProductDocs.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
        delBatch.delete(d.ref);
      }
      try {
        await delBatch.commit();
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `catalogs/${cleanCat.id}/products`
        );
      }
    }
  }

  return {
    catalogs: resolvedPairs.map((p) => p.original),
    idsUpdated,
  };
}

export async function fetchPublicCatalogFromFirestore(
  slug: string
): Promise<CatalogWorkspace | null> {
  const cleanSlug = sanitizeSlugForFirestore(slug);
  if (!cleanSlug) return null;

  try {
    const slugSnap = await getDoc(doc(db, 'slugs', cleanSlug));
    if (!slugSnap.exists()) return null;

    const slugData = slugSnap.data();
    const catalogId = typeof slugData.catalogId === 'string' ? slugData.catalogId : '';
    if (!catalogId) return null;

    const catSnap = await getDoc(doc(db, 'catalogs', catalogId));
    if (!catSnap.exists()) return null;

    const data = catSnap.data();
    const products = await fetchProductsForCatalog(catalogId);

    return migrateCatalogWorkspace({
      id: catSnap.id,
      ownerEmail: '',
      config: {
        nombre: String(data.nombre || 'Catálogo'),
        subdominio: String(data.subdominio || cleanSlug),
        dominioBase: String(data.dominioBase || DEFAULT_DOMAIN_BASE),
        descripcion: String(data.descripcion || ''),
        whatsapp: String(data.whatsapp || '573001234567'),
        tema: (data.tema as StoreTheme) || 'light',
        isPro: Boolean(data.isPro),
        logoUrl: String(data.logoUrl || ''),
      },
      products,
      updatedAt: toIsoString(data.updatedAt),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `slugs/${cleanSlug}`);
  }
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  name: string;
  platformDomain: string;
  createdAt: string;
}

export interface AdminCatalogWorkspace extends CatalogWorkspace {
  ownerUid: string;
}

function isVerifiedAdminFirebaseUser(fbUser: User): boolean {
  return (
    fbUser.emailVerified === true &&
    (fbUser.email || '').trim().toLowerCase() === PLATFORM_ADMIN_EMAIL
  );
}

export async function fetchAllUsersAdminInFirestore(
  fbUser: User
): Promise<AdminUserRecord[]> {
  if (!isVerifiedAdminFirebaseUser(fbUser)) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        email: String(data.email || ''),
        name: String(data.name || 'Comercio'),
        platformDomain: String(data.platformDomain || DEFAULT_DOMAIN_BASE),
        createdAt: toIsoString(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export function subscribeAllCatalogsAdminInFirestore(
  fbUser: User,
  onCatalogs: (catalogs: AdminCatalogWorkspace[]) => void
): Unsubscribe {
  if (!isVerifiedAdminFirebaseUser(fbUser)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'catalogs'),
    async (snapshot) => {
      try {
        const items = await Promise.all(
          snapshot.docs.map(async (catDoc) => {
            const data = catDoc.data();
            const ownerUid = String(data.ownerUid || fbUser.uid);
            const products = await fetchProductsForCatalog(catDoc.id, undefined, true);
            const base = migrateCatalogWorkspace({
              id: catDoc.id,
              ownerEmail: ownerUid === fbUser.uid ? fbUser.email || PLATFORM_ADMIN_EMAIL : `uid:${ownerUid}`,
              config: {
                nombre: String(data.nombre || 'Catálogo'),
                subdominio: String(data.subdominio || catDoc.id),
                dominioBase: String(data.dominioBase || DEFAULT_DOMAIN_BASE),
                descripcion: String(data.descripcion || ''),
                whatsapp: String(data.whatsapp || '573001234567'),
                tema: (data.tema as StoreTheme) || 'light',
                isPro: Boolean(data.isPro),
                logoUrl: String(data.logoUrl || ''),
              },
              products,
              updatedAt: toIsoString(data.updatedAt),
            });
            return {
              ...base,
              ownerUid,
            } satisfies AdminCatalogWorkspace;
          })
        );
        onCatalogs(items);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'catalogs');
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'catalogs');
    }
  );
}

export async function adminCreateMerchantAccountInFirestore(
  fbUser: User,
  input: {
    ownerUid: string;
    ownerEmail: string;
    ownerName: string;
    platformDomain: string;
  }
): Promise<AdminUserRecord | null> {
  if (!isVerifiedAdminFirebaseUser(fbUser)) return null;
  const sanitized = sanitizeUserProfileForFirestore({
    uid: input.ownerUid,
    email: input.ownerEmail,
    name: input.ownerName,
    platformDomain: input.platformDomain || DEFAULT_DOMAIN_BASE,
  });
  const path = `users/${sanitized.uid}`;
  const userRef = doc(db, 'users', sanitized.uid);

  try {
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return {
      ...sanitized,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveCatalogInFirestore(
  fbUser: User,
  workspace: AdminCatalogWorkspace
): Promise<void> {
  if (!isVerifiedAdminFirebaseUser(fbUser)) return;
  const targetOwnerUid = sanitizeIdForFirestore(workspace.ownerUid || fbUser.uid);
  const cleanCat = sanitizeCatalogForFirestore(workspace, targetOwnerUid);
  const catRef = doc(db, 'catalogs', cleanCat.id);

  try {
    const existingSnap = await getDoc(catRef);
    const batch = writeBatch(db);
    if (existingSnap.exists()) {
      const prevSlug = sanitizeSlugForFirestore(String(existingSnap.data().subdominio || ''));
      batch.update(catRef, {
        nombre: cleanCat.nombre,
        subdominio: cleanCat.subdominio,
        dominioBase: cleanCat.dominioBase,
        descripcion: cleanCat.descripcion,
        whatsapp: cleanCat.whatsapp,
        tema: cleanCat.tema,
        isPro: cleanCat.isPro,
        isPublic: cleanCat.isPublic,
        logoUrl: cleanCat.logoUrl,
        updatedAt: serverTimestamp(),
      });
      if (prevSlug && prevSlug !== cleanCat.subdominio) {
        batch.delete(doc(db, 'slugs', prevSlug));
      }
    } else {
      batch.set(catRef, {
        ...cleanCat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const slugRef = doc(db, 'slugs', cleanCat.subdominio);
    const slugSnap = await getDoc(slugRef);
    if (slugSnap.exists()) {
      batch.update(slugRef, {
        catalogId: cleanCat.id,
        isPublic: cleanCat.isPublic,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(slugRef, {
        slug: cleanCat.subdominio,
        catalogId: cleanCat.id,
        ownerUid: targetOwnerUid,
        isPublic: cleanCat.isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    const prodCol = collection(db, 'catalogs', cleanCat.id, 'products');
    const existingProdsSnap = await getDocs(prodCol);
    const existingProdsMap = new Map(existingProdsSnap.docs.map((d) => [d.id, d.data()]));
    const desiredIds = new Set<string>();

    const ops = workspace.products.map((prod, idx) => {
      const cleanProd = sanitizeProductForFirestore(
        prod,
        cleanCat.id,
        targetOwnerUid,
        idx,
        cleanCat.isPublic
      );
      const docId = `prod-${cleanProd.id}`;
      desiredIds.add(docId);
      return { docId, isUpdate: existingProdsMap.has(docId), data: cleanProd };
    });

    for (let i = 0; i < ops.length; i += MAX_PRODUCTS_PER_BATCH) {
      const prodBatch = writeBatch(db);
      for (const op of ops.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
        const pRef = doc(db, 'catalogs', cleanCat.id, 'products', op.docId);
        if (op.isUpdate) {
          prodBatch.update(pRef, {
            nombre: op.data.nombre,
            categoria: op.data.categoria,
            precioActual: op.data.precioActual,
            precioAnterior: op.data.precioAnterior,
            descripcion: op.data.descripcion,
            imagen: op.data.imagen,
            sortOrder: op.data.sortOrder,
            isPublic: op.data.isPublic,
            updatedAt: serverTimestamp(),
          });
        } else {
          prodBatch.set(pRef, {
            ...op.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await prodBatch.commit();
    }

    const removed = existingProdsSnap.docs.filter((d) => !desiredIds.has(d.id));
    for (let i = 0; i < removed.length; i += MAX_PRODUCTS_PER_BATCH) {
      const delBatch = writeBatch(db);
      for (const d of removed.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
        delBatch.delete(d.ref);
      }
      await delBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `catalogs/${cleanCat.id}`);
  }
}

export async function adminDeleteCatalogInFirestore(
  fbUser: User,
  catalogId: string
): Promise<void> {
  if (!isVerifiedAdminFirebaseUser(fbUser)) return;
  const cleanId = sanitizeIdForFirestore(catalogId);
  try {
    const catRef = doc(db, 'catalogs', cleanId);
    const catSnap = await getDoc(catRef);
    const prodsSnap = await getDocs(collection(db, 'catalogs', cleanId, 'products'));
    for (let i = 0; i < prodsSnap.docs.length; i += MAX_PRODUCTS_PER_BATCH) {
      const delBatch = writeBatch(db);
      for (const p of prodsSnap.docs.slice(i, i + MAX_PRODUCTS_PER_BATCH)) {
        delBatch.delete(p.ref);
      }
      await delBatch.commit();
    }
    if (catSnap.exists()) {
      const slug = sanitizeSlugForFirestore(String(catSnap.data().subdominio || ''));
      if (slug) {
        const slugRef = doc(db, 'slugs', slug);
        const slugSnap = await getDoc(slugRef);
        if (slugSnap.exists() && slugSnap.data().catalogId === cleanId) {
          await deleteDoc(slugRef);
        }
      }
      await deleteDoc(catRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `catalogs/${cleanId}`);
  }
}
