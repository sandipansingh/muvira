import { AccountShell } from '../components/auth/AccountShell'
import { OrderListPanel } from '../components/orders/OrderListPanel'
import { useAuth } from '../context/AuthContext'

export function OrdersHistoryPage() {
  const { user, loading } = useAuth()
  if (loading || !user) return <main className="editorial-page" />
  return (
    <AccountShell>
      <OrderListPanel key={user.id} userId={user.id} />
    </AccountShell>
  )
}
export default OrdersHistoryPage
