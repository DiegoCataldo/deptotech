const mongoose = require('mongoose');
const {Schema} = mongoose;


const  DeptoSchema = new Schema({

  torre_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  edificio_nombre: { type: String, required: true},
  torre_nombre: { type: String, required: true},
  depto: { type: String, required: true},
  piso: { type: Number, required: true},
  createdAt: {type: Date, default: Date.now}
},
{minimize: false})

module.exports = mongoose.model('Depto', DeptoSchema)