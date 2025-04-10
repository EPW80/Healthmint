// src/services/paymentProvider.js
import { mockPaymentService } from "./mockPaymentService.js";
// In the future, this would be imported: import { realPaymentService } from './paymentService';

// Configuration - can be set based on environment or feature flags
const useMockPayments =
  process.env.REACT_APP_USE_MOCK_PAYMENTS === "true" || true;

// Create a proxy that forwards calls to either the mock or real service
const paymentProvider = new Proxy(
  {},
  {
    get: function (target, prop) {
      // Select the appropriate service based on configuration
      const service = useMockPayments
        ? mockPaymentService
        : null; /* realPaymentService */

      // If using mock service in development, log methods being called
      if (process.env.NODE_ENV === "development" && useMockPayments) {
        const originalMethod = service[prop];

        // Only proxy if the property is a function
        if (typeof originalMethod === "function") {
          return function (...args) {
            console.log(`[MOCK PAYMENT] Calling ${prop}`, ...args);
            return originalMethod.apply(service, args);
          };
        }
      }

      // Return the property from the selected service
      return service[prop];
    },
  }
);

export default paymentProvider;
