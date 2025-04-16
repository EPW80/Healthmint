// apiService.js
import axios from "axios";
import config from "../config/config.js";

// API service for making HTTP requests
class ApiService {
  constructor(options = {}) {
    this.baseURL = options.baseURL || config.API_URL || "http://localhost:5000";
    this.timeout = options.timeout || config.TIMEOUT || 30000;
    this.retryAttempts = options.retryAttempts || config.RETRY_ATTEMPTS || 3;
    this.retryStatusCodes = options.retryStatusCodes || [
      408, 429, 500, 502, 503, 504,
    ];
    this.authToken = null;
    this.pendingRequests = new Map();

    // Create axios instance with enhanced config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-App-Version": config.APP_VERSION || "1.0.0",
      },
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

    // Initialize optional features
    if (options.enableCache) {
      this.initializeCache(options.cacheOptions);
    }
  }

  // Initialize cache with options
  initializeCache(options = {}) {
    this.cache = new Map();
    this.cacheMaxAge = options.maxAge || 60000; // 1 minute default
    this.cacheKeyPrefix = options.keyPrefix || "api_cache_";
  }

  // Set authentication token for requests
  setAuthToken(token) {
    this.authToken = token;
    if (token) {
      this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common["Authorization"];
    }
    return this;
  }

  // Set base URL for requests
  handleRequest = (config) => {
    // Add request ID for tracking
    const requestId = this.generateRequestId();
    config.headers["X-Request-ID"] = requestId;

    // Add HIPAA compliance header if needed (and data is PHI)
    if (config.isPHI) {
      config.headers["X-HIPAA-Compliance"] = "true";
    }

    // Add timestamp for audit trails
    config.metadata = {
      ...config.metadata,
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Create cancelation token
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    this.pendingRequests.set(requestId, {
      source,
      timestamp: Date.now(),
    });

    // Sanitize any sensitive data in URL params (for GET requests)
    if (config.params) {
      config.params = this.sanitizeSensitiveData(config.params);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, {
        requestId,
        params: config.params ? "..." : undefined,
      });
    }

    return config;
  };

  // Handle request errors
  handleRequestError = (error) => {
    const errorDetails = {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    console.error("API Request Error:", errorDetails);

    // Add to audit trail for HIPAA compliance if needed
    if (error.config?.isPHI) {
      this.logHipaaEvent("request_error", errorDetails);
    }

    return Promise.reject(error);
  };

  // Handle successful response
  handleResponse = (response) => {
    // Remove from pending requests
    const requestId = response.config.headers["X-Request-ID"];
    this.pendingRequests.delete(requestId);

    // Add to cache if it's a GET request
    if (this.cache && response.config.method === "get") {
      const cacheKey = this.getCacheKey(
        response.config.url,
        response.config.params
      );
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`,
        { requestId }
      );
    }

    // Log successful PHI access for HIPAA compliance
    if (response.config.isPHI) {
      this.logHipaaEvent("data_access", {
        requestId,
        url: response.config.url,
        method: response.config.method,
        timestamp: new Date().toISOString(),
      });
    }

    return response.data;
  };

  // Handle response errors
  handleResponseError = async (error) => {
    // Handle canceled requests
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message);
      return Promise.reject(error);
    }

    // Remove from pending requests
    if (error.config?.headers?.["X-Request-ID"]) {
      this.pendingRequests.delete(error.config.headers["X-Request-ID"]);
    }

    // Add retry count if it doesn't exist
    const config = error.config;
    if (!config) {
      return Promise.reject(error);
    }

    if (!config.retryCount) {
      config.retryCount = 0;
      config.retryDelay = 1000; // Start with 1s delay
    }

    // Check if we should retry the request
    const shouldRetry = this.shouldRetryRequest(error);

    if (shouldRetry && config.retryCount < this.retryAttempts) {
      config.retryCount += 1;

      // Implement exponential backoff with jitter
      const delay =
        config.retryDelay *
        Math.pow(2, config.retryCount - 1) *
        (0.9 + 0.2 * Math.random());

      console.log(
        `Retrying request (${config.retryCount}/${this.retryAttempts}): ${config.url} after ${Math.round(delay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.client(config);
    }

    // Format and log error with enhanced details
    const errorDetails = this.formatErrorDetails(error);
    console.error("API Response Error:", errorDetails);

    // Log failed PHI access for HIPAA compliance
    if (error.config?.isPHI) {
      this.logHipaaEvent("data_access_error", {
        ...errorDetails,
        timestamp: new Date().toISOString(),
      });
    }

    // Enhance error object with additional context
    if (error.response) {
      error.enhancedData = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        endpoint: error.config.url,
      };
    }

    return Promise.reject(error);
  };

  // Format error details for logging
  formatErrorDetails(error) {
    const details = {
      url: error.config?.url,
      method: error.config?.method,
      requestId: error.config?.headers?.["X-Request-ID"],
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      // Server responded with non-2xx status
      details.status = error.response.status;
      details.statusText = error.response.statusText;
      details.data = error.response.data;
    } else if (error.request) {
      // Request was made but no response received
      details.errorType = "No Response";
      details.message = "No response received from server";
    } else {
      // Error in setting up the request
      details.errorType = "Request Setup Error";
      details.message = error.message;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === "development") {
      details.stack = error.stack;
    }

    return details;
  }

  // Check if the request should be retried
  shouldRetryRequest(error) {
    // Don't retry if request was canceled
    if (axios.isCancel(error)) {
      return false;
    }

    // Network errors should be retried
    if (!error.response) {
      return true;
    }

    // Retry based on status code
    const statusCode = error.response.status;
    return this.retryStatusCodes.includes(statusCode);
  }

  // Generate a unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Log HIPAA-related events for compliance
  getCacheKey(url, params) {
    const paramString = params ? JSON.stringify(params) : "";
    return `${this.cacheKeyPrefix}${url}${paramString}`;
  }

  // Check if cache is valid
  isCacheValid(cacheEntry) {
    return cacheEntry && Date.now() - cacheEntry.timestamp < this.cacheMaxAge;
  }

  sanitizeSensitiveData(data) {
    if (!data || typeof data !== "object") return data;

    const sanitized = { ...data };
    const sensitiveFields = ["password", "token", "ssn", "dob", "email"];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  logHipaaEvent(eventType, details) {
    // In a real application, this would log to a secure audit trail system
    console.log(`HIPAA Event: ${eventType}`, {
      ...details,
      timestamp: new Date().toISOString(),
    });

    // For a real implementation, you might send this to a secure logging service
    // or create an audit trail entry in the database
  }

  cancelAllRequests(message = "Request canceled by user") {
    this.pendingRequests.forEach(({ source }) => {
      source.cancel(message);
    });
    this.pendingRequests.clear();
  }

  cancelRequest(requestId, message = "Request canceled by user") {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.source.cancel(message);
      this.pendingRequests.delete(requestId);
      return true;
    }
    return false;
  }

  async get(endpoint, params = {}, options = {}) {
    try {
      // Check cache first if enabled
      if (this.cache && options.useCache !== false) {
        const cacheKey = this.getCacheKey(endpoint, params);
        const cachedData = this.cache.get(cacheKey);

        if (this.isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      return await this.client.get(endpoint, {
        params,
        isPHI: options.isPHI,
        metadata: options.metadata,
        headers: options.headers,
        ...options,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, options);
      throw error;
    }
  }

  async post(endpoint, data = {}, options = {}) {
    try {
      return await this.client.post(endpoint, data, {
        isPHI: options.isPHI,
        metadata: options.metadata,
        headers: options.headers,
        onUploadProgress: options.onProgress,
        ...options,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, options);
      throw error;
    }
  }

  async put(endpoint, data = {}, options = {}) {
    try {
      return await this.client.put(endpoint, data, {
        isPHI: options.isPHI,
        metadata: options.metadata,
        headers: options.headers,
        onUploadProgress: options.onProgress,
        ...options,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, options);
      throw error;
    }
  }

  async delete(endpoint, options = {}) {
    try {
      return await this.client.delete(endpoint, {
        isPHI: options.isPHI,
        metadata: options.metadata,
        headers: options.headers,
        data: options.data,
        ...options,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, options);
      throw error;
    }
  }

  async patch(endpoint, data = {}, options = {}) {
    try {
      return await this.client.patch(endpoint, data, {
        isPHI: options.isPHI,
        metadata: options.metadata,
        headers: options.headers,
        onUploadProgress: options.onProgress,
        ...options,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, options);
      throw error;
    }
  }

  async uploadFile(endpoint, file, progressCallback, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      if (metadata) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      return await this.client.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressCallback && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback(percentCompleted);
          }
        },
        isPHI: metadata.isPHI,
        metadata,
      });
    } catch (error) {
      this.handleClientError(error, endpoint, { isPHI: metadata.isPHI });
      throw error;
    }
  }

  async downloadFile(endpoint, progressCallback) {
    try {
      return await this.client.get(endpoint, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressCallback && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback(percentCompleted);
          }
        },
      });
    } catch (error) {
      this.handleClientError(error, endpoint);
      throw error;
    }
  }

  // Handle client-side errors
  handleClientError(error, endpoint, options = {}) {
    const clientErrorDetails = {
      endpoint,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    console.error("Client-side API error:", clientErrorDetails);

    if (options.isPHI) {
      this.logHipaaEvent("client_error", clientErrorDetails);
    }
  }
}

const apiService = new ApiService();
export default apiService;

export { ApiService };
