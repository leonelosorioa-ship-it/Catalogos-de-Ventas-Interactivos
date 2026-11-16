import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sanitizeCatalogForFirestore,
  sanitizeProductForFirestore,
  sanitizeUserProfileForFirestore,
  validateBlueprintEntityPayload,
} from './src/lib/blueprintConstraints.ts';

const rulesSource = fs.readFileSync('./firestore.rules', 'utf8');

test('firestore.rules includes default-deny safety net and verified user gates', () => {
  assert.match(rulesSource, /rules_version\s*=\s*'2'/);
  assert.match(rulesSource, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesSource, /match \/users\/\{userId\}[\s\S]*allow list: if false;/);
  assert.match(rulesSource, /match \/slugs\/\{slugId\}[\s\S]*allow list: if false;/);
  assert.match(rulesSource, /getAfter\(\/databases\/\$\(database\)\/documents\/catalogs\//);
});

test('Dirty Dozen #1-4: UserProfile validation rejects shadow fields, invalid domains, and spoofed UIDs', () => {
  const validUser = {
    ...sanitizeUserProfileForFirestore({
      uid: 'uid-merchant-1',
      email: 'agencialeps@gmail.com',
      name: 'Leps Admin',
      platformDomain: 'aurentime.shop',
    }),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    validateBlueprintEntityPayload('UserProfile', validUser, 'uid-merchant-1').valid,
    true
  );

  // Dirty Dozen #3: Shadow field / self-assigned admin escalation
  assert.equal(
    validateBlueprintEntityPayload(
      'UserProfile',
      { ...validUser, isAdmin: true },
      'uid-merchant-1'
    ).valid,
    false
  );

  // Dirty Dozen #1 / Identity Spoofing
  assert.equal(
    validateBlueprintEntityPayload('UserProfile', validUser, 'uid-attacker-2').valid,
    false
  );

  // Invalid domain format
  assert.equal(
    validateBlueprintEntityPayload(
      'UserProfile',
      { ...validUser, platformDomain: 'https://bad domain/path' },
      'uid-merchant-1'
    ).valid,
    false
  );
});

test('Dirty Dozen #5-9: Catalog validation rejects identity spoofing, oversized strings, and ghost fields', () => {
  const validCatalog = {
    ...sanitizeCatalogForFirestore(
      {
        id: 'cat-auren-time',
        ownerEmail: 'agencialeps@gmail.com',
        config: {
          nombre: 'Auren Time',
          subdominio: 'auren-time',
          dominioBase: 'aurentime.shop',
          descripcion: 'Alta relojería contemporánea.',
          whatsapp: '573001234567',
          tema: 'light',
          isPro: true,
          logoUrl: '',
        },
        products: [],
        updatedAt: '2026-01-01T00:00:00Z',
      },
      'uid-merchant-1'
    ),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    validateBlueprintEntityPayload('Catalog', validCatalog, 'uid-merchant-1').valid,
    true
  );

  // Dirty Dozen #5: Identity spoofing
  assert.equal(
    validateBlueprintEntityPayload('Catalog', validCatalog, 'uid-other').valid,
    false
  );

  // Dirty Dozen #7: ID poisoning (oversized or invalid chars)
  assert.equal(
    validateBlueprintEntityPayload(
      'Catalog',
      { ...validCatalog, id: '../hack-path' },
      'uid-merchant-1'
    ).valid,
    false
  );

  // Dirty Dozen #8: Value poisoning (oversized name)
  assert.equal(
    validateBlueprintEntityPayload(
      'Catalog',
      { ...validCatalog, nombre: 'A'.repeat(500) },
      'uid-merchant-1'
    ).valid,
    false
  );

  // Ghost field injection
  assert.equal(
    validateBlueprintEntityPayload(
      'Catalog',
      { ...validCatalog, verifiedBadgeOverride: true },
      'uid-merchant-1'
    ).valid,
    false
  );
});

test('Dirty Dozen #10-12: CatalogProduct & CatalogSlugLookup reject negative prices, oversized images, and orphan slugs', () => {
  const validProduct = {
    ...sanitizeProductForFirestore(
      {
        id: 1,
        categoria: 'Caballero',
        nombre: 'Reloj Urban Graphite',
        precioActual: 175000,
        precioAnterior: 240000,
        descripcion: 'Acabado mate.',
        imagen: '/src/assets/images/watch_urban_graphite_1794804977090.jpg',
      },
      'cat-auren-time',
      'uid-merchant-1',
      0,
      true
    ),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    validateBlueprintEntityPayload('CatalogProduct', validProduct, 'uid-merchant-1').valid,
    true
  );

  // Dirty Dozen #11: Negative price & 10KB image blob rejection
  assert.equal(
    validateBlueprintEntityPayload(
      'CatalogProduct',
      { ...validProduct, precioActual: -50 },
      'uid-merchant-1'
    ).valid,
    false
  );
  assert.equal(
    validateBlueprintEntityPayload(
      'CatalogProduct',
      { ...validProduct, imagen: 'data:image/png;base64,' + 'A'.repeat(10000) },
      'uid-merchant-1'
    ).valid,
    false
  );

  // Dirty Dozen #12: Slug lookup with invalid catalogId or spoofed owner
  const badSlug = {
    slug: 'relojes',
    catalogId: 'bad/id',
    ownerUid: 'uid-merchant-1',
    isPublic: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    validateBlueprintEntityPayload('CatalogSlugLookup', badSlug, 'uid-merchant-1').valid,
    false
  );
});
