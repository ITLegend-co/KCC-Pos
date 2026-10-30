# KCC POS

Record daily student payments and save one consolidated training PDF receipt per student and calendar month, with separate insurance records and admin treasury reports. This version uses **Firebase Realtime Database + Firebase Authentication** directly. Cloud Functions, Cloud Firestore, and a billing upgrade are not required by this implementation.

Website: https://itlegend-co.github.io/KCC-Pos/

## Activate this version

1. Open Firebase Console → project `kcc-pos` → Realtime Database → Rules. Replace the entire rules document with the contents of [`database.rules.json`](database.rules.json), then click **Publish**. These are Realtime Database JSON rules, not Firestore rules. Do this before entering club data.
2. The application is configured for the existing Singapore database: `https://kcc-pos-default-rtdb.asia-southeast1.firebasedatabase.app`. The URL is in `public/store.js`.
3. Keep Email/Password enabled in Firebase Authentication. Add `itlegend-co.github.io` to Authentication → Settings → Authorized domains.
4. Confirm that `adlybinbakran@gmail.com` has Firebase UID `kjk86LonpVfk83NfpajQrhGxvOv1`. Admin access is pinned to that UID in `public/store.js` and `database.rules.json`. Existing Firebase Authentication accounts continue to work.
5. Wait for the GitHub Pages workflow to finish, refresh the website, and sign in. There is no Cloud Function deployment step.
6. As administrator, open Administration. Select the separately supplied private `KCC-students.json` import file, then click **Initialize / import students**. This imports the 74 students and initializes receipt numbering to `KCC0152`. Repeating import preserves existing records.

The student import is included in the previously supplied setup ZIP under `private-import/`. Keep it out of this public repository. No invented payments or financial history are seeded.

Optional CLI rules deployment: with an authorized Firebase account, run `npx firebase-tools login` followed by `npx firebase-tools deploy --project kcc-pos --only database`. The Console publish route does not require Node.js or a billing upgrade.

## Excel student upload

Admin and approved staff can open **Students**, download the blank Excel template, fill its `Students` sheet, and choose **Preview upload**. Review the names and schools, then click **Import students**. The header row is `NO.`, `STUDENT FULLNAME`, `SCHOOL` in columns A–C. NO. is a list number, not a database ID. Save as `.xlsx`, use plain values, and upload up to 400 students (5 MB maximum).

The importer requires a full name and school, ignores empty rows, and skips duplicate name/school pairs in the file or existing directory. Existing student IDs, students and payments are preserved. A different school creates a separate record, so check names and schools before confirming. Re-uploading after an interrupted import safely skips completed entries. Excel files are read in the browser and only the confirmed student records are sent to Firebase. The filled private student workbook is supplied separately and is not stored in this public repository.

## Daily operation

