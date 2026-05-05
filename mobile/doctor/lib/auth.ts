import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
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
  unlockBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  async hydrate() {
    const access = await tokens.getAccess();
    set({ hydrated: true, user: access ? ({} as MobileUser) : null });
  },
  async login(username, password) {
    const res = await authAPI.login(username, password);
    const { token, refreshToken, user } = res.data;
    await tokens.set(token, refreshToken);
    set({ user });
  },
  async unlockBiometric() {
    // Biometric unlock just verifies the device's owner; we still need a
    // valid stored token in SecureStore to call the backend. If both are
    // present we promote to "logged in" without prompting for password.
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock to continue',
      fallbackLabel: 'Use password',
    });
    if (!result.success) return false;
    const access = await tokens.getAccess();
    if (!access) return false;
    set({ user: {} as MobileUser });
    return true;
  },
  async logout() {
    await authAPI.logout();
    await tokens.clear();
    set({ user: null });
  },
}));
