import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  FolderKanban,
  Globe,
  GripVertical,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DEFAULT_DOMAIN_BASE,
  PLATFORM_ADMIN_EMAIL,
  WATCH_IMAGES,
  calculateDiscountPercent,
  extractUniqueCategories,
  formatCOP,
  formatDirectStoreDisplay,
  getAverageDiscountPercent,
  isTemplateBioWarning,
  isVerifiedGoogleAdmin,
  RECOMMENDED_BIO_EXAMPLE,
  reorderProducts,
  validateCustomDomain,
  validateDomainConfig,
  type CatalogWorkspace,
  type Product,
  type StoreConfig,
  type StoreTheme,
  type UserAccount,
} from '../utils/catalogLogic';
import type { AdminCatalogWorkspace, AdminUserRecord } from '../lib/firestoreSync';
import { compressImageFileToDataUrl } from '../utils/imageUpload';
import { CreateCatalogModal, type CreateCatalogInput } from './CreateCatalogModal';
import { MagicImportModal } from './MagicImportModal';

interface DashboardViewProps {
  currentUser: UserAccount;
  catalogs: CatalogWorkspace[];
  activeCatalog: CatalogWorkspace;
  platformDomain: string;
  isAdmin?: boolean;
  adminCatalogs?: AdminCatalogWorkspace[];
  adminUsers?: AdminUserRecord[];
  onSelectCatalog: (catalogId: string) => void;
  onCreateCatalog: (input: CreateCatalogInput) => void;
  onDeleteCatalog: (catalogId: string) => void;
  onAdminDeleteCatalog?: (catalogId: string) => void;
  onUpdateConfig: (next: StoreConfig) => void;
  onSaveCustomDomain: (input: {
    subdominio: string;
    dominioBase: string;
    applyToAllCatalogs: boolean;
  }) => void;
  onSavePlatformDomain?: (domain: string, applyToAllOwn: boolean) => void;
  onUpdateProducts: (next: Product[]) => void;
  onResetDemo: () => void;
  onOpenCatalog: (catalogId?: string) => void;
  onLogout: () => void;
}