- Staff enter their full name, create an account and verify their email. Existing users can save their name using the profile form. Admin approves them in Administration before they can access club data or manage students/payments. Admin can revoke access.
- Admin and approved staff can add students. Admin can delete a student from active selection and restore them using **Show deleted students**. Historical names, payments and receipts are retained. New payments for deleted students are blocked. Record payments by category, date, amount, method, receiving account and optional reference. Save your full name before recording payments; each new payment retains the receiver’s name and Firebase UID. Choose **SPORT CLIMBING TRAINING FEES** or **INSURANCE FEE - ALLIANZ STUDENT PERSONAL ACCIDENT**. Existing payments remain training fees.
- The Daily payments page shows the total for a selected date and the total for the reporting month, with payment counts. Both include all students and reflect admin payment corrections. Training and insurance breakdowns appear below each combined total. Changing the reporting month keeps the daily date within that month.
- Select a reporting month. The daily register and monthly totals use payment dates in Malaysia, not UTC timestamps.
- At month end, review the payments and save an individual receipt, or save all ready receipts. Only training fees have receipts. Saving closes that student’s training month. Insurance stays open for payment records, is included in collection totals, and has no receipt actions. Previously saved insurance receipts and number reservations are retained as history; new insurance receipts are prohibited.
- The PDF follows the supplied KCC bilingual layout with the club logo and registration number, receipt number/date, payer, amount in words, payment description, total, and issuer. A second page lists daily payments. Download, print, or share the PDF. Browsers without file sharing download it for attachment in WhatsApp/email.
- Training PDFs describe the payment as **SPORT CLIMBING TRAINING FEES - JUNE 2026** (using the selected month/year), followed by the school name. Insurance payments are recorded separately without generating a PDF receipt.
- In **Daily payments**, admin can click **Edit** to correct the date (within its original month), amount, method and reference. A reason is required. Daily totals and PDFs use the committed corrections. If a receipt has already been saved, its total changes by the payment amount difference and its revision increases. Any previous separate receipt adjustment is preserved. Original payment events and correction records remain immutable.
- Only the administrator can correct a saved receipt total. A reason and immutable correction record are required. Original payments and the original receipt total remain available; the PDF shows the revised total and reason.
- Admin changes numbering using one `{SEQ}` with optional `{YYYY}` and `{MM}`, a next number, and digit padding. Existing receipt numbers remain unchanged. Previously reserved numbers are never reused. Numbers can be skipped after interrupted or competing requests; retries use the same student/category/month allocation. Only training fees allocate new receipt numbers.
- Export the selected month’s daily register as CSV.

## Data and permission model

| Path | Purpose |
| --- | --- |
| `users/{uid}` | Pending/approved/rejected staff profiles; admin-only approval |
| `students/{id}` | Student directory; creation by admin/approved staff |
| `paymentChanges/{month}/{studentId}/{changeId}` | Immutable admin daily-payment corrections, committed by the ledger edit head |
| `events/{month}/{studentId}/{eventId}` | Immutable payment events with previous-event links and running totals |
| `ledger/{month}/{studentId}` | Committed payment head and total; saved receipt and revision |
| `numbering` | Admin format/settings and transactional sequence counter |
| `numbers/{number}` | Permanent unique receipt-number reservations |
| `allocations/{month_studentId}` | Training receipt allocation; insurance uses `month_studentId_insurance` |
| `corrections/{id}` | Immutable administrator training receipt corrections |
| `insuranceEvents`, `insuranceLedger`, `insurancePaymentChanges`, `insuranceCorrections` | Separate insurance payments, receipts and immutable admin corrections, with the same month/student hierarchy |

Payment event creation validates its amount and running total against the committed ledger. A transaction then advances the ledger only if the previous head still matches. Concurrent attempts retry against the new head. Events that lose a race are uncommitted candidates and are excluded from registers, receipts and totals. Saved receipts freeze the ledger head. Receipt amounts must match that ledger when issued. Admin corrections require a matching immutable audit event. Rules enforce these relationships independently of the interface.

The app checks an unauthenticated probe before profile setup and refuses to initialize if the database is still in public test mode. The database root denies access. Anonymous, pending, revoked and unverified staff cannot read club records. Clients cannot grant themselves approval, change admin-only numbering settings, edit/delete payment events, alter saved receipt amounts as staff, or delete saved receipts. Payment events, number reservations, allocations and correction events are append-only.

Receipts are saved explicitly at month end; there is no automatic monthly scheduler or automatic delivery to students. The public Firebase web configuration is not an admin credential. Never commit passwords or service account keys.

## Existing data

The old Firestore version did not have an operational profile function in this session, so no successful POS entries were observed. Existing Realtime Database content was empty when checked before conversion. The conversion does not erase either database. If you independently entered Firestore payments, those need a separate migration; this version does not import Firestore data automatically.

## Validation

Run `npm test` and `npm run check` for local model and syntax checks. The security integration tests execute the production store against Firebase's Realtime Database emulator and verify account approval, immutable data, monthly totals, idempotent requests, receipt numbering, corrections, concurrent writes, revocation, and separation of training/insurance payments and receipts.

To repeat the integration tests, install dev dependencies with `npm ci`, install Java 17 or newer, then run:

