// DataUpload.js
import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
} from "@mui/material";
import { EncryptionUpload } from "./EncryptionUpload";

const DataUpload = () => {
  const [fileData, setFileData] = useState(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const encryptionUpload = new EncryptionUpload();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    //setFileData(file);
    setError("");

    try {
      if (file) {
        encryptionUpload.validContentType(file);
        setFileData(file);
      }
    } catch (err) {
      setError(err.message);
      event.target.value = '';
      setFileData(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!fileData) {
        throw new Error("Please select a file");
      }
      // Here add the blockchain integration later
      // Encrypting file before uploading
      const encryptingFile = await encryptionUpload.encryptFile(fileData);

      console.log("Encrypted Package:", {
        filename: encryptingFile.filename,
        contentType: encryptingFile.contentType,
        encryptedSize: encryptingFile.encrypted.byteLength,
      });
      console.log("Price:", price);

      // Mock API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Data encrypted and ploaded successfully!");
      setFileData(null);
      setPrice("");
    } catch (error) {
      console.error("Error uploading data:", error);
      alert("Error uploading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const acceptedTypes = encryptionUpload.getAcceptedFileTypes().join(', ');

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Upload Health Data
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <input
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="raised-button-file">
                <Button variant="contained" component="span" fullWidth>
                  Select File
                </Button>
              </label>
              {fileData && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {fileData.name}
                </Typography>
              )}
            </Box>

            <TextField
              fullWidth
              label="Price (ETH)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              sx={{ mb: 3 }}
              inputProps={{ step: "0.01" }}
            />

            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              disabled={!fileData || !price || loading}
            >
              {loading ? "Uploading..." : "Upload Data"}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default DataUpload;
