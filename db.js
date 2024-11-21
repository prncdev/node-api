const mongoose = require("mongoose");

const connectDB = async function(URL) {
  try {
    const { connection } = await mongoose.connect(URL);
    console.log(`Database connected at => ${connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

module.exports = connectDB;