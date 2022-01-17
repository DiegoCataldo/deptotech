const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');


const  TransferSchema = new Schema({

  user_answer: { type: mongoose.Schema.Types.ObjectId, required: true},
  id_question: { type: mongoose.Schema.Types.ObjectId, required: true},
  id_answer: { type: mongoose.Schema.Types.ObjectId, required: true},
  wallet_address: {type: String, required: true},
  transaction_id: {type: String, required: false},
  reward_usd: { type: Number, required: true},
  reward_btc: { type: Number, required: false},
  requestedAt: {type: Date, default: Date.now},
  paid: {type: Boolean, default: false},
  paidAt:  {type: Date, required: false}
})

TransferSchema.plugin(aggregatePaginate );


module.exports = mongoose.model('WithdrawRequest', TransferSchema)