import { POH_API_URL } from './constant.js';
import fs from 'fs/promises';

export async function getSignaturePoH(address) {
    if (!address || typeof address !== 'string') {
        throw new Error('A valid address string must be provided.');
    }

    const res = await fetch(
        `${POH_API_URL}/${address}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/plain'
            }
        }
    );

    return res.text();
}

export async function readPrivateKeys(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('A valid file path string must be provided.');
    }

    if (!filePath.endsWith('.pk')) {
        throw new Error('Private key file must have a .pk extension.');
    }

    const data = await fs.readFile(filePath, 'utf-8');
    const privateKeys = data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (privateKeys.length === 0) {
        throw new Error('Private key file is empty.');
    }

    return privateKeys;
}
