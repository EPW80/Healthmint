// EncryptionUpload.js
export class EncryptionUpload {
    async generateEncryptionKey() {
        return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
        );
    }

    async exportKey(key) {
        const rawKey = await crypto.subtle.exportKey('raw', key);
        return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    }

    async encryptFile(file) {
        try {
            const initialVector = crypto.getRandomValues(new Uint8Array(16));
            const key = await this.generateEncryptionKey();
            const fileBuffer = await file.arrayBuffer();

            const encryptedFile = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: initialVector
                },
                key,
                fileBuffer
            );

            const base64 = await this.exportKey(key);

            return {
                encrypted: encryptedFile,
                initialVector: Array.from(initialVector),
                key: base64,
                filename: file.name,
                contentType: file.type
            };
        } catch (err) {
            console.error('Encryption error:', err);
            throw new Error('Failed to encrypt the file you are uploading.');
        }
    }
}