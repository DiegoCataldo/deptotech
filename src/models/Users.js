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
  imageProfileUrl: { type: String, required: false},
  public_ImageId :{type: String, required: false},
  ranking :{type: Number , required: false},
  short_describe: {type: String, required: false},
  experience_describe: {type: String, required: false},
  answerRating:{type: Object, required: false},
  country_birth:{type: String, required: false},
  stripe_account_id: {type: String, required: false}


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