// src/services/apiService.js
import axios from "axios";
import { ENV, REQUEST_CONFIG, apiUtils } from "../config/apiConfig";

class ApiService {
  constructor() {
    this.client = axios.create({
      timeout: REQUEST_CONFIG.timeout,
      headers: REQUEST_CONFIG.headers,
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      this.handleRequest,
      this.handleRequestError
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      this.handleResponse,
      this.handleResponseError
    );
  }

  // Request interceptor
  handleRequest = async (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // Log requests in development
    if (ENV.NODE_ENV === "development") {
      console.log("API Request:", {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
        timestamp: new Date().toISOString(),
      });
    }

    return config;
  };

  // Request error handler
  handleRequestError = (error) => {
    return Promise.reject(apiUtils.handleError(error));
  };

  // Response handler
  handleResponse = (response) => {
    // Log responses in development
    if (ENV.NODE_ENV === "development") {
      console.log("API Response:", {
        url: response.config.url,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      });
    }

    return response.data;
  };

  // Response error handler
  handleResponseError = async (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem("authToken");

      // Redirect to login if needed
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Retry failed requests
    if (this.shouldRetry(error)) {
      return this.retryRequest(error.config);
    }

    return Promise.reject(apiUtils.handleError(error));
  };

  // Retry logic
  shouldRetry = (error) => {
    const config = error.config;
    config.retryCount = config.retryCount ?? 0;

    return (
      config.retryCount < REQUEST_CONFIG.retryAttempts &&
      error.code !== "ECONNABORTED" &&
      (!error.response ||
        (error.response.status >= 500 && error.response.status <= 599))
    );
  };

  // Retry request implementation
  retryRequest = async (config) => {
    config.retryCount += 1;

    // Exponential backoff
    const backoff = Math.min(1000 * 2 ** config.retryCount, 10000);
    await new Promise((resolve) => setTimeout(resolve, backoff));

    return this.client(config);
  };

  // GET request
  async get(endpoint, params = {}, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint, params);
      return await this.client.get(url, config);
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }

  // POST request
  async post(endpoint, data = {}, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint);
      return await this.client.post(url, data, config);
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }

  // PUT request
  async put(endpoint, data = {}, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint);
      return await this.client.put(url, data, config);
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }

  // DELETE request
  async delete(endpoint, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint);
      return await this.client.delete(url, config);
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }

  // Upload file with progress tracking
  async uploadFile(endpoint, file, onProgress, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint);
      const formData = new FormData();
      formData.append("file", file);

      const uploadConfig = {
        ...config,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress?.(progress);
        },
      };

      return await this.client.post(url, formData, uploadConfig);
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }

  // Download file with progress tracking
  async downloadFile(endpoint, onProgress, config = {}) {
    try {
      const url = apiUtils.buildUrl(endpoint);
      const downloadConfig = {
        ...config,
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress?.(progress);
        },
      };

      const response = await this.client.get(url, downloadConfig);
      return response;
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
