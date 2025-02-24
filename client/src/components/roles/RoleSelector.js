// ../components/roles/RoleSelector.js
import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { User, Microscope } from "lucide-react";
import { setRole } from "../../redux/slices/roleSlice";

const RoleSelector = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    dispatch(setRole(role));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="flex flex-col md:flex-row gap-6 justify-center items-center max-w-4xl w-full">
        {/* Patient Card */}
        <div
          className="w-full md:w-72 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
          onClick={() => handleRoleSelect("patient")}
        >
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-full">
              <User className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Patient</h2>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Share and manage your health data securely on the blockchain
            </p>
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleRoleSelect("patient");
              }}
            >
              Select Patient Role
            </button>
          </div>
        </div>

        {/* Researcher Card */}
        <div
          className="w-full md:w-72 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
          onClick={() => handleRoleSelect("researcher")}
        >
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="bg-purple-50 p-4 rounded-full">
              <Microscope className="w-12 h-12 text-purple-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Researcher</h2>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Access and analyze anonymized health data for research purposes
            </p>
            <button
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleRoleSelect("researcher");
              }}
            >
              Select Researcher Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
