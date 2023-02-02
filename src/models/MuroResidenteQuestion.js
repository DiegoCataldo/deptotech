const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');

const  MuroResidenteSchema = new Schema({
  title: { type: String, required: true},
  description: { type: String, required: true},
  tipo_publicacion:{ type: String, required: true},
  createdAt: {type: Date, default: Date.now},
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_nombre: { type: String, required: true},
  allanswerinfo: {type: Object , required: false},
  user_edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_edificio_nombre: { type: String, required: true},
  user_torre_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_torre_nombre: { type: String, required: true},
  user_depto_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_depto_nombre: { type: String, required: true},
  estado: { type: String, required: true},
  respondida_por_admin:{ type: String, required: true}

})

MuroResidenteSchema.plugin(aggregatePaginate);


module.exports = mongoose.model('MuroResidenteQuestion', MuroResidenteSchema)