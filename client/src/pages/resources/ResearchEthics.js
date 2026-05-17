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
      <h1 className="text-3xl font-bold mb-6 text-indigo-800">
        Research Ethics Guidelines
      </h1>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <Briefcase className="text-indigo-500 w-8 h-8 mr-3" />
          <h2 className="text-2xl font-semibold">
            Ethical Research Using Anonymized Health Data
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          Healthmint is committed to facilitating responsible and ethical health
          research while protecting individual privacy. These guidelines outline
          the ethical considerations researchers should follow when using data
          acquired through the Healthmint platform.
        </p>

        <div className="border-l-4 border-indigo-500 pl-4 py-2 mb-8">
          <p className="italic text-gray-600">
            All researchers using Healthmint datasets are required to adhere to
            these ethical guidelines as a condition of data access.
          </p>
        </div>

        {/* Core Principles Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-indigo-700 flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Core Ethical Principles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-indigo-800 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-600" />
                Respect for Persons
              </h4>
              <p className="text-gray-700">
                Recognize and respect the autonomy of data contributors.
                Remember that each datapoint represents a person who has
                consented to their information being used for research.
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-indigo-800 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-600" />
                Beneficence
              </h4>
              <p className="text-gray-700">
                Maximize potential benefits of research while minimizing
                potential harms. Research should aim to contribute to healthcare
                improvements and scientific knowledge.
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-indigo-800 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-600" />
                Justice
              </h4>
              <p className="text-gray-700">
                Ensure fair distribution of research benefits and burdens.
                Consider how your research findings may impact different
                populations, particularly vulnerable groups.
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-indigo-800 flex items-center">
                <Check className="w-5 h-5 mr-2 text-green-600" />
                Transparency
              </h4>
              <p className="text-gray-700">
                Maintain clear, open communication about research methods,
                findings, and limitations. Disclose data sources and processing
                methods in publications.
              </p>
            </div>
          </div>
        </section>

        {/* Data Privacy Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-indigo-700 flex items-center">
            <Lock className="w-6 h-6 mr-2" />
            Data Privacy and Security
          </h3>

          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h4 className="font-medium mb-3 text-indigo-800">
              Handling Anonymized Data
            </h4>

            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <span className="font-medium">
                  Do not attempt to re-identify
                </span>{" "}
                individuals from anonymized datasets. Any attempt to re-identify
                subjects is a serious ethical violation and breach of terms.
              </li>
              <li>
                <span className="font-medium">Store data securely</span>{" "}
                according to institutional guidelines and best practices for
                sensitive health information.
              </li>
              <li>
                <span className="font-medium">Limit access</span> to authorized
                research team members who have agreed to these ethical
                guidelines.
              </li>
              <li>
                <span className="font-medium">Delete or securely archive</span>{" "}
                datasets when they are no longer needed for the specific
                research purpose.
              </li>
            </ul>
          </div>

          <div className="bg-red-50 p-5 rounded-lg border-l-4 border-red-400">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Important Warning</h4>
                <p className="mt-1 text-gray-700">
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
          <h3 className="text-xl font-medium mb-4 text-indigo-700 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Ethical Research Design
          </h3>

          <div className="space-y-4 mb-6">
            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-medium mb-1 text-green-800">
                Study Justification
              </h4>
              <p className="text-gray-700">
                Ensure your research has clear scientific merit and addresses a
                meaningful question. The potential benefits should justify the
                use of human health data.
              </p>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-medium mb-1 text-green-800">
                Appropriate Dataset Selection
              </h4>
              <p className="text-gray-700">
                Use only datasets that are relevant to your research question.
                Request and use the minimum amount of data necessary to address
                your research objectives.
              </p>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-medium mb-1 text-green-800">
                Statistical Validity
              </h4>
              <p className="text-gray-700">
                Design studies with appropriate statistical power and methods.
                Acknowledge the limitations of the dataset in your analysis and
                conclusions.
              </p>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-medium mb-1 text-green-800">
                Representativeness
              </h4>
              <p className="text-gray-700">
                Consider whether the dataset adequately represents the
                population of interest. Acknowledge potential selection biases
                and their impact on generalizability.
              </p>
            </div>
          </div>
        </section>

        {/* Reporting Results Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-indigo-700 flex items-center">
            <BookOpen className="w-6 h-6 mr-2" />
            Reporting and Publishing Results
          </h3>

          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
            <h4 className="font-medium mb-3 text-indigo-800">
              Ethical Results Reporting
            </h4>

            <ul className="list-disc pl-6 space-y-3 text-gray-700">
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

          <div className="bg-yellow-50 p-5 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">
                  Special Considerations
                </h4>
                <p className="mt-1 text-gray-700">
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
          <h3 className="text-xl font-medium mb-4 text-indigo-700 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Community Responsibility
          </h3>

          <div className="bg-indigo-50 p-5 rounded-lg mb-6">
            <h4 className="font-medium mb-3 text-indigo-800">
              Data Contributor Acknowledgment
            </h4>
            <p className="text-gray-700 mb-3">
              Recognize that your research is possible because individuals have
              chosen to share their health data. This comes with a
              responsibility to use the data respectfully and for the
              advancement of health knowledge.
            </p>
            <p className="text-gray-700">
              Consider ways to make your research findings accessible to the
              public and communities who contributed their data. Plain language
              summaries can help make your work more accessible.
            </p>
          </div>

          <div className="bg-blue-50 p-5 rounded-lg">
            <h4 className="font-medium mb-3 text-blue-800">
              Knowledge Sharing
            </h4>
            <p className="text-gray-700 mb-3">
              Share insights, methodologies, and lessons learned with the
              Healthmint research community to advance collective knowledge and
              improve future research.
            </p>
            <p className="text-gray-700">
              Consider open access publication when possible to maximize the
              impact and availability of your findings.
            </p>
          </div>
        </section>

        {/* Ethics Review Section */}
        <section className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-indigo-700">
            Institutional Review and Compliance
          </h3>

          <div className="bg-gray-50 p-5 rounded-lg mb-5">
            <div className="flex items-start">
              <Eye className="w-6 h-6 text-gray-700 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium mb-3 text-gray-800">IRB Review</h4>
                <p className="text-gray-700 mb-3">
                  Although research with anonymized datasets may be exempt from
                  full IRB review at many institutions, researchers should check
                  with their Institutional Review Board or ethics committee to
                  confirm requirements.
                </p>
                <p className="text-gray-700">
                  Document any IRB determinations or exemptions for your records
                  and note them in publications.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-blue-200 rounded-lg p-5">
            <h4 className="font-medium mb-3 text-indigo-800">
              Regulatory Compliance
            </h4>
            <p className="text-gray-700 mb-3">
              Ensure your research complies with relevant regulations including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
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
          <div className="bg-indigo-50 p-5 rounded-lg">
            <h3 className="text-xl font-medium mb-3 text-indigo-800">
              Research Ethics Support
            </h3>
            <p className="text-gray-700 mb-4">
              If you have questions about these guidelines or need advice on
              ethical considerations for your specific research project, please
              contact the Healthmint Ethics Committee.
            </p>
            <a
              href="mailto:ethics@healthmint.io"
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
