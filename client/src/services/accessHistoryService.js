// client/src/services/accessHistoryService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";

// Helper to generate mock access history data
const generateMockAccessHistory = (userId) => {
  // Types of accessors
  const accessorTypes = ["RESEARCHER", "INSTITUTION", "SYSTEM", "SELF"];

  // Types of actions
  const actionTypes = [
    "VIEW",
    "DOWNLOAD",
    "SHARE",
    "UPLOAD",
    "PURCHASE",
    "ANALYSIS",
  ];

  // Record categories
  const recordCategories = [
    "Physical Exam",
    "Laboratory",
    "Cardiology",
    "Genetics",
    "Immunization",
    "Dental",
  ];

  // Accessor names based on type
  const getAccessorName = (type) => {
    switch (type) {
      case "RESEARCHER":
        return [
          "Dr. Emily Chen",
          "Dr. Michael Rodriguez",
          "Dr. Sarah Johnson",
          "Dr. David Kim",
        ][Math.floor(Math.random() * 4)];
      case "INSTITUTION":
        return [
          "Central Research Hospital",
          "National Health Institute",
          "Medical Research Labs",
          "University Health Center",
        ][Math.floor(Math.random() * 4)];
      case "SYSTEM":
        return "Healthmint System";
      case "SELF":
        return "You";
      default:
        return "Unknown";
    }
  };

  // Purpose based on action and accessor type
  const getPurpose = (action, accessorType) => {
    if (accessorType === "SELF") {
      return "Personal access to your own health data";
    }

    if (accessorType === "SYSTEM") {
      return "Automated system access for maintenance or processing";
    }

    switch (action) {
      case "VIEW":
        return "Reviewing health data for clinical evaluation";
      case "DOWNLOAD":
        return "Retrieving health data for offline analysis";
      case "SHARE":
        return "Sharing data with authorized healthcare providers";
      case "UPLOAD":
        return "Uploading new health information to your record";
      case "PURCHASE":
        return "Purchasing anonymized data for research purposes";
      case "ANALYSIS":
        return "Analyzing health patterns for research study";
      default:
        return "Accessing health data";
    }
  };

  // Generate a random date within the past year
  const getRandomDate = () => {
    const now = new Date();
    const pastYear = new Date();
    pastYear.setFullYear(now.getFullYear() - 1);

    return new Date(
      pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime())
    ).toISOString();
  };

  // Generate IP addresses
  const getRandomIP = () => {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  };

  // Generate record IDs and names
  const records = Array(8)
    .fill()
    .map((_, i) => {
      const category =
        recordCategories[Math.floor(Math.random() * recordCategories.length)];
      return {
        id: `record-${Date.now()}-${i}`,
        name: `${category} Record (${new Date().getFullYear() - Math.floor(Math.random() * 3)})`,
        category,
      };
    });

  // Generate 20-30 access events
  const eventCount = Math.floor(Math.random() * 11) + 20; // 20-30 events

  return Array(eventCount)
    .fill()
    .map((_, i) => {
      const accessorType =
        accessorTypes[Math.floor(Math.random() * accessorTypes.length)];
      const actionType =
        actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const record = records[Math.floor(Math.random() * records.length)];
      const timestamp = getRandomDate();

      // Special case for SELF type - make it more recent
      let adjustedTimestamp = timestamp;
      if (accessorType === "SELF") {
        const now = new Date();
        const pastMonth = new Date();
        pastMonth.setMonth(now.getMonth() - 1);
        adjustedTimestamp = new Date(
          pastMonth.getTime() +
            Math.random() * (now.getTime() - pastMonth.getTime())
        ).toISOString();
      }

      const accessorName = getAccessorName(accessorType);
      const purpose = getPurpose(actionType, accessorType);

      return {
        id: `access-${Date.now()}-${i}`,
        userId,
        accessorType,
        accessorName,
        actionType,
        recordId: record.id,
        recordName: record.name,
        recordCategory: record.category,
        timestamp: adjustedTimestamp,
        purpose,
        description: `${accessorName} ${actionType.toLowerCase()}ed your ${record.category.toLowerCase()} data`,
        ipAddress: getRandomIP(),
        authorized: Math.random() > 0.05, // 5% chance of unauthorized access
        consentReference:
          Math.random() > 0.7
            ? `CONSENT-${Date.now().toString(36).substr(-8)}`
            : null,
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp, newest first
};

// Access history service
const accessHistoryService = {
  // Get access history for a user
  getAccessHistory: async (userId) => {
    try {
      // First, try to get real data from the API (would work in a real app)
      if (!apiService.isMockDataEnabled?.()) {
        const response = await apiService.get(
          `/users/${userId}/access-history`
        );
        return response;
      }

      // Log the access for HIPAA compliance
      await hipaaComplianceService.createAuditLog("ACCESS_HISTORY_RETRIEVAL", {
        userId,
        timestamp: new Date().toISOString(),
        action: "RETRIEVE",
      });

      // Generate mock data
      const mockData = generateMockAccessHistory(userId);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        success: true,
        data: mockData,
      };
    } catch (error) {
      console.error("Error fetching access history:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve access history",
      };
    }
  },

  // Dispute an access event
  disputeAccess: async (accessEventId, reason) => {
    try {
      // In a real application, this would make an API call
      if (!apiService.isMockDataEnabled?.()) {
        const response = await apiService.post(`/access-disputes`, {
          accessEventId,
          reason,
        });
        return response;
      }

      // Log the dispute for HIPAA compliance
      await hipaaComplianceService.createAuditLog("ACCESS_DISPUTE_FILED", {
        accessEventId,
        reason,
        timestamp: new Date().toISOString(),
        action: "DISPUTE",
      });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      return {
        success: true,
        message: "Access dispute filed successfully",
      };
    } catch (error) {
      console.error("Error filing access dispute:", error);
      return {
        success: false,
        message: error.message || "Failed to file access dispute",
      };
    }
  },

  // Get detailed information about a specific access event
  getAccessDetail: async (accessEventId) => {
    try {
      // In a real application, this would make an API call
      if (!apiService.isMockDataEnabled?.()) {
        const response = await apiService.get(
          `/access-events/${accessEventId}`
        );
        return response;
      }

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        message: "Access detail retrieved successfully",
        // In a real app, this would return actual data
        data: {
          id: accessEventId,
          // Other details would be returned here
        },
      };
    } catch (error) {
      console.error("Error getting access detail:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve access detail",
      };
    }
  },
};

export default accessHistoryService;
