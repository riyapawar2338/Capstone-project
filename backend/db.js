// config/db.js — MongoDB Connection
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 no longer needs useNewUrlParser / useUnifiedTopology
    });

    console.log(`\n✅  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦  Database: ${conn.connection.name}\n`);
  } catch (err) {
    console.error(`❌  MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// Graceful disconnect on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n🔌  MongoDB disconnected on app termination.');
  process.exit(0);
});

module.exports = connectDB;