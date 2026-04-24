import { create } from 'zustand';
import { listProjects, type ProjectSummary } from '../../lib/api.js';

interface ProjectsStore {
  projects: ProjectSummary[] | null;
  activeProjectId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActive: (id: string | null) => void;
}

const ACTIVE_KEY = 'atlas.activeProject';

export const useProjects = create<ProjectsStore>((set, get) => ({
  projects: null,
  activeProjectId: typeof localStorage === 'undefined' ? null : localStorage.getItem(ACTIVE_KEY),
  loading: false,
  error: null,

  async refresh() {
    set({ loading: true, error: null });
    try {
      const { items } = await listProjects();
      // If no active project is set, default to the first one.
      const current = get().activeProjectId;
      const active =
        current && items.some((p) => p.id === current) ? current : (items[0]?.id ?? null);
      set({ projects: items, activeProjectId: active, loading: false });
      if (active) localStorage.setItem(ACTIVE_KEY, active);
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setActive(id) {
    set({ activeProjectId: id });
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  },
}));
