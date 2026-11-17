export type ViewMode = 'landing' | 'login' | 'dashboard' | 'catalog';

export type StoreTheme = 'light' | 'dark' | 'galaxy';

export interface Product {
  id: number;
  categoria: string;
  nombre: string;
  precioActual: number;
  precioAnterior: number;
  descripcion: string;
  imagen?: string;
}

export interface StoreConfig {
  nombre: string;
  subdominio: string;
  dominioBase?: string;
  descripcion: string;
  whatsapp: string;
  tema: StoreTheme;
  isPro: boolean;
  logoUrl: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface CatalogWorkspace {
  id: string;
  ownerEmail: string;
  config: StoreConfig;
  products: Product[];
  updatedAt: string;
}

export const STORAGE_KEYS = {
  STORE_CONFIG: 'leps_commerce_store_config_v1',
  INVENTORY: 'leps_commerce_inventory_v1',
  CART: 'leps_commerce_cart_v1',
  USERS: 'leps_commerce_users_v1',
  SESSION: 'leps_commerce_session_v1',
  CATALOGS: 'leps_commerce_catalogs_v1',
  ACTIVE_CATALOG_ID: 'leps_commerce_active_catalog_id_v1',
  CUSTOM_DOMAIN: 'leps_commerce_custom_domain_v1',
} as const;

export const LEGACY_STORAGE_KEYS = {
  STORE_CONFIG: 'leps_kr36_store_config_v1',
  INVENTORY: 'leps_kr36_inventory_v1',
  CART: 'leps_kr36_cart_v1',
  USERS: 'leps_kr36_users_v1',
  SESSION: 'leps_kr36_session_v1',
  CATALOGS: 'leps_kr36_catalogs_v1',
  ACTIVE_CATALOG_ID: 'leps_kr36_active_catalog_id_v1',
} as const;

export const WATCH_IMAGES = {
  urbanGraphite: '/src/assets/images/watch_urban_graphite_1794804977090.jpg',
  petiteDiamant: '/src/assets/images/watch_petite_diamant_1794804977300.jpg',
  imperialSkeleton: '/src/assets/images/watch_imperial_skeleton_1794804977876.jpg',
  monacoEmerald: '/src/assets/images/watch_monaco_emerald_1794804978152.jpg',
} as const;

export const DEFAULT_TEMPLATE_BIO =
  'Aquí va la descripción de tu negocio. Personalízala con tu propuesta de valor y condiciones de envío antes de compartir tu enlace.';

export const RECOMMENDED_BIO_EXAMPLE =
  'Alta relojería contemporánea con envío inmediato a todo el país. Selecciona tus piezas favoritas y confirma tu pedido directamente por WhatsApp sin registros.';

export const DEFAULT_DEMO_USER: UserAccount = {
  id: 'usr-demo-leps',
  name: 'Administrador Leps',
  email: 'agencialeps@gmail.com',
  password: 'leps2026',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const DEFAULT_DOMAIN_BASE = 'aurentime.shop';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  nombre: 'Auren Time',
  subdominio: 'auren-time',
  dominioBase: DEFAULT_DOMAIN_BASE,
  descripcion: DEFAULT_TEMPLATE_BIO,
  whatsapp: '573001234567',
  tema: 'light',
  isPro: true,
  logoUrl: '',
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    categoria: 'Caballero',
    nombre: 'Reloj Urban Graphite Acero Pavonado Mate',
    precioActual: 175000,
    precioAnterior: 240000,
    descripcion:
      'Acabado militar en gris titanio mate con esfera multicapa de alta legibilidad y cristal con tratamiento antirreflejo',
    imagen: WATCH_IMAGES.urbanGraphite,
  },
  {
    id: 2,
    categoria: 'Dama',
    nombre: 'Reloj Petite Diamant Pulsera de Eslabones',
    precioActual: 128000,
    precioAnterior: 175000,
    descripcion:
      'Caja compacta de 28mm ideal para muñecas finas con dial satinado y cuatro puntos de diamante en hora clave',
    imagen: WATCH_IMAGES.petiteDiamant,
  },
  {
    id: 3,
    categoria: 'Dama',
    nombre: 'Reloj Milano Minimalist Dial Champagne',
    precioActual: 119000,
    precioAnterior: 165000,
    descripcion:
      'Esfera monocromática champagne con acabado rayos de sol, caja esbelta en acero y correa milanesa dorada',
    imagen: WATCH_IMAGES.monacoEmerald,
  },
  {
    id: 4,
    categoria: 'Caballero',
    nombre: 'Reloj Imperial Skeleton Maquinaria Visible',
    precioActual: 245000,
    precioAnterior: 330000,
    descripcion:
      'Movimiento mecánico automático con puente esqueleto expuesto, volante rítmico visible y fondo de cristal transparente',
    imagen: WATCH_IMAGES.imperialSkeleton,
  },
  {
    id: 5,
    categoria: 'Caballero',
    nombre: 'Reloj Classic Black Cuero Genuino Negro',
    precioActual: 140000,
    precioAnterior: 190000,
    descripcion:
      'Diseño formal sobrio con caja delgada en acero pulido, dial negro azabache y pulso de piel con costura reforzada',
    imagen: WATCH_IMAGES.imperialSkeleton,
  },
  {
    id: 6,
    categoria: 'Dama',
    nombre: 'Reloj Siena Gold con Circones Facetados',
    precioActual: 145000,
    precioAnterior: 195000,
    descripcion:
      'Bisel con incrustaciones de circones suizos de alto brillo, caja dorada de 34mm y movimiento de cuarzo japonés',
    imagen: WATCH_IMAGES.petiteDiamant,
  },
  {
    id: 7,
    categoria: 'Dama',
    nombre: 'Reloj Aurora Rose Gold Malla Milanesa',
    precioActual: 135000,
    precioAnterior: 185000,
    descripcion:
      'Reloj femenino ultra delgado con caja en oro rosa, esfera pulida y correa ajustable en malla milanesa transpirable',
    imagen: WATCH_IMAGES.petiteDiamant,
  },
  {
    id: 8,
    categoria: 'Dama',
    nombre: 'Reloj Royal Grace Bicolor Oro y Plata',
    precioActual: 155000,
    precioAnterior: 210000,
    descripcion:
      'Brazalete jubileo en acero inoxidable de dos tonos, bisel estriado clásico y fechador con lupa de aumento',
    imagen: WATCH_IMAGES.monacoEmerald,
  },
  {
    id: 9,
    categoria: 'Caballero',
    nombre: 'Reloj Executive Steel Silver Cronógrafo',
    precioActual: 185000,
    precioAnterior: 250000,
    descripcion:
      'Cronógrafo funcional de 3 subdiales en acero macizo 316L, taquímetro exterior y agujas luminiscentes nocturnas',
    imagen: WATCH_IMAGES.urbanGraphite,
  },
  {
    id: 10,
    categoria: 'Caballero',
    nombre: 'Reloj Monaco Gold Esfera Verde Esmeralda',
    precioActual: 210000,
    precioAnterior: 285000,
    descripcion:
      'Combinación de lujo entre caja bañada en oro de 18k y dial verde sol con fechador e índices dorados aplicados',
    imagen: WATCH_IMAGES.monacoEmerald,
  },
];

