import type { CartItem } from '../types/cart'

export interface TransferOperation {
  id: string
  userId: string
  item: CartItem
  status: 'pending' | 'rejected'
}
interface GuestState {
  guest: CartItem[]
  operations: TransferOperation[]
  migrated: boolean
}
const LEGACY_KEY = 'muvira_guest_cart_v1'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('muvira-cart', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new Error('Unable to save your cart. Enable device storage and retry.'))
    request.onblocked = () =>
      reject(new Error('Cart storage is blocked. Close other tabs and retry.'))
  })
}

// A single read/write transaction serializes claims across tabs and persists empty carts.
async function change<T>(mutate: (state: GuestState) => T): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('state', 'readwrite')
    const store = transaction.objectStore('state')
    const request = store.get('cart')
    let result: T
    let migrated = false
    request.onsuccess = () => {
      try {
        const state = (request.result as GuestState | undefined) ?? {
          guest: [],
          operations: [],
          migrated: false,
        }
        if (!state.migrated) {
          const legacy = localStorage.getItem(LEGACY_KEY)
          const parsed: unknown = legacy ? JSON.parse(legacy) : []
          if (!Array.isArray(parsed)) throw new Error('Saved cart is invalid.')
          state.guest = parsed as CartItem[]
          state.migrated = true
          migrated = true
        }
        result = mutate(state)
        store.put(state, 'cart')
      } catch (reason) {
        transaction.abort()
        reject(reason)
      }
    }
    transaction.oncomplete = () => {
      database.close()
      if (migrated) {
        try {
          localStorage.removeItem(LEGACY_KEY)
        } catch {
          /* IndexedDB is authoritative. */
        }
      }
      resolve(result)
    }
    transaction.onabort = transaction.onerror = () => {
      database.close()
      reject(new Error('Unable to save your cart. Enable device storage and retry.'))
    }
  })
}

export const guestCartStore = {
  assertClearable: (userId: string) =>
    change((state) => {
      if (
        state.operations.some(
          (operation) => operation.userId === userId && operation.status === 'pending'
        )
      )
        throw new Error('Confirm pending transfers before clearing your cart.')
    }),
  clearRejected: (userId: string) =>
    change((state) => {
      if (
        state.operations.some(
          (operation) => operation.userId === userId && operation.status === 'pending'
        )
      )
        throw new Error('Confirm pending transfers before clearing your cart.')
      state.operations = state.operations.filter((operation) => operation.userId !== userId)
    }),
  read: () => change((state) => state),
  edit: (mutate: (items: CartItem[]) => CartItem[]) =>
    change((state) => {
      state.guest = mutate(state.guest)
      return state.guest
    }),
  claim: (userId: string) =>
    change((state) => {
      for (const item of state.guest)
        state.operations.push({ id: crypto.randomUUID(), userId, item, status: 'pending' })
      state.guest = []
      return state.operations.filter((operation) => operation.userId === userId)
    }),
  acknowledge: (id: string) =>
    change((state) => {
      state.operations = state.operations.filter((operation) => operation.id !== id)
    }),
  reject: (id: string) =>
    change((state) => {
      const operation = state.operations.find((candidate) => candidate.id === id)
      if (operation) operation.status = 'rejected'
    }),
  correct: (userId: string, operationId: string, quantity: number) =>
    change((state) => {
      const operation = state.operations.find(
        (candidate) => candidate.userId === userId && candidate.id === operationId
      )
      if (!operation) return
      if (operation.status === 'pending')
        throw new Error(
          'This transfer is awaiting confirmation. Retry synchronization before editing it.'
        )
      state.operations = state.operations.filter((candidate) => candidate.id !== operation.id)
      if (quantity > 0)
        state.operations.push({
          ...operation,
          id: crypto.randomUUID(),
          status: 'pending',
          item: { ...operation.item, quantity, lineTotal: quantity * operation.item.unitPrice },
        })
    }),
}
