import React, { useState } from "react";
import PropTypes from "prop-types";
import { Plus, X } from "lucide-react";

/**
 * CredentialsTab Component
 *
 * Manages researcher professional credentials and publications
 */
const CredentialsTab = ({
  formState,
  handleFormChange,
  handlePublicationChange,
}) => {
  // State for publication form
  const [newPublication, setNewPublication] = useState({ title: "", url: "" });

  // Handle publication form changes
  const handlePublicationFormChange = (e) => {
    setNewPublication((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Add a new publication
  const addPublication = () => {
    if (newPublication.title && newPublication.url) {
      const updatedPublications = [
        ...formState.publications,
        { ...newPublication, id: Date.now() },
      ];
      handlePublicationChange(updatedPublications);
      setNewPublication({ title: "", url: "" });
    }
  };

  // Remove a publication
  const removePublication = (id) => {
    const updatedPublications = formState.publications.filter(
      (pub) => pub.id !== id
    );
    handlePublicationChange(updatedPublications);
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Professional Credentials</h2>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="institution"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Institution/Organization
          </label>
          <input
            id="institution"
            name="institution"
            type="text"
            value={formState.institution}
            onChange={handleFormChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="University, Research Institute, or Organization"
            aria-label="Institution or organization"
          />
        </div>

        <div>
          <label
            htmlFor="credentials"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Credentials
          </label>
          <input
            id="credentials"
            name="credentials"
            type="text"
            value={formState.credentials}
            onChange={handleFormChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ph.D., M.D., or other relevant qualifications"
            aria-label="Academic or professional credentials"
          />
        </div>

        <div>
          <label
            htmlFor="researchFocus"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Research Focus
          </label>
          <textarea
            id="researchFocus"
            name="researchFocus"
            value={formState.researchFocus}
            onChange={handleFormChange}
            rows="2"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe your main research interests and expertise"
            aria-label="Research focus areas"
          ></textarea>
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-3">
            Publications
          </label>

          {formState.publications?.map((pub) => (
            <div
              key={pub.id}
              className="p-4 mb-3 border border-gray-200 rounded-lg flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{pub.title}</p>
                <a
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {pub.url}
                </a>
              </div>
              <button
                onClick={() => removePublication(pub.id)}
                className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full p-1"
                aria-label={`Remove publication ${pub.title}`}
              >
                <X size={20} />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-5">
              <input
                type="text"
                name="title"
                value={newPublication.title}
                onChange={handlePublicationFormChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Publication title"
                aria-label="Publication title"
              />
            </div>
            <div className="col-span-12 sm:col-span-5">
              <input
                type="url"
                name="url"
                value={newPublication.url}
                onChange={handlePublicationFormChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="URL to publication"
                aria-label="Publication URL"
              />
            </div>
            <div className="col-span-12 sm:col-span-2">
              <button
                onClick={addPublication}
                disabled={!newPublication.title || !newPublication.url}
                className={`w-full flex items-center justify-center gap-1 px-4 py-2 rounded-md ${
                  !newPublication.title || !newPublication.url
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                aria-label="Add publication"
              >
                <Plus size={18} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

CredentialsTab.propTypes = {
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
  handlePublicationChange: PropTypes.func.isRequired,
};

export default CredentialsTab;
