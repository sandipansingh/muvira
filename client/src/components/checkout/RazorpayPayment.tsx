import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LockKeyhole, ShieldCheck, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { CardPaymentFields } from './CardPaymentFields'
import { PaymentArtwork, UpiAppArtwork } from './PaymentArtwork'
import { Dropdown } from '../ui/Dropdown'
import { checkoutService } from '../../lib/services/checkout.service'
import { orderApiService } from '../../lib/services/order.service'
import { useRazorpayMethods } from '../../lib/hooks/useRazorpayMethods'
import { availablePaymentMethods, paymentErrorMetadata } from '../../lib/utils/razorpay'
import { validateCardDetails, type CardDetails } from '../../lib/validators/payment.validator'
import { formatPrice } from '../../lib/utils/format'
import { ApiError } from '../../lib/api/client'
import type { CheckoutPaymentSession } from '../../types/checkout'
import type {
  PaymentMethod,
  RazorpayFailureResponse,
  RazorpayPaymentData,
  RazorpayQrResponse,
  RazorpaySuccessResponse,
} from '../../types/razorpay'

interface RazorpayPaymentProps {
  session: CheckoutPaymentSession | null
  onSession: (session: CheckoutPaymentSession) => void
  onPrepare: () => Promise<void>
  canReview: boolean
  setupError?: string | null
  onRestart: () => void
  previewTotalPaisa?: number
}

const METHODS = {
  upi: { title: 'UPI' },
  card: {
    title: 'Credit or debit card',
  },
  netbanking: { title: 'Netbanking' },
  wallet: { title: 'Wallet' },
}

