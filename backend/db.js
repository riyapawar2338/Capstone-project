const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4
    });

    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}\n`);
  } catch (err) {
    console.error('\n❌ MongoDB connection error FULL:\n', err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB disconnected on app termination.');
  } finally {
    process.exit(0);
  }
});

module.exports = connectDB;