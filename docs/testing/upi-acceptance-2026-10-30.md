# Razorpay UPI acceptance — 30 October 2026

The local production runtime used existing live credentials with `RAZORPAY_MODE=live`, `RAZORPAY_UPI_INTENT_ENABLED=true` and `RAZORPAY_UPI_QR_ENABLED=true`. The ignored root and server production environment files retain their credentials. Embedded QR remains behind its explicit approval gate; this acceptance used the default redirect QR flow.

## Live evidence

- The existing authenticated storefront account matched the account supplied for acceptance. Normal checkout prepared one unit of product `18431e40-3dfe-4b9f-be3e-a37c9787a5c9`. A read of the prepared order and payment records confirmed exactly 100 paisa, INR before payment dispatch.
- Order `MUV-000014` (`71385eda-5a20-4ac2-a71a-81525d3b6a87`) used Razorpay order `order_Tts6BHCsAT4UhX`. Razorpay’s actual SDK reported UPI available and opened its secure redirect page with an order-linked ₹1 QR. The user scanned and approved it.
- A subsequent direct Razorpay API read confirmed payment `pay_Tts7KQYXiUxgAg`: method `upi`, status `captured`, `captured=true`, amount `100`, currency `INR`, and the matching provider order ID.
- Muvira recorded one captured payment, a paid/confirmed order and one deduplicated `order.payment_captured` outbox event, completed in one processing attempt. The owned confirmation page displayed Payment verified and Paid. Shipment fulfillment remains unfulfilled; this test did not dispatch a shipment.
- Local screenshots are saved under the ignored `dev-scripts/upi-evidence/` directory. Credentials, account contact details and production configuration are excluded from this report.

## Automated evidence and limits

Regression tests exercise capability and Test Mode restrictions, provider availability, slow/failed/empty app discovery, order-linked integer-paisa INR SDK payloads, redirect/approved inline QR, flat/wrapped errors, cancellation ordering and uncertainty, late success, stale callbacks, return-to-page reconciliation, duplicate prevention, and existing card/bank/wallet behavior. Chromium and WebKit cover desktop and phone layouts, including enlarged text.

The isolated database suites replayed migrations through 060 in a separate Supabase project on loopback port 56321 and passed 62 tests, including payment integrity, ownership, signatures, authoritative totals/currency, idempotency, duplicate capture/webhook processing, retained checkout and cart isolation. These use provider fixtures and are separate from the real capture above.

The database integrity SQL suite also passed all 452 pgTAP assertions against that isolated project.

The final repository sequence passed in the required order: `lint:fix`, `format`, `build`, `type-check`, `pnpm test`, then `graphify update .`. The full test run passed 598 tests with 53 guarded skips and no failures; database integration ran separately as described above. Independent review found no critical or important issues. Desktop and mobile fixture screenshots were visually inspected. The graph refresh succeeded with its existing optional SQL-parser dependency unavailable; no migration changed in this work.

Actual mobile app switching still requires a supported physical device. This desktop acceptance does not establish mobile switching, embedded QR approval, or every production domain/account capability. UPI Collect/UPI ID entry remains absent.
