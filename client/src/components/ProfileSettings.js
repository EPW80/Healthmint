import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Container,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  Fade,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Trash2, Camera } from "lucide-react";
import { storageService } from "../services/storageService"; // New secure storage service

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};

const GlassContainer = styled(Box)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  padding: theme.spacing(4),
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
  },
}));

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

const ProfileSettings = ({
  onImageUpload,
  onImageRemove,
  defaultImage = "/default-avatar.png",
  userName,
}) => {
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [storageReference, setStorageReference] = useState(null);
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
          userId: userName,
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
    [userName]
  );

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      setError(null);
      setUploadProgress(0);

      try {
        validateFile(file);
        setLoading(true);

        // Create local preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        // Upload to secure storage
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
    [validateFile, uploadToStorage, onImageUpload]
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
  }, [storageReference, onImageRemove]);

  return (
    <Container maxWidth="sm">
      <GlassContainer sx={{ mt: 4 }}>
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 4,
          }}
        >
          Profile Settings
        </Typography>

        {userName && (
          <Typography
            variant="h6"
            align="center"
            sx={{ mb: 3, color: "text.secondary" }}
          >
            {userName}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ position: "relative", mb: 4 }}>
          <Tooltip title="Click to upload new image" arrow>
            <LargeAvatar
              src={previewUrl || defaultImage}
              alt={`${userName || "User"}'s profile picture`}
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
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          </Fade>

          <Box
            sx={{
              position: "absolute",
              bottom: -10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 1,
              zIndex: 1,
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

            {profileImage && (
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

        {storageReference && (
          <Tooltip title="Storage Reference ID" arrow>
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              sx={{ mt: 2 }}
            >
              Reference ID: {storageReference}
            </Typography>
          </Tooltip>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          Supported formats: JPG, PNG, GIF (max {MAX_FILE_SIZE / (1024 * 1024)}
          MB)
        </Typography>
      </GlassContainer>
    </Container>
  );
};

ProfileSettings.propTypes = {
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
  defaultImage: PropTypes.string,
  userName: PropTypes.string,
};

export default ProfileSettings;
