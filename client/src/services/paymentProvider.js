// src/services/paymentProvider.js
import mockPaymentService from "./mockPaymentService.js";
// Prepared for future implementation
// import realPaymentService from './paymentService';

// service configuration options
const CONFIG = {
  // Default to mock in development, can be overridden by environment variable
  useMock:
    process.env.NODE_ENV !== "production" ||
    process.env.REACT_APP_USE_MOCK_PAYMENTS === "true",
  enableLogging:
    process.env.NODE_ENV === "development" ||
    process.env.REACT_APP_PAYMENT_DEBUG === "true",
  errorHandling: true,
};

// payment provider service
class PaymentProvider {
  constructor() {
    this.serviceType = CONFIG.useMock ? "mock" : "real";
    this.activeService = CONFIG.useMock
      ? mockPaymentService
      : null; /* realPaymentService */
    this.isInitialized = false;
    this.logPrefix = `[PAYMENT-${this.serviceType.toUpperCase()}]`;
  }

  // initialize the payment provider
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.log("Initializing payment provider");

      if (!this.activeService) {
        throw new Error("No payment service available. Check configuration.");
      }

      // Initialize the underlying service if it has an initialization method
      if (typeof this.activeService.initializeProvider === "function") {
        await this.activeService.initializeProvider();
      }

      this.isInitialized = true;
      this.log("Payment provider initialized successfully");
    } catch (error) {
      this.logError("Initialization failed", error);
      throw error;
    }
  }

  /**
   * Switch between mock and real payment services
   * @param {string} serviceType - "mock" or "real"
   * @returns {boolean} Success status
   */
  switchService(serviceType) {
    if (serviceType === this.serviceType) {
      this.log(`Already using ${serviceType} service`);
      return true;
    }

    if (serviceType === "mock") {
      this.activeService = mockPaymentService;
      this.serviceType = "mock";
      this.logPrefix = "[PAYMENT-MOCK]";
      this.log("Switched to mock payment service");
      this.isInitialized = false;
      return true;
    }

    if (serviceType === "real") {
      // In the future, this would be realPaymentService
      // this.activeService = realPaymentService;
      this.log("Real payment service not implemented yet");
      return false;
    }

    this.logError(`Invalid service type: ${serviceType}`);
    return false;
  }

  // provide a method to call the active payment service method
  async callMethod(methodName, ...args) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.activeService[methodName]) {
      throw new Error(
        `Method ${methodName} not implemented in ${this.serviceType} payment service`
      );
    }

    try {
      this.log(`Calling ${methodName}`, ...args);
      const result = await this.activeService[methodName](...args);
      this.log(`${methodName} completed`, { success: true });
      return result;
    } catch (error) {
      this.logError(`Error in ${methodName}`, error);
      if (CONFIG.errorHandling) {
        // Return a standardized error response instead of throwing
        return {
          success: false,
          error: error.message || `Error in ${methodName}`,
          code: error.code || "PAYMENT_ERROR",
        };
      }
      throw error;
    }
  }

  // log a message if logging is enabled
  log(message, ...args) {
    if (!CONFIG.enableLogging) return;

    if (args.length > 0) {
      console.log(`${this.logPrefix} ${message}`, ...args);
    } else {
      console.log(`${this.logPrefix} ${message}`);
    }
  }

  // Log an error message if logging is enabled
  logError(message, error) {
    if (!CONFIG.enableLogging) return;

    console.error(`${this.logPrefix} ${message}`, error);
  }

  // Get information about the current payment service
  getServiceInfo() {
    return {
      type: this.serviceType,
      initialized: this.isInitialized,
      loggingEnabled: CONFIG.enableLogging,
      methods: this.activeService
        ? Object.getOwnPropertyNames(this.activeService).filter(
            (prop) => typeof this.activeService[prop] === "function"
          )
        : [],
    };
  }
}

// Create singleton instance
const paymentProvider = new PaymentProvider();

// Create proxy to allow direct method access
const paymentProviderProxy = new Proxy(paymentProvider, {
  get(target, prop) {
    // First check if the property exists on the PaymentProvider instance
    if (prop in target) {
      return target[prop];
    }

    // If the property is a function on the active service,
    // return a function that calls it with error handling
    if (
      target.activeService &&
      typeof target.activeService[prop] === "function"
    ) {
      return async (...args) => target.callMethod(prop, ...args);
    }

    // Return other properties directly from the active service
    if (target.activeService && prop in target.activeService) {
      return target.activeService[prop];
    }

    return undefined;
  },
});

export default paymentProviderProxy;
