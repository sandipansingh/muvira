export interface CardDetails {
  name: string
  number: string
  expiry: string
  securityCode: string
}

export function formatCardInput(field: keyof CardDetails, value: string): string {
  if (field === 'name') return value
  const digits = value.replace(/\D/g, '')
  if (field === 'securityCode') return digits.slice(0, 4)
  if (field === 'number')
    return (
      digits
        .slice(0, 19)
        .match(/.{1,4}/g)
        ?.join(' ') ?? ''
    )
  const expiry = digits.length === 6 ? digits.slice(0, 2) + digits.slice(-2) : digits.slice(0, 4)
  return expiry.length > 2 ? `${expiry.slice(0, 2)}/${expiry.slice(2)}` : expiry
}

export function validateCardDetails(
  details: CardDetails,
  now = new Date()
): Partial<Record<keyof CardDetails, string>> {
  const errors: Partial<Record<keyof CardDetails, string>> = {}
  if (!details.name.trim()) errors.name = 'Enter the name on your card.'
  const number = details.number.replace(/\s/g, '')
  let sum = 0
  for (let index = number.length - 1, double = false; index >= 0; index -= 1, double = !double) {
    let digit = Number(number[index]) * (double ? 2 : 1)
    if (digit > 9) digit -= 9
    sum += digit
  }
  if (!/^\d{13,19}$/.test(number) || sum % 10 !== 0) errors.number = 'Enter a valid card number.'
  const match = details.expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (
    !match ||
    Number(match[1]) < 1 ||
    Number(match[1]) > 12 ||
    2000 + Number(match[2]) < now.getFullYear() ||
    (2000 + Number(match[2]) === now.getFullYear() && Number(match[1]) < now.getMonth() + 1)
  )
    errors.expiry = 'Enter a valid future expiry as MM/YY.'
  if (!/^\d{3,4}$/.test(details.securityCode))
    errors.securityCode = 'Enter the 3 or 4 digit security code.'
  return errors
}
