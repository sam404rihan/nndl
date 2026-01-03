import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

// This key is accessed on the server environment.
// Even though it uses the NEXT_PUBLIC_ variable name (for compatibility),
// this file should NEVER be imported in a Client Component.
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

export const decryptDataServer = (cipherText: string): string => {
    if (!cipherText) return '';
    try {
        const bytes = AES.decrypt(cipherText, SECRET_KEY);
        return bytes.toString(encUtf8);
    } catch (e) {
        console.error('Server Decryption Error:', e);
        return '**Decryption Error**';
    }
};
