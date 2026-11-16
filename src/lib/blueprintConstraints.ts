import blueprint from '../../firebase-blueprint.json' with { type: 'json' };
import {
  DEFAULT_DOMAIN_BASE,
  sanitizeDomainBase,
  sanitizeSubdomain,
  type CatalogWorkspace,
  type Product,
  type StoreTheme,
} from '../utils/catalogLogic.ts';

type EntityKey = keyof typeof blueprint.entities;

function getProp(entity: EntityKey, field: string): {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
} {
  const props = blueprint.entities[entity].properties as Record<
    string,
    {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      enum?: string[];
    }
  >;
  return props[field] || {};
}

export const BLUEPRINT_LIMITS = {
  user: {
    uidMax: getProp('UserProfile', 'uid').maxLength ?? 128,
    uidPattern: new RegExp(getProp('UserProfile', 'uid').pattern ?? '^[a-zA-Z0-9_\\-]+$'),
    emailMin: getProp('UserProfile', 'email').minLength ?? 3,
    emailMax: getProp('UserProfile', 'email').maxLength ?? 254,
    nameMax: getProp('UserProfile', 'name').maxLength ?? 120,
    domainMax: getProp('UserProfile', 'platformDomain').maxLength ?? 253,
    domainPattern: new RegExp(
      getProp('UserProfile', 'platformDomain').pattern ??
        '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24}$'
    ),
  },
  catalog: {
    idMax: getProp('Catalog', 'id').maxLength ?? 128,
    idPattern: new RegExp(getProp('Catalog', 'id').pattern ?? '^[a-zA-Z0-9_\\-]+$'),
    nombreMax: getProp('Catalog', 'nombre').maxLength ?? 120,
    subdominioMin: getProp('Catalog', 'subdominio').minLength ?? 2,
    subdominioMax: getProp('Catalog', 'subdominio').maxLength ?? 63,
    subdominioPattern: new RegExp(
      getProp('Catalog', 'subdominio').pattern ?? '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    ),
    dominioBaseMax: getProp('Catalog', 'dominioBase').maxLength ?? 253,
    dominioBasePattern: new RegExp(
      getProp('Catalog', 'dominioBase').pattern ??
        '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24}$'
    ),
    descripcionMax: getProp('Catalog', 'descripcion').maxLength ?? 1000,
    whatsappMin: getProp('Catalog', 'whatsapp').minLength ?? 7,
    whatsappMax: getProp('Catalog', 'whatsapp').maxLength ?? 20,
    whatsappPattern: new RegExp(getProp('Catalog', 'whatsapp').pattern ?? '^[0-9]{7,20}$'),
    temas: (getProp('Catalog', 'tema').enum ?? ['light', 'dark', 'galaxy']) as StoreTheme[],
    logoUrlMax: getProp('Catalog', 'logoUrl').maxLength ?? 2048,
  },
  product: {
    categoriaMax: getProp('CatalogProduct', 'categoria').maxLength ?? 60,
    nombreMax: getProp('CatalogProduct', 'nombre').maxLength ?? 140,
    descripcionMax: getProp('CatalogProduct', 'descripcion').maxLength ?? 600,
    imagenMax: getProp('CatalogProduct', 'imagen').maxLength ?? 2048,
    maxPrice: 1_000_000_000,
    maxSortOrder: 10_000,
  },
} as const;

export function truncateString(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
}

export function sanitizeIdForFirestore(rawId: string, fallback = 'item-1'): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, BLUEPRINT_LIMITS.catalog.idMax);
  return BLUEPRINT_LIMITS.catalog.idPattern.test(cleaned) ? cleaned : fallback;
}

export function sanitizeSlugForFirestore(rawSlug: string): string {
  const candidate = sanitizeSubdomain(rawSlug).slice(0, BLUEPRINT_LIMITS.catalog.subdominioMax);
  if (
    candidate.length >= BLUEPRINT_LIMITS.catalog.subdominioMin &&
    BLUEPRINT_LIMITS.catalog.subdominioPattern.test(candidate)
  ) {
    return candidate;
  }
  return 'mi-tienda';
}

export function sanitizeDomainForFirestore(rawDomain?: string): string {
  const candidate = sanitizeDomainBase(rawDomain || DEFAULT_DOMAIN_BASE).slice(
    0,
    BLUEPRINT_LIMITS.catalog.dominioBaseMax
  );
  return BLUEPRINT_LIMITS.catalog.dominioBasePattern.test(candidate)
    ? candidate
    : DEFAULT_DOMAIN_BASE;
}

export function sanitizeWhatsappForFirestore(rawWhatsapp?: string): string {
  const digits = (rawWhatsapp || '').replace(/\D/g, '').slice(0, BLUEPRINT_LIMITS.catalog.whatsappMax);
  return BLUEPRINT_LIMITS.catalog.whatsappPattern.test(digits) ? digits : '573001234567';
}

export function sanitizeUrlForFirestore(rawUrl: string | undefined, maxLen: number): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  // Avoid exceeding Firestore doc/field limits with large inline base64 blobs
  if (trimmed.length > maxLen) {
    return '';
  }
  return trimmed;
}

export function sanitizeUserProfileForFirestore(input: {
  uid: string;
  email: string;
  name: string;
  platformDomain?: string;
}) {
  const uid = sanitizeIdForFirestore(input.uid);
  const email = truncateString(input.email || 'merchant@aurentime.shop', BLUEPRINT_LIMITS.user.emailMax);
  const safeEmail = email.length >= BLUEPRINT_LIMITS.user.emailMin ? email : 'merchant@aurentime.shop';
  const name =
    truncateString(input.name || safeEmail.split('@')[0] || 'Administrador', BLUEPRINT_LIMITS.user.nameMax) ||
    'Administrador';
  const platformDomain = sanitizeDomainForFirestore(input.platformDomain);

  return {
    uid,
    email: safeEmail,
    name,
    platformDomain,
  };
}

