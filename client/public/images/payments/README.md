# Payment artwork

Downloaded 2026-10-29 and served locally. Logos retain their original colours and proportions; no generated/recoloured brand artwork. SVG gzip transport encoding was decoded where supplied. These marks identify available payment options, not endorsements.

| Asset | Exact source | Attribution / use |
| --- | --- | --- |
| `upi.svg` | https://cdn.razorpay.com/checkout/upi.svg | NPCI UPI mark distributed by Razorpay for checkout |
| `google-pay.svg` | https://cdn.razorpay.com/app/googlepay.svg | Google Pay mark distributed by Razorpay |
| `phonepe.svg` | https://cdn.razorpay.com/app/phonepe.svg | PhonePe mark distributed by Razorpay |
| `visa.svg` | https://upload.wikimedia.org/wikipedia/commons/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg | Visa Inc.; Wikimedia Commons public-domain textlogo, trademark retained |
| `mastercard.svg` | https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg | Mastercard; Wikimedia Commons simple-shape logo, trademark retained |

`PaymentArtwork.tsx` is the sole mapping owner. Card logos require `card === true` and the corresponding `card_networks` value to equal `1` (`VISA`, `MC`). UPI requires `upi === true`; app logos render only for SDK-confirmed app codes. Missing/unknown card networks, apps, banks and wallets use a generic coloured icon. No brand or payment option is inferred from card digits, user agent, or reference screenshots. The original provider-generated QR payload is unchanged.
