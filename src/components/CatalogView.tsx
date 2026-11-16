import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Watch,
  X,
} from 'lucide-react';
import {
  buildWhatsAppOrderUrl,
  calculateDiscountPercent,
  extractUniqueCategories,
  formatCOP,
  formatStoreUrl,
  type CartItem,
  type Product,
  type StoreConfig,
  type StoreTheme,
} from '../utils/catalogLogic';

interface CatalogViewProps {
  storeConfig: StoreConfig;
  products: Product[];
  cart: CartItem[];
  onAddToCart: (productId: number) => void;
  onUpdateCartQty: (productId: number, delta: number) => void;
  onClearCart: () => void;
  onOpenAdmin: () => void;
}

const THEME_STYLES: Record<
  StoreTheme,
  {
    pageBg: string;
    headerBg: string;
    cardBg: string;
    mutedText: string;
    bodyText: string;
    headingText: string;
    accentBtn: string;
    filterActive: string;
    filterInactive: string;
    inputBg: string;
    divider: string;
    discountText: string;
  }
> = {
  light: {
    pageBg: 'bg-[#F8FAFC] text-slate-900',
    headerBg: 'bg-white/90 border-slate-200',
    cardBg: 'bg-white border-slate-200',
    mutedText: 'text-slate-500',
    bodyText: 'text-slate-600',
    headingText: 'text-slate-900',
    accentBtn: 'bg-slate-900 hover:bg-slate-800 text-white',
    filterActive: 'bg-slate-900 text-white',
    filterInactive: 'bg-slate-200/70 text-slate-700 hover:bg-slate-200',
    inputBg: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
    divider: 'border-slate-200',
    discountText: 'text-emerald-700',
  },
  dark: {
    pageBg: 'bg-[#09090B] text-zinc-100',
    headerBg: 'bg-[#09090B]/90 border-zinc-800',
    cardBg: 'bg-[#121216] border-zinc-800',
    mutedText: 'text-zinc-400',
    bodyText: 'text-zinc-300',
    headingText: 'text-white',
    accentBtn: 'bg-amber-400 hover:bg-amber-300 text-zinc-950',
    filterActive: 'bg-amber-400 text-zinc-950',
    filterInactive: 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800',
    inputBg: 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500',
    divider: 'border-zinc-800',
    discountText: 'text-emerald-400',
  },
  galaxy: {
    pageBg:
      'bg-[#060714] bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(217,70,239,0.10),_transparent_50%)] text-slate-100',
    headerBg: 'bg-[#060714]/85 border-indigo-400/20',
    cardBg: 'bg-[#0D1025] border-indigo-400/20',
    mutedText: 'text-slate-400',
    bodyText: 'text-slate-300',
    headingText: 'text-white',
    accentBtn: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    filterActive: 'bg-cyan-400 text-slate-950',
    filterInactive: 'bg-white/10 text-slate-300 hover:bg-white/15',
    inputBg: 'bg-[#0D1025] border-indigo-400/25 text-white placeholder:text-slate-500',
    divider: 'border-indigo-400/20',
    discountText: 'text-emerald-400',
  },
};

