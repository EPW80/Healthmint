import express from 'express';
import FileDocument from '../models/FileDocument.js';

const router = express.Router();

// API endpoint to discover available datasets
router.get('/datasets/discover', async (req, res) => {
  try {
    // Get files that are marked as public or researcher-accessible
    const files = await FileDocument.find({
      $or: [
        { isPublic: true },
        // Add other access control conditions as needed
      ],
      isDeleted: false
    });

    // Group files by category
    const filesByCategory = {};
    
    files.forEach(file => {
      if (!filesByCategory[file.category]) {
        filesByCategory[file.category] = [];
      }
      filesByCategory[file.category].push(file);
    });
    
    // Create dataset objects from categories
    const datasets = Object.entries(filesByCategory).map(([category, categoryFiles]) => ({
      id: `category-${category.replace(/\s+/g, '-').toLowerCase()}`,
      title: category,
      description: `Collection of ${category.toLowerCase()} files available for research`,
      fileCount: categoryFiles.length,
      totalSize: categoryFiles.reduce((sum, file) => sum + file.fileSize, 0),
      dataTypes: [...new Set(categoryFiles.flatMap(file => file.dataTypes).filter(Boolean))],
      tags: [...new Set(categoryFiles.flatMap(file => file.tags).filter(Boolean))],
      createdAt: new Date().toISOString(),
      files: categoryFiles.map(file => ({
        id: file._id,
        fileName: file.fileName,
        description: file.description,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        createdAt: file.createdAt,
        tags: file.tags
      }))
    }));
    
    return res.json({
      success: true,
      datasets
    });
  } catch (error) {
    console.error('Error discovering datasets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve datasets',
      error: error.message
    });
  }
});

export default router;