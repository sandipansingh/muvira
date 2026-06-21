import { api } from './client';
import { mapAddress } from './adapters';
import type { Address } from '../../types/cart';
import type { ApiResponse } from '../../types/common';

export const addressesApiService = {
  async getAddresses(): Promise<ApiResponse<Address[]>> {
    const res = await api.get<{
      success: boolean;
      data?: Record<string, unknown>[];
      error?: { code: string; message: string };
    }>('/api/addresses', true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch addresses' } };
    }

    return { success: true, data: res.data.map(mapAddress) };
  },

  async createAddress(addressData: Omit<Address, 'id'>): Promise<ApiResponse<Address>> {
    const body = {
      full_name: addressData.fullName,
      phone: addressData.phone,
      address_line1: addressData.line1,
      address_line2: addressData.line2 ?? undefined,
      city: addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      country: addressData.country,
      is_default: addressData.isDefault,
    };

    const res = await api.post<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>('/api/addresses', body, true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to create address' } };
    }

    return { success: true, data: mapAddress(res.data) };
  },

  async updateAddress(id: string, addressData: Partial<Omit<Address, 'id'>>): Promise<ApiResponse<Address>> {
    const body: Record<string, unknown> = {};
    if (addressData.fullName !== undefined) body['full_name'] = addressData.fullName;
    if (addressData.phone !== undefined) body['phone'] = addressData.phone;
    if (addressData.line1 !== undefined) body['address_line1'] = addressData.line1;
    if (addressData.line2 !== undefined) body['address_line2'] = addressData.line2;
    if (addressData.city !== undefined) body['city'] = addressData.city;
    if (addressData.state !== undefined) body['state'] = addressData.state;
    if (addressData.pincode !== undefined) body['pincode'] = addressData.pincode;
    if (addressData.country !== undefined) body['country'] = addressData.country;
    if (addressData.isDefault !== undefined) body['is_default'] = addressData.isDefault;

    const res = await api.patch<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>(`/api/addresses/${encodeURIComponent(id)}`, body, true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to update address' } };
    }

    return { success: true, data: mapAddress(res.data) };
  },

  async deleteAddress(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await api.delete<{
      success: boolean;
      error?: { code: string; message: string };
    }>(`/api/addresses/${encodeURIComponent(id)}`, true);

    if (!res.success) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to delete address' } };
    }

    return { success: true, data: { deleted: true } };
  },

  async setDefaultAddress(id: string): Promise<ApiResponse<Address>> {
    const res = await api.post<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>(`/api/addresses/${encodeURIComponent(id)}/default`, {}, true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to set default' } };
    }

    return { success: true, data: mapAddress(res.data) };
  },
};