export const DEFAULT_CATALOG_WORKSPACE: CatalogWorkspace = {
  id: 'cat-auren-time',
  ownerEmail: DEFAULT_DEMO_USER.email,
  config: DEFAULT_STORE_CONFIG,
  products: DEFAULT_PRODUCTS,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Formatea montos en pesos con separador de miles (ej: $175.000) */
export function formatCOP(amount: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return '$' + safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Calcula porcentaje de ahorro para el gatillo de precio de anclaje */
export function calculateDiscountPercent(
  precioActual: number,
  precioAnterior: number
): number {
  if (precioAnterior <= 0 || precioActual <= 0 || precioAnterior <= precioActual) {
    return 0;
  }
  return Math.round(((precioAnterior - precioActual) / precioAnterior) * 100);
}

/** Normaliza el slug de subdominio */
export function sanitizeSubdomain(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'mi-tienda';
}

/** Normaliza el dominio base para marca propia (ej: aurentime.shop, mitienda.com) */
export function sanitizeDomainBase(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^\.+|\.+$/g, '');
  if (!cleaned || cleaned === 'kr36.link' || cleaned.endsWith('.kr36.link')) {
    return DEFAULT_DOMAIN_BASE;
  }
  return cleaned;
}

export interface DomainValidationResult {
  valid: boolean;
  normalized: string;
  error: string | null;
}

/** Valida el formato del subdominio (slug DNS válido de 2 a 63 caracteres) */
export function validateSubdomainSlug(input: string): DomainValidationResult {
  const normalized = input.toLowerCase().trim();
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Ingresa un subdominio para tu tienda (ej. auren-time).',
    };
  }
  if (normalized.length < 2 || normalized.length > 63) {
    return {
      valid: false,
      normalized,
      error: 'El subdominio debe tener entre 2 y 63 caracteres.',
    };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error:
        'Usa solo letras minúsculas, números y guiones medios (sin espacios ni guiones al inicio o final).',
    };
  }
  return { valid: true, normalized, error: null };
}

