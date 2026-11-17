import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  Palette,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  DEFAULT_DEMO_USER,
  PLATFORM_ADMIN_EMAIL,
  validateAuthCredentials,
  type UserAccount,
} from '../utils/catalogLogic';

interface AuthLoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onGoogleLoginSuccess?: (payload: {
    uid: string;
    email: string;
    name: string;
    emailVerified: boolean;
    idToken: string;
  }) => Promise<void> | void;
  onRegisterSuccess: (newUser: UserAccount) => void;
  onBackToLanding: () => void;
}

const CONTROL_CENTER_FEATURES = [
  {
    icon: Palette,
    title: 'Catálogos personalizables',
    detail: 'Logotipo propio, biografía comercial y distintivo PRO configurable.',
  },
  {
    icon: Layers,
    title: 'Diseños profesionales',
    detail: 'Plantillas Minimalista Claro, Minimalista Oscuro y Galaxia.',
  },
  {
    icon: ShieldCheck,
    title: 'Gestión de productos y Drag & Drop',
    detail: 'Reordena tu inventario arrastrando e importa hasta 50 productos en 20s con IA.',
  },
  {
    icon: Globe,
    title: 'URLs personalizadas',
    detail: 'Obtén tu enlace corto listo para compartir tipo catalogos.aurentime.shop/tutienda al instante.',
  },
  {
    icon: BarChart3,
    title: 'Panel de control avanzado',
    detail: 'Administra múltiples catálogos desde una sola cuenta.',
  },
  {
    icon: MessageCircle,
    title: 'Integración WhatsApp',
    detail: 'Checkout conversacional sin fricción ni pasarelas con comisión.',
  },
  {
    icon: RefreshCw,
    title: 'Actualizaciones en tiempo real',
    detail: 'Cada cambio en precios de anclaje o stock se refleja inmediatamente.',
  },
];

