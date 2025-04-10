// src/pages/DataMarketplace.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import WalletStatus from "../components/WalletStatus";
import { addNotification } from "../redux/slices/notificationSlice";
import {
  PlusCircle,
  Filter,
  Database,
  FileText,
  Clock,
  Award,
} from "lucide-react";

// Mock data service - you would replace this with your actual data service
import mockDataService from "../services/mockDataService";

// Fallback mock data for requests if service function doesn't exist
const MOCK_REQUESTS = [
  {
    id: "req-001",
    title: "Diabetes Type 2 Patient Data",
    description:
      "Looking for anonymized blood glucose monitoring data from patients with Type 2 diabetes over a 6-month period. Data should include medication information, diet logs if available.",
    researcher: "0x4a8b...1c93",
    status: "open",
    dataType: "Clinical",
    format: "CSV",
    timeline: "1 month",
    reward: "0.15",
    tags: ["diabetes", "glucose", "medication"],
    createdAt: "04/05/2025",
  },
  {
    id: "req-002",
    title: "Cardiovascular MRI Imaging Dataset",
    description:
      "Seeking cardiac MRI images for AI model training. Need at least 100 anonymized samples with various conditions including normal, post-MI, and cardiomyopathy cases.",
    researcher: "0x7d3e...9f21",
    status: "pending",
    dataType: "Imaging",
    format: "DICOM",
    timeline: "3 months",
    reward: "0.25",
    tags: ["cardiology", "MRI", "imaging", "AI"],
    createdAt: "04/01/2025",
  },
  {
    id: "req-003",
    title: "Sleep Pattern Data from Wearables",
    description:
      "Requesting sleep tracking data from wearable devices. Interested in sleep stages, disruptions, and correlation with activity levels.",
    researcher: "0x2f7b...5e12",
    status: "fulfilled",
    dataType: "Wearable",
    format: "JSON",
    timeline: "1-2 weeks",
    reward: "0.08",
    tags: ["sleep", "wearable", "activity"],
    createdAt: "03/18/2025",
  },
  {
    id: "req-004",
    title: "COVID-19 Long-term Symptom Tracking",
    description:
      "Need symptom tracking data from post-COVID patients experiencing long-term effects. Looking for at least 6 months of follow-up data.",
    researcher: "0x9a1c...7b42",
    status: "open",
    dataType: "Survey",
    format: "CSV",
    timeline: "ASAP",
    reward: "0.12",
    tags: ["covid", "long-covid", "symptoms"],
    createdAt: "04/08/2025",
  },
];

// Fallback mock service implementations if they don't exist
const fallbackMockService = {
  getDataRequests: async () => {
    console.log("Using fallback mock getDataRequests implementation");
    return MOCK_REQUESTS;
  },
  createDataRequest: async (requestData) => {
    console.log(
      "Using fallback mock createDataRequest implementation",
      requestData
    );
    const newRequest = {
      id: `req-${Math.floor(1000 + Math.random() * 9000)}`,
      ...requestData,
      createdAt: new Date().toLocaleDateString(),
    };
    return {
      success: true,
      request: newRequest,
    };
  },
};

