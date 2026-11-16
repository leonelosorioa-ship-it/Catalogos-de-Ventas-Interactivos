import { useEffect, useState, type FormEvent } from 'react';
import { Store, X } from 'lucide-react';
import {
  DEFAULT_DOMAIN_BASE,
  sanitizeDomainBase,
  sanitizeSubdomain,
  validateDomainConfig,
  type StoreTheme,
} from '../utils/catalogLogic';

interface CreateCatalogModalProps {
  isOpen: boolean;
  defaultDomainBase?: string;
  onClose: () => void;
  onCreate: (input: {
    nombre: string;
    subdominio: string;
    dominioBase: string;
    whatsapp: string;
    tema: StoreTheme;
    descripcion: string;
  }) => void;
}

export function CreateCatalogModal({
  isOpen,
  defaultDomainBase = DEFAULT_DOMAIN_BASE,
  onClose,
  onCreate,
}: CreateCatalogModalProps) {
  const [nombre, setNombre] = useState('');
  const [subdominio, setSubdominio] = useState('');
  const [dominioBase, setDominioBase] = useState(defaultDomainBase);
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState('573001234567');
  const [tema, setTema] = useState<StoreTheme>('light');
  const [descripcion, setDescripcion] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDominioBase(defaultDomainBase || DEFAULT_DOMAIN_BASE);
      setErrorMsg(null);
    }
  }, [isOpen, defaultDomainBase]);

  if (!isOpen) return null;

  const handleNameChange = (value: string) => {
    setNombre(value);
    if (!subdomainTouched) {
      setSubdominio(value.trim() ? sanitizeSubdomain(value) : '');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (nombre.trim().length < 2) {
      setErrorMsg('Ingresa el nombre comercial del nuevo catálogo.');
      return;
    }

    const domainCheck = validateDomainConfig(
      subdominio || sanitizeSubdomain(nombre),
      dominioBase
    );
    if (!domainCheck.valid) {
      setErrorMsg(domainCheck.subdomainError || domainCheck.domainError);
      return;
    }

    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 7) {
      setErrorMsg('Ingresa un número de WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    onCreate({
      nombre: nombre.trim(),
      subdominio: domainCheck.subdominio,
      dominioBase: domainCheck.dominioBase,
      whatsapp: digits,
      tema,
      descripcion: descripcion.trim(),
    });

    setNombre('');
    setSubdominio('');
    setDominioBase(defaultDomainBase || DEFAULT_DOMAIN_BASE);
    setSubdomainTouched(false);
    setDescripcion('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-catalog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-cyan-600 shrink-0" aria-hidden="true" />
            <h2
              id="create-catalog-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              Crear Nuevo Catálogo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de creación"
            className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div>
            <label
              htmlFor="new-cat-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nombre de tu marca o colección
            </label>
            <input
              id="new-cat-name"
              type="text"
              value={nombre}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Ónix Joyería"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-cyan-600"
            />
          </div>

          <div>
            <label
              htmlFor="new-cat-subdomain"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Subdominio y dominio propio
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden focus-within:border-cyan-600">
              <input
                id="new-cat-subdomain"
                type="text"
                value={subdominio}
                onChange={(e) => {
                  setSubdomainTouched(true);
                  setSubdominio(sanitizeSubdomain(e.target.value));
                }}
                placeholder="onix-joyeria"
                className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-sm font-mono focus:outline-none"
              />
              <span className="px-1.5 py-2 bg-slate-100 border-x border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                .
              </span>
              <input
                id="new-cat-domain-base"
                type="text"
                value={dominioBase}
                onChange={(e) => setDominioBase(sanitizeDomainBase(e.target.value))}
                aria-label="Dominio propio"
                placeholder="leps.link"
                className="w-32 min-h-[44px] px-2.5 py-2 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>Dominio:</span>
                {['leps.link', 'lepsdigital.com'].map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    onClick={() => setDominioBase(dom)}
                    className={`font-mono px-1.5 py-0.5 rounded border transition-colors ${
                      sanitizeDomainBase(dominioBase) === dom
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-800 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    .{dom}
                  </button>
                ))}
              </div>
              <span className="font-mono text-cyan-700">
                {sanitizeSubdomain(subdominio || nombre || 'onix-joyeria')}.
                {sanitizeDomainBase(dominioBase)}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-cat-wa"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                WhatsApp de pedidos
              </label>
              <input
                id="new-cat-wa"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="573001234567"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums focus:outline-none focus:border-cyan-600"
              />
            </div>

            <div>
              <label
                htmlFor="new-cat-theme"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Plantilla visual inicial
              </label>
              <select
                id="new-cat-theme"
                value={tema}
                onChange={(e) => setTema(e.target.value as StoreTheme)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="light">Minimalista Claro</option>
                <option value="dark">Minimalista Oscuro</option>
                <option value="galaxy">Galaxia</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-cat-bio"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Descripción de tu marca (opcional)
            </label>
            <textarea
              id="new-cat-bio"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Envíos a todo el país · Atención inmediata por WhatsApp"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:border-cyan-600"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {errorMsg}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              Crear catálogo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