```
npx firebase-tools@14.22.0 emulators:exec --only database --project demo-kcc-pos "npm run test:rules"
```

The GitHub workflow runs the same checks before deployment. The existing two-page PDF renderer was visually inspected with example data. Actual browser file sharing/printing and production Firebase permissions require verification after publishing the rules. Code deployment does not publish Firebase rules automatically.

After this update, publish the updated `database.rules.json` in Firebase Realtime Database → Rules. The previous rules do not permit treasury records, receiver-name snapshots and receiving accounts. These updated rules also prohibit new insurance receipts. GitHub Pages deployment does not publish Firebase rules.

## Admin treasury

Open **Treasury** and select the reporting month at the top. Student training and insurance collections feed into the report automatically using the committed payment history and admin payment edits. Do not enter student collections again as treasury income. Separate receipt-total adjustments are not movements of money and do not affect treasury balances.

1. Enter starting CIMB and cash-box balances immediately before the first day of your starting month. This setup is saved once. Collections before that date are already represented by those opening balances, and balances before the starting month are unavailable. No balances are invented or seeded.
2. Record other income (donations, membership/event income), expenses (equipment, coaching, bills, refunds or payment to the insurer), or transfers between cash and CIMB. Enter the date, category, amount, payer/payee description and bank/bill reference. This is a manual register; it does not connect to CIMB BizChannel or initiate bank transfers.
3. Transfers move equal amounts between club accounts and are excluded from income, expenses and net totals. Transaction retries retain one record. To correct a manual entry, void it with a reason and create a replacement. Original entries and void reasons cannot be deleted. Student payments are corrected in Daily payments.
4. Compare the report’s closing balances with the month-end CIMB statement and physically counted cash. Save a balance check and investigate any displayed difference. Checks are retained; the latest selected-month check is displayed. Download the report as CSV or choose Print / Save PDF and use the browser’s PDF printer. Reports are generated from current records; later corrections recalculate historical reports.
5. Register existing equipment separately, or link an asset to its purchase expense transaction ID. Adding an asset does not create another expense or increase cash balances. The asset register stores quantity, original total cost and location; it does not calculate depreciation or replace an accounting balance sheet.

New student payments explicitly select the receiving account. Cash defaults to the cash box; QR and bank transfer default to CIMB. Cheque is unavailable for new payments and payment corrections. Historical cheque entries remain visible and can still be voided or refunded. Older records without an account default to cash for Cash and CIMB for other methods.

Only the pinned admin can read/write `treasuryOpening`, `treasuryTransactions`, `treasuryVoids`, `treasuryChecks` and `treasuryAssets`. Approved staff continue to manage students and student payments only. New student payment events store `receivedByName` validated against the receiver’s profile and `account` validated as `bank` or `cash`. Renaming a profile does not change names on existing new payment events; older events fall back to UID/profile information.

## Admin student-payment voids and refunds

In **Daily payments**, only admin sees **Void** and **Refund** next to an active payment. A reason is required. These are full-payment actions; partial refunds are not supported. Original events remain immutable, and only the committed audit chain affects reports.

- **Void** cancels an incorrect entry: its effective collection amount becomes zero and it is excluded from treasury income. Any saved training receipt is revised by the cancelled amount. A fully cancelled receipt shows VOID RECEIPT and retains its original number and audit history. If a separate receipt adjustment prevents a full cancellation, correct that adjustment first.
- **Refund** records money already returned to the student: select the actual return date and cash/CIMB account. The original collection and receipt amount remain; the PDF payment breakdown marks it refunded. Treasury records the refund as an expense on its return date, including across reporting months. This does not initiate a bank transfer.
- A voided/refunded payment cannot be edited, voided again or refunded again through the application. Competing actions commit only one ledger amendment. Daily collection totals show historical money received, excluding voids; refund expenses appear in Treasury. The payment CSV includes status, reason, refund date, amount and account.

Publish the updated Realtime Database rules before using these actions. Security rules permit action records only for the pinned admin and validate void amounts, refund metadata, and linked ledger/receipt revisions.

