import { useEffect, useState } from 'react';
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
  formatStoreUrl,
  migrateCatalogWorkspace,
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

function getInitialViewFromUrl(): ViewMode {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (
    view === 'login' ||
    view === 'dashboard' ||
    view === 'catalog' ||
    view === 'landing'
  ) {
    return view;
  }
  if (params.get('autostart') === '1') {
    return 'catalog';
  }
  return 'landing';
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>(getInitialViewFromUrl);
  const [users, setUsers] = useState<UserAccount[]>(loadInitialUsers);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(loadInitialSession);
  const [catalogs, setCatalogs] = useState<CatalogWorkspace[]>(loadInitialCatalogs);
  const [activeCatalogId, setActiveCatalogId] = useState<string>(() =>
    loadInitialActiveCatalogId(catalogs)
  );
  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);

  const activeCatalog =
    catalogs.find((c) => c.id === activeCatalogId) ||
    catalogs[0] ||
    DEFAULT_CATALOG_WORKSPACE;

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
  }, [catalogs]);

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

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleLogout = () => {
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
              config: DEFAULT_STORE_CONFIG,
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
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLanding={() => handleNavigate('landing')}
        />
      )}

      {effectiveView === 'dashboard' && currentUser && (
        <DashboardView
          currentUser={currentUser}
          catalogs={catalogs}
          activeCatalog={activeCatalog}
          onSelectCatalog={handleSelectCatalog}
          onCreateCatalog={handleCreateCatalog}
          onDeleteCatalog={handleDeleteCatalog}
          onUpdateConfig={handleUpdateConfig}
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
