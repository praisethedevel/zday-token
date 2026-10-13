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
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  createSetAuthorityInstruction,
} = require(splPath);

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--execute');
  const endpoint = 'https://api.mainnet-beta.solana.com';

  console.log('================================================================');
  console.log('🔄 $ZDAY FEE WITHDRAWAL AUTHORITY MIGRATION');
  console.log('================================================================');
  console.log(`Network:   MAINNET-BETA`);
  console.log(`Mode:      ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Primary Account (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Payer & Target Authority: ${payer.publicKey.toBase58()}`);

  // Derive Vanity Account (joeAjn...)
  const vanitySeed = Uint8Array.from([
    202, 89, 162, 7, 9, 217, 206, 24, 239, 45, 235, 87, 25, 2, 3, 18,
    46, 152, 149, 155, 164, 120, 250, 79, 34, 228, 165, 188, 202, 152, 38, 13
  ]);
  const currentAuthority = Keypair.fromSeed(vanitySeed);
  console.log(`Current Authority:        ${currentAuthority.publicKey.toBase58()}`);

  const mint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  console.log(`Mint Account:             ${mint.toBase58()}`);

  // Create instruction to update WithheldWithdraw authority
  const ix = createSetAuthorityInstruction(
    mint,
    currentAuthority.publicKey,
    AuthorityType.WithheldWithdraw,
    payer.publicKey,
    [],
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latestBlockhash.blockhash;

  if (!isLive) {
    tx.sign(payer, currentAuthority);
    const sim = await connection.simulateTransaction(tx);
    console.log('\n--- Simulation Results ---');
    console.log(`Error: `, sim.value.err);
    console.log(`Units Consumed: `, sim.value.unitsConsumed);
    console.log(`Logs:`);
    sim.value.logs.forEach(l => console.log('  ', l));

    if (!sim.value.err) {
      console.log('\n✅ SIMULATION PASSED! Pass --execute to broadcast on Mainnet-Beta.');
    } else {
      console.error('\n❌ SIMULATION FAILED!');
      process.exit(1);
    }
  } else {
    console.log('\nBroadcasting migration transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [payer, currentAuthority],
      { commitment: 'confirmed' }
    );
    console.log('\n🎉 SUCCESS! Fee Withdrawal Authority migrated to DeoN.');
    console.log(`Signature: https://explorer.solana.com/tx/${sig}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
