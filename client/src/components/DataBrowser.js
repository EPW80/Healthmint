import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// styled components
const StyledCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.9)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
  },
}));

const FilterContainer = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  border: "1px solid rgba(255, 255, 255, 0.3)",
}));

const PurchaseButton = styled(Button)(({ theme }) => ({
  borderRadius: "8px",
  padding: "10px 0",
  fontWeight: "bold",
  background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
  boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
  "&:hover": {
    background: "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
  },
}));

// Separate mock data into its own constant
const MOCK_HEALTH_DATA = [
  {
    id: 1,
    owner: "0x123...abc",
    price: "0.1",
    description: "Complete Health Records 2023",
    verified: true,
    age: 35,
    category: "General Health",
  },
  {
    id: 2,
    owner: "0x456...def",
    price: "0.2",
    description: "Medical History - Cardiovascular",
    verified: false,
    age: 45,
    category: "Cardiology",
  },
  {
    id: 3,
    owner: "0x789...ghi",
    price: "0.15",
    description: "Annual Physical Results",
    verified: true,
    age: 28,
    category: "Physical Exam",
  },
  {
    id: 4,
    owner: "0xabc...123",
    price: "0.25",
    description: "Lab Results & Blood Work",
    verified: true,
    age: 41,
    category: "Laboratory",
  },
  {
    id: 5,
    owner: "0xdef...456",
    price: "0.18",
    description: "Vaccination Records",
    verified: false,
    age: 32,
    category: "Immunization",
  },
  {
    id: 6,
    owner: "0xfed...789",
    price: "0.3",
    description: "Genetic Testing Results",
    verified: true,
    age: 29,
    category: "Genetics",
  },
  {
    id: 7,
    owner: "0x321...cba",
    price: "0.12",
    description: "Mental Health Assessment",
    verified: false,
    age: 38,
    category: "Psychology",
  },
  {
    id: 8,
    owner: "0x654...fed",
    price: "0.22",
    description: "Dental Records 2023",
    verified: true,
    age: 42,
    category: "Dental",
  },
  {
    id: 9,
    owner: "0x987...hig",
    price: "0.17",
    description: "Vision Test Results",
    verified: true,
    age: 33,
    category: "Ophthalmology",
  },
  {
    id: 10,
    owner: "0xcba...321",
    price: "0.28",
    description: "Allergy Test Results",
    verified: false,
    age: 27,
    category: "Allergy",
  },
  {
    id: 11,
    owner: "0xaaa...111",
    price: "0.35",
    description: "Sleep Study Data",
    verified: true,
    age: 51,
    category: "Neurology",
  },
  {
    id: 12,
    owner: "0xbbb...222",
    price: "0.19",
    description: "Physical Therapy Records",
    verified: false,
    age: 44,
    category: "Physical Therapy",
  },
  {
    id: 13,
    owner: "0xccc...333",
    price: "0.24",
    description: "Nutritional Assessment",
    verified: true,
    age: 31,
    category: "Nutrition",
  },
  {
    id: 14,
    owner: "0xddd...444",
    price: "0.16",
    description: "Dermatology Records",
    verified: true,
    age: 36,
    category: "Dermatology",
  },
  {
    id: 15,
    owner: "0xeee...555",
    price: "0.27",
    description: "Orthopedic Evaluation",
    verified: false,
    age: 48,
    category: "Orthopedics",
  },
  {
    id: 16,
    owner: "0xfff...666",
    price: "0.21",
    description: "Respiratory Function Tests",
    verified: true,
    age: 39,
    category: "Pulmonology",
  },
  {
    id: 17,
    owner: "0xggg...777",
    price: "0.31",
    description: "Endocrine System Analysis",
    verified: true,
    age: 43,
    category: "Endocrinology",
  },
  {
    id: 18,
    owner: "0xhhh...888",
    price: "0.23",
    description: "Pregnancy Health Records",
    verified: true,
    age: 34,
    category: "Obstetrics",
  },
  {
    id: 19,
    owner: "0xiii...999",
    price: "0.26",
    description: "Pediatric Growth Data",
    verified: false,
    age: 25,
    category: "Pediatrics",
  },
  {
    id: 20,
    owner: "0xjjj...000",
    price: "0.29",
    description: "Sports Medicine Assessment",
    verified: true,
    age: 30,
    category: "Sports Medicine",
  },
  {
    id: 21,
    owner: "0xkkk...111",
    price: "0.33",
    description: "Rheumatology Assessment",
    verified: true,
    age: 52,
    category: "Rheumatology",
  },
  {
    id: 22,
    owner: "0xlll...222",
    price: "0.28",
    description: "Oncology Treatment Records",
    verified: true,
    age: 47,
    category: "Oncology",
  },
  {
    id: 23,
    owner: "0xmmm...333",
    price: "0.20",
    description: "Gastroenterology Evaluation",
    verified: false,
    age: 39,
    category: "Gastroenterology",
  },
  {
    id: 24,
    owner: "0xnnn...444",
    price: "0.25",
    description: "Urology Testing Results",
    verified: true,
    age: 55,
    category: "Urology",
  },
  {
    id: 25,
    owner: "0xooo...555",
    price: "0.22",
    description: "Infectious Disease Records",
    verified: false,
    age: 28,
    category: "Infectious Disease",
  },
];

