const mongoose = require('mongoose');

mongoose.connect(
  'mongodb+srv://riyapawar2338:2338@cluster0.t6kzdog.mongodb.net/aiias_db?retryWrites=true&w=majority&appName=Cluster0'
)
.then(() => {
  console.log('Connected');
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});