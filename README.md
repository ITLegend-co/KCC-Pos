# KCC POS

Record daily student payments and save one consolidated PDF receipt per student, payment category and calendar month. This version uses **Firebase Realtime Database + Firebase Authentication** directly. Cloud Functions, Cloud Firestore, and a billing upgrade are not required by this implementation.

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

- Staff create an account and verify their email. Admin approves them in Administration before they can access club data or manage students/payments. Admin can revoke access.
- Admin and approved staff can add students. Admin can delete a student from active selection and restore them using **Show deleted students**. Historical names, payments and receipts are retained. New payments for deleted students are blocked. Record payments by category, date, amount, Cash/QR/Bank transfer/Cheque, and optional reference. Choose **SPORT CLIMBING TRAINING FEES** or **INSURANCE FEE - ALLIANZ STUDENT PERSONAL ACCIDENT**. Existing payments remain training fees.
- The Daily payments page shows the total for a selected date and the total for the reporting month, with payment counts. Both include all students and reflect admin payment corrections. Training and insurance breakdowns appear below each combined total. Changing the reporting month keeps the daily date within that month.
- Select a reporting month. The daily register and monthly totals use payment dates in Malaysia, not UTC timestamps.
- At month end, review the payments and save an individual receipt, or save all ready receipts. Training and insurance have separate receipts. Saving closes only that student’s selected category/month. Further daily entries for that closed category are blocked; the other category remains open.
- The PDF follows the supplied KCC bilingual layout with the club logo and registration number, receipt number/date, payer, amount in words, payment description, total, and issuer. A second page lists daily payments. Download, print, or share the PDF. Browsers without file sharing download it for attachment in WhatsApp/email.
- Training PDFs describe the payment as **SPORT CLIMBING TRAINING FEES - JUNE 2026** (using the selected month/year), followed by the school name. Insurance PDFs use **INSURANCE FEE - ALLIANZ STUDENT PERSONAL ACCIDENT**, followed by the school name, without training fees or a month in the description. Each PDF includes only its category’s payments.
- In **Daily payments**, admin can click **Edit** to correct the date (within its original month), amount, method and reference. A reason is required. Daily totals and PDFs use the committed corrections. If a receipt has already been saved, its total changes by the payment amount difference and its revision increases. Any previous separate receipt adjustment is preserved. Original payment events and correction records remain immutable.
- Only the administrator can correct a saved receipt total. A reason and immutable correction record are required. Original payments and the original receipt total remain available; the PDF shows the revised total and reason.
- Admin changes numbering using one `{SEQ}` with optional `{YYYY}` and `{MM}`, a next number, and digit padding. Existing receipt numbers remain unchanged. Previously reserved numbers are never reused. Numbers can be skipped after interrupted or competing requests; retries use the same student/category/month allocation. Training and insurance share the unique receipt-number sequence.
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

After this update, publish the updated `database.rules.json` in Firebase Realtime Database → Rules. The old rules do not permit the new insurance data paths and category-specific receipt allocations. GitHub Pages deployment does not publish Firebase rules.
