export interface DashboardMenu {
  key: string;
  label: string;
  href: string;
  enabled: boolean;
  maintenance: boolean;
}

export const DEFAULT_DASHBOARD_MENUS: DashboardMenu[] = [
  { key: 'home', label: 'Inicial', href: '/', enabled: true, maintenance: false },
  { key: 'audience', label: 'Contatos', href: '/audience', enabled: true, maintenance: false },
  { key: 'flows', label: 'Automação', href: '/flows', enabled: true, maintenance: false },
  { key: 'templates', label: 'Nexa AI', href: '/templates', enabled: true, maintenance: false },
  { key: 'inbox', label: 'Caixa de Entrada', href: '/inbox', enabled: true, maintenance: false },
  { key: 'scheduler', label: 'Agendamento', href: '/scheduler', enabled: true, maintenance: false },
  { key: 'settings', label: 'Configurações', href: '/settings', enabled: true, maintenance: false },
  { key: 'integrations', label: 'Integrações', href: '/integrations', enabled: true, maintenance: false },
  { key: 'broadcasts', label: 'Broadcasts', href: '/broadcasts', enabled: true, maintenance: false },
];

export const MENUS_CHANGED_EVENT = 'nexachat:menus-changed';

export function getMenuByKey(menus: DashboardMenu[], key: string): DashboardMenu | undefined {
  return menus.find((menu) => menu.key === key);
}

export function getMenuByHref(menus: DashboardMenu[], href: string): DashboardMenu | undefined {
  return menus.find((menu) => menu.href === href);
}

let cachedMenus: DashboardMenu[] | null = null;
let loadingPromise: Promise<DashboardMenu[]> | null = null;
const listeners = new Set<(menus: DashboardMenu[]) => void>();

export function subscribeDashboardMenus(listener: (menus: DashboardMenu[]) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function fetchDashboardMenus(): Promise<DashboardMenu[]> {
  if (loadingPromise) return loadingPromise;
  if (cachedMenus) return cachedMenus;

  loadingPromise = fetch('/api/admin/menus')
    .then((res) => res.json())
    .then((data): DashboardMenu[] => {
      const parsed = Array.isArray(data.menus) && data.menus.length > 0 ? data.menus : DEFAULT_DASHBOARD_MENUS;
      cachedMenus = parsed;
      return parsed;
    })
    .catch((): DashboardMenu[] => {
      return DEFAULT_DASHBOARD_MENUS;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function notifyMenusChanged(): void {
  cachedMenus = null;
  loadingPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MENUS_CHANGED_EVENT));
  }
}

export function matchesMenuHref(menu: DashboardMenu, pathname: string): boolean {
  if (menu.href === '/') return pathname === '/';
  return pathname.startsWith(menu.href);
}
