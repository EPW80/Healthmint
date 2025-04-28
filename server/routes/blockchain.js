// src/routes/blockchainRoutes.js
import express from "express";
import { asyncHandler, createError } from "../errors/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import blockchainService from "../services/blockchainService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import secureStorageService from "../services/secureStorageService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const router = express.Router();

// Setup path and ABI loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to load contract ABI
const loadContractAbi = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")).abi;
  } catch (error) {
    console.error(`Failed to load ABI from ${filePath}:`, error);
    return null;
  }
};

// Load contract ABIs
const consentAbi = loadContractAbi(
  path.resolve(__dirname, "../contracts/PatientConsent.json")
);
const registryAbi = loadContractAbi(
  path.resolve(__dirname, "../contracts/HealthDataRegistry.json")
);
const marketplaceAbi = loadContractAbi(
  path.resolve(
    __dirname,
    "../../client/src/contracts/HealthDataMarketplace.json"
  )
);

// Contract addresses from environment
const CONTRACTS = {
  CONSENT: process.env.CONTRACT_PATIENT_CONSENT,
  REGISTRY: process.env.CONTRACT_HEALTH_DATA_REGISTRY,
  MARKETPLACE: process.env.CONTRACT_HEALTH_DATA_MARKETPLACE,
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Helper: Get marketplace contract instance
const getMarketplaceContract = async () => {
  return blockchainService.getContract(
    "HealthDataMarketplace",
    CONTRACTS.MARKETPLACE,
    marketplaceAbi
  );
};

/**
 * Get network information
 * Returns the current blockchain network details
 */
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

/**
 * Get patient consents
 * Returns all consent records for a specific patient address
 */
router.get(
  "/consent/:address",
  asyncHandler(async (req, res) => {
    const { address } = req.params;

    // Verify access permissions
    const requesterAddress = req.user.address.toLowerCase();
    const targetAddress = address.toLowerCase();
    const isAuthorized =
      requesterAddress === targetAddress ||
      req.user.roles.includes("admin") ||
      req.user.roles.includes("provider");

    if (!isAuthorized) {
      throw createError.forbidden(
        "You don't have permission to access this data"
      );
    }

    // Get consents from marketplace contract
    const marketplaceContract = await getMarketplaceContract();
    const consents = await marketplaceContract.getPatientConsents(address);

    // Log access for HIPAA compliance
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

/**
 * Grant consent to a provider
 * Records patient consent for data access by a provider
 */
router.post(
  "/consent",
  asyncHandler(async (req, res) => {
    const { providerAddress, accessType, granted } = req.body;

    // Validate required fields
    if (!providerAddress || !accessType) {
      throw createError.validation(
        "Provider address and access type are required"
      );
    }

    // Create audit log for consent action
    await hipaaCompliance.createAuditLog("CONSENT_UPDATED", {
      userId: req.user.id,
      userAddress: req.user.address,
      providerAddress,
      accessType,
      granted,
      ip: req.ip,
    });

    // Note: Actual blockchain transaction would happen client-side
    // This endpoint prepares and returns the necessary information
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

/**
 * Process blockchain consent transaction
 * This route securely handles consent transactions on the blockchain
 */
router.post(
  "/consent/process",
  asyncHandler(async (req, res) => {
    const { providerAddress, dataId, expiryTime, granted } = req.body;

    // Validate required fields
    if (!providerAddress || !dataId) {
      throw createError.validation(
        "Provider address and data ID are required"
      );
    }

    // Verify the user is operating on their own data
    const patientAddress = req.user.address.toLowerCase();
    
    // Create audit log for consent action
    await hipaaCompliance.createAuditLog("CONSENT_TRANSACTION_INITIATED", {
      userId: req.user.id,
      userAddress: patientAddress,
      providerAddress,
      dataId,
      granted,
      ip: req.ip,
    });

    let result;
    try {
      if (granted) {
        // Calculate expiry time if not provided (default 30 days)
        const actualExpiryTime = expiryTime || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        result = await blockchainService.grantConsent(
          patientAddress,
          providerAddress,
          dataId,
          actualExpiryTime
        );
      } else {
        result = await blockchainService.revokeConsent(
          patientAddress,
          providerAddress,
          dataId
        );
      }

      await hipaaCompliance.createAuditLog("CONSENT_TRANSACTION_COMPLETED", {
        userId: req.user.id,
        userAddress: patientAddress,
        providerAddress,
        dataId,
        granted,
        transactionHash: result.transactionHash,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: granted ? "Consent granted successfully" : "Consent revoked successfully",
        transaction: result
      });
    } catch (error) {
      await hipaaCompliance.createAuditLog("CONSENT_TRANSACTION_FAILED", {
        userId: req.user.id,
        userAddress: patientAddress,
        providerAddress,
        dataId,
        granted,
        error: error.message,
        ip: req.ip,
      });
      
      throw error; // Will be caught by the asyncHandler
    }
  })
);

/**
 * Register health data hash
 * Creates and returns a hash of health data for blockchain registration
 */
router.post(
  "/register-data",
  asyncHandler(async (req, res) => {
    const { data, metadata, price } = req.body;

    if (!data) {
      throw createError.validation("Health data is required");
    }

    // Create hash of the data
    const dataHash = blockchainService.createDataHash(data);

    // Sanitize data for logging (HIPAA compliance)
    const sanitizedData = await hipaaCompliance.sanitizeResponse(data);

    // Create audit log
    await hipaaCompliance.createAuditLog("HEALTH_DATA_HASH_GENERATED", {
      userId: req.user.id,
      userAddress: req.user.address,
      dataHash: dataHash.substring(0, 10) + "...", // Only log part of the hash for security
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

/**
 * Verify data hash
 * Checks if a data hash exists on the blockchain
 */
router.get(
  "/verify-data/:hash",
  asyncHandler(async (req, res) => {
    const { hash } = req.params;

    // Get registry contract
    const registryContract = await blockchainService.getContract(
      "HealthDataRegistry",
      CONTRACTS.REGISTRY,
      registryAbi
    );

    // Attempt to verify the hash on the blockchain
    // Note: Implementation depends on actual contract methods
    const verificationResult = { verified: false, timestamp: null };

    try {
      // This is placeholder code - implement based on actual contract methods
      // const result = await registryContract.verifyDataHash(hash);
      // verificationResult.verified = result.verified;
      // verificationResult.timestamp = result.timestamp;

      // Log the verification attempt
      await hipaaCompliance.createAuditLog("DATA_HASH_VERIFICATION", {
        userId: req.user.id,
        userAddress: req.user.address,
        dataHash: hash.substring(0, 10) + "...",
        result: verificationResult.verified,
        ip: req.ip,
      });
    } catch (error) {
      console.error("Hash verification error:", error);
    }

    res.json({
      success: true,
      message: "Data verification processed",
      data: {
        hash,
        ...verificationResult,
        requestTimestamp: new Date(),
      },
    });
  })
);

/**
 * Get marketplace listings
 * Returns all available health data listings in the marketplace
 */
router.get(
  "/marketplace/listings",
  asyncHandler(async (req, res) => {
    const marketplaceContract = await getMarketplaceContract();

    // Get available data listings
    const listings = await marketplaceContract.getAvailableDataListings();

    // Log the data access
    await hipaaCompliance.createAuditLog("MARKETPLACE_LISTINGS_ACCESSED", {
      userId: req.user.id,
      userAddress: req.user.address,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: listings,
    });
  })
);

/**
 * Test file upload to IPFS
 * Uploads a file to IPFS via Web3Storage for testing purposes
 */
router.post(
  "/test-upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError.validation("No file provided");
    }

    console.log(
      `Received file: ${req.file.originalname}, size: ${req.file.size} bytes`
    );

    // Create a File object for Web3Storage
    const fileData = new File([req.file.buffer], req.file.originalname, {
      type: req.file.mimetype,
    });

    // Upload to IPFS via Web3Storage
    const cid = await secureStorageService.storeFiles([fileData]);

    // Log the upload (HIPAA compliance)
    await hipaaCompliance.createAuditLog("FILE_UPLOADED_TO_IPFS", {
      userId: req.user.id,
      userAddress: req.user.address,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      cid: cid,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "File uploaded successfully",
      fileName: req.file.originalname,
      cid: cid,
      retrievalUrl: `https://${cid}.ipfs.dweb.link/${encodeURIComponent(req.file.originalname)}`,
    });
  })
);

/**
 * Register data on blockchain
 * Securely registers health data hash and metadata on the blockchain
 */
router.post(
  "/data/register-on-chain",
  asyncHandler(async (req, res) => {
    const { dataHash, metadata, price } = req.body;

    if (!dataHash || !metadata) {
      throw createError.validation("Data hash and metadata are required");
    }

    const patientAddress = req.user.address.toLowerCase();
    
    try {
      const result = await blockchainService.registerDataOnChain(
        patientAddress,
        dataHash,
        metadata,
        price || 0
      );
      
      await hipaaCompliance.createAuditLog("DATA_REGISTERED_ON_CHAIN", {
        userId: req.user.id,
        userAddress: patientAddress,
        dataHash: dataHash.substring(0, 10) + "...",
        transactionHash: result.transactionHash,
        dataId: result.dataId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: "Health data registered on blockchain",
        transaction: result
      });
    } catch (error) {
      await hipaaCompliance.createAuditLog("DATA_REGISTRATION_FAILED", {
        userId: req.user.id,
        userAddress: patientAddress,
        dataHash: dataHash.substring(0, 10) + "...",
        error: error.message,
        ip: req.ip,
      });
      
      throw error;
    }
  })
);

export default router;
