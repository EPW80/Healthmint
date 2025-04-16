import mongoose from "mongoose";
import hipaaConfig from "./hipaaConfig.js";

/**
 * Custom error class for database-related errors
 */
class DatabaseError extends Error {
  constructor(message, code = "DB_ERROR") {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validates required environment variables for database connection
 * @throws {DatabaseError} If required variables are missing
 */
const validateConfig = (options = {}) => {
  // Check for required environment variables or provided options
  const requiredVars = ["MONGODB_URI", "ENCRYPTION_KEY"];

  const missingVars = requiredVars.filter(
    (varName) => !(process.env[varName] || options[varName.toLowerCase()])
  );

  if (missingVars.length > 0) {
    throw new DatabaseError(
      `Missing required configuration: ${missingVars.join(", ")}`,
      "CONFIG_ERROR"
    );
  }
};

/**
 * Gets MongoDB connection options based on environment
 * @param {Object} customOptions - Optional overrides for connection options
 * @returns {Object} MongoDB connection options
 */
const getMongoOptions = (customOptions = {}) => ({
  serverSelectionTimeoutMS: customOptions.serverSelectionTimeout || 5000,
  maxPoolSize: customOptions.maxPoolSize || 50,
  minPoolSize: customOptions.minPoolSize || 10,
  connectTimeoutMS: customOptions.connectTimeout || 30000,
  retryWrites: customOptions.retryWrites !== false,
  w: customOptions.writeConcern || "majority",
  dbName: customOptions.dbName || "healthmint",
  // Enhanced TLS options for production
  ...(process.env.NODE_ENV === "production"
    ? {
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsCAFile: process.env.MONGODB_CA_FILE || undefined,
      }
    : {}),
  ...customOptions, // Allow any other custom options to override defaults
});

/**
 * Sets up Mongoose middleware for encryption and auditing
 */
const setupMongooseMiddleware = () => {
  // Encrypt sensitive fields before saving
  mongoose.plugin((schema) => {
    schema.pre("save", async function (next) {
      try {
        const sensitiveFields = Object.keys(this.schema.paths).filter(
          (path) => this.schema.paths[path].options.sensitive
        );

        for (const field of sensitiveFields) {
          if (this.isModified(field) && this[field]) {
            const encrypted = await hipaaConfig.encryption.encrypt(this[field]);
            this[field] = encrypted;
          }
        }
        next();
      } catch (error) {
        console.error("Encryption middleware error:", error);
        next(error);
      }
    });
  });

  // Log all operations in production
  if (process.env.NODE_ENV === "production") {
    mongoose.plugin((schema) => {
      [
        "save",
        "remove",
        "updateOne",
        "updateMany",
        "deleteOne",
        "deleteMany",
      ].forEach((method) => {
        schema.pre(method, async function (next) {
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
            console.error("Audit logging middleware error:", error);
            next(error);
          }
        });
      });
    });
  }
};

/**
 * Connect to MongoDB with retry logic
 * @param {Object} options - Custom connection options
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 * @throws {DatabaseError} If connection fails after retries
 */
const connectDB = async (options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const retryDelayMs = options.retryDelayMs || 5000;
  const connectionUri = options.uri || process.env.MONGODB_URI;

  let lastError = null;
  let retryCount = 0;

  try {
    // Validate environment configuration
    validateConfig(options);

    // Configure Mongoose
    mongoose.set("strictQuery", true);
    mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

    // Setup Mongoose middleware
    setupMongooseMiddleware();

    // Attempt connection with retries
    while (retryCount < maxRetries) {
      try {
        console.log(
          `Connecting to MongoDB${retryCount > 0 ? ` (attempt ${retryCount + 1}/${maxRetries})` : ""}...`
        );
        await mongoose.connect(
          connectionUri,
          getMongoOptions(options.mongoOptions || {})
        );
        console.log("✓ MongoDB connected successfully");

        // Test connection
        await mongoose.connection.db.admin().ping();
        console.log("✓ MongoDB connection verified");

        // Connection successful, break retry loop
        break;
      } catch (error) {
        lastError = error;
        retryCount++;

        if (retryCount >= maxRetries) {
          throw error; // Rethrow after max retries
        }

        console.log(
          `Connection attempt failed. Retrying in ${retryDelayMs / 1000} seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

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

    // Add process handlers for graceful shutdown
    setupShutdownHandlers();

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

/**
 * Set up process event handlers for graceful shutdown
 */
const setupShutdownHandlers = () => {
  // Only add handlers once
  if (!process.shutdownHandlersAdded) {
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await disconnectDB();
        console.log("Graceful shutdown completed");
        process.exit(0);
      } catch (err) {
        console.error("Error during graceful shutdown:", err);
        process.exit(1);
      }
    };

    // Handle application termination signals
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    process.shutdownHandlersAdded = true;
  }
};

/**
 * Disconnect from MongoDB
 * @param {Object} options - Disconnect options
 * @returns {Promise<void>}
 * @throws {DatabaseError} If disconnection fails
 */
const disconnectDB = async (options = {}) => {
  const timeoutMs = options.timeoutMs || 10000;

  try {
    // Set a timeout to force disconnect if it takes too long
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Disconnect timed out"));
      }, timeoutMs);
    });

    // Race the actual disconnect with the timeout
    await Promise.race([mongoose.disconnect(), timeoutPromise]);

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

export { connectDB, disconnectDB, DatabaseError };
