const mongoose = require('mongoose');

const user = process.env.MONGODB_user;
const password = process.env.MONGODB_password;
const database = process.env.MONGODB_database;
const uri = `mongodb+srv://${user}:${password}@procomunnity.o0kce.mongodb.net/${database}?retryWrites=true&w=majority`;


mongoose.connect(uri,
  { useNewUrlParser: true, useUnifiedTopology: true
  })
  .then (() => console.log('Base de datos conectada'))
  .catch(e =>console.log(e));