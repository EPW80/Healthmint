import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Upload } from "lucide-react";

// Styled components
const UploadPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  backdropFilter: "blur(10px)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
  },
}));

const StyledInput = styled("input")({
  display: "none",
});

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

const DataUpload = ({ onUploadSuccess, onUploadError }) => {
  const [fileData, setFileData] = useState(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

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

    try {
      if (!fileData || !price) {
        throw new Error("Please select a file and enter a price");
      }

      // Simulated upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 10;
          return next > 90 ? 90 : next;
        });
      }, 500);

      // Here you would typically:
      // 1. Upload file to IPFS
      // 2. Create blockchain transaction
      // 3. Update database
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      onUploadSuccess?.();

      // Reset form
      setFileData(null);
      setPrice("");
      setUploadProgress(0);
    } catch (error) {
      console.error("Error uploading data:", error);
      setError(error.message || "Error uploading data. Please try again.");
      onUploadError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <UploadPaper elevation={3}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Upload size={24} />
            Upload Health Data
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <StyledInput
                accept={Object.entries(ALLOWED_FILE_TYPES)
                  .flatMap(([_, exts]) => exts)
                  .join(",")}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="raised-button-file">
                <Button
                  variant="contained"
                  component="span"
                  fullWidth
                  disabled={loading}
                  startIcon={<Upload />}
                >
                  Select File
                </Button>
              </label>
              {fileData && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    p: 1,
                    bgcolor: "rgba(0, 0, 0, 0.04)",
                    borderRadius: 1,
                  }}
                >
                  Selected file: {fileData.name} (
                  {(fileData.size / (1024 * 1024)).toFixed(2)}MB)
                </Typography>
              )}
            </Box>

            <TextField
              fullWidth
              label="Price (ETH)"
              type="number"
              value={price}
              onChange={handlePriceChange}
              sx={{ mb: 3 }}
              inputProps={{
                step: "0.00000001",
                min: "0",
                max: "100000",
              }}
              disabled={loading}
              helperText="Enter price in ETH (max 8 decimal places)"
            />

            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              disabled={!fileData || !price || loading}
              startIcon={
                loading && <CircularProgress size={20} color="inherit" />
              }
            >
              {loading ? "Uploading..." : "Upload Data"}
            </Button>

            {loading && (
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ mt: 2 }}
              />
            )}

            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mt: 2, display: "block" }}
            >
              Supported files: PDF, DOC, DOCX, TXT, JSON, JPG, PNG (max{" "}
              {MAX_FILE_SIZE / (1024 * 1024)}MB)
            </Typography>
          </form>
        </UploadPaper>
      </Box>
    </Container>
  );
};

DataUpload.propTypes = {
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
};

export default DataUpload;
