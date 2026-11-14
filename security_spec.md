# Firestore Security Specification

## 1. Data Invariants
1. User PII (`email`, `uid`, `referredByCode`) in `/users/{userId}` can ONLY be read or modified by the authenticated owner (`request.auth.uid == userId`).
2. Users cannot assign admin privileges (`isAdmin`, `admin`) during account creation or profile updates.
3. Public QR scan visitors can read public storefront profiles in `/businesses/{businessId}`, and only the business `ownerId` can create, update, or delete their storefront.
4. Private 1–3 star feedback documents in `/businesses/{businessId}/feedback/{feedbackId}` require an existing parent business (`exists(/databases/$(database)/documents/businesses/$(businessId))`), are write-only for visiting customers, and are readable/updatable ONLY by the parent business `ownerId`.
5. Creator Affiliate Partner subcollections (`/users/{userId}/gateway/{gatewayId}`, `/users/{userId}/transactions/{txId}`, `/users/{userId}/payouts/{payoutId}`) are strictly gated to the authenticated creator (`request.auth.uid == userId`) whose `/users/{userId}` document has `role == 'creator'`.
6. Weekly payout batches and shop transactions enforce terminal lock once `status == 'paid'` / `payoutStatus == 'paid'`.
7. All `createdAt`, `updatedAt`, and `paidAt` timestamps must match `request.time`. All strings enforce `.size()` bounds and IDs match `^[a-zA-Z0-9_-]+$`.

## 2. Dirty Dozen Adversarial Payloads
1. **Identity Spoofing on User Create**: Authenticated user `uidA` tries to write `/users/uidB` with `uid: "uidB"`. -> `PERMISSION_DENIED`.
2. **Ghost Admin Field on User Create**: User `uidA` tries to write `/users/uidA` with `isAdmin: true`. -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: User with `email_verified == false` attempts to write `/businesses/{id}`. -> `PERMISSION_DENIED`.
4. **PII Read Leak**: User `uidB` tries to `get` or `list` `/users/uidA`. -> `PERMISSION_DENIED`.
5. **Orphaned Feedback Write**: Guest tries to create feedback under non-existent `/businesses/fake-id/feedback/fb1`. -> `PERMISSION_DENIED`.
6. **Unauthorized Feedback Read**: Non-owner `uidB` tries to read private customer feedback under `/businesses/biz1/feedback/fb1`. -> `PERMISSION_DENIED`.
7. **Non-Creator Accessing Affiliate Gateway**: An `'owner'` user tries to create `/users/uidA/gateway/default`. -> `PERMISSION_DENIED`.
8. **Commission Tampering**: Creator tries to write a shop transaction with `commissionAmount: 500` instead of `10`. -> `PERMISSION_DENIED`.
9. **Terminal State Mutation**: Creator tries to modify a transaction after `payoutStatus == 'paid'`. -> `PERMISSION_DENIED`.
10. **ID Poisoning**: Attacker attempts write with 1500-char document ID `{businessId}`. -> `PERMISSION_DENIED`.
11. **Backdated Timestamp**: Client sends `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. -> `PERMISSION_DENIED`.
12. **Array Exhaustion**: Attacker sends `customTags` with 50 items (`> 20` limit). -> `PERMISSION_DENIED`.
