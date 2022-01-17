const mongoose = require('mongoose');
const {Schema} = mongoose;


const  AnswerSchema = new Schema({

  answer: { type: String, required: true},
  user_question: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_answer: { type: mongoose.Schema.Types.ObjectId, required: true},
  id_question: { type: mongoose.Schema.Types.ObjectId, required: true},
  best_answer: {type: Boolean, required: true},
  get_paid: { type: Boolean, required: true},
  answerRating: {type: Object, required: true},
  rating_by: {type: Array,  default: []},
  createdAt: {type: Date, default: Date.now},
  withdrawal_requested: { type: Boolean, required: false},
},
{minimize: false})

module.exports = mongoose.model('Answer', AnswerSchema)