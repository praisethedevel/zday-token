const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZDAYBot/1.0)' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    ).on('error', (e) => resolve({ status: 500, error: e.message }));
  });
}

async function main() {
  const mint = process.argv[2] || 'BhfR1iTzMQch2FSF23DCyzHGp52kQXtPGkxURb5HisD';

  console.log('================================================================');
  console.log('📡 $ZDAY ECOSYSTEM INDEXING & VERIFICATION STATUS CHECKER');
  console.log('================================================================');
  console.log(`Target Mint: ${mint}\n`);

  // 1. DexScreener
  process.stdout.write('Checking DexScreener API... ');
  const dexscreener = await get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
  const pairs = dexscreener.body?.pairs || [];
  if (pairs.length > 0) {
    console.log(`✅ FOUND ${pairs.length} ACTIVE PAIR(S)!`);
    pairs.forEach((p) => {
      console.log(`   - DEX: ${p.dexId.toUpperCase()} | Pair: ${p.pairAddress} | Price: $${p.priceUsd || 'N/A'}`);
    });
  } else {
    console.log('⏳ NO PAIRS FOUND');
    console.log('   (DexScreener will automatically index within ~60s once a Raydium/Meteora pool is created)');
  }

  // 2. Jupiter Token Routing API
  process.stdout.write('\nChecking Jupiter Routing API... ');
  const jup = await get(`https://tokens.jup.ag/token/${mint}`);
  if (jup.status === 200 && jup.body?.address) {
    console.log(`✅ INDEXED BY JUPITER!`);
    console.log(`   Name: ${jup.body.name} (${jup.body.symbol})`);
  } else {
    console.log('⏳ NOT ROUTABLE YET');
    console.log('   (Jupiter routes automatically once an on-chain AMM pool with liquidity exists)');
  }

  // 3. RugCheck Safety Audit
  process.stdout.write('\nChecking RugCheck Security Audit... ');
  const rug = await get(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`);
  if (rug.status === 200 && rug.body?.tokenMeta) {
    console.log(`✅ AUDIT ACTIVE`);
    console.log(`   Score: ${rug.body.score} | Mint Authority: ${rug.body.token?.mintAuthority ? 'ACTIVE' : 'REVOKED ✅'} | Freeze Authority: ${rug.body.token?.freezeAuthority ? 'ACTIVE' : 'REVOKED ✅'}`);
    console.log(`   Full Report: https://rugcheck.xyz/tokens/${mint}`);
  } else {
    console.log('⚠️  RugCheck report unavailable or rate limited.');
  }

  // 4. Explorer Links
  console.log('\n----------------------------------------------------------------');
  console.log('Direct Verification Links:');
  console.log(`• Solana Explorer: https://explorer.solana.com/address/${mint}`);
  console.log(`• Solscan:         https://solscan.io/token/${mint}`);
  console.log(`• DexScreener:     https://dexscreener.com/solana/${mint}`);
  console.log(`• RugCheck:        https://rugcheck.xyz/tokens/${mint}`);
  console.log('----------------------------------------------------------------\n');
}

main().catch(console.error);