export function RazorpayPayment({
  session,
  onSession,
  onPrepare,
  canReview,
  setupError,
  onRestart,
  previewTotalPaisa,
}: RazorpayPaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [bank, setBank] = useState('')
  const [wallet, setWallet] = useState('')
  const [app, setApp] = useState('')
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'waiting' | 'checking'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDetails, string>>>({})
  const [qr, setQr] = useState<RazorpayQrResponse | null>(null)
  const [qrFallback, setQrFallback] = useState(false)
  const [now, setNow] = useState(Date.now())
  const cardContainer = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const submitting = useRef(false)
  const verifiedIds = useRef(new Set<string>())
  const awaitingSdk = useRef(false)
  const successSeen = useRef(false)
  const statusGeneration = useRef(0)
  const currentSession = useRef(session)
  currentSession.current = session
  const pendingSince = useRef(Date.now())
  const checkAfter = useRef(0)
  const checking = useRef(false)
  const sdkError = useRef<string | null>(null)
  const serverOffset = session ? new Date(session.serverTime).getTime() - Date.now() : 0
  const offsetRef = useRef(serverOffset)
  useEffect(() => {
    offsetRef.current = serverOffset
  }, [session?.serverTime]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearCard = () =>
    cardContainer.current?.querySelectorAll('input').forEach((input) => {
      input.value = ''
    })
  const readCard = (): CardDetails =>
    Object.fromEntries(
      ['name', 'number', 'expiry', 'securityCode'].map((key) => [
        key,
        cardContainer.current?.querySelector<HTMLInputElement>(`[name="${key}"]`)?.value ?? '',
      ])
    ) as unknown as CardDetails

  const checkStatus = async () => {
    const current = currentSession.current
    if (!current || submitting.current || checking.current || Date.now() < checkAfter.current)
      return
    checking.current = true
    const generation = statusGeneration.current
    setPhase('checking')
    try {
      const updated = await checkoutService.reconcile(current.orderId)
      if (
        mounted.current &&
        currentSession.current?.orderId === updated.orderId &&
        generation === statusGeneration.current
      ) {
        if (updated.state === 'paid' || updated.state === 'released') awaitingSdk.current = false
        onSession(
          updated.canPay && (awaitingSdk.current || successSeen.current)
            ? { ...updated, canPay: false, state: 'pending' }
            : updated
        )
        setError(sdkError.current)
        if (!awaitingSdk.current && !successSeen.current && (!qr || qr.expires_on <= Date.now()))
          setPhase('idle')
        else setPhase('waiting')
      }
    } catch (reason) {
      if (generation !== statusGeneration.current) return
      checkAfter.current =
        Date.now() + (reason instanceof ApiError ? (reason.retryAfterMs ?? 15000) : 15000)
      if (mounted.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Payment is still being confirmed. Check its status before retrying.'
        )
        setPhase('idle')
      }
    } finally {
      checking.current = false
    }
  }

  const onSuccess = async (response: RazorpaySuccessResponse) => {
    const current = currentSession.current
    if (
      !current ||
      response.razorpay_order_id !== current.razorpayOrderId ||
      verifiedIds.current.has(response.razorpay_payment_id)
    )
      return
    verifiedIds.current.add(response.razorpay_payment_id)
    successSeen.current = true
    statusGeneration.current += 1
    awaitingSdk.current = true
    clearCard()
    setPhase('checking')
    try {
      await checkoutService.verify(response)
    } catch {
      if (mounted.current)
        setError('Your payment is being confirmed. Please check its status before paying again.')
    }
    if (mounted.current) await checkStatus()
  }

  const onError = (response: RazorpayFailureResponse) => {
    const failure = response.error
    if (
      failure?.metadata?.order_id &&
      failure.metadata.order_id !== currentSession.current?.razorpayOrderId
    )
      return
    if (successSeen.current) return
    statusGeneration.current += 1
    awaitingSdk.current = false
    clearCard()
    if (
      failure?.reason?.toLowerCase().includes('feature') ||
      failure?.description?.toLowerCase().includes('non-redirection flow not supported')
    )
      setQrFallback(true)
    setQr(null)
    submitting.current = false
    setPhase('idle')
    sdkError.current =
      failure?.description ?? 'Payment was not completed. Check its status to try again safely.'
    setError(sdkError.current)
    console.warn('Razorpay payment attempt', paymentErrorMetadata(failure))
    void checkStatus()
  }

  const onQr = (response: RazorpayQrResponse) => {
    if (successSeen.current) return
    if (!currentSession.current || response.status === 'expired') {
      awaitingSdk.current = false
      setQr(null)
      setPhase('idle')
      void checkStatus()
      return
    }
    if (!response.qr_url?.startsWith('upi://pay?') || !Number.isFinite(response.expires_on)) {
      setError('The QR code could not be loaded. Check payment status before retrying.')
      return
    }
    setQr({
      ...response,
      expires_on: response.expires_on < 1e12 ? response.expires_on * 1000 : response.expires_on,
    })
    setPhase('waiting')
  }

  const sdk = useRazorpayMethods({
    success: (response) => {
      void onSuccess(response)
    },
    error: onError,
    qr: onQr,
  })
  const available = sdk.methods ? availablePaymentMethods(sdk.methods) : []
  const methodsKey = available.join(',')
  useEffect(() => {
    if (!available.includes(method) && available[0]) setMethod(available[0])
  }, [methodsKey, method]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!app && sdk.apps[0]) setApp(sdk.apps[0].code)
  }, [app, sdk.apps])
  useEffect(() => {
    mounted.current = true
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      mounted.current = false
      clearInterval(timer)
      clearCard()
    }
  }, [])

  const expiry = session?.expiresAt ? new Date(session.expiresAt).getTime() : 0
  const expired = !!session && expiry <= now + offsetRef.current
  const qrActive = !!qr && qr.expires_on > now
  const isBusy = phase !== 'idle'
  const shouldCheck =
    !!session &&
    !['paid', 'released'].includes(session.state) &&
    (qrActive || phase === 'waiting' || session.state === 'pending' || expired)
  useEffect(() => {
    if (!shouldCheck) return
    pendingSince.current = Date.now()
    let active = true
    let next = 0
    const tick = () => {
      if (!active || document.visibilityState !== 'visible' || Date.now() < next) return
      if (!qrActive && Date.now() - pendingSince.current > 120000) return
      next = Date.now() + 5000
      void checkStatus()
    }
    const timer = setInterval(tick, 5000)
    const visible = () => {
      if (document.visibilityState === 'visible') {
        next = 0
        tick()
      }
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [shouldCheck, session?.orderId, qrActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (qr && !qrActive) {
      awaitingSdk.current = false
      setQr(null)
      setPhase('idle')
      void checkStatus()
    }
  }, [qrActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateMethod = () => {
    if (method === 'card') {
      const errors = validateCardDetails(readCard())
      setCardErrors(errors)
      const first = Object.keys(errors)[0]
      if (first) {
        cardContainer.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
        return false
      }
    }
    if (
      (method === 'netbanking' && !sdk.methods?.netbanking?.[bank]) ||
      (method === 'wallet' && sdk.methods?.wallet?.[wallet] !== true) ||
      (method === 'upi' && sdk.isMobile && !sdk.apps.some((item) => item.code === app))
    ) {
      setError('Choose an option before continuing.')
      return false
    }
    return true
  }

  const review = async () => {
    if (submitting.current || !validateMethod()) return
    submitting.current = true
    statusGeneration.current += 1
    setPhase('preparing')
    setError(null)
    try {
      await onPrepare()
    } catch {
      clearCard()
    } finally {
      submitting.current = false
      if (mounted.current) setPhase('idle')
    }
  }

  const pay = () => {
    const current = currentSession.current
    if (
      successSeen.current ||
      submitting.current ||
      !current?.canPay ||
      !current.razorpayOrderId ||
      !sdk.instance.current ||
      expired ||
      !validateMethod()
    )
      return
    const data: RazorpayPaymentData = {
      amount: current.amountPaisa,
      currency: current.currency,
      order_id: current.razorpayOrderId,
      email: current.snapshot.contactEmail,
      contact: current.snapshot.shipping.phone,
      method,
    }
    if (method === 'card') {
      const card = readCard()
      const [month, year] = card.expiry.replace(/\s/g, '').split('/')
      Object.assign(data, {
        'card[name]': card.name.trim(),
        'card[number]': card.number.replace(/\s/g, ''),
        'card[expiry_month]': month,
        'card[expiry_year]': year,
        'card[cvv]': card.securityCode,
      })
    } else if (method === 'netbanking') data.bank = bank
    else if (method === 'wallet') data.wallet = wallet
    else if (qrFallback || (sdk.isMobile && !app)) data.upi = { qr: true, timeout: 10 }
    submitting.current = true
    sdkError.current = null
    setError(null)
    setPhase('waiting')
    pendingSince.current = Date.now()
    awaitingSdk.current = true
    onSession({ ...current, canPay: false, state: 'pending' })
    try {
      sdk.instance.current.createPayment(
        data,
        method === 'upi' && !data.upi
          ? sdk.isMobile
            ? { app }
            : { app: 'any', flow: 'qr' }
          : undefined
      )
    } catch {
      awaitingSdk.current = false
      setError('Secure payment could not start. Check its status before retrying.')
      setPhase('idle')
      void checkStatus()
    } finally {
      clearCard()
      submitting.current = false
    }
  }

  const changeMethod = (value: PaymentMethod) => {
    sdkError.current = null
    clearCard()
    setCardErrors({})
    setError(null)
    setMethod(value)
  }
  const canSubmit =
    !successSeen.current &&
    !isBusy &&
    !!sdk.methods &&
    available.length > 0 &&
    (session ? session.canPay && !expired : canReview)
  const amount = session ? formatPrice(session.amountPaisa) : ''

  const methodContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={method}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {method === 'card' && (
          <CardPaymentFields containerRef={cardContainer} errors={cardErrors} disabled={isBusy} />
        )}
        {method === 'upi' &&
          (sdk.isMobile ? (
            <div>
              <h3 className="font-sans text-base font-semibold">Choose a UPI app</h3>
              <div className="checkout-apps mt-3">
                {sdk.apps.map((item) => (
                  <label
                    key={item.code}
                    className={`checkout-app ${app === item.code ? 'checkout-app--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="upi-app"
                      checked={app === item.code}
                      onChange={() => setApp(item.code)}
                      disabled={isBusy}
                    />
                    <UpiAppArtwork code={item.code} />
                    <span>{item.name}</span>
                  </label>
                ))}
              </div>
              {!sdk.apps.length && (
                <p className="mt-3 text-sm text-muted">
                  UPI apps couldn’t be confirmed on this browser. Choose another payment method.
                </p>
              )}
              <p className="mt-4 text-sm text-muted">
                Approve the payment in your UPI app. Return here to confirm your order.
              </p>
            </div>
          ) : (
            <div className="checkout-qr-panel">
              {qrActive && qr?.qr_url ? (
                <>
                  <QRCodeSVG
                    value={qr.qr_url}
                    size={200}
                    marginSize={4}
                    fgColor="var(--color-ink)"
                    bgColor="var(--color-paper)"
                    role="img"
                    title="Scan to pay with any UPI app"
                    aria-label="Scan to pay with any UPI app"
                  />
                  <p className="mt-4 text-sm font-semibold">Scan with any UPI app</p>
                  <p className="mt-1 text-xs text-muted" role="status">
                    Waiting for payment ·{' '}
                    {Math.max(0, Math.ceil((qr.expires_on - now) / 1000 / 60))} min remaining
                  </p>
                </>
              ) : (
                <>
                  <QrCode className="h-6 w-6 text-primary" strokeWidth={1.25} aria-hidden="true" />
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted">
                    {session
                      ? 'Your QR code appears when you choose Show QR below.'
                      : 'Review your order, then generate a secure QR code to scan with any UPI app.'}
                  </p>
                </>
              )}
            </div>
          ))}
        {method === 'netbanking' && (
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              id="payment-bank-label"
              htmlFor="payment-bank"
            >
              Choose your bank
            </label>
            <Dropdown
              value={bank}
              onChange={setBank}
              id="payment-bank"
              menuClassName="w-full"
              aria-label="Choose your bank"
              disabled={isBusy}
              options={[
                { value: '', label: 'Select a bank' },
                ...Object.entries(sdk.methods?.netbanking ?? {}).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              className="w-full"
              triggerClassName="min-h-12 !text-base"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Your bank’s secure page will open so you can authorise the payment.
            </p>
          </div>
        )}
        {method === 'wallet' && (
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              id="payment-wallet-label"
              htmlFor="payment-wallet"
            >
              Choose your wallet
            </label>
            <Dropdown
              value={wallet}
              onChange={setWallet}
              id="payment-wallet"
              menuClassName="w-full"
              aria-label="Choose your wallet"
              disabled={isBusy}
              options={[
                { value: '', label: 'Select a wallet' },
                ...Object.entries(sdk.methods?.wallet ?? {})
                  .filter(([, enabled]) => enabled === true)
                  .map(([value]) => ({
                    value,
                    label: value === 'payzapp' ? 'PayZapp' : value,
                  })),
              ]}
              className="w-full"
              triggerClassName="min-h-12 !text-base"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              You’ll authorise the payment securely with your wallet provider.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
  return (
    <section className="checkout-payment" aria-labelledby="payment-heading">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (session) pay()
          else void review()
        }}
      >
        <div className="checkout-section-heading">
          <h2 id="payment-heading" className="journey-section-title">
            Select a payment method
          </h2>
          <p className="mt-2 text-sm text-muted">Your payment is processed securely by Razorpay.</p>
        </div>
        {sdk.error ? (
          <div className="checkout-notice" role="alert">
            <p>{sdk.error}</p>
            <Button variant="secondary" onClick={sdk.retry} className="mt-3">
              Retry payment methods
            </Button>
          </div>
        ) : !sdk.methods ? (
          <p className="px-6 py-10 text-sm text-muted" role="status">
            Loading secure payment methods…
          </p>
        ) : !available.length ? (
          <div className="checkout-notice" role="alert">
            No supported payment methods are available right now.
            <Button variant="secondary" onClick={sdk.retry} className="mt-3">
              Check again
            </Button>
          </div>
        ) : (
          <>
            <fieldset className="checkout-methods" disabled={isBusy || qrActive}>
              <legend className="sr-only">Payment method</legend>
              {available.map((value) => {
                return (
                  <div
                    key={value}
                    className={`checkout-method-panel${method === value ? ' is-selected' : ''}`}
                  >
                    <label
                      className={`checkout-method ${method === value ? 'checkout-method--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={value}
                        checked={method === value}
                        onChange={() => changeMethod(value)}
                      />
                      <span>
                        <span className="block text-sm font-semibold">{METHODS[value].title}</span>
                      </span>
                      <PaymentArtwork method={value} methods={sdk.methods} />
                    </label>
                    {method === value && (
                      <div
                        className="checkout-method-content"
                        role="group"
                        aria-label={`${METHODS[value].title} details`}
                      >
                        {methodContent}
                      </div>
                    )}
                  </div>
                )
              })}
            </fieldset>
          </>
        )}
        <div className="checkout-payment-footer">
          {(error || setupError) && (
            <p role="alert" className="mb-4 rounded-control bg-danger-soft p-3 text-sm text-danger">
              {error || setupError}
            </p>
          )}
          {session && session.state !== 'released' && (
            <div className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <span>
                {session.canPay && !expired
                  ? 'Order reviewed. Your items and total are confirmed for this payment.'
                  : 'We’re confirming your payment status. Please check before making another payment.'}
              </span>
            </div>
          )}
          <div className="checkout-action-bar">
            <span className="checkout-action-total">
              <span className="block text-xs text-muted">Total</span>
              <span className="font-semibold text-primary">
                {session
                  ? amount
                  : previewTotalPaisa === undefined
                    ? '—'
                    : formatPrice(previewTotalPaisa)}
              </span>
            </span>
            {session?.state === 'released' ? (
              <Button onClick={onRestart} size="xl" className="w-full">
                Return to delivery
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!canSubmit || (method === 'upi' && sdk.isMobile && !app)}
                isLoading={phase === 'preparing' || phase === 'checking'}
                size="xl"
                className="w-full"
                leftIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              >
                {session
                  ? method === 'upi' && !sdk.isMobile
                    ? `${qrFallback ? 'Open QR payment' : 'Show QR'} · ${amount}`
                    : `Pay ${amount}`
                  : 'Review payment'}
              </Button>
            )}
          </div>
          {phase === 'waiting' && !qrActive && (
            <p className="mt-3 text-center text-sm text-muted" role="status">
              Complete payment in the secure window or app. We’ll confirm it here.
            </p>
          )}
          {session && session.state !== 'paid' && session.state !== 'released' && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  void checkStatus()
                }}
                disabled={phase === 'checking'}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Check payment status
              </Button>
              <Link
                to={`/orders/${encodeURIComponent(session.orderId)}`}
                className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
              >
                View order
              </Link>
            </div>
          )}
          {session && session.state !== 'paid' && session.state !== 'released' && (
            <Button
              variant="ghost"
              className="mt-1 w-full text-muted"
              onClick={() => {
                void orderApiService
                  .cancelCheckout(session.orderId)
                  .then(checkStatus)
                  .catch((reason: unknown) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : 'Payment may still complete. Check its status before starting again.'
                    )
                  )
              }}
            >
              Request cancellation
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}
