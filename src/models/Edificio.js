const mongoose = require('mongoose');
const {Schema} = mongoose;


const  EdificioSchema = new Schema({

  nombre: { type: String, required: true},
  direccion: { type: String, required: true},
  password_residentes: { type: String, required: true},
  password_administradores: { type: String, required: true},
  createdAt: {type: Date, default: Date.now}
},
{minimize: false})

module.exports = mongoose.model('Edificio', EdificioSchema)