/** Valida el formato de dominio personalizado (ej. aurentime.shop, mitienda.com) y bloquea dependencias externas */
export function validateCustomDomain(input: string): DomainValidationResult {
  const trimmed = input.toLowerCase().trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      error: 'Ingresa un dominio personalizado (ej. aurentime.shop o tumarca.com).',
    };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'El dominio no puede contener espacios.',
    };
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (/[/?#@:]/.test(withoutProtocol)) {
    return {
      valid: false,
      normalized: withoutProtocol,
      error:
        'Ingresa únicamente el dominio base (ej. aurentime.shop o tienda.com), sin rutas ni puertos.',
    };
  }

  if (withoutProtocol === 'kr36.link' || withoutProtocol.endsWith('.kr36.link')) {
    return {
      valid: false,
      normalized: withoutProtocol,
      error:
        'El dominio heredado kr36.link está deshabilitado. Configura tu propio dominio como aurentime.shop.',
    };
  }

  if (
    withoutProtocol.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(withoutProtocol)
  ) {
    return {
      valid: false,
      normalized: withoutProtocol,
      error:
        'Formato de dominio inválido. Usa un dominio con extensión válida (ej. aurentime.shop o mitienda.com.co).',
    };
  }

  return { valid: true, normalized: withoutProtocol, error: null };
}

/** Valida conjuntamente subdominio y dominio personalizado */
export function validateDomainConfig(
  subdominio: string,
  dominioBase: string
): {
  valid: boolean;
  subdominio: string;
  dominioBase: string;
  subdomainError: string | null;
  domainError: string | null;
} {
  const subCheck = validateSubdomainSlug(subdominio);
  const domCheck = validateCustomDomain(dominioBase);
  return {
    valid: subCheck.valid && domCheck.valid,
    subdominio: subCheck.normalized,
    dominioBase: domCheck.normalized,
    subdomainError: subCheck.error,
    domainError: domCheck.error,
  };
}

/** Carga el dominio personalizado guardado para la plataforma (fallback a aurentime.shop) */
export function loadPlatformDomainBase(
  storage?: Pick<Storage, 'getItem'> | null
): string {
  try {
    const store =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(STORAGE_KEYS.CUSTOM_DOMAIN);
    if (!raw) return DEFAULT_DOMAIN_BASE;
    const check = validateCustomDomain(raw);
    if (!check.valid || check.normalized === 'leps.link') {
      return DEFAULT_DOMAIN_BASE;
    }
    return check.normalized;
  } catch {
    return DEFAULT_DOMAIN_BASE;
  }
}

/** Guarda el dominio personalizado de la plataforma tras validar su formato */
export function savePlatformDomainBase(
  domain: string,
  storage?: Pick<Storage, 'setItem'> | null
): DomainValidationResult {
  const check = validateCustomDomain(domain);
  if (!check.valid) return check;
  try {
    const store =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(STORAGE_KEYS.CUSTOM_DOMAIN, check.normalized);
  } catch {
    // ignore storage quota/privacy errors
  }
  return check;
}

/** Formatea la URL pública completa de la tienda según su marca propia */
export function formatStoreUrl(
  config: Pick<StoreConfig, 'subdominio' | 'dominioBase'>
): string {
  const sub = sanitizeSubdomain(config.subdominio || 'mi-tienda');
  const rawBase = sanitizeDomainBase(config.dominioBase || DEFAULT_DOMAIN_BASE);
  const base =
    rawBase === 'kr36.link' || rawBase === 'leps.link' ? DEFAULT_DOMAIN_BASE : rawBase;
  return `${sub}.${base}`;
}

