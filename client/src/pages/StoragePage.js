import React, { useState } from "react";
import {
  Search,
  Grid,
  List,
  Upload,
  FileText,
  FilePlus,
  Clock,
} from "lucide-react";
import FileUploader from "../components/storage/FileUploader";
import FilesList from "../components/storage/FilesList";

const StoragePage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Documents" },
    { id: "medical-records", name: "Medical Records" },
    { id: "lab-results", name: "Lab Results" },
    { id: "imaging", name: "Imaging" },
    { id: "prescriptions", name: "Prescriptions" },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-indigo-900">
              Health Document Storage
            </h1>
            <p className="mt-2 text-fg-muted">
              Securely store and manage your health records
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors"
            >
              {showUploader ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  View Files
                </>
              ) : (
                <>
                  <FilePlus className="w-5 h-5 mr-2" />
                  Upload New File
                </>
              )}
            </button>
          </div>
        </div>

        {showUploader ? (
          <div className="bg-surface rounded-xl shadow-md p-6 mb-8 border border-indigo-100">
            <FileUploader onUploadComplete={() => setShowUploader(false)} />
          </div>
        ) : (
          <>
            {/* Filters and Search */}
            <div className="bg-surface rounded-xl shadow-sm p-4 mb-6 border border-line">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center flex-grow">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-fg-subtle" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-line rounded-md leading-5 bg-surface placeholder-fg-subtle focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <label htmlFor="category" className="sr-only">
                      Category
                    </label>
                    <select
                      id="category"
                      className="block w-full pl-3 pr-10 py-2 text-base border border-line focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 border-line rounded-md p-1 bg-surface">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded ${
                        viewMode === "list"
                          ? "bg-surface shadow"
                          : "hover:bg-surface-raised"
                      }`}
                      aria-label="List view"
                    >
                      <List className="h-5 w-5 text-fg-muted" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded ${
                        viewMode === "grid"
                          ? "bg-surface shadow"
                          : "hover:bg-surface-raised"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid className="h-5 w-5 text-fg-muted" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* File Tabs */}
            <div className="mb-6">
              <nav className="flex space-x-4 overflow-x-auto pb-2">
                {["all", "recent", "shared", "archived"].map((tab) => (
                  <button
                    key={tab}
                    className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                      activeTab === tab
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-fg-muted hover:text-fg hover:bg-surface-raised"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "all" && "All Files"}
                    {tab === "recent" && "Recently Uploaded"}
                    {tab === "shared" && "Shared With Me"}
                    {tab === "archived" && "Archived"}
                  </button>
                ))}
              </nav>
            </div>

            {/* Files List */}
            <div className="bg-surface rounded-xl shadow-md p-6 border border-line">
              <FilesList
                viewMode={viewMode}
                searchTerm={searchTerm}
                category={selectedCategory}
                filterType={activeTab}
              />
            </div>
          </>
        )}

        {/* Storage Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-4 rounded-lg shadow-sm border border-line">
            <h3 className="text-lg font-medium text-fg">Storage Used</h3>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-semibold text-indigo-600">
                24.5 MB
              </span>
              <span className="ml-2 text-sm text-fg-muted">of 1 GB</span>
            </div>
            <div className="mt-3 w-full bg-surface-raised rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: "2.45%" }}
              ></div>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-lg shadow-sm border border-line">
            <h3 className="text-lg font-medium text-fg">File Count</h3>
            <div className="mt-2">
              <span className="text-2xl font-semibold text-indigo-600">7</span>
              <span className="ml-2 text-sm text-fg-muted">total files</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                3 Documents
              </span>
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                2 Images
              </span>
              <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                2 Other
              </span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-lg shadow-sm border border-line">
            <h3 className="text-lg font-medium text-fg">
              Recent Activity
            </h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center text-sm">
                <Upload className="w-4 h-4 mr-2 text-green-500" />
                <span>
                  Uploaded <b>lab-results.pdf</b> (2m ago)
                </span>
              </div>
              <div className="flex items-center text-sm">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                <span>
                  Viewed <b>prescription.pdf</b> (3h ago)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoragePage;
