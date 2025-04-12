// client/src/pages/resources/CollaborationNetwork.js
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Users,
  UserPlus,
  Globe,
  Mail,
  Search,
  MessageSquare,
  CheckCircle,
  X,
  Filter,
  Book,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { addNotification } from "../../redux/slices/notificationSlice";

const CollaborationNetwork = () => {
  const dispatch = useDispatch();

  // State for form inputs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formData, setFormData] = useState({
    researchInterests: "",
    institution: "",
    role: "",
    bio: "",
    publicProfile: true,
    contactPreference: "email",
  });

  // Sample research interests for filtering
  const researchInterests = [
    "Cardiology",
    "Oncology",
    "Neurology",
    "Immunology",
    "Genetics",
    "Epidemiology",
    "Mental Health",
    "Pediatrics",
    "Aging",
    "Chronic Disease",
    "Infectious Disease",
    "Rare Disorders",
    "Preventive Medicine",
    "Digital Health",
    "AI in Healthcare",
  ];

  // Sample researchers
  const researchers = [
    {
      id: "res1",
      name: "Dr. Sarah Chen",
      institution: "Stanford Medical Research",
      role: "Lead Researcher",
      interests: ["Cardiology", "Digital Health"],
      publications: 24,
      collaborations: 8,
      imageUrl: "/api/placeholder/100/100",
      memberSince: "2023",
    },
    {
      id: "res2",
      name: "Prof. Michael Johnson",
      institution: "Harvard Medical School",
      role: "Department Chair",
      interests: ["Genetics", "Oncology", "Rare Disorders"],
      publications: 78,
      collaborations: 15,
      imageUrl: "/api/placeholder/100/100",
      memberSince: "2022",
    },
    {
      id: "res3",
      name: "Dr. Amelia Rodriguez",
      institution: "Mayo Clinic Research",
      role: "Clinical Researcher",
      interests: ["Neurology", "Mental Health"],
      publications: 15,
      collaborations: 4,
      imageUrl: "/api/placeholder/100/100",
      memberSince: "2023",
    },
    {
      id: "res4",
      name: "Dr. Raj Patel",
      institution: "Johns Hopkins University",
      role: "Assistant Professor",
      interests: ["Immunology", "Infectious Disease"],
      publications: 32,
      collaborations: 11,
      imageUrl: "/api/placeholder/100/100",
      memberSince: "2022",
    },
    {
      id: "res5",
      name: "Dr. Emily Taylor",
      institution: "UCLA Medical Center",
      role: "Data Scientist",
      interests: ["AI in Healthcare", "Digital Health"],
      publications: 19,
      collaborations: 7,
      imageUrl: "/api/placeholder/100/100",
      memberSince: "2023",
    },
  ];

  // Sample upcoming events
  const upcomingEvents = [
    {
      id: "event1",
      title: "Health Data Symposium 2025",
      date: "May 15-17, 2025",
      type: "Conference",
      virtual: false,
      location: "Chicago, IL",
    },
    {
      id: "event2",
      title: "AI in Medical Research Workshop",
      date: "June 8, 2025",
      type: "Workshop",
      virtual: true,
      location: "Online",
    },
    {
      id: "event3",
      title: "Data Privacy in Healthcare Research",
      date: "April 22, 2025",
      type: "Webinar",
      virtual: true,
      location: "Online",
    },
  ];

  // Filter researchers based on search term and selected interests
  const filteredResearchers = researchers.filter((researcher) => {
    // Filter by search term
    if (
      searchTerm &&
      !researcher.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !researcher.institution.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Filter by selected interests
    if (selectedInterests.length > 0) {
      return researcher.interests.some((interest) =>
        selectedInterests.includes(interest)
      );
    }

    return true;
  });

  // Handle interest selection
  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // In a real app, this would send data to the server
    console.log("Form submitted:", formData);

    // Show success notification
    dispatch(
      addNotification({
        type: "success",
        message: "Your profile has been added to the network!",
        duration: 5000,
      })
    );

    // Close the form
    setShowJoinForm(false);
  };

  // Handle connect with researcher
  const handleConnect = (researcher) => {
    dispatch(
      addNotification({
        type: "success",
        message: `Connection request sent to ${researcher.name}`,
        duration: 3000,
      })
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">
        Healthmint Researcher Network
      </h1>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <Users className="text-blue-500 w-8 h-8 mr-3" />
          <h2 className="text-2xl font-semibold">
            Connect with Health Researchers
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          The Healthmint Researcher Network connects professionals working on
          similar health topics. Find potential collaborators, share insights,
          and accelerate your research through meaningful connections.
        </p>

        {!showJoinForm ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            <p className="text-gray-600">
              Join {researchers.length}+ researchers already in the network
            </p>
            <button
              onClick={() => setShowJoinForm(true)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <UserPlus size={18} className="mr-2" />
              Join the Network
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-6 mb-8 relative">
            <button
              onClick={() => setShowJoinForm(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              aria-label="Close form"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-medium mb-4 text-blue-800">
              Join the Researcher Network
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institution
                  </label>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Position
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Research Interests (comma-separated)
                </label>
                <input
                  type="text"
                  name="researchInterests"
                  value={formData.researchInterests}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  placeholder="e.g., Cardiology, Digital Health, Genetics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brief Bio/Research Focus
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                ></textarea>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="publicProfile"
                  name="publicProfile"
                  checked={formData.publicProfile}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label
                  htmlFor="publicProfile"
                  className="ml-2 text-sm text-gray-700"
                >
                  Make my profile visible to other researchers
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  name="contactPreference"
                  value={formData.contactPreference}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="email">Email</option>
                  <option value="platform">Platform Messages</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Submit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="ml-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-8">
          <h3 className="text-xl font-medium mb-4 text-blue-700">
            Find Researchers
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg py-2 px-3">
                <Filter size={18} className="text-gray-400 mr-2" />
                <span className="text-gray-700">
                  {selectedInterests.length === 0
                    ? "Filter by interest"
                    : `${selectedInterests.length} selected`}
                </span>
              </div>
            </div>
          </div>

          {/* Interest Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {researchInterests.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedInterests.includes(interest)
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredResearchers.length} of {researchers.length}{" "}
            researchers
          </p>
        </div>

        {/* Researchers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {filteredResearchers.map((researcher) => (
            <div
              key={researcher.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center mb-3">
                <img
                  src={researcher.imageUrl}
                  alt={`${researcher.name} profile`}
                  className="w-14 h-14 rounded-full mr-3 object-cover"
                />
                <div>
                  <h4 className="font-medium text-gray-800">
                    {researcher.name}
                  </h4>
                  <p className="text-gray-600 text-sm">{researcher.role}</p>
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-3">
                <strong>Institution:</strong> {researcher.institution}
              </p>

              <div className="mb-3">
                <p className="text-gray-500 text-sm mb-1">
                  <strong>Interests:</strong>
                </p>
                <div className="flex flex-wrap gap-1">
                  {researcher.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>
                  <Book size={14} className="inline mr-1" />
                  {researcher.publications} publications
                </span>
                <span>
                  <Users size={14} className="inline mr-1" />
                  {researcher.collaborations} collaborations
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleConnect(researcher)}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <UserPlus size={16} className="mr-1" />
                  Connect
                </button>
                <button className="flex-1 py-1.5 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 flex items-center justify-center">
                  <MessageSquare size={16} className="mr-1" />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Events Section */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-medium mb-4 text-blue-800 flex items-center">
            <Calendar className="w-6 h-6 mr-2" />
            Upcoming Network Events
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg p-4 border border-blue-100"
              >
                <h4 className="font-medium text-blue-900 mb-1">
                  {event.title}
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  {event.date} • {event.type}
                </p>
                <div className="flex items-center text-gray-500 text-sm mb-3">
                  <Globe size={14} className="mr-1" />
                  {event.virtual ? "Virtual Event" : event.location}
                </div>
                <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center">
                  Learn more
                  <ArrowRight size={14} className="ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Network Benefits */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-medium mb-5 text-blue-700">
            Benefits of Joining the Network
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-100 text-blue-600">
                  <Users size={24} />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Collaboration Opportunities
                </h4>
                <p className="mt-2 text-gray-600">
                  Connect with researchers across institutions who share your
                  interests and complement your expertise.
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-100 text-blue-600">
                  <Globe size={24} />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Expanded Dataset Access
                </h4>
                <p className="mt-2 text-gray-600">
                  Gain early access to new datasets and potential for
                  collaborative purchase of larger datasets.
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-100 text-blue-600">
                  <Mail size={24} />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Private Discussion Forums
                </h4>
                <p className="mt-2 text-gray-600">
                  Engage in specialized forums organized by research topic to
                  exchange ideas and methodologies.
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-100 text-blue-600">
                  <Calendar size={24} />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Exclusive Events
                </h4>
                <p className="mt-2 text-gray-600">
                  Access to member-only webinars, workshops, and networking
                  events related to health data research.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Guidelines Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-blue-800">
          Network Guidelines
        </h2>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            To maintain a productive, ethical, and supportive community, all
            network members are expected to adhere to the following guidelines:
          </p>

          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircle
                size={18}
                className="text-green-500 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">
                Respect patient privacy in all discussions about health data
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle
                size={18}
                className="text-green-500 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">
                Maintain professional courtesy in all communications with fellow
                researchers
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle
                size={18}
                className="text-green-500 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">
                Follow the ethical research guidelines when discussing or
                planning collaborative work
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle
                size={18}
                className="text-green-500 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">
                Acknowledge contributors appropriately in resulting publications
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle
                size={18}
                className="text-green-500 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">
                Share methodological insights while respecting intellectual
                property
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 p-5 rounded-lg">
          <h3 className="text-lg font-medium mb-3 text-gray-800">
            Questions or Support
          </h3>
          <p className="text-gray-600 mb-4">
            If you have questions about the researcher network or need
            assistance, please contact the network administration team.
          </p>
          <a
            href="mailto:research-network@healthmint.io"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Network Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default CollaborationNetwork;
