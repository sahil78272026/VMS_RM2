# RM2 Secure - Features Roadmap

This document categorizes features requested for the RM2 Secure platform into Completed and Pending batches.

## ✅ Category 1: Completed / Built

**Authentication & Foundation:**
- **Multi-tenant Architecture:** Made it a configurable app for other societies.
- **Guard Shift Logic:** Guard login/logout, PIN-based guard authentication, shift start based on admin-configured guards.
- **Role Switching:** Flat number in profile, active flat/active resident switching.
- **Mobile Number Validation:** 10-digit mobile number validation everywhere (including visitor entry).

**Guard & Visitor Workflows:**
- **Visitor Entry/Exit:** Guard visitor form creation, visitor kiosk image capture working, guard taking visitor pic, guard marking exit, visitor logout.
- **Fast Entry/Pre-approval:** Resident pre-approved visitor, pass issue by resident, visitor QR code check-in.
- **Guard Follow-up Actions:** Guard "Force Entry/Allow" post resident approval.
- **Form UI:** Flat numbers as dropdown in visitor entry form, search in flat numbers (lexicographical sorting).
- **Group Check-ins:** Multi-resident visitor in a single visit (added `visitor_count`).

**Resident Features & UI:**
- **Maintenance Status:** Resident maintenance amount UI, conditional renew buttons, maintenance UI in resident dashboard.
- **Timestamps:** Timestamp formatting standardized across the app using `date-fns`.
- **Notifications:** Resident ability to mute notifications.
- **Admin Setup:** Removed password requirement for guard creation by admin.
- **Web/App Ecosystem:** Landing page & app download routing, guard/visitor landing page routing.

**Batch 1 Completed (UI/UX Polish, Bug Fixes & Performance):**
- **Navigation & Routing:** Fixed Android back button minimizing the app, ensured resident login lands on home (not pending visitor), added relevant navigation on every page.
- **UI Transitions & Loading States:** Added beautiful loading transitions for all button clicks (admin guard creation, flat generation, society provisioning), fixed the split-second blank screens in `App.tsx`.
- **Error Handling:** Proper visible error responses with beautiful transitions, added global "screen shake" animation on errors via Toast config.
- **Performance:** Fixed slow OTP login, verifying, and profile switching by running AsyncStorage operations concurrently; resolved API calls firing before guard shift starts.
- **Guard UI Tweaks:** Removed "Fast Visitor Passcode Verification" from guard dashboard. "Inside Visitors" > 0 card opens inside visitor tab. Marking exit in visitor tab switches log to "All Today".
- **SuperAdmin Tweaks:** Changed 'overview' to 'manage' text, Superadmin homepage quick-refreshes after adding admins.

**Batch 2 Completed (Resident Onboarding, Hierarchy & Tenancy):**
- **Owner vs Tenant:** Segregated owner and tenant roles with `is_owner` boolean added to `FlatUser` schema and registration forms.
- **Hierarchy:** Primary vs Secondary members defined. Secondary member is non-primary by default. Primary members can elevate/demote others via dashboard.
- **Approval Flow:** Multi-step registration flow. Residents provide move-in date and occupancy type. Admins approve primary residents. Primary residents see a list of pending flat members and can approve them directly.
- **Moving Out & Transfers:** "Move Out" endpoint sets `move_out_date` instead of deleting the record, archiving history. Last primary moving out automatically marks the flat as vacant. Move out button integrated in resident profile UI.

**Batch 3 Completed (Helpdesk, Announcements & Services):**
- **Services & Amenities:** Added CRUD operations for admin to manage society facilities and service contacts.
- **Issues (Helpdesk):** Developed HelpdeskService backend and models. Residents can raise issues, categorize, set priority. Admins view, reply to, and update ticket statuses.
- **Announcements:** Admins broadcast priority-based announcements. "Urgent" triggers push notifications to all residents.

**Batch 4 Completed (Financials & Admin Enhancements):**
- **Maintenance Enhancements:** Admin offline paid maintenance update. Added payment screenshot upload for maintenance proof (`proof_url`). Society `upi_id` security.
- **Bifurcation of Roles:** Admin creation bifurcation between Cashier (payment approver) and Regular Admin.
- **Rebates & Donations:** Rebate for selected flats (separate table). Donations module (calculated differently from dues).
- **Setup Defaults:** When creating society, added city/pincode. Generate a default 'Main Gate' guard with dummy mobile (`1111111111` / PIN `1111`). Ensure default custom society creates 0 flats initially, start number `1` instead of `101`. Handle `1, 1A, 1B` formats.

**Batch 5 Completed (Advanced Visitor Logic & Smart Automations):**
- **Visitor Logs:** Added expected exit time and calculate actual exit based on entered time. Showed exit time in all logs.
- **Visitor Image Logic:** Fixed the caching bug by enforcing a fresh selfie capture for every check-in.
- **Timer UI:** Replaced the OTP text timer with a colored progress bar that fills up over 30s.
- **Notifications Engine:** Ensured notifications go to primary members only. Ensured sound for resident push notifications. Added guard push notifications when resident approves request.

**Batch 6 Completed (Business, Marketing & Conceptual):**
- **Subscription Model:** Added `subscription_plan` and `subscription_end_date` to `Society` to allow tiered feature access and trials.
- **Trespassing & Parking Violations:** Added `ParkingViolation` schema and API so guards can report unauthorized cars or overstayers.
- **MyGate CSV Import:** Created `/import-csv` API to bootstrap new societies effortlessly by ingesting existing MyGate ERP flat/resident data.
- **Security Agencies:** Added `SecurityAgency` schema and API. Admins can now manage security vendors and map guards to specific agencies.

### 🚀 Category 2: Pending (Categorized into Actionable Batches)

### 🧠 Batch 7: Smart Integrations & Future Tech
- **Smart Tech:** OTP login with device mapping. AI facial sentiment analysis for visitors. Delivery app message parsing (Swiggy/Zomato SMS to auto-create entries). Map routing to show the visitor the way.
- Ask for data from MyGate, integrations with MyGate ERP (Phase 2 - Direct API Sync).
- Norms for outsider parking (Tresspassers) - Hardware integration.
- Selling in specific areas (Wave City, etc.) - Marketing campaigns.
