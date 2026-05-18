import { logger } from "../config/loggerConfig.js";
// Add this route handler
router.get("/file/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    logger.info(`Retrieving file with ID: ${fileId}`);

    const file = await localStorageService.retrieveFile(fileId);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );
    res.send(file.data);
  } catch (error) {
    logger.error("Error retrieving file:", error);
    res.status(404).send({ error: "File not found" });
  }
});
