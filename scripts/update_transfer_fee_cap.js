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
  createSetTransferFeeInstruction,
} = require(splPath);

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--execute');
  const endpoint = 'https://api.mainnet-beta.solana.com';

  // Desired maximum fee: 10,000 ZDAY
  // Decimals = 6 -> 10,000 * 1,000,000 = 10,000,000,000 raw units
  const targetZdayMax = 10_000n;
  const rawMaxFee = targetZdayMax * 1_000_000n;
  const bps = 100; // 1.00%

  console.log('================================================================');
  console.log('⚙️  $ZDAY MAXIMUM TRANSFER FEE ADJUSTMENT');
  console.log('================================================================');
  console.log(`Network:          MAINNET-BETA`);
  console.log(`Execution Mode:   ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);
  console.log(`Transfer Fee:     ${bps / 100}% (${bps} bps)`);
  console.log(`New Maximum Fee:  ${targetZdayMax.toLocaleString()} ZDAY (${rawMaxFee.toString()} raw units)`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Config Authority Keypair (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Config Authority: ${authority.publicKey.toBase58()}`);

  const mint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  console.log(`Mint Account:     ${mint.toBase58()}`);

  const ix = createSetTransferFeeInstruction(
    mint,
    authority.publicKey,
    [],
    bps,
    rawMaxFee,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = authority.publicKey;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(authority);

  if (!isLive) {
    console.log('\nSimulating transaction on Mainnet-Beta...');
    const sim = await connection.simulateTransaction(tx);
    console.log('Simulation Error:', sim.value.err);
    console.log('Compute Units:', sim.value.unitsConsumed);
    sim.value.logs.forEach(l => console.log('  ', l));

    if (!sim.value.err) {
      console.log('\n✅ SIMULATION SUCCESSFUL! Pass --execute to broadcast live.');
    } else {
      console.error('\n❌ SIMULATION FAILED!');
      process.exit(1);
    }
  } else {
    console.log('\nBroadcasting update transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [authority],
      { commitment: 'confirmed' }
    );
    console.log('\n🎉 SUCCESS! Maximum transfer fee cap updated on Mainnet.');
    console.log(`Signature: https://explorer.solana.com/tx/${sig}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