const DataBrowser = () => {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minAge: "",
    maxAge: "",
    verifiedOnly: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate loading data from an API
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setHealthData(MOCK_HEALTH_DATA);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredData = healthData.filter((data) => {
    if (filters.verifiedOnly && !data.verified) return false;
    if (filters.minAge && data.age < parseInt(filters.minAge)) return false;
    if (filters.maxAge && data.age > parseInt(filters.maxAge)) return false;
    return true;
  });

  const handlePurchase = async (id) => {
    try {
      console.log("Purchasing data with ID:", id);
      alert("Purchase successful!");
    } catch (error) {
      console.error("Error purchasing data:", error);
      alert("Error making purchase. Please try again.");
    }
  };

  const renderFilters = () => (
    <FilterContainer>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Min Age"
            type="number"
            value={filters.minAge}
            onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Max Age"
            type="number"
            value={filters.maxAge}
            onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.verifiedOnly}
                onChange={(e) =>
                  setFilters({ ...filters, verifiedOnly: e.target.checked })
                }
              />
            }
            label="Show verified data only"
          />
        </Grid>
      </Grid>
    </FilterContainer>
  );

  const renderHealthDataCard = (data) => (
    <Grid item xs={12} sm={6} md={4} key={data.id}>
      <StyledCard>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            ID: {data.id}
          </Typography>
          <Typography
            color="textSecondary"
            gutterBottom
            sx={{
              bgcolor: "rgba(0, 0, 0, 0.05)",
              p: 1,
              borderRadius: 1,
              fontSize: "0.9rem",
            }}
          >
            Owner: {data.owner}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {data.description}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Age: {data.age}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              display: "inline-block",
              bgcolor: "rgba(33, 150, 243, 0.1)",
              color: "primary.main",
              px: 1.5,
              py: 0.5,
              borderRadius: "20px",
              mb: 1,
            }}
          >
            {data.category}
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "primary.main", fontWeight: "bold", mt: 1 }}
          >
            {data.price} ETH
          </Typography>
          {data.verified && (
            <Typography
              color="success.main"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontWeight: "bold",
              }}
            >
              Verified ✓
            </Typography>
          )}
        </CardContent>
        <Box sx={{ p: 2 }}>
          <PurchaseButton fullWidth onClick={() => handlePurchase(data.id)}>
            Purchase
          </PurchaseButton>
        </Box>
      </StyledCard>
    </Grid>
  );

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 4,
          }}
        >
          Browse Health Data
        </Typography>

        {renderFilters()}

        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ mb: 3, color: "text.secondary", fontWeight: 500 }}
            >
              Showing {filteredData.length} of {healthData.length} records
            </Typography>
            <Grid container spacing={3}>
              {filteredData.map(renderHealthDataCard)}
            </Grid>
          </>
        )}
      </Box>
    </Container>
  );
};

export default DataBrowser;