export function CatalogView({
  storeConfig,
  products,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onClearCart,
  onOpenAdmin,
}: CatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, boolean>>({});

  const styles = THEME_STYLES[storeConfig.tema] || THEME_STYLES.light;
  const categories = useMemo(() => extractUniqueCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const catMatch =
        selectedCategory === 'Todos' || p.categoria === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const cartQtyMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cart) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [cart]);

  const orderSummary = useMemo(
    () =>
      buildWhatsAppOrderUrl(
        storeConfig.whatsapp,
        storeConfig.nombre,
        cart,
        products,
        customerNote
      ),
    [storeConfig.whatsapp, storeConfig.nombre, cart, products, customerNote]
  );

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(orderSummary.message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // Fallback silencioso si clipboard no está disponible
    }
  };

  return (
    <div className={`min-h-screen ${styles.pageBg} pb-24 transition-colors`}>
      {/* Compact Storefront Top Bar (<= 52px on mobile) */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b ${styles.headerBg}`}>
        <div className="max-w-5xl mx-auto px-4 h-13 flex items-center justify-between gap-4">
          <span className={`font-mono text-xs truncate ${styles.mutedText}`}>
            {formatStoreUrl(storeConfig)}
          </span>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`text-xs font-medium hover:underline whitespace-nowrap shrink-0 ${styles.mutedText}`}
          >
            Administrar tienda
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 sm:pt-8">
        {/* Store Identity Profile */}
        <section className={`pb-6 border-b ${styles.divider}`}>
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border overflow-hidden flex items-center justify-center shrink-0 ${styles.cardBg}`}
            >
              {storeConfig.logoUrl ? (
                <img
                  src={storeConfig.logoUrl}
                  alt={`Logotipo de ${storeConfig.nombre}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={`font-display font-bold text-xl ${styles.headingText}`}>
                  {storeConfig.nombre.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1
                  className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${styles.headingText}`}
                >
                  {storeConfig.nombre}
                </h1>
                {storeConfig.isPro && (
                  <span className="text-xs font-semibold tracking-wide text-cyan-500">
                    · PRO
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed mt-1.5 max-w-2xl ${styles.bodyText}`}>
                {storeConfig.descripcion}
              </p>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${styles.mutedText}`}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar relojes o productos"
                placeholder="Buscar referencia..."
                className={`w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border text-sm focus:outline-none focus:border-cyan-500 ${styles.inputBg}`}
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por categoría"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
            >
              {['Todos', ...categories].map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={active}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active ? styles.filterActive : styles.filterInactive
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product Grid */}
        <section aria-label="Catálogo de productos" className="pt-6">
          {filteredProducts.length === 0 ? (
            <div className={`rounded-2xl border p-10 text-center ${styles.cardBg}`}>
              <p className={`text-sm font-semibold ${styles.headingText}`}>
                No encontramos productos en esta categoría o búsqueda
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Todos');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs font-semibold text-cyan-500 hover:underline"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((product) => {
                const discount = calculateDiscountPercent(
                  product.precioActual,
                  product.precioAnterior
                );
                const qty = cartQtyMap.get(product.id) || 0;
                const isImgBroken = brokenImageIds[product.id] || !product.imagen;

                return (
                  <article
                    key={product.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-transform duration-150 ease-snappy hover:-translate-y-0.5 ${styles.cardBg}`}
                  >
                    <div>
                      <div className="aspect-[4/3] w-full bg-slate-200/40 overflow-hidden relative">
                        {isImgBroken ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-300 text-center">
                            <Watch className="w-8 h-8 mb-2 opacity-70" aria-hidden="true" />
                            <span className="text-xs font-medium line-clamp-2">
                              {product.nombre}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={product.imagen}
                            alt={product.nombre}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenImageIds((prev) => ({
                                ...prev,
                                [product.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="p-4 sm:p-5">
                        {/* Clean unboxed metadata (zero pill boxes) */}
                        <div className={`text-xs font-medium flex items-center gap-1.5 ${styles.mutedText}`}>
                          <span>{product.categoria}</span>
                          {discount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className={`${styles.discountText} font-semibold tabular-nums`}>
                                {discount}% ahorro
                              </span>
                            </>
                          )}
                        </div>

                        <h2
                          className={`font-display text-base font-semibold mt-1.5 leading-snug ${styles.headingText}`}
                        >
                          {product.nombre}
                        </h2>

                        <p className={`text-xs leading-relaxed mt-1.5 line-clamp-2 ${styles.bodyText}`}>
                          {product.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 flex items-center justify-between gap-3">
                      <div className="tabular-nums">
                        <p className={`font-display text-lg font-bold ${styles.headingText}`}>
                          {formatCOP(product.precioActual)}
                        </p>
                        {product.precioAnterior > product.precioActual && (
                          <p className={`text-xs line-through ${styles.mutedText}`}>
                            {formatCOP(product.precioAnterior)}
                          </p>
                        )}
                      </div>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => onAddToCart(product.id)}
                          aria-label={`Añadir ${product.nombre}`}
                          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ease-snappy active:scale-[0.98] ${styles.accentBtn}`}
                        >
                          <Plus className="w-4 h-4" aria-hidden="true" />
                          <span>Añadir</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-1">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(product.id, -1)}
                            aria-label={`Quitar una unidad de ${product.nombre}`}
                            className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center hover:bg-cyan-500/20"
                          >
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(product.id, 1)}
                            aria-label={`Agregar otra unidad de ${product.nombre}`}
                            className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center hover:bg-cyan-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Button (positioned bottom-right to coexist cleanly with bottom-left ViewSwitcher) */}
      {orderSummary.itemCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCheckoutOpen(true)}
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xl flex items-center gap-1.5 sm:gap-2 whitespace-nowrap tabular-nums transition-transform active:scale-[0.98]"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="sm:hidden">
            Pedido ({orderSummary.itemCount}) · {formatCOP(orderSummary.total)}
          </span>
          <span className="hidden sm:inline">
            Ver Pedido ({orderSummary.itemCount}) · {formatCOP(orderSummary.total)}
          </span>
        </button>
      )}

      {/* Conversational Checkout Drawer / Sheet */}
      {isCheckoutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-sheet-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm"
        >
          <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 pt-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2
                    id="checkout-sheet-title"
                    className="font-display text-lg font-bold text-slate-900"
                  >
                    Tu Pedido en {storeConfig.nombre}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sin registros ni formularios largos · Cierre directo en WhatsApp
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  aria-label="Cerrar resumen de pedido"
                  className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <ul className="divide-y divide-slate-200">
                {cart.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;
                  return (
                    <li
                      key={prod.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {formatCOP(prod.precioActual)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty(prod.id, -1)}
                          aria-label={`Restar ${prod.nombre}`}
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty(prod.id, 1)}
                          aria-label={`Sumar ${prod.nombre}`}
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div>
                <label
                  htmlFor="customer-note"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Tu nombre o ciudad de entrega (opcional)
                </label>
                <input
                  id="customer-note"
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Ej. Carlos Gómez · Envío a Bogotá"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-600">
                    Mensaje listo para WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copiar texto</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {orderSummary.message}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-baseline justify-between tabular-nums">
                <div>
                  <span className="text-sm font-semibold text-slate-700">Total a pagar</span>
                  {orderSummary.totalSavings > 0 && (
                    <p className="text-xs text-emerald-700 font-medium">
                      Ahorras {formatCOP(orderSummary.totalSavings)} sobre precio regular
                    </p>
                  )}
                </div>
                <span className="font-display text-2xl font-bold text-slate-900">
                  {formatCOP(orderSummary.total)}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearCart();
                    setIsCheckoutOpen(false);
                  }}
                  aria-label="Vaciar pedido"
                  className="min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <a
                  href={orderSummary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[46px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Pedir por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
