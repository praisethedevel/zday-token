const fs = require('fs');
const path = require('path');

// Resolve modules from solana-sentinel node_modules to guarantee 100% compatibility
const web3Path = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/web3.js';
const splPath = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/spl-token';
const metaPath = '/home/joe/projects/solana/solana-sentinel/node_modules/@solana/spl-token-metadata';

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require(web3Path);

const {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeTransferFeeConfigInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} = require(splPath);

const {
  createInitializeInstruction: createInitializeMetadataInstruction,
  pack,
} = require(metaPath);

async function main() {
  const args = process.argv.slice(2);
  const isMainnet = args.includes('--mainnet');
  const isLive = isMainnet || args.includes('--devnet');
  const endpoint = isMainnet
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

  console.log('====================================================');
  console.log('🚀 ZERO-DAY SYNDICATE ($ZDAY) TOKEN-2022 GENERATOR');
  console.log('====================================================');
  console.log(`Network: ${isMainnet ? 'MAINNET-BETA' : 'DEVNET'}`);
  console.log(`Mode:    ${isLive ? 'LIVE BROADCAST' : 'DRY RUN (SIMULATION)'}`);

  const connection = new Connection(endpoint, 'confirmed');

  // Load Creator Keypair
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Payer/Creator: ${payer.publicKey.toBase58()}`);

  // Fee Treasury (Your Vanity Address)
  const feeTreasury = new PublicKey('joeAjnLtpyG7QcWoH16eabasDdypauWLtY5m2LVjWPE');
  console.log(`Fee Treasury:  ${feeTreasury.toBase58()}`);

  // Token Parameters
  const decimals = 6;
  const initialSupply = 1_000_000_000n * 10n ** BigInt(decimals); // 1 Billion tokens
  const feeBasisPoints = 100; // 1.00%
  const maxFee = 10_000_000n * 10n ** BigInt(decimals); // Max fee cap: 10M tokens

  // Token Metadata
  const tokenMetadata = {
    updateAuthority: payer.publicKey,
    mint: PublicKey.default,
    name: 'Zero-Day Syndicate',
    symbol: 'ZDAY',
    uri: 'https://raw.githubusercontent.com/praisethedevel/zday-token/main/token.json',
    additionalMetadata: [],
  };

  // Generate unique Mint Keypair
  const mintKeypair = Keypair.generate();
  tokenMetadata.mint = mintKeypair.publicKey;
  console.log(`\nMint Address:  ${mintKeypair.publicKey.toBase58()}`);

  // Calculate Account Space & Rent
  const extensions = [ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  const packedMeta = pack(tokenMetadata);
  const metaRent =
    (await connection.getMinimumBalanceForRentExemption(mintLen + 4 + packedMeta.length)) -
    mintRent;

  const totalRentSOL = (mintRent + metaRent) / 1e9;
  console.log(`Base Mint Space: ${mintLen} bytes (Rent: ${mintRent / 1e9} SOL)`);
  console.log(`Metadata Space:  ${packedMeta.length + 4} bytes (Rent: ${metaRent / 1e9} SOL)`);
  console.log(`Total Rent Cost: ${totalRentSOL} SOL`);

  // Build Transaction
  const tx = new Transaction();

  // 1. Create Mint Account (base space with fixed extensions)
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize Transfer Fee Config (1% fee to feeTreasury)
  tx.add(
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      payer.publicKey, // transferFeeConfigAuthority
      feeTreasury,     // withdrawWithheldAuthority (Fee Treasury)
      feeBasisPoints,  // 100 bps = 1%
      maxFee,          // maximum fee
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Initialize Metadata Pointer (pointing to mint account itself)
  tx.add(
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      payer.publicKey,       // authority
      mintKeypair.publicKey, // metadataAddress
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Initialize Mint
  tx.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer.publicKey, // mintAuthority
      payer.publicKey, // freezeAuthority
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 5. Transfer Extra Rent to Mint for Metadata Storage
  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: mintKeypair.publicKey,
      lamports: metaRent,
    })
  );

  // 6. Initialize Native On-Chain Metadata
  tx.add(
    createInitializeMetadataInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mintKeypair.publicKey,
      updateAuthority: payer.publicKey,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      uri: tokenMetadata.uri,
    })
  );

  // 7. Create Associated Token Account for Payer
  const payerAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  tx.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      payerAta,
      payer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 8. Mint Initial Supply (1,000,000,000 ZDAY) to Creator ATA
  tx.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      payerAta,
      payer.publicKey,
      initialSupply,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  tx.feePayer = payer.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;

  if (!isLive) {
    console.log('\nSimulating transaction against network...');
    tx.sign(payer, mintKeypair);
    const sim = await connection.simulateTransaction(tx);
    if (sim.value.err) {
      console.error('Simulation Failed:', JSON.stringify(sim.value.err, null, 2));
      console.error('Logs:', sim.value.logs);
      process.exit(1);
    }
    console.log('✅ SIMULATION 100% SUCCESSFUL!');
    console.log(`Units Consumed: ${sim.value.unitsConsumed} CUs`);
    console.log('\nReady to deploy! To broadcast live, run with:');
    console.log('  node create_custom_token2022.js --mainnet');
    return;
  }

  console.log('\nBroadcasting transaction live on-chain...');
  const signature = await sendAndConfirmTransaction(connection, tx, [payer, mintKeypair], {
    commitment: 'confirmed',
  });

  console.log('\n🎉 $ZDAY TOKEN SUCCESSFULLY DEPLOYED!');
  console.log(`Signature: ${signature}`);
  console.log(`Mint:      ${mintKeypair.publicKey.toBase58()}`);
  console.log(`Holder:    ${payerAta.toBase58()}`);
  console.log(`Explorer:  https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}${isMainnet ? '' : '?cluster=devnet'}`);
}

main().catch(err => {
  console.error('\nFatal Error:', err);
  process.exit(1);
});
