const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const bs58Module = require('/home/joe/projects/solana/solana-sentinel/node_modules/bs58');
const bs58Encode = bs58Module.default ? bs58Module.default.encode : bs58Module.encode;

function main() {
  const mintAddress = 'BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD';
  const repoUrl = 'https://github.com/praisethedevel/zday-token';
  const metadataUri = 'https://raw.githubusercontent.com/praisethedevel/zday-token/main/token.json';
  const logoUri = 'https://raw.githubusercontent.com/praisethedevel/zday-token/main/zday.png';

  // Load Update Authority Keypair (DeoN4q...)
  const keypairPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const seed = Buffer.from(secretKey.slice(0, 32));
  const pub = Buffer.from(secretKey.slice(32, 64));

  const privKey = crypto.createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8'
  });

  const authorityPubkey = bs58Encode(pub);
  const timestamp = new Date().toISOString();

  // Canonical statement to prove ownership
  const messageText = `Zero-Day Syndicate ($ZDAY) Official Verification\nMint: ${mintAddress}\nAuthority: ${authorityPubkey}\nRepository: ${repoUrl}\nTimestamp: ${timestamp}`;
  const messageBytes = Buffer.from(messageText, 'utf8');

  // Sign with Ed25519
  const signatureBytes = crypto.sign(null, messageBytes, privKey);
  const signatureBase58 = bs58Encode(signatureBytes);

  console.log('================================================================');
  console.log('🛡️  $ZDAY OFFICIAL ECOSYSTEM VERIFICATION DOSSIER');
  console.log('================================================================');
  console.log(`Token Name:       Zero-Day Syndicate`);
  console.log(`Symbol:           ZDAY`);
  console.log(`Mint Address:     ${mintAddress}`);
  console.log(`Update Authority: ${authorityPubkey}`);
  console.log(`GitHub Repo:      ${repoUrl}`);
  console.log(`Metadata URI:     ${metadataUri}`);
  console.log(`Logo URL (PNG):   ${logoUri}`);
  console.log(`Timestamp:        ${timestamp}`);
  console.log('----------------------------------------------------------------');
  console.log('📝 VERIFICATION STATEMENT:');
  console.log(messageText);
  console.log('----------------------------------------------------------------');
  console.log('🔑 CRYPTOGRAPHIC SIGNATURE (Base58):');
  console.log(signatureBase58);
  console.log('================================================================\n');

  // Save JSON dossier to disk
  const dossier = {
    tokenName: 'Zero-Day Syndicate',
    tokenSymbol: 'ZDAY',
    decimals: 6,
    mintAddress,
    updateAuthority: authorityPubkey,
    repository: repoUrl,
    metadataUri,
    logoUri,
    timestamp,
    messageText,
    signatureBase58,
    solscanSubmissionUrl: `https://solscan.io/token/${mintAddress}`,
  };

  const outputPath = path.resolve(__dirname, '../verification_dossier.json');
  fs.writeFileSync(outputPath, JSON.stringify(dossier, null, 2), 'utf8');
  console.log(`✅ Saved complete dossier to: ${outputPath}`);
}

main();
