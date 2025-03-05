import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
  Fade,
  LinearProgress,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Trash2, Camera } from "lucide-react";
import { storageService } from "../services/storageService";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};

const LargeAvatar = styled(Avatar)(({ theme }) => ({
  width: 150,
  height: 150,
  border: "4px solid white",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  margin: "0 auto",
  position: "relative",
  cursor: "pointer",
  transition: "transform 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
  },
}));

const UploadButton = styled("input")({
  display: "none",
});

const ActionButton = styled(IconButton)(({ theme }) => ({
  transition: "transform 0.2s ease-in-out, background-color 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.1)",
  },
  "&:focus": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "2px",
  },
}));


const ProfileImageUploader = ({
  previewUrl,
  setPreviewUrl,
  storageReference,
  setStorageReference,
  setError,
  loading,
  setLoading,
  defaultImage = "/default-avatar.png",
  userIdentifier,
  onImageUpload,
  onImageRemove,
}) => {
  const [profileImage, setProfileImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const uploadToStorage = useCallback(
    async (file) => {
      try {
        const result = await storageService.uploadProfileImage(file, {
          userId: userIdentifier,
          contentType: file.type,
          onProgress: (progress) => {
            setUploadProgress(Math.round(progress));
          },
        });
        return result.reference;
      } catch (error) {
        console.error("Storage upload error:", error);
        throw new Error("Failed to upload image. Please try again.");
      }
    },
    [userIdentifier]
  );

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      setError(null);
      setUploadProgress(0);

      try {
        validateFile(file);
        setLoading(true);

        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        const reference = await uploadToStorage(file);
        setStorageReference(reference);
        setProfileImage(file);

        onImageUpload?.(reference);
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
      uploadToStorage,
      onImageUpload,
      setError,
      setLoading,
      setPreviewUrl,
      setStorageReference,
    ]
  );

  const handleRemoveImage = useCallback(async () => {
    try {
      setLoading(true);
      if (storageReference) {
        await storageService.deleteProfileImage(storageReference);
      }
      setProfileImage(null);
      setPreviewUrl(null);
      setStorageReference(null);
      setError(null);
      setUploadProgress(0);
      
      onImageRemove?.();
    } catch (error) {
      console.error("Error removing image:", error);
      setError("Failed to remove image. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    storageReference,
    onImageRemove,
    setError,
    setLoading,
    setPreviewUrl,
    setStorageReference,
  ]);

  return (
    <Box sx={{ position: "relative", textAlign: "center" }}>
      <Tooltip title="Click to upload new image" arrow>
        <LargeAvatar
          src={previewUrl || defaultImage}
          alt="Profile picture"
          imgProps={{
            loading: "lazy",
            onError: (e) => {
              e.target.src = defaultImage;
            },
          }}
        />
      </Tooltip>

      <Fade in={loading}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderRadius: "50%",
            m: "0 auto",
            width: 150,
            height: 150,
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      </Fade>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "center",
          mt: 2,
        }}
      >
        <Tooltip title="Upload new image" arrow>
          <label htmlFor="profile-image">
            <UploadButton
              accept={Object.entries(ALLOWED_FILE_TYPES)
                .flatMap(([_, exts]) => exts)
                .join(",")}
              id="profile-image"
              type="file"
              onChange={handleImageUpload}
              disabled={loading}
            />
            <ActionButton
              component="span"
              disabled={loading}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <Camera size={20} />
            </ActionButton>
          </label>
        </Tooltip>

        {previewUrl && (
          <Tooltip title="Remove image" arrow>
            <ActionButton
              onClick={handleRemoveImage}
              disabled={loading}
              sx={{
                bgcolor: "error.main",
                color: "white",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <Trash2 size={20} />
            </ActionButton>
          </Tooltip>
        )}
      </Box>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block", textAlign: "center" }}
          >
            Uploading: {uploadProgress}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

ProfileImageUploader.propTypes = {
  previewUrl: PropTypes.string,
  setPreviewUrl: PropTypes.func.isRequired,
  storageReference: PropTypes.string,
  setStorageReference: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  defaultImage: PropTypes.string,
  userIdentifier: PropTypes.string,
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
};

export default ProfileImageUploader;