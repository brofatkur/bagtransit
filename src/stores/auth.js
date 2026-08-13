/**
 * Authentication & Session State Store (FR-5, Section 3)
 * BagTransit (Your Bags Move. You Explore.)
 */

import { reactive, computed } from 'vue';
import { db } from '../services/db.js';

const SESSION_KEY = 'bagtransit_user_session';

// Quick Preset Accounts for testing & operations
export const PRESET_ACCOUNTS = [
  {
    id: 'customer_guest',
    email: 'tourist@example.com',
    full_name: 'Tourist / Guest Customer',
    role: 'customer',
    cabang_id: null,
    badge: 'Tourist (Customer)',
    description: 'Book & Track Luggage',
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    email: 'admin.kuta@bagtransit.id',
    full_name: 'Budi Santoso (Admin Cabang Kuta)',
    role: 'admin',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    badge: 'Admin Kuta Airport Hub',
    description: 'Manages Kuta & Ngurah Rai Airport deliveries only',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'admin.sanur@bagtransit.id',
    full_name: 'Made Aryana (Admin Cabang Sanur)',
    role: 'admin',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    badge: 'Admin Sanur Harbour Hub',
    description: 'Manages Sanur Port & Fastboat departures only',
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'asa@asagroup.id',
    full_name: 'Asa (Direktur PT Bonanza Tujuh Samudera / BTS)',
    role: 'super_admin',
    cabang_id: null,
    badge: 'Super Admin (Direktur)',
    description: 'All branches, analytics & live pricing zone editor',
  },
];

function getStoredUser() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return PRESET_ACCOUNTS[0]; // Default to Customer
}

export const authState = reactive({
  user: getStoredUser(),
});

export const useAuth = () => {
  const user = computed(() => authState.user);
  const isAuthenticated = computed(() => authState.user && authState.user.role !== 'customer');
  const isSuperAdmin = computed(() => authState.user?.role === 'super_admin');
  const isAdmin = computed(() => authState.user?.role === 'admin');
  const isCustomer = computed(() => authState.user?.role === 'customer');
  const currentCabangId = computed(() => authState.user?.cabang_id);
  const currentBranch = computed(() => {
    if (!authState.user?.cabang_id) return null;
    return db.getBranchById(authState.user.cabang_id);
  });

  const setUser = (userObj) => {
    authState.user = userObj;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
  };

  const loginWithPreset = (presetId) => {
    const account = PRESET_ACCOUNTS.find(a => a.id === presetId);
    if (account) {
      setUser(account);
      return account;
    }
    return null;
  };

  const loginWithEmail = (email) => {
    const account = PRESET_ACCOUNTS.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (account) {
      setUser(account);
      return account;
    }
    // Generic fallback
    const customUser = {
      id: 'usr_' + Date.now(),
      email: email.trim(),
      full_name: email.split('@')[0],
      role: 'customer',
      cabang_id: null,
    };
    setUser(customUser);
    return customUser;
  };

  const logout = () => {
    setUser(PRESET_ACCOUNTS[0]);
  };

  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isCustomer,
    currentCabangId,
    currentBranch,
    setUser,
    loginWithPreset,
    loginWithEmail,
    logout,
  };
};
