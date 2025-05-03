import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

class LocalStorageService {
  constructor() {
    this.initialized = false;
    this.uploadDir = path.join(process.cwd(), "uploads");
  }

  async initialize() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.initialized = true;
      console.log("✅ Local storage service initialized at", this.uploadDir);
      return this;
    } catch (error) {
      console.error("❌ Failed to initialize local storage:", error);
      throw error;
    }
  }

  async storeFile(file) {
    if (!this.initialized) {
      throw new Error("Storage service not initialized");
    }

    const fileId = crypto.randomUUID();
    const fileExt = path.extname(file.originalname);
    const filePath = path.join(this.uploadDir, `${fileId}${fileExt}`);

    await fs.writeFile(filePath, file.buffer);

    return {
      cid: `local-${fileId}`,
      path: filePath,
      url: `/api/storage/file/${fileId}${fileExt}`,
    };
  }

  async retrieveFile(fileId) {
    // Implementation for retrieving files
    const files = await fs.readdir(this.uploadDir);
    const targetFile = files.find((f) =>
      f.startsWith(fileId.replace("local-", ""))
    );

    if (!targetFile) {
      throw new Error(`File with id ${fileId} not found`);
    }

    const filePath = path.join(this.uploadDir, targetFile);
    return {
      data: await fs.readFile(filePath),
      path: filePath,
      filename: targetFile,
    };
  }
}

export default new LocalStorageService();
