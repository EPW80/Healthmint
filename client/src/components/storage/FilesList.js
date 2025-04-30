import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Image, FileArchive, Download, Share, Trash2, MoreHorizontal, 
  Clock, AlertTriangle, Eye, Upload
} from 'lucide-react';

const FilesList = ({ viewMode = 'list', searchTerm = '', category = 'all', filterType = 'all' }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/test/files');
        setFiles(response.data.files || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load files. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, []);
  
  // Apply filters
  const filteredFiles = files.filter(file => {
    // Search term filter
    if (searchTerm && !file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !file.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    
    // Category filter
    if (category !== 'all' && file.category !== categoryMapping[category]) {
      return false;
    }
    
    // Tab filter
    if (filterType === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (new Date(file.createdAt) < oneWeekAgo) {
        return false;
      }
    } else if (filterType === 'shared') {
      if (!file.authorizedUsers || file.authorizedUsers.length === 0) {
        return false;
      }
    } else if (filterType === 'archived') {
      if (file.status !== 'archived') {
        return false;
      }
    }
    
    return true;
  });
  
  const handleFileAction = (action, file) => {
    switch (action) {
      case 'view':
        window.open(file.ipfsUrl, '_blank');
        break;
      case 'download':
        // Implement download logic
        window.open(file.ipfsUrl, '_blank');
        break;
      case 'share':
        // Implement share dialog
        break;
      case 'delete':
        // Implement delete confirmation
        if (window.confirm(`Are you sure you want to delete ${file.fileName}?`)) {
          // Call delete API
          console.log("Would delete file:", file.id);
        }
        break;
      default:
        break;
    }
  };
  
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-indigo-400" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-400" />;
    } else {
      return <FileArchive className="w-8 h-8 text-yellow-400" />;
    }
  };
  
  const categoryMapping = {
    'all': 'All Documents',
    'medical-records': 'Medical Records',
    'lab-results': 'Lab Results',
    'imaging': 'Imaging',
    'prescriptions': 'Prescriptions'
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading your files...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="h-12 w-12 text-gray-400 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No files found</h3>
        <p className="mt-1 text-gray-500">
          {searchTerm ? 
            `No files match your search "${searchTerm}"` : 
            'Upload your first health document to get started'}
        </p>
        <div className="mt-6">
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => window.location.href = '/storage?upload=true'}
          >
            <Upload className="w-4 h-4 mr-2" /> Upload Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {file.fileName}
                          {file.containsPHI && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              PHI
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {file.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {file.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatFileSize(file.fileSize)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {file.sensitivity === 'high' || file.sensitivity === 'critical' ? (
                        <span className="flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                          {file.sensitivity} sensitivity
                        </span>
                      ) : (
                        <span>{file.sensitivity} sensitivity</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span title={new Date(file.createdAt).toLocaleString()}>
                        {formatRelativeTime(file.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleFileAction('view', file)}
                        className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFileAction('download', file)}
                        className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFileAction('share', file)}
                        className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"
                        title="Share"
                      >
                        <Share className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFileAction('delete', file)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-4 flex items-center justify-center bg-gray-50 h-32">
                {getFileIcon(file.mimeType)}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={file.fileName}>
                      {file.fileName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 truncate" title={file.description}>
                      {file.description || 'No description'}
                    </p>
                  </div>
                  <div className="dropdown relative">
                    <button className="p-1 rounded-full hover:bg-gray-100">
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                    {/* Dropdown menu would go here */}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                  <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800">
                    {file.category}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-1">
                  {file.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                      {tag}
                    </span>
                  ))}
                  {file.tags.length > 3 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                      +{file.tags.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRelativeTime(file.createdAt)}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFileAction('view', file)}
                      className="p-1 rounded-full hover:bg-gray-100"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-500 hover:text-indigo-600" />
                    </button>
                    <button
                      onClick={() => handleFileAction('download', file)}
                      className="p-1 rounded-full hover:bg-gray-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-500 hover:text-indigo-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default FilesList;