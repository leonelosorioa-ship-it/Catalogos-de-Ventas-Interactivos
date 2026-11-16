import type { User } from 'firebase/auth';
import {
  collection,
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
  ownerUid?: string
): Promise<Product[]> {
  const path = `catalogs/${catalogId}/products`;
  const colRef = collection(db, 'catalogs', catalogId, 'products');
  const q = ownerUid
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

export async function syncCatalogsToFirestore(
  fbUser: User,
  catalogs: CatalogWorkspace[],
  platformDomain: string
): Promise<void> {
  if (!fbUser.emailVerified) return;

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
  const desiredCatalogIds = new Set(
    catalogs.map((c) => sanitizeIdForFirestore(c.id))
  );

  // 1. Delete removed catalogs (child products first to preserve Master Gate parent get())
  for (const existingDoc of existingCatalogDocs.docs) {
    if (!desiredCatalogIds.has(existingDoc.id)) {
      const batch = writeBatch(db);
      const productsSnap = await getDocs(
        query(
          collection(db, 'catalogs', existingDoc.id, 'products'),
          where('ownerUid', '==', fbUser.uid)
        )
      );
      for (const pDoc of productsSnap.docs) {
        batch.delete(pDoc.ref);
      }
      const oldSlug = sanitizeSlugForFirestore(String(existingDoc.data().subdominio || ''));
      if (oldSlug) {
        batch.delete(doc(db, 'slugs', oldSlug));
      }
      batch.delete(existingDoc.ref);
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `catalogs/${existingDoc.id}`);
      }
    }
  }

  // 2. Upsert active catalogs, products subcollection, and atomic slug lookup docs
  for (const workspace of catalogs) {
    const cleanCat = sanitizeCatalogForFirestore(workspace, fbUser.uid);
    const catRef = doc(db, 'catalogs', cleanCat.id);
    const existingCat = existingById.get(cleanCat.id);

    const existingProductsSnap = await getDocs(
      query(
        collection(db, 'catalogs', cleanCat.id, 'products'),
        where('ownerUid', '==', fbUser.uid)
      )
    );
    const existingProductsMap = new Map(
      existingProductsSnap.docs.map((d) => [d.id, d.data()])
    );

    const batch = writeBatch(db);

    if (existingCat) {
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

      const prevSlug = sanitizeSlugForFirestore(String(existingCat.subdominio || ''));
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
    if (slugSnap.exists() && slugSnap.data().ownerUid === fbUser.uid) {
      batch.update(slugRef, {
        catalogId: cleanCat.id,
        isPublic: cleanCat.isPublic,
        updatedAt: serverTimestamp(),
      });
    } else if (!slugSnap.exists()) {
      batch.set(slugRef, {
        slug: cleanCat.subdominio,
        catalogId: cleanCat.id,
        ownerUid: fbUser.uid,
        isPublic: cleanCat.isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const desiredProductIds = new Set<string>();
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
      const prodRef = doc(db, 'catalogs', cleanCat.id, 'products', prodDocId);
      if (existingProductsMap.has(prodDocId)) {
        batch.update(prodRef, {
          nombre: cleanProd.nombre,
          categoria: cleanProd.categoria,
          precioActual: cleanProd.precioActual,
          precioAnterior: cleanProd.precioAnterior,
          descripcion: cleanProd.descripcion,
          imagen: cleanProd.imagen,
          sortOrder: cleanProd.sortOrder,
          isPublic: cleanProd.isPublic,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(prodRef, {
          ...cleanProd,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    for (const existingProdDoc of existingProductsSnap.docs) {
      if (!desiredProductIds.has(existingProdDoc.id)) {
        batch.delete(existingProdDoc.ref);
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `catalogs/${cleanCat.id}`);
    }
  }
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
