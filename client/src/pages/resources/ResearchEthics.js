// client/src/pages/resources/ResearchEthics.js
import React from "react";
import {
  Briefcase,
  Shield,
  AlertCircle,
  Check,
  FileText,
  Users,
  Lock,
  Eye,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

const ResearchEthics = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-fg">
        Research Ethics Guidelines
      </h1>

      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <Briefcase className="text-accent w-8 h-8 mr-3" />
          <h2 className="text-2xl font-semibold text-fg">
            Ethical Research Using Anonymized Health Data
          </h2>
        </div>

        <p className="text-fg mb-6">
          Healthmint is committed to facilitating responsible and ethical health
          research while protecting individual privacy. These guidelines outline
          the ethical considerations researchers should follow when using data
          acquired through the Healthmint platform.
        </p>

        <div className="border-l-4 border-accent pl-4 py-2 mb-8">
          <p className="italic text-fg-muted">
            All researchers using Healthmint datasets are required to adhere to
            these ethical guidelines as a condition of data access.
          </p>
        </div>

        {/* Core Principles Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg flex items-center">
            <Shield className="w-6 h-6 mr-2 text-accent" />
            Core Ethical Principles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-raised border border-line p-4 rounded-token">
              <h4 className="font-medium mb-2 text-fg flex items-center">
                <Check className="w-5 h-5 mr-2 text-success" />
                Respect for Persons
              </h4>
              <p className="text-fg-muted">
                Recognize and respect the autonomy of data contributors.
                Remember that each datapoint represents a person who has
                consented to their information being used for research.
              </p>
            </div>

            <div className="bg-surface-raised border border-line p-4 rounded-token">
              <h4 className="font-medium mb-2 text-fg flex items-center">
                <Check className="w-5 h-5 mr-2 text-success" />
                Beneficence
              </h4>
              <p className="text-fg-muted">
                Maximize potential benefits of research while minimizing
                potential harms. Research should aim to contribute to healthcare
                improvements and scientific knowledge.
              </p>
            </div>

            <div className="bg-surface-raised border border-line p-4 rounded-token">
              <h4 className="font-medium mb-2 text-fg flex items-center">
                <Check className="w-5 h-5 mr-2 text-success" />
                Justice
              </h4>
              <p className="text-fg-muted">
                Ensure fair distribution of research benefits and burdens.
                Consider how your research findings may impact different
                populations, particularly vulnerable groups.
              </p>
            </div>

            <div className="bg-surface-raised border border-line p-4 rounded-token">
              <h4 className="font-medium mb-2 text-fg flex items-center">
                <Check className="w-5 h-5 mr-2 text-success" />
                Transparency
              </h4>
              <p className="text-fg-muted">
                Maintain clear, open communication about research methods,
                findings, and limitations. Disclose data sources and processing
                methods in publications.
              </p>
            </div>
          </div>
        </section>

        {/* Data Privacy Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg flex items-center">
            <Lock className="w-6 h-6 mr-2 text-accent" />
            Data Privacy and Security
          </h3>

          <div className="bg-surface-raised border border-line rounded-token p-5 mb-6">
            <h4 className="font-medium mb-3 text-fg">
              Handling Anonymized Data
            </h4>

            <ul className="list-disc pl-6 space-y-2 text-fg-muted">
              <li>
                <span className="font-medium text-fg">
                  Do not attempt to re-identify
                </span>{" "}
                individuals from anonymized datasets. Any attempt to re-identify
                subjects is a serious ethical violation and breach of terms.
              </li>
              <li>
                <span className="font-medium text-fg">Store data securely</span>{" "}
                according to institutional guidelines and best practices for
                sensitive health information.
              </li>
              <li>
                <span className="font-medium text-fg">Limit access</span> to authorized
                research team members who have agreed to these ethical
                guidelines.
              </li>
              <li>
                <span className="font-medium text-fg">Delete or securely archive</span>{" "}
                datasets when they are no longer needed for the specific
                research purpose.
              </li>
            </ul>
          </div>

          <div className="bg-danger-soft border-l-4 border-danger p-5 rounded-token">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-danger mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-danger">Important Warning</h4>
                <p className="mt-1 text-fg-muted">
                  Even with anonymized data, combining multiple datasets or
                  using advanced analytics may risk re-identification. Always
                  evaluate this risk before publishing results or combining
                  datasets.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Research Design Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg flex items-center">
            <FileText className="w-6 h-6 mr-2 text-accent" />
            Ethical Research Design
          </h3>

          <div className="space-y-4 mb-6">
            <div className="p-4 border-l-4 border-success bg-success-soft rounded-token">
              <h4 className="font-medium mb-1 text-success">
                Study Justification
              </h4>
              <p className="text-fg-muted">
                Ensure your research has clear scientific merit and addresses a
                meaningful question. The potential benefits should justify the
                use of human health data.
              </p>
            </div>

            <div className="p-4 border-l-4 border-success bg-success-soft rounded-token">
              <h4 className="font-medium mb-1 text-success">
                Appropriate Dataset Selection
              </h4>
              <p className="text-fg-muted">
                Use only datasets that are relevant to your research question.
                Request and use the minimum amount of data necessary to address
                your research objectives.
              </p>
            </div>

            <div className="p-4 border-l-4 border-success bg-success-soft rounded-token">
              <h4 className="font-medium mb-1 text-success">
                Statistical Validity
              </h4>
              <p className="text-fg-muted">
                Design studies with appropriate statistical power and methods.
                Acknowledge the limitations of the dataset in your analysis and
                conclusions.
              </p>
            </div>

            <div className="p-4 border-l-4 border-success bg-success-soft rounded-token">
              <h4 className="font-medium mb-1 text-success">
                Representativeness
              </h4>
              <p className="text-fg-muted">
                Consider whether the dataset adequately represents the
                population of interest. Acknowledge potential selection biases
                and their impact on generalizability.
              </p>
            </div>
          </div>
        </section>

        {/* Reporting Results Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-accent" />
            Reporting and Publishing Results
          </h3>

          <div className="bg-surface-raised border border-line rounded-token p-5 mb-5">
            <h4 className="font-medium mb-3 text-fg">
              Ethical Results Reporting
            </h4>

            <ul className="list-disc pl-6 space-y-3 text-fg-muted">
              <li>
                Clearly acknowledge Healthmint as the data source and cite
                datasets according to the citation guidelines.
              </li>
              <li>
                Describe data collection methods, inclusion/exclusion criteria,
                and any preprocessing or cleaning performed.
              </li>
              <li>
                Report both positive and negative findings, avoiding selective
                reporting of only favorable results.
              </li>
              <li>
                Present results in ways that do not stigmatize or harm groups of
                people.
              </li>
              <li>
                Acknowledge limitations of the data and analysis methods,
                including potential biases.
              </li>
              <li>
                Consider the implications of your findings and discuss them
                responsibly.
              </li>
            </ul>
          </div>

          <div className="bg-warning-soft rounded-token p-5">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-warning mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-warning">
                  Special Considerations
                </h4>
                <p className="mt-1 text-fg-muted">
                  Take extra care when reporting results related to genetic
                  predispositions, mental health, stigmatized conditions, or
                  findings that could influence health insurance or employment
                  practices. Consider consulting with bioethicists when research
                  involves sensitive or potentially controversial health topics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Responsibility Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg flex items-center">
            <Users className="w-6 h-6 mr-2 text-accent" />
            Community Responsibility
          </h3>

          <div className="bg-surface-raised border border-line p-5 rounded-token mb-6">
            <h4 className="font-medium mb-3 text-fg">
              Data Contributor Acknowledgment
            </h4>
            <p className="text-fg-muted mb-3">
              Recognize that your research is possible because individuals have
              chosen to share their health data. This comes with a
              responsibility to use the data respectfully and for the
              advancement of health knowledge.
            </p>
            <p className="text-fg-muted">
              Consider ways to make your research findings accessible to the
              public and communities who contributed their data. Plain language
              summaries can help make your work more accessible.
            </p>
          </div>

          <div className="bg-info-soft border border-info/30 p-5 rounded-token">
            <h4 className="font-medium mb-3 text-info">
              Knowledge Sharing
            </h4>
            <p className="text-fg-muted mb-3">
              Share insights, methodologies, and lessons learned with the
              Healthmint research community to advance collective knowledge and
              improve future research.
            </p>
            <p className="text-fg-muted">
              Consider open access publication when possible to maximize the
              impact and availability of your findings.
            </p>
          </div>
        </section>

        {/* Ethics Review Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-fg">
            Institutional Review and Compliance
          </h3>

          <div className="bg-surface-raised border border-line p-5 rounded-token mb-5">
            <div className="flex items-start">
              <Eye className="w-6 h-6 text-fg-muted mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium mb-3 text-fg">IRB Review</h4>
                <p className="text-fg-muted mb-3">
                  Although research with anonymized datasets may be exempt from
                  full IRB review at many institutions, researchers should check
                  with their Institutional Review Board or ethics committee to
                  confirm requirements.
                </p>
                <p className="text-fg-muted">
                  Document any IRB determinations or exemptions for your records
                  and note them in publications.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-line rounded-token p-5">
            <h4 className="font-medium mb-3 text-fg">
              Regulatory Compliance
            </h4>
            <p className="text-fg-muted mb-3">
              Ensure your research complies with relevant regulations including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-fg-muted">
              <li>
                HIPAA (Health Insurance Portability and Accountability Act)
              </li>
              <li>GDPR (General Data Protection Regulation) if applicable</li>
              <li>Local and national health data privacy regulations</li>
              <li>Your institution's data governance policies</li>
            </ul>
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <div className="bg-surface border border-line rounded-token p-5">
            <h3 className="text-xl font-medium mb-3 text-fg">
              Research Ethics Support
            </h3>
            <p className="text-fg-muted mb-4">
              If you have questions about these guidelines or need advice on
              ethical considerations for your specific research project, please
              contact the Healthmint Ethics Committee.
            </p>
            <a
              href="mailto:ethics@healthmint.io"
              className="inline-block px-4 py-2 bg-accent text-accent-fg rounded-token hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Contact Ethics Committee
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResearchEthics;
