const express = require('express');
const { set } = require('mongoose');
const path = require('path'); //permite unir directorios
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');  // es para guardar los datos de los usuarios en la sesión
const flash = require('connect-flash'); // para enviar mensajes por pantalla
const passport = require ('passport');
const multer = require('multer');
const bodyParser = require('body-parser');
const stripeacccount = require('./routes/stripeaccount');
if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}
//////////////////  Initiliazations  ////////////////////
const app = express();
require('./database');
require('./config/passport');


/////////////////// Settings  ////////////////////////////
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views')); //es para tener el path de la carpeta views
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  layoutsDir: path.join(app.get('views'), 'layouts'), //plantillas 
  partialsDir: path.join(app.get('views'), 'partials'),
  extname: '.hbs', // es para que sepa que ya no van a ser archivos html sino que hbs


}));
app.set('view engine', '.hbs'); // es para poder ejecutar y ocupar .hbs


//////////////////// Middlewares //////////////////////

app.use(express.urlencoded({ extended: false }))  // esto es para que cuando el formulario me envie los datos yo pueda entenderlo
//extended: false es porque solo aceptara texto y no imagenes por ejemplo
app.use(methodOverride('_method')); //es para que los formularios puedan enviar no solo post y get sino que tmabien put y delete
app.use(session({
  secret: 'mysecretapp', //es una clave secreta en este caso le puse 'mysecretapp'
  resave: true,
  saveUninitialized: true
}))
  // Images config
app.use(express.json());
const storage =multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename : (req, file, cb) => {
    cb(null, (new Date()).getTime() +  path.extname(file.originalname));
  }
})
app.use(multer({storage: storage}).single('imageProfile'));
  //  end images config//

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//////////////////   Global variables ////////////////////
app.use((req, res, next ) => { // esto es para que los mensajes  por pantalla se mantengan aunque cambien de vista
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null; // passport guarda la info del usuario en req.user si es que está logueado y aqui la guardo 
  if(res.locals.user != null){
  }
  res.locals.tagsAddedNewQuestion = req.flash('tagsAddedNewQuestion');
  

  next();
})

/////////////////   Routes   ///////////////////////
app.use(require('./routes/index'));
app.use(require('./routes/notes'));
app.use(require('./routes/users'));
app.use(require('./routes/questions'));
app.use(require('./routes/stripeaccount'));
app.use(require('./routes/paypal'));




//Static Files

app.use(express.static(path.join(__dirname, 'public')));

//Server is listening

const server = app.listen(app.get('port'), () => {
  console.log('Server on port', app.get('port'));
})


/// stripe webhook ///////

/* app.post('/webhookstripe', bodyParser.raw ({type: 'application/json'}), function(req, res) {
  stripeacccount.webhookstripe2
} )
 */

server.keepAliveTimeout = 65000
