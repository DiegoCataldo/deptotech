const express = require('express')
const router = express.Router(); //me permite crear rutas
const mongoose = require('mongoose');

const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/Users');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const axios = require('axios');
const uniqid = require('uniqid');
const http = require('https');
const request = require('request');





/// importar controlador paypal ///

const paypal_controller = require('../controller/paypal_controller');

const CLIENT = 'AY-Pud-9fb5-xD8hTzYsFqv0x_a0QTaQY9g5Th47pHqZrCAVIIzV259K5fQ4569xuuuVs2NffkgQJdEa';
const SECRET = 'EAQvsaI0ROF9fjFYLPmjahWkB-qwC0AKDSe3dcs-PR_fecDEowd-e-REJXxRQFpMJ6Wr-JI-YHWEXzCG';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Live https://api-m.paypal.com

const auth = { user: CLIENT, pass: SECRET }


/////////////////// [1] GENERAR PAGO BUSINESS ---> PERSONA ////////////////////

//// solicitud para realizar pago
router.get('/paypal/test', async (req, res) => {

  // paso 1 generar access token
  //clientid = username, secret = password
  let username = 'AeemLG4CKrCSxYOhQiK1FFZGMpVOXtCfvEmr8TkCJKFbSuH4G6dgZNjvYjLltETx1SeB4rx0UT8vTch6';
  let password = 'EGE66_Y6dFf_TNRqooZ0GxsK4KZ8JnbDSP6Mpw7xM_SIq55yY-lUptV-xi_rj9z1aDr6ywA_0pIcLfM9';

  (async () => {
    try {
      const { data: { access_token, token_type } } = await axios({

        url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
        method: 'post',
        Headers: {
          Accept: 'application/json',
          'Accept-Language': 'en_US',
          'content-type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: username,
          password: password,
        },
        params: {
          grant_type: 'client_credentials',
        },

      });

      /// devoler respuiesta de exito
      return res.redirect('/paypal-new-checkout/' + access_token + '&' + token_type);

    } catch (error) {
      console.log('error: ', error);
      return res.status(400).send({
        status: 'error',
        message: 'Error de paypal revisar logs'
      });
    }
  })();

});

const createPayout = (req, res) => {
  let access_token = req.params.access_token;
  let token_type = req.params.token_type;

  console.log(access_token);

  let modo = "EMAIL";
  let batch_code = uniqid(); // numero de factura unico


  console.log(modo);


  let email = 'sb-5hus47716300@personal.example.com';
  let monto_a_cobrar = '3.00';

  const authorization = 'Bearer ' + access_token;

  const body = {
    sender_batch_header:
    {
      email_subject: 'Pago realizado',
      sender_batch_id: 'batch-' + batch_code
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: { value: monto_a_cobrar, currency: 'USD' },
        receiver: email,
        note: 'Pago desde el backendo con node token working'
      }
    ]
  }

  request.post(`${PAYPAL_API}/v1/payments/payouts`, {
    auth,
    body,
    json: true
  }, (err, response) => {
    res.json({ data: response.body })
  })


}

/// este genera el pago desde la empresa a una persona /////
router.get('/paypal-new-checkout/:access_token&:token_type', createPayout)



////////////////// [2] GENERAR PAGO PERSONA ---> BUSSINESS /////////////////////////

const createPayment = async (req, res) => {

 
}

/// este genera el link para que se le envíe a una persona y pague hacia la empresa ///
router.get('/paypal/create-payment/:idQuestion', isAuthenticated, async (req, res) => {

  const idQuestion = mongoose.Types.ObjectId(req.params.idQuestion);

  ///// obtengo el id del usuario de la respuesta elegida como la mejor //////
  const question = await Question.findById(req.params.idQuestion).lean()
    .then(data => {
      return {
        _id: data._id,
        user_question: data.user_question,
        reward_offered: data.reward_offered
      }
    });
  
  const reward_offered = question.reward_offered;

  const body = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD', //https://developer.paypal.com/docs/api/reference/currency-codes/
        value: reward_offered
      },
      custom_id : question._id,
      id_question: question._id
    }],
    application_context: {
      brand_name: `Priceanswers.com`,
      landing_page: 'NO_PREFERENCE', // Default, para mas informacion https://developer.paypal.com/docs/api/orders/v2/#definition-order_application_context
      user_action: 'PAY_NOW', // Accion para que en paypal muestre el monto del pago
      return_url: `http://localhost:3000/paypal/execute-payment`, // Url despues de realizar el pago
      cancel_url: `http://localhost:3000/paypal/cancel-payment` // Url despues de realizar el pago
    }
  }
  //https://api-m.sandbox.paypal.com/v2/checkout/orders [POST]

  request.post(`${PAYPAL_API}/v2/checkout/orders`, {
    auth,
    body,
    json: true
  }, (err, response) => {
    const data = response.body;
    const links = data.links;
    const linkToPay = links.find(x=> x.rel === 'approve').href;
    if(linkToPay != null){
      res.redirect(linkToPay);
    }
    
  })
})


const executePayment = (req, res) => {
  
}

/// este router captura el dinero pagado desde una persona hacia una emrpesa
router.get('/paypal/execute-payment',  isAuthenticated, async (req, res) =>{
  const token = req.query.token; //<-----------

  request.post(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
    auth,
    body: {},
    json: true
  }, (err, response) => {
    
    res.redirect('/paypal/success-enable-answers')
    console.log(response.body);
    console.log(err);
  })
})

