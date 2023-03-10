const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/Users');


passport.use(new LocalStrategy({
  usernameField: 'email'
},
  async (email, password, done) => {
    const user = await User.findOne({ email: email });
    if (!user) {
      return done(null, false , { message: 'Not User found.' });
    } else {
      const match = await user.matchPassword(password);
      if (match) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Incorrect Password' });
      }
    }
  }
));



// almacenamos el id del usuario en una variable de sesión
passport.serializeUser((user, done) =>{
  done(null, user.id);
});

// si queremos obtener el usuario con el id
passport.deserializeUser((id, done) =>{
  User.findById(id, (err, user) =>{
    done(err, user);
  } )
})