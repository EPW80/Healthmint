const mongoose = require('mongoose');
const hipaaConfig = require('./hipaaConfig');

class DatabaseError extends Error {
  constructor(message, code = "DB_ERROR") {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
  }
}

const validateConfig = () => {
  // Only check for MONGODB_URI since credentials are included in the URI
  const requiredEnvVars = [
    "MONGODB_URI",
    "ENCRYPTION_KEY"
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new DatabaseError(
      `Missing required environment variables: ${missingVars.join(", ")}`,
      "CONFIG_ERROR"
    );
  }
};

const getMongoOptions = () => ({
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 50,
  minPoolSize: 10,
  connectTimeoutMS: 30000,
  retryWrites: true,
  w: "majority",
  dbName: 'healthmint',  // Explicitly set database name
  ...(process.env.NODE_ENV === "production" ? {
    tls: true,
    tlsAllowInvalidCertificates: false
  } : {})
});

const setupMongooseMiddleware = () => {
  // Encrypt sensitive fields before saving
  mongoose.plugin((schema) => {
    schema.pre("save", async function(next) {
      try {
        const sensitiveFields = Object.keys(this.schema.paths)
          .filter(path => this.schema.paths[path].options.sensitive);

        for (const field of sensitiveFields) {
          if (this.isModified(field) && this[field]) {
            const encrypted = await hipaaConfig.encryption.encrypt(this[field]);
            this[field] = encrypted;
          }
        }
        next();
      } catch (error) {
        next(error);
      }
    });
  });

  // Log all operations in production
  if (process.env.NODE_ENV === "production") {
    mongoose.plugin((schema) => {
      ["save", "remove", "updateOne", "updateMany", "deleteOne", "deleteMany"]
        .forEach((method) => {
          schema.pre(method, async function(next) {
            try {
              await hipaaConfig.audit.logOperation({
                operation: method,
                collection: this.constructor.modelName,
                documentId: this._id,
                timestamp: new Date(),
                userId: this._user,
              });
              next();
            } catch (error) {
              next(error);
            }
          });
        });
    });
  }
};

const connectDB = async () => {
  try {
    // Validate environment configuration
    validateConfig();

    // Configure Mongoose
    mongoose.set("strictQuery", true);
    mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

    // Setup Mongoose middleware
    setupMongooseMiddleware();

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, getMongoOptions());
    console.log("✓ MongoDB connected successfully");

    // Test connection
    await mongoose.connection.db.admin().ping();
    console.log("✓ MongoDB connection verified");

    // Log connection details in development
    if (process.env.NODE_ENV !== "production") {
      console.log("MongoDB Connection Details:");
      console.log("- Database:", mongoose.connection.name);
      console.log("- Host:", mongoose.connection.host);
      console.log("- Port:", mongoose.connection.port);
    }

    // Setup connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      hipaaConfig.audit.logError?.({
        type: "database_error",
        error: err.message,
        timestamp: new Date(),
      });
    });

    mongoose.connection.on("disconnected", () => {
      console.error("MongoDB disconnected. Attempting to reconnect...");
      hipaaConfig.audit.logEvent?.({
        type: "database_disconnected",
        timestamp: new Date(),
      });
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected successfully");
      hipaaConfig.audit.logEvent?.({
        type: "database_reconnected",
        timestamp: new Date(),
      });
    });

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB Connection Error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    hipaaConfig.audit.logError?.({
      type: "database_connection_error",
      error: error.message,
      timestamp: new Date(),
    });

    throw new DatabaseError(
      `Failed to connect to database: ${error.message}`,
      "CONNECTION_ERROR"
    );
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("✓ MongoDB disconnected successfully");

    hipaaConfig.audit.logEvent?.({
      type: "database_shutdown",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
    throw new DatabaseError(
      `Failed to disconnect from database: ${error.message}`,
      "DISCONNECT_ERROR"
    );
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  DatabaseError,
};