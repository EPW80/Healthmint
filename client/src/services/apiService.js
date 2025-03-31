// src/services/apiService.js
import { ENV } from "../config/environmentConfig.js";
import mockDataUtils from "../utils/mockDataUtils.js";

/**
 * API Service
 *
 * Provides a consistent interface for API requests with
 * proper error handling and mock data capabilities.
 */
class ApiService {
  constructor() {
    // Configuration
    this.baseUrl = ENV.API_URL || "/api";
    this.timeout = ENV.API_TIMEOUT || 30000; // 30 seconds default

    // Check if mock mode is explicitly set in localStorage
    const storedMockMode = localStorage.getItem("use_mock_data");
    this.mockMode =
      storedMockMode === "true" ||
      (storedMockMode !== "false" &&
        (ENV.USE_MOCK_API || ENV.NODE_ENV !== "production"));

    // Default headers
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Auth token
    this.authToken = null;

    // Initialize
    if (ENV.NODE_ENV !== "production") {
      console.log(
        `[API] Service initialized (${this.mockMode ? "MOCK" : "REAL"} mode)`
      );
    }
  }

  /**
   * Set the authentication token
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Enable mock data mode
   */
  enableMockData() {
    this.mockMode = true;
    localStorage.setItem("use_mock_data", "true");
    console.log("[API] Mock data mode enabled");
  }

  /**
   * Disable mock data mode
   */
  disableMockData() {
    this.mockMode = false;
    localStorage.setItem("use_mock_data", "false");
    console.log("[API] Mock data mode disabled");
  }

  /**
   * Check if mock data mode is enabled
   * @returns {boolean} Whether mock data is enabled
   */
  isMockDataEnabled() {
    return this.mockMode;
  }

