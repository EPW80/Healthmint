// src/App.js - Debugging version
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.js";

// Simple component for testing
const TestPage = () => (
  <div className="p-8 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold mb-6">Healthmint Test Page</h1>
    <div className="bg-white p-6 rounded-lg shadow-md">
      <p>
        This is a debugging test page to verify React is rendering correctly.
      </p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="*" element={<TestPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
