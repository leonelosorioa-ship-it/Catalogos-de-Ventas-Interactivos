import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  adminDeleteCatalogInFirestore,
  adminSaveCatalogInFirestore,
  ensureUserProfileInFirestore,
  fetchAllUsersAdminInFirestore,
  fetchPublicCatalogFromFirestore,
  subscribeAllCatalogsAdminInFirestore,
  subscribeUserCatalogsInFirestore,
  syncCatalogsToFirestore,
  type AdminCatalogWorkspace,
  type AdminUserRecord,
} from './lib/firestoreSync';
import { AuthLoginView } from './components/AuthLoginView';
import { CatalogView } from './components/CatalogView';
import { DashboardView } from './components/DashboardView';
import { LandingView } from './components/LandingView';
import {
  DEFAULT_CATALOG_WORKSPACE,
  DEFAULT_DEMO_USER,
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_CONFIG,
  LEGACY_STORAGE_KEYS,
  PLATFORM_ADMIN_EMAIL,
  STORAGE_KEYS,
  createCatalogWorkspace,
  findCatalogBySlug,
  formatDirectStoreDisplay,
  isVerifiedGoogleAdmin,
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
      // Remove any legacy local admin placeholder so agencialeps@gmail.com only authenticates via Google
      const sanitized = (parsed as UserAccount[]).filter(
        (u) => u && u.email?.trim().toLowerCase() !== PLATFORM_ADMIN_EMAIL
      );
      const hasDemo = sanitized.some(
        (u) => u.email?.trim().toLowerCase() === DEFAULT_DEMO_USER.email
      );
      const finalUsers = hasDemo ? sanitized : [DEFAULT_DEMO_USER, ...sanitized];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalUsers));
      return finalUsers;
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
    const parsed = JSON.parse(raw) as UserAccount;
    if (!parsed || !parsed.email) return null;
    // Never trust admin or google verification claims from localStorage alone; wait for Firebase Auth
    if (parsed.email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL) {
      return null;
    }
    return {
      ...parsed,
      role: 'merchant',
      authProvider: 'local',
      emailVerified: false,
    };
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
  const [routeSlug, setRouteSlug] = useState<string | null>(initialRoute.catalogSlug);
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
  const [adminCatalogs, setAdminCatalogs] = useState<AdminCatalogWorkspace[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const skipNextFirestoreSaveRef = useRef(false);
  const firestoreSeedAttemptedRef = useRef<string | null>(null);
  const hydratedFirestoreUidRef = useRef<string | null>(null);
  const lastLocalEditAtRef = useRef<number>(0);

  const isAdmin = isVerifiedGoogleAdmin(currentUser);

  const localMatchedCatalog = routeSlug
    ? findCatalogBySlug(catalogs, routeSlug)
    : undefined;

  const adminMatchedCatalog =
    isAdmin && routeSlug ? findCatalogBySlug(adminCatalogs, routeSlug) : undefined;

  const activeCatalog =
    (activeView === 'catalog' && (localMatchedCatalog || adminMatchedCatalog)) ||
    (activeView === 'catalog' && remotePublicCatalog) ||
    catalogs.find((c) => c.id === activeCatalogId) ||
    (isAdmin ? adminCatalogs.find((c) => c.id === activeCatalogId) : undefined) ||
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
        setAdminCatalogs([]);
        setAdminUsers([]);
        firestoreSeedAttemptedRef.current = null;
        hydratedFirestoreUidRef.current = null;
        return;
      }
      try {
        const token = await fbUser.getIdToken();
        setFirebaseIdToken(token);
        const cleanEmail = (fbUser.email || '').trim().toLowerCase();
        const isGoogleAdmin =
          cleanEmail === PLATFORM_ADMIN_EMAIL && fbUser.emailVerified === true;
        setCurrentUser({
          id: fbUser.uid,
          name:
            fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
          email: fbUser.email || '',
          password: '',
          createdAt: new Date().toISOString(),
          role: isGoogleAdmin ? 'admin' : 'merchant',
          authProvider: 'google',
          emailVerified: fbUser.emailVerified,
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
          const isInitialHydration = hydratedFirestoreUidRef.current !== firebaseUser.uid;
          // Ignore echoes emitted while local edits are being saved/debounced
          if (!isInitialHydration && Date.now() - lastLocalEditAtRef.current < 2500) {
            return;
          }
          hydratedFirestoreUidRef.current = firebaseUser.uid;
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
          void syncCatalogsToFirestore(firebaseUser, catalogs, platformDomain)
            .then((result) => {
              hydratedFirestoreUidRef.current = firebaseUser.uid;
              if (result.idsUpdated) {
                skipNextFirestoreSaveRef.current = true;
                setCatalogs(result.catalogs);
                setActiveCatalogId(result.catalogs[0]?.id || activeCatalogId);
              }
            })
            .catch((err) => {
              if (err instanceof Error) setFatalFirestoreError(err);
            });
        } else {
          hydratedFirestoreUidRef.current = firebaseUser.uid;
        }
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Platform Admin (agencialeps@gmail.com via Google) cross-store & user overview subscription
  useEffect(() => {
    if (!isAuthReady || !firebaseUser || !firebaseUser.emailVerified || !isAdmin) {
      setAdminCatalogs([]);
      setAdminUsers([]);
      return;
    }

    let cancelled = false;

    const loadAdminOverview = async () => {
      try {
        const fsUsers = await fetchAllUsersAdminInFirestore(firebaseUser);
        if (!cancelled && fsUsers.length > 0) {
          setAdminUsers(fsUsers);
        }
      } catch (err) {
        if (!cancelled && err instanceof Error && err.message.includes('"operationType"')) {
          setFatalFirestoreError(err);
        }
      }

      if (firebaseIdToken) {
        try {
          const res = await fetch('/api/admin/overview', {
            headers: { Authorization: `Bearer ${firebaseIdToken}` },
          });
          if (res.ok) {
            const data = (await res.json()) as {
              users?: AdminUserRecord[];
              catalogs?: Array<CatalogWorkspace & { ownerUid?: string }>;
            };
            if (!cancelled && Array.isArray(data.users) && data.users.length > 0) {
              setAdminUsers((prev) => {
                const map = new Map(prev.map((u) => [u.uid, u]));
                for (const u of data.users!) {
                  if (!map.has(u.uid)) map.set(u.uid, u);
                }
                return Array.from(map.values());
              });
            }
            if (!cancelled && Array.isArray(data.catalogs) && data.catalogs.length > 0) {
              setAdminCatalogs((prev) => {
                const map = new Map(prev.map((c) => [c.id, c]));
                for (const c of data.catalogs!) {
                  if (!map.has(c.id)) {
                    map.set(c.id, {
                      ...migrateCatalogWorkspace(c),
                      ownerUid: c.ownerUid || firebaseUser.uid,
                    });
                  }
                }
                return Array.from(map.values());
              });
            }
          }
        } catch {
          // Postgres optional locally; Firestore admin snapshot remains primary
        }
      }
    };

    void loadAdminOverview();

    const unsubAdmin = subscribeAllCatalogsAdminInFirestore(
      firebaseUser,
      (fsAdminCatalogs) => {
        if (cancelled) return;
        setAdminCatalogs((prev) => {
          const extraSql = prev.filter(
            (p) =>
              !fsAdminCatalogs.some((f) => f.id === p.id) &&
              p.ownerUid !== firebaseUser.uid
          );
          return [...fsAdminCatalogs, ...extraSql];
        });
      }
    );

    return () => {
      cancelled = true;
      unsubAdmin();
    };
  }, [isAuthReady, firebaseUser, firebaseIdToken, isAdmin]);

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

    const syncTimer = window.setTimeout(() => {
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

      if (
        firebaseUser &&
        firebaseUser.emailVerified &&
        hydratedFirestoreUidRef.current === firebaseUser.uid
      ) {
        if (skipNextFirestoreSaveRef.current) {
          skipNextFirestoreSaveRef.current = false;
        } else {
          lastLocalEditAtRef.current = Date.now();
          void syncCatalogsToFirestore(firebaseUser, catalogs, platformDomain)
            .then((result) => {
              lastLocalEditAtRef.current = Date.now();
              if (result.idsUpdated) {
                skipNextFirestoreSaveRef.current = true;
                setCatalogs(result.catalogs);
              }
            })
            .catch((err) => {
              if (err instanceof Error) setFatalFirestoreError(err);
            });
        }
      }
    }, 550);

    return () => window.clearTimeout(syncTimer);
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
    emailVerified,
    idToken,
  }: {
    uid: string;
    email: string;
    name: string;
    emailVerified: boolean;
    idToken: string;
  }) => {
    setFirebaseIdToken(idToken);
    const isGoogleAdmin =
      email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL && emailVerified === true;
    setCurrentUser({
      id: uid,
      name,
      email,
      password: '',
      createdAt: new Date().toISOString(),
      role: isGoogleAdmin ? 'admin' : 'merchant',
      authProvider: 'google',
      emailVerified,
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
    setAdminCatalogs([]);
    setAdminUsers([]);
    signOut(auth).catch(() => {});
    setCurrentUser(null);
    setActiveView('login');
  };

  const handleSelectCatalog = (catalogId: string) => {
    setRouteSlug(null);
    if (catalogId !== activeCatalogId) {
      setActiveCatalogId(catalogId);
      setCart([]);
    }
  };

  const persistAdminCatalogMutation = (updated: AdminCatalogWorkspace) => {
    fetch('/api/public/catalogs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogs: [updated] }),
    }).catch(() => {});

    if (firebaseUser && firebaseUser.emailVerified) {
      void adminSaveCatalogInFirestore(firebaseUser, updated).catch((err) => {
        if (err instanceof Error) setFatalFirestoreError(err);
      });
    }

    if (firebaseIdToken) {
      fetch(`/api/admin/catalogs/${encodeURIComponent(updated.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseIdToken}`,
        },
        body: JSON.stringify({ catalog: updated }),
      }).catch(() => {});
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
    lastLocalEditAtRef.current = Date.now();
    setRouteSlug(null);
    const owner = currentUser?.email || DEFAULT_DEMO_USER.email;
    const collisionPool = isAdmin ? [...catalogs, ...adminCatalogs] : catalogs;
    const created = createCatalogWorkspace(owner, input, collisionPool);
    setCatalogs((prev) => [created, ...prev]);
    setActiveCatalogId(created.id);
    setCart([]);

    if (isAdmin && firebaseUser) {
      const adminEntry: AdminCatalogWorkspace = {
        ...created,
        ownerUid: firebaseUser.uid,
      };
      setAdminCatalogs((prev) => [adminEntry, ...prev.filter((c) => c.id !== created.id)]);
      if (firebaseIdToken) {
        fetch('/api/admin/catalogs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseIdToken}`,
          },
          body: JSON.stringify({ catalog: adminEntry }),
        }).catch(() => {});
      }
    }
  };

  const handleDeleteCatalog = (catalogId: string) => {
    lastLocalEditAtRef.current = Date.now();
    setCatalogs((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((c) => c.id !== catalogId);
      if (activeCatalogId === catalogId && remaining[0]) {
        setActiveCatalogId(remaining[0].id);
        setCart([]);
      }
      return remaining;
    });
    if (isAdmin) {
      setAdminCatalogs((prev) => prev.filter((c) => c.id !== catalogId));
    }
  };

  const handleAdminDeleteCatalog = (catalogId: string) => {
    if (!isAdmin) return;
    lastLocalEditAtRef.current = Date.now();
    const isOwn = catalogs.some((c) => c.id === catalogId);
    if (isOwn && catalogs.length > 1) {
      setCatalogs((prev) => prev.filter((c) => c.id !== catalogId));
    }
    setAdminCatalogs((prev) => prev.filter((c) => c.id !== catalogId));
    if (activeCatalogId === catalogId) {
      const nextFallback =
        catalogs.find((c) => c.id !== catalogId)?.id ||
        catalogs[0]?.id ||
        DEFAULT_CATALOG_WORKSPACE.id;
      setActiveCatalogId(nextFallback);
      setCart([]);
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      void adminDeleteCatalogInFirestore(firebaseUser, catalogId).catch((err) => {
        if (err instanceof Error) setFatalFirestoreError(err);
      });
    }
    if (firebaseIdToken) {
      fetch(`/api/admin/catalogs/${encodeURIComponent(catalogId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${firebaseIdToken}` },
      }).catch(() => {});
    }
  };

  const handleUpdateConfig = (nextConfig: StoreConfig) => {
    lastLocalEditAtRef.current = Date.now();
    const isOwned = catalogs.some((c) => c.id === activeCatalog.id);
    if (isOwned) {
      setCatalogs((prev) =>
        prev.map((c) =>
          c.id === activeCatalog.id
            ? { ...c, config: nextConfig, updatedAt: new Date().toISOString() }
            : c
        )
      );
      if (isAdmin) {
        setAdminCatalogs((prev) =>
          prev.map((c) =>
            c.id === activeCatalog.id
              ? { ...c, config: nextConfig, updatedAt: new Date().toISOString() }
              : c
          )
        );
      }
      return;
    }

    if (isAdmin) {
      const target = adminCatalogs.find((c) => c.id === activeCatalog.id);
      if (target) {
        const updated: AdminCatalogWorkspace = {
          ...target,
          config: nextConfig,
          updatedAt: new Date().toISOString(),
        };
        setAdminCatalogs((prev) => prev.map((c) => (c.id === target.id ? updated : c)));
        persistAdminCatalogMutation(updated);
      }
    }
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
    lastLocalEditAtRef.current = Date.now();
    const saved = savePlatformDomainBase(dominioBase);
    const nextDomain = saved.valid ? saved.normalized : platformDomain;
    const isOwned = catalogs.some((c) => c.id === activeCatalog.id);

    if (isOwned) {
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
      if (isAdmin) {
        setAdminCatalogs((prev) =>
          prev.map((c) =>
            c.id === activeCatalog.id
              ? {
                  ...c,
                  config: { ...c.config, subdominio, dominioBase: nextDomain },
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
      return;
    }

    if (isAdmin) {
      const target = adminCatalogs.find((c) => c.id === activeCatalog.id);
      if (target) {
        const updated: AdminCatalogWorkspace = {
          ...target,
          config: {
            ...target.config,
            subdominio,
            dominioBase: nextDomain,
          },
          updatedAt: new Date().toISOString(),
        };
        setAdminCatalogs((prev) => prev.map((c) => (c.id === target.id ? updated : c)));
        persistAdminCatalogMutation(updated);
      }
    }
  };

  const handleUpdateProducts = (nextProducts: Product[]) => {
    lastLocalEditAtRef.current = Date.now();
    const isOwned = catalogs.some((c) => c.id === activeCatalog.id);
    if (isOwned) {
      setCatalogs((prev) =>
        prev.map((c) =>
          c.id === activeCatalog.id
            ? { ...c, products: nextProducts, updatedAt: new Date().toISOString() }
            : c
        )
      );
      if (isAdmin) {
        setAdminCatalogs((prev) =>
          prev.map((c) =>
            c.id === activeCatalog.id
              ? { ...c, products: nextProducts, updatedAt: new Date().toISOString() }
              : c
          )
        );
      }
      return;
    }

    if (isAdmin) {
      const target = adminCatalogs.find((c) => c.id === activeCatalog.id);
      if (target) {
        const updated: AdminCatalogWorkspace = {
          ...target,
          products: nextProducts,
          updatedAt: new Date().toISOString(),
        };
        setAdminCatalogs((prev) => prev.map((c) => (c.id === target.id ? updated : c)));
        persistAdminCatalogMutation(updated);
      }
    }
  };

  const handleResetDemo = () => {
    lastLocalEditAtRef.current = Date.now();
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
          storeUrl={formatDirectStoreDisplay(activeCatalog.config)}
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
          isAdmin={isAdmin}
          adminCatalogs={adminCatalogs}
          adminUsers={adminUsers}
          onSelectCatalog={handleSelectCatalog}
          onCreateCatalog={handleCreateCatalog}
          onDeleteCatalog={handleDeleteCatalog}
          onAdminDeleteCatalog={handleAdminDeleteCatalog}
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
          isMerchantLoggedIn={Boolean(currentUser)}
        />
      )}
    </div>
  );
}