export function AuthLoginView({
  users,
  onLoginSuccess,
  onGoogleLoginSuccess,
  onRegisterSuccess,
  onBackToLanding,
}: AuthLoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      if (onGoogleLoginSuccess) {
        await onGoogleLoginSuccess({
          uid: credential.user.uid,
          email: credential.user.email || '',
          name:
            credential.user.displayName ||
            credential.user.email?.split('@')[0] ||
            'Administrador',
          emailVerified: credential.user.emailVerified,
          idToken,
        });
      }
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : 'este dominio';
        setErrorMsg(
          `El dominio "${host}" debe autorizarse en Firebase Console → Authentication → Settings → Authorized domains para usar acceso con Google.`
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(
          'Tu navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes e intenta de nuevo.'
        );
      } else {
        setErrorMsg(
          'No se pudo completar el acceso con Google. Verifica las ventanas emergentes o intenta de nuevo.'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateAuthCredentials(email, password, mode, name);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === PLATFORM_ADMIN_EMAIL) {
      setErrorMsg(
        `La cuenta administrativa ${PLATFORM_ADMIN_EMAIL} inicia sesión exclusivamente mediante el botón "Continuar con Google".`
      );
      return;
    }

    if (mode === 'login') {
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!existing) {
        setErrorMsg(
          'No encontramos una cuenta con ese correo. Cambia a "Crear cuenta" o usa el acceso demo.'
        );
        return;
      }
      if (existing.password !== password) {
        setErrorMsg('Contraseña incorrecta. Verifica tus datos o ingresa con la cuenta demo.');
        return;
      }
      onLoginSuccess({
        ...existing,
        role: 'merchant',
        authProvider: 'local',
        emailVerified: false,
      });
      return;
    }

    const alreadyExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (alreadyExists) {
      setErrorMsg('Este correo ya está registrado. Inicia sesión con tu contraseña.');
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now().toString(36)}`,
      name: name.trim(),
      email: cleanEmail,
      password,
      createdAt: new Date().toISOString(),
      role: 'merchant',
      authProvider: 'local',
      emailVerified: false,
    };
    onRegisterSuccess(newUser);
  };

  const handleDemoQuickAccess = () => {
    setErrorMsg(null);
    const demoUser =
      users.find((u) => u.email.toLowerCase() === DEFAULT_DEMO_USER.email) ||
      DEFAULT_DEMO_USER;
    onLoginSuccess({
      ...demoUser,
      role: 'merchant',
      authProvider: 'local',
      emailVerified: false,
    });
  };

  return (
    <div
      className="min-h-screen bg-[#060B19] text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 pb-24"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(34, 211, 238, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.06) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
      }}
    >
      <div className="max-w-5xl w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver al inicio</span>
          </button>

          <span className="font-mono text-xs text-cyan-400">
            catalogos.aurentime.shop
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Panel: Portal de Acceso para Tiendas */}
          <section
            aria-labelledby="auth-portal-title"
            className="lg:col-span-6 rounded-2xl border border-cyan-500/25 bg-[#0A1124]/95 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-2xl"
          >
            <div>
              <div className="text-center mb-6">
                <img
                  src="/assets/aistudio/Solo_logo_de_Leps_Digital_IA_2026_-_Formato_Horizontal_8f1d260e.png"
                  alt="Leps Software Solutions"
                  referrerPolicy="no-referrer"
                  className="h-12 w-auto mx-auto object-contain mb-3"
                />
                <h1
                  id="auth-portal-title"
                  className="font-display text-2xl font-bold text-cyan-400 tracking-tight"
                >
                  Leps Commerce
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  Portal de Acceso para Tiendas
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors mb-2"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>
                  {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
                </span>
              </button>
              <p className="text-[11px] text-center text-cyan-300/80 mb-5">
                Acceso seguro para tiendas y cuenta administrativa con Google
              </p>

              <div className="relative flex items-center justify-center mb-5">
                <span className="border-t border-white/10 w-full" aria-hidden="true" />
                <span className="px-3 text-[11px] uppercase tracking-wider text-slate-400 bg-[#0A1124] shrink-0">
                  o acceso local rápido
                </span>
                <span className="border-t border-white/10 w-full" aria-hidden="true" />
              </div>

              {/* Login / Register Segmented Control */}
              <div
                role="tablist"
                aria-label="Modo de acceso"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#050814] border border-white/10 mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    mode === 'login'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    mode === 'register'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1.5"
                    >
                      <User className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Nombre o empresa</span>
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. María Fernanda · Tienda Ónix"
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#060B19] border border-cyan-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Correo Electrónico</span>
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#060B19] border border-cyan-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Contraseña</span>
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full min-h-[46px] pl-4 pr-11 py-2.5 rounded-xl bg-[#060B19] border border-cyan-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <p
                    role="alert"
                    className="rounded-lg bg-rose-500/15 border border-rose-400/30 px-3.5 py-2.5 text-xs text-rose-200 font-medium"
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors ease-snappy"
                >
                  <span>
                    {mode === 'login'
                      ? 'Acceso Autorizado'
                      : 'Crear Cuenta y Acceder'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
              <button
                type="button"
                onClick={handleDemoQuickAccess}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs sm:text-sm font-semibold transition-colors"
              >
                Probar Tienda Demo ({DEFAULT_DEMO_USER.email})
              </button>
              <p className="text-[11px] text-center text-slate-400 font-mono">
                Demo: {DEFAULT_DEMO_USER.email} · Clave: {DEFAULT_DEMO_USER.password}
              </p>
            </div>
          </section>

          {/* Right Panel: Centro de Control Leps Commerce */}
          <aside
            aria-labelledby="control-center-title"
            className="lg:col-span-6 rounded-2xl border border-white/10 bg-[#0A1124]/90 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h2
                id="control-center-title"
                className="font-display text-2xl font-bold text-cyan-400 text-center mb-5"
              >
                Centro de Control
              </h2>

              <div className="rounded-xl border border-cyan-500/25 bg-[#060B19]/90 p-5 mb-6">
                <h3 className="font-display text-base font-bold text-cyan-300 mb-1.5">
                  Catálogos Premium
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Crea y gestiona tus catálogos profesionales de productos y servicios.
                  Plataforma completa con diseño móvil, precios de anclaje y cierre directo en WhatsApp.
                </p>
              </div>

              <ul className="divide-y divide-white/10">
                {CONTROL_CENTER_FEATURES.map((feat, idx) => {
                  const Icon = feat.icon;
                  const isFocused = activeFeatureIdx === idx;
                  return (
                    <li key={feat.title}>
                      <button
                        type="button"
                        onClick={() => setActiveFeatureIdx(idx)}
                        className={`w-full text-left py-3 px-2 rounded-lg flex items-start gap-3 transition-colors ${
                          isFocused ? 'bg-white/5' : 'hover:bg-white/5'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isFocused ? 'text-cyan-400' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isFocused ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {feat.title}
                          </p>
                          {isFocused && (
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                              {feat.detail}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
              Leps Software Solutions · División Tecnológica de Leps Digital
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
