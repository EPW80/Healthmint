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
        className="mb-6 flex items-center text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md overflow-hidden">
        <div className="bg-accent px-6 py-4">
          <div className="flex items-center">
            <Shield className="text-accent-fg mr-3" size={24} />
            <h1 className="text-2xl font-bold text-accent-fg">
              Privacy Best Practices
            </h1>
          </div>
        </div>

        <div className="p-6">
          <p className="text-fg mb-6">
            Maintaining your privacy while sharing health information is
            crucial. These best practices will help you protect your sensitive
            data while still contributing to medical research and receiving
            quality care.
          </p>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-fg">
              <Lock className="text-accent mr-2" size={20} />
              Understanding Privacy Risks
            </h2>
            <div className="bg-surface-raised border border-line p-5 rounded-token mb-6">
              <p className="text-fg">
                Before sharing any health information, it's important to
                understand potential privacy risks:
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <AlertTriangle
                    className="text-warning mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-fg">
                      Re-identification Risk
                    </h3>
                    <p className="text-fg-muted text-sm">
                      Even "anonymized" data can sometimes be re-identified when
                      combined with other datasets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <AlertTriangle
                    className="text-warning mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-fg">Data Breaches</h3>
                    <p className="text-fg-muted text-sm">
                      While rare, security breaches can expose personal health
                      information.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <AlertTriangle
                    className="text-warning mt-1 mr-3 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-medium text-fg">
                      Unauthorized Access
                    </h3>
                    <p className="text-fg-muted text-sm">
                      Without proper controls, your health data could be
                      accessed by unauthorized parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-fg">
              Healthmint incorporates numerous safeguards to mitigate these
              risks, but your active participation in privacy protection is
              equally important.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-fg">
              <CheckSquare className="text-accent mr-2" size={20} />
              Essential Privacy Practices
            </h2>

            <div className="space-y-6">
              <div className="bg-surface rounded-token border border-line overflow-hidden">
                <div className="bg-surface-raised px-4 py-3 border-b border-line">
                  <div className="flex items-center">
                    <Eye className="text-accent mr-2" size={18} />
                    <h3 className="font-medium text-fg">
                      Review Sharing Settings Regularly
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-fg-muted">
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Audit your data sharing settings in Healthmint at least
                      quarterly
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Review which researchers and studies have access to your
                      data
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Check access logs to monitor who has viewed your
                      information
                    </li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate("/profile/sharing-audit")}
                      className="text-sm text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                    >
                      Review my sharing settings →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-token border border-line overflow-hidden">
                <div className="bg-surface-raised px-4 py-3 border-b border-line">
                  <div className="flex items-center">
                    <Key className="text-accent mr-2" size={18} />
                    <h3 className="font-medium text-fg">
                      Protect Your Account
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-fg-muted">
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Use a strong, unique password for your Healthmint account
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Enable two-factor authentication for added security
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Never share your login credentials with others
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Log out when using shared or public computers
                    </li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate("/profile/security")}
                      className="text-sm text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                    >
                      Update my security settings →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-token border border-line overflow-hidden">
                <div className="bg-surface-raised px-4 py-3 border-b border-line">
                  <div className="flex items-center">
                    <Smartphone className="text-accent mr-2" size={18} />
                    <h3 className="font-medium text-fg">
                      Device and Connection Security
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-fg-muted">
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Keep your devices updated with the latest security patches
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Use secure, private networks when accessing health
                      information
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Avoid public Wi-Fi for health data access unless using a
                      VPN
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      Install reputable security software on your devices
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-fg">
              <Shield className="text-accent mr-2" size={20} />
              When Sharing Health Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-raised border border-line p-5 rounded-token">
                <h3 className="font-medium text-fg mb-3">Do:</h3>
                <ul className="space-y-2 text-fg-muted">
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-success mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Read privacy policies before consenting to data sharing
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-success mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Understand exactly what information is being shared
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-success mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Check researcher credentials and study purposes</span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-success mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Use anonymization options when available</span>
                  </li>
                  <li className="flex items-start">
                    <CheckSquare
                      className="text-success mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>
                      Set expiration dates for data access permissions
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-danger-soft border border-danger/30 p-5 rounded-token">
                <h3 className="font-medium text-fg mb-3">Don't:</h3>
                <ul className="space-y-2 text-fg-muted">
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-danger mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Share login credentials with family or friends</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-danger mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Grant blanket access without time limitations</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-danger mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Ignore notification emails about data access</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-danger mr-2 flex-shrink-0"
                      size={16}
                    />
                    <span>Click on health data links in suspicious emails</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle
                      className="text-danger mr-2 flex-shrink-0"
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

          <div className="bg-surface border border-line rounded-token p-6">
            <h2 className="text-lg font-semibold mb-3 text-fg">
              Balancing Privacy and Research Benefits
            </h2>
            <p className="text-fg-muted mb-4">
              While privacy is paramount, it's also important to recognize the
              value of health data sharing for advancing medical research.
              Healthmint strives to strike this balance by:
            </p>
            <ul className="space-y-2 text-fg-muted">
              <li className="flex items-start">
                <CheckSquare
                  className="text-accent mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Providing granular consent options so you can participate in
                  research that matters to you
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-accent mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Employing industry-leading anonymization techniques to protect
                  your identity
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-accent mr-2 flex-shrink-0"
                  size={16}
                />
                <span>
                  Ensuring transparent research practices with clear
                  documentation
                </span>
              </li>
              <li className="flex items-start">
                <CheckSquare
                  className="text-accent mr-2 flex-shrink-0"
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
              className="px-6 py-3 bg-accent text-accent-fg rounded-token hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
