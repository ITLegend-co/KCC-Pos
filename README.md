# KCC POS

Daily student payments collected into one saved receipt per student per calendar month. Currency is Malaysian ringgit. Payment dates and reporting months use Malaysia time. The 74 supplied students are provided separately in a private JSON import file, with the supplied names and school labels preserved. Student names are never committed to this public repository.

## First deployment

The GitHub Pages workflow publishes the interface on every push to main. Firebase backend deployment is separate and requires an authorized Firebase account for project `kcc-pos`.

1. In Firebase Console, enable Authentication → Email/Password and create the Firestore database. Confirm that `adlybinbakran@gmail.com` has UID `kjk86LonpVfk83NfpajQrhGxvOv1` in Authentication. This value is treated as the Firebase UID, not a password. If the UID differs, update `functions/domain.cjs`, `firestore.rules`, and `public/app.js` together before deployment.
2. Enable billing (Blaze) for Cloud Functions deployment.
3. Install Node.js 22 and run `npm install --prefix functions` from the repository folder.
4. Run `npx firebase-tools login`, then `npx firebase-tools deploy --project kcc-pos --only functions,firestore,hosting`.
5. If using GitHub Pages, add `itlegend-co.github.io` to Authentication → Settings → Authorized domains. Under GitHub Settings → Pages, use GitHub Actions as the source if not already enabled.
6. Sign in as the administrator. Open Administration → Initialize club. Select your private `KCC-students.json` file to import the roster. This creates numbering `KCC{SEQ}`, next number 152, padded to four digits. Repeating setup preserves existing data.

Firebase Hosting: https://kcc-pos.web.app
GitHub Pages: https://itlegend-co.github.io/KCC-Pos/
These addresses become usable only after their respective deployments succeed.

## Daily operation

- Staff create an account, verify their email, then wait for administrator approval. Pending/rejected accounts cannot read club data or write payments.
- Admin and approved staff add students and record each daily payment with date, amount, payment method, and optional reference. No invented payments or financial history are seeded.
- Select a reporting month to view totals. At month end, save a student’s monthly receipt, or save all ready receipts. Review all payments before closing.
- Saving uses a Firestore transaction to allocate a unique receipt number and prevent duplicate student/month receipts. Closed student/month records block further daily payments. A retry returns the same receipt.
- Receipt PDF follows the attached KCC bilingual template: club logo, registration number, official receipt heading, number/date, received from, amount in words, payment description, amount and issuer. A second page itemizes daily payments. Download, print, or share using browser file sharing; unsupported browsers download the file for attachment.
- Only the administrator can correct a saved receipt total, with a mandatory reason. Original daily payments remain intact, and the audit log records original/revised amounts and actor. The corrected PDF clearly shows both totals and the reason. Staff cannot edit saved amounts.
- Admin can approve/revoke staff and change numbering using `{SEQ}`, `{YYYY}`, `{MM}`. Previously used receipt numbers cannot be reused, even after changing the sequence.
- Export the selected month’s daily payment register as CSV.

## Design and security

All writes run through authenticated Firebase callable functions. Firestore rules allow only approved staff reads and deny every direct client write. Admin is pinned to the supplied UID, independent of editable profile fields. Amounts are stored as integer cents. Payment retries reuse a request ID to avoid duplicates. Receipts are explicit month-end saves; there is no automatic scheduled issuance or automatic delivery to students.

The public Firebase web configuration is intentionally included. It is not an administrative credential. Never add Firebase service account keys, passwords, or billing credentials to this repository.

The attached template is a layout reference, not a workbook to execute. The logo is included as a PNG asset. No VBA is executed. The static client uses Firebase SDK 12.3.0 and jsPDF 2.5.2 from CDNs.

## Validation

`npm test` checks cents, calendar cutoffs, numbering, and the student student import. `npm run check` checks JavaScript syntax. Live sign-in, deployed rules/function permissions, concurrent receipt transactions, browser PDF behavior, and actual sharing/printing must be verified in the deployed Firebase project. A Firebase config alone does not grant database/admin deployment access.

A two-page receipt generated with the production PDF renderer was rendered and visually inspected with example data. This verifies the static PDF layout, not live browser sharing or printing.

## Realtime Database rules

This application uses Cloud Firestore. It does not store POS data in Realtime Database. If Realtime Database is enabled, paste `database.rules.json` into Firebase Console > Realtime Database > Rules and publish it to deny all client access to that unused database. These rules do not replace `firestore.rules`, and enabling Realtime Database alone will not activate this POS.