type DashboardTab = 'catalogs' | 'inventory' | 'config' | 'admin';

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
  isAdmin = false,
  adminCatalogs = [],
  adminUsers = [],
  onSelectCatalog,
  onCreateCatalog,
  onDeleteCatalog,
  onAdminDeleteCatalog,
  onUpdateConfig,
  onSaveCustomDomain,
  onSavePlatformDomain,
  onUpdateProducts,
  onResetDemo,
  onOpenCatalog,
  onLogout,
}: DashboardViewProps) {
  const storeConfig = activeCatalog.config;
  const products = activeCatalog.products;
  const isPlatformAdmin = Boolean(isAdmin) && isVerifiedGoogleAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    isPlatformAdmin ? 'admin' : 'catalogs'
  );
  const didInitAdminTabRef = useRef<boolean>(isPlatformAdmin);
  useEffect(() => {
    if (isPlatformAdmin && !didInitAdminTabRef.current) {
      didInitAdminTabRef.current = true;
      setActiveTab('admin');
    } else if (!isPlatformAdmin) {
      didInitAdminTabRef.current = false;
    }
  }, [isPlatformAdmin]);

  const [searchQuery, setSearchQuery] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState<string | null>(null);
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createOwnerPrefill, setCreateOwnerPrefill] = useState<{
    email: string;
    name: string;
  }>({ email: '', name: '' });
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Global Platform Admin Config State
  const [draftPlatformDomain, setDraftPlatformDomain] = useState(
    platformDomain || DEFAULT_DOMAIN_BASE
  );
  const [applyDomainToOwn, setApplyDomainToOwn] = useState(false);
  const [platformDomainError, setPlatformDomainError] = useState<string | null>(null);
  const [portalCopied, setPortalCopied] = useState(false);
  const [copiedAdminCatId, setCopiedAdminCatId] = useState<string | null>(null);
  const [showInfraGuide, setShowInfraGuide] = useState(false);

  useEffect(() => {
    setDraftPlatformDomain(platformDomain || DEFAULT_DOMAIN_BASE);
  }, [platformDomain]);

  // Store short-link section state
  const [draftSubdomain, setDraftSubdomain] = useState(storeConfig.subdominio);
  const [domainFormError, setDomainFormError] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  // Store brand & WhatsApp local drafts (prevents Firestore/keystroke snap-back while typing)
  const [draftStoreName, setDraftStoreName] = useState(storeConfig.nombre);
  const [draftWhatsapp, setDraftWhatsapp] = useState(storeConfig.whatsapp);
  const [draftBio, setDraftBio] = useState(storeConfig.descripcion);
  const [brandFormError, setBrandFormError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const lastBrandInputAtRef = useRef<number>(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const latestStoreConfigRef = useRef(storeConfig);
  latestStoreConfigRef.current = storeConfig;

  useEffect(() => {
    setDraftSubdomain(storeConfig.subdominio);
    setDomainFormError(null);
  }, [activeCatalog.id, storeConfig.subdominio]);

  useEffect(() => {
    lastBrandInputAtRef.current = 0;
    setDraftStoreName(storeConfig.nombre);
    setDraftWhatsapp(storeConfig.whatsapp);
    setDraftBio(storeConfig.descripcion);
    setBrandFormError(null);
    setLogoError(null);
    // Intentionally reset draft inputs when switching to a different catalog
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCatalog.id]);

  // Keep local drafts synchronized on initial cloud hydration or demo reset without overriding active typing
  useEffect(() => {
    if (Date.now() - lastBrandInputAtRef.current < 1500) return;
    setDraftStoreName(storeConfig.nombre);
    setDraftWhatsapp(storeConfig.whatsapp);
    setDraftBio(storeConfig.descripcion);
  }, [storeConfig.nombre, storeConfig.whatsapp, storeConfig.descripcion]);

  const flushValidBrandChanges = () => {
    const cleanName = draftStoreName.trim();
    const digits = draftWhatsapp.replace(/\D/g, '');
    const unchanged =
      cleanName === storeConfig.nombre &&
      digits === storeConfig.whatsapp &&
      draftBio === storeConfig.descripcion;
    if (unchanged) return;
    if (cleanName.length < 2 || digits.length < 7 || digits.length > 20) return;

    onUpdateConfig({
      ...storeConfig,
      nombre: cleanName,
      whatsapp: digits,
      descripcion: draftBio,
    });
  };

  // Auto-save brand identity & WhatsApp only when valid and after a short typing pause
  useEffect(() => {
    const cleanName = draftStoreName.trim();
    const digits = draftWhatsapp.replace(/\D/g, '');
    const unchanged =
      cleanName === storeConfig.nombre &&
      digits === storeConfig.whatsapp &&
      draftBio === storeConfig.descripcion;
    if (unchanged) return;
    if (cleanName.length < 2 || digits.length < 7 || digits.length > 20) return;

    const timer = window.setTimeout(() => {
      onUpdateConfig({
        ...storeConfig,
        nombre: cleanName,
        whatsapp: digits,
        descripcion: draftBio,
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draftStoreName, draftWhatsapp, draftBio, storeConfig, onUpdateConfig]);

  const showBioWarning = isTemplateBioWarning(draftBio);
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
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
      feedbackTimerRef.current = null;
    }, 3000);
  };

  const openCreateModalForAccount = (email = '', name = '') => {
    setCreateOwnerPrefill({ email, name });
    setIsCreateModalOpen(true);
  };

  const activeDomainBase = storeConfig.dominioBase || platformDomain || DEFAULT_DOMAIN_BASE;
  const domainLiveCheck = validateDomainConfig(draftSubdomain, activeDomainBase);
  const activeDirectDisplay = formatDirectStoreDisplay(storeConfig);
  const activeDirectLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${encodeURIComponent(storeConfig.subdominio)}`
      : `https://catalogos.${activeDomainBase}/${encodeURIComponent(storeConfig.subdominio)}`;
  const [directCopied, setDirectCopied] = useState(false);

  const handleSaveCustomDomainSubmit = (e: FormEvent) => {
    e.preventDefault();
    const check = validateDomainConfig(draftSubdomain, activeDomainBase);
    if (!check.valid) {
      setDomainFormError(check.subdomainError || check.domainError);
      return;
    }
    setDomainFormError(null);
    setDraftSubdomain(check.subdominio);
    onSaveCustomDomain({
      subdominio: check.subdominio,
      dominioBase: DEFAULT_DOMAIN_BASE,
      applyToAllCatalogs: false,
    });
    triggerFeedback(`Enlace público actualizado: /${check.subdominio}`);
  };

  const handleSaveBrandIdentity = () => {
    const cleanName = draftStoreName.trim();
    const digits = draftWhatsapp.replace(/\D/g, '');
    if (cleanName.length < 2) {
      setBrandFormError('Ingresa el nombre comercial de tu negocio (mínimo 2 caracteres).');
      return;
    }
    if (digits.length < 7 || digits.length > 20) {
      setBrandFormError(
        'Ingresa un número de WhatsApp válido con código de país (entre 7 y 20 dígitos, ej. 573105551234).'
      );
      return;
    }
    setBrandFormError(null);
    setDraftWhatsapp(digits);
    onUpdateConfig({
      ...storeConfig,
      nombre: cleanName,
      whatsapp: digits,
      descripcion: draftBio,
    });
    triggerFeedback('Cambios de tienda y WhatsApp guardados');
  };

  const handleCopyPublicUrl = async () => {
    try {
      await navigator.clipboard?.writeText(activeDirectLink);
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

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    setIsUploadingLogo(true);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 320,
        maxDataUrlLength: 150_000,
      });
      onUpdateConfig({ ...latestStoreConfigRef.current, logoUrl: compressedDataUrl });
      triggerFeedback('Logotipo actualizado y guardado');
    } catch (err) {
      setLogoError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el logotipo. Intenta con otro archivo PNG o JPG.'
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleProductImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 800,
        maxDataUrlLength: 160_000,
      });
      setFormState((prev) => ({ ...prev, imagen: compressedDataUrl }));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la foto seleccionada.'
      );
    }
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
        : activeTab === 'admin' && isPlatformAdmin
          ? 'Administración de Plataforma'
          : 'Configuración de Tienda';

  const platformCatalogMap = new Map<string, AdminCatalogWorkspace>();
  for (const cat of adminCatalogs) {
    platformCatalogMap.set(cat.id, cat);
  }
  for (const cat of catalogs) {
    const existing = platformCatalogMap.get(cat.id);
    platformCatalogMap.set(cat.id, {
      ...cat,
      ownerUid: existing?.ownerUid || currentUser.id,
    });
  }
  const allPlatformCatalogs = Array.from(platformCatalogMap.values());
  const userByUid = new Map(adminUsers.map((u) => [u.uid, u]));
  const totalPlatformProducts = allPlatformCatalogs.reduce(
    (sum, cat) => sum + cat.products.length,
    0
  );
  const filteredPlatformCatalogs = allPlatformCatalogs.filter((cat) => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const resolvedEmail =
      (cat.ownerEmail && !cat.ownerEmail.startsWith('uid:')
        ? cat.ownerEmail
        : userByUid.get(cat.ownerUid)?.email || cat.ownerEmail) || '';
    return (
      cat.config.nombre.toLowerCase().includes(q) ||
      cat.config.subdominio.toLowerCase().includes(q) ||
      resolvedEmail.toLowerCase().includes(q)
    );
  });

  const isManagingClientCatalog =
    isPlatformAdmin && !catalogs.some((c) => c.id === activeCatalog.id);

  const resolvedPlatformDomain = platformDomain || DEFAULT_DOMAIN_BASE;
  const adminPortalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?view=login`
      : `https://catalogos.${resolvedPlatformDomain}/?view=login`;

  const handleSaveGlobalDomainSubmit = (e: FormEvent) => {
    e.preventDefault();
    const check = validateCustomDomain(draftPlatformDomain);
    if (!check.valid) {
      setPlatformDomainError(check.error);
      return;
    }
    setPlatformDomainError(null);
    setDraftPlatformDomain(check.normalized);
    onSavePlatformDomain?.(check.normalized, applyDomainToOwn);
    triggerFeedback(`Dominio global actualizado a ${check.normalized}`);
  };

  const handleCopyPortalUrl = async () => {
    try {
      await navigator.clipboard?.writeText(adminPortalUrl);
    } catch {
      // ignore
    }
    setPortalCopied(true);
    setTimeout(() => setPortalCopied(false), 2000);
  };

  const handleCopyAdminCatalogUrl = async (cat: AdminCatalogWorkspace) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${encodeURIComponent(cat.config.subdominio)}`
        : `https://catalogos.${resolvedPlatformDomain}/${encodeURIComponent(cat.config.subdominio)}`;
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // ignore
    }
    setCopiedAdminCatId(cat.id);
    setTimeout(() => setCopiedAdminCatId(null), 2000);
  };

  const handleExportPlatformBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platformDomain: resolvedPlatformDomain,
      accounts: adminUsers,
      catalogs: allPlatformCatalogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leps-commerce-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerFeedback('Respaldo JSON descargado');
  };

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
                onClick={() => {
                  flushValidBrandChanges();
                  onOpenCatalog(activeCatalog.id);
                }}
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
              {isManagingClientCatalog && (
                <option value={activeCatalog.id} className="bg-slate-900 text-cyan-300">
                  [Cliente] {activeCatalog.config.nombre} ({activeCatalog.products.length})
                </option>
              )}
              {catalogs.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                  {cat.config.nombre} ({cat.products.length})
                </option>
              ))}
            </select>
            <p className="font-mono text-[11px] text-cyan-400 truncate mt-1.5">
              {activeDirectDisplay}
            </p>
          </div>

          <nav
            aria-label="Secciones del panel"
            className={`mt-5 grid gap-1.5 lg:grid-cols-1 ${
              isPlatformAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
            }`}
          >
            {isPlatformAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`min-h-[42px] px-2.5 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center lg:justify-start gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/35'
                    : 'text-cyan-400/80 hover:text-cyan-200 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Panel Admin</span>
              </button>
            )}
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
            {isPlatformAdmin && (
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Cuenta Admin · Google
              </p>
            )}
            <p className="font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-slate-400 truncate">{currentUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              flushValidBrandChanges();
              onOpenCatalog(activeCatalog.id);
            }}
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
              onClick={() => openCreateModalForAccount()}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4 text-cyan-600 shrink-0" aria-hidden="true" />
              <span>{isPlatformAdmin ? 'Nueva Cuenta / Catálogo' : 'Nuevo Catálogo'}</span>
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
          {isPlatformAdmin && activeTab !== 'admin' && (
            <div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 text-xs text-cyan-950">
                <span className="font-semibold">Modo Administrador · </span>
                <span>
                  Editando catálogo <strong>{storeConfig.nombre}</strong>
                  {isManagingClientCatalog ? ' (cuenta de cliente)' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-white border border-cyan-300 hover:bg-cyan-100 text-xs font-semibold text-cyan-900 inline-flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Volver al Panel Admin</span>
              </button>
            </div>
          )}

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
                    Crea y administra tus tiendas con enlace directo en{' '}
                    <span className="font-mono text-slate-800">catalogos.aurentime.shop</span> desde
                    un solo lugar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openCreateModalForAccount()}
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
                          <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                            {cat.config.logoUrl ? (
                              <img
                                src={cat.config.logoUrl}
                                alt={cat.config.nombre}
                                className="w-full h-full object-contain"
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
                          {formatDirectStoreDisplay(cat.config)}
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
                    Personaliza la identidad de marca, el enlace público y el diseño de{' '}
                    <strong>{storeConfig.nombre}</strong>.
                  </p>
                </div>
                {isPlatformAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      lastBrandInputAtRef.current = 0;
                      onResetDemo();
                      triggerFeedback('Datos demo Auren Time restaurados');
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Restaurar demo Auren Time</span>
                  </button>
                )}
              </div>

              {/* Clean Store Public Link Section (Client Merchant View) */}
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
                        Enlace Público de tu Tienda
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Personaliza el identificador corto de tu catálogo y comparte este enlace directo con tus clientes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 max-w-full">
                    <span className="font-mono text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg truncate">
                      {activeDirectDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPublicUrl}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shrink-0"
                    >
                      {domainCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copiar enlace</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveCustomDomainSubmit} noValidate className="space-y-4">
                  <div>
                    <label
                      htmlFor="custom-subdomain"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Nombre corto de tu tienda en la URL
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 flex items-center rounded-lg border border-slate-300 overflow-hidden focus-within:border-cyan-600">
                        <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                          catalogos.{DEFAULT_DOMAIN_BASE}/
                        </span>
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
                          className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        Guardar enlace
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Vista previa:{' '}
                      <strong className="font-mono text-slate-800">
                        https://catalogos.{DEFAULT_DOMAIN_BASE}/
                        {domainLiveCheck.subdominio || 'tu-tienda'}
                      </strong>
                    </p>
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
                </form>

                {/* Ready-to-share store link card */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-emerald-900">
                        Enlace público activo de {storeConfig.nombre}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Comparte este enlace en Instagram, TikTok o WhatsApp para recibir pedidos directos:
                      </p>
                      <code className="block truncate rounded-lg bg-white border border-emerald-200 px-3 py-2 text-xs font-mono text-slate-800">
                        {activeDirectLink}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyDirectLink}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-xs font-semibold text-emerald-900 inline-flex items-center gap-1.5"
                      >
                        {directCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          flushValidBrandChanges();
                          onOpenCatalog(activeCatalog.id);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <span>Abrir tienda</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
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
                      value={draftStoreName}
                      onChange={(e) => {
                        lastBrandInputAtRef.current = Date.now();
                        setDraftStoreName(e.target.value);
                        if (brandFormError) setBrandFormError(null);
                      }}
                      onBlur={flushValidBrandChanges}
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
                      inputMode="numeric"
                      value={draftWhatsapp}
                      onChange={(e) => {
                        lastBrandInputAtRef.current = Date.now();
                        setDraftWhatsapp(e.target.value);
                        if (brandFormError) setBrandFormError(null);
                      }}
                      onBlur={flushValidBrandChanges}
                      placeholder="Ej. 573001234567"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 tabular-nums focus:outline-none focus:border-cyan-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Incluye código de país sin signos (ej. 573105551234).
                    </p>
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
                          lastBrandInputAtRef.current = Date.now();
                          setDraftBio('');
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
                            lastBrandInputAtRef.current = Date.now();
                            setDraftBio(RECOMMENDED_BIO_EXAMPLE);
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
                    value={draftBio}
                    onChange={(e) => {
                      lastBrandInputAtRef.current = Date.now();
                      setDraftBio(e.target.value);
                    }}
                    onBlur={flushValidBrandChanges}
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
                          compartir <strong className="font-mono">{activeDirectDisplay}</strong>.
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
                    <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {storeConfig.logoUrl ? (
                        <img
                          src={storeConfig.logoUrl}
                          alt={`Logo de ${storeConfig.nombre}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="font-display font-bold text-lg text-slate-800">
                          {storeConfig.nombre.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer inline-flex items-center gap-2">
                      <ImagePlus className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {isUploadingLogo ? 'Procesando logotipo...' : 'Subir logotipo propio'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingLogo}
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </label>
                    {storeConfig.logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateConfig({ ...storeConfig, logoUrl: '' });
                          triggerFeedback('Logotipo quitado');
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-rose-600"
                      >
                        Quitar logotipo
                      </button>
                    )}
                  </div>
                  {logoError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                      {logoError}
                    </p>
                  )}
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
                            {activeDirectDisplay}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{theme.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{theme.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {brandFormError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{brandFormError}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Todos los cambios se guardan en tu cuenta.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveBrandIdentity}
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

          {activeTab === 'admin' && isPlatformAdmin && (
            <section aria-labelledby="admin-panel-heading" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1
                    id="admin-panel-heading"
                    className="font-display text-2xl font-bold text-slate-900 tracking-tight"
                  >
                    Administración de Plataforma
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Control maestro desde <span className="font-mono text-slate-800">{currentUser.email}</span> para administrar la configuración global, crear nuevas cuentas de clientes y gestionar todos los catálogos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openCreateModalForAccount(currentUser.email, currentUser.name)
                    }
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                  >
                    <Plus className="w-4 h-4 text-slate-700" aria-hidden="true" />
                    <span>Catálogo Propio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateModalForAccount()}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Crear Cuenta / Catálogo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Catálogos</p>
                  <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {allPlatformCatalogs.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Cuentas Registradas</p>
                  <p className="font-display text-2xl font-bold text-cyan-700 tabular-nums mt-1">
                    {adminUsers.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Productos en Plataforma</p>
                  <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {totalPlatformProducts}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
                  <p className="text-xs text-slate-500">Dominio Oficial</p>
                  <p className="font-mono text-sm font-bold text-emerald-700 truncate mt-2">
                    {resolvedPlatformDomain}
                  </p>
                </div>
              </div>

              {/* Global Platform Configuration (Exclusive to Admin) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Configuración Global de la Plataforma
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Define el dominio principal, comparte el portal de acceso a clientes, descarga respaldos y consulta la guía de Cloud Run / DNS (oculta para las tiendas cliente).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPlatformBackup}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Exportar respaldo JSON</span>
                  </button>
                </div>

                <form onSubmit={handleSaveGlobalDomainSubmit} noValidate className="space-y-3">
                  <label
                    htmlFor="admin-platform-domain"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Dominio base de la plataforma (para enlaces de tiendas y nuevas cuentas)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 flex items-center rounded-lg border border-slate-300 overflow-hidden focus-within:border-cyan-600">
                      <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                        catalogos.
                      </span>
                      <input
                        id="admin-platform-domain"
                        type="text"
                        value={draftPlatformDomain}
                        onChange={(e) => {
                          setDraftPlatformDomain(e.target.value);
                          if (platformDomainError) setPlatformDomainError(null);
                        }}
                        placeholder="aurentime.shop"
                        aria-invalid={Boolean(platformDomainError)}
                        className="flex-1 min-w-0 min-h-[42px] px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
                    >
                      Guardar dominio global
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyDomainToOwn}
                      onChange={(e) => setApplyDomainToOwn(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Aplicar este dominio base a mis catálogos propios</span>
                  </label>

                  {platformDomainError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{platformDomainError}</span>
                    </div>
                  )}
                </form>

                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <KeyRound className="w-4 h-4 text-cyan-700" aria-hidden="true" />
                      <span>Enlace de acceso para clientes</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Comparte este enlace para que tus comercios ingresen con Google al panel de su tienda:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-mono text-slate-800">
                        {adminPortalUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyPortalUrl}
                        className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 shrink-0 inline-flex items-center gap-1"
                      >
                        {portalCopied ? (
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

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Herramientas de Plataforma y Demo
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Restaura el catálogo base o consulta la configuración DNS / Cloud Run del servidor.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          lastBrandInputAtRef.current = 0;
                          onResetDemo();
                          triggerFeedback('Datos demo Auren Time restaurados');
                        }}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Restaurar demo Auren Time</span>
                      </button>
                      <button
                        type="button"
                        aria-expanded={showInfraGuide}
                        onClick={() => setShowInfraGuide((v) => !v)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" aria-hidden="true" />
                        <span>{showInfraGuide ? 'Ocultar guía DNS' : 'Guía DNS / Cloud Run'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {showInfraGuide && (
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 text-xs text-slate-700 space-y-1.5">
                    <p className="font-semibold text-slate-900">
                      Infraestructura de Dominio (Solo Administrador)
                    </p>
                    <p>
                      1. Todas las tiendas operan automáticamente bajo rutas cortas:{' '}
                      <span className="font-mono text-slate-900">
                        https://catalogos.{resolvedPlatformDomain}/&lt;slug&gt;
                      </span>
                      .
                    </p>
                    <p>
                      2. En Google Cloud Run → Domain Mappings asegúrate de mantener{' '}
                      <span className="font-mono text-slate-900">
                        catalogos.{resolvedPlatformDomain}
                      </span>{' '}
                      con registro CNAME hacia{' '}
                      <span className="font-mono text-slate-900">ghs.googlehosted.com</span>.
                    </p>
                    <p>
                      3. En Firebase Authentication → Authorized domains debe estar autorizado{' '}
                      <span className="font-mono text-slate-900">
                        catalogos.{resolvedPlatformDomain}
                      </span>{' '}
                      para inicio de sesión con Google.
                    </p>
                  </div>
                )}
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  aria-label="Buscar catálogos en toda la plataforma"
                  placeholder="Buscar por nombre de tienda, enlace corto o correo de cuenta..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Todos los Catálogos Creados ({filteredPlatformCatalogs.length})
                </h2>

                {filteredPlatformCatalogs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No hay catálogos que coincidan con tu búsqueda.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredPlatformCatalogs.map((cat) => {
                      const ownerRecord = userByUid.get(cat.ownerUid);
                      const ownerDisplay =
                        (cat.ownerEmail && !cat.ownerEmail.startsWith('uid:')
                          ? cat.ownerEmail
                          : ownerRecord?.email) || cat.ownerUid;
                      const isConfirmingDelete = confirmDeleteAdminId === cat.id;

                      return (
                        <article
                          key={cat.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                                  {cat.config.logoUrl ? (
                                    <img
                                      src={cat.config.logoUrl}
                                      alt={cat.config.nombre}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="font-display font-bold text-xs text-slate-700">
                                      {cat.config.nombre.slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-display text-base font-bold text-slate-900 truncate">
                                    {cat.config.nombre}
                                  </h3>
                                  <p className="font-mono text-xs text-cyan-700 truncate">
                                    {formatDirectStoreDisplay(cat.config)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md shrink-0 tabular-nums">
                                {cat.products.length} prod.
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                              <p className="truncate">
                                Cuenta:{' '}
                                <span className="font-medium text-slate-800">
                                  {ownerDisplay}
                                </span>
                              </p>
                              <p>
                                WhatsApp:{' '}
                                <span className="font-mono text-slate-800">
                                  {cat.config.whatsapp || 'Sin configurar'}
                                </span>{' '}
                                · Tema:{' '}
                                {cat.config.tema === 'light'
                                  ? 'Claro'
                                  : cat.config.tema === 'dark'
                                    ? 'Oscuro'
                                    : 'Galaxia'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCatalog(cat.id);
                                setActiveTab('inventory');
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                            >
                              Administrar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCatalog(cat.id);
                                setActiveTab('config');
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors"
                            >
                              Configurar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCatalog(cat.id);
                                onOpenCatalog(cat.id);
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Ver tienda</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyAdminCatalogUrl(cat)}
                              aria-label={`Copiar enlace de ${cat.config.nombre}`}
                              className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1"
                            >
                              {copiedAdminCatId === cat.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                                  <span>Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Link2 className="w-3 h-3" aria-hidden="true" />
                                  <span>Enlace</span>
                                </>
                              )}
                            </button>

                            {isConfirmingDelete ? (
                              <div className="ml-auto flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAdminDeleteCatalog?.(cat.id);
                                    setConfirmDeleteAdminId(null);
                                    triggerFeedback(`Catálogo "${cat.config.nombre}" eliminado`);
                                  }}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAdminId(null)}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAdminId(cat.id)}
                                aria-label={`Eliminar catálogo ${cat.config.nombre}`}
                                className="ml-auto min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-cyan-700" aria-hidden="true" />
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Cuentas de Comercios Registradas ({adminUsers.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModalForAccount()}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Nueva Cuenta</span>
                  </button>
                </div>
                {adminUsers.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Las cuentas registradas con Google o creadas desde el panel aparecerán aquí automáticamente.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {adminUsers.map((usr) => {
                      const ownedCount = allPlatformCatalogs.filter(
                        (c) =>
                          c.ownerUid === usr.uid ||
                          c.ownerEmail.trim().toLowerCase() === usr.email.trim().toLowerCase()
                      ).length;
                      return (
                        <div
                          key={usr.uid}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {usr.name}
                            </p>
                            <p className="text-xs font-mono text-slate-600 truncate">
                              {usr.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 shrink-0">
                            <span className="font-mono text-slate-500">
                              {usr.platformDomain}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold tabular-nums">
                              {ownedCount} {ownedCount === 1 ? 'catálogo' : 'catálogos'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openCreateModalForAccount(usr.email, usr.name)}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                              <span>Crear catálogo</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
        isAdminMode={isPlatformAdmin}
        existingAccounts={adminUsers}
        initialOwnerEmail={createOwnerPrefill.email}
        initialOwnerName={createOwnerPrefill.name}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateOwnerPrefill({ email: '', name: '' });
        }}
        onCreate={(input) => {
          onCreateCatalog(input);
          const ownerLower = input.ownerEmail?.trim().toLowerCase();
          const createdForClient =
            isPlatformAdmin && Boolean(ownerLower) && ownerLower !== PLATFORM_ADMIN_EMAIL;
          setActiveTab(createdForClient ? 'admin' : 'inventory');
          setCreateOwnerPrefill({ email: '', name: '' });
          triggerFeedback(
            createdForClient
              ? `Cuenta y catálogo "${input.nombre}" creados para ${ownerLower}`
              : `Catálogo "${input.nombre}" creado`
          );
        }}
      />
    </div>
  );
}
