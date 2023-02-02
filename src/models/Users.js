const mongoose = require('mongoose');
const {Schema} = mongoose;
const bcrypt = require('bcryptjs');

const UserSchema  = new Schema({
  name:{ type: String, required: true},
  email: { type: String, required: true, unique:true, lowercase:true},
  emailToken: {type: String, required: false},
  isVerified: {type: Boolean, required: false},
  password:{ type: String, required: true},
  createdAt: {type: Date, default: Date.now},
  administrador: {type: Boolean, required: true},
  residente: {type: Boolean, required: true},
  superadmin: {type: Boolean, required: false},
  id_edificio_administrando: {type: [String], required: true},
  id_depto_residente: {type: [String], required: true}
})

// metodo para cifrar contraseña
UserSchema.methods.encryptPassword =  async function(password) {
 const salt = await bcrypt.genSalt(10);
 const hash = bcrypt.hash(password, salt);
 return hash;
};

UserSchema.methods.matchPassword = async function (password){
  return await bcrypt.compare(password, this.password);
} 

module.exports = mongoose.model('User', UserSchema);