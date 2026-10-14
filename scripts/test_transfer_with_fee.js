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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedWithFeeInstruction,
} = require(splPath);

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--execute');
  const endpoint = 'https://api.mainnet-beta.solana.com';

  console.log('================================================================');
  console.log('🧪 $ZDAY TEST PEER-TO-PEER TRANSFER (WITH 1% WITHHELD ROYALTY)');
  console.log('================================================================');
  console.log(`Network:   MAINNET-BETA`);
  console.log(`Mode:      ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Payer / Sender (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const senderKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Sender Wallet:    ${senderKeypair.publicKey.toBase58()}`);

  const mint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  console.log(`$ZDAY Mint:       ${mint.toBase58()}`);

  const sourceAta = getAssociatedTokenAddressSync(
    mint,
    senderKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Source ATA:       ${sourceAta.toBase58()}`);

  // Recipient (Vanity Address: joeAjnLtpyG7QcWoH16eabasDdypauWLtY5m2LVjWPE)
  const recipientWallet = new PublicKey('joeAjnLtpyG7QcWoH16eabasDdypauWLtY5m2LVjWPE');
  console.log(`Recipient Wallet: ${recipientWallet.toBase58()}`);

  const recipientAta = getAssociatedTokenAddressSync(
    mint,
    recipientWallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Recipient ATA:    ${recipientAta.toBase58()}`);

  // Transfer parameters: 1,000 $ZDAY total, 1% fee = 10 $ZDAY
  const decimals = 6;
  const transferAmountUi = 1000;
  const transferAmountRaw = BigInt(transferAmountUi) * 1_000_000n; // 1,000,000,000 raw
  const expectedFeeUi = 10;
  const expectedFeeRaw = BigInt(expectedFeeUi) * 1_000_000n;       // 10,000,000 raw
  const netReceivedUi = transferAmountUi - expectedFeeUi;          // 990 ZDAY

  console.log(`\nTransfer Plan:`);
  console.log(`  Gross Transfer:  ${transferAmountUi.toLocaleString()} $ZDAY`);
  console.log(`  Expected Fee:    ${expectedFeeUi.toLocaleString()} $ZDAY (1.00% withheld)`);
  console.log(`  Net Received:    ${netReceivedUi.toLocaleString()} $ZDAY`);

  // Build Transaction
  const tx = new Transaction();

  // 1. Idempotently create recipient ATA if it does not already exist
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      senderKeypair.publicKey,
      recipientAta,
      recipientWallet,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // 2. TransferCheckedWithFee
  tx.add(
    createTransferCheckedWithFeeInstruction(
      sourceAta,
      mint,
      recipientAta,
      senderKeypair.publicKey,
      transferAmountRaw,
      decimals,
      expectedFeeRaw,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  tx.feePayer = senderKeypair.publicKey;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(senderKeypair);

  if (!isLive) {
    console.log('\nSimulating transfer on Mainnet-Beta...');
    const sim = await connection.simulateTransaction(tx);
    console.log('Simulation Error:', sim.value.err);
    console.log('Compute Units Consumed:', sim.value.unitsConsumed);
    sim.value.logs?.forEach((l) => console.log('  ', l));

    if (!sim.value.err) {
      console.log('\n✅ SIMULATION PASSED! Pass --execute to broadcast the live transfer.');
    } else {
      console.error('\n❌ SIMULATION FAILED!');
      process.exit(1);
    }
  } else {
    console.log('\nBroadcasting live transfer transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [senderKeypair],
      { commitment: 'confirmed' }
    );
    console.log('\n🎉 TRANSFER CONFIRMED!');
    console.log(`Signature: https://explorer.solana.com/tx/${sig}`);
    console.log(`Recipient ${recipientAta.toBase58()} received ${netReceivedUi} $ZDAY.`);
    console.log(`Withheld on recipient account: ${expectedFeeUi} $ZDAY (ready for harvest).`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
