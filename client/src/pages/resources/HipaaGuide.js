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
        className="mb-6 flex items-center text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md overflow-hidden">
        <div className="bg-accent px-6 py-4">
          <div className="flex items-center">
            <HelpCircle className="text-accent-fg mr-3" size={24} />
            <h1 className="text-2xl font-bold text-accent-fg">
              HIPAA Rights Guide
            </h1>
          </div>
        </div>

        <div className="p-6">
          <p className="text-fg mb-6">
            The Health Insurance Portability and Accountability Act (HIPAA)
            provides important rights regarding your health information. This
            guide explains what HIPAA is, your rights under HIPAA, and how
            Healthmint protects your data.
          </p>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center text-fg">
              <Book className="text-info mr-2" size={20} />
              What is HIPAA?
            </h2>
            <p className="text-fg mb-3">
              HIPAA is a federal law enacted in 1996 that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-fg">
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
            <h2 className="text-xl font-semibold mb-3 flex items-center text-fg">
              <FileText className="text-info mr-2" size={20} />
              Your Rights Under HIPAA
            </h2>
            <div className="bg-info-soft p-4 rounded-token mb-4">
              <p className="text-info font-medium">
                Under HIPAA, you have the right to:
              </p>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">
                  Access Your Health Records
                </h3>
                <p className="text-fg-muted">
                  You can request to see and obtain a copy of your health
                  records, including an electronic copy if records are
                  maintained electronically.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">
                  Request Corrections
                </h3>
                <p className="text-fg-muted">
                  If you find information in your records that is incorrect or
                  incomplete, you can request that it be amended.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">
                  Receive a Notice of Privacy Practices
                </h3>
                <p className="text-fg-muted">
                  Healthcare providers must give you a notice explaining how
                  they use and disclose your information.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">
                  Control Who Can Access Your Information
                </h3>
                <p className="text-fg-muted">
                  You can request restrictions on who can access your
                  information, though providers aren't always required to agree.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">
                  Choose How You Receive Communications
                </h3>
                <p className="text-fg-muted">
                  You can request to receive communications from healthcare
                  providers in a certain way or at certain locations.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-medium text-fg">File Complaints</h3>
                <p className="text-fg-muted">
                  If you believe your rights have been violated, you can file a
                  complaint with the healthcare provider, their privacy officer,
                  or the U.S. Department of Health and Human Services.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center text-fg">
              <Lock className="text-info mr-2" size={20} />
              How Healthmint Protects Your Data
            </h2>
            <p className="text-fg mb-4">
              Healthmint is committed to protecting your health information and
              complying with HIPAA requirements:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-raised border border-line p-4 rounded-token">
                <div className="flex items-center mb-2">
                  <Shield className="text-info mr-2" size={18} />
                  <h3 className="font-medium text-fg">Encryption</h3>
                </div>
                <p className="text-fg-muted text-sm">
                  All your health data is encrypted both in transit and at rest
                  using industry-standard encryption algorithms.
                </p>
              </div>

              <div className="bg-surface-raised border border-line p-4 rounded-token">
                <div className="flex items-center mb-2">
                  <Shield className="text-info mr-2" size={18} />
                  <h3 className="font-medium text-fg">Access Controls</h3>
                </div>
                <p className="text-fg-muted text-sm">
                  Only authorized personnel with a need-to-know basis can access
                  your information, and all access is logged.
                </p>
              </div>

              <div className="bg-surface-raised border border-line p-4 rounded-token">
                <div className="flex items-center mb-2">
                  <Shield className="text-info mr-2" size={18} />
                  <h3 className="font-medium text-fg">Audit Trails</h3>
                </div>
                <p className="text-fg-muted text-sm">
                  We maintain detailed audit logs of who accessed your
                  information, when, and for what purpose.
                </p>
              </div>

              <div className="bg-surface-raised border border-line p-4 rounded-token">
                <div className="flex items-center mb-2">
                  <Shield className="text-info mr-2" size={18} />
                  <h3 className="font-medium text-fg">
                    Consent Management
                  </h3>
                </div>
                <p className="text-fg-muted text-sm">
                  You control who can access your data through our detailed
                  consent management system.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-info-soft border border-info/30 rounded-token p-4">
            <div className="flex items-start">
              <HelpCircle
                className="text-info flex-shrink-0 mt-1"
                size={20}
              />
              <div className="ml-3">
                <h3 className="font-medium text-info">Need Help?</h3>
                <p className="text-fg-muted text-sm">
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
