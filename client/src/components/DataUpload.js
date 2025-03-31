// src/components/DataUpload.js
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Upload, AlertCircle, X, Check, Database, Link } from "lucide-react";
import secureStorageService from "../services/secureStorageService.js";
import useBlockchain from "../hooks/useBlockchain.js";

// Constants
const ALLOWED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "application/json": [".json"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const CATEGORIES = [
  "General Health",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Laboratory",
  "Radiology",
  "Genetics",
  "Mental Health",
  "Dental",
];

const DataUpload = ({ onUploadSuccess, onUploadError }) => {
  const [fileData, setFileData] = useState(null);
  const [, setIpfsHash] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle, uploading, ipfs, blockchain, success, error

  // Use the blockchain hook
  const { uploadHealthData } = useBlockchain({
    showNotifications: true,
  });

  const validateFile = useCallback((file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Check file type
    const isValidType = Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
    if (!isValidType) {
      throw new Error(
        "Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JSON, JPG, PNG"
      );
    }

    return true;
  }, []);

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files[0];
      setError("");

      try {
        if (file) {
          validateFile(file);
          setFileData(file);
        }
      } catch (err) {
        setError(err.message);
        setFileData(null);
        event.target.value = "";
      }
    },
    [validateFile]
  );

  const handleCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setDescription(e.target.value);
  }, []);

  const handlePriceChange = useCallback((e) => {
    const value = e.target.value;
    // Validate price input
    if (
      value === "" ||
      (parseFloat(value) >= 0 && /^\d*\.?\d{0,8}$/.test(value))
    ) {
      setPrice(value);
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    setUploadProgress(0);
    setStatus("uploading");

    try {
      if (!fileData || !category || !price || !description) {
        throw new Error("Please fill all required fields");
      }

      // 1. Upload file to IPFS using secureStorageService
      setStatus("ipfs");
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 5;
          return next > 90 ? 90 : next;
        });
      }, 500);

      try {
        const result = await secureStorageService.uploadFile(fileData, {
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
          auditMetadata: {
            uploadType: "HEALTH_DATA",
            category,
            price,
          },
        });

        clearInterval(progressInterval);
        setUploadProgress(95);
        setIpfsHash(result.reference);

        // 2. Upload to blockchain
        setStatus("blockchain");
        await uploadHealthData(result.reference, category, price, description);

        // Update UI when transaction completes
        setUploadProgress(100);
        setStatus("success");

        // Call onUploadSuccess callback
        onUploadSuccess?.({
          ipfsHash: result.reference,
          category,
          price,
          description,
        });

        // Reset form
        setTimeout(() => {
          setFileData(null);
          setIpfsHash("");
          setCategory("");
          setDescription("");
          setPrice("");
          setUploadProgress(0);
          setStatus("idle");
        }, 3000);
      } catch (ipfsError) {
        console.error("IPFS upload error:", ipfsError);
        throw new Error("Failed to upload to IPFS. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading data:", error);
      setError(error.message || "Error uploading data. Please try again.");
      setStatus("error");
      onUploadError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <Upload className="text-blue-500" size={24} />;
      case "ipfs":
        return <Database className="text-purple-500" size={24} />;
      case "blockchain":
        return <Link className="text-green-500" size={24} />;
      case "success":
        return <Check className="text-green-500" size={24} />;
      case "error":
        return <AlertCircle className="text-red-500" size={24} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return "Preparing upload...";
      case "ipfs":
        return "Uploading to IPFS...";
      case "blockchain":
        return "Recording on blockchain...";
      case "success":
        return "Upload successful!";
      case "error":
        return "Upload failed";
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <div className="mt-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-white/30 hover:translate-y-[-4px] transition-transform duration-300">
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6 text-gray-800">
            <Upload className="text-blue-500" size={24} />
            Upload Health Data
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                className="text-red-500 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept={Object.entries(ALLOWED_FILE_TYPES)
                  .flatMap(([_, exts]) => exts)
                  .join(",")}
                disabled={loading}
                aria-label="Upload file"
              />
              <label
                htmlFor="file-upload"
                className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg cursor-pointer transition-colors ${
                  loading
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                <Upload size={20} />
                {fileData ? "Change File" : "Select File"}
              </label>

              {fileData && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium truncate">
                        {fileData.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(fileData.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFileData(null)}
                      className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full p-1"
                      aria-label="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={handleCategoryChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                disabled={loading}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                rows="3"
                disabled={loading}
                placeholder="Describe this health data record"
              ></textarea>
            </div>

            <div className="mb-6">
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price (ETH) *
              </label>
              <input
                id="price"
                type="number"
                value={price}
                onChange={handlePriceChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                step="0.00000001"
                min="0"
                max="100000"
                disabled={loading}
                placeholder="Enter price in ETH"
                aria-describedby="price-description"
              />
              <p id="price-description" className="mt-1 text-sm text-gray-500">
                Enter price in ETH (max 8 decimal places)
              </p>
            </div>

            <button
              type="submit"
              disabled={
                !fileData || !category || !description || !price || loading
              }
              className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-all ${
                !fileData || !category || !description || !price || loading
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
              }`}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {getStatusText()}
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Upload Data</span>
                </>
              )}
            </button>

            {loading && (
              <div className="mt-4" aria-live="polite" aria-atomic="true">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                    role="progressbar"
                    aria-valuenow={uploadProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    {getStatusIcon()}
                    <p className="text-sm text-gray-600 ml-2">
                      {getStatusText()}
                    </p>
                  </div>
                  <p className="text-right text-sm text-gray-600">
                    {uploadProgress}%
                  </p>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                <Check className="text-green-500 mr-2" size={20} />
                <div>
                  <p className="font-medium text-green-800">
                    Upload Successful
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Your health data has been securely uploaded to the
                    blockchain
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-500 text-center">
              Supported files: PDF, DOC, DOCX, TXT, JSON, JPG, PNG (max{" "}
              {MAX_FILE_SIZE / (1024 * 1024)}MB)
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

DataUpload.propTypes = {
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
};

export default DataUpload;
