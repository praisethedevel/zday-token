# Zero-Day Syndicate ($ZDAY)

A Solana Token-2022 token.

- **Name:** Zero-Day Syndicate
- **Symbol:** ZDAY
- **Decimals:** 6
- **Supply:** 1,000,000,000
- **Extensions:** native on-chain metadata, 1% transfer fee (capped)
- **Mainnet mint address:** not deployed yet

## Files

- `token.json`: metadata referenced by the on-chain `uri`
- `zday.png`: logo (512x512)
- `scripts/create_custom_token2022.js`: deploy script; dry run by default, `--devnet` or `--mainnet` to broadcast
- `scripts/deploy_hardened_zday.js`: same, plus revokes mint and freeze authority (irreversible)
- `scripts/check_rugcheck.js`: queries the RugCheck API for a mint

## Notes

The scripts load `@solana/web3.js`, `@solana/spl-token` and `@solana/spl-token-metadata` from hardcoded `/home/joe/projects/solana/solana-sentinel/node_modules` paths and read the signer from `~/.config/solana/id.json`. Adjust those paths if you run them elsewhere. No key material is stored in this repo.
