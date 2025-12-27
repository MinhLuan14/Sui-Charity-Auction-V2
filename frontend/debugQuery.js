// debugQuery.js
import { SuiClient, getFullnodeUrl } from '@mysten/sui';

const PACKAGE_ID = "0x01917a9923bd2a7e3cc11fb493a98cf2291703efd1879e5c4b6cf08125fdad08";
const FULLNODE = getFullnodeUrl('testnet');

async function main() {
    const client = new SuiClient({ url: FULLNODE });

    console.log('Client keys:', Object.keys(client));

    // If SDK exposes queryObjects, use it
    if (typeof client.queryObjects === 'function') {
        const res = await client.queryObjects({
            filter: { MoveModule: { package: PACKAGE_ID, module: 'charity_auction' } },
            options: { showContent: true, showType: true }
        });
        console.log(JSON.stringify(res, null, 2));
        return;
    }

    // Fallback: call JSON-RPC directly
    console.log('queryObjects not found on client — falling back to direct JSON-RPC call');

    const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_queryObjects',
        params: [
            {
                filter: { MoveModule: { package: PACKAGE_ID, module: 'charity_auction' } },
                options: { showContent: true, showType: true }
            }
        ]
    };

    const res = await fetch(FULLNODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const json = await res.json();
    console.log('RPC response:', JSON.stringify(json, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });