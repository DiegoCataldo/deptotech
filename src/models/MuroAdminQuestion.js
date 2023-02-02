const mongoose = require('mongoose');
const {Schema} = mongoose;
const aggregatePaginate  = require('mongoose-aggregate-paginate-v2');

const  MuroAdminSchema = new Schema({
  title: { type: String, required: true},
  description: { type: String, required: true},
  createdAt: {type: Date, default: Date.now},
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_nombre: { type: String, required: true},
  allanswerinfo: {type: Object , required: false},
  user_edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  user_edificio_nombre: { type: String, required: true},
  
})

MuroAdminSchema.plugin(aggregatePaginate);


module.exports = mongoose.model('MuroAdminQuestion', MuroAdminSchema)