// Request Card Component
const DataRequestCard = ({ request, onRespond, onViewDetails }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-5">
        {/* Request Status Badge */}
        <div className="flex justify-between items-start mb-2">
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded ${
              request.status === "open"
                ? "bg-green-100 text-green-800"
                : request.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
            }`}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <span className="text-xs text-gray-500">{request.createdAt}</span>
        </div>

        {/* Request Title */}
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {request.title}
        </h3>

        {/* Request Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {request.description}
        </p>

        {/* Request Details */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="flex items-center">
            <Database size={16} className="text-gray-400 mr-1" />
            <span className="text-gray-600">Type: {request.dataType}</span>
          </div>
          <div className="flex items-center">
            <FileText size={16} className="text-gray-400 mr-1" />
            <span className="text-gray-600">Format: {request.format}</span>
          </div>
          <div className="flex items-center">
            <Clock size={16} className="text-gray-400 mr-1" />
            <span className="text-gray-600">Timeline: {request.timeline}</span>
          </div>
          <div className="flex items-center">
            <Award size={16} className="text-gray-400 mr-1" />
            <span className="text-gray-600">Reward: {request.reward} ETH</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {request.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => onViewDetails(request.id)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </button>
          {request.status === "open" && (
            <button
              onClick={() => onRespond(request.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Respond to Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// New Request Modal Component
const NewRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dataType: "Clinical",
    format: "CSV",
    timeline: "1-2 weeks",
    reward: "0.05",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Create Data Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Title*
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Diabetes Patient Data for Research Study"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="4"
                  placeholder="Describe the data you need and how it will be used..."
                  required
                ></textarea>
              </div>

              {/* Data Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Type
                  </label>
                  <select
                    name="dataType"
                    value={formData.dataType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Clinical">Clinical</option>
                    <option value="Genomic">Genomic</option>
                    <option value="Imaging">Imaging</option>
                    <option value="Wearable">Wearable</option>
                    <option value="Survey">Survey</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Format
                  </label>
                  <select
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="CSV">CSV</option>
                    <option value="JSON">JSON</option>
                    <option value="FHIR">FHIR</option>
                    <option value="HL7">HL7</option>
                    <option value="DICOM">DICOM</option>
                    <option value="Any">Any format</option>
                  </select>
                </div>
              </div>

              {/* Timeline and Reward */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeline
                  </label>
                  <select
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="ASAP">As soon as possible</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="3 months">3 months</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reward (ETH)
                  </label>
                  <input
                    type="number"
                    name="reward"
                    value={formData.reward}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0.001"
                    step="0.001"
                    placeholder="0.05"
                    required
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                    placeholder="Add a tag (e.g., diabetes, cardiology)"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-blue-400 hover:text-blue-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Request
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Data Request Portal (formerly Data Marketplace)
 *
 * Allows researchers to create and view data requests for specific research needs
 */
const DataMarketplace = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const dispatch = useDispatch();

  // Get user role and wallet connection from Redux
  const userRole = useSelector((state) => state.role.role);
  const walletAddress = useSelector((state) => state.wallet.address);
  const isConnected = useSelector((state) => state.wallet.isConnected);

  // Fetch available data requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // Check if the necessary function exists in mockDataService or use fallback
        const getRequests =
          mockDataService.getDataRequests ||
          fallbackMockService.getDataRequests;
        const response = await getRequests();
        setRequests(response || []);
      } catch (err) {
        console.error("Error fetching data requests:", err);
        setError("Failed to load data requests. Please try again later.");

        // Use fallback data if there's an error
        setRequests(MOCK_REQUESTS);

        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load data requests, using mock data instead",
            duration: 5000,
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [dispatch]);

  // Handle view details
  const handleViewDetails = (requestId) => {
    console.log(`Viewing details for request: ${requestId}`);

    // Since we likely don't have a details page yet, show a notification
    dispatch(
      addNotification({
        type: "info",
        message: `Viewing details for request ID: ${requestId}`,
        duration: 3000,
      })
    );

    // Commented out for now until detail page is implemented
    // navigate(`/requests/${requestId}`);
  };

  // Handle responding to a request
  const handleRespond = async (requestId) => {
    if (!isConnected) {
      dispatch(
        addNotification({
          type: "error",
          message: "Please connect your wallet first",
          duration: 5000,
        })
      );
      return;
    }

    try {
      console.log(`Responding to request: ${requestId}`);

      // Show notification
      dispatch(
        addNotification({
          type: "info",
          message: "Preparing response form...",
          duration: 3000,
        })
      );

      // Since we likely don't have a response page yet, just show a notification
      dispatch(
        addNotification({
          type: "success",
          message: "Response feature will be implemented soon!",
          duration: 3000,
        })
      );

      // Commented out for now until response page is implemented
      // navigate(`/requests/${requestId}/respond`);
    } catch (err) {
      console.error("Response error:", err);

      dispatch(
        addNotification({
          type: "error",
          message:
            err.message || "Failed to process response. Please try again.",
          duration: 5000,
        })
      );
    }
  };

  // Handle creating a new request
  const handleCreateRequest = async (formData) => {
    if (!isConnected) {
      dispatch(
        addNotification({
          type: "error",
          message: "Please connect your wallet first",
          duration: 5000,
        })
      );
      return;
    }

    try {
      setIsModalOpen(false);

      dispatch(
        addNotification({
          type: "info",
          message: "Creating your data request...",
          duration: 3000,
        })
      );

      // Check if the necessary function exists in mockDataService or use fallback
      const createRequest =
        mockDataService.createDataRequest ||
        fallbackMockService.createDataRequest;

      // This would be replaced with your actual API call
      const result = await createRequest({
        ...formData,
        researcher: walletAddress,
        status: "open",
        createdAt: new Date().toLocaleDateString(),
      });

      if (result.success) {
        // Add the new request to the list
        setRequests((prev) => [result.request, ...prev]);

        dispatch(
          addNotification({
            type: "success",
            message: "Your data request has been created successfully!",
            duration: 5000,
          })
        );
      } else {
        throw new Error(result.message || "Failed to create request");
      }
    } catch (err) {
      console.error("Create request error:", err);

      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to create request. Please try again.",
          duration: 5000,
        })
      );
    }
  };

  // Filter requests by status
  const filteredRequests =
    filterStatus === "all"
      ? requests
      : requests.filter((req) => req.status === filterStatus);

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error && requests.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  // Only researchers can access the data request portal
  if (userRole !== "researcher") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
        <h3 className="font-medium">Researcher Access Only</h3>
        <p>You need researcher privileges to access the data request portal.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Data Request Portal
          </h1>
          <p className="text-gray-600 mt-2">
            Create requests for specific health data or respond to existing
            requests from other researchers.
          </p>
        </div>

        {/* Wallet Status Component */}
        <div className="w-64">
          <WalletStatus minimal={false} showBalance={true} />
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <PlusCircle size={18} className="mr-2" />
          Create Data Request
        </button>

        <div className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <Filter size={18} className="text-gray-400 mr-2" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-gray-700 pr-8 focus:outline-none"
          >
            <option value="all">All Requests</option>
            <option value="open">Open Requests</option>
            <option value="pending">Pending Requests</option>
            <option value="fulfilled">Fulfilled Requests</option>
          </select>
        </div>
      </div>

      {/* Request Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <DataRequestCard
            key={request.id}
            request={request}
            onRespond={handleRespond}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {filterStatus === "all"
              ? "No data requests available. Create the first one!"
              : `No ${filterStatus} requests found.`}
          </p>
        </div>
      )}

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
};

export default DataMarketplace;
