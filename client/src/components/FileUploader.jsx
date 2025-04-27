import React, { useState } from "react";
import axios from "axios";

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [retrieveResult, setRetrieveResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [testMode, setTestMode] = useState("upload");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setResult(null);
    setRetrieveResult(null);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setResult(null);
    setRetrieveResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      let response;

      if (testMode === "upload") {
        // Standard upload test
        response = await axios.post("/api/storage/test-upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        });
        setResult(response.data);
      } else {
        // Full flow test (upload + retrieval)
        response = await axios.post("/api/storage/test-ipfs-flow", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        });

        setResult(response.data.uploaded);
        setRetrieveResult(response.data.retrieved);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">IPFS Storage Test</h1>

      <div className="mb-4">
        <div className="flex items-center space-x-4 mb-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="testMode"
              value="upload"
              checked={testMode === "upload"}
              onChange={() => setTestMode("upload")}
            />
            <span className="ml-2">Test Upload</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="testMode"
              value="full-flow"
              checked={testMode === "full-flow"}
              onChange={() => setTestMode("full-flow")}
            />
            <span className="ml-2">Test Upload & Retrieval</span>
          </label>
        </div>

        <label className="block text-gray-700 mb-2">Select File</label>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`px-4 py-2 rounded ${
          !file || uploading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        } transition duration-200`}
      >
        {uploading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
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
            Uploading...
          </>
        ) : (
          "Upload to IPFS"
        )}
      </button>

      {progress > 0 && progress < 100 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">Uploading: {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded">
          <h3 className="font-semibold text-green-800 mb-2">
            Upload Successful!
          </h3>
          <p className="mb-1">
            <span className="font-medium">CID:</span> {result.cid}
          </p>
          <p className="mb-1">
            <span className="font-medium">File Name:</span> {result.fileName}
          </p>
          <p>
            <span className="font-medium">Link:</span>{" "}
            <a
              href={`https://dweb.link/ipfs/${result.cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {`https://dweb.link/ipfs/${result.cid}`}
            </a>
          </p>
        </div>
      )}

      {retrieveResult && (
        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">
            Retrieval Successful!
          </h3>
          <p className="mb-1">
            <span className="font-medium">CID:</span> {retrieveResult.cid}
          </p>
          <p className="mb-1">
            <span className="font-medium">File Name:</span>{" "}
            {retrieveResult.fileName}
          </p>
          <p>
            <span className="font-medium">Content:</span>{" "}
            <span className="break-all">{retrieveResult.content}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
