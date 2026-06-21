import { delay } from './delay';
import { MockDatabase } from './store';
import type { Profile } from '../types/auth';
import type { Address } from '../types/cart';
import type { ApiResponse } from '../types/common';

const generateToken = () => 'mock_token_' + Math.random().toString(36).substring(7);
const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const authMockService = {
  async login(email: string, password: string): Promise<ApiResponse<{ profile: Profile; token: string }>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const users = MockDatabase.getUsers();
    const user = users.find((u: any) => u.email === email && u.password === password);

    if (!user) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email or password.',
          fieldErrors: {
            email: ['Incorrect email address'],
            password: ['Incorrect password'],
          },
        },
      };
    }

    const token = generateToken();
    MockDatabase.setActiveUser(user.profile);
    localStorage.setItem('muvira_db_token', token);

    return {
      success: true,
      data: {
        profile: user.profile,
        token,
      },
    };
  },

  async signup(email: string, password: string, fullName: string, phone: string): Promise<ApiResponse<{ profile: Profile; token: string }>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const users = MockDatabase.getUsers();
    if (users.some((u: any) => u.email === email)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email already exists.',
          fieldErrors: {
            email: ['An account with this email already exists'],
          },
        },
      };
    }

    const newProfile: Profile = {
      id: 'usr-' + uuid(),
      fullName,
      phone,
      role: 'user',
      createdAt: new Date().toISOString(),
      email,
    };

    const updatedUsers = [...users, { email, password, profile: newProfile }];
    MockDatabase.setUsers(updatedUsers);

    const token = generateToken();
    MockDatabase.setActiveUser(newProfile);
    localStorage.setItem('muvira_db_token', token);

    return {
      success: true,
      data: {
        profile: newProfile,
        token,
      },
    };
  },

  async logout(): Promise<ApiResponse<{ loggedOut: boolean }>> {
    await delay(100);
    MockDatabase.setActiveUser(null);
    localStorage.removeItem('muvira_db_token');
    return {
      success: true,
      data: { loggedOut: true },
    };
  },

  async getProfile(): Promise<ApiResponse<Profile>> {
    await delay(150);
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }
    return {
      success: true,
      data: active,
    };
  },

  async updateProfile(fullName: string, phone: string): Promise<ApiResponse<Profile>> {
    await delay();
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }

    // Basic validation
    if (!/^\+?[0-9]{10,12}$/.test(phone.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number.',
          fieldErrors: {
            phone: ['Must be a valid 10-12 digit phone number (e.g. +919876543210)'],
          },
        },
      };
    }

    const updatedProfile = { ...active, fullName, phone };
    MockDatabase.setActiveUser(updatedProfile);

    // Update in users table as well
    const users = MockDatabase.getUsers();
    const updatedUsers = users.map((u: any) =>
      u.profile.id === active.id ? { ...u, profile: updatedProfile } : u
    );
    MockDatabase.setUsers(updatedUsers);

    return {
      success: true,
      data: updatedProfile,
    };
  },

  // Addresses mock APIs
  async getAddresses(): Promise<ApiResponse<Address[]>> {
    await delay(200);
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }
    return {
      success: true,
      data: MockDatabase.getAddresses(),
    };
  },

  async createAddress(addressData: Omit<Address, 'id'>): Promise<ApiResponse<Address>> {
    await delay();
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }

    const addresses = MockDatabase.getAddresses();
    const newAddress: Address = {
      ...addressData,
      id: 'addr-' + uuid(),
    };

    if (newAddress.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    } else if (addresses.length === 0) {
      newAddress.isDefault = true;
    }

    const updatedAddresses = [...addresses, newAddress];
    MockDatabase.setAddresses(updatedAddresses);

    return {
      success: true,
      data: newAddress,
    };
  },

  async updateAddress(id: string, addressData: Partial<Omit<Address, 'id'>>): Promise<ApiResponse<Address>> {
    await delay();
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }

    const addresses = MockDatabase.getAddresses();
    const idx = addresses.findIndex((a) => a.id === id);
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Address not found.' },
      };
    }

    const existing = addresses[idx];
    const updated: Address = { ...existing, ...addressData };

    if (updated.isDefault && !existing.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses[idx] = updated;
    MockDatabase.setAddresses([...addresses]);

    return {
      success: true,
      data: updated,
    };
  },

  async deleteAddress(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay();
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }

    const addresses = MockDatabase.getAddresses();
    const exists = addresses.some((a) => a.id === id);
    if (!exists) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Address not found.' },
      };
    }

    const filtered = addresses.filter((a) => a.id !== id);
    // If we deleted default, set first one as default
    if (addresses.find((a) => a.id === id)?.isDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }

    MockDatabase.setAddresses(filtered);
    return {
      success: true,
      data: { deleted: true },
    };
  },

  async setDefaultAddress(id: string): Promise<ApiResponse<Address>> {
    await delay();
    const active = MockDatabase.getActiveUser();
    if (!active) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Please log in.' },
      };
    }

    const addresses = MockDatabase.getAddresses();
    const address = addresses.find((a) => a.id === id);
    if (!address) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Address not found.' },
      };
    }

    addresses.forEach((a) => (a.isDefault = a.id === id));
    MockDatabase.setAddresses([...addresses]);

    return {
      success: true,
      data: { ...address, isDefault: true },
    };
  },
};
