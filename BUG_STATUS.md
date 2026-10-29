# Zippto bug report – status

Source: `zippto bug report - Sheet1.pdf` (31 bugs). Status of each after this pass.
"Code-fixed" means the change is made and `vite build` passes; nothing has been tested on a device or against the live backend.

## Solved (code-fixed)

| # | App | Bug | What was done |
|---|-----|-----|---------------|
| 1 | Vendor | Refresh shows splash screen | Auth guards now resolve synchronously (no spinner); login/signup load eagerly (no lazy loader); HTML splash is skipped on refresh |
| 2 | Vendor | Refresh clears filled registration details | Registration draft (fields, documents, verification token) kept in sessionStorage, cleared on success |
| 3 | Vendor | Header should be fixed | Fixed `AuthHeader` on login / OTP / registration |
| 4 | Vendor | Add privacy & terms | `AuthFooter` links to `/page/privacy-policy` and `/page/terms-of-service` |
| 5 | Vendor | Add support on login/registration | `AuthFooter` Support link (mailto, from admin settings) |
| 6 | Vendor | Remove "homestar", add Zippto (reg. header/footer) | No "homestar" text remains; header shows Zippto logo + name, footer says Zippto |
| 7 | Vendor | No toast on wrong Aadhaar/PAN | Cause: zod v4 has no `error.errors` (threw silently). Switched to `error.issues` in 6 places (vendor + user login/signup, addresses, profile) |
| 8 | Vendor | OTP page: remove "homestar", add Zippto | Same `AuthHeader` / `AuthFooter` on the OTP step |
| 9 | Vendor | Two splash screens on open | Removed stacked loaders (ProtectedRoute spinner + PublicRoute spinner + Suspense loader) |
| 10 | Admin | Hard-coded notifications not removable | The bell opened a page with a static array. Bell and sidebar now go to the real inbox; static page deleted; backend delete/read/clear-all now scoped by token role and cover global admin notifications |
| 11 | Admin | Notify admin on new vendor registration | Backend already created it; fixed the missing live refresh (socket handler didn't update the bell for admins) |
| 12 | Admin | Notifications clickable → right page | Each notification routes by type/`actionUrl` (vendors, settlements, payments, bookings…), also from the live toast |
| 13 | Vendor | Login page scrollable | Login is a fixed `100dvh` layout with no scroll |
| 14 | Vendor | Login/OTP content centred | Content is vertically centred between header and footer |
| 16 | Admin | Business/service/address shown but not collected | Those fields in "view details" only appear once the vendor has filled them |
| 18 | Vendor | Approval push/SMS/mail | Approval now sends push + SMS + email (pending vendors have no FCM token, so push alone never arrives) |
| 19 | Vendor | Header too small | `xs:` isn't a defined breakpoint, so mobile used tiny base sizes. Header enlarged |
| 21 | Vendor | Active Hub → white screen | Link pointed at `/vendor/address`, which doesn't exist. Now `/vendor/address-management` |
| 22 | Vendor | Header search goes to jobs | Search removed from the header |
| 23 | User | Remove "Cleaning Expert" text | Replaced with Zippto on the login page |
| 25 | User | Static Maharashtra location | Dashboard shows no location until the current location is fetched; removed the "Gondia, Maharashtra" fallback in the layout header |
| 26 | User | "D" in header → app logo | Replaced with the Zippto logo |
| 27 | User | Profile photo lost on back | Photo uploads and saves as soon as it is picked |
| 28 | Vendor | Each page needs its own title header | Header always shows the page title |
| 29 | User | Phone login won't take saved numbers | Autofill sends `+91 98765 43210`; the field rejected/truncated it. Now strips the 91/0 prefix (all 4 phone inputs) |

## Already fixed before this pass (verified, no change needed)

| # | Bug | Note |
|---|-----|------|
| 24 | Static "24" notification badge | Replaced static 24 badge across all user headers (UserDashboard, Header layout, NotificationBell) with unified reactive hook useUserNotificationCount, auto-clears on viewing notifications, and syncs via WebSocket notifications |
| 31 | "About Homestr" | UI strings already say Zippto (only internal component/route names still say "Homstr") |

## Needs your check / still open

| # | Bug | Why it isn't closed |
|---|-----|---------------------|
| 15 | Black/white screens before splash (user) | Web side fixed (light colour scheme + one splash from first paint). If the black frame comes from the Flutter wrapper's own launch screen, that needs a change in the Flutter project |
| 17 | Vendor certificate not visible to admin | Root cause unconfirmed (can't see the DB/Cloudinary). Hardened both ends: upload failure no longer drops the file, and admin preview handles PDFs and broken images. Re-test with a real upload |
| 20 | Flicker opening/closing view/edit | Likely cause fixed (modal body was cleared mid exit-animation). Needs eyes on a device |
| 30 | User logged out after closing app | Root cause not reproducible here. Fixed two real defects (PublicRoute wiped the refresh token and compared role case-sensitively; interceptor logged out on any refresh failure, including network errors). If it still happens, check how the Flutter wrapper persists tokens |
| 11 / 18 | Admin / vendor push delivery | Rows are created; actual push also needs FCM tokens. SMS needs a DLT-approved template for this text; email needs `EMAIL_USER` / `EMAIL_PASS` set |
| 28 | Header on every vendor page | `BookingMap` and `BookingAlert` are full-screen and still have no title header |

## Deploy notes
Backend changes (`notificationController`, `adminVendorController`, `vendorAuthController`, `emailService`) need a backend deploy for #10, #12, #17 and #18 to take effect.
