export interface RefundIntent {
  refund_intent_id: string
  amount_paisa: number
  reason: string
}

async function transact(
  userId: string,
  orderId: string,
  change: (current: RefundIntent | null) => RefundIntent | null
): Promise<RefundIntent | null> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('muvira-admin-refunds', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('intents')
    request.onsuccess = () => resolve(request.result)
    request.onerror = request.onblocked = () =>
      reject(new Error('Refund intent could not be saved. Enable device storage and retry.'))
  })
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('intents', 'readwrite')
    const store = transaction.objectStore('intents')
    const key = `${userId}:${orderId}`
    const request = store.get(key)
    let result: RefundIntent | null = null
    request.onsuccess = () => {
      result = change((request.result as RefundIntent | undefined) ?? null)
      if (result) store.put(result, key)
      else store.delete(key)
    }
    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }
    transaction.onerror = transaction.onabort = () => {
      database.close()
      reject(new Error('Refund intent storage is unavailable. Retry before submitting.'))
    }
  })
}

export const refundIntentStore = {
  load: (userId: string, orderId: string) => transact(userId, orderId, (current) => current),
  claim: (userId: string, orderId: string, input: Omit<RefundIntent, 'refund_intent_id'>) =>
    transact(
      userId,
      orderId,
      (current) => current ?? { ...input, refund_intent_id: crypto.randomUUID() }
    ),
  acknowledge: (userId: string, orderId: string, intentId: string) =>
    transact(userId, orderId, (current) =>
      current?.refund_intent_id === intentId ? null : current
    ),
}
