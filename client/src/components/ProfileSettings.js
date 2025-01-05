import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { create } from "ipfs-http-client";

const GlassContainer = styled(Box)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  padding: theme.spacing(4),
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
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

const ProfileSettings = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageHash, setImageHash] = useState(null); // Store IPFS hash

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPG, PNG, or GIF)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    try {
      setLoading(true);

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to IPFS
      const ipfs = create({ url: "YOUR_IPFS_NODE_URL" });
      const result = await ipfs.add(file);
      setImageHash(result.path);

      // Here you would typically update the user's profile in your smart contract
      // const tx = await userProfileContract.setProfileImage(result.path);
      // await tx.wait();

      setProfileImage(file);
      setLoading(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      setLoading(false);
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setPreviewUrl(null);
    setImageHash(null);
  };

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

        <Box sx={{ position: "relative", mb: 4 }}>
          <LargeAvatar
            src={previewUrl || "/default-avatar.png"}
            alt="Profile"
          />

          <Box
            sx={{
              position: "absolute",
              bottom: -10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 1,
            }}
          >
            <label htmlFor="profile-image">
              <UploadButton
                accept="image/jpeg,image/png,image/gif"
                id="profile-image"
                type="file"
                onChange={handleImageUpload}
              />
              <IconButton
                component="span"
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <EditIcon />
              </IconButton>
            </label>

            {profileImage && (
              <IconButton
                onClick={handleRemoveImage}
                sx={{
                  bgcolor: "error.main",
                  color: "white",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {imageHash && (
          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mt: 2 }}
          >
            IPFS Hash: {imageHash}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary" align="center">
          Supported formats: JPG, PNG, GIF (max 5MB)
        </Typography>
      </GlassContainer>
    </Container>
  );
};

export default ProfileSettings;
