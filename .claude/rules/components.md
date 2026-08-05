# Component Patterns

This file outlines conventions for writing React components, organizing state, and structuring pages in this project.

---

## Server/Client Split

- **Async Server Components**: `page.tsx` files are async server components. They run on the server, fetch data from Prisma repositories directly, and pass resolved data down as props.
- **Client Components**: All UI components under `src/components/` must be client components and start with `"use client"`. They receive data via props and handle UI interactions (using React hooks/state) but never query Prisma repositories directly.
- **Example Flow**: `src/app/packages/page.tsx` (Server, queries db) -> passes data to `PackagesClient.tsx` (Client component) -> renders the packages layout.

---

## Data Fetching & Repository Pattern

- **Accessing Database**: Always import async repository functions from `@/lib/db/repositories/<name>Repo` (e.g. `companyRepo.ts`, `packageRepo.ts`). Never import the `prisma` client directly inside standard page or layout components.
- **JSON Field Parsing**: PostgreSQL stores complex types (lists, objects) as text. The repository functions automatically parse these fields before returning them. Always use `safeParse()` inside the repository layer (which wraps `JSON.parse` with a try/catch returning `[]` or fallback) to parse JSON-based fields.

---

## Animation Conventions

- **Animation Library**: All animations (such as dropdown transitions, modal slide-ins, and carousel sliding) must be implemented using **framer-motion** (`AnimatePresence`, `motion.div`, etc.).
- **No CSS Keyframes**: Never write custom CSS `@keyframes` or CSS `transition` rules for element state changes; keep animation logic purely declaration-based via `framer-motion` properties.

---

## Card Component Pattern

- **React Warning Prevention**: Card elements rendered dynamically inside a `.map()` loop (e.g., packages, destinations) must be defined at the **module scope** (outside the rendering parent component), rather than declared inline as nested functions.
- **Re-mount Prevention**: This ensures React doesn't recreate component definitions on every render cycle, preserving state and performance.
- **References**: Reference `PackageCard` or `DotIndicator` implementations for layout details.

---

## Component-Specific Specifications

- **Navbar**: Sticky navigation that dynamically adds background blur and scale transitions after scrolling 20px. Includes a slide-out mobile hamburger drawer with framer-motion overlay.
- **Hero**: Rotating slide banner pulling slides via `heroRepo.getHeroSlides()`. Auto-rotates every 5s with pause-on-hover. Houses the floating multi-field search inputs (destination, date select, guest dropdown) styled with `shadow-premium` and `rounded-[2rem]`.
- **PopularDestinations / TravelerMoments**: Large asymmetrical grid on desktop (`grid-cols-[5.8fr_4.2fr]` alternating layout) displaying testimonials and featured places. Maps to mobile horizontal swipe lists with custom dot pagination.
- **FAQ**: Accordion layouts using framer-motion height animations. Translates string tokens `{phone}` and `{email}` into real contact coordinates at runtime using `companyData`.
- **Footer**: Dynamic contact, schedule, and newsletter footer. Condenses same-time schedules (e.g. "Mon-Fri: 9am-6pm") automatically, and hooks up the newsletter form with contextual toast notices.
- **PopupModal**: The global trip request inquiry form in `layout.tsx`. Supports responsive country search filtering (using `countries-list` codes) and custom calendar date selection.
- **ToastContext**: Context-based notification popups that animate in at the bottom-right of the screen and auto-expire after 4s.