/** Formatea el enlace directo funcional inmediato (?tienda=<subdominio>) */
export function formatDirectStoreUrl(
  config: Pick<StoreConfig, 'subdominio' | 'dominioBase'>,
  origin?: string
): string {
  const sub = sanitizeSubdomain(config.subdominio || 'mi-tienda');
  const rawBase = sanitizeDomainBase(config.dominioBase || DEFAULT_DOMAIN_BASE);
  const base =
    rawBase === 'kr36.link' || rawBase === 'leps.link' ? DEFAULT_DOMAIN_BASE : rawBase;
  const cleanOrigin = (origin || `https://catalogos.${base}`).replace(/\/+$/, '');
  return `${cleanOrigin}/?tienda=${encodeURIComponent(sub)}`;
}

/** Formatea versión compacta legible del enlace directo funcional */
export function formatDirectStoreDisplay(
  config: Pick<StoreConfig, 'subdominio' | 'dominioBase'>
): string {
  const sub = sanitizeSubdomain(config.subdominio || 'mi-tienda');
  const rawBase = sanitizeDomainBase(config.dominioBase || DEFAULT_DOMAIN_BASE);
  const base =
    rawBase === 'kr36.link' || rawBase === 'leps.link' ? DEFAULT_DOMAIN_BASE : rawBase;
  return `catalogos.${base}/?tienda=${sub}`;
}

/** Migra catálogos guardados previamente hacia el dominio oficial aurentime.shop */
export function migrateCatalogWorkspace(catalog: CatalogWorkspace): CatalogWorkspace {
  const rawDomain = sanitizeDomainBase(catalog.config?.dominioBase || DEFAULT_DOMAIN_BASE);
  const nextDomain =
    rawDomain === 'kr36.link' || rawDomain === 'leps.link'
      ? DEFAULT_DOMAIN_BASE
      : rawDomain;
  const rawBio = catalog.config?.descripcion || '';
  const hasOldExternalBio = rawBio.toLowerCase().includes('redes de kr');
  return {
    ...catalog,
    config: {
      ...DEFAULT_STORE_CONFIG,
      ...catalog.config,
      dominioBase: nextDomain,
      descripcion: hasOldExternalBio ? DEFAULT_TEMPLATE_BIO : rawBio,
    },
  };
}

/** Garantiza que el subdominio de un nuevo catálogo sea único en el espacio de trabajo */
export function ensureUniqueSubdomain(
  desired: string,
  existingCatalogs: CatalogWorkspace[],
  excludeCatalogId?: string
): string {
  const base = sanitizeSubdomain(desired);
  const taken = new Set(
    existingCatalogs
      .filter((c) => c.id !== excludeCatalogId)
      .map((c) => c.config.subdominio.toLowerCase())
  );
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }
  return `${base}-${suffix}`;
}

