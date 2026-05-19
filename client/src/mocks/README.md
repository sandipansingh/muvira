# Muvira Mock API Layer

This directory (`src/mocks/`) contains the complete simulated data and services layer for the **Muvira** frontend.

To ensure that backend integration is clean and simple, all components interact **only** with these exported services. They do not write inline mock data.

## Directory Structure

- `store.ts`: In-memory and `localStorage` state acting as our mock database (contains seed categories, products, orders, coupons, etc.).
- `delay.ts`: Network delay utility to simulate real HTTP latency.
- `*.mock.ts`: Resource-specific service endpoints that mirror the API designs from `api-contracts.md`.

---

## Swapping with a Real Backend API

Once the real backend API is ready (located at `https://api.muvira.com` or configured via `VITE_API_BASE_URL`), you can replace the mocks with real network requests in one of two ways:

### Option A: Edit the existing service files (Recommended)
Modify the functions in `src/mocks/*.mock.ts` to execute `fetch` or `axios` queries instead of reading from `MockDatabase`. 

For example, to swap the product list retrieval:

```diff
// src/mocks/products.mock.ts
export const productsMockService = {
  async getProducts(params: ProductQueryParams = {}): Promise<ApiPaginatedResponse<ProductListItem>> {
-   await delay();
-   // ... (existing mock filter/sorting logic)
-   return {
-     success: true,
-     data: paginatedItems,
-     pagination: { page, limit, total, totalPages }
-   };
+   const query = new URLSearchParams(params as any).toString();
+   const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/products?${query}`, {
+     headers: {
+       'Content-Type': 'application/json',
+     }
+   });
+   return response.json();
  }
}
```

Since the input parameters and return types defined in `src/types/` are already identical to the shapes in `api-contracts.md`, components will continue working without any edits.

### Option B: Rewrite and redirect paths
1. Write real service implementations under a new directory, e.g., `src/services/`.
2. Update the import paths in your components from `@/mocks/...` to `@/services/...`.
