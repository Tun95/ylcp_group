module.exports = {
  port: process.env.PORT || 5000,
  db: {
    mongodb: {
      uri:
        process.env.MONGODB_URI || "mongodb://localhost:27017/your_database_name",
    },
  },
  env: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  logtail: {
    apikey: process.env.LOGTAIL_API_KEY || "your_logtail_api_key_here",
    endpoint: process.env.LOGTAIL_ENDPOINT || "your_logtail_endpoint_here",
  },

  providers: {
    email: {
      service: process.env.EMAIL_SERVICE || "gmail",
      username: process.env.EMAIL_USERNAME || "your_email@gmail.com",
      password: process.env.EMAIL_PASSWORD || "your_email_password",
    },
  },
  defaultProvider: {},
};
