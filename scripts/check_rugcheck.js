const https = require('https');

async function fetchRugCheck(mint) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${mint}/report`;

  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RugCheckCLI/1.0)',
          Accept: 'application/json',
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`RugCheck API HTTP ${res.statusCode}: ${data}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`));
          }
        });
      }
    ).on('error', reject);
  });
}

async function main() {
  const mint = process.argv[2];
  if (!mint) {
    console.log('Usage: node check_rugcheck.js <TOKEN_MINT_ADDRESS>');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🔍 RUGCHECK.XYZ AUTOMATED CONTRACT AUDIT');
  console.log('====================================================');
  console.log(`Scanning Mint: ${mint}...\n`);

  try {
    const report = await fetchRugCheck(mint);

    const score = report.score ?? 0;
    let rating = 'GOOD (Low Risk)';
    if (score > 2000) rating = 'DANGER (High Risk)';
    else if (score > 500) rating = 'WARNING (Medium Risk)';

    console.log(`Token Name:        ${report.tokenMeta?.name || 'N/A'} (${report.tokenMeta?.symbol || 'N/A'})`);
    console.log(`Program:           ${report.tokenProgram === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token-2022' : 'SPL Token'}`);
    console.log(`Mint Authority:    ${report.token?.mintAuthority ? report.token.mintAuthority : 'REVOKED (Safe ✅)'}`);
    console.log(`Freeze Authority:  ${report.token?.freezeAuthority ? report.token.freezeAuthority : 'REVOKED (Safe ✅)'}`);
    console.log(`Total Supply:      ${report.token?.supply ? (Number(report.token.supply) / 10 ** (report.token.decimals || 6)).toLocaleString() : 'N/A'}`);
    console.log('----------------------------------------------------');
    console.log(`RugCheck Score:    ${score} / 10000`);
    console.log(`Overall Rating:    ${rating}`);
    console.log('----------------------------------------------------');

    if (report.risks && report.risks.length > 0) {
      console.log('Identified Risk Factors:');
      report.risks.forEach(r => {
        const icon = r.level === 'danger' ? '🔴' : r.level === 'warn' ? '🟡' : '🟢';
        console.log(`  ${icon} [${r.name}] ${r.description} (Risk +${r.score})`);
      });
    } else {
      console.log('🎉 Zero risk factors detected! Perfect clean contract.');
    }

    console.log(`\nView Full Report: https://rugcheck.xyz/tokens/${mint}`);
  } catch (err) {
    console.error('RugCheck Scan Error:', err.message);
    process.exit(1);
  }
}

main();
