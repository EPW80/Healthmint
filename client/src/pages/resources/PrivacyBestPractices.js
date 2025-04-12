// client/src/pages/resources/PrivacyBestPractices.js
import React from "react";
import {
  Shield,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Eye,
  Key,
  Smartphone,
  CheckSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const PrivacyBestPractices = () => {
  const navigate = useNavigate();
  const userId =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Log page access for HIPAA compliance
  React.useEffect(() => {
    hipaaComplianceService.createAuditLog("RESOURCE_ACCESS", {
      resource: "PRIVACY_BEST_PRACTICES",
      timestamp: new Date().toISOString(),
      userId,
      action: "VIEW",
    });
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-purple-600 hover:text-purple-800"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-purple-600 px-6 py-4">
          <div className="flex items-center">
            <Shield className="text-white mr-3" size={24} />
            <h1 className="text-2xl font-bold text-white">
              Privacy Best Practices
            </h1>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Maintaining your privacy while sharing health information is
            crucial. These best practices will help you protect your sensitive
            data while still contributing to medical research and receiving
            quality care.
          </p>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Lock className="text-purple-500 mr-2" size={20} />
              Understanding Privacy Risks
            </h2>
            <div className="bg-purple-50 p-5 rounded-lg mb-6">
              <p className="text-purple-800">
                Before sharing any health information, it's important to
                understand potential privacy risks:
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <AlertTriangle
                    className="text-purple-500 mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Re-identification Risk
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Even "anonymized" data can sometimes be re-identified when
                      combined with other datasets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <AlertTriangle
                    className="text-purple-500 mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">Data Breaches</h3>
                    <p className="text-gray-700 text-sm">
                      While rare, security breaches can expose personal health
                      information.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <AlertTriangle
                    className="text-purple-500 mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Unauthorized Access
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Without proper controls, your health data could be
                      accessed by unauthorized parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700">
              Healthmint incorporates numerous safeguards to mitigate these
              risks, but your active participation in privacy protection is
              equally important.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckSquare className="text-purple-500 mr-2" size={20} />
              Essential Privacy Practices
            </h2>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center">
                    <Eye className="text-purple-500 mr-2" size={18} />
                    <h3 className="font-medium text-purple-800">
                      Review Sharing Settings Regularly
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Audit your data sharing settings in Healthmint at least
                      quarterly
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Review which researchers and studies have access to your
                      data
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Check access logs to monitor who has viewed your
                      information
                    </li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate("/profile/sharing-audit")}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Review my sharing settings →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center">
                    <Key className="text-purple-500 mr-2" size={18} />
                    <h3 className="font-medium text-purple-800">
                      Protect Your Account
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Use a strong, unique password for your Healthmint account
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Enable two-factor authentication for added security
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Never share your login credentials with others
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Log out when using shared or public computers
                    </li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate("/profile/security")}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Update my security settings →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center">
                    <Smartphone className="text-purple-500 mr-2" size={18} />
                    <h3 className="font-medium text-purple-800">
                      Device and Connection Security
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Keep your devices updated with the latest security patches
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Use secure, private networks when accessing health
                      information
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Avoid public Wi-Fi for health data access unless using a
                      VPN
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Install reputable security software on your devices
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Shield className="text-purple-500 mr-2" size={20} />
              When Sharing Health Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 p-5 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Do:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-green-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Read privacy policies before consenting to data sharing
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-green-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Understand exactly what information is being shared
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-green-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Check researcher credentials and study purposes</span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-green-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Use anonymization options when available</span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-green-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Set expiration dates for data access permissions
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 p-5 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Don't:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-red-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Share login credentials with family or friends</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-red-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Grant blanket access without time limitations</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-red-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Ignore notification emails about data access</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-red-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Click on health data links in suspicious emails</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-red-500 mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Share more information than necessary for research
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">
              Balancing Privacy and Research Benefits
            </h2>
            <p className="text-gray-700 mb-4">
              While privacy is paramount, it's also important to recognize the
              value of health data sharing for advancing medical research.
              Healthmint strives to strike this balance by:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckSquare
                  className="text-purple-500 mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Providing granular consent options so you can participate in
                  research that matters to you
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-purple-500 mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Employing industry-leading anonymization techniques to protect
                  your identity
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-purple-500 mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Ensuring transparent research practices with clear
                  documentation
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-purple-500 mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Keeping you informed about how your data is used and its
                  impact
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate("/profile/privacy-checkup")}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Start Privacy Checkup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyBestPractices;
