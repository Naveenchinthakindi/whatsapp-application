const mongoose = require("mongoose");

//connecting the mongodb
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected successfully");
  } catch (error) {
    console.error("mongodb not connected successfully",error.message);
    process.exit(1)// if any error close the database
  }
};

module.exports = { connectDB };
