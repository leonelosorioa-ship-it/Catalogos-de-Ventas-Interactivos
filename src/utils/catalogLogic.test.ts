import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CATALOG_WORKSPACE,
  DEFAULT_DOMAIN_BASE,
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_CONFIG,
  DEFAULT_TEMPLATE_BIO,
  buildWhatsAppOrderUrl,
  calculateDiscountPercent,
  createCatalogWorkspace,
  ensureUniqueSubdomain,
  formatCOP,
  formatStoreUrl,
  isTemplateBioWarning,
  loadPlatformDomainBase,
  migrateCatalogWorkspace,
  parseBulkCatalogText,
  reorderProducts,
  sanitizeDomainBase,
  sanitizeSubdomain,
  savePlatformDomainBase,
  validateAuthCredentials,
  validateCustomDomain,
  validateDomainConfig,
  validateSubdomainSlug,
} from './catalogLogic';

test('formatCOP formats Colombian peso amounts with dots', () => {
  assert.equal(formatCOP(175000), '$175.000');
  assert.equal(formatCOP(1280000), '$1.280.000');
  assert.equal(formatCOP(0), '$0');
});

test('sanitizeDomainBase and formatStoreUrl build custom own-brand URLs', () => {
  assert.equal(sanitizeDomainBase('https://MiMarca.com/tienda'), 'mimarca.com');
  assert.equal(
    formatStoreUrl({ subdominio: 'catalogo', dominioBase: 'lepsdigital.com' }),
    'catalogo.lepsdigital.com'
  );
  assert.equal(
    formatStoreUrl({ subdominio: 'Auren Time' }),
    'auren-time.aurentime.shop'
  );
  assert.equal(DEFAULT_STORE_CONFIG.dominioBase, DEFAULT_DOMAIN_BASE);
  assert.equal(DEFAULT_DOMAIN_BASE, 'aurentime.shop');
});

test('validateSubdomainSlug and validateCustomDomain enforce strict DNS format and block kr36.link', () => {
  assert.equal(validateSubdomainSlug('auren-time').valid, true);
  assert.equal(validateSubdomainSlug('a').valid, false);
  assert.equal(validateSubdomainSlug('-tienda').valid, false);
  assert.equal(validateSubdomainSlug('mi tienda').valid, false);

  assert.equal(validateCustomDomain('aurentime.shop').valid, true);
  assert.equal(validateCustomDomain('https://LepsDigital.com/').normalized, 'lepsdigital.com');
  assert.equal(validateCustomDomain('tienda.mimarca.com.co').valid, true);
  assert.equal(validateCustomDomain('').valid, false);
  assert.equal(validateCustomDomain('localhost').valid, false);
  assert.equal(validateCustomDomain('mi_dominio.com').valid, false);
  assert.equal(validateCustomDomain('aurentime.shop/ruta').valid, false);
  assert.equal(validateCustomDomain('kr36.link').valid, false);
  assert.equal(validateCustomDomain('sub.kr36.link').valid, false);

  const combined = validateDomainConfig('relojes', 'aurentime.shop');
  assert.equal(combined.valid, true);
  assert.equal(combined.subdominio, 'relojes');
  assert.equal(combined.dominioBase, 'aurentime.shop');
});

test('savePlatformDomainBase and loadPlatformDomainBase persist valid custom domain and reject invalid ones', () => {
  const memory = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, val: string) => {
      memory.set(key, val);
    },
  };

  assert.equal(loadPlatformDomainBase(mockStorage), 'aurentime.shop');

  const badSave = savePlatformDomainBase('kr36.link', mockStorage);
  assert.equal(badSave.valid, false);
  assert.equal(loadPlatformDomainBase(mockStorage), 'aurentime.shop');

  savePlatformDomainBase('leps.link', mockStorage);
  assert.equal(loadPlatformDomainBase(mockStorage), 'aurentime.shop');

  const goodSave = savePlatformDomainBase('  MiMarca.COM  ', mockStorage);
  assert.equal(goodSave.valid, true);
  assert.equal(goodSave.normalized, 'mimarca.com');
  assert.equal(loadPlatformDomainBase(mockStorage), 'mimarca.com');
});

test('calculateDiscountPercent computes anchoring discount correctly', () => {
  assert.equal(calculateDiscountPercent(175000, 240000), 27);
  assert.equal(calculateDiscountPercent(100000, 100000), 0);
  assert.equal(calculateDiscountPercent(120000, 90000), 0);
});

test('sanitizeSubdomain normalizes accents, spaces, and symbols', () => {
  assert.equal(sanitizeSubdomain('Auren Time!'), 'auren-time');
  assert.equal(sanitizeSubdomain('Joyería Ónix 2026'), 'joyeria-onix-2026');
  assert.equal(sanitizeSubdomain('   '), 'mi-tienda');
});

test('ensureUniqueSubdomain appends numeric suffix on collision', () => {
  assert.equal(
    ensureUniqueSubdomain('auren-time', [DEFAULT_CATALOG_WORKSPACE]),
    'auren-time-2'
  );
  assert.equal(
    ensureUniqueSubdomain('velour-cafe', [DEFAULT_CATALOG_WORKSPACE]),
    'velour-cafe'
  );
});

