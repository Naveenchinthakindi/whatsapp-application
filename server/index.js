const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

dotenv.config();

const PORT = process.env.PORT;
const app = express();
app.use(cors());

connectDB();

app.listen(PORT,()=>{
    console.log("Server running on PORT ",PORT)
})