const fs = require('fs');
const path = require('path');

const web3Path = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/web3.js';
const splPath = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/spl-token';

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require(web3Path);

const {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddressSync,
  getTransferFeeConfig,
  getTransferFeeAmount,
  unpackAccount,
  createHarvestWithheldTokensToMintInstruction,
  createWithdrawWithheldTokensFromMintInstruction,
} = require(splPath);

const LOG_FILE = path.resolve(__dirname, '../harvester.log');

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

async function sweepRoyalties(connection, authority, mint, destinationAta) {
  try {
    // 1. Check Mint Account
    const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
    const mintFeeConfig = getTransferFeeConfig(mintInfo);
    const mintWithheldRaw = mintFeeConfig?.withheldAmount || 0n;

    // 2. Scan accounts
    const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      filters: [{ memcmp: { offset: 0, bytes: mint.toBase58() } }],
    });

    const accountsWithFees = [];
    let totalWithheldInAccountsRaw = 0n;

    for (const acc of allAccounts) {
      try {
        const parsedAccount = unpackAccount(acc.pubkey, acc.account, TOKEN_2022_PROGRAM_ID);
        const feeAmount = getTransferFeeAmount(parsedAccount);
        if (feeAmount && feeAmount.withheldAmount > 0n) {
          accountsWithFees.push({
            address: acc.pubkey,
            withheldRaw: feeAmount.withheldAmount,
          });
          totalWithheldInAccountsRaw += feeAmount.withheldAmount;
        }
      } catch {
        // skip non-token accounts
      }
    }

    const grandTotalRaw = mintWithheldRaw + totalWithheldInAccountsRaw;
    if (grandTotalRaw === 0n) {
      log('Scan complete: 0 unharvested royalties found. All fees settled.');
      return;
    }

    const grandTotalUi = Number(grandTotalRaw) / 1_000_000;
    log(`Discovered ${grandTotalUi.toLocaleString()} $ZDAY in collectible royalties across ${accountsWithFees.length} user account(s).`);

    // 3. Build harvest & withdraw transaction
    const tx = new Transaction();

    if (accountsWithFees.length > 0) {
      const sourceKeys = accountsWithFees.map((a) => a.address);
      tx.add(
        createHarvestWithheldTokensToMintInstruction(
          mint,
          sourceKeys,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    tx.add(
      createWithdrawWithheldTokensFromMintInstruction(
        mint,
        destinationAta,
        authority.publicKey,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    tx.feePayer = authority.publicKey;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.sign(authority);

    log('Broadcasting harvest and sweep transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [authority],
      { commitment: 'confirmed' }
    );
    log(`🎉 SUCCESS! Swept ${grandTotalUi} $ZDAY into treasury: https://explorer.solana.com/tx/${sig}`);
  } catch (err) {
    log(`❌ Error in sweep cycle: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes('--once');
  const pollIntervalMinutes = 15;

  log('================================================================');
  log('🤖 $ZDAY AUTOMATED TRANSFER ROYALTY HARVESTER DAEMON STARTED');
  log('================================================================');
  log(`Mode: ${runOnce ? 'Single Run (--once)' : `Continuous Service (Every ${pollIntervalMinutes} mins)`}`);

  const endpoint = 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(endpoint, 'confirmed');

  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const mint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  const destinationAta = getAssociatedTokenAddressSync(
    mint,
    authority.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  log(`Treasury Destination ATA: ${destinationAta.toBase58()}`);

  // Run initial sweep
  await sweepRoyalties(connection, authority, mint, destinationAta);

  if (runOnce) {
    log('Exiting (--once specified).');
    process.exit(0);
  }

  // Periodic loop
  setInterval(async () => {
    log(`Periodic wakeup (${pollIntervalMinutes}m interval)...`);
    await sweepRoyalties(connection, authority, mint, destinationAta);
  }, pollIntervalMinutes * 60 * 1000);
}

main().catch((err) => {
  log(`Fatal daemon error: ${err.message}`);
  process.exit(1);
});
