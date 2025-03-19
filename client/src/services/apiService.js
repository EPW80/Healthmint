// src/services/updatedApiService.js
import axios from "axios";
import { API_CONFIG, IS_DEV } from "../config/environmentConfig.js";
import errorHandlingService from "../services/errorHandlingService.js";

/**
 * Enhanced API Service for centralized API communication
 *
 * Features:
 * - Consistent error handling using errorHandlingService
 * - Centralized environment configuration
 * - Automatic retries with exponential backoff
 * - Authentication token management
 * - Request/response interceptors
 * - Logging for development
 */
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.maxRetries = API_CONFIG.RETRY_ATTEMPTS;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: API_CONFIG.HEADERS,
      withCredentials: API_CONFIG.WITH_CREDENTIALS,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      this.handleRequest,
      this.handleRequestError
    );

    // Response interceptor
    this.client.interceptors.response.use(
      this.handleResponse,
      this.handleResponseError
    );
  }

  /**
   * Request interceptor to add auth token and request ID
   */
  handleRequest = async (config) => {
    // Add auth token if available
    const token = localStorage.getItem("healthmint_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // Log requests in development
    if (IS_DEV) {
      console.log("API Request:", {
        url: config.url,
        method: config.method,
        headers: {
          ...config.headers,
          Authorization: token ? "[REDACTED]" : undefined,
        },
        data: config.data,
        timestamp: new Date().toISOString(),
      });
    }

    return config;
  };

  /**
   * Request error handler
   */
  handleRequestError = (error) => {
    // Use error handling service to format and log error
    const formattedError = errorHandlingService.handleError(error, {
      code: "API_REQUEST_ERROR",
      context: "API Request",
      userVisible: true,
      details: {
        request: error.config
          ? {
              url: error.config.url,
              method: error.config.method,
            }
          : "No request config",
      },
    });

    return Promise.reject(formattedError);
  };

  /**
   * Response handler to format data consistently
   */
  handleResponse = (response) => {
    // Log responses in development
    if (IS_DEV) {
      console.log("API Response:", {
        url: response.config.url,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      });
    }

    return response.data;
  };

  /**
   * Response error handler with retry logic and token refresh
   */
  handleResponseError = async (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem("healthmint_auth_token");

      // Trigger authentication events
      const authExpiredEvent = new CustomEvent("auth:expired");
      window.dispatchEvent(authExpiredEvent);

      const formattedError = errorHandlingService.handleError(
        error.response?.data?.message || "Authentication token expired",
        {
          code: "AUTH_TOKEN_EXPIRED",
          context: "API Response",
          userVisible: true,
        }
      );

      // Don't retry 401 errors - let the auth system handle it
      return Promise.reject(formattedError);
    }

    // Retry failed requests if they meet retry criteria
    if (this.shouldRetry(error)) {
      return this.retryRequest(error.config);
    }

    // Format the error using error handling service
    const errorCode = this.getErrorCodeFromResponse(error);
    const errorMessage =
      error.response?.data?.message || error.message || "API Error";

    const formattedError = errorHandlingService.handleError(errorMessage, {
      code: errorCode,
      context: "API Response",
      userVisible: true,
      details: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      },
    });

    return Promise.reject(formattedError);
  };

  /**
   * Determine if a request should be retried
   */
  shouldRetry = (error) => {
    const config = error.config || {};
    config.retryCount = config.retryCount ?? 0;

    return (
      config.retryCount < this.maxRetries &&
      error.code !== "ECONNABORTED" &&
      (!error.response ||
        (error.response.status >= 500 && error.response.status <= 599))
    );
  };

  /**
   * Retry a failed request with exponential backoff
   */
  retryRequest = async (config) => {
    config.retryCount = (config.retryCount || 0) + 1;

    // Exponential backoff
    const backoff = Math.min(1000 * 2 ** config.retryCount, 10000);
    await new Promise((resolve) => setTimeout(resolve, backoff));

    console.log(
      `Retrying request (${config.retryCount}/${this.maxRetries}):`,
      config.url
    );

    return this.client(config);
  };

  /**
   * Get standardized error code from response
   */
  getErrorCodeFromResponse(error) {
    if (!error.response) {
      return "NETWORK_ERROR";
    }

    switch (error.response.status) {
      case 400:
        return "VALIDATION_ERROR";
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 409:
        return "CONFLICT";
      case 422:
        return "UNPROCESSABLE_ENTITY";
      case 429:
        return "RATE_LIMIT_EXCEEDED";
      case 500:
      case 501:
      case 502:
      case 503:
      case 504:
        return "SERVER_ERROR";
      default:
        return `HTTP_${error.response.status}`;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, config = {}) {
    try {
      return await this.client.get(endpoint, {
        params,
        ...config,
      });
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, config = {}) {
    try {
      return await this.client.post(endpoint, data, config);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, config = {}) {
    try {
      return await this.client.put(endpoint, data, config);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint, config = {}) {
    try {
      return await this.client.delete(endpoint, config);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, config = {}) {
    try {
      return await this.client.patch(endpoint, data, config);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(endpoint, file, onProgress, metadata = {}, config = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add any additional metadata
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(
          key,
          typeof value === "object" ? JSON.stringify(value) : value
        );
      });

      const uploadConfig = {
        ...config,
        headers: {
          ...config.headers,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          onProgress?.(progress);
        },
      };

      return await this.client.post(endpoint, formData, uploadConfig);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }

  /**
   * Download file with progress tracking
   */
  async downloadFile(endpoint, onProgress, params = {}, config = {}) {
    try {
      const downloadConfig = {
        ...config,
        responseType: "blob",
        params,
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          onProgress?.(progress);
        },
      };

      return await this.client.get(endpoint, downloadConfig);
    } catch (error) {
      throw error; // Already formatted by interceptors
    }
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;
