//We use this create the SHA256 hash
import crypto from 'crypto';

/**
 * Creates a salted and hashed string of hexadecimal characters. Used to encrypt
 * "safely" store user passwords.
 * @param {string} pw the password to hash
 * @param {string} salt the salt to use when hashing
 */
const generateHash = (pw: string, salt: string) => {
    console.log('Debug - Input password:', pw);
    console.log('Debug - Input salt:', salt);
    const hash = crypto.createHash('md5');
    const input = pw + salt;
    console.log('Debug - Combined input:', input);
    hash.update(input);
    const result = hash.digest('hex');
    console.log('Debug - Generated hash:', result);
    return result;
};

/**
 * Creates a random string of hexadecimal characters with the length of size.
 * @param {string} size the size (in bits) of the salt to create
 * @returns random string of hexadecimal characters
 */
const generateSalt = (size: number) => crypto.randomBytes(size).toString('hex');

const credentialingFunctions = { generateHash, generateSalt };

export { credentialingFunctions };
