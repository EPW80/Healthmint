// src/utils/navigation.js

/**
 * Central location for all application routes
 * This ensures consistency between client and server-side routing
 */
export const ROUTES = {
  // Auth routes
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  REGISTER: "/register",
  ROLE_SELECT: "/select-role",

  // Dashboard routes
  DASHBOARD: "/dashboard",
  PATIENT_DASHBOARD: "/dashboard/patient",
  RESEARCHER_DASHBOARD: "/dashboard/researcher",

  // Data routes
  UPLOAD: "/upload",
  BROWSE: "/browse",
  DATA_DETAIL: "/data/:id",

  // User routes
  PROFILE: "/profile",
  SETTINGS: "/settings",

  // Access routes
  PERMISSIONS: "/permissions",
  HISTORY: "/history",
  REQUESTS: "/requests",

  // Helper function to create parameterized routes
  dataDetail: (id) => `/data/${id}`,
};

/**
 * Gets the base API URL from environment variables
 * with fallback to localhost
 */
export const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL || "http://localhost:5000";
};

/**
 * Constructs a complete API URL from the endpoint
 * @param {string} endpoint - API endpoint
 * @returns {string} Complete API URL
 */
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

/**
 * Checks if a route is an API route or a client route
 * @param {string} route - The route to check
 * @returns {boolean} True if this is an API route
 */
export const isApiRoute = (route) => {
  return route.startsWith("/api/") || route.startsWith("api/");
};
