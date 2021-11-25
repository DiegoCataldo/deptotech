const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');


const  TransferSchema = new Schema({
  fee_paypal_import: { type: Number, required: true},
  fee_paypal_export: { type: Number, required: true},
  total_utility: { type: Number, required: true},
  current_utility: { type: Number, required: true},
  total_taken_utility: { type: Number, required: true},
  current_taken_utility: { type: Number, required: true},
  reward_fee_debt: { type: Number, required: true},
  description: { type: String, required: true},
  createdAt: {type: Date, default: Date.now}
})

TransferSchema.plugin(aggregatePaginate );


module.exports = mongoose.model('Transfer', TransferSchema)