export function sanitizeCatalogForFirestore(catalog: CatalogWorkspace, ownerUid: string) {
  const id = sanitizeIdForFirestore(catalog.id, `cat-${Date.now().toString(36)}`);
  const safeOwnerUid = sanitizeIdForFirestore(ownerUid);
  const nombre =
    truncateString(catalog.config.nombre || 'Mi Tienda', BLUEPRINT_LIMITS.catalog.nombreMax) ||
    'Mi Tienda';
  const subdominio = sanitizeSlugForFirestore(catalog.config.subdominio || nombre);
  const dominioBase = sanitizeDomainForFirestore(catalog.config.dominioBase);
  const descripcion = truncateString(
    catalog.config.descripcion || '',
    BLUEPRINT_LIMITS.catalog.descripcionMax
  );
  const whatsapp = sanitizeWhatsappForFirestore(catalog.config.whatsapp);
  const tema: StoreTheme = BLUEPRINT_LIMITS.catalog.temas.includes(catalog.config.tema)
    ? catalog.config.tema
    : 'light';
  const logoUrl = sanitizeUrlForFirestore(
    catalog.config.logoUrl,
    BLUEPRINT_LIMITS.catalog.logoUrlMax
  );

  return {
    id,
    ownerUid: safeOwnerUid,
    nombre,
    subdominio,
    dominioBase,
    descripcion,
    whatsapp,
    tema,
    isPro: Boolean(catalog.config.isPro),
    isPublic: true,
    logoUrl,
  };
}

export function sanitizeProductForFirestore(
  product: Product,
  catalogId: string,
  ownerUid: string,
  sortOrder: number,
  isPublic = true
) {
  const safeCatalogId = sanitizeIdForFirestore(catalogId);
  const safeOwnerUid = sanitizeIdForFirestore(ownerUid);
  const safeId = Math.max(1, Math.round(Number.isFinite(product.id) ? product.id : sortOrder + 1));
  const safeSort = Math.min(
    BLUEPRINT_LIMITS.product.maxSortOrder,
    Math.max(0, Math.round(sortOrder))
  );
  const categoria =
    truncateString(product.categoria || 'General', BLUEPRINT_LIMITS.product.categoriaMax) ||
    'General';
  const nombre =
    truncateString(product.nombre || 'Producto', BLUEPRINT_LIMITS.product.nombreMax) || 'Producto';
  const precioActual = Math.min(
    BLUEPRINT_LIMITS.product.maxPrice,
    Math.max(1, Math.round(Number.isFinite(product.precioActual) ? product.precioActual : 1000))
  );
  const precioAnterior = Math.min(
    BLUEPRINT_LIMITS.product.maxPrice,
    Math.max(0, Math.round(Number.isFinite(product.precioAnterior) ? product.precioAnterior : 0))
  );
  const descripcion = truncateString(
    product.descripcion || '',
    BLUEPRINT_LIMITS.product.descripcionMax
  );
  const imagen = sanitizeUrlForFirestore(product.imagen, BLUEPRINT_LIMITS.product.imagenMax);

  return {
    id: safeId,
    catalogId: safeCatalogId,
    ownerUid: safeOwnerUid,
    isPublic,
    sortOrder: safeSort,
    categoria,
    nombre,
    precioActual,
    precioAnterior,
    descripcion,
    imagen,
  };
}

export function validateBlueprintEntityPayload(
  entityName: EntityKey,
  payload: Record<string, unknown>,
  expectedOwnerUid?: string
): { valid: boolean; errors: string[] } {
  const entity = blueprint.entities[entityName];
  const errors: string[] = [];
  const required = entity.required || [];
  const allowedKeys = Object.keys(entity.properties);

  for (const key of required) {
    if (!(key in payload)) {
      errors.push(`Missing required field: ${key}`);
    }
  }
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`Disallowed shadow/ghost field: ${key}`);
    }
  }

  if (expectedOwnerUid) {
    if ('ownerUid' in payload && payload.ownerUid !== expectedOwnerUid) {
      errors.push('ownerUid does not match authenticated user');
    }
    if ('uid' in payload && payload.uid !== expectedOwnerUid) {
      errors.push('uid does not match authenticated user');
    }
  }

  for (const [field, def] of Object.entries(
    entity.properties as Record<
      string,
      {
        type: string;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        enum?: string[];
      }
    >
  )) {
    const val = payload[field];
    if (val === undefined) continue;

    if (def.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`${field} must be a string`);
        continue;
      }
      if (def.minLength !== undefined && val.length < def.minLength) {
        errors.push(`${field} shorter than ${def.minLength}`);
      }
      if (def.maxLength !== undefined && val.length > def.maxLength) {
        errors.push(`${field} exceeds maxLength ${def.maxLength}`);
      }
      if (def.pattern && !new RegExp(def.pattern).test(val)) {
        errors.push(`${field} fails pattern ${def.pattern}`);
      }
      if (def.enum && !def.enum.includes(val)) {
        errors.push(`${field} must be one of ${def.enum.join(', ')}`);
      }
    } else if (def.type === 'number') {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push(`${field} must be a finite number`);
      } else if (field === 'precioActual' && val < 1) {
        errors.push('precioActual must be >= 1');
      } else if (field === 'precioAnterior' && val < 0) {
        errors.push('precioAnterior must be >= 0');
      }
    } else if (def.type === 'boolean') {
      if (typeof val !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
