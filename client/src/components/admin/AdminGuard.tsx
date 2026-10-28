import { AuthGuard } from '../auth/AuthGuard'

export const AdminGuard = () => <AuthGuard requireAdmin />
