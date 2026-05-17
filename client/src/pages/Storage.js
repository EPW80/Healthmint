import useHealthData from '../hooks/useHealthData';

const Storage = () => {
  // Import the hook with loadOnMount true
  const { 
    healthData = [], 
    userRecords = [], 
    loading: healthDataLoading = false, 
    error, 
    refreshData 
  } = useHealthData({ userRole: 'patient', loadOnMount: true });

  // Then in your component, display the records:
  return (
    <div>
      {/* Other storage UI elements */}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Health Records</h2>
        
        {healthDataLoading ? (
          <p>Loading your records...</p>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <p className="text-red-700">Error loading records: {error}</p>
            <button 
              onClick={refreshData}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded"
            >
              Try Again
            </button>
          </div>
        ) : userRecords.length === 0 ? (
          <p>No health records found. Upload your first file above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRecords.map(record => (
              <div key={record.id} className="border rounded-lg p-4">
                <h3 className="font-medium">{record.title}</h3>
                <p className="text-sm text-gray-600">{record.description}</p>
                {/* Add other record details */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};