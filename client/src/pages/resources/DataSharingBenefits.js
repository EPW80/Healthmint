// client/src/pages/resources/DataSharingBenefits.js
import React from "react";
import {
  Layers,
  ArrowLeft,
  Heart,
  Microscope,
  Users,
  FileSpreadsheet,
  Award,
  Share2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const DataSharingBenefits = () => {
  const navigate = useNavigate();
  const userId =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Log page access for HIPAA compliance
  React.useEffect(() => {
    hipaaComplianceService.createAuditLog("RESOURCE_ACCESS", {
      resource: "DATA_SHARING_BENEFITS",
      timestamp: new Date().toISOString(),
      userId,
      action: "VIEW",
    });
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-green-600 hover:text-green-800"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-green-600 px-6 py-4">
          <div className="flex items-center">
            <Layers className="text-white mr-3" size={24} />
            <h1 className="text-2xl font-bold text-white">
              Data Sharing Benefits
            </h1>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Sharing your health data through Healthmint contributes to medical
            advances in multiple ways. When shared securely and ethically, your
            data can help researchers make breakthroughs that benefit everyone.
          </p>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Heart className="text-green-500 mr-2" size={20} />
              How Your Data Makes a Difference
            </h2>
            <p className="text-gray-700 mb-4">
              When you share your health data with researchers through
              Healthmint, you're contributing to a brighter future for
              healthcare:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="bg-green-50 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <Microscope size={24} className="text-green-500 mr-2" />
                  <h3 className="font-medium text-gray-900">
                    Medical Research
                  </h3>
                </div>
                <p className="text-gray-700">
                  Researchers can analyze patterns across thousands of patient
                  records to discover new connections between symptoms,
                  treatments, and outcomes that would be impossible to find in
                  small-scale studies.
                </p>
              </div>

              <div className="bg-green-50 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <Users size={24} className="text-green-500 mr-2" />
                  <h3 className="font-medium text-gray-900">
                    Population Health
                  </h3>
                </div>
                <p className="text-gray-700">
                  Large datasets help identify health trends across populations,
                  helping public health officials make better decisions to
                  improve community health outcomes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <FileSpreadsheet size={24} className="text-green-500 mr-2" />
                  <h3 className="font-medium text-gray-900">
                    Treatment Development
                  </h3>
                </div>
                <p className="text-gray-700">
                  Pharmaceutical researchers use anonymized health data to
                  identify potential drug candidates and treatment approaches
                  that might otherwise take decades to discover.
                </p>
              </div>

              <div className="bg-green-50 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <Award size={24} className="text-green-500 mr-2" />
                  <h3 className="font-medium text-gray-900">
                    Clinical Improvements
                  </h3>
                </div>
                <p className="text-gray-700">
                  Aggregate patient data helps healthcare providers identify
                  best practices and improve clinical procedures based on
                  real-world evidence.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Share2 className="text-green-500 mr-2" size={20} />
              Real-World Success Stories
            </h2>
            <p className="text-gray-700 mb-4">
              These examples demonstrate how shared health data has already
              advanced medicine:
            </p>

            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4 py-1">
                <h3 className="font-medium text-gray-900">
                  Rare Disease Treatment Breakthroughs
                </h3>
                <p className="text-gray-700 mt-1">
                  By analyzing patterns across thousands of patients with rare
                  diseases, researchers identified new treatment approaches for
                  conditions that previously had limited options.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4 py-1">
                <h3 className="font-medium text-gray-900">Pandemic Response</h3>
                <p className="text-gray-700 mt-1">
                  During recent health emergencies, shared health data allowed
                  for rapid identification of risk factors, treatment efficacy,
                  and vaccine development.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4 py-1">
                <h3 className="font-medium text-gray-900">
                  Predictive Healthcare
                </h3>
                <p className="text-gray-700 mt-1">
                  Aggregate health data has enabled the development of
                  predictive models that can identify patients at risk for
                  certain conditions before symptoms appear, allowing for
                  earlier intervention.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Users className="text-green-500 mr-2" size={20} />
              Addressing Common Concerns
            </h2>

            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">
                    Will my data remain private?
                  </h3>
                </div>
                <div className="mt-2 text-gray-700">
                  <p>
                    Yes. Healthmint follows strict HIPAA guidelines to protect
                    your information:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>
                      Data is anonymized before being shared with researchers
                    </li>
                    <li>Personal identifiers are removed</li>
                    <li>
                      You control exactly what data is shared and with whom
                    </li>
                    <li>
                      All access to your data is logged and available for your
                      review
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">
                    Who profits from my data?
                  </h3>
                </div>
                <div className="mt-2 text-gray-700">
                  <p>
                    On Healthmint, you maintain ownership of your data and can
                    receive compensation when your data is used in research. We
                    believe in ethical data sharing that benefits both research
                    and the individuals who make that research possible.
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">
                    Can I choose what my data is used for?
                  </h3>
                </div>
                <div className="mt-2 text-gray-700">
                  <p>
                    Absolutely. Healthmint's consent management system allows
                    you to specify which types of research can use your data.
                    You can opt in or out of specific research categories and
                    change your preferences at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-5">
            <div className="flex items-start">
              <Heart className="text-green-500 flex-shrink-0 mt-1" size={20} />
              <div className="ml-3">
                <h3 className="font-medium text-green-800">
                  Your Participation Matters
                </h3>
                <p className="text-green-700">
                  By sharing your anonymized health data, you become part of a
                  community that's advancing medical knowledge and improving
                  healthcare for future generations. Every contribution, no
                  matter how small, adds to our collective understanding of
                  human health and disease.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => navigate("/profile/sharing-settings")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Review My Sharing Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSharingBenefits;
