// src/redux/middleware/hipaaAuditMiddleware.js
import hipaaComplianceService from "../../services/hipaaComplianceService";

/**
 * Redux middleware to handle HIPAA compliance audit logging
 * This centralizes audit logging for important state changes
 */
export const hipaaAuditMiddleware = store => next => action => {
  // Process the action first
  const result = next(action);
  
  // Then handle audit logging for specific actions
  try {
    const { type, payload } = action;
    
    // Log role changes
    if (type === 'role/setRole') {
      hipaaComplianceService.createAuditLog("ROLE_CHANGE", {
        action: "UPDATE",
        newRole: payload,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error("Failed to log role change:", err));
    }
    
    // Log role clearing
    if (type === 'role/clearRole') {
      const previousRole = store.getState().role.role;
      if (previousRole) {
        hipaaComplianceService.createAuditLog("ROLE_CHANGE", {
          action: "CLEAR",
          previousRole,
          timestamp: new Date().toISOString(),
        }).catch(err => console.error("Failed to log role clearing:", err));
      }
    }
    
    // Log permission changes
    if (type === 'role/setPermissions') {
      hipaaComplianceService.createAuditLog("PERMISSIONS_CHANGE", {
        action: "UPDATE",
        role: store.getState().role.role,
        permissions: payload,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error("Failed to log permissions change:", err));
    }
    
    // Log authentication events
    if (type === 'auth/loginAsync/fulfilled') {
      hipaaComplianceService.createAuditLog("AUTH_SUCCESS", {
        action: "LOGIN",
        timestamp: new Date().toISOString(),
        userId: payload.userId,
      }).catch(err => console.error("Failed to log auth success:", err));
    }
    
    // Log logout events
    if (type === 'auth/logoutAsync/fulfilled') {
      hipaaComplianceService.createAuditLog("AUTH_LOGOUT", {
        action: "LOGOUT",
        timestamp: new Date().toISOString(),
      }).catch(err => console.error("Failed to log logout:", err));
    }
    
    // Add more action types to log as needed
    
  } catch (error) {
    console.error("Error in HIPAA audit middleware:", error);
  }
  
  return result;
};

export default hipaaAuditMiddleware;