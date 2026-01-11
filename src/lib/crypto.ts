import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

export const encryptData = (text: string): string => {
  if (!text) return '';
  return AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptData = (cipherText: string): string => {
  if (!cipherText) return '';
  try {
    const bytes = AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(encUtf8);
  } catch (e) {
    return '**Decryption Error**';
  }
};