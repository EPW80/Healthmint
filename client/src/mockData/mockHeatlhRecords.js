// src/mockData/mockHealthRecords.js
const generateMockHealthRecords = () => {
  // Data formats
  const formats = ["PDF", "CSV", "JSON", "DICOM", "HL7", "FHIR"];

  // Generate varied dates over the past 5 years
  const getRandomDate = () => {
    const now = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(now.getFullYear() - 5);

    const randomTimestamp =
      fiveYearsAgo.getTime() +
      Math.random() * (now.getTime() - fiveYearsAgo.getTime());
    return new Date(randomTimestamp).toISOString();
  };

  // Generate varied record counts using a logarithmic scale for realism
  const getRandomRecordCount = () => {
    const min = 10;
    const max = 1000000;
    const exponent = 2; // Adjusts skewness
    const randomValue = Math.random();
    return Math.floor(min * Math.pow(max / min, randomValue ** exponent));
  };

  // Generate price based on record count and verification status
  const getRandomPrice = (recordCount, verified) => {
    const basePrice = 0.01; // Minimum price in ETH
    const multiplier = verified ? 1.5 : 1.0; // Verified records are more expensive
    const price = basePrice + (recordCount / 1000000) * multiplier;
    return Math.min(price, 0.7).toFixed(4); // Cap at 0.7 ETH
  };

  // Expanded templates for health records
  const recordTemplates = [
    {
      title: "Annual Physical Examination",
      category: "Physical Exam",
      description:
        "Comprehensive annual physical examination including vitals, general assessment, and preventative screening recommendations.",
      tags: ["annual", "physical", "screening", "preventative"],
      verified: true,
      sensitivity: "low",
    },
    {
      title: "Complete Blood Count (CBC)",
      category: "Laboratory",
      description:
        "Analysis of red blood cells, white blood cells, and platelets to assess overall health and detect disorders.",
      tags: ["blood", "test", "CBC", "hematology"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Lipid Panel Results",
      category: "Laboratory",
      description:
        "Measurement of cholesterol levels (HDL, LDL, triglycerides) to assess cardiovascular health.",
      tags: ["cholesterol", "lipids", "heart", "cardiovascular"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Blood Pressure Monitoring",
      category: "Cardiology",
      description:
        "24-hour blood pressure readings to detect hypertension patterns.",
      tags: ["blood pressure", "hypertension", "monitoring"],
      verified: null,
      sensitivity: "low",
    },
    {
      title: "Electrocardiogram (ECG)",
      category: "Cardiology",
      description:
        "Recording of heart electrical activity to detect abnormalities and assess function.",
      tags: ["ECG", "heart", "electrical", "cardiac"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "COVID-19 Vaccination",
      category: "Immunization",
      description:
        "Record of COVID-19 vaccination with date, manufacturer, lot number, and site.",
      tags: ["COVID-19", "vaccine", "immunization", "pandemic"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Influenza Vaccination",
      category: "Immunization",
      description:
        "Annual flu vaccination record with batch number and administration details.",
      tags: ["flu", "vaccine", "seasonal", "influenza"],
      verified: true,
      sensitivity: "low",
    },
    {
      title: "Allergy Skin Test Results",
      category: "Allergy",
      description:
        "Skin test results for environmental and food allergens with severity measurements.",
      tags: ["allergy", "skin test", "allergens", "reactivity"],
      verified: null,
      sensitivity: "medium",
    },
    {
      title: "Dental X-Rays",
      category: "Dental",
      description:
        "Full set of dental radiographs (bitewing and panoramic) for assessment.",
      tags: ["dental", "x-ray", "radiographs", "teeth"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Eye Examination",
      category: "Ophthalmology",
      description:
        "Eye exam including visual acuity, refraction, and ocular health evaluation.",
      tags: ["vision", "eye", "refraction", "acuity"],
      verified: null,
      sensitivity: "low",
    },
    {
      title: "Genetic Risk Assessment",
      category: "Genetics",
      description:
        "Analysis of genetic markers for disease risk and pharmaceutical response.",
      tags: ["genetics", "DNA", "risk", "hereditary"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Mental Health Assessment",
      category: "Psychology",
      description:
        "Psychological evaluation measuring mood, anxiety, and cognitive function.",
      tags: ["mental health", "psychology", "assessment", "cognitive"],
      verified: false,
      sensitivity: "high",
    },
    {
      title: "Nutrition Consultation",
      category: "Nutrition",
      description:
        "Dietary assessment and personalized nutrition recommendations.",
      tags: ["diet", "nutrition", "consultation", "dietary"],
      verified: false,
      sensitivity: "low",
    },
    {
      title: "Bone Density Scan",
      category: "Orthopedics",
      description:
        "DEXA scan results assessing bone mineral density and osteoporosis risk.",
      tags: ["bone", "density", "DEXA", "osteoporosis"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "MRI - Lumbar Spine",
      category: "Orthopedics",
      description: "MRI of the lumbar spine with radiologist interpretation.",
      tags: ["MRI", "spine", "lumbar", "imaging"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Pulmonary Function Test",
      category: "Pulmonology",
      description:
        "Lung function assessment including spirometry and diffusion capacity.",
      tags: ["pulmonary", "lungs", "spirometry", "breathing"],
      verified: null,
      sensitivity: "medium",
    },
    {
      title: "Thyroid Function Panel",
      category: "Endocrinology",
      description:
        "Measurement of thyroid hormones (TSH, T3, T4) to assess function.",
      tags: ["thyroid", "hormones", "endocrine", "TSH"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Skin Cancer Screening",
      category: "Dermatology",
      description:
        "Full-body skin exam to detect lesions and assess cancer risk.",
      tags: ["skin", "cancer", "screening", "dermatology"],
      verified: false,
      sensitivity: "high",
    },
    {
      title: "Neurological Examination",
      category: "Neurology",
      description:
        "Assessment of neurological function including reflexes and cognition.",
      tags: ["neurological", "brain", "nervous system", "cognitive"],
      verified: null,
      sensitivity: "high",
    },
    {
      title: "Physical Therapy Evaluation",
      category: "Physical Therapy",
      description:
        "Assessment of mobility, strength, and rehabilitation needs.",
      tags: ["PT", "rehabilitation", "mobility", "therapy"],
      verified: false,
      sensitivity: "medium",
    },
    {
      title: "Dietary Log Analysis",
      category: "Nutrition",
      description: "Two-week food diary analysis with macronutrient breakdown.",
      tags: ["diet", "food log", "nutrition", "macronutrients"],
      verified: false,
      sensitivity: "low",
    },
    {
      title: "Hemoglobin A1C Test",
      category: "Endocrinology",
      description:
        "Measurement of average blood glucose over three months for diabetes monitoring.",
      tags: ["diabetes", "glucose", "A1C", "blood sugar"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Sports Injury Assessment",
      category: "Sports Medicine",
      description:
        "Evaluation of sports injury with severity and rehabilitation protocol.",
      tags: ["sports", "injury", "athletic", "rehabilitation"],
      verified: null,
      sensitivity: "low",
    },
    {
      title: "Vitamin D Level Test",
      category: "Laboratory",
      description:
        "Serum vitamin D measurement to assess deficiency and bone health.",
      tags: ["vitamin D", "supplement", "deficiency", "blood test"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Sleep Study Results",
      category: "Neurology",
      description:
        "Polysomnography results showing sleep patterns and disorders.",
      tags: ["sleep", "apnea", "polysomnography", "rest"],
      verified: null,
      sensitivity: "high",
    },
    // New templates for diversity
    {
      title: "Pediatric Growth Chart",
      category: "Pediatrics",
      description:
        "Longitudinal record of child growth (height, weight, head circumference).",
      tags: ["pediatric", "growth", "development", "child"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Prenatal Ultrasound",
      category: "Obstetrics",
      description:
        "Ultrasound imaging to monitor fetal development during pregnancy.",
      tags: ["pregnancy", "ultrasound", "fetal", "obstetrics"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Cancer Screening Panel",
      category: "Oncology",
      description:
        "Screening tests for cancer including blood markers and imaging.",
      tags: ["cancer", "screening", "oncology", "tumor markers"],
      verified: true,
      sensitivity: "high",
    },
    {
      title: "Liver Function Tests",
      category: "Hepatology",
      description: "Blood tests assessing liver health (enzymes, bilirubin).",
      tags: ["liver", "enzymes", "bilirubin", "hepatology"],
      verified: true,
      sensitivity: "medium",
    },
    {
      title: "Renal Function Panel",
      category: "Nephrology",
      description:
        "Tests evaluating kidney function (creatinine, BUN, electrolytes).",
      tags: ["kidney", "renal", "creatinine", "electrolytes"],
      verified: true,
      sensitivity: "medium",
    },
  ];

  // Generate 30 mock health records
  return recordTemplates.map((template, index) => {
    // Anonymization based on sensitivity
    const anonymizationChance = {
      low: 0.3, // 30% chance
      medium: 0.6, // 60% chance
      high: 0.9, // 90% chance
    };
    const anonymized =
      Math.random() < anonymizationChance[template.sensitivity];

    // Verification respects explicit settings or defaults to 70% chance
    const verified =
      template.verified !== null ? template.verified : Math.random() > 0.3;

    const recordCount = getRandomRecordCount();
    const price = getRandomPrice(recordCount, verified);

    return {
      id: `record-${Date.now()}-${index}`,
      title: template.title,
      category: template.category,
      description: template.description,
      uploadDate: getRandomDate(),
      ipfsHash: `ipfs-${Math.random().toString(36).substring(2, 15)}`,
      price: price.toString(),
      format: formats[Math.floor(Math.random() * formats.length)],
      recordCount: recordCount,
      verified: verified,
      anonymized: anonymized,
      shared: Math.random() > 0.7, // 30% chance
      owner: `0x${Math.random().toString(16).substring(2, 10)}`, // Random address
      tags: template.tags,
      studyType:
        template.category === "Laboratory" || template.category === "Genetics"
          ? "Observational"
          : Math.random() > 0.5
            ? "Clinical Trial"
            : "Longitudinal",
      metadata: {
        patientAge: anonymized
          ? null
          : `${Math.floor(Math.random() * 70) + 18}`,
        recordType: template.category,
        dataQuality:
          recordCount > 10000 ? "High" : recordCount > 1000 ? "Medium" : "Low",
        completeness: `${Math.floor(Math.random() * 30) + 70}%`, // 70-100%
        processingSteps: anonymized
          ? ["Collected", "Validated", "Anonymized", "Encrypted"]
          : ["Collected", "Validated", "Encrypted"],
        collectionMethod: Math.random() > 0.5 ? "Clinical" : "Self-reported",
        region: ["North America", "Europe", "Asia", "Africa", "South America"][
          Math.floor(Math.random() * 5)
        ],
      },
    };
  });
};

export default generateMockHealthRecords;
