// src/pages/DataMarketplace.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { statusBadgeClass } from "../theme/statusColors";
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
    <div className="bg-surface border border-line rounded-token shadow-soft-sm hover:shadow-soft-md transition-shadow overflow-hidden">
      <div className="p-5">
        {/* Request Status Badge */}
        <div className="flex justify-between items-start mb-2">
          <span className={statusBadgeClass(request.status)}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <span className="text-xs text-fg-muted">{request.createdAt}</span>
        </div>

        {/* Request Title */}
        <h3 className="text-lg font-semibold text-fg mb-1">
          {request.title}
        </h3>

        {/* Request Description */}
        <p className="text-fg-muted text-sm mb-3 line-clamp-2">
          {request.description}
        </p>

        {/* Request Details */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="flex items-center">
            <Database size={16} className="text-fg-subtle mr-1" />
            <span className="text-fg-muted">Type: {request.dataType}</span>
          </div>
          <div className="flex items-center">
            <FileText size={16} className="text-fg-subtle mr-1" />
            <span className="text-fg-muted">Format: {request.format}</span>
          </div>
          <div className="flex items-center">
            <Clock size={16} className="text-fg-subtle mr-1" />
            <span className="text-fg-muted">Timeline: {request.timeline}</span>
          </div>
          <div className="flex items-center">
            <Award size={16} className="text-fg-subtle mr-1" />
            <span className="text-fg-muted">Reward: {request.reward} ETH</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {request.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-info-soft text-info text-xs px-2 py-1 rounded-token-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => onViewDetails(request.id)}
            className="text-accent hover:text-accent-hover text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            aria-label={`View details for ${request.title}`}
          >
            View Details
          </button>
          {request.status === "open" && (
            <button
              onClick={() => onRespond(request.id)}
              className="bg-accent hover:bg-accent-hover text-accent-fg px-4 py-1 rounded-token text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
      className="fixed inset-0 bg-fg/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-surface-raised border border-line rounded-token-lg shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 id="modal-title" className="text-xl font-bold text-fg">
              Create Data Request
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
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
                  className="block text-sm font-medium text-fg mb-1"
                >
                  Request Title*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.title ? "border-danger" : "border-line-strong"} rounded-token bg-surface text-fg`}
                  placeholder="e.g., Diabetes Patient Data for Research Study"
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.title}
                />
                {formErrors.title && (
                  <p className="text-danger text-xs mt-1">
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-fg mb-1"
                >
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.description ? "border-danger" : "border-line-strong"} rounded-token bg-surface text-fg`}
                  rows="4"
                  placeholder="Describe the data you need and how it will be used..."
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.description}
                ></textarea>
                {formErrors.description && (
                  <p className="text-danger text-xs mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>

              {/* Data Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dataType"
                    className="block text-sm font-medium text-fg mb-1"
                  >
                    Data Type
                  </label>
                  <select
                    id="dataType"
                    name="dataType"
                    value={formData.dataType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-line-strong rounded-token bg-surface text-fg"
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
                    className="block text-sm font-medium text-fg mb-1"
                  >
                    Preferred Format
                  </label>
                  <select
                    id="format"
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-line-strong rounded-token bg-surface text-fg"
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
                    className="block text-sm font-medium text-fg mb-1"
                  >
                    Timeline
                  </label>
                  <select
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-line-strong rounded-token bg-surface text-fg"
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
                    className="block text-sm font-medium text-fg mb-1"
                  >
                    Reward (ETH)
                  </label>
                  <input
                    type="number"
                    id="reward"
                    name="reward"
                    value={formData.reward}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${formErrors.reward ? "border-danger" : "border-line-strong"} rounded-token bg-surface text-fg`}
                    min="0.001"
                    step="0.001"
                    placeholder="0.05"
                    required
                    aria-required="true"
                    aria-invalid={!!formErrors.reward}
                  />
                  {formErrors.reward && (
                    <p className="text-danger text-xs mt-1">
                      {formErrors.reward}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="tagInput"
                  className="block text-sm font-medium text-fg mb-1"
                >
                  Tags
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    id="tagInput"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-line-strong rounded-l-token bg-surface text-fg"
                    placeholder="Add a tag (e.g., diabetes, cardiology)"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    aria-label="Enter tag"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-surface-raised border border-line-strong border-l-0 rounded-r-token text-fg hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
                        className="bg-info-soft text-info text-xs px-2 py-1 rounded-token-sm flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-info/70 hover:text-info focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded"
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
                  className="px-4 py-2 border border-line-strong rounded-token text-fg mr-2 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
          <h1 className="text-3xl font-bold text-fg">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
            <p className="text-fg-muted">Loading data requests...</p>
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
          <h1 className="text-3xl font-bold text-fg">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="bg-danger-soft border border-danger/30 text-danger px-4 py-3 rounded-token">
          <h3 className="font-medium">Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-danger underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
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
          <h1 className="text-3xl font-bold text-fg">
            Data Request Portal
          </h1>
          <div className="w-64">
            <WalletStatus minimal={false} showBalance={true} />
          </div>
        </div>
        <div className="bg-warning-soft border border-warning/30 text-warning px-4 py-3 rounded-token">
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
          <h1 className="text-3xl font-bold text-fg">
            Data Request Portal
          </h1>
          <p className="text-fg-muted mt-2">
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
            className="bg-accent hover:bg-accent-hover text-accent-fg px-4 py-2 rounded-token flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Create new data request"
          >
            <PlusCircle size={18} className="mr-2" />
            Create Data Request
          </button>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 border border-line-strong rounded-token text-fg hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
              <Search size={18} className="text-fg-subtle" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search requests..."
              className="pl-10 pr-3 py-2 w-full rounded-token border border-line-strong bg-surface text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Search requests"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center bg-surface px-3 py-2 rounded-token shadow-soft-sm border border-line">
            <Filter size={18} className="text-fg-subtle mr-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-fg pr-8 focus:outline-none"
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
        <div className="mb-4" aria-live="polite" aria-atomic="true">
          <p className="text-sm text-fg-muted">
            Found {filteredAndSearchedRequests.length} results for "{searchTerm}
            "
          </p>
        </div>
      )}

      {/* Loading Indicator for refreshes */}
      {loading && requests.length > 0 && (
        <div className="mb-4 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent mr-2"></div>
          <span className="text-sm text-fg-muted">Refreshing...</span>
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
        <div className="text-center p-12 bg-surface-raised rounded-token">
          <p className="text-fg-muted">
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
              className="px-3 py-1 border border-line-strong rounded-l-token text-fg hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &lsaquo;
            </button>

            <div className="px-4 py-1 border-t border-b border-line-strong bg-surface">
              <span className="text-sm text-fg">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-1 border border-line-strong rounded-r-token text-fg hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
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
