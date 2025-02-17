import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
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
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";

// API endpoint (should come from environment config)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
console.log("Resolved API_URL:", API_URL);

// Categories from backend
const CATEGORIES = [
  "All",
  "General Health",
  "Cardiology",
  "Physical Exam",
  "Laboratory",
  "Immunization",
  "Genetics",
  "Psychology",
  "Dental",
  "Ophthalmology",
  "Allergy",
  "Neurology",
  "Physical Therapy",
  "Nutrition",
  "Dermatology",
  "Orthopedics",
  "Pulmonology",
  "Endocrinology",
  "Obstetrics",
  "Pediatrics",
  "Sports Medicine",
];

// Styled components remain the same...
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

const LoadingContainer = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "200px",
});

const DataBrowser = ({ onPurchase }) => {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minAge: "",
    maxAge: "",
    verifiedOnly: false,
    category: "All",
    priceRange: "all",
  });

  // Fetch data from API
  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const formattedUrl = `${API_URL.replace(/\/$/, "")}/api/data/browse`;
      const response = await axios.get(formattedUrl, {
        params: {
          minAge: filters.minAge || undefined,
          maxAge: filters.maxAge || undefined,
          verified: filters.verifiedOnly || undefined,
          category: filters.category === "All" ? undefined : filters.category,
          priceRange: filters.priceRange === "all" ? undefined : filters.priceRange,
        },
      });
      setHealthData(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load health data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Handle filter changes
  const handleFilterChange = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Memoized filtered data (client-side filtering for performance)
  const filteredData = useMemo(() => {
    if (!healthData.length) return [];

    return healthData.filter((data) => {
      if (filters.verifiedOnly && !data.verified) return false;
      if (filters.minAge && data.age < parseInt(filters.minAge)) return false;
      if (filters.maxAge && data.age > parseInt(filters.maxAge)) return false;
      if (filters.category !== "All" && data.category !== filters.category)
        return false;

      const price = parseFloat(data.price);
      switch (filters.priceRange) {
        case "low":
          return price <= 0.1;
        case "medium":
          return price > 0.1 && price <= 0.25;
        case "high":
          return price > 0.25;
        default:
          return true;
      }
    });
  }, [healthData, filters]);

  // Handle purchase
  const handlePurchase = useCallback(
    async (id) => {
      try {
        setError(null);
        await onPurchase?.(id);
      } catch (error) {
        console.error("Error purchasing data:", error);
        setError("Failed to complete purchase. Please try again.");
      }
    },
    [onPurchase]
  );

  // Filter rendering remains the same...
  const renderFilters = () => (
    <FilterContainer>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Min Age"
            type="number"
            value={filters.minAge}
            onChange={(e) => handleFilterChange("minAge", e.target.value)}
            inputProps={{ min: 0, max: 120 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Max Age"
            type="number"
            value={filters.maxAge}
            onChange={(e) => handleFilterChange("maxAge", e.target.value)}
            inputProps={{ min: 0, max: 120 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              label="Category"
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Price Range</InputLabel>
            <Select
              value={filters.priceRange}
              label="Price Range"
              onChange={(e) => handleFilterChange("priceRange", e.target.value)}
            >
              <MenuItem value="all">All Prices</MenuItem>
              <MenuItem value="low">Low (≤ 0.1 ETH)</MenuItem>
              <MenuItem value="medium">Medium (0.1-0.25 ETH)</MenuItem>
              <MenuItem value="high">High ({">"} 0.25 ETH)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.verifiedOnly}
                onChange={(e) =>
                  handleFilterChange("verifiedOnly", e.target.checked)
                }
              />
            }
            label="Show verified data only"
          />
        </Grid>
      </Grid>
    </FilterContainer>
  );

  // Render health data card
  const renderHealthDataCard = useCallback(
    (data) => (
      <Grid item xs={12} sm={6} md={4} key={data.id}>
        <StyledCard>
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {data.category}
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
            <Typography
              variant="h6"
              sx={{ color: "primary.main", fontWeight: "bold", mt: 1 }}
            >
              {data.price} ETH
            </Typography>
            {data.verified && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "success.main",
                }}
              >
                <CheckCircle size={16} />
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Verified
                </Typography>
              </Box>
            )}
          </CardContent>
          <Box sx={{ p: 2 }}>
            <PurchaseButton fullWidth onClick={() => handlePurchase(data.id)}>
              Purchase
            </PurchaseButton>
          </Box>
        </StyledCard>
      </Grid>
    ),
    [handlePurchase]
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

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderFilters()}

        {loading ? (
          <LoadingContainer>
            <CircularProgress />
          </LoadingContainer>
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
            {filteredData.length === 0 && (
              <Alert severity="info" icon={<AlertCircle />} sx={{ mt: 2 }}>
                No records match your current filters. Try adjusting your search
                criteria.
              </Alert>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

DataBrowser.propTypes = {
  onPurchase: PropTypes.func,
};

export default DataBrowser;