/** Valida credenciales del Portal de Acceso Administrativo */
export function validateAuthCredentials(
  email: string,
  password: string,
  mode: 'login' | 'register',
  name?: string
): string | null {
  if (mode === 'register' && (!name || name.trim().length < 2)) {
    return 'Ingresa tu nombre o el de tu empresa (mínimo 2 caracteres).';
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!emailValid) {
    return 'Ingresa un correo electrónico válido.';
  }
  if (password.trim().length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
}

/** Crea un nuevo espacio de catálogo listo para personalizar e importar productos */
export function createCatalogWorkspace(
  ownerEmail: string,
  input: {
    nombre: string;
    subdominio?: string;
    dominioBase?: string;
    whatsapp: string;
    tema: StoreTheme;
    descripcion?: string;
    logoUrl?: string;
    initialProducts?: Product[];
  },
  existingCatalogs: CatalogWorkspace[]
): CatalogWorkspace {
  const cleanName = input.nombre.trim() || 'Mi Nuevo Catálogo';
  const subdominio = ensureUniqueSubdomain(
    input.subdominio?.trim() || cleanName,
    existingCatalogs
  );
  const dominioBase = sanitizeDomainBase(input.dominioBase || loadPlatformDomainBase());
  const id = `cat-${subdominio}-${Date.now().toString(36)}`;

  return {
    id,
    ownerEmail,
    config: {
      nombre: cleanName,
      subdominio,
      dominioBase,
      descripcion:
        input.descripcion?.trim() ||
        `Catálogo oficial de ${cleanName}. Explora nuestras referencias y envía tu pedido directo por WhatsApp.`,
      whatsapp: input.whatsapp.replace(/\D/g, '') || '573001234567',
      tema: input.tema,
      isPro: true,
      logoUrl: input.logoUrl || '',
    },
    products: input.initialProducts ? [...input.initialProducts] : [],
    updatedAt: new Date().toISOString(),
  };
}

/** Reordena productos tras un evento de Drag & Drop */
export function reorderProducts(
  products: Product[],
  fromIndex: number,
  toIndex: number
): Product[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= products.length ||
    toIndex >= products.length
  ) {
    return products;
  }
  const next = [...products];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Detecta si la descripción sigue teniendo la plantilla sin personalizar */
export function isTemplateBioWarning(bio: string): boolean {
  const normalized = bio.toLowerCase();
  return (
    normalized.includes('aquí va la descripción de tu negocio') ||
    bio.trim().length < 12
  );
}

/** Extrae categorías únicas preservando orden de aparición */
export function extractUniqueCategories(products: Product[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of products) {
    const cat = p.categoria.trim() || 'General';
    if (!seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }
  return result;
}

/** Calcula descuento promedio de anclaje en todo el inventario */
export function getAverageDiscountPercent(products: Product[]): number {
  if (products.length === 0) return 0;
  const sum = products.reduce(
    (acc, p) => acc + calculateDiscountPercent(p.precioActual, p.precioAnterior),
    0
  );
  return Math.round(sum / products.length);
}

/**
 * Parser determinista de texto libre para "Importación Mágica con IA".
 */
export function parseBulkCatalogText(rawText: string): Omit<Product, 'id'>[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parsed: Omit<Product, 'id'>[] = [];

  for (const line of lines.slice(0, 50)) {
    const withoutPrefix = line.replace(/^\s*(?:\d+[\.\)\-:]|\-|\*)\s*/, '').trim();
    if (!withoutPrefix) continue;

    const priceMatches = Array.from(
      withoutPrefix.matchAll(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,9})\b/g)
    );

    let precioActual = 95000;
    let precioAnterior = 125000;

    if (priceMatches.length >= 1) {
      const firstNum = parseInt(priceMatches[0][1].replace(/[.,]/g, ''), 10);
      if (Number.isFinite(firstNum) && firstNum > 0) {
        precioActual = firstNum;
      }
      if (priceMatches.length >= 2) {
        const secondNum = parseInt(priceMatches[1][1].replace(/[.,]/g, ''), 10);
        if (Number.isFinite(secondNum) && secondNum > precioActual) {
          precioAnterior = secondNum;
        } else {
          precioAnterior = Math.round((precioActual * 1.32) / 1000) * 1000;
        }
      } else {
        precioAnterior = Math.round((precioActual * 1.32) / 1000) * 1000;
      }
    }

    let cleanTitle = withoutPrefix;
    for (const match of priceMatches) {
      cleanTitle = cleanTitle.replace(match[0], ' ');
    }

    const segments = cleanTitle
      .split(/\s*[\|\/]\s*|\s+\-\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const nombre = (segments[0] || withoutPrefix)
      .replace(/[\-\|:]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!nombre) continue;

    let categoria = 'General';
    const lower = withoutPrefix
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (segments.length >= 2 && segments[segments.length - 1].length <= 20) {
      categoria = segments[segments.length - 1];
    } else if (lower.includes('dama') || lower.includes('mujer') || lower.includes('rose')) {
      categoria = 'Dama';
    } else if (lower.includes('caballero') || lower.includes('hombre') || lower.includes('crono')) {
      categoria = 'Caballero';
    }

    const imagen =
      categoria === 'Dama'
        ? WATCH_IMAGES.petiteDiamant
        : lower.includes('oro') || lower.includes('gold')
          ? WATCH_IMAGES.monacoEmerald
          : WATCH_IMAGES.urbanGraphite;

    parsed.push({
      nombre,
      categoria,
      precioActual,
      precioAnterior,
      descripcion: `Pieza ${nombre} lista para despacho inmediato con precio preferencial de catálogo.`,
      imagen,
    });
  }

  return parsed;
}

