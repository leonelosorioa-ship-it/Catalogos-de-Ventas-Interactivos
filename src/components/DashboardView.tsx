import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  FolderKanban,
  Globe,
  GripVertical,
  ImagePlus,
  LayoutGrid,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_DOMAIN_BASE,
  WATCH_IMAGES,
  calculateDiscountPercent,
  extractUniqueCategories,
  formatCOP,
  formatStoreUrl,
  getAverageDiscountPercent,
  isTemplateBioWarning,
  RECOMMENDED_BIO_EXAMPLE,
  reorderProducts,
  validateDomainConfig,
  type CatalogWorkspace,
  type Product,
  type StoreConfig,
  type StoreTheme,
  type UserAccount,
} from '../utils/catalogLogic';
import { CreateCatalogModal } from './CreateCatalogModal';
import { MagicImportModal } from './MagicImportModal';

interface DashboardViewProps {
  currentUser: UserAccount;
  catalogs: CatalogWorkspace[];
  activeCatalog: CatalogWorkspace;
  platformDomain: string;
  onSelectCatalog: (catalogId: string) => void;
  onCreateCatalog: (input: {
    nombre: string;
    subdominio: string;
    dominioBase: string;
    whatsapp: string;
    tema: StoreTheme;
    descripcion: string;
  }) => void;
  onDeleteCatalog: (catalogId: string) => void;
  onUpdateConfig: (next: StoreConfig) => void;
  onSaveCustomDomain: (input: {
    subdominio: string;
    dominioBase: string;
    applyToAllCatalogs: boolean;
  }) => void;
  onUpdateProducts: (next: Product[]) => void;
  onResetDemo: () => void;
  onOpenCatalog: (catalogId?: string) => void;
  onLogout: () => void;
}

type DashboardTab = 'catalogs' | 'inventory' | 'config';

const EMPTY_FORM = {
  nombre: '',
  categoria: 'Caballero',
  precioActual: '',
  precioAnterior: '',
  descripcion: '',
  imagen: WATCH_IMAGES.urbanGraphite as string,
};

const THEME_OPTIONS: Array<{
  id: StoreTheme;
  name: string;
  desc: string;
  swatchClass: string;
}> = [
  {
    id: 'light',
    name: 'Minimalista Claro',
    desc: 'Fondo marfil limpio y alto contraste editorial.',
    swatchClass: 'bg-slate-50 border-slate-300 text-slate-900',
  },
  {
    id: 'dark',
    name: 'Minimalista Oscuro',
    desc: 'Superficie obsidiana con acentos dorados.',
    swatchClass: 'bg-zinc-950 border-zinc-700 text-amber-400',
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    desc: 'Índigo profundo con reflejos cian tecnológicos.',
    swatchClass: 'bg-[#080B1E] border-cyan-500/40 text-cyan-300',
  },
];

const IMAGE_PRESETS = [
  { label: 'Titanio Mate', url: WATCH_IMAGES.urbanGraphite },
  { label: 'Plata Dama', url: WATCH_IMAGES.petiteDiamant },
  { label: 'Esqueleto Mecánico', url: WATCH_IMAGES.imperialSkeleton },
  { label: 'Oro Esmeralda', url: WATCH_IMAGES.monacoEmerald },
];

