const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: [18, 'Must be at least 18 years old']
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'provider', 'researcher'],
    default: 'patient'
  },
  profileImageHash: {
    type: String,
    required: false
  },
  statistics: {
    totalUploads: {
      type: Number,
      default: 0
    },
    totalPurchases: {
      type: Number,
      default: 0
    },
    dataQualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage updatedAt
});

// Pre-save middleware to handle any necessary modifications
userSchema.pre('save', function(next) {
  // Convert email to lowercase before saving
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Convert wallet address to lowercase
  if (this.address) {
    this.address = this.address.toLowerCase();
  }

  next();
});

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remove sensitive/private information
  delete userObject.settings;
  delete userObject.__v;
  
  return userObject;
};

// Static method to find by wallet address
userSchema.statics.findByAddress = function(address) {
  return this.findOne({ address: address.toLowerCase() });
};

// Create indexes
userSchema.index({ address: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;