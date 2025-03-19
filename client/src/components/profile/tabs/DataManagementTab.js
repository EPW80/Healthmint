import React, { useState } from "react";
import PropTypes from "prop-types";
import { ChevronDown, Download } from "lucide-react";

/**
 * DataManagementTab Component
 *
 * Displays and manages user data based on role (patient or researcher)
 */
const DataManagementTab = ({
  userRole,
  userProfile,
  formState,
  handleFormChange,
}) => {
  const [openAccordion, setOpenAccordion] = useState(null);

  // Toggle accordion
  const toggleAccordion = (accordionId) => {
    setOpenAccordion(openAccordion === accordionId ? null : accordionId);
  };

  if (userRole === "patient") {
    return (
      <>
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>
        <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg mb-6">
          You have {userProfile?.totalUploads || 0} health records uploaded to
          Healthmint.
        </div>

        <div className="border border-gray-200 rounded-lg mb-4">
          <button
            className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-t-lg"
            onClick={() => toggleAccordion("dataStats")}
            aria-expanded={openAccordion === "dataStats"}
            aria-controls="data-stats-content"
          >
            <span className="font-medium">Data Usage Statistics</span>
            <ChevronDown
              className={`transform transition-transform ${
                openAccordion === "dataStats" ? "rotate-180" : ""
              }`}
              size={20}
            />
          </button>
          {openAccordion === "dataStats" && (
            <div
              id="data-stats-content"
              className="p-4 border-t border-gray-200"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-2">
                  <p className="text-2xl font-semibold text-blue-600">
                    {userProfile?.totalUploads || 0}
                  </p>
                  <p className="text-sm text-gray-600">Uploaded Records</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-2xl font-semibold text-blue-600">
                    {userProfile?.totalShared || 0}
                  </p>
                  <p className="text-sm text-gray-600">Shared Records</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-2xl font-semibold text-blue-600">
                    {userProfile?.accessRequests || 0}
                  </p>
                  <p className="text-sm text-gray-600">Access Requests</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-2xl font-semibold text-blue-600">
                    {userProfile?.earnings || "0"}
                  </p>
                  <p className="text-sm text-gray-600">ETH Earned</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg">
          <button
            className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-t-lg"
            onClick={() => toggleAccordion("dataExport")}
            aria-expanded={openAccordion === "dataExport"}
            aria-controls="data-export-content"
          >
            <span className="font-medium">Data Export Options</span>
            <ChevronDown
              className={`transform transition-transform ${
                openAccordion === "dataExport" ? "rotate-180" : ""
              }`}
              size={20}
            />
          </button>
          {openAccordion === "dataExport" && (
            <div
              id="data-export-content"
              className="p-4 border-t border-gray-200"
            >
              <p className="text-sm text-gray-600 mb-4">
                Export all your health data in one of the following formats:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                  <Download size={18} />
                  Export as JSON
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                  <Download size={18} />
                  Export as CSV
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                  <Download size={18} />
                  Export as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Research Data</h2>
      <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg mb-6">
        You have accessed {userProfile?.datasetsAccessed || 0} datasets for
        research purposes.
      </div>

      <div className="border border-gray-200 rounded-lg mb-4">
        <button
          className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-t-lg"
          onClick={() => toggleAccordion("researchUsage")}
          aria-expanded={openAccordion === "researchUsage"}
          aria-controls="research-usage-content"
        >
          <span className="font-medium">Data Usage History</span>
          <ChevronDown
            className={`transform transition-transform ${
              openAccordion === "researchUsage" ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>
        {openAccordion === "researchUsage" && (
          <div
            id="research-usage-content"
            className="p-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-2">
                <p className="text-2xl font-semibold text-purple-600">
                  {userProfile?.datasetsAccessed || 0}
                </p>
                <p className="text-sm text-gray-600">Datasets Accessed</p>
              </div>
              <div className="text-center p-2">
                <p className="text-2xl font-semibold text-purple-600">
                  {userProfile?.activeStudies || 0}
                </p>
                <p className="text-sm text-gray-600">Active Studies</p>
              </div>
              <div className="text-center p-2">
                <p className="text-2xl font-semibold text-purple-600">
                  {userProfile?.pendingRequests || 0}
                </p>
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
              <div className="text-center p-2">
                <p className="text-2xl font-semibold text-red-600">
                  {userProfile?.totalSpent || "0"}
                </p>
                <p className="text-sm text-gray-600">ETH Spent</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg">
        <button
          className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-t-lg"
          onClick={() => toggleAccordion("ethics")}
          aria-expanded={openAccordion === "ethics"}
          aria-controls="ethics-content"
        >
          <span className="font-medium">Research Ethics Statement</span>
          <ChevronDown
            className={`transform transition-transform ${
              openAccordion === "ethics" ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>
        {openAccordion === "ethics" && (
          <div id="ethics-content" className="p-4 border-t border-gray-200">
            <textarea
              name="ethicsStatement"
              value={formState.ethicsStatement || ""}
              onChange={handleFormChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-4"
              rows="4"
              placeholder="Describe your approach to research ethics and data protection..."
              aria-label="Research ethics statement"
            ></textarea>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="ethicsAgreement"
                checked={formState.ethicsAgreement || false}
                onChange={handleFormChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I agree to use all data in accordance with established research
                ethics guidelines
              </span>
            </label>
          </div>
        )}
      </div>
    </>
  );
};

DataManagementTab.propTypes = {
  userRole: PropTypes.string.isRequired,
  userProfile: PropTypes.object,
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default DataManagementTab;
