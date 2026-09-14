import { useAuth as useAuthContext } from '../../context/AuthContext'

export type UseAuthReturn = ReturnType<typeof useAuthContext>

export function useAuth(): UseAuthReturn {
  return useAuthContext()
}
