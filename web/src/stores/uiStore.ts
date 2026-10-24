import { create } from 'zustand';

export type ScreenId = 
  | 'tower'
  | 'dispatch'
  | 'receipts'
  | 'inventory'
  | 'quality'
  | 'reconciliation'
  | 'approvals'
  | 'audit'
  | 'insights'
  | 'verify';

export type Role = 
  | 'SUPERVISOR'
  | 'STORE_EMPLOYEE'
  | 'QUALITY_OFFICER'
  | 'APPROVER'
  | 'AUDITOR'
  | 'ADMIN';

export type ThemeMode = 'dark' | 'light';
export type Language = 'en' | 'hi';
export type Density = 'comfortable' | 'compact';
export type UnitPreference = 'kg' | 'quintal';

interface UIState {
  activeScreen: ScreenId;
  theme: ThemeMode;
  language: Language;
  density: Density;
  unitPreference: UnitPreference;
  selectedGodownId: string;
  activeRole: Role;
  isCommandPaletteOpen: boolean;
  isDemoDrawerOpen: boolean;
  isSidebarCollapsed: boolean;
  isOffline: boolean;
  
  // Actions
  setActiveScreen: (screen: ScreenId) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleDensity: () => void;
  toggleUnitPreference: () => void;
  setSelectedGodownId: (id: string) => void;
  setActiveRole: (role: Role) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDemoDrawerOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleOffline: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeScreen: 'tower',
  theme: 'dark', // Dark mode by default for Control Tower cockpit
  language: 'en',
  density: 'comfortable',
  unitPreference: 'kg',
  selectedGodownId: '11111111-1111-1111-1111-111111111111',
  activeRole: 'SUPERVISOR',
  isCommandPaletteOpen: false,
  isDemoDrawerOpen: false,
  isSidebarCollapsed: false,
  isOffline: false,

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: nextTheme };
  }),
  setLanguage: (lang) => set({ language: lang }),
  toggleDensity: () => set((state) => ({ density: state.density === 'comfortable' ? 'compact' : 'comfortable' })),
  toggleUnitPreference: () => set((state) => ({ unitPreference: state.unitPreference === 'kg' ? 'quintal' : 'kg' })),
  setSelectedGodownId: (id) => set({ selectedGodownId: id }),
  setActiveRole: (role) => set({ activeRole: role }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setDemoDrawerOpen: (open) => set({ isDemoDrawerOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleOffline: () => set((state) => ({ isOffline: !state.isOffline }))
}));