export function DashboardView({
  currentUser,
  catalogs,
  activeCatalog,
  platformDomain,
  onSelectCatalog,
  onCreateCatalog,
  onDeleteCatalog,
  onUpdateConfig,
  onSaveCustomDomain,
  onUpdateProducts,
  onResetDemo,
  onOpenCatalog,
  onLogout,
}: DashboardViewProps) {
  const storeConfig = activeCatalog.config;
  const products = activeCatalog.products;

  const [activeTab, setActiveTab] = useState<DashboardTab>('catalogs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Custom Domain section state
  const [draftSubdomain, setDraftSubdomain] = useState(storeConfig.subdominio);
  const [draftDomainBase, setDraftDomainBase] = useState(
    storeConfig.dominioBase || platformDomain || DEFAULT_DOMAIN_BASE
  );
  const [applyDomainToAll, setApplyDomainToAll] = useState(false);
  const [domainFormError, setDomainFormError] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  useEffect(() => {
    setDraftSubdomain(storeConfig.subdominio);
    setDraftDomainBase(storeConfig.dominioBase || platformDomain || DEFAULT_DOMAIN_BASE);
    setDomainFormError(null);
  }, [activeCatalog.id, storeConfig.subdominio, storeConfig.dominioBase, platformDomain]);

  const showBioWarning = isTemplateBioWarning(storeConfig.descripcion);
  const avgDiscount = getAverageDiscountPercent(products);
  const categories = extractUniqueCategories(products);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q)
    );
  });

  const triggerFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 2600);
  };

  const domainLiveCheck = validateDomainConfig(draftSubdomain, draftDomainBase);
  const activeFullUrl = formatStoreUrl(storeConfig);
  const activeDirectLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?tienda=${encodeURIComponent(storeConfig.subdominio)}`
      : `/?tienda=${encodeURIComponent(storeConfig.subdominio)}`;
  const [directCopied, setDirectCopied] = useState(false);

  const handleSaveCustomDomainSubmit = (e: FormEvent) => {
    e.preventDefault();
    const check = validateDomainConfig(draftSubdomain, draftDomainBase);
    if (!check.valid) {
      setDomainFormError(check.subdomainError || check.domainError);
      return;
    }
    setDomainFormError(null);
    setDraftSubdomain(check.subdominio);
    setDraftDomainBase(check.dominioBase);
    onSaveCustomDomain({
      subdominio: check.subdominio,
      dominioBase: check.dominioBase,
      applyToAllCatalogs: applyDomainToAll,
    });
    triggerFeedback(`Dominio guardado: ${check.subdominio}.${check.dominioBase}`);
  };

  const handleCopyPublicUrl = async () => {
    try {
      await navigator.clipboard?.writeText(`https://${activeFullUrl}`);
    } catch {
      // clipboard API may be restricted in headless contexts
    }
    setDomainCopied(true);
    setTimeout(() => setDomainCopied(false), 2000);
  };

  const handleCopyDirectLink = async () => {
    try {
      await navigator.clipboard?.writeText(activeDirectLink);
    } catch {
      // ignore
    }
    setDirectCopied(true);
    setTimeout(() => setDirectCopied(false), 2000);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateConfig({ ...storeConfig, logoUrl: reader.result });
        triggerFeedback('Logotipo actualizado');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormState((prev) => ({ ...prev, imagen: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const openNewProductForm = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
    setShowProductForm(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingId(product.id);
    setFormState({
      nombre: product.nombre,
      categoria: product.categoria,
      precioActual: String(product.precioActual),
      precioAnterior: String(product.precioAnterior),
      descripcion: product.descripcion,
      imagen: product.imagen || WATCH_IMAGES.urbanGraphite,
    });
    setFormError(null);
    setShowProductForm(true);
  };

  const handleProductSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formState.nombre.trim().length < 2) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }

    const actual = parseInt(formState.precioActual.replace(/\D/g, ''), 10);
    const anterior = parseInt(formState.precioAnterior.replace(/\D/g, ''), 10);

    if (!Number.isFinite(actual) || actual <= 0) {
      setFormError('Ingresa un precio actual válido mayor a 0.');
      return;
    }

    const safeAnterior =
      Number.isFinite(anterior) && anterior >= actual
        ? anterior
        : Math.round((actual * 1.3) / 1000) * 1000;

    if (editingId !== null) {
      const updated = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              nombre: formState.nombre.trim(),
              categoria: formState.categoria.trim() || 'General',
              precioActual: actual,
              precioAnterior: safeAnterior,
              descripcion:
                formState.descripcion.trim() ||
                'Artículo disponible con envío inmediato.',
              imagen: formState.imagen,
            }
          : p
      );
      onUpdateProducts(updated);
      triggerFeedback('Producto actualizado');
    } else {
      const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
      const created: Product = {
        id: maxId + 1,
        nombre: formState.nombre.trim(),
        categoria: formState.categoria.trim() || 'General',
        precioActual: actual,
        precioAnterior: safeAnterior,
        descripcion:
          formState.descripcion.trim() ||
          'Artículo disponible con envío inmediato.',
        imagen: formState.imagen,
      };
      onUpdateProducts([created, ...products]);
      triggerFeedback('Producto añadido al inicio del catálogo');
    }

    setShowProductForm(false);
    setEditingId(null);
    setFormState(EMPTY_FORM);
  };

  const handleDeleteProduct = (id: number) => {
    onUpdateProducts(products.filter((p) => p.id !== id));
    triggerFeedback('Producto eliminado');
  };

  const handleImportBatch = (items: Omit<Product, 'id'>[]) => {
    let nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const created: Product[] = items.map((item) => ({
      ...item,
      id: nextId++,
    }));
    onUpdateProducts([...created, ...products]);
    setActiveTab('inventory');
    triggerFeedback(`${created.length} productos importados con éxito`);
  };

  // HTML5 Native Drag & Drop Handlers
  const handleDragStart = (index: number, e: DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (targetIndex: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== targetIndex) {
      onUpdateProducts(reorderProducts(products, dragIndex, targetIndex));
      triggerFeedback('Orden del catálogo guardado');
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const tabTitle =
    activeTab === 'catalogs'
      ? 'Mis Catálogos'
      : activeTab === 'inventory'
        ? 'Gestión de Inventario'
        : 'Configuración de Tienda';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row pb-20 lg:pb-6">
      {/* Desktop Sidebar */}
      <aside className="lg:w-64 lg:sticky lg:top-0 lg:h-screen shrink-0 bg-slate-950 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between overflow-y-auto">
        <div className="p-4 lg:p-5">
          <div className="flex items-center justify-between lg:block">
            <img
              src="/assets/aistudio/Solo_logo_de_Leps_Digital_IA_2026_-_Formato_Horizontal_8f1d260e.png"
              alt="Leps Software Solutions"
              referrerPolicy="no-referrer"
              className="h-8 w-auto object-contain"
            />
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => onOpenCatalog(activeCatalog.id)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Ver tienda</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Cerrar sesión"
                className="min-h-[38px] min-w-[38px] rounded-lg border border-white/15 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <label
              htmlFor="sidebar-catalog-select"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Catálogo seleccionado
            </label>
            <select
              id="sidebar-catalog-select"
              value={activeCatalog.id}
              onChange={(e) => onSelectCatalog(e.target.value)}
              className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
            >
              {catalogs.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                  {cat.config.nombre} ({cat.products.length})
                </option>
              ))}
            </select>
            <p className="font-mono text-[11px] text-cyan-400 truncate mt-1.5">
              {formatStoreUrl(storeConfig)}
            </p>
          </div>

          <nav aria-label="Secciones del panel" className="mt-5 grid grid-cols-3 lg:grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('catalogs')}
              className={`min-h-[42px] px-2.5 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center lg:justify-start gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'catalogs'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderKanban className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Mis Catálogos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`min-h-[42px] px-2.5 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center lg:justify-start gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Inventario</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`min-h-[42px] px-2.5 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center lg:justify-start gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Configuración</span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block p-5 pb-20 border-t border-white/10 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-slate-400 truncate">{currentUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCatalog(activeCatalog.id)}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Abrir Catálogo en Vivo</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">
              {storeConfig.nombre} /{' '}
              <span className="text-slate-900 font-semibold">{tabTitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {saveFeedback && (
              <span
                role="status"
                className="hidden sm:inline text-xs font-medium text-emerald-700"
              >
                {saveFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4 text-cyan-600 shrink-0" aria-hidden="true" />
              <span>Nuevo Catálogo</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMagicModalOpen(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Importación IA</span>
              <span className="sm:hidden">IA</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeTab === 'catalogs' && (
            <section aria-labelledby="catalogs-heading" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1
                    id="catalogs-heading"
                    className="font-display text-2xl font-bold text-slate-900 tracking-tight"
                  >
                    Mis Catálogos
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Crea múltiples tiendas con subdominio propio y administra sus inventarios desde
                    un solo centro de control.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Crear Nuevo Catálogo</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogs.map((cat) => {
                  const isActive = cat.id === activeCatalog.id;
                  return (
                    <article
                      key={cat.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between bg-white transition-colors ${
                        isActive
                          ? 'border-cyan-600 ring-2 ring-cyan-600/15'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {cat.config.logoUrl ? (
                              <img
                                src={cat.config.logoUrl}
                                alt={cat.config.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-display font-bold text-sm text-slate-800">
                                {cat.config.nombre.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {catalogs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCatalog(cat.id);
                                triggerFeedback(`Catálogo "${cat.config.nombre}" eliminado`);
                              }}
                              aria-label={`Eliminar catálogo ${cat.config.nombre}`}
                              className="min-h-[34px] min-w-[34px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          {isActive ? 'Activo ahora' : 'Disponible'} · Tema{' '}
                          {cat.config.tema === 'light'
                            ? 'Claro'
                            : cat.config.tema === 'dark'
                              ? 'Oscuro'
                              : 'Galaxia'}
                        </p>
                        <h2 className="font-display text-lg font-bold text-slate-900 mt-1 truncate">
                          {cat.config.nombre}
                        </h2>
                        <p className="font-mono text-xs text-cyan-700 truncate mt-0.5">
                          {formatStoreUrl(cat.config)}
                        </p>
                        <p className="text-xs text-slate-600 mt-3 tabular-nums">
                          {cat.products.length} productos publicados
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCatalog(cat.id);
                            setActiveTab('inventory');
                          }}
                          className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                        >
                          Gestionar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCatalog(cat.id);
                            onOpenCatalog(cat.id);
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <span>Ver</span>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === 'config' && (
            <section aria-labelledby="config-heading" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1
                    id="config-heading"
                    className="font-display text-2xl font-bold text-slate-900 tracking-tight"
                  >
                    Configuración de Tienda
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Personaliza tu identidad de marca, subdominio y tema visual de{' '}
                    <strong>{storeConfig.nombre}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onResetDemo();
                    triggerFeedback('Datos demo Auren Time restaurados');
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Restaurar demo Auren Time</span>
                </button>
              </div>

              {/* Dedicated Custom Domain Configuration Section */}
              <section
                id="custom-domain-section"
                aria-labelledby="custom-domain-heading"
                className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2
                        id="custom-domain-heading"
                        className="font-display text-lg font-bold text-slate-900"
                      >
                        Dominio Personalizado y Enlace Público
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Configura tu dominio oficial (<span className="font-mono">aurentime.shop</span>{' '}
                        o <span className="font-mono">tumarca.com</span>) con validación de formato y
                        persistencia independiente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg">
                      {activeFullUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPublicUrl}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                    >
                      {domainCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveCustomDomainSubmit} noValidate className="space-y-4">
                  <div className="grid sm:grid-cols-12 gap-4 items-start">
                    <div className="sm:col-span-5">
                      <label
                        htmlFor="custom-subdomain"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Subdominio de la tienda
                      </label>
                      <input
                        id="custom-subdomain"
                        type="text"
                        value={draftSubdomain}
                        onChange={(e) => {
                          setDraftSubdomain(e.target.value);
                          if (domainFormError) setDomainFormError(null);
                        }}
                        placeholder="ej. relojes"
                        aria-invalid={Boolean(domainFormError)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-cyan-600"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label
                        htmlFor="custom-domain-base"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Dominio personalizado (sin https://)
                      </label>
                      <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden focus-within:border-cyan-600">
                        <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                          .
                        </span>
                        <input
                          id="custom-domain-base"
                          type="text"
                          value={draftDomainBase}
                          onChange={(e) => {
                            setDraftDomainBase(e.target.value);
                            if (domainFormError) setDomainFormError(null);
                          }}
                          placeholder="aurentime.shop"
                          aria-invalid={Boolean(domainFormError)}
                          className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>Dominios disponibles:</span>
                        {['aurentime.shop', 'lepsdigital.com'].map((dom) => (
                          <button
                            key={dom}
                            type="button"
                            onClick={() => {
                              setDraftDomainBase(dom);
                              setDomainFormError(null);
                            }}
                            className={`font-mono px-2 py-0.5 rounded border transition-colors ${
                              draftDomainBase.trim().toLowerCase() === dom
                                ? 'border-cyan-600 bg-cyan-50 text-cyan-800 font-semibold'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                            }`}
                          >
                            .{dom}
                          </button>
                        ))}
                        <span className="text-slate-400">· Base guardada: .{platformDomain}</span>
                      </div>
                    </div>
                  </div>

                  {domainFormError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{domainFormError}</span>
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-slate-600">
                      <span>Vista previa del enlace: </span>
                      <strong className="font-mono text-slate-900">
                        https://
                        {domainLiveCheck.subdominio || 'subdominio'}.
                        {domainLiveCheck.dominioBase || 'aurentime.shop'}
                      </strong>
                    </div>
                    {domainLiveCheck.valid &&
                      domainLiveCheck.dominioBase !== 'aurentime.shop' &&
                      domainLiveCheck.dominioBase !== 'lepsdigital.com' && (
                        <span className="text-[11px] font-mono text-cyan-800">
                          DNS sugerido: CNAME * → cname.aurentime.shop
                        </span>
                      )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyDomainToAll}
                        onChange={(e) => setApplyDomainToAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
                      />
                      <span>
                        Usar este dominio base en todos mis catálogos ({catalogs.length}) y en los
                        nuevos
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="min-h-[42px] px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                      Guardar dominio personalizado
                    </button>
                  </div>
                </form>

                {/* Working direct URL + DNS activation checklist */}
                <div className="pt-4 border-t border-slate-100 grid lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                    <p className="text-xs font-semibold text-emerald-900">
                      Enlace funcional inmediato (mientras activas tu DNS)
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Usa este enlace directo en tus redes sociales o WhatsApp para abrir{' '}
                      <strong>{storeConfig.nombre}</strong> de inmediato:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate rounded-lg bg-white border border-emerald-200 px-2.5 py-1.5 text-[11px] font-mono text-slate-800">
                        {activeDirectLink}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyDirectLink}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-[11px] font-semibold text-emerald-900 shrink-0"
                      >
                        {directCopied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-[11px] text-slate-600">
                    <p className="text-xs font-semibold text-slate-800">
                      Activar https://{activeFullUrl} sin error NXDOMAIN
                    </p>
                    <p>
                      1. Publica la app en Cloud Run y agrega tu dominio en{' '}
                      <strong>Cloud Run → Domain Mappings</strong> (o usa Cloudflare Proxy).
                    </p>
                    <p>
                      2. En tu proveedor DNS crea el registro{' '}
                      <code className="font-mono text-slate-900">
                        CNAME {storeConfig.subdominio} → ghs.googlehosted.com
                      </code>{' '}
                      (o apunta <code className="font-mono text-slate-900">*</code>).
                    </p>
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="store-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Nombre del Negocio
                    </label>
                    <input
                      id="store-name"
                      type="text"
                      value={storeConfig.nombre}
                      onChange={(e) =>
                        onUpdateConfig({ ...storeConfig, nombre: e.target.value })
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="store-whatsapp"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      WhatsApp receptor de pedidos (código país + número)
                    </label>
                    <input
                      id="store-whatsapp"
                      type="tel"
                      value={storeConfig.whatsapp}
                      onChange={(e) =>
                        onUpdateConfig({ ...storeConfig, whatsapp: e.target.value })
                      }
                      placeholder="573001234567"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 tabular-nums focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 min-h-[38px] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={storeConfig.isPro}
                        onChange={(e) =>
                          onUpdateConfig({ ...storeConfig, isPro: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        Mostrar distintivo comercial PRO en tienda
                      </span>
                    </label>
                  </div>
                </div>

                {/* Biography with template warning */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="store-bio"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Descripción de la Biografía
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateConfig({ ...storeConfig, descripcion: '' });
                          document.getElementById('store-bio')?.focus();
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Limpiar texto
                      </button>
                      {showBioWarning && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateConfig({
                              ...storeConfig,
                              descripcion: RECOMMENDED_BIO_EXAMPLE,
                            });
                            triggerFeedback('Biografía profesional aplicada');
                          }}
                          className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          Aplicar texto sugerido
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    id="store-bio"
                    rows={3}
                    value={storeConfig.descripcion}
                    onChange={(e) =>
                      onUpdateConfig({ ...storeConfig, descripcion: e.target.value })
                    }
                    placeholder="Escribe aquí la propuesta de valor de tu marca, garantía y condiciones de envío..."
                    className="w-full rounded-lg border border-slate-300 p-3.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                  {showBioWarning && (
                    <div
                      role="status"
                      className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          Escribe tu propia descripción arriba (o haz clic en{' '}
                          <strong>Aplicar texto sugerido</strong>) para quitar este aviso antes de
                          compartir <strong className="font-mono">{formatStoreUrl(storeConfig)}</strong>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand Logo Upload */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Logotipo de tu marca propia
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {storeConfig.logoUrl ? (
                        <img
                          src={storeConfig.logoUrl}
                          alt={`Logo de ${storeConfig.nombre}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display font-bold text-lg text-slate-800">
                          {storeConfig.nombre.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer inline-flex items-center gap-2">
                      <ImagePlus className="w-4 h-4" aria-hidden="true" />
                      <span>Subir logotipo propio</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConfig({
                          ...storeConfig,
                          logoUrl: '/assets/aistudio/Solo_logo_de_Leps_Digital_IA_2026_d4687b55.png',
                        });
                        triggerFeedback('Logo de Leps Digital aplicado');
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700"
                    >
                      Usar logo Leps Digital
                    </button>
                    {storeConfig.logoUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateConfig({ ...storeConfig, logoUrl: '' })}
                        className="text-xs text-slate-500 hover:text-rose-600"
                      >
                        Usar monograma
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Template Selector */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-3">
                    Plantilla visual del catálogo en vivo
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((theme) => {
                      const selected = storeConfig.tema === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            onUpdateConfig({ ...storeConfig, tema: theme.id });
                            triggerFeedback(`Tema "${theme.name}" activado`);
                          }}
                          aria-pressed={selected}
                          className={`text-left rounded-xl p-4 border transition-colors ${
                            selected
                              ? 'border-cyan-600 ring-2 ring-cyan-600/20 bg-cyan-50/40'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`h-8 rounded-lg border mb-3 flex items-center px-2.5 text-[11px] font-mono truncate ${theme.swatchClass}`}
                          >
                            {formatStoreUrl(storeConfig)}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{theme.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{theme.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Todos los cambios se guardan automáticamente en este navegador.
                  </p>
                  <button
                    type="button"
                    onClick={() => triggerFeedback('Identidad de marca guardada')}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Guardar identidad de marca
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'inventory' && (
            <section aria-labelledby="inventory-heading" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1
                    id="inventory-heading"
                    className="font-display text-2xl font-bold text-slate-900 tracking-tight"
                  >
                    Gestión de Inventario
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Arrastra y suelta las filas para definir el orden de aparición en{' '}
                    <strong>{storeConfig.nombre}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewProductForm}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Añadir producto</span>
                </button>
              </div>

              {/* Clean 3-column metrics strip */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Productos activos</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {products.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Anclaje promedio</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                    -{avgDiscount}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Categorías</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {categories.length}
                  </p>
                </div>
              </div>

              {/* Manual Add / Edit Form */}
              {showProductForm && (
                <form
                  onSubmit={handleProductSubmit}
                  className="rounded-2xl border border-slate-300 bg-white p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-base font-bold text-slate-900">
                      {editingId !== null ? 'Editar producto' : 'Nuevo producto manual'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="prod-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Nombre del producto
                      </label>
                      <input
                        id="prod-name"
                        type="text"
                        value={formState.nombre}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, nombre: e.target.value }))
                        }
                        placeholder="Ej. Reloj Chrono Acero Negro"
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prod-category"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Categoría
                      </label>
                      <input
                        id="prod-category"
                        type="text"
                        value={formState.categoria}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, categoria: e.target.value }))
                        }
                        placeholder="Caballero / Dama"
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prod-price-current"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Precio actual (venta)
                      </label>
                      <input
                        id="prod-price-current"
                        type="number"
                        min={1}
                        value={formState.precioActual}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, precioActual: e.target.value }))
                        }
                        placeholder="175000"
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prod-price-prev"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Precio tachado (anclaje)
                      </label>
                      <input
                        id="prod-price-prev"
                        type="number"
                        min={0}
                        value={formState.precioAnterior}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, precioAnterior: e.target.value }))
                        }
                        placeholder="240000"
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="prod-desc"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Descripción
                    </label>
                    <textarea
                      id="prod-desc"
                      rows={2}
                      value={formState.descripcion}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, descripcion: e.target.value }))
                      }
                      placeholder="Materiales, dimensiones y beneficio principal..."
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">Foto:</span>
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setFormState((s) => ({ ...s, imagen: preset.url }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          formState.imagen === preset.url
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <label className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Subir propia
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-rose-600">
                      {formError}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
                    >
                      {editingId !== null ? 'Guardar cambios' : 'Guardar producto'}
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar en el inventario"
                  placeholder="Buscar producto por nombre o categoría..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600"
                />
              </div>

              {/* Draggable Product List */}
              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {products.length === 0
                      ? `Tu catálogo "${storeConfig.nombre}" aún no tiene productos`
                      : 'No hay productos que coincidan con tu búsqueda'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Añade un artículo manualmente o carga hasta 50 productos al instante con IA.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={openNewProductForm}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
                    >
                      Añadir primer producto
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMagicModalOpen(true)}
                      className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold"
                    >
                      Importar con IA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
                  {filteredProducts.map((product) => {
                    const actualIndex = products.findIndex((p) => p.id === product.id);
                    const discount = calculateDiscountPercent(
                      product.precioActual,
                      product.precioAnterior
                    );
                    const isDragging = dragIndex === actualIndex;
                    const isOver = dragOverIndex === actualIndex && dragIndex !== actualIndex;
                    const canDrag = searchQuery.trim() === '';

                    return (
                      <div
                        key={product.id}
                        draggable={canDrag}
                        onDragStart={(e) => handleDragStart(actualIndex, e)}
                        onDragOver={(e) => handleDragOver(actualIndex, e)}
                        onDrop={(e) => handleDrop(actualIndex, e)}
                        onDragEnd={handleDragEnd}
                        className={`p-3.5 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4 transition-colors ${
                          isDragging ? 'opacity-45 bg-slate-100' : 'hover:bg-slate-50/70'
                        } ${isOver ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-50/40' : ''}`}
                      >
                        <div
                          className={`text-slate-400 shrink-0 ${
                            canDrag ? 'cursor-grab active:cursor-grabbing' : 'opacity-30'
                          }`}
                          title={
                            canDrag
                              ? 'Arrastra para reordenar'
                              : 'Limpia el buscador para arrastrar'
                          }
                        >
                          <GripVertical className="w-4 h-4" aria-hidden="true" />
                        </div>

                        <div className="w-14 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {product.imagen ? (
                            <img
                              src={product.imagen}
                              alt={product.nombre}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-slate-400">
                              IMG
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {product.nombre}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {product.categoria}
                            {discount > 0 ? ` · -${discount}% anclaje` : ''}
                          </p>
                        </div>

                        <div className="text-right tabular-nums shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCOP(product.precioActual)}
                          </p>
                          {product.precioAnterior > product.precioActual && (
                            <p className="text-xs text-slate-400 line-through">
                              {formatCOP(product.precioAnterior)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {canDrag && (
                            <>
                              <button
                                type="button"
                                disabled={actualIndex === 0}
                                onClick={() =>
                                  onUpdateProducts(
                                    reorderProducts(products, actualIndex, actualIndex - 1)
                                  )
                                }
                                aria-label={`Subir ${product.nombre}`}
                                className="hidden sm:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25"
                              >
                                <ArrowUp className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                disabled={actualIndex === products.length - 1}
                                onClick={() =>
                                  onUpdateProducts(
                                    reorderProducts(products, actualIndex, actualIndex + 1)
                                  )
                                }
                                aria-label={`Bajar ${product.nombre}`}
                                className="hidden sm:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25"
                              >
                                <ArrowDown className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditProductForm(product)}
                            aria-label={`Editar ${product.nombre}`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            aria-label={`Eliminar ${product.nombre}`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <MagicImportModal
        isOpen={isMagicModalOpen}
        onClose={() => setIsMagicModalOpen(false)}
        onImportProducts={handleImportBatch}
      />

      <CreateCatalogModal
        isOpen={isCreateModalOpen}
        defaultDomainBase={platformDomain}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={(input) => {
          onCreateCatalog(input);
          setActiveTab('inventory');
          triggerFeedback(`Catálogo "${input.nombre}" creado`);
        }}
      />
    </div>
  );
}
