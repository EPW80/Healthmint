// src/pages/DataMarketplace.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
} from "lucide-react";

// Mock data service - you would replace this with your actual data service
import mockDataService from "../services/mockDataService";
import useAsyncOperation from "../hooks/useAsyncOperation";

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
const DataRequestCard = React.memo(({ request, onRespond, onViewDetails }) => {
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
            aria-label={`View details for ${request.title}`}
          >
            View Details
          </button>
          {request.status === "open" && (
            <button
              onClick={() => onRespond(request.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium transition-colors"
              aria-label={`Respond to request: ${request.title}`}
            >
              Respond to Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

DataRequestCard.displayName = "DataRequestCard";

// New Request Modal Component
const NewRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const initialFormData = {
    title: "",
    description: "",
    dataType: "Clinical",
    format: "CSV",
    timeline: "1-2 weeks",
    reward: "0.05",
    tags: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [tagInput, setTagInput] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
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

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (parseFloat(formData.reward) <= 0) {
      errors.reward = "Reward must be greater than 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      setFormData(initialFormData); // Reset form after submission
    }
  };

  // Close modal with escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 id="modal-title" className="text-xl font-bold text-gray-800">
              Create Data Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Request Title*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.title ? "border-red-500" : "border-gray-300"} rounded-md`}
                  placeholder="e.g., Diabetes Patient Data for Research Study"
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.title}
                />
                {formErrors.title && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.description ? "border-red-500" : "border-gray-300"} rounded-md`}
                  rows="4"
                  placeholder="Describe the data you need and how it will be used..."
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.description}
                ></textarea>
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>

              {/* Data Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dataType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Data Type
                  </label>
                  <select
                    id="dataType"
                    name="dataType"
                    value={formData.dataType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    aria-label="Select data type"
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
                  <label
                    htmlFor="format"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Preferred Format
                  </label>
                  <select
                    id="format"
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    aria-label="Select preferred format"
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
                  <label
                    htmlFor="timeline"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Timeline
                  </label>
                  <select
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    aria-label="Select timeline"
                  >
                    <option value="ASAP">As soon as possible</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="3 months">3 months</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reward"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Reward (ETH)
                  </label>
                  <input
                    type="number"
                    id="reward"
                    name="reward"
                    value={formData.reward}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${formErrors.reward ? "border-red-500" : "border-gray-300"} rounded-md`}
                    min="0.001"
                    step="0.001"
                    placeholder="0.05"
                    required
                    aria-required="true"
                    aria-invalid={!!formErrors.reward}
                  />
                  {formErrors.reward && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.reward}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="tagInput"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tags
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    id="tagInput"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                    placeholder="Add a tag (e.g., diabetes, cardiology)"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    aria-label="Enter tag"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-300"
                    aria-label="Add tag"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" aria-live="polite">
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
                          aria-label={`Remove tag ${tag}`}
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

// DataMarketplace component
const DataMarketplace = () => {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const dispatch = useDispatch();

  // Get user role and wallet connection from Redux
  const userRole = useSelector((state) => state.role.role);
  const walletAddress = useSelector((state) => state.wallet.address);
  const isConnected = useSelector((state) => state.wallet.isConnected);

  // Define a default implementation
  const useDefaultAsyncOperation = () => ({
    loading: false,
    error: null,
    execute: async (fn) => await fn(),
  });

  // Always call a hook unconditionally
  const { loading, error, execute } = (
    useAsyncOperation || useDefaultAsyncOperation
  )({
    componentId: "data-marketplace",
  });

  // Fetch available data requests
  const fetchRequests = useCallback(async () => {
    try {
      // Check if the necessary function exists in mockDataService or use fallback
      const getRequests =
        mockDataService.getDataRequests || fallbackMockService.getDataRequests;

      const response = await execute(getRequests);
      setRequests(response || []);

      return response;
    } catch (err) {
      console.error("Error fetching data requests:", err);

      // Use fallback data if there's an error
      setRequests(MOCK_REQUESTS);

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load data requests, using mock data instead",
          duration: 5000,
        })
      );

      return MOCK_REQUESTS;
    }
  }, [dispatch, execute]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

      // Use the execute function from useAsyncOperation if available
      const result = await execute(() =>
        createRequest({
          ...formData,
          researcher: walletAddress,
          status: "open",
          createdAt: new Date().toLocaleDateString(),
        })
      );

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

  // Handle search and filtering
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Memoize filtered and searched requests
  const filteredAndSearchedRequests = useMemo(() => {
    // First filter by status
    let result =
      filterStatus === "all"
        ? requests
        : requests.filter((req) => req.status === filterStatus);

    // Then filter by search term if present
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.title.toLowerCase().includes(searchLower) ||
          req.description.toLowerCase().includes(searchLower) ||
          req.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [requests, filterStatus, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(
    filteredAndSearchedRequests.length / itemsPerPage
  );
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedRequests.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [filteredAndSearchedRequests, currentPage]);

  // Pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchRequests();
    dispatch(
      addNotification({
        type: "info",
        message: "Refreshing data requests...",
        duration: 2000,
      })
    );
  };

  // Render loading state
  if (loading && requests.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading data requests...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && requests.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <h3 className="font-medium">Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-red-700 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Only researchers can access the data request portal
  if (userRole !== "researcher") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <h3 className="font-medium">Researcher Access Only</h3>
          <p>
            You need researcher privileges to access the data request portal.
          </p>
        </div>
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
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            aria-label="Create new data request"
          >
            <PlusCircle size={18} className="mr-2" />
            Create Data Request
          </button>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            aria-label="Refresh data requests"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search requests..."
              className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search requests"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
            <Filter size={18} className="text-gray-400 mr-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-gray-700 pr-8 focus:outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All Requests</option>
              <option value="open">Open Requests</option>
              <option value="pending">Pending Requests</option>
              <option value="fulfilled">Fulfilled Requests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {searchTerm && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Found {filteredAndSearchedRequests.length} results for "{searchTerm}
            "
          </p>
        </div>
      )}

      {/* Loading Indicator for refreshes */}
      {loading && requests.length > 0 && (
        <div className="mb-4 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-gray-600">Refreshing...</span>
        </div>
      )}

      {/* Request Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRequests.map((request) => (
          <DataRequestCard
            key={request.id}
            request={request}
            onRespond={handleRespond}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredAndSearchedRequests.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {searchTerm
              ? `No results found for "${searchTerm}". Try different keywords.`
              : filterStatus === "all"
                ? "No data requests available. Create the first one!"
                : `No ${filterStatus} requests found.`}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredAndSearchedRequests.length > itemsPerPage && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 py-1 border border-gray-300 rounded-l-md text-gray-700 hover:bg-gray-50"
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &lsaquo;
            </button>

            <div className="px-4 py-1 border-t border-b border-gray-300 bg-white">
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-1 border border-gray-300 rounded-r-md text-gray-700 hover:bg-gray-50"
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              &rsaquo;
            </button>
          </nav>
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