router.get('/paypal/success-enable-answers', (req, res) => {
  res.render('paypal/success-enable-answers');
});
/////////////////////////////////// [3] LOGEARSE PAYPAL ///////////////////////////

//////////// Pagina de explicación Paypal y botón para redirigirlo al login de paypal /////////
router.get('/paypal/addcustomer', isAuthenticated,  (req, res) => {
  res.render('paypal/new-customer');
});

////////////logearse en paypal  [PASO 1]   /////////
router.get('/paypal/login', (req, res) => {
  res.render('paypal/login');
});
/// logearse en paypal  [PASO 2] 
//Luego de logearse, paypal me envía un código de autorización y lo uso paraa enviarlo a paypal nuevamente ////
router.get('/paypal/return/', async (req, res) => {

  basicAuth = `${CLIENT}:${SECRET}`;
  let code64Encode = Buffer.from(basicAuth).toString('base64')
  
  try {
    const { data: {token_type , refresh_token} } = await axios({

      url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization':`Basic ${code64Encode}`
      },
      data: 
        `grant_type=authorization_code&code=${req.query.code}`
    });

    /// devoler respuiesta de exito
    return res.redirect('/paypal/refreshtoken/' + refresh_token + '&' + token_type);

  } catch (error) {
    console.log('error: ', error);
    return res.status(400).send({
      status: 'error',
      message: 'Error de paypal revisar logs'
    });
  }
});

/// logearse en paypal  [PASO 3]
//paypal me reenvía el refresh token
router.get('/paypal/refreshtoken/:refresh_token&:token_type', async (req, res) => {

  console.log(req.params);
  let clientSecret = CLIENT+':'+SECRET;
  basicAuth = `${CLIENT}:${SECRET}`;

  let code64Encode = Buffer.from(basicAuth).toString('base64')

  try {
    const { data: { access_token, token_type , refresh_token} } = await axios({

      url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization':`Basic ${code64Encode}`
      },
      data: 
        `grant_type=refresh_token&refresh_token=${req.params.refresh_token}`

    });

    /// devoler respuiesta de exito
    return res.redirect('/paypal/getaccountinfo/' + access_token);

  } catch (error) {
    console.log('error: ', error);
    return res.status(400).send({
      status: 'error',
      message: 'Error de paypal revisar logs'
    });
  }

});

/// logearse en paypal  [PASO 4]
//finalmente obtengo la indo del usuario
router.get('/paypal/getaccountinfo/:access_token', async (req, res) => {

  console.log(req.params);
  let clientSecret = CLIENT+':'+SECRET;
  basicAuth = `${CLIENT}:${SECRET}`;

  const access_token = req.params.access_token;

  try {
    const  { data: { verified_account, emails } }  = await axios({

      url: 'https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Authorization':`Bearer ${access_token}`
      } 
    });



    const emailPrimary = emails.find(x=> x.primary === true).value;
    let verified_account_string;
    if(verified_account){verified_account_string ="Y";}else{ verified_account_string ="N";}

    /// devoler respuiesta de exito
    return res.redirect('/paypal/updateaccount/' + verified_account_string+ '&' + emailPrimary);

  } catch (error) {
    console.log('error: ', error);
    return res.status(400).send({
      status: 'error',
      message: 'Error de paypal revisar logs'
    });
  }

});

////// REVISAR LOS ISAUTHENTICATED!!!
///// actualizar la el estado del la verificación del usario ////////////
router.get('/paypal/updateaccount/:verified_account&:email',isAuthenticated, async (req, res) => {

  const verified_account = req.params.verified_account;
  const email = req.params.email;
  const idUser = mongoose.Types.ObjectId(req.user.id);

  if(verified_account == "Y" || email == null){

    const filter = { _id: idUser};
    const update = { paypal_account_verified: true, paypal_email: email, paypal_date_verified: Date.now()  };
    const user = await User.findOneAndUpdate(filter, update, { new: true });
    res.render('paypal/login-success-verified', { email_paypal: email });

  }else{
    res.redirect('/paypal/login-not-verified');
  }
});

////////////Si es que intenta logearse y su account en paypal no está verificado envía este mensaje /////////
router.get('/paypal/login-not-verified', (req, res) => {
  res.render('paypal/login-not-verified');
});


 ///////////////////////  [4] WEBHOOKS ////////////
// webhook de PAYPAL, cada vez que se pague una pregunta llegará una solicitud de PAYPAL a esta url
router.post('/webhookpaypal', express.json({ type: 'application/json' }), (request, response) => {
  const event = request.body;
   console.log(JSON.stringify(event, null, 2));

  // Handle the event
  
  switch (event.event_type) {
    case 'CHECKOUT.ORDER.APPROVED':
      updatePaidQuestion(event);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
});


const updatePaidQuestion = async session => {
  const idQuestion = mongoose.Types.ObjectId(session.resource.purchase_units[0].custom_id);
  const update = { answers_enabled: true };
  const filter = { _id: idQuestion };

  await Question.findOneAndUpdate(filter, update, { new: true }).lean();
  console.log('se pago la pregunta');


}

module.exports = router;