/** Construye el mensaje pre-formateado y la URL codificada para WhatsApp */
export function buildWhatsAppOrderUrl(
  whatsappPhone: string,
  storeName: string,
  cart: CartItem[],
  products: Product[],
  customerNote?: string
): {
  url: string;
  message: string;
  total: number;
  totalSavings: number;
  itemCount: number;
} {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: string[] = [];
  let total = 0;
  let totalPrevious = 0;
  let itemCount = 0;

  for (const item of cart) {
    if (item.quantity <= 0) continue;
    const product = productMap.get(item.productId);
    if (!product) continue;
    const subtotal = product.precioActual * item.quantity;
    const prevSubtotal =
      Math.max(product.precioAnterior, product.precioActual) * item.quantity;
    total += subtotal;
    totalPrevious += prevSubtotal;
    itemCount += item.quantity;
    lines.push(`• ${item.quantity}x ${product.nombre} (${formatCOP(subtotal)})`);
  }

  const totalSavings = Math.max(0, totalPrevious - total);
  const cleanPhone = whatsappPhone.replace(/\D/g, '');
  const itemSummary = lines.length > 0 ? lines.join('\n') : 'Sin artículos seleccionados';

  const noteBlock =
    customerNote && customerNote.trim()
      ? `\nNota del cliente: ${customerNote.trim()}`
      : '';

  const message = `Hola ${storeName}, quiero pedir:\n${itemSummary}\n\nTotal: ${formatCOP(total)}${noteBlock}`;
  const baseUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/';
  const url = `${baseUrl}?text=${encodeURIComponent(message)}`;

  return {
    url,
    message,
    total,
    totalSavings,
    itemCount,
  };
}

export interface RouteTarget {
  view: ViewMode | null;
  catalogSlug: string | null;
}

/** Resuelve si la URL actual apunta a un catálogo por subdominio (ej. relojes.aurentime.shop), ruta (/c/relojes) o parámetro (?tienda=relojes) */
export function resolveRouteTarget(location: {
  hostname: string;
  search: string;
  pathname: string;
}): RouteTarget {
  const params = new URLSearchParams(location.search || '');
  const rawView = params.get('view');
  const explicitView: ViewMode | null =
    rawView === 'landing' ||
    rawView === 'login' ||
    rawView === 'dashboard' ||
    rawView === 'catalog'
      ? rawView
      : null;

  const rawQuerySlug = params.get('tienda') || params.get('catalog');
  if (rawQuerySlug && rawQuerySlug.trim()) {
    return {
      view: explicitView || 'catalog',
      catalogSlug: sanitizeSubdomain(rawQuerySlug),
    };
  }

  const pathMatch = (location.pathname || '').match(/^\/(?:c|tienda)\/([a-z0-9-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return {
      view: explicitView || 'catalog',
      catalogSlug: sanitizeSubdomain(pathMatch[1]),
    };
  }

  const cleanHost = (location.hostname || '').toLowerCase().split(':')[0];
  const isPlatformInfraHost =
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost) ||
    cleanHost.endsWith('.run.app') ||
    cleanHost.endsWith('.ai.studio') ||
    cleanHost.endsWith('.web.app') ||
    cleanHost.endsWith('.firebaseapp.com');

  if (!isPlatformInfraHost) {
    const parts = cleanHost.split('.').filter(Boolean);
    if (parts[0] === 'portal' || parts[0] === 'login') {
      return { view: explicitView || 'login', catalogSlug: null };
    }
    const platformHubSubdomains = new Set([
      'www',
      'catalogos',
      'app',
      'saas',
      'panel',
      'admin',
    ]);
    if (parts.length >= 3 && !platformHubSubdomains.has(parts[0])) {
      return {
        view: explicitView || 'catalog',
        catalogSlug: sanitizeSubdomain(parts[0]),
      };
    }
  }

  if (params.get('autostart') === '1' && !explicitView) {
    return { view: 'catalog', catalogSlug: null };
  }

  return { view: explicitView, catalogSlug: null };
}

/** Encuentra un catálogo activo comparando su subdominio normalizado */
export function findCatalogBySlug(
  catalogs: CatalogWorkspace[],
  slug: string | null | undefined
): CatalogWorkspace | undefined {
  if (!slug || !slug.trim()) return undefined;
  const clean = sanitizeSubdomain(slug);
  return catalogs.find((c) => sanitizeSubdomain(c.config.subdominio) === clean);
}

