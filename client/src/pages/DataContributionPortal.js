// src/pages/DataContributionPortal.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import WalletStatus from "../components/WalletStatus";
import { addNotification } from "../redux/slices/notificationSlice";
import {
  Filter,
  Database,
  FileText,
  Clock,
  Award,
  Upload,
  Shield,
  Search,
  Check,
} from "lucide-react";

// Mock data
import { MOCK_REQUESTS } from "../mockData/mockDataRequests";

// Data Submission Modal Component
const DataSubmissionModal = ({ isOpen, onClose, onSubmit, request }) => {
  const [formData, setFormData] = useState({
    files: [],
    additionalNotes: "",
    isAnonymized: true,
    customTerms: false,
    agreedToTerms: false,
  });

  const [fileNames, setFileNames] = useState([]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    // Store file names for display
    const selectedFiles = Array.from(e.target.files);
    setFileNames(selectedFiles.map((file) => file.name));

    // In a real app, you'd handle actual file uploads
    setFormData((prev) => ({ ...prev, files: selectedFiles }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      alert("You must agree to the terms to submit data");
      return;
    }
    onSubmit({ requestId: request.id, ...formData });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-raised border border-line rounded-token shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-fg">
              Submit Your Health Data
            </h2>
            <button
              onClick={onClose}
              className="text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              &times;
            </button>
          </div>

          {/* Request details summary */}
          <div className="bg-info-soft border border-info/30 p-4 rounded-token mb-6">
            <h3 className="font-medium text-info">{request?.title}</h3>
            <p className="text-sm text-info/80 mt-1">
              {request?.description?.substring(0, 150)}...
            </p>
            <div className="flex items-center mt-2">
              <Award size={16} className="text-info mr-1" />
              <span className="text-sm text-info font-medium">
                Reward: {request?.reward} ETH
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <p className="block text-sm font-medium text-fg mb-1">
                  Upload Health Data Files*
                </p>
                <div className="border-2 border-dashed border-line-strong rounded-token p-4 text-center bg-surface">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-fg-subtle" />
                    <span className="mt-2 text-sm text-fg-muted">
                      Click to select files or drag and drop
                    </span>
                    <span className="mt-1 text-xs text-fg-subtle">
                      Supported formats: CSV, JSON, PDF, DICOM, HL7
                    </span>
                  </label>
                </div>

                {/* Selected files list */}
                {fileNames.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-fg">
                      Selected Files:
                    </h4>
                    <ul className="mt-1 text-sm text-fg-muted">
                      {fileNames.map((name, index) => (
                        <li key={index} className="flex items-center">
                          <Check size={14} className="text-success mr-1" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor="dcp-additional-notes" className="block text-sm font-medium text-fg mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="dcp-additional-notes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-line-strong rounded-token bg-surface text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  rows="3"
                  placeholder="Add any relevant information about the data you're providing..."
                ></textarea>
              </div>

              {/* Data Privacy Options */}
              <div className="bg-surface p-4 rounded-token border border-line">
                <h4 className="font-medium text-fg mb-2">
                  Data Privacy Options
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="anonymized"
                      name="isAnonymized"
                      checked={formData.isAnonymized}
                      onChange={handleChange}
                      className="mt-1 mr-2"
                    />
                    <div>
                      <label
                        htmlFor="anonymized"
                        className="font-medium text-fg text-sm"
                      >
                        Anonymize my data
                      </label>
                      <p className="text-xs text-fg-muted">
                        Remove personally identifiable information before
                        sharing with the researcher
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="customTerms"
                      name="customTerms"
                      checked={formData.customTerms}
                      onChange={handleChange}
                      className="mt-1 mr-2"
                    />
                    <div>
                      <label
                        htmlFor="customTerms"
                        className="font-medium text-fg text-sm"
                      >
                        Set custom usage terms
                      </label>
                      <p className="text-xs text-fg-muted">
                        Specify how your data can be used beyond this research
                        project
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="border-t border-line pt-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleChange}
                    required
                    className="mt-1 mr-2"
                  />
                  <div>
                    <label
                      htmlFor="terms"
                      className="font-medium text-fg text-sm"
                    >
                      I agree to the terms of data sharing*
                    </label>
                    <p className="text-xs text-fg-muted">
                      By submitting data, you confirm that you have the right to
                      share this information and agree to the platform's data
                      sharing policies. Your data will be used according to the
                      researcher's stated purpose.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-line-strong rounded-token text-fg mr-2 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-token disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={fileNames.length === 0 || !formData.agreedToTerms}
                >
                  Submit Data
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Request Card Component (Patient version)
const RequestCardPatient = ({ request, onContribute, onViewDetails }) => {
  return (
    <div className="bg-surface border border-line rounded-token shadow-soft-sm overflow-hidden hover:shadow-soft-md transition-shadow">
      <div className="p-5">
        {/* Request Status Badge */}
        <div className="flex justify-between items-start mb-2">
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded ${
              request.status === "open"
                ? "bg-success-soft text-success"
                : request.status === "pending"
                  ? "bg-warning-soft text-warning"
                  : "bg-info-soft text-info"
            }`}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <span className="text-xs text-fg-subtle">{request.createdAt}</span>
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
            <span className="font-medium text-success">
              Reward: {request.reward} ETH
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {request.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-token"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Privacy Indicator */}
        <div className="flex items-center mb-4 bg-surface-raised p-2 rounded-token border border-line">
          <Shield size={16} className="text-fg-subtle mr-2" />
          <span className="text-xs text-fg-muted">
            Your data will be{" "}
            {request.anonymized ? "anonymized" : "de-identified"} and protected
            by blockchain verification
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => onViewDetails(request.id)}
            className="text-accent hover:text-accent-hover text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            View Details
          </button>
          {request.status === "open" && (
            <button
              onClick={() => onContribute(request.id)}
              className="bg-accent hover:bg-accent-hover text-accent-fg px-4 py-1 rounded-token text-sm font-medium transition-colors flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Upload size={14} className="mr-1" />
              Contribute Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Data Contribution Portal Component
const DataContributionPortal = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [myContributions, setMyContributions] = useState([]);

  const dispatch = useDispatch();

  // Get user role and wallet connection from Redux
  const userRole = useSelector((state) => state.role.role);
  const isConnected = useSelector((state) => state.wallet.isConnected);

  // Fetch available data requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // In a real app, you would call your API
        // For now, simulate a delay and use mock data
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Use mock data
        setRequests(MOCK_REQUESTS || []);
      } catch (err) {
        console.error("Error fetching data requests:", err);
        setError("Failed to load data requests. Please try again later.");

        // Still use mock data in case of error
        setRequests(MOCK_REQUESTS || []);

        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load data requests, using cached data instead",
            duration: 5000,
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    // Simulate fetching user contributions
    setMyContributions([
      {
        requestId: "req-003",
        submittedDate: "03/24/2025",
        status: "approved",
        reward: "0.08",
        paid: true,
      },
    ]);
  }, [dispatch]);

  // Filter requests based on search term and status
  useEffect(() => {
    let result = requests;

    // Filter by status first
    if (filterStatus !== "all") {
      result = result.filter((req) => req.status === filterStatus);
    }

    // Then filter by search term if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.title.toLowerCase().includes(term) ||
          req.description.toLowerCase().includes(term) ||
          req.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Exclude requests that the user has already contributed to
    const contributedRequestIds = myContributions.map((c) => c.requestId);
    result = result.filter((req) => !contributedRequestIds.includes(req.id));

    setFilteredRequests(result);
  }, [requests, filterStatus, searchTerm, myContributions]);

  // Handle view details
  const handleViewDetails = (requestId) => {
    console.log(`Viewing details for request: ${requestId}`);

    // For now, just show a notification
    dispatch(
      addNotification({
        type: "info",
        message: `Viewing details for request ID: ${requestId}`,
        duration: 3000,
      })
    );
  };

  // Handle contributing to a request
  const handleContribute = (requestId) => {
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

    // Find the request in our data
    const request = requests.find((req) => req.id === requestId);
    if (!request) {
      dispatch(
        addNotification({
          type: "error",
          message: "Request not found",
          duration: 3000,
        })
      );
      return;
    }

    // Set the selected request and open the modal
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  // Handle data submission
  const handleSubmitData = async (submissionData) => {
    try {
      setIsModalOpen(false);

      dispatch(
        addNotification({
          type: "info",
          message: "Processing your data submission...",
          duration: 3000,
        })
      );

      // Simulate API call with a delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Add this to the user's contributions
      const newContribution = {
        requestId: submissionData.requestId,
        submittedDate: new Date().toLocaleDateString(),
        status: "pending",
        reward:
          requests.find((r) => r.id === submissionData.requestId)?.reward ||
          "0.00",
        paid: false,
      };

      setMyContributions((prev) => [...prev, newContribution]);

      dispatch(
        addNotification({
          type: "success",
          message: "Your data has been submitted successfully!",
          duration: 5000,
        })
      );
    } catch (err) {
      console.error("Submission error:", err);

      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to submit data. Please try again.",
          duration: 5000,
        })
      );
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  // Render error state
  if (error && requests.length === 0) {
    return (
      <div className="bg-danger-soft border border-danger/30 text-danger px-4 py-3 rounded-token">
        {error}
      </div>
    );
  }

  // Only patients can access the data contribution portal
  if (userRole !== "patient") {
    return (
      <div className="bg-warning-soft border border-warning/30 text-warning px-4 py-3 rounded-token">
        <h3 className="font-medium">Patient Access Only</h3>
        <p>
          You need patient privileges to access the data contribution portal.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-fg">
            Data Contribution Portal
          </h1>
          <p className="text-fg-muted mt-2">
            Share your health data with researchers and earn rewards while
            advancing medical research
          </p>
        </div>

        {/* Wallet Status Component */}
        <div className="w-64">
          <WalletStatus minimal={false} showBalance={true} />
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-gradient-to-r from-accent to-purple-600 rounded-token shadow-soft-md p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-2">
          Your Contribution Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-surface/10 rounded-lg p-4">
            <p className="text-white/70 text-sm">Total Contributions</p>
            <p className="text-2xl font-bold">{myContributions.length}</p>
          </div>
          <div className="bg-surface/10 rounded-lg p-4">
            <p className="text-white/70 text-sm">Total Earnings</p>
            <p className="text-2xl font-bold">
              {myContributions
                .reduce((sum, item) => sum + parseFloat(item.reward), 0)
                .toFixed(3)}{" "}
              ETH
            </p>
          </div>
          <div className="bg-surface/10 rounded-lg p-4">
            <p className="text-white/70 text-sm">Pending Rewards</p>
            <p className="text-2xl font-bold">
              {myContributions
                .filter((item) => !item.paid)
                .reduce((sum, item) => sum + parseFloat(item.reward), 0)
                .toFixed(3)}{" "}
              ETH
            </p>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* Search input */}
        <div className="w-full md:w-1/3 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-line-strong rounded-token bg-surface text-fg w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
        </div>

        <div className="flex items-center bg-surface-raised px-3 py-2 rounded-token border border-line">
          <Filter size={18} className="text-fg-subtle mr-2" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-fg pr-8 focus:outline-none"
          >
            <option value="all">All Requests</option>
            <option value="open">Open Requests</option>
            <option value="pending">Pending Requests</option>
            <option value="fulfilled">Fulfilled Requests</option>
          </select>
        </div>
      </div>

      {/* Your Recent Contributions Section */}
      {myContributions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-fg mb-4">
            Your Recent Contributions
          </h2>
          <div className="bg-surface border border-line rounded-token shadow-soft-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <caption className="sr-only">Your recent data contributions</caption>
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      Date Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      Reward
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-line">
                  {myContributions.map((contribution, idx) => {
                    // Find the corresponding request
                    const request = requests.find(
                      (r) => r.id === contribution.requestId
                    ) || {
                      title: "Unknown Request",
                      id: contribution.requestId,
                    };

                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-fg">
                          {request.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-fg-muted">
                          {contribution.submittedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              contribution.status === "approved"
                                ? "bg-success-soft text-success"
                                : contribution.status === "pending"
                                  ? "bg-warning-soft text-warning"
                                  : contribution.status === "rejected"
                                    ? "bg-danger-soft text-danger"
                                    : "bg-surface-raised text-fg"
                            }`}
                          >
                            {contribution.status.charAt(0).toUpperCase() +
                              contribution.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-fg-muted">
                          {contribution.reward} ETH
                          {contribution.paid && (
                            <span className="ml-1 text-xs text-success">
                              (Paid)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-fg-muted">
                          <button
                            onClick={() =>
                              handleViewDetails(contribution.requestId)
                            }
                            className="text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Available Requests Section */}
      <div>
        <h2 className="text-xl font-semibold text-fg mb-4">Available Data Requests</h2>
        {filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <RequestCardPatient
                key={request.id}
                request={request}
                onContribute={handleContribute}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-surface-raised rounded-token">
            <p className="text-fg-muted">
              {searchTerm
                ? "No data requests match your search criteria"
                : filterStatus === "all"
                  ? "There are no available data requests at this time"
                  : `No ${filterStatus} requests found`}
            </p>
          </div>
        )}
      </div>

      {/* Data Submission Modal */}
      {selectedRequest && (
        <DataSubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitData}
          request={selectedRequest}
        />
      )}
    </div>
  );
};

export default DataContributionPortal;
