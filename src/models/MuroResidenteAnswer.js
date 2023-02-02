const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');


const  AnswerSchema = new Schema({

  answer: { type: String, required: true},
  user_question_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_question_nombre: { type: String, required: true},
  user_answer_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_answer_nombre: { type: String, required: true},
  id_question: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_es_admin: {type: Boolean, required: true},
  user_edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_edificio_nombre: { type: String, required: true},
  user_torre_id: { type: mongoose.Schema.Types.ObjectId, required: false},
  user_torre_nombre: { type: String, required: false},
  user_depto_id: { type: mongoose.Schema.Types.ObjectId, required: false},
  user_depto_nombre: { type: String, required: false},
  createdAt: {type: Date, default: Date.now}
},
{minimize: false})

AnswerSchema.plugin(aggregatePaginate);


module.exports = mongoose.model('MuroResidenteAnswer', AnswerSchema)