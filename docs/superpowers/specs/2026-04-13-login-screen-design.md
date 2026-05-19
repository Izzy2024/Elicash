# EliCash Login Screen — Design Spec

> Date: 2026-04-13

## Summary

A login screen with a non-conventional, innovative flow: glassmorphism form fields, animated gradient background, and a swipe-to-enter button instead of a traditional submit button. The design has strong brand identity and works responsively across desktop and mobile.

## Design Decisions

### Concept: Credenciales con Swipe (Option B)

- **Background**: Animated gradient (dark navy #0F172A → deep blue #1E3A5F → back) with subtle radial glows in blue and green
- **Form fields**: Glassmorphism cards — semi-transparent backgrounds with blur effect, floating labels, subtle luminous borders
- **Submit**: Swipe-to-enter button (slide-to-unlock pattern) with gradient thumb (blue #3B82F6 → green #10B98F6) — drag from left to right
- **Tone**: Dark professional — #0F172A background, blue/green accents matching existing EliCash palette

### Responsive Behavior

- **Desktop (≥768px)**: Split layout — left panel shows brand (logo, name, tagline) with animated gradient background; right panel shows clean form
- **Mobile (<768px)**: Single column, centered — logo on top, form below, animated gradient as full background behind everything

### Interaction Details

- **Swipe button**: On mobile, touch-drag the thumb from left to right. On desktop, click-and-drag or mouse drag
- **Error state**: If auth fails, the entire form does a shake animation, fields get a subtle red border glow
- **Loading state**: While authenticating, the swipe thumb pulses and the track fills with the gradient
- **Success transition**: On successful auth, quick fade/scale animation before redirecting to dashboard
- **Eye icon**: Password field has a toggle to show/hide password

## Architecture

### New Files

- `frontend/src/pages/login.astro` — Astro page that hosts the login React island
- `frontend/src/components/LoginScreen.tsx` — React island with all login logic and UI
- `frontend/src/styles/login.css` — Login-specific animations (gradient, shake, swipe)

### Modified Files

- `frontend/src/layouts/MainLayout.astro` — Add auth state check, redirect to `/login` if not authenticated
- `backend/src/middleware/auth.middleware.ts` — Remove dev bypass (or make it configurable), enforce JWT on all `/api/*` routes except `/api/auth/*`
- `backend/src/app.ts` — No changes needed, routes already configured

### Auth Flow

1. User visits any page → MainLayout checks for JWT cookie
2. No valid cookie → redirect to `/login`
3. Login page renders LoginScreen React island
4. User fills email + password, swipes to enter
5. LoginScreen calls `POST /api/auth/login` with credentials
6. Backend returns JWT in httpOnly cookie + user data in response body
7. LoginScreen stores user info in React state/context, redirects to `/`
8. Subsequent requests include cookie automatically

### Auth Guard Strategy

- Create `frontend/src/components/AuthGuard.astro` component that checks for token on client-side
- MainLayout wraps content in AuthGuard when not on `/login` page
- AuthGuard redirects to `/login` if no valid session found
- Login page excludes AuthGuard

### SwipeToEnter Component

- Pure React component with pointer events (works for both touch and mouse)
- State machine: idle → dragging → success/error
- `onPointerDown` starts drag, `onPointerMove` tracks position, `onPointerUp` checks if threshold (80% of track width) reached
- If threshold reached → trigger login API call
- If threshold not reached → animate thumb back to start with spring animation
- Visual feedback: track fills with gradient as thumb moves right

## Design Tokens (reusing existing)

- Primary: `#0F172A` (Slate 900) — background
- Secondary: `#3B82F6` (Blue 500) — accent
- Accent: `#10B981` (Emerald 500) — accent
- Surface: `rgba(255,255,255,0.06)` — glassmorphism card background
- Border: `rgba(255,255,255,0.1)` — glassmorphism card border

## Error Handling

- Network error: Show inline message "Sin conexión. Verifica tu internet."
- 401 Unauthorized: Shake animation + red border glow on fields + "Credenciales incorrectas"
- Server error (5xx): "Error del servidor. Intenta de nuevo."

## Out of Scope (Future Iterations)

- Biometric login (fingerprint/face)
- "Remember me" / persistent sessions beyond 7 days
- Social login (Google, etc.)
- Password recovery flow (separate page)
- Registration flow (separate page, admin-only)