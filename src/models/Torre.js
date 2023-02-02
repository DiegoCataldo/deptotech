const mongoose = require('mongoose');
const {Schema} = mongoose;


const  TorreSchema = new Schema({

  edificio_id: { type: mongoose.Schema.Types.ObjectId, required: true},
  nombre: { type: String, required: true},
  createdAt: {type: Date, default: Date.now}
},
{minimize: false})

module.exports = mongoose.model('Torre', TorreSchema)