// src/mockData/mockRequests.js

export const MOCK_REQUESTS = [
  {
    id: "req-001",
    title: "Diabetes Type 2 Patient Data",
    description:
      "Looking for anonymized blood glucose monitoring data from patients with Type 2 diabetes over a 6-month period. Data should include medication information, diet logs if available, and any lifestyle modifications. This will be used to study the correlation between medication adherence, diet, and blood glucose control.",
    researcher: "0x4a8b...1c93",
    status: "open",
    dataType: "Clinical",
    format: "CSV",
    timeline: "1 month",
    reward: "0.15",
    tags: ["diabetes", "glucose", "medication", "diet"],
    createdAt: "04/05/2025",
    anonymized: true,
  },
  {
    id: "req-002",
    title: "Cardiovascular MRI Imaging Dataset",
    description:
      "Seeking cardiac MRI images for AI model training. Need at least 100 anonymized samples with various conditions including normal, post-MI, and cardiomyopathy cases. Images should be high-resolution DICOM format with associated radiologist reports if available. This data will be used to train a machine learning model to assist in early detection of heart conditions.",
    researcher: "0x7d3e...9f21",
    status: "pending",
    dataType: "Imaging",
    format: "DICOM",
    timeline: "3 months",
    reward: "0.25",
    tags: ["cardiology", "MRI", "imaging", "AI"],
    createdAt: "04/01/2025",
    anonymized: true,
  },
  {
    id: "req-003",
    title: "Sleep Pattern Data from Wearables",
    description:
      "Requesting sleep tracking data from wearable devices. Interested in sleep stages, disruptions, and correlation with activity levels. At least 2 weeks of continuous monitoring is preferred. This data will help us understand how daily activity patterns affect sleep quality and duration across different demographics.",
    researcher: "0x2f7b...5e12",
    status: "fulfilled",
    dataType: "Wearable",
    format: "JSON",
    timeline: "1-2 weeks",
    reward: "0.08",
    tags: ["sleep", "wearable", "activity", "insomnia"],
    createdAt: "03/18/2025",
    anonymized: true,
  },
  {
    id: "req-004",
    title: "COVID-19 Long-term Symptom Tracking",
    description:
      "Need symptom tracking data from post-COVID patients experiencing long-term effects. Looking for at least 6 months of follow-up data including symptom types, severity, triggers, and any treatments tried. This research aims to identify patterns in long COVID symptoms and potential effective management strategies.",
    researcher: "0x9a1c...7b42",
    status: "open",
    dataType: "Survey",
    format: "CSV",
    timeline: "ASAP",
    reward: "0.12",
    tags: ["covid", "long-covid", "symptoms", "recovery"],
    createdAt: "04/08/2025",
    anonymized: true,
  },
  {
    id: "req-005",
    title: "Gut Microbiome Analysis Data",
    description:
      "Collecting gut microbiome sequencing data from adults with and without IBD, Crohn's, or ulcerative colitis. Data should include microbiome composition, patient diet information, and symptom reports if available. Research aims to identify microbiome signatures that correlate with disease state and dietary interventions.",
    researcher: "0x3b5e...8d21",
    status: "open",
    dataType: "Genomic",
    format: "FASTQ",
    timeline: "2 months",
    reward: "0.18",
    tags: ["microbiome", "IBD", "gut health", "genomic"],
    createdAt: "04/03/2025",
    anonymized: true,
  },
  {
    id: "req-006",
    title: "Mental Health App Usage Patterns",
    description:
      "Seeking usage data from mental health apps including frequency, duration, and feature utilization. De-identified data on user engagement patterns and reported mood/anxiety levels when available. This will support research on digital mental health intervention efficacy and engagement optimization.",
    researcher: "0x5f1a...6c34",
    status: "open",
    dataType: "Digital",
    format: "JSON",
    timeline: "1 month",
    reward: "0.10",
    tags: ["mental health", "digital health", "apps", "engagement"],
    createdAt: "04/07/2025",
    anonymized: true,
  },
  {
    id: "req-007",
    title: "Pregnancy Health Tracking Data",
    description:
      "Looking for pregnancy tracking data including symptoms, vitals, and health metrics throughout pregnancy. Interest in both normal and high-risk pregnancies. Data will be used to develop better predictive models for pregnancy complications and personalized care recommendations.",
    researcher: "0x8c3d...2f56",
    status: "open",
    dataType: "Clinical",
    format: "CSV",
    timeline: "Flexible",
    reward: "0.20",
    tags: ["pregnancy", "maternal health", "prenatal care"],
    createdAt: "04/02/2025",
    anonymized: true,
  },
  {
    id: "req-008",
    title: "Exercise Recovery Biomarkers",
    description:
      "Collecting data on post-exercise recovery biomarkers from athletes or regular exercisers. Interest in heart rate variability, sleep quality, subjective recovery scores, and any blood biomarkers if available. Research focuses on optimizing recovery protocols based on individual physiological responses.",
    researcher: "0x1e7f...9a23",
    status: "pending",
    dataType: "Wearable",
    format: "CSV",
    timeline: "1 month",
    reward: "0.15",
    tags: ["exercise", "recovery", "HRV", "sports medicine"],
    createdAt: "03/25/2025",
    anonymized: true,
  },
];

export const getRequestById = (requestId) => {
  return MOCK_REQUESTS.find((request) => request.id === requestId) || null;
};

// Create a named object before exporting it as default
const mockDataRequests = {
  MOCK_REQUESTS,
  getRequestById,
};

export default mockDataRequests;
