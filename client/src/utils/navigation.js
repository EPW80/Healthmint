// src/utils/navigation.js

// this is a mock implementation, replace with actual navigation logic

// Import required modules
export const ROUTE_CONFIG = {
  // Authentication routes
  AUTH: {
    LOGIN: {
      path: "/login",
      title: "Login",
      requiresAuth: false,
      allowedRoles: [],
    },
    ROLE_SELECT: {
      path: "/select-role",
      title: "Select Role",
      requiresAuth: true,
      allowedRoles: [],
    },
    REGISTER: {
      path: "/register",
      title: "Register",
      requiresAuth: false,
      allowedRoles: [],
    },
  },

  // Dashboard routes
  DASHBOARD: {
    ROOT: {
      path: "/dashboard",
      title: "Dashboard",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
    PATIENT: {
      path: "/dashboard/patient",
      title: "Patient Dashboard",
      requiresAuth: true,
      allowedRoles: ["patient"],
    },
    RESEARCHER: {
      path: "/dashboard/researcher",
      title: "Researcher Dashboard",
      requiresAuth: true,
      allowedRoles: ["researcher"],
    },
  },

  // Data management routes
  DATA: {
    UPLOAD: {
      path: "/upload",
      title: "Upload Data",
      requiresAuth: true,
      allowedRoles: ["patient"],
    },
    BROWSE: {
      path: "/browse",
      title: "Browse Datasets",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
    DETAIL: {
      path: "/data/:id",
      title: "Dataset Details",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
    MARKETPLACE: {
      path: "/marketplace",
      title: "Data Marketplace",
      requiresAuth: true,
      allowedRoles: ["researcher"],
    },
  },

  // User routes
  USER: {
    PROFILE: {
      path: "/profile",
      title: "User Profile",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
    SETTINGS: {
      path: "/settings",
      title: "Settings",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
  },

  // Access management routes
  ACCESS: {
    PERMISSIONS: {
      path: "/permissions",
      title: "Permissions Management",
      requiresAuth: true,
      allowedRoles: ["patient"],
    },
    HISTORY: {
      path: "/history",
      title: "Transaction History",
      requiresAuth: true,
      allowedRoles: ["patient", "researcher"],
    },
    REQUESTS: {
      path: "/requests",
      title: "Data Requests",
      requiresAuth: true,
      allowedRoles: ["researcher"],
    },
  },

  // Error routes
  ERRORS: {
    NOT_FOUND: {
      path: "/404",
      title: "Page Not Found",
      requiresAuth: false,
      allowedRoles: [],
    },
    FORBIDDEN: {
      path: "/forbidden",
      title: "Access Denied",
      requiresAuth: false,
      allowedRoles: [],
    },
  },
};

// simple helper function to generate parameterized routes
export const ROUTES = Object.entries(ROUTE_CONFIG).reduce(
  (routes, [section, sectionRoutes]) => {
    Object.entries(sectionRoutes).forEach(([key, route]) => {
      routes[key] = route.path;
    });
    return routes;
  },
  {
    // Add helper functions to generate parameterized routes
    dataDetail: (id) => `/data/${id}`,
    userProfile: (username) => `/profile/${username}`,
    requestDetail: (id) => `/requests/${id}`,
  }
);

// api configuration for base URL and timeout duration
const API_CONFIG = {
  DEFAULT_BASE_URL: "http://localhost:5000",
  API_PREFIX: "/api",
  TIMEOUT: 30000,
  VERSION: "v1",
};

// cache for API URLs to avoid redundant requests
const apiUrlCache = new Map();

// get API base URL
export const getApiBaseUrl = (options = {}) => {
  const { includeApiPrefix = false, includeVersion = false } = options;

  // Get base URL from environment variable or use default
  const baseUrl = process.env.REACT_APP_API_URL || API_CONFIG.DEFAULT_BASE_URL;

  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  // Build the complete URL
  let url = cleanBaseUrl;

  if (includeApiPrefix) {
    url += API_CONFIG.API_PREFIX;
  }

  if (includeVersion) {
    url += `/v${API_CONFIG.VERSION}`;
  }

  return url;
};

// construct API URL with endpoint and optional parameters
export const getApiUrl = (endpoint, options = {}) => {
  const { includeVersion = true, params = {} } = options;

  // Check cache first
  const cacheKey = `${endpoint}|${includeVersion}|${JSON.stringify(params)}`;
  if (apiUrlCache.has(cacheKey)) {
    return apiUrlCache.get(cacheKey);
  }

  // Get base URL with API prefix
  const baseUrl = getApiBaseUrl({ includeApiPrefix: true, includeVersion });

  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // Construct URL with parameters if provided
  let url = `${baseUrl}/${cleanEndpoint}`;

  // Add URL parameters if provided
  if (Object.keys(params).length > 0) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Cache the result for future calls
  apiUrlCache.set(cacheKey, url);

  return url;
};

// Check if a route is an API route
export const isApiRoute = (route) => {
  return route.startsWith("/api/") || route.startsWith("api/");
};

// check if a user can access a route
export const canAccessRoute = (routePath, user = {}) => {
  // Find the route configuration
  const routeConfig = Object.values(ROUTE_CONFIG)
    .flatMap((section) => Object.values(section))
    .find((route) => {
      // Handle route parameters (e.g., /data/:id)
      const routePattern = route.path.replace(/:\w+/g, "[^/]+");
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(routePath);
    });

  // If route not found, default to not requiring auth
  if (!routeConfig) {
    return true;
  }

  // Check authentication requirement
  if (routeConfig.requiresAuth && !user.isAuthenticated) {
    return false;
  }

  // Check role requirement if route has role restrictions
  if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
    return routeConfig.allowedRoles.includes(user.role);
  }

  return true;
};

// breadcrumbs for a given route path
export const getBreadcrumbs = (routePath) => {
  const breadcrumbs = [{ label: "Home", path: "/" }];
  const pathSegments = routePath.split("/").filter(Boolean);

  let currentPath = "";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Check if this is a parameter segment (e.g., an ID)
    const isParam = segment.match(/^[0-9a-f-]+$/i);

    if (isParam && index > 0) {
      // Find the parent route path (e.g., /data/:id/details)
      const parentSegment = pathSegments[index - 1];
      const parentPath = `/${parentSegment}/:id`;

      // Find the configuration that matches this pattern
      const matchingRoute = Object.values(ROUTE_CONFIG)
        .flatMap((section) => Object.values(section))
        .find((route) => route.path === parentPath);

      if (matchingRoute) {
        breadcrumbs.push({
          label: segment.substring(0, 8) + "...",
          path: currentPath,
          isId: true,
        });
      } else {
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentPath,
        });
      }
    } else {
      // Find the configuration that matches this exact path
      const matchingRoute = Object.values(ROUTE_CONFIG)
        .flatMap((section) => Object.values(section))
        .find((route) => route.path === currentPath);

      breadcrumbs.push({
        label: matchingRoute
          ? matchingRoute.title
          : segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath,
      });
    }
  });

  return breadcrumbs;
};

// get page title for a given route path
export const getPageTitle = (routePath) => {
  // Find the route configuration
  const routeConfig = Object.values(ROUTE_CONFIG)
    .flatMap((section) => Object.values(section))
    .find((route) => {
      // Handle route parameters (e.g., /data/:id)
      const routePattern = route.path.replace(/:\w+/g, "[^/]+");
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(routePath);
    });

  if (routeConfig) {
    return routeConfig.title;
  }

  // Default title if route not found
  return "HealthMint";
};

// clear navigation cache to avoid stale API URLs
export const clearNavigationCaches = () => {
  apiUrlCache.clear();
};

export default {
  ROUTES,
  ROUTE_CONFIG,
  getApiBaseUrl,
  getApiUrl,
  isApiRoute,
  canAccessRoute,
  getBreadcrumbs,
  getPageTitle,
  clearNavigationCaches,
};
