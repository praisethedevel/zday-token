# Security Policy

## Supported Token Infrastructure

| Component | Status | Contract / Address |
|---|---|---|
| **Zero-Day Syndicate ($ZDAY)** | Supported | `BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD` |
| **Token-2022 Program** | Canonical | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| **Deploy & Migration Scripts** | Supported | Repository `scripts/` |

---

## On-Chain Security Guarantees

1. **Fixed Supply & Revoked Mint Authority**:
   - Total supply is capped permanently at `1,000,000,000` ZDAY (with 6 decimals).
   - Mint authority has been permanently revoked (`None`). No new tokens can ever be minted.
2. **Revoked Freeze Authority**:
   - Freeze authority has been permanently revoked (`None`). No user account can ever be frozen or blacklisted.
3. **No Mint Close Authority**:
   - `MintCloseAuthority` was omitted at initialization. The token mint account cannot be closed or destroyed.
4. **Immutable Owner on Holder Accounts**:
   - All standard associated token accounts (ATAs) are initialized with `ImmutableOwner`.
5. **Capped Transfer Royalty**:
   - Transfer fee is set to 1% (100 bps) and capped at a maximum of 10,000 ZDAY per transfer.

---

## Reporting a Vulnerability

If you discover a security vulnerability or exploit vector regarding the repository scripts, metadata integrity, or associated tools:

1. **Private Disclosure**: Please report details via GitHub Security Advisories or contact the repository owner directly.
2. **Do Not Open Public Issues**: Please avoid opening public issues for unpatched vulnerabilities.
3. **Information to Include**:
   - Step-by-step reproduction instructions.
   - Proof of concept or simulated transaction.
   - Potential impact assessment.
