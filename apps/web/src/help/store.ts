import { create } from 'zustand';

interface HelpStore {
  isOpen: boolean;
  sectionId: string;
  open: (sectionId?: string) => void;
  close: () => void;
  toggle: () => void;
  setSection: (sectionId: string) => void;
}

export const useHelp = create<HelpStore>((set) => ({
  isOpen: false,
  sectionId: 'welcome',
  open: (sectionId) => set((s) => ({ isOpen: true, sectionId: sectionId ?? s.sectionId })),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setSection: (sectionId) => set({ sectionId }),
}));
