const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');

const  EncuestaQuestion = new Schema({
  title: { type: String, required: true},
  description: { type: String, required: false},
  createdAt: {type: Date, default: Date.now},
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_nombre: { type: String, required: true},
  user_edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_edificio_nombre: { type: String, required: true},
  user_torre_id: { type: mongoose.Schema.Types.ObjectId, required: false},
  user_torre_nombre: { type: String, required: false},
  user_depto_id: { type: mongoose.Schema.Types.ObjectId, required: false},
  user_depto_nombre: { type: String, required: false},
  user_es_admin: {type: Boolean, required: true},
  opciones: {type: Array,  default: []},

})

EncuestaQuestion.plugin(aggregatePaginate);


module.exports = mongoose.model('EncuestaQuestion', EncuestaQuestion)