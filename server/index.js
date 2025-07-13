const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const bodyParser = require('body-parser');
const authRoutes = require("./routes/authRoute");

// Load environment variables from .env file
dotenv.config();

// Define the application port from environment variables
const PORT = process.env.PORT;

// Initialize the Express application
const app = express();

// Middleware setup
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(cookieParser()); // Parses cookies from incoming requests
app.use(bodyParser.urlencoded({ extended: true })); // Parses URL-encoded bodies (e.g., from forms)
app.use(cors()); // Enables Cross-Origin Resource Sharing

// Connect to the database
connectDB();

// Define routes for authentication-related endpoints
app.use("/api/auth", authRoutes);

// Start the server and listen on the defined port
app.listen(PORT, () => {
    console.log("Server running on PORT", PORT);
});
