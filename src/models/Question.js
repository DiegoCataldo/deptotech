const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');


const  QuestionSchema = new Schema({
  title: { type: String, required: true},
  description: { type: String, required: true},
  createdAt: {type: Date, default: Date.now},
  tags: {type: [String], required: true},
  reward_offered: {type: Number, required: true},
  user_question: { type: mongoose.Schema.Types.ObjectId, required: true},
  allanswerinfo: {type: Object , required: false},
  answers_enabled: {type: Boolean, required: true},
  best_answer_chosen: { type: Boolean, required: true},
  best_answer_id: { type: mongoose.Schema.Types.ObjectId, required: false},
  paid_to: { type: String, required: false}
})

QuestionSchema.plugin(aggregatePaginate );


module.exports = mongoose.model('Question', QuestionSchema)