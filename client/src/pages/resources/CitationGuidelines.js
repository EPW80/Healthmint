// client/src/pages/resources/CitationGuidelines.js
import React from "react";
import { Award, Book, FileText, Link, Download, Copy } from "lucide-react";
import { useDispatch } from "react-redux";
import { addNotification } from "../../redux/slices/notificationSlice";

const CitationGuidelines = () => {
  const dispatch = useDispatch();

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        dispatch(
          addNotification({
            type: "success",
            message: "Citation copied to clipboard!",
            duration: 3000,
          })
        );
      },
      (err) => {
        console.error("Could not copy text: ", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to copy citation",
            duration: 3000,
          })
        );
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-fg">
        Citation Guidelines
      </h1>

      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <Award className="text-info w-8 h-8 mr-3" />
          <h2 className="text-2xl font-semibold text-fg">
            How to Cite Healthmint Datasets
          </h2>
        </div>

        <p className="text-fg mb-6">
          Properly citing Healthmint datasets in your publications ensures
          transparency, reproducibility, and proper attribution. Follow these
          guidelines to correctly cite any dataset you use in your research.
        </p>

        <div className="border-l-4 border-accent pl-4 py-2 mb-6">
          <p className="italic text-fg-muted">
            Proper citation is required as part of your terms of use when
            purchasing datasets through Healthmint.
          </p>
        </div>

        <h3 className="text-xl font-medium mb-4 text-fg">
          Citation Format
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="border border-line rounded-token p-4">
            <div className="flex items-center mb-3">
              <Book className="text-info w-6 h-6 mr-2" />
              <h4 className="text-lg font-medium text-fg">Journal Articles</h4>
            </div>
            <div className="bg-surface-raised p-4 rounded-token-sm mb-3 text-sm text-fg">
              <p>
                Dataset Provider [Individual or Organization]. (Year). Dataset
                Title [Data set]. Healthmint.
                https://healthmint.io/datasets/[dataset-ID]
              </p>
            </div>
            <button
              onClick={() =>
                handleCopyToClipboard(
                  "Dataset Provider [Individual or Organization]. (Year). Dataset Title [Data set]. Healthmint. https://healthmint.io/datasets/[dataset-ID]"
                )
              }
              className="text-accent text-sm flex items-center hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              <Copy size={14} className="mr-1" /> Copy format
            </button>
          </div>

          <div className="border border-line rounded-token p-4">
            <div className="flex items-center mb-3">
              <FileText className="text-success w-6 h-6 mr-2" />
              <h4 className="text-lg font-medium text-fg">APA Style</h4>
            </div>
            <div className="bg-surface-raised p-4 rounded-token-sm mb-3 text-sm text-fg">
              <p>
                Dataset Provider. (Year). Dataset Title [Data set]. Healthmint.
                https://healthmint.io/datasets/[dataset-ID]
              </p>
            </div>
            <button
              onClick={() =>
                handleCopyToClipboard(
                  "Dataset Provider. (Year). Dataset Title [Data set]. Healthmint. https://healthmint.io/datasets/[dataset-ID]"
                )
              }
              className="text-accent text-sm flex items-center hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              <Copy size={14} className="mr-1" /> Copy format
            </button>
          </div>
        </div>

        <h3 className="text-xl font-medium mb-4 text-fg">
          Example Citations
        </h3>

        <div className="bg-info-soft p-5 rounded-token mb-6">
          <h4 className="font-medium mb-2 text-info">
            Example 1: Cardiology Dataset
          </h4>
          <p className="text-fg mb-3">
            Heart Institute Research Group. (2023). Longitudinal Blood Pressure
            Monitoring Data 2018-2022 [Data set]. Healthmint.
            https://healthmint.io/datasets/card-20230615-bp
          </p>
          <button
            onClick={() =>
              handleCopyToClipboard(
                "Heart Institute Research Group. (2023). Longitudinal Blood Pressure Monitoring Data 2018-2022 [Data set]. Healthmint. https://healthmint.io/datasets/card-20230615-bp"
              )
            }
            className="text-accent text-sm flex items-center hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            <Copy size={14} className="mr-1" /> Copy citation
          </button>
        </div>

        <div className="bg-info-soft p-5 rounded-token mb-8">
          <h4 className="font-medium mb-2 text-info">
            Example 2: Genetics Dataset
          </h4>
          <p className="text-fg mb-3">
            Zhang, K., &amp; Patel, R. (2024). Genetic Markers for Disease Risk
            Assessment [Data set]. Healthmint.
            https://healthmint.io/datasets/gen-20240105-risk
          </p>
          <button
            onClick={() =>
              handleCopyToClipboard(
                "Zhang, K., & Patel, R. (2024). Genetic Markers for Disease Risk Assessment [Data set]. Healthmint. https://healthmint.io/datasets/gen-20240105-risk"
              )
            }
            className="text-accent text-sm flex items-center hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            <Copy size={14} className="mr-1" /> Copy citation
          </button>
        </div>

        <h3 className="text-xl font-medium mb-4 text-fg">
          In-Text Citations
        </h3>
        <p className="text-fg mb-4">
          When referencing a dataset within the text of your publication, use
          the following formats:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-fg">
          <li>
            <span className="font-medium">Parenthetical citation:</span> "...the
            analysis revealed significant patterns (Heart Institute Research
            Group, 2023)."
          </li>
          <li>
            <span className="font-medium">Narrative citation:</span> "Heart
            Institute Research Group (2023) provided data that demonstrated..."
          </li>
        </ul>

        <h3 className="text-xl font-medium mb-4 text-fg">
          Dataset Identifiers
        </h3>
        <p className="text-fg mb-6">
          Each Healthmint dataset has a unique identifier that should be
          included in your citation. You can find this identifier in the dataset
          details page. Including this ID ensures that others can locate the
          exact version of the dataset you used.
        </p>

        <div className="bg-warning-soft border-l-4 border-warning p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-warning"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-warning">
                Important Note
              </h4>
              <div className="mt-1 text-sm text-warning">
                <p>
                  If a dataset has been updated since your research was
                  conducted, make sure to cite the specific version you used.
                  This ensures reproducibility of your findings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-medium mb-4 text-fg">
          Citation Download
        </h3>
        <p className="text-fg mb-4">
          For your convenience, each dataset on Healthmint offers downloadable
          citation files in various formats:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-line rounded-token p-4 flex items-center text-fg">
            <Download className="text-info w-5 h-5 mr-2" />
            <span>BibTeX (.bib)</span>
          </div>
          <div className="border border-line rounded-token p-4 flex items-center text-fg">
            <Download className="text-info w-5 h-5 mr-2" />
            <span>RIS Format (.ris)</span>
          </div>
          <div className="border border-line rounded-token p-4 flex items-center text-fg">
            <Download className="text-info w-5 h-5 mr-2" />
            <span>Plain Text (.txt)</span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-token p-5">
          <h3 className="text-xl font-medium mb-3 text-fg">
            Need More Help?
          </h3>
          <p className="text-fg mb-4">
            For specific citation questions or assistance with unique
            publication requirements, please contact our research support team.
          </p>
          <a
            href="mailto:research-support@healthmint.io"
            className="text-accent hover:text-accent-hover flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            <Link size={16} className="mr-2" />
            Contact Research Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default CitationGuidelines;
