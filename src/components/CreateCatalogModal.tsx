import { useEffect, useState, type FormEvent } from 'react';
import { Store, UserPlus, X } from 'lucide-react';
import {
  DEFAULT_DOMAIN_BASE,
  PLATFORM_ADMIN_EMAIL,
  sanitizeSubdomain,
  validateDomainConfig,
  type StoreTheme,
} from '../utils/catalogLogic';

export interface CreateCatalogInput {
  nombre: string;
  subdominio: string;
  dominioBase: string;
  whatsapp: string;
  tema: StoreTheme;
  descripcion: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerUid?: string;
  localPassword?: string;
}

interface ExistingMerchantAccount {
  uid: string;
  email: string;
  name: string;
}

interface CreateCatalogModalProps {
  isOpen: boolean;
  defaultDomainBase?: string;
  isAdminMode?: boolean;
  existingAccounts?: ExistingMerchantAccount[];
  initialOwnerEmail?: string;
  initialOwnerName?: string;
  onClose: () => void;
  onCreate: (input: CreateCatalogInput) => void;
}

export function CreateCatalogModal({
  isOpen,
  defaultDomainBase = DEFAULT_DOMAIN_BASE,
  isAdminMode = false,
  existingAccounts = [],
  initialOwnerEmail = '',
  initialOwnerName = '',
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
  const [ownerMode, setOwnerMode] = useState<'admin' | 'client'>('admin');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDominioBase(defaultDomainBase || DEFAULT_DOMAIN_BASE);
      setErrorMsg(null);
      if (isAdminMode && initialOwnerEmail) {
        setOwnerMode(
          initialOwnerEmail.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL
            ? 'admin'
            : 'client'
        );
        setOwnerEmail(initialOwnerEmail);
        setOwnerName(initialOwnerName);
      } else {
        setOwnerMode(isAdminMode ? 'client' : 'admin');
        setOwnerEmail('');
        setOwnerName('');
      }
      setLocalPassword('');
    }
  }, [isOpen, defaultDomainBase, isAdminMode, initialOwnerEmail, initialOwnerName]);

  if (!isOpen) return null;

  const handleNameChange = (value: string) => {
    setNombre(value);
    if (!subdomainTouched) {
      setSubdominio(value.trim() ? sanitizeSubdomain(value) : '');
    }
  };

  const handleSelectExistingAccount = (uid: string) => {
    const found = existingAccounts.find((a) => a.uid === uid);
    if (!found) return;
    setOwnerMode(
      found.email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL ? 'admin' : 'client'
    );
    setOwnerEmail(found.email);
    setOwnerName(found.name);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isAdminMode && ownerMode === 'client') {
      const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanOwnerEmail)) {
        setErrorMsg('Ingresa un correo electrónico válido para la cuenta del comercio.');
        return;
      }
      if (localPassword.trim() && localPassword.trim().length < 6) {
        setErrorMsg('Si asignas contraseña local, debe tener al menos 6 caracteres.');
        return;
      }
    }

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

    const matchedAccount =
      isAdminMode && ownerMode === 'client'
        ? existingAccounts.find(
            (a) => a.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase()
          )
        : undefined;

    onCreate({
      nombre: nombre.trim(),
      subdominio: domainCheck.subdominio,
      dominioBase: domainCheck.dominioBase,
      whatsapp: digits,
      tema,
      descripcion: descripcion.trim(),
      ...(isAdminMode && ownerMode === 'client'
        ? {
            ownerEmail: ownerEmail.trim().toLowerCase(),
            ownerName: ownerName.trim() || nombre.trim(),
            ownerUid: matchedAccount?.uid,
            localPassword: localPassword.trim() || undefined,
          }
        : {}),
    });

    setNombre('');
    setSubdominio('');
    setDominioBase(defaultDomainBase || DEFAULT_DOMAIN_BASE);
    setSubdomainTouched(false);
    setDescripcion('');
    setOwnerEmail('');
    setOwnerName('');
    setLocalPassword('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-catalog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {isAdminMode ? (
              <UserPlus className="w-5 h-5 text-cyan-600 shrink-0" aria-hidden="true" />
            ) : (
              <Store className="w-5 h-5 text-cyan-600 shrink-0" aria-hidden="true" />
            )}
            <h2
              id="create-catalog-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {isAdminMode ? 'Crear Nueva Cuenta / Catálogo' : 'Crear Nuevo Catálogo'}
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
          {isAdminMode && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">
                  Propietario de la cuenta
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOwnerMode('client')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      ownerMode === 'client'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    Cuenta de Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerMode('admin')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      ownerMode === 'admin'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    Mi Cuenta Admin
                  </button>
                </div>
              </div>

              {ownerMode === 'client' && (
                <div className="space-y-3">
                  {existingAccounts.length > 0 && (
                    <div>
                      <label
                        htmlFor="existing-account-select"
                        className="block text-[11px] font-medium text-slate-600 mb-1"
                      >
                        O selecciona una cuenta existente
                      </label>
                      <select
                        id="existing-account-select"
                        value=""
                        onChange={(e) => handleSelectExistingAccount(e.target.value)}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                      >
                        <option value="">-- Nueva cuenta o seleccionar existente --</option>
                        {existingAccounts.map((acc) => (
                          <option key={acc.uid} value={acc.uid}>
                            {acc.name} ({acc.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="new-owner-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Correo del cliente (Google)
                      </label>
                      <input
                        id="new-owner-email"
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="cliente@gmail.com"
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-owner-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Nombre del titular / empresa
                      </label>
                      <input
                        id="new-owner-name"
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Ej. Laura Gómez"
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="new-owner-password"
                      className="block text-[11px] font-medium text-slate-600 mb-1"
                    >
                      Contraseña local opcional (si también entra sin Google, mín. 6 caracteres)
                    </label>
                    <input
                      id="new-owner-password"
                      type="text"
                      value={localPassword}
                      onChange={(e) => setLocalPassword(e.target.value)}
                      placeholder="Opcional · El cliente podrá entrar con Google usando su correo"
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="new-cat-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nombre de la tienda o colección
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
              Enlace corto de la tienda
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden focus-within:border-cyan-600">
              <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                catalogos.{DEFAULT_DOMAIN_BASE}/
              </span>
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
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 truncate">
              Enlace activo:{' '}
              <span className="font-mono text-cyan-700">
                https://catalogos.{DEFAULT_DOMAIN_BASE}/
                {sanitizeSubdomain(subdominio || nombre || 'onix-joyeria')}
              </span>
            </p>
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
              Descripción de marca (opcional)
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
              {isAdminMode && ownerMode === 'client'
                ? 'Crear cuenta y catálogo'
                : 'Crear catálogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
