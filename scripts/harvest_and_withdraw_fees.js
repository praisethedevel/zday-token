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

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--execute');
  const endpoint = 'https://api.mainnet-beta.solana.com';

  console.log('================================================================');
  console.log('🌾 $ZDAY AUTOMATED TRANSFER ROYALTY HARVESTER & TREASURY SWEEPER');
  console.log('================================================================');
  console.log(`Network:   MAINNET-BETA`);
  console.log(`Mode:      ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Fee Withdrawal Authority (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Withdrawal Authority & Treasury: ${authority.publicKey.toBase58()}`);

  const mint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  console.log(`$ZDAY Mint Account:              ${mint.toBase58()}`);

  // Destination ATA for withdrawn fees (DeoN's ATA)
  const destinationAta = getAssociatedTokenAddressSync(
    mint,
    authority.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Treasury Destination ATA:        ${destinationAta.toBase58()}\n`);

  // 1. Check Mint Account for already-harvested fees
  const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const mintFeeConfig = getTransferFeeConfig(mintInfo);
  const mintWithheldRaw = mintFeeConfig?.withheldAmount || 0n;
  const mintWithheldUi = Number(mintWithheldRaw) / 1_000_000;
  console.log(`Withheld Fees Already on Mint:   ${mintWithheldUi.toLocaleString()} ZDAY (${mintWithheldRaw} raw)`);

  // 2. Query all Token-2022 accounts for this mint
  console.log('\nScanning on-chain accounts for withheld transfer fees...');
  const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });

  console.log(`Found ${allAccounts.length} on-chain account(s) for $ZDAY.`);

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
          withheldUi: Number(feeAmount.withheldAmount) / 1_000_000,
        });
        totalWithheldInAccountsRaw += feeAmount.withheldAmount;
      }
    } catch {
      // Non-token account or unpack error
    }
  }

  if (accountsWithFees.length > 0) {
    console.log(`\nFound ${accountsWithFees.length} account(s) holding unharvested royalties:`);
    accountsWithFees.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.address.toBase58()} -> ${a.withheldUi.toLocaleString()} ZDAY`);
    });
  } else {
    console.log('No unharvested fees found in user accounts.');
  }

  const grandTotalRaw = mintWithheldRaw + totalWithheldInAccountsRaw;
  const grandTotalUi = Number(grandTotalRaw) / 1_000_000;
  console.log(`\nGrand Total Collectible Royalties: ${grandTotalUi.toLocaleString()} ZDAY`);

  if (grandTotalRaw === 0n) {
    console.log('\n✨ All fees are currently collected! Nothing to harvest or withdraw.');
    return;
  }

  // 3. Build Transaction
  const tx = new Transaction();

  // If there are accounts with fees, add harvest instruction
  if (accountsWithFees.length > 0) {
    const sourceKeys = accountsWithFees.map((a) => a.address);
    console.log(`Adding harvest instruction for ${sourceKeys.length} account(s)...`);
    tx.add(
      createHarvestWithheldTokensToMintInstruction(
        mint,
        sourceKeys,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Add withdraw instruction to sweep fees from mint to treasury
  console.log(`Adding withdraw instruction to sweep ${grandTotalUi} ZDAY to treasury ATA...`);
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

  if (!isLive) {
    console.log('\nSimulating harvest & withdraw transaction on Mainnet-Beta...');
    const sim = await connection.simulateTransaction(tx);
    console.log('Simulation Error:', sim.value.err);
    console.log('Compute Units Consumed:', sim.value.unitsConsumed);
    sim.value.logs?.forEach((l) => console.log('  ', l));

    if (!sim.value.err) {
      console.log('\n✅ SIMULATION PASSED! Pass --execute to broadcast and claim fees.');
    } else {
      console.error('\n❌ SIMULATION FAILED!');
      process.exit(1);
    }
  } else {
    console.log('\nBroadcasting harvest & withdraw transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [authority],
      { commitment: 'confirmed' }
    );
    console.log('\n🎉 SUCCESS! All $ZDAY royalties harvested and transferred to your wallet!');
    console.log(`Signature: https://explorer.solana.com/tx/${sig}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
