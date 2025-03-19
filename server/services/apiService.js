import axios from "axios";
import config from "../config/config.js";

// API Service
class ApiService {
  constructor() {
    this.baseURL = config.API_URL || "http://localhost:5000";
    this.timeout = config.TIMEOUT || 30000;
    this.retryAttempts = config.RETRY_ATTEMPTS || 3;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
  }

  /**
   * Request interceptor
   */
  handleRequest = (config) => {
    // Add request ID for tracking
    config.headers["X-Request-ID"] = this.generateRequestId();

    if (process.env.NODE_ENV === "development") {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  };

  /**
   * Request error handler
   */
  handleRequestError = (error) => {
    console.error("API Request Error:", error.message);
    return Promise.reject(error);
  };

  /**
   * Response handler
   */
  handleResponse = (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`
      );
    }

    return response.data;
  };

  /**
   * Response error handler with retry logic
   */
  handleResponseError = async (error) => {
    // Handle retry logic
    const config = error.config;

    // Add retry count if it doesn't exist
    if (!config.retryCount) {
      config.retryCount = 0;
    }

    // Check if we should retry the request
    if (config.retryCount < this.retryAttempts && this.isRetryable(error)) {
      config.retryCount += 1;

      // Implement exponential backoff
      const delay = Math.pow(2, config.retryCount) * 1000;

      console.log(
        `Retrying request (${config.retryCount}/${this.retryAttempts}): ${config.url} after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.client(config);
    }

    // Format and log error
    console.error("API Response Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    return Promise.reject(error);
  };

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    // Only retry on network errors or 5xx server errors
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      throw error;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, config = {}) {
    try {
      return await this.client.post(endpoint, data, config);
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, config = {}) {
    try {
      return await this.client.put(endpoint, data, config);
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint, config = {}) {
    try {
      return await this.client.delete(endpoint, config);
    } catch (error) {
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, config = {}) {
    try {
      return await this.client.patch(endpoint, data, config);
    } catch (error) {
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
