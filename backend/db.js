/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   db.js — FIXED VERSION
   ================================================================ */
'use strict';

const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS:         10000,
      socketTimeoutMS:          45000,
      family:                   4       /* Force IPv4 */
    });

    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}\n`);
  } catch (err) {
    console.error('\n❌ MongoDB connection failed:\n', err.message);
    process.exit(1);
  }
};

/* Reconnect on lost connection */
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect…');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected.');
});

/* Graceful shutdown */
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed on app termination.');
  } finally {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  try {
    await mongoose.connection.close();
  } finally {
    process.exit(0);
  }
});

module.exports = connectDB;