import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default('Administrador'),
  platformDomain: text('platform_domain').notNull().default('aurentime.shop'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const catalogs = pgTable('catalogs', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  ownerEmail: text('owner_email').notNull(),
  nombre: text('nombre').notNull(),
  subdominio: text('subdominio').notNull().unique(),
  dominioBase: text('dominio_base').notNull().default('aurentime.shop'),
  descripcion: text('descripcion').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default('573001234567'),
  tema: text('tema').notNull().default('light'),
  isPro: boolean('is_pro').notNull().default(true),
  logoUrl: text('logo_url').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  catalogId: text('catalog_id')
    .references(() => catalogs.id, { onDelete: 'cascade' })
    .notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  nombre: text('nombre').notNull(),
  categoria: text('categoria').notNull().default('General'),
  precioActual: integer('precio_actual').notNull(),
  precioAnterior: integer('precio_anterior').notNull(),
  descripcion: text('descripcion').notNull().default(''),
  imagen: text('imagen').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  catalogs: many(catalogs),
}));

export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  owner: one(users, {
    fields: [catalogs.userId],
    references: [users.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  catalog: one(catalogs, {
    fields: [products.catalogId],
    references: [catalogs.id],
  }),
}));
