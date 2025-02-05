// EncryptionUpload.js
export class EncryptionUpload {

    // accepted file types
    acceptedFileTypes = {
        'application/pdf': ['.pdf']
    };

    validContentType(file){
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        const isValidFile = Object.entries(this.acceptedFileTypes).some(([mimeType, extensions]) => {
            return file.type === mimeType || extensions.includes(fileExtension);
        });

        if (!isValidFile) {
            const validExtension = Object.values(this.acceptedFileTypes).flat();
            throw new Error(
                `Invalid file type. Valid file types are: ${validExtensions.join(',')}`
            );
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be 10MB or less');
        }
        return true;
    }

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
                contentType: file.type,
                fileSize: file.size
            };
        } catch (err) {
            console.error('Encryption error:', err);
            throw new Error('Failed to encrypt the file you are uploading.');
        }
    }
    getAcceptedFileTypes() {
        return Object.values(this.acceptedFileTypes).flat();
    }
}