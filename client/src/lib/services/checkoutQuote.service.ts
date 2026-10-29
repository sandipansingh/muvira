import { checkoutService } from './checkout.service'
import { createQuoteCoordinator } from '../utils/quoteCoordinator'

export const checkoutQuotes = createQuoteCoordinator((context) =>
  checkoutService.quote(
    context.shippingMethod,
    context.couponCode?.trim().toUpperCase(),
    context.addressId,
    context.accountId
  )
)
