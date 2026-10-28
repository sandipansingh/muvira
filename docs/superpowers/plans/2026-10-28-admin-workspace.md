# Muvira admin workspace

Implement the approved full-panel redesign: neutral grey/white surfaces, violet actions, Manrope utility typography, daily operations first and laptop-first responsive layouts. The four images in `design-references/` guide the design independently of the storefront.

## Milestones

1. Isolated route-level theme, collapsible navigation, shared page/table/search/status/dialog foundations.
2. Orders: URL-owned filters, transient email search, richer table; retain provider-safe detail workflows.
3. Catalog: Products/Categories/Inventory tabs, supported search/filters, focused create/edit dialogs, attachment recovery. Coupons: list-first creation/editing.
4. Settings section navigation, recovery clarity and independently loaded operational overview.
5. Browser verification, documentation, full repository checks and independent review.

## Contracts

- Retain routes, server authorization, APIs, native validation, integer paisa and provider state transitions.
- Frontend adapters may expose existing order payment/fulfillment filters and inventory category filtering.
- Use existing shared Modal/Dropdown/Pagination/Breadcrumbs/toast; no new dependencies or router migration.
- Keep order/email search in admin memory, not URLs. Persist other list state in URL parameters. Default page size 20.
- Distinguish loading, empty, no-results, errors and confirmed success. Preserve media/provider recovery and pending-operation blocks.
- No invented charts, commercial data, customer/staff management, bulk actions or export controls.
- CSS runtime tokens remain canonical. Update DESIGN.md, DESIGN_SYSTEM.md and UX-CONTRACT.md.

## Verification

Meaningful admin browser tests cover theme isolation, navigation, URL/history filters, search clearing, tabs, dialogs, stock changes, independent errors, responsive overflow and keyboard access. Existing catalog/refund/fulfillment/diagnostics tests retain commerce safety coverage. Verify all seven views at 320/390/820/1366/1440px and 200% text. Use isolated fixtures that reject unhandled mutations. Run lint:fix, format, build, type-check, test and graphify update in that order before committing milestones.
