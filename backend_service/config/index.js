module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  webName: process.env.WEB_NAME || "YLCP",
  db: {
    mongodb: {
      uri:
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/your_database_name",
    },
  },
  env: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  logtail: {
    apikey: process.env.LOGTAIL_API_KEY || "BKxkmTNo4mkFDttGBwkpL7ie",
    endpoint:
      process.env.LOGTAIL_ENDPOINT ||
      "https://s1221069.eu-nbg-2.betterstackdata.com",
  },

  providers: {
    ai: {
      elevenLabsApiKey:
        process.env.ELEVEN_LABS_API_KEY || "your_eleven_labs_api_key",
      openAiApiKey: process.env.OPENAI_API_KEY || "your_openai_api_key",
    },

    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || "your_project_id",
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || "your_bucket.appspot.com",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "your_client_email",
      privateKey: process.env.FIREBASE_PRIVATE_KEY || "your_private_key",
    },

    email: {
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE || false,
      username: process.env.EMAIL_USERNAME || "your_email@gmail.com",
      password: process.env.EMAIL_PASSWORD || "your_email_password",
    },
  },
  defaultProvider: {},
};
