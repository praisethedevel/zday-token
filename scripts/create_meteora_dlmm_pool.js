const fs = require('fs');
const path = require('path');

const web3Path = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/web3.js';
const splPath = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/spl-token';
const bnPath = '/home/joe/projects/solana/solana-sentinel/node_modules/bn.js';

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require(web3Path);

const { NATIVE_MINT } = require(splPath);
const BN = require(bnPath);
const DLMM = require('@meteora-ag/dlmm');

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--execute');
  const endpoint = 'https://api.mainnet-beta.solana.com';

  console.log('================================================================');
  console.log('🪐 $ZDAY METEORA DLMM LIQUIDITY POOL INITIALIZATION');
  console.log('================================================================');
  console.log(`Network:   MAINNET-BETA`);
  console.log(`Mode:      ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Creator / Funder (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const funder = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Creator & Funder Wallet:  ${funder.publicKey.toBase58()}`);

  const zdayMint = new PublicKey('BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD');
  console.log(`Token X ($ZDAY Mint):     ${zdayMint.toBase58()}`);
  console.log(`Token Y (WSOL Mint):      ${NATIVE_MINT.toBase58()}`);

  // Derived LB Pair Address
  const lbclmmProgramId = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');
  const [lbPair] = DLMM.deriveCustomizablePermissionlessLbPair(
    zdayMint,
    NATIVE_MINT,
    lbclmmProgramId
  );
  console.log(`Meteora LB Pair Address:  ${lbPair.toBase58()}`);

  // Check if already created
  const existingPair = await connection.getAccountInfo(lbPair);
  if (existingPair) {
    console.log('\n⚠️  Notice: This Meteora DLMM pool is already initialized on-chain!');
    console.log(`View on Meteora: https://app.meteora.ag/dlmm/${lbPair.toBase58()}`);
    return;
  }

  // Parameters
  // Bin Step: 100 bps (1.00%)
  // Base Fee: 100 bps (1.00% trading fee)
  // Initial Price: 0.0000000015 SOL per ZDAY (10M ZDAY = 0.015 SOL valuation)
  const binStep = new BN(100);
  const feeBps = new BN(100);
  const initialPrice = '0.0000000015';

  const pricePerLamport = DLMM.getPricePerLamport(6, 9, initialPrice);
  const activeId = new BN(DLMM.getBinIdFromPrice(pricePerLamport, 100, true));

  console.log(`\nPool Configuration:`);
  console.log(`  Bin Step:        100 bps (1.00%)`);
  console.log(`  Base LP Fee:     100 bps (1.00%)`);
  console.log(`  Initial Price:   ${initialPrice} SOL / ZDAY`);
  console.log(`  Active Bin ID:   ${activeId.toString()}`);

  console.log('\nBuilding initializeCustomizablePermissionlessLbPair2 transaction (Token-2022 compatible)...');
  const rawTx = await DLMM.createCustomizablePermissionlessLbPair2(
    connection,
    binStep,
    zdayMint,
    NATIVE_MINT,
    activeId,
    feeBps,
    DLMM.ActivationType.Timestamp,
    false,              // hasAlphaVault
    funder.publicKey,   // creatorKey
    null,               // activationPoint
    false,              // creatorPoolOnOffControl
    0,                  // concreteFunctionType (LimitOrder)
    0,                  // collectFeeMode (InputOnly)
    { cluster: 'mainnet-beta' }
  );

  const tx = new Transaction();
  tx.add(...rawTx.instructions);
  tx.feePayer = funder.publicKey;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(funder);


  if (!isLive) {
    console.log('Simulating pool creation on Mainnet-Beta...');
    const sim = await connection.simulateTransaction(tx);
    console.log('Simulation Error:', sim.value.err);
    console.log('Compute Units Consumed:', sim.value.unitsConsumed);
    sim.value.logs?.forEach((l) => console.log('  ', l));

    if (!sim.value.err) {
      console.log('\n✅ SIMULATION PASSED! Pass --execute to broadcast and launch the pool.');
    } else {
      console.error('\n❌ SIMULATION FAILED!');
      process.exit(1);
    }
  } else {
    console.log('Broadcasting pool creation transaction to Mainnet-Beta...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [funder],
      { commitment: 'confirmed' }
    );
    console.log('\n🎉 METEORA DLMM POOL LAUNCHED ON MAINNET-BETA!');
    console.log(`Signature: https://explorer.solana.com/tx/${sig}`);
    console.log(`Pool Page: https://app.meteora.ag/dlmm/${lbPair.toBase58()}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
