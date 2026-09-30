# Games Admin — Pass A

**Scope:** isolated Games-domain admin identity and bootstrap.

## Implemented

- Added an **Admin** entry point to the Games home screen.
- Restricted the bootstrap identity to `ant1982@gmail.com`.
- Added first-run password creation with these rules:
  - at least 6 characters;
  - at least one uppercase letter;
  - at least one number;
  - at least one symbol.
- Stored the credential as a salted `scrypt` hash under the existing data directory. The password is never stored or returned in plaintext.
- Added HttpOnly, SameSite session cookies with an eight-hour idle renewal window.
- Added status, bootstrap, login, session, and logout endpoints under `/api/admin/*`.
- Kept the admin page isolated from game identity and player-name storage.
- Reserved the signed-in state for the balance dashboard in Pass B; no balance variables are exposed yet.

## Verification

`npm run test:admin` covers fresh bootstrap, policy rejection, hashed storage, session establishment, logout, invalid credentials, and a subsequent persisted login. The production deployment still needs the live first-run browser check before this pass is marked complete.
