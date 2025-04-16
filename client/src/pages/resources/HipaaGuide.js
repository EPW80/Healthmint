// client/src/pages/resources/HipaaGuide.js
import React from "react";
import {
  HelpCircle,
  ArrowLeft,
  FileText,
  Lock,
  Shield,
  Book,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const HipaaGuide = () => {
  const navigate = useNavigate();
  const userId =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Log page access for HIPAA compliance
  React.useEffect(() => {
    hipaaComplianceService.createAuditLog("RESOURCE_ACCESS", {
      resource: "HIPAA_RIGHTS_GUIDE",
      timestamp: new Date().toISOString(),
      userId,
      action: "VIEW",
    });
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <div className="flex items-center">
            <HelpCircle className="text-white mr-3" size={24} />
            <h1 className="text-2xl font-bold text-white">
              HIPAA Rights Guide
            </h1>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">
            The Health Insurance Portability and Accountability Act (HIPAA)
            provides important rights regarding your health information. This
            guide explains what HIPAA is, your rights under HIPAA, and how
            Healthmint protects your data.
          </p>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Book className="text-blue-500 mr-2" size={20} />
              What is HIPAA?
            </h2>
            <p className="text-gray-700 mb-3">
              HIPAA is a federal law enacted in 1996 that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Creates national standards to protect patient health information
              </li>
              <li>Gives patients more control over their health information</li>
              <li>Sets boundaries on the use and release of health records</li>
              <li>
                Establishes safeguards that healthcare providers must achieve
              </li>
              <li>
                Holds violators accountable with civil and criminal penalties
              </li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <FileText className="text-blue-500 mr-2" size={20} />
              Your Rights Under HIPAA
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-blue-800 font-medium">
                Under HIPAA, you have the right to:
              </p>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  Access Your Health Records
                </h3>
                <p className="text-gray-700">
                  You can request to see and obtain a copy of your health
                  records, including an electronic copy if records are
                  maintained electronically.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  Request Corrections
                </h3>
                <p className="text-gray-700">
                  If you find information in your records that is incorrect or
                  incomplete, you can request that it be amended.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  Receive a Notice of Privacy Practices
                </h3>
                <p className="text-gray-700">
                  Healthcare providers must give you a notice explaining how
                  they use and disclose your information.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  Control Who Can Access Your Information
                </h3>
                <p className="text-gray-700">
                  You can request restrictions on who can access your
                  information, though providers aren't always required to agree.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  Choose How You Receive Communications
                </h3>
                <p className="text-gray-700">
                  You can request to receive communications from healthcare
                  providers in a certain way or at certain locations.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">File Complaints</h3>
                <p className="text-gray-700">
                  If you believe your rights have been violated, you can file a
                  complaint with the healthcare provider, their privacy officer,
                  or the U.S. Department of Health and Human Services.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Lock className="text-blue-500 mr-2" size={20} />
              How Healthmint Protects Your Data
            </h2>
            <p className="text-gray-700 mb-4">
              Healthmint is committed to protecting your health information and
              complying with HIPAA requirements:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="text-blue-500 mr-2" size={18} />
                  <h3 className="font-medium text-gray-900">Encryption</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  All your health data is encrypted both in transit and at rest
                  using industry-standard encryption algorithms.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="text-blue-500 mr-2" size={18} />
                  <h3 className="font-medium text-gray-900">Access Controls</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  Only authorized personnel with a need-to-know basis can access
                  your information, and all access is logged.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="text-blue-500 mr-2" size={18} />
                  <h3 className="font-medium text-gray-900">Audit Trails</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  We maintain detailed audit logs of who accessed your
                  information, when, and for what purpose.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="text-blue-500 mr-2" size={18} />
                  <h3 className="font-medium text-gray-900">
                    Consent Management
                  </h3>
                </div>
                <p className="text-gray-700 text-sm">
                  You control who can access your data through our detailed
                  consent management system.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start">
              <HelpCircle
                className="text-blue-500 flex-shrink-0 mt-1"
                size={20}
              />
              <div className="ml-3">
                <h3 className="font-medium text-blue-800">Need Help?</h3>
                <p className="text-blue-700 text-sm">
                  If you have questions about your HIPAA rights or how
                  Healthmint protects your information, please contact our
                  privacy officer at privacy@healthmint.example.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HipaaGuide;
