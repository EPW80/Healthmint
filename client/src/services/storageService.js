// src/services/storageService.js
class StorageService {
  async uploadProfileImage(file, options = {}) {
    try {
      // Validate file
      if (!file) {
        throw new Error("No file provided");
      }

      // Simulate upload progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        options.onProgress?.(progress);
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 500);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create mock response
      const mockReference = `profile-${Date.now()}-${file.name}`;

      return {
        success: true,
        reference: mockReference,
        url: URL.createObjectURL(file),
      };
    } catch (error) {
      console.error("Storage upload error:", error);
      throw new Error("Failed to upload file");
    }
  }

  async deleteProfileImage(reference) {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        message: `Successfully deleted ${reference}`,
      };
    } catch (error) {
      console.error("Storage delete error:", error);
      throw new Error("Failed to delete file");
    }
  }
}

export const storageService = new StorageService();
