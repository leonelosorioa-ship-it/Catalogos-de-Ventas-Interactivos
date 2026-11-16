import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  ensureUserProfileInFirestore,
  fetchPublicCatalogFromFirestore,
  subscribeUserCatalogsInFirestore,
  syncCatalogsToFirestore,
} from './lib/firestoreSync';
import { AuthLoginView } from './components/AuthLoginView';
import { CatalogView } from './components/CatalogView';
import { DashboardView } from './components/DashboardView';
import { LandingView } from './components/LandingView';
import { ViewSwitcher } from './components/ViewSwitcher';
import {
  DEFAULT_CATALOG_WORKSPACE,
  DEFAULT_DEMO_USER,
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_CONFIG,
  LEGACY_STORAGE_KEYS,
  STORAGE_KEYS,
  createCatalogWorkspace,
  findCatalogBySlug,
  formatStoreUrl,
  loadPlatformDomainBase,
  migrateCatalogWorkspace,
  resolveRouteTarget,
  savePlatformDomainBase,
  type CartItem,
  type CatalogWorkspace,
  type Product,
  type StoreConfig,
  type StoreTheme,
  type UserAccount,
  type ViewMode,
} from './utils/catalogLogic';

function loadInitialUsers(): UserAccount[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.USERS) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.USERS);
    if (!raw) {
      const seed = [DEFAULT_DEMO_USER];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_DEMO_USER];
  } catch {
    return [DEFAULT_DEMO_USER];
  }
}

function loadInitialSession(): UserAccount | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.SESSION) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

function loadInitialCatalogs(): CatalogWorkspace[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.CATALOGS) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.CATALOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migratedList = (parsed as CatalogWorkspace[]).map(migrateCatalogWorkspace);
        localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(migratedList));
        return migratedList;
      }
    }

    // Migrate single-catalog keys if present
    const legacyConfigRaw =
      localStorage.getItem(STORAGE_KEYS.STORE_CONFIG) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.STORE_CONFIG);
    const legacyProductsRaw =
      localStorage.getItem(STORAGE_KEYS.INVENTORY) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.INVENTORY);
    const migrated: CatalogWorkspace = migrateCatalogWorkspace({
      ...DEFAULT_CATALOG_WORKSPACE,
      config: legacyConfigRaw
        ? { ...DEFAULT_STORE_CONFIG, ...(JSON.parse(legacyConfigRaw) as Partial<StoreConfig>) }
        : DEFAULT_STORE_CONFIG,
      products: legacyProductsRaw
        ? (JSON.parse(legacyProductsRaw) as Product[])
        : DEFAULT_PRODUCTS,
    });
    const seed = [migrated];
    localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(seed));
    return seed;
  } catch {
    return [DEFAULT_CATALOG_WORKSPACE];
  }
}

function loadInitialActiveCatalogId(catalogs: CatalogWorkspace[]): string {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEYS.ACTIVE_CATALOG_ID) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.ACTIVE_CATALOG_ID);
    if (saved && catalogs.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return catalogs[0]?.id || DEFAULT_CATALOG_WORKSPACE.id;
}

function loadInitialCart(): CartItem[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.CART) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.CART);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getInitialRouteTarget(): { view: ViewMode; catalogSlug: string | null } {
  if (typeof window === 'undefined') return { view: 'landing', catalogSlug: null };
  const target = resolveRouteTarget({
    hostname: window.location.hostname,
    search: window.location.search,
    pathname: window.location.pathname,
  });
  return {
    view: target.view || 'landing',
    catalogSlug: target.catalogSlug,
  };
}

