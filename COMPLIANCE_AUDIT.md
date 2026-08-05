# Legal Compliance Audit Report

## DPDPA (Digital Personal Data Protection Act, 2023)

### 1. Missing Explicit & Itemized Consent
* **File:** `mobile/src/screens/auth/index.tsx` (Lines 141-177, `handleSubmit` in `RegisterScreen`)
* **Gap:** Personal data (names, phone numbers, flats) is collected passively upon form submission without explicit, itemized consent checkboxes for specific purposes (e.g., account creation vs. communications vs. visitor tracking).
* **Law:** DPDPA 2023, Section 6 (Consent must be free, specific, informed, unconditional, and unambiguous).
* **Fix Suggestion:** Add mandatory, separate checkboxes for each data processing purpose before allowing form submission.

### 2. No User Data Access, Correction, or Deletion Mechanism
* **File:** `backend/app/api/users.py` and `backend/app/api/visitors.py` (Missing implementation)
* **Gap:** There are no endpoints for users or visitors to view all their collected data, self-delete their profiles, or withdraw consent. The only deletion route is for admins to remove visitors from the blacklist.
* **Law:** DPDPA 2023, Section 12 (Right to access, correct, and erase personal data).
* **Fix Suggestion:** Implement `DELETE /api/v1/users/me` and `DELETE /api/v1/visitors/{visitor_id}` endpoints for complete data erasure.

### 3. Photo & ID Collection Lacks Specific Consent & Defined Retention
* **File:** `landing-page/src/App.tsx` (Line 137: `<label>Visitor Photo</label>`) and `backend/app/models/__init__.py` (Line 253: `photo_url`)
* **Gap:** Visitor photos are captured without a distinct consent prompt and have no defined lifecycle/retention policy communicated to the user.
* **Law:** DPDPA 2023, Section 8(7) (Storage limitation) and Section 6.
* **Fix Suggestion:** Add a specific consent toggle for capturing photos/IDs and display exactly how long they will be kept on the UI.

### 4. Hardcoded Indefinite Data Retention
* **File:** `backend/app/models/__init__.py` (Lines 46 & 258: `created_at` in `VisitorLog` and `Visitor`)
* **Gap:** Data is appended to the database with a `created_at` timestamp but is retained indefinitely, lacking any automated deletion or anonymization path when the purpose has expired.
* **Law:** DPDPA 2023, Section 8(7) (Data must be erased when the specified purpose is no longer served).
* **Fix Suggestion:** Create a background cron job to automatically anonymize or delete visitor logs and data older than a legally defined retention period.

### 5. Missing Minors' Guardian-Consent Path
* **File:** `mobile/src/screens/auth/index.tsx` (`RegisterScreen`)
* **Gap:** The application collects personal data but completely lacks age verification or a verifiable parental consent flow for users under 18.
* **Law:** DPDPA 2023, Section 9 (Processing of personal data of children).
* **Fix Suggestion:** Add an age declaration step during registration and a parental consent workflow if the user indicates they are a minor.

---

## CERT-In Directions, 2022

### 6. Security/Access Logs are Silently Overwritten
* **File:** `backend/app/config/logging.py` (Lines 23-27: `maxBytes=10 * 1024 * 1024`, `backupCount=5`)
* **Gap:** Application logs are capped at 50MB total. Logs will silently overwrite themselves rapidly in a production environment, violating the mandatory 180-day retention rule.
* **Law:** CERT-In Directions, 2022 (Clause 6).
* **Fix Suggestion:** Stream logs to a centralized logging system (like AWS CloudWatch or ELK) configured with a strict, unalterable 180-day retention policy.

### 7. No Breach/Incident Logging or Alerting Mechanism
* **File:** Entire codebase.
* **Gap:** There is no integration with an exception tracking, security anomaly detection, or alerting system.
* **Law:** CERT-In Directions, 2022 (Mandates reporting of specific cyber incidents within 6 hours).
* **Fix Suggestion:** Implement an alerting system (e.g., Sentry or Datadog) to detect, log, and immediately notify admins of security anomalies.

---

## RBI Payment Rules

### 8. Payment Data Handling
* **File:** `mobile/src/screens/resident/index.tsx` (Line 217: `upi://pay...`) and `backend/app/models/__init__.py` (`MaintenancePayment`)
* **Gap:** None found. No card numbers, CVVs, or UPI credentials are saved directly in the database. Payments are securely delegated to installed UPI apps, and the app only captures the manual UTR reference.
* **Law:** RBI Guidelines on Regulation of Payment Aggregators and Payment Gateways.
* **Fix Suggestion:** N/A (Compliant).

---

## General Red Flags

### 9. AI/ML Psychological Profiling & Undisclosed Analytics
* **File:** Entire codebase.
* **Gap:** None found. No AI/ML libraries, emotional/sentiment inference code, or psychological profiling logic was detected. There are no hidden third-party tracking scripts (analytics/ads) in the core source files.
* **Law:** General privacy principles and DPDPA Section 6.
* **Fix Suggestion:** N/A (Compliant).
