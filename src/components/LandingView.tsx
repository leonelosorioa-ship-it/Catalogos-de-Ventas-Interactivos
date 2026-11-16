import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  GripVertical,
  MessageSquare,
  Smartphone,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { ViewMode } from '../utils/catalogLogic';

interface LandingViewProps {
  storeName: string;
  storeUrl: string;
  productCount: number;
  onNavigate: (view: ViewMode) => void;
}

export function LandingView({
  storeName,
  storeUrl,
  productCount,
  onNavigate,
}: LandingViewProps) {
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const handleLeadSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLeadError(null);

    if (leadName.trim().length < 2) {
      setLeadError('Ingresa el nombre de tu negocio o contacto.');
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());
    if (!emailValid) {
      setLeadError('Ingresa un correo electrónico válido.');
      return;
    }
    const digits = leadPhone.replace(/\D/g, '');
    if (digits.length < 7) {
      setLeadError('Ingresa un número de WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    setLeadSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#060714] text-slate-100 pb-20">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#060714]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#inicio"
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-md"
          >
            <img
              src="/assets/aistudio/Solo_logo_de_Leps_Digital_IA_2026_-_Formato_Horizontal_8f1d260e.png"
              alt="Leps Software Solutions"
              referrerPolicy="no-referrer"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <a
              href="#capacidades"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capacidades
            </a>
            <a
              href="#caso-auren"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Caso Auren Time
            </a>
            <a
              href="#ecosistema"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Soluciones Leps
            </a>
            <a
              href="#solicitar-demo"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Contacto
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors ease-snappy whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
            >
              Acceder / Crear Catálogo
            </button>
          </div>
        </div>
      </header>

      <main id="inicio">
        {/* Hero Split Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 lg:pt-20 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wide text-cyan-400 mb-3">
                Comercio conversacional · División Tecnológica de Leps Digital
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08] text-balance mb-5">
                Catálogos móviles que cierran ventas directo en WhatsApp
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mb-8">
                Reemplaza los PDFs pesados y hojas de cálculo estáticas por una tienda web móvil
                inmediata. Tus clientes vitrinean sin registrarse y envían el pedido listo a tu chat.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="min-h-[46px] px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors ease-snappy whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span>Crear mi catálogo ahora</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="min-h-[46px] px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-sm transition-colors ease-snappy whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  Ver tienda {storeName}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[260px] sm:min-h-[340px] rounded-2xl overflow-hidden border border-white/10 bg-[#0D0F22]">
                <img
                  src="/src/assets/images/hero_leps_catalog_showcase_1794804977694.jpg"
                  alt="Vista previa de catálogo móvil conversacional junto a reloj de lujo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060714]/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 text-xs text-slate-200">
                  <span className="font-mono text-cyan-300">{storeUrl}</span>
                  <span className="tabular-nums text-slate-300">
                    {productCount} productos activos
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Proof Strip directly below hero split */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-white/10">
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
                50 prod / 20s
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Carga masiva con lectura de imágenes por IA
              </p>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
                0% comisión
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Sin pasarelas ni intermediarios en tus cobros
              </p>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
                100% móvil
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Diseñado para tráfico de Instagram y TikTok
              </p>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
                3 clics
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                De la selección al mensaje listo en WhatsApp
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities Bento Grid */}
        <section
          id="capacidades"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10"
        >
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              Ingeniería de conversión sin fricción técnica
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-2">
              Cada componente está diseñado para acelerar la decisión de compra desde el celular y
              reducir el tiempo de configuración del comerciante.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <article className="md:col-span-2 rounded-2xl border border-white/10 bg-[#0D0F22] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-xs font-medium text-cyan-400">
                    01. Psicología de precios y CRO
                  </span>
                  <Tag className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">
                  Precios de anclaje tachados y checkout conversacional
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  Muestra el valor anterior tachado junto al precio promocional en cada artículo para
                  activar la percepción de oportunidad inmediata. Al confirmar, no pedimos correos ni
                  contraseñas: transferimos el carrito estructurado directo a tu WhatsApp.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-slate-300">
                <span className="tabular-nums">Precio anclaje: $240.000</span>
                <span className="text-cyan-400 font-semibold tabular-nums">
                  Oferta hoy: $175.000 (-27%)
                </span>
                <span className="font-mono text-slate-400">wa.me/?text=Hola...</span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0D0F22] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-xs font-medium text-fuchsia-400">
                    02. Importación con IA
                  </span>
                  <Sparkles className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">
                  50 productos en 20 segundos
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Sube una foto de tu lista de precios o pega texto libre de WhatsApp. La IA extrae
                  nombres, categorías, precios y descripciones automáticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="mt-6 text-left text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Probar importador en el Admin</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0D0F22] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="text-xs font-medium text-cyan-400">
                  03. Autogestión Drag & Drop
                </span>
                <GripVertical className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">
                Reordena tu vitrina arrastrando
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Prioriza tus productos más rentables con arrastrar y soltar. Cada cambio se refleja
                al instante en tu catálogo público sin conocimientos técnicos.
              </p>
            </article>

            <article className="md:col-span-2 rounded-2xl border border-white/10 bg-[#0D0F22] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-cyan-400">
                    04. Identidad de marca y subdominio
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">
                  Tu negocio bajo tu propio enlace profesional
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
                  Configura tu subdominio o dominio propio (<span className="font-mono text-white">tumarca.leps.link</span>),
                  logotipo y plantilla visual (Minimalista Claro, Oscuro o Galaxia) en segundos.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Smartphone className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <MessageSquare className="w-5 h-5 text-fuchsia-400" aria-hidden="true" />
              </div>
            </article>
          </div>
        </section>

        {/* Case Study Auren Time + Leps Software Solutions Ecosystem */}
        <section
          id="caso-auren"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10"
        >
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium text-cyan-400 mb-2">
                Caso de referencia pre-cargado
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
                Auren Time: 100% catálogo con precios de anclaje listo para operar
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                Explora la tienda real precargada con 10 referencias de relojería para Caballero y
                Dama. Prueba añadir piezas al carrito, revisar el ahorro acumulado y generar el
                enlace codificado hacia WhatsApp sin fricción.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-colors ease-snappy"
                >
                  Explorar {storeName} en vivo
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-white/15 text-slate-200 font-medium text-sm hover:bg-white/5 transition-colors ease-snappy"
                >
                  Editar tienda en Admin
                </button>
              </div>
            </div>

            <div id="ecosistema" className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#050611] p-4">
                <img
                  src="/assets/aistudio/Nuevo_Logo_de_Leps_Digital_IA_2026_83314fb7.png"
                  alt="Leps Software Solutions — Automatización de procesos, desarrollo web y móvil, SaaS y micro activos inteligentes"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Lead Capture Form */}
        <section
          id="solicitar-demo"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10"
        >
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#0D0F22] p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-2">
              Activa tu plataforma con Leps Software Solutions
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Déjanos tus datos para habilitar tu subdominio personalizado y migración inicial de
              catálogo con IA.
            </p>

            {leadSubmitted ? (
              <div
                role="status"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200 flex items-start gap-3"
              >
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-white">Solicitud registrada correctamente</p>
                  <p className="mt-1 text-emerald-200/90">
                    Un especialista de Leps Digital contactará a {leadName} al correo {leadEmail}.
                    Mientras tanto, puedes probar el panel administrativo directamente.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="mt-3 text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    Ir al Panel Administrativo →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} noValidate className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="lead-name"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Nombre o negocio
                    </label>
                    <input
                      id="lead-name"
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Ej. Auren Time"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-[#060714] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lead-whatsapp"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      WhatsApp de ventas
                    </label>
                    <input
                      id="lead-whatsapp"
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-[#060714] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lead-email"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="gerencia@tunegocio.com"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-[#060714] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {leadError && (
                  <p role="alert" className="text-xs text-rose-400 font-medium">
                    {leadError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[46px] px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors ease-snappy"
                >
                  Solicitar activación de catálogo
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/Solo_logo_de_Leps_Digital_IA_2026_d4687b55.png"
              alt="Leps Digital"
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded object-cover"
            />
            <span>Leps Software Solutions · División Tecnológica de Leps Digital</span>
          </div>
          <span>Plataforma de Comercio Conversacional · 2026</span>
        </div>
      </footer>
    </div>
  );
}
