import express from "express";
import { asyncHandler } from "../errors/index.js";
import { createError } from "../errors/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import blockchainService from "../services/blockchainService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { Readable } from "stream";
import secureStorageService from "../services/secureStorageService.js";

// Load ABIs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const consentAbiPath = path.resolve(
  __dirname,
  "../contracts/PatientConsent.json"
);
const registryAbiPath = path.resolve(
  __dirname,
  "../contracts/HealthDataRegistry.json"
);
const marketplaceAbiPath = path.resolve(
  __dirname,
  "../../client/src/contracts/HealthDataMarketplace.json"
);

// Parse ABIs
const consentAbi = JSON.parse(fs.readFileSync(consentAbiPath, "utf8")).abi;
const registryAbi = JSON.parse(fs.readFileSync(registryAbiPath, "utf8")).abi;
const marketplaceAbi = JSON.parse(
  fs.readFileSync(marketplaceAbiPath, "utf8")
).abi;

// Get contract addresses from environment
const CONSENT_CONTRACT = process.env.CONTRACT_PATIENT_CONSENT;
const REGISTRY_CONTRACT = process.env.CONTRACT_HEALTH_DATA_REGISTRY;
const MARKETPLACE_CONTRACT = process.env.CONTRACT_HEALTH_DATA_MARKETPLACE;

const router = express.Router();

// Middleware to protect routes
router.use(authMiddleware);

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get network information
router.get(
  "/network",
  asyncHandler(async (req, res) => {
    const networkInfo = await blockchainService.getNetworkInfo();
    res.json({
      success: true,
      data: networkInfo,
    });
  })
);

// Get patient consents - using the marketplace contract
router.get(
  "/consent/:address",
  asyncHandler(async (req, res) => {
    const { address } = req.params;

    // Verify access permissions
    if (
      req.user.address.toLowerCase() !== address.toLowerCase() &&
      !req.user.roles.includes("admin") &&
      !req.user.roles.includes("provider")
    ) {
      throw createError.forbidden(
        "You don't have permission to access this data"
      );
    }

    // Get marketplace contract
    const marketplaceContract = await blockchainService.getContract(
      "HealthDataMarketplace",
      MARKETPLACE_CONTRACT,
      marketplaceAbi
    );

    // Get consents using the marketplace contract
    // This assumes the marketplace contract has a method to get consents
    // If not, you'll need to adapt this to your contract's actual methods
    const consents = await marketplaceContract.getPatientConsents(address);

    // Create audit log
    await hipaaCompliance.createAuditLog("CONSENT_DATA_ACCESSED", {
      userId: req.user.id,
      userAddress: req.user.address,
      patientAddress: address,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: consents,
    });
  })
);

// Grant consent to a provider
router.post(
  "/consent",
  asyncHandler(async (req, res) => {
    const { providerAddress, accessType, granted } = req.body;

    if (!providerAddress || !accessType) {
      throw createError.validation(
        "Provider address and access type are required"
      );
    }

    // TODO: Implement actual blockchain transaction to set consent
    // This would require a wallet signer, which typically happens client-side
    // For server implementation, you'd need a server wallet or relay

    res.json({
      success: true,
      message: "Consent request submitted",
      data: {
        patient: req.user.address,
        provider: providerAddress,
        accessType,
        granted,
        timestamp: new Date(),
      },
    });
  })
);

// Register health data hash on blockchain
router.post(
  "/register-data",
  asyncHandler(async (req, res) => {
    const { data, metadata, price } = req.body;

    if (!data) {
      throw createError.validation("Health data is required");
    }

    // Create hash of the data
    const dataHash = blockchainService.createDataHash(data);

    // Sanitize data for logging
    const sanitizedData = await hipaaCompliance.sanitizeResponse(data);

    // Get marketplace contract
    const marketplaceContract = await blockchainService.getContract(
      "HealthDataMarketplace",
      MARKETPLACE_CONTRACT,
      marketplaceAbi
    );

    // This endpoint doesn't perform the transaction - it just returns the hash
    // The actual transaction would be performed by the client

    // Create audit log
    await hipaaCompliance.createAuditLog("HEALTH_DATA_HASH_GENERATED", {
      userId: req.user.id,
      userAddress: req.user.address,
      dataHash: dataHash.substring(0, 10) + "...", // Only log part of the hash
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Health data hash generated",
      data: {
        hash: dataHash,
        timestamp: new Date(),
      },
    });
  })
);

// Verify data hash on blockchain
router.get(
  "/verify-data/:hash",
  asyncHandler(async (req, res) => {
    const { hash } = req.params;

    // TODO: Implement blockchain verification of data hash

    res.json({
      success: true,
      message: "Data verification request received",
      data: {
        hash,
        verified: false, // Replace with actual verification result
        timestamp: new Date(),
      },
    });
  })
);

// Additional routes for marketplace-specific features
router.get(
  "/marketplace/listings",
  asyncHandler(async (req, res) => {
    // Get marketplace contract
    const marketplaceContract = await blockchainService.getContract(
      "HealthDataMarketplace",
      MARKETPLACE_CONTRACT,
      marketplaceAbi
    );

    // Get available data listings
    // This is placeholder code - adjust to your contract's actual methods
    const listings = await marketplaceContract.getAvailableDataListings();

    res.json({
      success: true,
      data: listings,
    });
  })
);

// Add this test endpoint
router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    console.log(`Received file: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
    // Create a File object that Web3Storage can use
    const fileData = new File(
      [req.file.buffer], 
      req.file.originalname, 
      { type: req.file.mimetype }
    );
    
    // Upload to IPFS via Web3Storage
    const cid = await secureStorageService.storeFiles([fileData]);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileName: req.file.originalname,
      cid: cid,
      retrievalUrl: `https://${cid}.ipfs.dweb.link/${encodeURIComponent(req.file.originalname)}`
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

export default router;
