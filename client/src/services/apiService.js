// src/services/apiService.js
import { ENV } from "../config/environmentConfig.js";

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
    this.mockMode = ENV.USE_MOCK_API || ENV.NODE_ENV !== "production";

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

    // Handle specific endpoints
    if (method === "get") {
      if (endpoint === "datasets/browse") {
        return {
          data: [],
          total: 0,
          success: true,
        };
      }
    }

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
      const url = this._createUrl(endpoint);
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

        // Create mock blob
        const mockContent = "This is a mock file content for testing purposes.";
        const blob = new Blob([mockContent], { type: "text/plain" });

        return {
          success: true,
          data: blob,
          filename: "mock-download.txt",
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
