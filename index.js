import { ethers } from 'ethers';
import { CONFIG } from './src/config.js';
import { readPrivateKeys, getSignaturePoH } from './src/helper.js';
import { parseArgs, sleep } from './src/args.js';
import { LOGS_DIR } from './src/constant.js';
import fs from 'fs/promises';
import path from 'path';

function getWalletInfo(privateKey) {
    if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('A valid private key string must be provided.');
    }

    const wallet = new ethers.Wallet(privateKey);

    return {
        address: wallet.address,
        publicKey: wallet.publicKey
    };
}

async function getBalance(provider, address) {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
}

async function writeLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const logFile = path.join(LOGS_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(logFile, logMessage);
}

async function signContract(privateKey, rpc, contractAddress, abi, chainId, address, value = '0', maxPriorityFee = '0.04', maxFee = '0.05') {
    if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('A valid private key string must be provided.');
    }
    if (!rpc || typeof rpc !== 'string') {
        throw new Error('A valid RPC URL string must be provided.');
    }
    if (!contractAddress || typeof contractAddress !== 'string') {
        throw new Error('A valid contract address string must be provided.');
    }
    if (!abi || typeof abi !== 'string') {
        throw new Error('A valid ABI string must be provided.');
    }

    const network = chainId ? { chainId, name: 'custom', ensAddress: null } : undefined;
    const provider = new ethers.JsonRpcProvider(rpc, network);
    const signer   = new ethers.Wallet(privateKey, provider);
    
    const balance = await getBalance(provider, address);
    const requiredValue = value !== '0' ? parseFloat(value) : 0;
    
    if (parseFloat(balance) < requiredValue) {
        throw new Error(`Insufficient balance. Has: ${balance} ETH, Needs: ${requiredValue} ETH + gas`);
    }
    
    const signature = await getSignaturePoH(address);
    
    const abiArray = [ abi ];
    const vault = new ethers.Contract(contractAddress, abiArray, signer);
    
    const funcName = abi.match(/function\s+(\w+)/)[1];

    const txOptions = value !== '0' ? { value: ethers.parseEther(value) } : {};
    
    txOptions.maxPriorityFeePerGas = ethers.parseUnits(maxPriorityFee, 'gwei');
    txOptions.maxFeePerGas = ethers.parseUnits(maxFee, 'gwei');
    
    try {
        const estimatedGas = await vault[funcName].estimateGas(signature, txOptions);
        txOptions.gasLimit = estimatedGas * 120n / 100n;
    } catch (gasError) {
        throw gasError;
    }
    
    const txResponse = await vault[funcName](signature, txOptions);
    const txReceipt = await txResponse.wait();
    
    return txReceipt;
}

async function main() {
    try {
        const options = parseArgs();
        
        const privateKeys = await readPrivateKeys(CONFIG.privateKeyPath);
        console.log(`Processing ${privateKeys.length} wallet(s)...`);
        
        let totalSuccess = 0;
        let totalFailed = 0;
        
        for (let pkIndex = 0; pkIndex < privateKeys.length; pkIndex++) {
            const privateKey = privateKeys[pkIndex];
            const privateKeyHex = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
            
            const walletInfo = getWalletInfo(privateKeyHex);
            const walletLabel = `Wallet ${pkIndex + 1}/${privateKeys.length}`;
            
            await writeLog(`${walletLabel} - Address: ${walletInfo.address}`);
            
            for (let i = 0; i < options.count; i++) {
                try {
                    process.stdout.write(`\r${walletLabel} [${i + 1}/${options.count}] Processing...`);
                    
                    const txReceipt = await signContract(
                        privateKeyHex,
                        CONFIG.rpcUrl,
                        CONFIG.vaultContractAddress,
                        CONFIG.vaultAbi,
                        CONFIG.chainId,
                        walletInfo.address,
                        CONFIG.value,
                        CONFIG.maxPriorityFeePerGas,
                        CONFIG.maxFeePerGas
                    );
                    
                    const status = txReceipt.status === 1 ? 'Success' : 'Failed';
                    if (txReceipt.status === 1) {
                        totalSuccess++;
                        process.stdout.write(`\r${walletLabel} [${i + 1}/${options.count}] ✓ ${txReceipt.hash}\n`);
                    } else {
                        totalFailed++;
                        process.stdout.write(`\r${walletLabel} [${i + 1}/${options.count}] ✗ ${txReceipt.hash}\n`);
                    }
                    
                    await writeLog(`${walletLabel} TX${i + 1} - ${status} - Hash: ${txReceipt.hash}`);
                    
                    if (i < options.count - 1 && options.delay > 0) {
                        await sleep(options.delay);
                    }
                } catch (error) {
                    totalFailed++;
                    process.stdout.write(`\r${walletLabel} [${i + 1}/${options.count}] ✗ Failed\n`);
                    await writeLog(`${walletLabel} TX${i + 1} - Error: ${error.message}`);
                }
            }
            
            if (pkIndex < privateKeys.length - 1 && options.delay > 0) {
                await sleep(options.delay);
            }
        }

        console.log(`\n✓ Done! Success: ${totalSuccess} | Failed: ${totalFailed}`);
        await writeLog(`Summary - Success: ${totalSuccess}, Failed: ${totalFailed}`);
    } catch (error) {
        console.error('Error:', error.message);
        await writeLog(`Fatal Error: ${error.message}`);
        process.exit(1);
    }
}

main();
