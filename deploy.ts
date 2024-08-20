import * as fs from 'fs';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { mnemonicToWalletKey } from 'ton-crypto';
import tonMnemonic from 'tonweb-mnemonic';
import { TonClient, WalletContractV4 } from 'ton';
import {
    HighloadWalletV3,
    HighloadWalletV3Code
} from './wrappers/HighloadWalletV3';

async function main() {
    // initialize ton rpc client on testnet
    const endpoint = await getHttpEndpoint({ network: 'testnet' });
    const client = new TonClient({ endpoint });

    const genMnemoHighLoad = await tonMnemonic.generateMnemonic();
    const keyPair = await mnemonicToWalletKey(genMnemoHighLoad);
    const { publicKey, secretKey } = keyPair;
    const highloadWallet = HighloadWalletV3.createFromConfig(
        { publicKey: publicKey, timeout: 60 * 60, subwalletId: 1 },
        HighloadWalletV3Code,
        0
    );

    const masterMnemo = 'frozen solution shoot army dragon canyon brave ketchup visual unfair permit artwork spawn nothing boat nature quality loud spawn gift target face card cloth';
    const key = await mnemonicToWalletKey(masterMnemo.split(' '));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    if (!await client.isContractDeployed(wallet.address)) {
        return console.log('wallet is not deployed');
    }

    // open wallet and read the current seqno of the wallet
    const walletContract = client.open(wallet);
    const provider = client.open(highloadWallet);
    const walletSender = walletContract.sender(key.secretKey);
    const seqno = await walletContract.getSeqno();
    await highloadWallet.sendDeploy(provider, walletSender, BigInt(0.1));

    // wait until confirmed
    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
        console.log('waiting for deploy transaction to confirm...');
        await sleep(1500);
        currentSeqno = await walletContract.getSeqno();
    }
    console.log('deploy transaction confirmed!');
}

main().catch(console.error);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}