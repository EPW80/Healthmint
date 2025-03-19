// src/components/ProfileImageUploader.js
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Trash2, Camera, AlertCircle, X } from "lucide-react";
import secureStorageService from "../services/secureStorageService.js";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};

/**
 * ProfileImageUploader Component - HIPAA Compliant
 *
 * An accessible component for uploading and managing profile images
 * with HIPAA-compliant security features using secureStorageService
 */
const ProfileImageUploader = ({
  previewUrl,
  setPreviewUrl,
  storageReference,
  setStorageReference,
  setError,
  error,
  loading,
  setLoading,
  defaultImage = "/default-avatar.png",
  userIdentifier,
  onImageUpload,
  onImageRemove,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  // Validate file type and size
  const validateFile = useCallback((file) => {
    if (!file) {
      throw new Error("Please select a file");
    }

    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      throw new Error("Please upload a valid image file (JPG, PNG, or GIF)");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    return true;
  }, []);

  // Upload file to HIPAA-compliant storage
  const uploadToSecureStorage = useCallback(
    async (file) => {
      try {
        // Prepare audit metadata for HIPAA compliance
        const auditMetadata = {
          uploadType: "PROFILE_IMAGE",
          userId: userIdentifier,
          timestamp: new Date().toISOString(),
          ipAddress: "client", // Server will log actual IP
          action: "UPLOAD",
        };

        // Use the secureStorageService for HIPAA-compliant upload
        const result = await secureStorageService.uploadProfileImage(file, {
          onProgress: (progress) => {
            setUploadProgress(Math.round(progress));
          },
          userIdentifier,
          auditMetadata,
        });

        if (!result || !result.reference) {
          throw new Error("Upload failed - no reference returned");
        }

        return result.reference;
      } catch (error) {
        console.error("Secure storage upload error:", error);
        throw new Error(
          error.message || "Failed to upload image securely. Please try again."
        );
      }
    },
    [userIdentifier]
  );

  // Handle image upload
  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setError(null);
      setUploadProgress(0);

      try {
        // First validate the file
        validateFile(file);
        setLoading(true);

        // Create local preview (for immediate UI feedback)
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        // Upload to secure storage service
        const reference = await uploadToSecureStorage(file);
        setStorageReference(reference);

        // Notify parent component
        onImageUpload?.(reference);

        // Announce success for screen readers
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.textContent = "Image uploaded successfully";
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 3000);
      } catch (error) {
        console.error("Error uploading image:", error);
        setError(error.message);
        setPreviewUrl(null);
      } finally {
        setLoading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [
      validateFile,
      uploadToSecureStorage,
      onImageUpload,
      setError,
      setLoading,
      setPreviewUrl,
      setStorageReference,
    ]
  );

  // Handle removing image
  const handleRemoveImage = useCallback(async () => {
    try {
      setLoading(true);

      if (storageReference) {
        // Use secureStorageService for proper HIPAA-compliant deletion
        const auditMetadata = {
          uploadType: "PROFILE_IMAGE",
          userId: userIdentifier,
          timestamp: new Date().toISOString(),
          ipAddress: "client", // Server will log actual IP
          action: "DELETE",
        };

        await secureStorageService.deleteFile(storageReference, {
          userIdentifier,
          auditMetadata,
        });
      }

      setPreviewUrl(null);
      setStorageReference(null);
      setError(null);
      setUploadProgress(0);

      onImageRemove?.();

      // Announce for screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.textContent = "Image removed successfully";
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 3000);
    } catch (error) {
      console.error("Error removing image:", error);
      setError("Failed to remove image. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    storageReference,
    userIdentifier,
    onImageRemove,
    setError,
    setLoading,
    setPreviewUrl,
    setStorageReference,
  ]);

  return (
    <div className="relative text-center">
      {/* Display error message */}
      {error && (
        <div
          className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full"
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Avatar */}
      <div className="relative mx-auto">
        <div
          className="w-[150px] h-[150px] rounded-full border-4 border-white shadow-lg mx-auto overflow-hidden relative cursor-pointer transition-transform duration-300 hover:scale-105"
          aria-label="Profile picture"
        >
          <img
            src={previewUrl || defaultImage}
            alt={
              previewUrl ? "Your profile picture" : "Default profile picture"
            }
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.src = defaultImage;
            }}
          />
        </div>

        {/* Loading indicator overlay */}
        {loading && (
          <div
            className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black/50 rounded-full m-auto w-[150px] h-[150px]"
            aria-live="polite"
            aria-busy={loading}
          >
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        className="flex gap-2 justify-center mt-4"
        role="group"
        aria-label="Profile image actions"
      >
        <label htmlFor="profile-image" className="cursor-pointer">
          <input
            accept={Object.entries(ALLOWED_FILE_TYPES)
              .flatMap(([_, exts]) => exts)
              .join(",")}
            id="profile-image"
            type="file"
            onChange={handleImageUpload}
            disabled={loading}
            className="hidden"
            aria-label="Upload profile picture"
          />
          <button
            type="button"
            disabled={loading}
            aria-label="Upload new profile picture"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera size={20} aria-hidden="true" />
          </button>
        </label>

        {previewUrl && (
          <button
            onClick={handleRemoveImage}
            disabled={loading}
            aria-label="Remove profile picture"
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Upload progress indicator */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full mt-4" aria-live="polite">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Uploading: {uploadProgress}%
          </p>
        </div>
      )}

      {/* Help text */}
      <p className="mt-4 text-xs text-gray-500">
        Supported formats: JPG, PNG, GIF (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
      </p>
      {storageReference && (
        <p className="mt-1 text-xs text-gray-400">
          Storage ID: {storageReference.substring(0, 10)}...
        </p>
      )}
    </div>
  );
};

ProfileImageUploader.propTypes = {
  previewUrl: PropTypes.string,
  setPreviewUrl: PropTypes.func.isRequired,
  storageReference: PropTypes.string,
  setStorageReference: PropTypes.func.isRequired,
  error: PropTypes.string,
  setError: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  defaultImage: PropTypes.string,
  userIdentifier: PropTypes.string,
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
};

export default ProfileImageUploader;
