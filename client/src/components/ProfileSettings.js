import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Container,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  Fade,
  LinearProgress,
  TextField,
  Button,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Grid,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Trash2, Camera } from "lucide-react";
import { 
  Save,
  Lock, 
  Bell, 
  UserCheck, 
  FileText, 
  Database, 
  Award,
  ChevronDown,
  Briefcase,
  Plus,
  Download
} from "lucide-react";
import { storageService } from "../services/storageService";
import { updateUserProfile } from "../redux/slices/userSlice";
import { selectRole } from "../redux/slices/roleSlice";
import { addNotification } from "../redux/slices/notificationSlice";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};

const GlassContainer = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: theme.spacing(4),
  width: "100%",
  margin: "0 auto 24px auto",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
}));

const LargeAvatar = styled(Avatar)(({ theme }) => ({
  width: 150,
  height: 150,
  border: "4px solid white",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  margin: "0 auto",
  position: "relative",
  cursor: "pointer",
  transition: "transform 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
  },
}));

const UploadButton = styled("input")({
  display: "none",
});

const StyledTab = styled(Tab)(({ theme }) => ({
  minWidth: 0,
  padding: "12px 16px",
  [theme.breakpoints.up('sm')]: {
    minWidth: 90,
  },
  textTransform: "none",
  fontWeight: 500,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  transition: "transform 0.2s ease-in-out, background-color 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.1)",
  },
  "&:focus": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "2px",
  },
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

const ProfileSettings = ({
  onImageUpload,
  onImageRemove,
  defaultImage = "/default-avatar.png",
  userName,
  onSave
}) => {
  const dispatch = useDispatch();
  const userProfile = useSelector((state) => state.user.profile);
  const userRole = useSelector(selectRole);
  const walletAddress = useSelector((state) => state.auth.account);

  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(userProfile?.profileImage || null);
  const [storageReference, setStorageReference] = useState(userProfile?.profileImageHash || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [tabValue, setTabValue] = useState(0);
  const [formState, setFormState] = useState({
    name: userProfile?.name || userName || "",
    email: userProfile?.email || "",
    age: userProfile?.age || "",
    bio: userProfile?.bio || "",
    sharingPreferences: userProfile?.sharingPreferences || {
      anonymousSharing: true,
      notifyOnAccess: true,
      allowDirectContact: false,
    },
    institution: userProfile?.institution || "",
    credentials: userProfile?.credentials || "",
    researchFocus: userProfile?.researchFocus || "",
    publications: userProfile?.publications || [],
  });
  const [newPublication, setNewPublication] = useState({ title: "", url: "" });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleFormChange = (event) => {
    const { name, value, checked } = event.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormState({
        ...formState,
        [parent]: {
          ...formState[parent],
          [child]: event.target.type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormState({
        ...formState,
        [name]: value
      });
    }
  };

  const handlePublicationChange = (e) => {
    setNewPublication({
      ...newPublication,
      [e.target.name]: e.target.value
    });
  };

  const addPublication = () => {
    if (newPublication.title && newPublication.url) {
      setFormState({
        ...formState,
        publications: [...formState.publications, {...newPublication, id: Date.now()}]
      });
      setNewPublication({ title: "", url: "" });
    }
  };

  const removePublication = (id) => {
    setFormState({
      ...formState,
      publications: formState.publications.filter(pub => pub.id !== id)
    });
  };

  const validateFile = useCallback((file) => {
    if (!file) {
      throw new Error("Please select a file");
    }

    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      throw new Error("Please upload a valid image file (JPG, PNG, or GIF)");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    return true;
  }, []);

  const uploadToStorage = useCallback(
    async (file) => {
      try {
        const result = await storageService.uploadProfileImage(file, {
          userId: formState.name || walletAddress || userName,
          contentType: file.type,
          onProgress: (progress) => {
            setUploadProgress(Math.round(progress));
          },
        });
        return result.reference;
      } catch (error) {
        console.error("Storage upload error:", error);
        throw new Error("Failed to upload image. Please try again.");
      }
    },
    [formState.name, walletAddress, userName]
  );

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      setError(null);
      setUploadProgress(0);

      try {
        validateFile(file);
        setLoading(true);

        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        const reference = await uploadToStorage(file);
        setStorageReference(reference);
        setProfileImage(file);

        onImageUpload?.(reference);
      } catch (error) {
        console.error("Error uploading image:", error);
        setError(error.message);
        setPreviewUrl(null);
      } finally {
        setLoading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [validateFile, uploadToStorage, onImageUpload]
  );

  const handleRemoveImage = useCallback(async () => {
    try {
      setLoading(true);
      if (storageReference) {
        await storageService.deleteProfileImage(storageReference);
      }
      setProfileImage(null);
      setPreviewUrl(null);
      setStorageReference(null);
      setError(null);
      setUploadProgress(0);
      
      onImageRemove?.();
    } catch (error) {
      console.error("Error removing image:", error);
      setError("Failed to remove image. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [storageReference, onImageRemove]);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      if (!formState.name) {
        throw new Error("Name is required");
      }
      
      if (formState.email && !/\S+@\S+\.\S+/.test(formState.email)) {
        throw new Error("Please enter a valid email address");
      }

      const updatedProfile = {
        ...userProfile,
        ...formState,
        profileImage: previewUrl,
        profileImageHash: storageReference,
        lastUpdated: new Date().toISOString()
      };

      dispatch(updateUserProfile(updatedProfile));
      
      dispatch(addNotification({
        type: "success",
        message: "Profile updated successfully"
      }));

      if (onSave) {
        onSave(updatedProfile);
      }
    } catch (error) {
      setError(error.message);
      dispatch(addNotification({
        type: "error",
        message: error.message
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{
          fontWeight: "bold",
          background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 4,
          mt: 2
        }}
      >
        Profile Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <GlassContainer elevation={3}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box sx={{ position: "relative", textAlign: "center" }}>
              <Tooltip title="Click to upload new image" arrow>
                <LargeAvatar
                  src={previewUrl || defaultImage}
                  alt={`${formState.name || userName || "User"}'s profile picture`}
                  imgProps={{
                    loading: "lazy",
                    onError: (e) => {
                      e.target.src = defaultImage;
                    },
                  }}
                />
              </Tooltip>

              <Fade in={loading}>
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    borderRadius: "50%",
                    m: "0 auto",
                    width: 150,
                    height: 150,
                  }}
                >
                  <CircularProgress color="primary" />
                </Box>
              </Fade>

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                <Tooltip title="Upload new image" arrow>
                  <label htmlFor="profile-image">
                    <UploadButton
                      accept={Object.entries(ALLOWED_FILE_TYPES)
                        .flatMap(([_, exts]) => exts)
                        .join(",")}
                      id="profile-image"
                      type="file"
                      onChange={handleImageUpload}
                      disabled={loading}
                    />
                    <ActionButton
                      component="span"
                      disabled={loading}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      <Camera size={20} />
                    </ActionButton>
                  </label>
                </Tooltip>

                {previewUrl && (
                  <Tooltip title="Remove image" arrow>
                    <ActionButton
                      onClick={handleRemoveImage}
                      disabled={loading}
                      sx={{
                        bgcolor: "error.main",
                        color: "white",
                        "&:hover": { bgcolor: "error.dark" },
                      }}
                    >
                      <Trash2 size={20} />
                    </ActionButton>
                  </Tooltip>
                )}
              </Box>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <Box sx={{ width: "100%", mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block", textAlign: "center" }}
                  >
                    Uploading: {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formState.name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Age"
                  name="age"
                  type="number"
                  value={formState.age}
                  onChange={handleFormChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Chip 
                    label={userRole === "patient" ? "Patient" : "Researcher"} 
                    color={userRole === "patient" ? "primary" : "secondary"}
                    sx={{ fontWeight: 'bold' }}
                    icon={userRole === "patient" ? <UserCheck size={16} /> : <Briefcase size={16} />}
                  />
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </GlassContainer>

      <GlassContainer elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="profile settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <StyledTab icon={<FileText size={18} />} iconPosition="start" label="Profile" />
            <StyledTab icon={<Database size={18} />} iconPosition="start" label="Data" />
            <StyledTab icon={<Lock size={18} />} iconPosition="start" label="Privacy" />
            <StyledTab icon={<Bell size={18} />} iconPosition="start" label="Notifications" />
            {userRole === "researcher" && (
              <StyledTab icon={<Award size={18} />} iconPosition="start" label="Credentials" />
            )}
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>Profile Details</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formState.bio}
                onChange={handleFormChange}
                multiline
                rows={4}
                placeholder={userRole === "patient" 
                  ? "Share a bit about yourself (this will not be shared with your health data)"
                  : "Describe your research background and interests"}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {userRole === "patient" 
                    ? "Patient ID" 
                    : "Researcher ID"}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {walletAddress}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {userRole === "patient" ? (
            <>
              <Typography variant="h6" gutterBottom>Data Management</Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                You have {userProfile?.totalUploads || 0} health records uploaded to Healthmint.
              </Alert>
              
              <Accordion>
                <AccordionSummary expandIcon={<ChevronDown />}>
                  <Typography>Data Usage Statistics</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="primary">
                          {userProfile?.totalUploads || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uploaded Records
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="primary">
                          {userProfile?.totalShared || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Shared Records
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="primary">
                          {userProfile?.accessRequests || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Access Requests
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="secondary">
                          {userProfile?.earnings || "0"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ETH Earned
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ChevronDown />}>
                  <Typography>Data Export Options</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Export all your health data in one of the following formats:
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<Download size={18} />}>
                      Export as JSON
                    </Button>
                    <Button variant="outlined" startIcon={<Download size={18} />}>
                      Export as CSV
                    </Button>
                    <Button variant="outlined" startIcon={<Download size={18} />}>
                      Export as PDF
                    </Button>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>Research Data</Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                You have accessed {userProfile?.datasetsAccessed || 0} datasets for research purposes.
              </Alert>
              
              <Accordion>
                <AccordionSummary expandIcon={<ChevronDown />}>
                  <Typography>Data Usage History</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="secondary">
                          {userProfile?.datasetsAccessed || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Datasets Accessed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="secondary">
                          {userProfile?.activeStudies || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Studies
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="secondary">
                          {userProfile?.pendingRequests || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pending Requests
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="error">
                          {userProfile?.totalSpent || "0"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ETH Spent
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ChevronDown />}>
                  <Typography>Research Ethics Statement</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    label="Research Ethics Statement"
                    name="ethicsStatement"
                    value={formState.ethicsStatement || ""}
                    onChange={handleFormChange}
                    multiline
                    rows={4}
                    placeholder="Describe your approach to research ethics and data protection..."
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.ethicsAgreement || false}
                        onChange={handleFormChange}
                        name="ethicsAgreement"
                      />
                    }
                    label="I agree to use all data in accordance with established research ethics guidelines"
                    sx={{ mt: 2 }}
                  />
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Privacy Settings</Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Data Sharing Preferences
            </Typography>
            
            {userRole === "patient" ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.sharingPreferences?.anonymousSharing || false}
                        onChange={handleFormChange}
                        name="sharingPreferences.anonymousSharing"
                      />
                    }
                    label="Allow anonymous data sharing for research"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.sharingPreferences?.notifyOnAccess || false}
                        onChange={handleFormChange}
                        name="sharingPreferences.notifyOnAccess"
                      />
                    }
                    label="Notify me when my data is accessed"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.sharingPreferences?.allowDirectContact || false}
                        onChange={handleFormChange}
                        name="sharingPreferences.allowDirectContact"
                      />
                    }
                    label="Allow researchers to contact me directly"
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.privacyPreferences?.publicProfile || false}
                        onChange={handleFormChange}
                        name="privacyPreferences.publicProfile"
                      />
                    }
                    label="Make my researcher profile public"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formState.privacyPreferences?.showInstitution || false}
                        onChange={handleFormChange}
                        name="privacyPreferences.showInstitution"
                      />
                    }
                    label="Display my institution publicly"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Account Security
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.notificationPreferences?.accessAlerts || false}
                    onChange={handleFormChange}
                    name="notificationPreferences.accessAlerts"
                  />
                }
                label={userRole === "patient" ? "Data access alerts" : "New dataset alerts"}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.notificationPreferences?.transactionAlerts || false}
                    onChange={handleFormChange}
                    name="notificationPreferences.transactionAlerts"
                  />
                }
                label="Transaction alerts"
              />
            </Grid>
            
            {userRole === "patient" ? (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formState.notificationPreferences?.researchUpdates || false}
                      onChange={handleFormChange}
                      name="notificationPreferences.researchUpdates"
                    />
                  }
                  label="Research updates using my data"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formState.notificationPreferences?.newDatasets || false}
                      onChange={handleFormChange}
                      name="notificationPreferences.newDatasets"
                    />
                  }
                  label="Notify me about new relevant datasets"
                />
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {userRole === "researcher" && (
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom>Professional Credentials</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Institution/Organization"
                  name="institution"
                  value={formState.institution}
                  onChange={handleFormChange}
                  placeholder="University, Research Institute, or Organization"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Credentials"
                  name="credentials"
                  value={formState.credentials}
                  onChange={handleFormChange}
                  placeholder="Ph.D., M.D., or other relevant qualifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Research Focus"
                  name="researchFocus"
                  value={formState.researchFocus}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                  placeholder="Describe your main research interests and expertise"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Publications
                </Typography>
                
                {formState.publications.map((pub) => (
                  <Box 
                    key={pub.id} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                  </Box>
                ))}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Publication Title"
                      name="title"
                      value={newPublication.title}
                      onChange={handlePublicationChange}
                      placeholder="Title of paper or article"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="URL"
                      name="url"
                      value={newPublication.url}
                      onChange={handlePublicationChange}
                      placeholder="Link to publication"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={addPublication}
                      startIcon={<Plus size={18} />}
                      disabled={!newPublication.title || !newPublication.url}
                      sx={{ height: '100%' }}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>
        )}
      </GlassContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 8 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save size={18} />}
          onClick={handleSaveProfile}
          disabled={loading}
          sx={{ px: 4, py: 1 }}
        >
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </Box>
    </Container>
  );
};

ProfileSettings.propTypes = {
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
  defaultImage: PropTypes.string,
  userName: PropTypes.string,
  onSave: PropTypes.func,
};

export default ProfileSettings;
