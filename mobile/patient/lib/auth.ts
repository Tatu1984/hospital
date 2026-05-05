// Auth store using zustand. Tracks the logged-in user + a hydration flag so
// the root layout can show a splash until SecureStore has been read.
import { create } from 'zustand';
import { authAPI, tokens } from './api';

export interface MobileUser {
  id: string;
  username: string;
  name: string;
  email: string;
  roleIds: string[];
  permissions: string[];
  tenantId: string;
  branchId: string;
  patientId: string | null;
  isDoctor: boolean;
  isPatient: boolean;
}

interface AuthState {
  user: MobileUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  async hydrate() {
    // On cold start we only know there's a token if SecureStore has one;
    // we don't have the User row cached. The home screen will refetch
    // /patients/me which validates the token by side effect. If the
    // token is bad, the 401 interceptor pushes the user back to /login.
    const access = await tokens.getAccess();
    set({ hydrated: true, user: access ? ({} as MobileUser) : null });
  },
  async login(username, password) {
    const res = await authAPI.login(username, password);
    const { token, refreshToken, user } = res.data;
    await tokens.set(token, refreshToken);
    set({ user, hydrated: true });
  },
  async logout() {
    await authAPI.logout();
    await tokens.clear();
    set({ user: null });
  },
}));