export default function App() {
  const [initialRoute] = useState(getInitialRouteTarget);
  const [activeView, setActiveView] = useState<ViewMode>(initialRoute.view);
  const [users, setUsers] = useState<UserAccount[]>(loadInitialUsers);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(loadInitialSession);
  const [catalogs, setCatalogs] = useState<CatalogWorkspace[]>(loadInitialCatalogs);
  const [activeCatalogId, setActiveCatalogId] = useState<string>(() => {
    if (initialRoute.catalogSlug) {
      const matched = findCatalogBySlug(catalogs, initialRoute.catalogSlug);
      if (matched) return matched.id;
    }
    return loadInitialActiveCatalogId(catalogs);
  });
  const [remotePublicCatalog, setRemotePublicCatalog] =
    useState<CatalogWorkspace | null>(null);
  const [platformDomain, setPlatformDomain] = useState<string>(() =>
    loadPlatformDomainBase()
  );
  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);

  // Store Firebase Auth user & ID token strictly in memory (never in localStorage)
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const skipNextFirestoreSaveRef = useRef(false);
  const firestoreSeedAttemptedRef = useRef<string | null>(null);

  const localMatchedCatalog = initialRoute.catalogSlug
    ? findCatalogBySlug(catalogs, initialRoute.catalogSlug)
    : undefined;

  const activeCatalog =
    (activeView === 'catalog' && localMatchedCatalog) ||
    (activeView === 'catalog' && remotePublicCatalog) ||
    catalogs.find((c) => c.id === activeCatalogId) ||
    catalogs[0] ||
    DEFAULT_CATALOG_WORKSPACE;

  const syncWithCloudAccount = async (
    token: string,
    seedCatalogs?: CatalogWorkspace[],
    seedDomain?: string
  ) => {
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        user?: { uid: string; email: string; name: string; platformDomain?: string };
        catalogs?: CatalogWorkspace[];
      };

      if (data.user?.platformDomain) {
        const savedDom = savePlatformDomainBase(data.user.platformDomain);
        if (savedDom.valid) setPlatformDomain(savedDom.normalized);
      }

      if (Array.isArray(data.catalogs) && data.catalogs.length > 0) {
        const cloudCatalogs = data.catalogs.map(migrateCatalogWorkspace);
        skipNextCloudSaveRef.current = true;
        setCatalogs(cloudCatalogs);
        setActiveCatalogId((prev) =>
          cloudCatalogs.some((c) => c.id === prev) ? prev : cloudCatalogs[0].id
        );
      } else if (seedCatalogs && seedCatalogs.length > 0) {
        const putRes = await fetch('/api/catalogs', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            catalogs: seedCatalogs,
            platformDomain: seedDomain || platformDomain,
          }),
        });
        if (putRes.ok) {
          const putData = (await putRes.json()) as { catalogs?: CatalogWorkspace[] };
          if (Array.isArray(putData.catalogs) && putData.catalogs.length > 0) {
            skipNextCloudSaveRef.current = true;
            setCatalogs(putData.catalogs.map(migrateCatalogWorkspace));
            setActiveCatalogId(putData.catalogs[0].id);
          }
        }
      }
    } catch {
      // Keep local workspace intact if cloud endpoint is temporarily unreachable
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsAuthReady(true);
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setFirebaseIdToken(null);
        firestoreSeedAttemptedRef.current = null;
        return;
      }
      try {
        const token = await fbUser.getIdToken();
        setFirebaseIdToken(token);
        setCurrentUser({
          id: fbUser.uid,
          name:
            fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
          email: fbUser.email || '',
          password: '',
          createdAt: new Date().toISOString(),
        });
        await syncWithCloudAccount(token, catalogs, platformDomain);
        if (fbUser.emailVerified) {
          const fsDomain = await ensureUserProfileInFirestore(fbUser, platformDomain);
          if (fsDomain) {
            const savedDom = savePlatformDomainBase(fsDomain);
            if (savedDom.valid) setPlatformDomain(savedDom.normalized);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('"operationType"')) {
          setFatalFirestoreError(err);
        } else {
          setFirebaseIdToken(null);
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (!isAuthReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    const unsubscribe = subscribeUserCatalogsInFirestore(
      firebaseUser,
      firebaseUser.email || '',
      (fsCatalogs) => {
        if (fsCatalogs.length > 0) {
          skipNextFirestoreSaveRef.current = true;
          setCatalogs(fsCatalogs);
          setActiveCatalogId((prev) =>
            fsCatalogs.some((c) => c.id === prev) ? prev : fsCatalogs[0].id
          );
        } else if (
          firestoreSeedAttemptedRef.current !== firebaseUser.uid &&
          catalogs.length > 0
        ) {
          firestoreSeedAttemptedRef.current = firebaseUser.uid;
          void syncCatalogsToFirestore(firebaseUser, catalogs, platformDomain).catch(
            (err) => {
              if (err instanceof Error) setFatalFirestoreError(err);
            }
          );
        }
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, firebaseUser?.uid, firebaseUser?.emailVerified]);

  useEffect(() => {
    if (!initialRoute.catalogSlug || localMatchedCatalog) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/catalog?slug=${encodeURIComponent(initialRoute.catalogSlug!)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { catalog?: CatalogWorkspace };
          if (!cancelled && data?.catalog) {
            setRemotePublicCatalog(migrateCatalogWorkspace(data.catalog));
            return;
          }
        }
      } catch {
        // Fallback to Firestore public catalog lookup below
      }

      try {
        const fsCatalog = await fetchPublicCatalogFromFirestore(
          initialRoute.catalogSlug!
        );
        if (!cancelled && fsCatalog) {
          setRemotePublicCatalog(fsCatalog);
        }
      } catch {
        // Keep default catalog fallback if slug is not published in Firestore yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRoute.catalogSlug, localMatchedCatalog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(catalogs));
    } catch {
      // ignore
    }
    fetch('/api/public/catalogs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogs }),
    }).catch(() => {
      // ignore background sync failure when offline
    });

    if (firebaseIdToken) {
      if (skipNextCloudSaveRef.current) {
        skipNextCloudSaveRef.current = false;
      } else {
        fetch('/api/catalogs', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseIdToken}`,
          },
          body: JSON.stringify({ catalogs, platformDomain }),
        }).catch(() => {
          // ignore transient network failure
        });
      }
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      if (skipNextFirestoreSaveRef.current) {
        skipNextFirestoreSaveRef.current = false;
      } else {
        void syncCatalogsToFirestore(firebaseUser, catalogs, platformDomain).catch(
          (err) => {
            if (err instanceof Error) setFatalFirestoreError(err);
          }
        );
      }
    }
  }, [catalogs, firebaseIdToken, firebaseUser, platformDomain]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CATALOG_ID, activeCatalogId);
    } catch {
      // ignore
    }
  }, [activeCatalogId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const handleNavigate = (view: ViewMode) => {
    if (view === 'login' && currentUser) {
      setActiveView('dashboard');
    } else {
      setActiveView(view);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleGoogleLoginSuccess = async ({
    uid,
    email,
    name,
    idToken,
  }: {
    uid: string;
    email: string;
    name: string;
    idToken: string;
  }) => {
    setFirebaseIdToken(idToken);
    setCurrentUser({
      id: uid,
      name,
      email,
      password: '',
      createdAt: new Date().toISOString(),
    });
    await syncWithCloudAccount(idToken, catalogs, platformDomain);
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleLogout = () => {
    setFirebaseIdToken(null);
    signOut(auth).catch(() => {});
    setCurrentUser(null);
    setActiveView('login');
  };

  const handleSelectCatalog = (catalogId: string) => {
    if (catalogId !== activeCatalogId) {
      setActiveCatalogId(catalogId);
      setCart([]);
    }
  };

  const handleCreateCatalog = (input: {
    nombre: string;
    subdominio: string;
    dominioBase: string;
    whatsapp: string;
    tema: StoreTheme;
    descripcion: string;
  }) => {
    const owner = currentUser?.email || DEFAULT_DEMO_USER.email;
    const created = createCatalogWorkspace(owner, input, catalogs);
    setCatalogs((prev) => [created, ...prev]);
    setActiveCatalogId(created.id);
    setCart([]);
  };

  const handleDeleteCatalog = (catalogId: string) => {
    setCatalogs((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((c) => c.id !== catalogId);
      if (activeCatalogId === catalogId && remaining[0]) {
        setActiveCatalogId(remaining[0].id);
        setCart([]);
      }
      return remaining;
    });
  };

  const handleUpdateConfig = (nextConfig: StoreConfig) => {
    setCatalogs((prev) =>
      prev.map((c) =>
        c.id === activeCatalog.id
          ? { ...c, config: nextConfig, updatedAt: new Date().toISOString() }
          : c
      )
    );
  };

  const handleSaveCustomDomain = ({
    subdominio,
    dominioBase,
    applyToAllCatalogs,
  }: {
    subdominio: string;
    dominioBase: string;
    applyToAllCatalogs: boolean;
  }) => {
    const saved = savePlatformDomainBase(dominioBase);
    const nextDomain = saved.valid ? saved.normalized : platformDomain;
    setPlatformDomain(nextDomain);

    setCatalogs((prev) =>
      prev.map((c) => {
        if (c.id === activeCatalog.id) {
          return {
            ...c,
            config: {
              ...c.config,
              subdominio,
              dominioBase: nextDomain,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        if (applyToAllCatalogs) {
          return {
            ...c,
            config: {
              ...c.config,
              dominioBase: nextDomain,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  const handleUpdateProducts = (nextProducts: Product[]) => {
    setCatalogs((prev) =>
      prev.map((c) =>
        c.id === activeCatalog.id
          ? { ...c, products: nextProducts, updatedAt: new Date().toISOString() }
          : c
      )
    );
  };

  const handleResetDemo = () => {
    setCatalogs((prev) =>
      prev.map((c) =>
        c.id === activeCatalog.id
          ? {
              ...c,
              config: {
                ...DEFAULT_STORE_CONFIG,
                dominioBase: platformDomain,
              },
              products: DEFAULT_PRODUCTS,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setCart([]);
  };

  const handleAddToCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  if (fatalFirestoreError) {
    throw fatalFirestoreError;
  }

  const effectiveView: ViewMode =
    activeView === 'dashboard' && !currentUser ? 'login' : activeView;

  return (
    <div data-active-view={effectiveView}>
      {effectiveView === 'landing' && (
        <LandingView
          storeName={activeCatalog.config.nombre}
          storeUrl={formatStoreUrl(activeCatalog.config)}
          productCount={activeCatalog.products.length}
          onNavigate={handleNavigate}
        />
      )}

      {effectiveView === 'login' && (
        <AuthLoginView
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onGoogleLoginSuccess={handleGoogleLoginSuccess}
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLanding={() => handleNavigate('landing')}
        />
      )}

      {effectiveView === 'dashboard' && currentUser && (
        <DashboardView
          currentUser={currentUser}
          catalogs={catalogs}
          activeCatalog={activeCatalog}
          platformDomain={platformDomain}
          onSelectCatalog={handleSelectCatalog}
          onCreateCatalog={handleCreateCatalog}
          onDeleteCatalog={handleDeleteCatalog}
          onUpdateConfig={handleUpdateConfig}
          onSaveCustomDomain={handleSaveCustomDomain}
          onUpdateProducts={handleUpdateProducts}
          onResetDemo={handleResetDemo}
          onOpenCatalog={(catalogId) => {
            if (catalogId) handleSelectCatalog(catalogId);
            handleNavigate('catalog');
          }}
          onLogout={handleLogout}
        />
      )}

      {effectiveView === 'catalog' && (
        <CatalogView
          storeConfig={activeCatalog.config}
          products={activeCatalog.products}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateCartQty={handleUpdateCartQty}
          onClearCart={handleClearCart}
          onOpenAdmin={() => handleNavigate('dashboard')}
        />
      )}

      <ViewSwitcher activeView={effectiveView} onChangeView={handleNavigate} />
    </div>
  );
}
