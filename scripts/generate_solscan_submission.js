const fs = require('fs');
const path = require('path');

function main() {
  const dossierPath = path.resolve(__dirname, '../verification_dossier.json');
  if (!fs.existsSync(dossierPath)) {
    console.error('Error: verification_dossier.json not found!');
    process.exit(1);
  }

  const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf8'));

  console.log('================================================================');
  console.log('🛡️  SOLSCAN TOKEN VERIFICATION SUBMISSION PACKAGE ($ZDAY)');
  console.log('================================================================\n');

  console.log('1. Direct Submission Portal URL:');
  console.log(`   👉 https://solscan.io/token/${dossier.mintAddress}#metadata`);
  console.log('   (Click "Update Token Info" or submit via Solscan Community Token List)\n');

  console.log('2. Copy & Paste Form Fields:');
  console.log('----------------------------------------------------------------');
  console.log(`• Token Mint Address:       ${dossier.mintAddress}`);
  console.log(`• Token Name:               ${dossier.tokenName}`);
  console.log(`• Token Symbol:             ${dossier.tokenSymbol}`);
  console.log(`• Decimals:                 ${dossier.decimals}`);
  console.log(`• Update Authority Wallet:  ${dossier.updateAuthority}`);
  console.log(`• Project Website / GitHub: ${dossier.repository}`);
  console.log(`• Token Metadata URI:       ${dossier.metadataUri}`);
  console.log(`• Logo Image URL (PNG):     ${dossier.logoUri}`);
  console.log(`• Tags / Categories:        Security, Cybersecurity, DeFi, Token-2022`);
  console.log('----------------------------------------------------------------\n');

  console.log('3. Cryptographic Proof of Ownership:');
  console.log('----------------------------------------------------------------');
  console.log('• Exact Message Signed:');
  console.log('"""');
  console.log(dossier.messageText);
  console.log('"""\n');
  console.log('• Base58 Signature:');
  console.log(`  ${dossier.signatureBase58}\n`);
  console.log('• Signer Public Key:');
  console.log(`  ${dossier.updateAuthority}`);
  console.log('----------------------------------------------------------------\n');

  console.log('✅ Dossier verified and ready for Solscan / Ecosystem submission!');
}

main();