test('validateAuthCredentials enforces email, password length, and registration name', () => {
  assert.equal(validateAuthCredentials('bad-email', '123456', 'login'), 'Ingresa un correo electrónico válido.');
  assert.equal(validateAuthCredentials('user@leps.co', '123', 'login'), 'La contraseña debe tener al menos 6 caracteres.');
  assert.equal(validateAuthCredentials('user@leps.co', '123456', 'register', 'A'), 'Ingresa tu nombre o el de tu empresa (mínimo 2 caracteres).');
  assert.equal(validateAuthCredentials('user@leps.co', '123456', 'register', 'Auren'), null);
});

test('createCatalogWorkspace creates distinct catalog with clean aurentime.shop subdomain', () => {
  const created = createCatalogWorkspace(
    'agencialeps@gmail.com',
    {
      nombre: 'Auren Time',
      whatsapp: '+57 310 555 0000',
      tema: 'galaxy',
    },
    [DEFAULT_CATALOG_WORKSPACE]
  );

  assert.equal(created.config.nombre, 'Auren Time');
  assert.equal(created.config.subdominio, 'auren-time-2');
  assert.equal(created.config.dominioBase, 'aurentime.shop');
  assert.equal(created.config.whatsapp, '573105550000');
  assert.equal(created.config.tema, 'galaxy');
  assert.equal(created.products.length, 0);
});

test('migrateCatalogWorkspace replaces prior platform domains with aurentime.shop', () => {
  const legacyCatalog = {
    ...DEFAULT_CATALOG_WORKSPACE,
    config: {
      ...DEFAULT_STORE_CONFIG,
      dominioBase: 'kr36.link',
      descripcion: 'Aquí va la descripción de tu negocio. Los botones de las redes actualmente tienen las redes de KR...',
    },
  };
  const migrated = migrateCatalogWorkspace(legacyCatalog);
  assert.equal(migrated.config.dominioBase, 'aurentime.shop');
  assert.equal(migrated.config.descripcion.toLowerCase().includes('redes de kr'), false);
  assert.equal(formatStoreUrl(migrated.config), 'auren-time.aurentime.shop');

  const priorDefaultCatalog = {
    ...DEFAULT_CATALOG_WORKSPACE,
    config: {
      ...DEFAULT_STORE_CONFIG,
      dominioBase: 'leps.link',
    },
  };
  assert.equal(migrateCatalogWorkspace(priorDefaultCatalog).config.dominioBase, 'aurentime.shop');

  const customCatalog = {
    ...DEFAULT_CATALOG_WORKSPACE,
    config: {
      ...DEFAULT_STORE_CONFIG,
      dominioBase: 'lepsdigital.com',
      descripcion: 'Joyería y relojería de autor con envíos en 24 horas.',
    },
  };
  const preserved = migrateCatalogWorkspace(customCatalog);
  assert.equal(preserved.config.dominioBase, 'lepsdigital.com');
  assert.equal(preserved.config.descripcion, 'Joyería y relojería de autor con envíos en 24 horas.');
});

test('reorderProducts moves items cleanly for Drag and Drop', () => {
  const reordered = reorderProducts(DEFAULT_PRODUCTS, 0, 2);
  assert.equal(reordered.length, DEFAULT_PRODUCTS.length);
  assert.equal(reordered[0].id, 2);
  assert.equal(reordered[1].id, 3);
  assert.equal(reordered[2].id, 1);
});

test('parseBulkCatalogText extracts names, prices, and categories from free text', () => {
  const sample = `
    1. Reloj de Oro - $200.000
    2. Reloj de Plata | $100.000 | $145.000 | Dama
    Reloj Cronógrafo Negro $185000
  `;
  const result = parseBulkCatalogText(sample);
  assert.equal(result.length, 3);
  assert.equal(result[0].nombre, 'Reloj de Oro');
  assert.equal(result[0].precioActual, 200000);
  assert.ok(result[0].precioAnterior > 200000);

  assert.equal(result[1].nombre, 'Reloj de Plata');
  assert.equal(result[1].precioActual, 100000);
  assert.equal(result[1].precioAnterior, 145000);
  assert.equal(result[1].categoria, 'Dama');

  assert.equal(result[2].precioActual, 185000);
  assert.equal(result[2].categoria, 'Caballero');
});

test('buildWhatsAppOrderUrl encodes order summary and total accurately', () => {
  const { url, message, total, totalSavings, itemCount } = buildWhatsAppOrderUrl(
    '+57 300 123 4567',
    'Auren Time',
    [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
    DEFAULT_PRODUCTS,
    'Envío a Medellín'
  );

  assert.equal(itemCount, 3);
  assert.equal(total, 175000 * 2 + 128000);
  assert.equal(totalSavings, (240000 - 175000) * 2 + (175000 - 128000));
  assert.ok(url.startsWith('https://wa.me/573001234567?text='));
  assert.ok(message.includes('2x Reloj Urban Graphite Acero Pavonado Mate'));
  assert.ok(message.includes('Total: $478.000'));
  assert.ok(message.includes('Envío a Medellín'));
});

test('isTemplateBioWarning flags unedited placeholder bio without external references', () => {
  assert.equal(DEFAULT_TEMPLATE_BIO.toLowerCase().includes('kr'), false);
  assert.equal(isTemplateBioWarning(DEFAULT_TEMPLATE_BIO), true);
  assert.equal(
    isTemplateBioWarning('Relojería de alta gama con garantía de 12 meses y envíos nacionales.'),
    false
  );
});