## Staff requests for voids and refunds

Approved, verified staff can select **Request void** or **Request refund** in Daily payments. They enter a reason; their full name, payment/category/month and current amount are saved in an immutable request. No collection, receipt or treasury amount changes at submission.

Admin reviews all requests in **Administration → Void / refund review**, including requests from other months, and records an immutable approval or rejection with notes. Approval alone does not move money or change totals. Admin then selects **Process approved void/refund**. Refund processing requires the actual return date and cash/CIMB paying account. The system records a refund already paid; it does not initiate a CIMB transfer. Staff see their request’s status in Daily payments.

Processing still uses the existing admin-only audited payment actions. It checks the exact requested payment, action, category and amount against approval. A changed, voided or already-refunded payment cannot be processed again. A committed payment-change record links to its request ID; the status is derived from the committed audit chain, so uncommitted candidates cannot appear processed. Direct admin actions remain available. Rejected reviews cannot be overwritten; submit a new request if appropriate.

Publish the updated Realtime Database rules before use. Approved staff can create requests, but only the pinned administrator can review them or process financial actions.

Treasury reports include six months of income/expenses, training and insurance collections, and combined closing balance trends ending in the selected reporting month. Comparison cards show the difference from the previous month and percentages when that month has a positive baseline. Zero baselines and previous deficits show an explanation instead. Voids are excluded, refunds count as expenses on their return date, and transfers do not create income or expenses. Balance points before the starting balances are unavailable. Charts and comparisons are included in Print / Save PDF; CSV includes the monthly figures. The combined balance row is labelled Total.

## Installation

The sign-in screen and account sidebar show the signed Android download at `downloads/KCC-POS.apk` only in ordinary Android browsers. The link is hidden on desktop and inside installed apps. Android version 2.0.0 displays the live site in its own app window, with native PDF preview/save/share/print and Excel selection. Android 6+, an updated Android System WebView and internet are required. Install this APK over the old launcher; sign in once inside the new app. See `android/README.md` for rebuilding and signing updates. Browser installation is supported with a project-scoped manifest and service worker, without custom prompts or installation notices. The worker does not cache payment records, Firebase traffic, PDFs or authentication data.

## Attendance and student details

Approved, email-verified staff and the administrator can use Attendance, search
students by name or school, and clock students in and out. Clock-out asks
“Clock out [student name]?” with No and Yes. Receive payment opens Daily payments
with that student's ID selected; it does not save or charge a payment.

Attendance stores device epoch time and the device's timezone offset for each
clock-in/out, plus the staff ID/name. History is retained by clock-in date; active
visits remain visible across midnight. Keep device clocks correct. Atomic writes
and rules prevent duplicate active visits, repeated clock-outs and history edits.

Staff can edit active students' name, school and gender. Student IDs and creator
metadata remain fixed, and deletion/restoration remains administrator-only.
Existing saved receipts retain their name/school snapshot. Gender is Male, Female
or Not specified; unknown existing values are never inferred. The Excel template
now has GENDER in column D. Blank gender and old three-column workbooks are still
accepted as Not specified. Imports skip existing name/school duplicates; edit a
student directly to update their details.

Publish the complete updated `database.rules.json` in Firebase Realtime Database
before using these features. GitHub Pages deployment does not publish database
rules. The existing Android v2 app loads these website updates without an APK
reinstall.

### Pending attendance payments
Attendance and Daily payments list unpaid visits across all months at RM5 per session. Existing unlinked training payments count against visits on the same attendance date, oldest visit first. Insurance does not count. Use **Receive payment** on the pending row to record a partial or full payment linked to that visit; the payment date remains the actual collection date, so receipts and treasury reflect when money was received. Voided or refunded payments no longer settle a visit. Existing late payments without an attendance link cannot be inferred automatically.

Publish the updated `database.rules.json` in the **kcc-pos Realtime Database** before using linked attendance payments. The only added permission is the optional training payment `attendanceSessionId`, validated against an existing visit for the same student. Existing approval and administrator protections remain in effect.
