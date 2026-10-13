# Zero-Day Syndicate ($ZDAY)

Zero-Day Syndicate ($ZDAY) is a hardened, fixed-supply Solana Token-2022 asset equipped with native on-chain metadata and a capped 1% transfer royalty.

---

## Token Specifications

- **Name:** Zero-Day Syndicate
- **Symbol:** ZDAY
- **Decimals:** 6
- **Total Supply:** 1,000,000,000 ZDAY (100% fixed, non-inflationary)
- **Token Program:** Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
- **Mainnet Mint Address:** [`BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD`](https://explorer.solana.com/address/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD)

---

## Verification & Explorers

- **Solana Explorer:** [explorer.solana.com/address/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD](https://explorer.solana.com/address/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD)
- **Solscan:** [solscan.io/token/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD](https://solscan.io/token/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD)
- **RugCheck Audit:** [rugcheck.xyz/tokens/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD](https://rugcheck.xyz/tokens/BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD)

---

## On-Chain Authority & Hardening

| Authority | On-Chain Status | Controller | Security Impact |
|---|---|---|---|
| **Mint Authority** | **REVOKED** | `None` | Supply is strictly locked at 1B. No additional tokens can ever be minted. |
| **Freeze Authority** | **REVOKED** | `None` | Zero blacklist capability. User token accounts cannot be frozen. |
| **Mint Close Authority** | **OMITTED** | `None` | Mint account can never be closed or destroyed. |
| **Fee Config Authority** | Active | `DeoN4qmakKDMfGHJ54FzQ4AGBXmNcfZRyuA5uvemsKWP` | Controls fee percentage and maximum fee ceiling. |
| **Fee Withdrawal Authority** | Active | `DeoN4qmakKDMfGHJ54FzQ4AGBXmNcfZRyuA5uvemsKWP` | Authorized to withdraw accumulated transfer royalties. |
| **Metadata Update Authority** | Active | `DeoN4qmakKDMfGHJ54FzQ4AGBXmNcfZRyuA5uvemsKWP` | Authorized to update metadata pointer and URI. |

---

## Transfer Royalty Mechanism

- **Transfer Fee:** 1.00% (100 basis points)
- **Maximum Fee Cap:** 10,000 ZDAY (transfers above 1,000,000 ZDAY pay at most 10k ZDAY)
- **Architecture:** Token-2022 lazy fee withholding. Fees remain in recipient token accounts without causing global transaction contention, and are harvested/withdrawn to the treasury on demand.

---

## Repository Files

- `token.json`: Off-chain metadata referenced by the on-chain metadata URI pointer.
- `zday.png`: Official 512x512 token logo.
- `SECURITY.md`: Security policy and vulnerability disclosure procedures.
- `scripts/deploy_hardened_zday.js`: Hardened Token-2022 deployment script with irreversible mint/freeze revocation.
- `scripts/migrate_fee_withdrawal_authority.js`: Script to migrate fee withdrawal permissions between accounts.
- `scripts/update_transfer_fee_cap.js`: Script to adjust maximum transfer royalty caps.
- `scripts/check_rugcheck.js`: Automated query script for the RugCheck API.

---

## Toolchain Notes

The scripts resolve `@solana/web3.js`, `@solana/spl-token`, and `@solana/spl-token-metadata` from `/home/joe/projects/solana/solana-sentinel/node_modules` and read the signer keypair from `~/.config/solana/id.json`. Adjust paths accordingly if executing in alternate environments. No private keys are committed to this repository.
