import { LayoutDashboard, LogIn, Sparkles, Store } from 'lucide-react';
import type { ViewMode } from '../utils/catalogLogic';

interface ViewSwitcherProps {
  activeView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

export function ViewSwitcher({ activeView, onChangeView }: ViewSwitcherProps) {
  const items: Array<{
    id: ViewMode;
    label: string;
    shortLabel: string;
    hideOnCatalogMobile?: boolean;
    icon: typeof Sparkles;
  }> = [
    { id: 'landing', label: 'Landing SaaS', shortLabel: 'SaaS', icon: Sparkles },
    {
      id: 'login',
      label: 'Portal Acceso',
      shortLabel: 'Acceso',
      hideOnCatalogMobile: true,
      icon: LogIn,
    },
    { id: 'dashboard', label: 'Dashboard Admin', shortLabel: 'Admin', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catálogo en Vivo', shortLabel: 'Tienda', icon: Store },
  ];

  return (
    <nav
      aria-label="Selector rápido de vista"
      className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-40 flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 shadow-xl"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        const visibilityClass =
          item.hideOnCatalogMobile && activeView === 'catalog'
            ? 'hidden sm:flex'
            : 'flex';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeView(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`${visibilityClass} min-h-[36px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 transition-colors ease-snappy focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              isActive
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