  /**
   * Create a complete URL from endpoint
   * @param {string} endpoint - API endpoint
   * @returns {string} Full URL
   * @private
   */
  _createUrl(endpoint) {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;

    // Ensure base URL doesn't end with slash
    const cleanBaseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * Get request headers including auth token if available
   * @param {Object} customHeaders - Additional headers
   * @returns {Object} Complete headers
   * @private
   */
  _getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Handle timeout for fetch requests
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response
   * @private
   */
  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const { signal } = controller;

    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...options, signal });
      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Process response based on content type
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Processed response data
   * @private
   */
  async _processResponse(response) {
    const contentType = response.headers.get("Content-Type") || "";

    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType.includes("text/")) {
      data = await response.text();
    } else if (response.status === 204) {
      // No content
      data = null;
    } else {
      // Try JSON first, fallback to text
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
    }

    if (!response.ok) {
      throw {
        status: response.status,
        statusText: response.statusText,
        message:
          data?.message || `Request failed with status ${response.status}`,
        data,
      };
    }

    return { data, status: response.status, headers: response.headers };
  }

  /**
   * Handle mock responses
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Object|null} Mock response or null
   * @private
   */
  _getMockResponse(method, endpoint, data = {}) {
    if (!this.mockMode) return null;

    // Normalize endpoint for matching
    const normalizedEndpoint = endpoint.replace(/^\/+|\/+$/g, "");

    if (ENV.NODE_ENV !== "production") {
      console.log(
        `[API] Mock ${method.toUpperCase()} request to ${normalizedEndpoint}`
      );
    }

    // Handle health data endpoints
    if (method === "get") {
      // Handle health records endpoint
      if (
        endpoint.includes("/data/records") ||
        endpoint.includes("/patient/records") ||
        endpoint === "datasets/browse"
      ) {
        const mockData = mockDataUtils.getMockHealthData();

        // Apply filters if provided
        let filteredData = [...mockData];

        if (data.category && data.category !== "All") {
          filteredData = filteredData.filter(
            (record) => record.category === data.category
          );
        }

        if (data.searchTerm) {
          const searchLower = data.searchTerm.toLowerCase();
          filteredData = filteredData.filter(
            (record) =>
              record.title.toLowerCase().includes(searchLower) ||
              record.description.toLowerCase().includes(searchLower)
          );
        }

        // Sort if requested
        if (data.sortBy) {
          if (data.sortBy === "newest") {
            filteredData.sort(
              (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
            );
          } else if (data.sortBy === "oldest") {
            filteredData.sort(
              (a, b) => new Date(a.uploadDate) - new Date(b.uploadDate)
            );
          } else if (data.sortBy === "price_asc") {
            filteredData.sort(
              (a, b) => parseFloat(a.price) - parseFloat(b.price)
            );
          } else if (data.sortBy === "price_desc") {
            filteredData.sort(
              (a, b) => parseFloat(b.price) - parseFloat(a.price)
            );
          }
        }

        return {
          success: true,
          data: filteredData,
          total: filteredData.length,
        };
      }

      // Handle specific record endpoint
      if (endpoint.includes("/data/record/") || endpoint.includes("/record/")) {
        const recordId = endpoint.split("/").pop();
        const mockData = mockDataUtils.getMockHealthData();
        const record = mockData.find((r) => r.id === recordId);

        if (!record) {
          return {
            success: false,
            error: "Record not found",
          };
        }

        // Add extra details for single record view
        const enhancedRecord = {
          ...record,
          detailedDescription: `Detailed information about ${record.title}. This record contains comprehensive health data related to ${record.category.toLowerCase()} collected on ${new Date(record.uploadDate).toLocaleDateString()}.`,
          provider: "Healthmint Medical Center",
          downloadAvailable: true,
          lastUpdated: new Date().toISOString(),
          viewCount: Math.floor(Math.random() * 100),
          fileSize: `${(record.recordCount / 1000).toFixed(1)} MB`,
        };

        return {
          success: true,
          data: enhancedRecord,
        };
      }

      // Handle user stats endpoint
      if (endpoint.includes("/user/stats")) {
        const mockData = mockDataUtils.getMockHealthData();

        return {
          success: true,
          data: {
            totalRecords: mockData.length,
            sharedRecords: mockData.filter((r) => r.shared).length,
            pendingRequests: Math.floor(Math.random() * 3),
            securityScore: 85,
          },
        };
      }
    }

    // Handle original auth endpoints
    if (method === "post") {
      if (endpoint.includes("/auth/challenge")) {
        return {
          nonce: "mock-nonce-" + Date.now(),
          success: true,
        };
      }

      if (endpoint.includes("/auth/wallet/verify")) {
        return {
          token: "mock-token",
          refreshToken: "mock-refresh-token",
          expiresIn: 3600,
          user: {
            address: data.address,
            roles: ["patient"],
          },
          success: true,
        };
      }

      if (endpoint.includes("/user/role")) {
        return {
          success: true,
          roles: [data.role],
        };
      }

      // Handle purchase endpoint
      if (endpoint.includes("/data/purchase")) {
        const { dataId } = data;

        if (!dataId) {
          return {
            success: false,
            error: "Data ID is required",
          };
        }

        // Update the record as purchased
        const updatedData = mockDataUtils.updateMockRecord(dataId, {
          purchased: true,
          purchaseDate: new Date().toISOString(),
        });

        if (!updatedData) {
          return {
            success: false,
            error: "Failed to update record",
          };
        }

        return {
          success: true,
          message: "Data purchased successfully",
          transactionId: `tx-${Date.now()}`,
        };
      }
    }

    // Default mock response for any endpoint
    return {
      success: true,
      data: null,
      message: `Mock response for ${method.toUpperCase()} ${endpoint}`,
    };
  }

  /**
   * Make a HTTP request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   * @private
   */
  async _request(method, endpoint, data, options = {}) {
    try {
      // Check for mock response
      const mockResponse = this._getMockResponse(method, endpoint, data);
      if (mockResponse) {
        // Add artificial delay in development
        if (ENV.NODE_ENV !== "production") {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        return { ...mockResponse, _mock: true };
      }

      // Prepare request
      let url = this._createUrl(endpoint);
      const headers = this._getHeaders(options.headers);

      const requestOptions = {
        method: method.toUpperCase(),
        headers,
        ...options,
      };

      // Handle request body
      if (data) {
        if (method.toLowerCase() === "get") {
          // For GET, convert data to query params
          const queryParams = new URLSearchParams();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, String(value));
            }
          });

          const queryString = queryParams.toString();
          if (queryString) {
            url += `${url.includes("?") ? "&" : "?"}${queryString}`;
          }
        } else if (data instanceof FormData) {
          // For FormData, browser sets content type
          delete requestOptions.headers["Content-Type"];
          requestOptions.body = data;
        } else {
          // For other methods, JSON stringify
          requestOptions.body = JSON.stringify(data);
        }
      }

      // Make request with timeout
      const response = await this._fetchWithTimeout(url, requestOptions);
      const {
        data: responseData,
        status,
        headers: responseHeaders,
      } = await this._processResponse(response);

      // Return standardized response
      return {
        success: true,
        data: responseData,
        status,
        headers: responseHeaders,
      };
    } catch (error) {
      if (ENV.NODE_ENV !== "production") {
        console.error(
          `[API] ${method.toUpperCase()} error for ${endpoint}:`,
          error
        );
      }

      // If API fails, try to use mock data as fallback
      if (!this.mockMode) {
        console.log(`[API] Trying mock data fallback for ${endpoint}`);
        const tempMockMode = this.mockMode;
        this.mockMode = true;
        const mockResponse = this._getMockResponse(method, endpoint, data);
        this.mockMode = tempMockMode;

        if (mockResponse) {
          console.log(`[API] Using mock data fallback for ${endpoint}`);
          return { ...mockResponse, _mock: true, _fallback: true };
        }
      }

      // Standardize error format
      return {
        success: false,
        error: error.message || "Unknown error",
        status: error.status || 0,
        data: error.data || null,
      };
    }
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async get(endpoint, params = {}, options = {}) {
    return this._request("get", endpoint, params, options);
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async post(endpoint, data = {}, options = {}) {
    return this._request("post", endpoint, data, options);
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async put(endpoint, data = {}, options = {}) {
    return this._request("put", endpoint, data, options);
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async delete(endpoint, options = {}) {
    return this._request("delete", endpoint, null, options);
  }

  /**
   * Upload a file with progress tracking
   * @param {string} endpoint - Upload endpoint
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(endpoint, file, onProgress = () => {}, metadata = {}) {
    try {
      // Return mock response in mock mode
      if (this.mockMode) {
        if (ENV.NODE_ENV !== "production") {
          console.log(
            `[API] Mock file upload: ${file.name} (${file.size} bytes)`
          );

          // Simulate progress
          for (let i = 10; i <= 100; i += 10) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            onProgress(i);
          }
        }

        // Create a new mock record for the uploaded file
        const newRecord = {
          id: `record-${Date.now()}`,
          title: metadata.title || file.name,
          category: metadata.category || "General Health",
          description: metadata.description || `Uploaded file: ${file.name}`,
          uploadDate: new Date().toISOString(),
          ipfsHash: `ipfs-${Math.random().toString(36).substring(2, 15)}`,
          price: metadata.price || "0",
          format: file.type.split("/")[1]?.toUpperCase() || "FILE",
          recordCount: 1,
          verified: false,
          anonymized: metadata.anonymized || false,
          shared: false,
          owner: "0xe169...6041",
          tags: metadata.tags || [],
        };

        // Add the record to mock data
        mockDataUtils.addMockRecord(newRecord);

        return {
          success: true,
          reference: `mock-file-${Date.now()}`,
          url: `https://example.com/files/${file.name}`,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            ...metadata,
          },
          recordId: newRecord.id,
        };
      }

      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      if (metadata) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        // Handle response
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve({
                success: true,
                message: "Upload successful",
              });
            }
          } else {
            reject({
              status: xhr.status,
              message: "Upload failed",
              responseText: xhr.responseText,
            });
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          reject({
            status: 0,
            message: "Network error during upload",
          });
        });

        // Start upload
        xhr.open("POST", this._createUrl(endpoint));

        // Add auth token if available
        if (this.authToken) {
          xhr.setRequestHeader("Authorization", `Bearer ${this.authToken}`);
        }

        xhr.send(formData);
      });
    } catch (error) {
      // Try mock upload as fallback
      if (!this.mockMode) {
        console.log(`[API] Trying mock file upload fallback`);
        const tempMockMode = this.mockMode;
        this.mockMode = true;
        const result = await this.uploadFile(
          endpoint,
          file,
          onProgress,
          metadata
        );
        this.mockMode = tempMockMode;
        return result;
      }

      return {
        success: false,
        error: error.message || "File upload failed",
        status: error.status || 0,
      };
    }
  }

  /**
   * Download a file with progress tracking
   * @param {string} endpoint - File endpoint
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result with blob
   */
  async downloadFile(endpoint, onProgress = () => {}, options = {}) {
    try {
      // Return mock response in mock mode
      if (this.mockMode) {
        if (ENV.NODE_ENV !== "production") {
          console.log(`[API] Mock file download from ${endpoint}`);

          // Simulate progress
          for (let i = 10; i <= 100; i += 10) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            onProgress(i);
          }
        }

        // Extract record ID if present in endpoint
        let recordId;
        try {
          recordId = endpoint.split("/").pop();
        } catch (e) {
          recordId = null;
        }

        // Try to get record data for more realistic mock content
        let mockContent = "This is a mock file content for testing purposes.";
        let contentType = "text/plain";

        if (recordId) {
          const mockData = mockDataUtils.getMockHealthData();
          const record = mockData.find((r) => r.id === recordId);

          if (record) {
            mockContent = `
Health Record: ${record.title}
Category: ${record.category}
Date: ${new Date(record.uploadDate).toLocaleDateString()}
Description: ${record.description}

This file contains simulated health data for demonstration purposes.
Record ID: ${record.id}
Format: ${record.format || "Unknown"}
Record Count: ${record.recordCount || 1}
Anonymized: ${record.anonymized ? "Yes" : "No"}
            `;

            if (record.format === "CSV") {
              mockContent = `Date,Measurement,Value,Unit,Notes\n`;

              // Add some random data rows
              const today = new Date();
              for (let i = 0; i < 10; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                mockContent += `${date.toISOString().split("T")[0]},`;

                // Different data based on category
                if (record.category === "Cardiology") {
                  mockContent += `Blood Pressure,${Math.floor(Math.random() * 40) + 100}/${Math.floor(Math.random() * 20) + 60},mmHg,${Math.random() > 0.7 ? "After exercise" : ""}\n`;
                } else if (record.category === "Laboratory") {
                  mockContent += `Glucose,${Math.floor(Math.random() * 100) + 70},mg/dL,${Math.random() > 0.7 ? "Fasting" : "Post-meal"}\n`;
                } else {
                  mockContent += `Measurement ${i + 1},${Math.floor(Math.random() * 100)},unit,\n`;
                }
              }

              contentType = "text/csv";
            }
          }
        }

        // Create mock blob
        const blob = new Blob([mockContent], { type: contentType });

        return {
          success: true,
          data: blob,
          filename: recordId
            ? `healthrecord-${recordId}.${contentType === "text/csv" ? "csv" : "txt"}`
            : "mock-download.txt",
          contentType,
        };
      }

      // Make request
      const url = this._createUrl(endpoint);
      const headers = this._getHeaders(options.headers);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw {
          status: response.status,
          message: `Download failed: ${response.statusText}`,
        };
      }

      // Get content length for progress tracking
      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Get file information
      const contentType =
        response.headers.get("Content-Type") || "application/octet-stream";
      let filename = "download";

      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        filename = disposition
          .split("filename=")[1]
          .replace(/["']/g, "")
          .trim();
      }

      // Read response as stream
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;

      // Read chunks
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (total > 0) {
          onProgress(Math.round((loaded / total) * 100));
        }
      }

      // Combine chunks
      const dataArray = new Uint8Array(loaded);
      let position = 0;

      for (const chunk of chunks) {
        dataArray.set(chunk, position);
        position += chunk.length;
      }

      // Create blob
      const blob = new Blob([dataArray], { type: contentType });

      return {
        success: true,
        data: blob,
        filename,
        contentType,
      };
    } catch (error) {
      // Try mock download as fallback
      if (!this.mockMode) {
        console.log(`[API] Trying mock file download fallback`);
        const tempMockMode = this.mockMode;
        this.mockMode = true;
        const result = await this.downloadFile(endpoint, onProgress, options);
        this.mockMode = tempMockMode;
        return result;
      }

      return {
        success: false,
        error: error.message || "File download failed",
        status: error.status || 0,
      };
    }
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;
