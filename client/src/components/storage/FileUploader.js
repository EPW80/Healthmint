import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, AlertCircle, CheckCircle, X, File, Image as ImageIcon } from 'lucide-react';

const FileUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('General Health');
  const [sensitivity, setSensitivity] = useState('medium');
  const [containsPHI, setContainsPHI] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      
      // Create preview for images
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(droppedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('tags', tags);
    formData.append('category', category);
    formData.append('sensitivity', sensitivity);
    formData.append('containsPHI', containsPHI);

    try {
      // For testing purposes, use the test endpoint
      const response = await axios.post(
        '/api/test/file-upload-with-metadata',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          }
        }
      );
      
      setResult(response.data);
      // Reset form after successful upload
      setFile(null);
      setPreview(null);
      setDescription('');
      setTags('');
      
      // Notify parent component if needed
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const closeResult = () => {
    setResult(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-indigo-700">Upload Health Document</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md relative">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 mt-0.5" />
            <div>
              <p className="font-bold">Upload Successful!</p>
              <p className="mt-1">Your file "{result.fileDetails.originalName}" has been uploaded.</p>
              <div className="mt-3">
                <a 
                  href={result.fileDocument.ipfsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center"
                >
                  View on IPFS <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>
              </div>
            </div>
          </div>
          <button 
            onClick={closeResult}
            className="absolute top-2 right-2 text-green-700 hover:text-green-900"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Select or Drop File
          </label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
            } transition-colors duration-200`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  {preview ? (
                    <img 
                      src={preview} 
                      alt="File preview" 
                      className="max-h-32 max-w-full rounded object-contain" 
                    />
                  ) : (
                    <div className="bg-indigo-100 rounded-lg p-4">
                      {file.type.includes('pdf') ? (
                        <File className="h-16 w-16 text-indigo-700 mx-auto" />
                      ) : (
                        <ImageIcon className="h-16 w-16 text-indigo-700 mx-auto" />
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-900 font-medium">{file.name}</div>
                <div className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="mt-3 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-gray-600">
                  <span className="font-medium text-indigo-600 hover:text-indigo-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <p className="text-xs text-gray-500">
                  Files up to 50MB supported 
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              onChange={handleFileChange}
              className="hidden"
              required={!file}
            />
          </div>
          {!file && (
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()}
              className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Browse Files
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter a description of the file"
            ></textarea>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="tags">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., lab-results, bloodwork, annual-exam"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="General Health">General Health</option>
                <option value="Medical Records">Medical Records</option>
                <option value="Lab Results">Lab Results</option>
                <option value="Imaging">Imaging</option>
                <option value="Prescriptions">Prescriptions</option>
                <option value="Insurance">Insurance</option>
                <option value="Billing">Billing</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="sensitivity">
              Sensitivity Level
            </label>
            <select
              id="sensitivity"
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div className="flex items-center h-full">
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="containsPHI"
                checked={containsPHI}
                onChange={(e) => setContainsPHI(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900" htmlFor="containsPHI">
                Contains Protected Health Information (PHI)
              </label>
            </div>
          </div>
        </div>
        
        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center mt-1">{uploadProgress}% Uploaded</p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onUploadComplete}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || uploading}
            className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
              !file || uploading
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileUploader;