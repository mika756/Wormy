import dotenv from 'dotenv';

dotenv.config({ override: false, quiet: true });

export const CONFIG = {
    vaultContractAddress: process.env.VAULT_CONTRACT_ADDRESS || '0xDefaultVaultAddress',
    vaultAbi: process.env.VAULT_ABI || '',
    rpcUrl: process.env.RPC_URL || 'https://default-rpc-url.com',
    chainId: parseInt(process.env.CHAIN_ID, 10) || 0,
    privateKeyPath: process.env.PRIVATE_KEY_PATH || './privateKey.txt',
    value: process.env.VALUE || '0',
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS || '0.04',
    maxFeePerGas: process.env.MAX_FEE_PER_GAS || '0.05',
}
