import React from 'react';
import FileUploader from '../components/storage/FileUploader';
import FilesList from '../components/storage/FilesList';

const StoragePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-indigo-800">
        Health Document Storage
      </h1>
      
      <div className="mb-10">
        <FileUploader />
      </div>
      
      <div>
        <FilesList />
      </div>
    </div>
  );
};

export default StoragePage;