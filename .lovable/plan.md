## Scope

Two small, UI-only changes. No backend, no data wiring.

### 1. New page: `src/pages/AffiliateRegister.tsx`

- Same visual style as `AffiliateLogin.tsx` (background slider, glass card, green accent).
- Form fields (visual only, no submit handler beyond a disabled toast "Coming soon"):
  - Full name
  - Username
  - Phone
  - Email (optional)
  - Password
  - Confirm password
- "Create account" button — inert / shows toast.
- Link back to `/affiliate/login` ("Already have an account? Sign in").
- Route added in `src/App.tsx` at `/affiliate/register`.
- Update `AffiliateLogin.tsx` to add a "Don't have an account? Register" link pointing to `/affiliate/register`.

### 2. Entry point on the main page

- Add a button/link on `src/pages/Index.tsx` (home) that navigates to `/affiliate`.
- Placement: fits naturally near existing hero/CTA area, styled with the existing green accent so it matches the affiliate branding. Exact spot will be chosen to blend with the current layout when I read `Index.tsx`.

### Out of scope

- No signup edge function, no DB writes, no validation logic beyond `required` HTML attributes.
- No changes to auth hardening, forgot-password, or charts (those remain for the follow-up plan you already selected).
