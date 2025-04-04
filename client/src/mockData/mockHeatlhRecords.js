// src/mockData/mockHealthRecords.js

/**
 * Mock health records to use when API fails or for development
 * Provides 25 diverse health records with controlled verification status
 */

const generateMockHealthRecords = () => {
  // Data formats
  const formats = ["PDF", "CSV", "JSON", "DICOM", "HL7", "FHIR"];

  // Generate varied dates over the past 2 years
  const getRandomDate = () => {
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    const randomTimestamp =
      twoYearsAgo.getTime() +
      Math.random() * (now.getTime() - twoYearsAgo.getTime());
    return new Date(randomTimestamp).toISOString();
  };

  // Generate varied record sizes
  const getRandomRecordCount = () => {
    const sizes = [
      // Small records (under 1000)
      () => Math.floor(Math.random() * 1000),
      // Medium records (1000-10000)
      () => Math.floor(Math.random() * 9000) + 1000,
      // Large records (10000+)
      () => Math.floor(Math.random() * 90000) + 10000,
    ];

    return sizes[Math.floor(Math.random() * sizes.length)]();
  };

  // Generate random price from $10 to $500
  const getRandomPrice = () => {
    return (Math.floor(Math.random() * 49) + 1) * 10;
  };

  // Record template data with explicit verification status
  // Use true, false, or null (for random determination)
  const recordTemplates = [
    {
      title: "Annual Physical Examination",
      category: "Physical Exam",
      description:
        "Comprehensive annual physical examination including vitals, general assessment, and preventative screening recommendations.",
      tags: ["annual", "physical", "screening", "preventative"],
      verified: true, // Always verified
    },
    {
      title: "Complete Blood Count (CBC)",
      category: "Laboratory",
      description:
        "Analysis of red blood cells, white blood cells, and platelets to assess overall health and detect a wide range of disorders.",
      tags: ["blood", "test", "CBC", "hematology"],
      verified: true, // Always verified
    },
    {
      title: "Lipid Panel Results",
      category: "Laboratory",
      description:
        "Measurement of cholesterol levels including HDL, LDL, and triglycerides to assess cardiovascular health.",
      tags: ["cholesterol", "lipids", "heart", "cardiovascular"],
      verified: true, // Always verified
    },
    {
      title: "Blood Pressure Monitoring",
      category: "Cardiology",
      description:
        "Periodic measurements of blood pressure readings over a 24-hour period to detect hypertension patterns.",
      tags: ["blood pressure", "hypertension", "monitoring"],
      verified: null, // Random determination
    },
    {
      title: "Electrocardiogram (ECG)",
      category: "Cardiology",
      description:
        "Recording of the electrical activity of the heart to detect cardiac abnormalities and assess heart function.",
      tags: ["ECG", "heart", "electrical", "cardiac"],
      verified: true, // Always verified
    },
    {
      title: "COVID-19 Vaccination",
      category: "Immunization",
      description:
        "Record of COVID-19 vaccination including date, manufacturer, lot number, and administration site.",
      tags: ["COVID-19", "vaccine", "immunization", "pandemic"],
      verified: true, // Always verified
    },
    {
      title: "Influenza Vaccination",
      category: "Immunization",
      description:
        "Annual influenza vaccination record with batch number and administration details.",
      tags: ["flu", "vaccine", "seasonal", "influenza"],
      verified: true, // Always verified
    },
    {
      title: "Allergy Skin Test Results",
      category: "Allergy",
      description:
        "Comprehensive skin test results for environmental and food allergens with reaction severity measurements.",
      tags: ["allergy", "skin test", "allergens", "reactivity"],
      verified: null, // Random determination
    },
    {
      title: "Dental X-Rays",
      category: "Dental",
      description:
        "Full set of dental radiographs including bitewing and panoramic images for comprehensive dental assessment.",
      tags: ["dental", "x-ray", "radiographs", "teeth"],
      verified: true, // Always verified
    },
    {
      title: "Eye Examination",
      category: "Ophthalmology",
      description:
        "Comprehensive eye examination including visual acuity, refraction assessment, and ocular health evaluation.",
      tags: ["vision", "eye", "refraction", "acuity"],
      verified: null, // Random determination
    },
    {
      title: "Genetic Risk Assessment",
      category: "Genetics",
      description:
        "Analysis of genetic markers associated with disease risk factors and pharmaceutical response variations.",
      tags: ["genetics", "DNA", "risk", "hereditary"],
      verified: true, // Always verified
    },
    {
      title: "Mental Health Assessment",
      category: "Psychology",
      description:
        "Standardized psychological evaluation using validated assessment tools to measure mood, anxiety, and cognitive function.",
      tags: ["mental health", "psychology", "assessment", "cognitive"],
      verified: false, // Never verified
    },
    {
      title: "Nutrition Consultation",
      category: "Nutrition",
      description:
        "Dietary assessment and personalized nutrition recommendations based on health goals and medical conditions.",
      tags: ["diet", "nutrition", "consultation", "dietary"],
      verified: false, // Never verified
    },
    {
      title: "Bone Density Scan",
      category: "Orthopedics",
      description:
        "DEXA scan results measuring bone mineral density to assess osteoporosis risk and bone health.",
      tags: ["bone", "density", "DEXA", "osteoporosis"],
      verified: true, // Always verified
    },
    {
      title: "MRI - Lumbar Spine",
      category: "Orthopedics",
      description:
        "Magnetic resonance imaging of the lumbar spine with radiologist interpretation and findings.",
      tags: ["MRI", "spine", "lumbar", "imaging"],
      verified: true, // Always verified
    },
    {
      title: "Pulmonary Function Test",
      category: "Pulmonology",
      description:
        "Comprehensive assessment of lung function including spirometry, lung volumes, and diffusion capacity.",
      tags: ["pulmonary", "lungs", "spirometry", "breathing"],
      verified: null, // Random determination
    },
    {
      title: "Thyroid Function Panel",
      category: "Endocrinology",
      description:
        "Measurement of thyroid hormones (TSH, T3, T4) to assess thyroid function and detect disorders.",
      tags: ["thyroid", "hormones", "endocrine", "TSH"],
      verified: true, // Always verified
    },
    {
      title: "Skin Cancer Screening",
      category: "Dermatology",
      description:
        "Full-body skin examination to detect suspicious lesions and assess skin cancer risk.",
      tags: ["skin", "cancer", "screening", "dermatology"],
      verified: false, // Never verified
    },
    {
      title: "Neurological Examination",
      category: "Neurology",
      description:
        "Comprehensive assessment of neurological function including reflexes, sensation, and cognitive status.",
      tags: ["neurological", "brain", "nervous system", "cognitive"],
      verified: null, // Random determination
    },
    {
      title: "Physical Therapy Evaluation",
      category: "Physical Therapy",
      description:
        "Initial assessment of functional mobility, strength, and rehabilitation needs with treatment recommendations.",
      tags: ["PT", "rehabilitation", "mobility", "therapy"],
      verified: false, // Never verified
    },
    {
      title: "Dietary Log Analysis",
      category: "Nutrition",
      description:
        "Two-week food diary analysis with macronutrient breakdown and dietary pattern observations.",
      tags: ["diet", "food log", "nutrition", "macronutrients"],
      verified: false, // Never verified
    },
    {
      title: "Hemoglobin A1C Test",
      category: "Endocrinology",
      description:
        "Measurement of average blood glucose levels over the past three months to monitor diabetes management.",
      tags: ["diabetes", "glucose", "A1C", "blood sugar"],
      verified: true, // Always verified
    },
    {
      title: "Sports Injury Assessment",
      category: "Sports Medicine",
      description:
        "Evaluation of sports-related injury including mechanism, severity, and rehabilitation protocol.",
      tags: ["sports", "injury", "athletic", "rehabilitation"],
      verified: null, // Random determination
    },
    {
      title: "Vitamin D Level Test",
      category: "Laboratory",
      description:
        "Measurement of serum vitamin D levels to assess deficiency and bone health status.",
      tags: ["vitamin D", "supplement", "deficiency", "blood test"],
      verified: true, // Always verified
    },
    {
      title: "Sleep Study Results",
      category: "Neurology",
      description:
        "Polysomnography results showing sleep patterns, oxygen levels, and potential sleep disorders.",
      tags: ["sleep", "apnea", "polysomnography", "rest"],
      verified: null, // Random determination
    },
  ];

  // Generate 25 mock health records
  return recordTemplates.map((template, index) => {
    // Determine if record is anonymized (80% chance)
    const anonymized = Math.random() > 0.2;

    // Determine if record is verified - respect explicit settings if provided
    const verified =
      template.verified !== null ? template.verified : Math.random() > 0.3; // 70% chance if not explicitly set

    // Create the final record
    return {
      id: `record-${Date.now()}-${index}`,
      title: template.title,
      category: template.category,
      description: template.description,
      uploadDate: getRandomDate(),
      ipfsHash: `ipfs-${Math.random().toString(36).substring(2, 15)}`,
      price: getRandomPrice().toString(),
      format: formats[Math.floor(Math.random() * formats.length)],
      recordCount: getRandomRecordCount(),
      verified: verified,
      anonymized: anonymized,
      shared: Math.random() > 0.7, // 30% chance of being shared
      owner: "0xe169...6041", // Match the address from your screenshot
      tags: template.tags,
      studyType:
        Math.random() > 0.7
          ? "Observational"
          : Math.random() > 0.5
            ? "Clinical Trial"
            : "Longitudinal",
      metadata: {
        patientAge: anonymized
          ? `${Math.floor(Math.random() * 70) + 18}`
          : null,
        recordType: template.category,
        dataQuality:
          Math.random() > 0.8 ? "High" : Math.random() > 0.5 ? "Medium" : "Low",
        completeness: `${Math.floor(Math.random() * 30) + 70}%`, // 70-100%
        processingSteps: ["Collected", "Validated", "Anonymized", "Encrypted"],
      },
    };
  });
};

export default generateMockHealthRecords;
