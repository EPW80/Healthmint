const mockDatasets = [
  {
    id: "dataset-001",
    title: "Diabetes Type 2 Patient Data",
    description: "Anonymized blood glucose monitoring data from patients with Type 2 diabetes over a 6-month period.",
    fileCount: 42,
    totalSize: 15728640, // 15MB
    dataTypes: ["Clinical", "Time Series"],
    researcher: "0x4a8b...1c93",
    format: "CSV",
    timeline: "1 month",
    reward: "0.15",
    tags: ["diabetes", "glucose", "medication"],
    createdAt: "04/05/2025",
  },
  {
    id: "dataset-002",
    title: "Cardiovascular MRI Imaging Dataset",
    description: "Cardiac MRI images with various conditions including normal, post-MI, and cardiomyopathy cases.",
    fileCount: 124,
    totalSize: 209715200, // 200MB
    dataTypes: ["Imaging", "DICOM"],
    researcher: "0x7d3e...9f21",
    format: "DICOM",
    timeline: "3 months",
    reward: "0.25",
    tags: ["cardiology", "MRI", "imaging", "AI"],
    createdAt: "04/01/2025",
  },
  {
    id: "dataset-003",
    title: "Sleep Pattern Data from Wearables",
    description: "Sleep tracking data from wearable devices including sleep stages, disruptions, and activity levels.",
    fileCount: 87,
    totalSize: 52428800, // 50MB
    dataTypes: ["Wearable", "Time Series"],
    researcher: "0x2f7b...5e12",
    format: "JSON",
    timeline: "1-2 weeks",
    reward: "0.08",
    tags: ["sleep", "wearable", "activity"],
    createdAt: "03/18/2025",
  },
  {
    id: "dataset-004",
    title: "COVID-19 Long-term Symptom Tracking",
    description: "Symptom tracking data from post-COVID patients experiencing long-term effects over 6+ months.",
    fileCount: 215,
    totalSize: 104857600, // 100MB
    dataTypes: ["Survey", "Time Series"],
    researcher: "0x9a1c...7b42",
    format: "CSV",
    timeline: "ASAP",
    reward: "0.12",
    tags: ["covid", "long-covid", "symptoms"],
    createdAt: "04/08/2025",
  },
];

export default mockDatasets;