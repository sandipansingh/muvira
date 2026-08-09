import { useCart as useCartContext } from '../../context/CartContext'

export type UseCartReturn = ReturnType<typeof useCartContext>

export function useCart(..._legacyArguments: unknown[]): UseCartReturn {
  return useCartContext()
}
