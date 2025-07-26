const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const bodyParser = require('body-parser');
const authRoutes = require("./routes/authRoute");
const chatRoutes = require("./routes/chatRoute");
const statusRoutes = require("./routes/statusRoute");
const http = require('http');
const initializeSocket =  require("./services/soketService");

// Load environment variables from .env file
dotenv.config();

// Define the application port from environment variables
const PORT = process.env.PORT;

// Initialize the Express application
const app = express();

const corsOption = {
    origin : process.env.FRONTEND_URL || "http://localhost:5173/",
    credentials: true
}

app.use(cors(corsOption));

// Middleware setup
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(cookieParser()); // Parses cookies from incoming requests
app.use(bodyParser.urlencoded({ extended: true })); // Parses URL-encoded bodies (e.g., from forms)

// Connect to the database
connectDB();


//create server
const server = http.createServer(app);

const io = initializeSocket(server)

//apply socket middleware before route
app.use((req, res, next)=>{
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next()
})


// Define routes for authentication-related endpoints
app.use("/api/auth", authRoutes);
app.use("/api/chat",chatRoutes);
app.use("/api/status",statusRoutes);

// Start the server and listen on the defined port
server.listen(PORT, () => {
    console.log("Server running on PORT", PORT);
});
