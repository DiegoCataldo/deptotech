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
const path = require('path');
const Promise = require('bluebird');
var hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');






/// importar controlador paypal ///

const paypal_controller = require('../controller/paypal_controller');

const CLIENT = 'AUx5l4m-ir1TrT67uRBJhx-ewfG4r1PyTmE-XorhU8jJHk2TIw7lMvlOwCBmQWsjBQoI7Jpv0cns5Q_M';
const SECRET = 'EA1DtIieQSy9jf8FxVHTQywSoIOfZY0jpTGcjlAjiVPmnntP3W-ROooBEdGtYtxJPjGEFJGPhR0g8CeP';
const PAYPAL_API = 'https://api-m.paypal.com'; // Live https://api-m.paypal.com  // test https://api-m.sandbox.paypal.com

const auth = { user: CLIENT, pass: SECRET }


/////////////////// [1] GENERAR PAGO BUSINESS ---> PERSONA ////////////////////

//// solicitud para realizar pago
router.get('/paypal/payanswer/:id_answer', async (req, res) => {

  // paso 1 generar access token
  //clientid = username, secret = password

  const id_answer = req.params.id_answer;

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
          username: CLIENT,
          password: SECRET,
        },
        params: {
          grant_type: 'client_credentials',
        },

      });

      /// devoler respuiesta de exito
      return res.redirect('/paypal-new-checkout/' + access_token + '&' + token_type + '&' + id_answer);

    } catch (error) {
      console.log('error: ', error);
      return res.status(400).send({
        status: 'error',
        message: 'Error de paypal revisar logs'
      });
    }
  })();

});

/// este genera el pago desde la empresa a una persona /////
router.get('/paypal-new-checkout/:access_token&:token_type&:id_answer', async (req, res) => {

  const idanswer = mongoose.Types.ObjectId(req.params.id_answer);

  ///// obtengo el id del usuario y el id de la pregutna de la respuesta elegida como la mejor //////
  const answer = await Answer.findById(req.params.id_answer).lean()
    .then(data => {
      return {
        _id: data._id,
        user_question: data.user_question,
        user_answer: data.user_answer,
        id_question: data.id_question
      }
    });

  const id_question = answer.id_question;
  /////// obtengo los datos de la pregunta ///////
  const question = await Question.findById(id_question).lean()
    .then(data => {
      return {
        _id: data._id,
        reward_offered: data.reward_offered
      }
    });
  const reward_offered = question.reward_offered;


  /////// obtengo los datos del usuario elegido como la mejor respuesta (paypal_email)  ///////
  const user_answer = await User.findById(answer.user_answer).lean()
    .then(data => {
      return {
        _id: data._id,
        paypal_email: data.paypal_email,
        email: data.email
      }
    });
    const email_user_priceanswers = user_answer.email;
  const paypal_email = user_answer.paypal_email;

  const update = { best_answer: true }
  const filter = { _id: idanswer };
  /// modifico la respuesta como la mejor //
  var questionID, filterQuestion, updateAnswerChosen;

  await Answer.findOneAndUpdate(filter, update, { new: true }).lean().then(answerVar => {

    /// obtengo los datos dela pregunta ///
    questionID = answerVar.id_question;
    filterQuestion = { _id: questionID };
    updateAnswerChosen = { best_answer_chosen: true, paid_to: paypal_email };
  });
  //// modifico la pregunta  como la mejor respuesta ///
  await Question.findOneAndUpdate(filterQuestion, updateAnswerChosen);

  ////// comienzo  con la transferencia /////

  const datenow = datefns.formatRelative(Date.now(), new Date());


  var total_paid = reward_offered;
  total_paid = Number.parseFloat(total_paid).toFixed(2);

  let access_token = req.params.access_token;
  let token_type = req.params.token_type;

  let modo = "EMAIL";
  let batch_code = uniqid(); // numero de factura unico

  let email = paypal_email;
  let monto_a_cobrar = total_paid;

  const authorization = 'Bearer ' + access_token;

  const body = {
    sender_batch_header:
    {
      email_subject: 'Payment made',
      sender_batch_id: 'batch-' + batch_code
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: { value: monto_a_cobrar, currency: 'USD' },
        receiver: email,
        note: 'Priceanswers.com payment for being chosen the best answer.'
      }
    ]
  }

  return new Promise(function (resolve, reject) {
    request.post(`${PAYPAL_API}/v1/payments/payouts`, {
      auth,
      body,
      json: true
    }, async (err, res, body) => {

      /// envío correo de invoice al user_answer ///

      const firstPartEmailUser = email_user_priceanswers.split('@')[0];

      // Generate test SMTP service account from ethereal.email
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        host: process.env.SMTP_NODEMAILER_HOST,
        port: process.env.SMTP_NODEMAILER_PORT,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_NODEMAILER_USER, // generated ethereal user
          pass: process.env.SMTP_NODEMAILER_PASS, // generated ethereal password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      var options = {
        viewEngine: {
          extname: '.hbs', // handlebars extension
          layoutsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'), // location of handlebars templates
          defaultLayout: 'html', // name of main template
          partialsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'), // location of your subtemplates aka. header, footer etc
        },
        viewPath: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'),
        extName: '.hbs'
      };

      transporter.use('compile', hbs(options));

      console.log('2');
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: 'contact@priceanswers.com', // sender address
        to: email_user_priceanswers, // list of receivers
        subject: "Invoice Priceanswers", // Subject line
        template: 'html',
        context: {
          name: firstPartEmailUser,
          datenow: datenow,
          idQuestion: questionID.toString(),
          reward_offered : reward_offered

        }
      }).catch(console.error);
      console.log('2');

      if (err) { reject(err); } else { resolve(body); }
    });

    req.flash('success_msg', 'Thank you for choosing the best answer.');
    res.redirect('/questions/seeownquestion/' + questionID);
  })

})


  ////////////////// [2] GENERAR PAGO PERSONA ---> BUSSINESS /////////////////////////

  /// este genera el link para que se le envíe a una persona y pague hacia la empresa ///
  router.get('/paypal/create-payment/:idQuestion', isAuthenticated, async (req, res) => {

    const idQuestion = mongoose.Types.ObjectId(req.params.idQuestion);

    ///// obtengo el id del usuario de la respuesta elegida como la mejor //////
    const question = await Question.findById(req.params.idQuestion).lean()
      .then(data => {
        return {
          _id: data._id,
          user_question: data.user_question,
          total_price_question: data.total_price_question
        }
      });

    const total_price_question = question.total_price_question;

    const body = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD', //https://developer.paypal.com/docs/api/reference/currency-codes/
          value: total_price_question
        },
        custom_id: question._id,
        id_question: question._id
      }],
      application_context: {
        brand_name: `Priceanswers.com`,
        landing_page: 'NO_PREFERENCE', // Default, para mas informacion https://developer.paypal.com/docs/api/orders/v2/#definition-order_application_context
        user_action: 'PAY_NOW', // Accion para que en paypal muestre el monto del pago
        return_url: `https://www.priceanswers.com/paypal/execute-payment`, // Url despues de realizar el pago
        cancel_url: `https://www.priceanswers.com` // Url despues de realizar el pago
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
      const linkToPay = links.find(x => x.rel === 'approve').href;
      if (linkToPay != null) {
        res.redirect(linkToPay);
      }

    })
  })

  /// este router captura el dinero pagado desde una persona hacia una emrpesa
  router.get('/paypal/execute-payment', async (req, res) => {
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

  router.get('/paypal/cancel-payment', (req, res) => {
    res.render('paypal/cancel-payment');
  });

  router.get('/paypal/success-enable-answers', (req, res) => {
    res.render('paypal/success-enable-answers');
  });
  /////////////////////////////////// [3] LOGEARSE PAYPAL ///////////////////////////

  //////////// Pagina de explicación Paypal y botón para redirigirlo al login de paypal /////////
  router.get('/paypal/addcustomer', isAuthenticated, (req, res) => {
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
      const { data: { token_type, refresh_token } } = await axios({

        url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en_US',
          'content-type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${code64Encode}`
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
    let clientSecret = CLIENT + ':' + SECRET;
    basicAuth = `${CLIENT}:${SECRET}`;

    let code64Encode = Buffer.from(basicAuth).toString('base64')

    try {
      const { data: { access_token, token_type, refresh_token } } = await axios({

        url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en_US',
          'content-type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${code64Encode}`
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
    let clientSecret = CLIENT + ':' + SECRET;
    basicAuth = `${CLIENT}:${SECRET}`;

    const access_token = req.params.access_token;

    try {
      const { data: { verified_account, emails } } = await axios({

        url: 'https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en_US',
          'Authorization': `Bearer ${access_token}`
        }
      });



      const emailPrimary = emails.find(x => x.primary === true).value;
      let verified_account_string;
      if (verified_account) { verified_account_string = "Y"; } else { verified_account_string = "N"; }

      /// devoler respuiesta de exito
      return res.redirect('/paypal/updateaccount/' + verified_account_string + '&' + emailPrimary);

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
  router.get('/paypal/updateaccount/:verified_account&:email', isAuthenticated, async (req, res) => {

    const verified_account = req.params.verified_account;
    const email = req.params.email;
    const idUser = mongoose.Types.ObjectId(req.user.id);

    if (verified_account == "Y" || email == null) {

      const filter = { _id: idUser };
      const update = { paypal_account_verified: true, paypal_email: email, paypal_date_verified: Date.now() };
      const user = await User.findOneAndUpdate(filter, update, { new: true });
      res.render('paypal/login-success-verified', { email_paypal: email });

    } else {
      res.redirect('/paypal/login-not-verified');
    }
  });

  ////////////Si es que intenta logearse y su account en paypal no está verificado envía este mensaje /////////
  router.get('/paypal/login-not-verified', (req, res) => {
    res.render('paypal/login-not-verified');
  });


  ///////////////////////  [4] WEBHOOKS ////////////
  // webhook de PAYPAL, cada vez que se pague una pregunta llegará una solicitud de PAYPAL a esta url
  router.post('/webhookpaypal', express.json({ type: 'application/json' }), async (request, response) => {
    const event = request.body;
    

    // Handle the event

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await updatePaidQuestion(event);
        response.sendStatus(200);
        break;

      case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
        response.sendStatus(200);
        break;

        case 'PAYMENT.PAYOUTSBATCH.PROCESSING':
        response.sendStatus(200);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        response.sendStatus(200);
    }
  });


  const updatePaidQuestion = async session => {
    const idQuestion = mongoose.Types.ObjectId(session.resource.purchase_units[0].custom_id);
    const idquestionString = session.resource.purchase_units[0].custom_id;
    const update = { answers_enabled: true };
    const filter = { _id: idQuestion };

    let user_question_id, reward_offered, total_price_question;
    // modifico la pregunta dejandola habilitada el enable_answers y ademas tomo el id del usuario y lo guardo
    await Question.findOneAndUpdate(filter, update, { new: true }).lean().then(answerVar => {
      user_question_id = answerVar.user_question;
      reward_offered = answerVar.reward_offered;
      total_price_question = answerVar.total_price_question;


    })
    //prosigo a obtener la info para enviarle un correo con el invoice de lo pagado //
    ///// obtengo la info del usuario, en este caso el email  //////
    const user = await User.findById(user_question_id).lean()
      .then(data => {
        return {
          email: data.email,
        }
      });
    const emailUser = user.email;

    console.log(emailUser);

    const firstPartEmailUser = emailUser.split('@')[0];

    // Generate test SMTP service account from ethereal.email
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_NODEMAILER_HOST,
      port: process.env.SMTP_NODEMAILER_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_NODEMAILER_USER, // generated ethereal user
        pass: process.env.SMTP_NODEMAILER_PASS, // generated ethereal password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    var options = {
      viewEngine: {
        extname: '.hbs', // handlebars extension
        layoutsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidquestion'), // location of handlebars templates
        defaultLayout: 'html', // name of main template
        partialsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidquestion'), // location of your subtemplates aka. header, footer etc
      },
      viewPath: path.join(__dirname, '../views/emailtemplates/invoicepaidquestion'),
      extName: '.hbs'
    };

    transporter.use('compile', hbs(options));

    const datenow = datefns.formatRelative(Date.now(), new Date());

        //paso 1 obtener pago total (lo saco de la formula --> reward = x - x*0.054 -3 -x*0.05)
        var reward_float = parseFloat(reward_offered);
        var total_pay = (reward_float+parseFloat(0.3))/0.846;

    var total_priceanswers_fee = total_pay * 0.08;
    total_priceanswers_fee = parseFloat(total_priceanswers_fee).toFixed(2);
    var total_paypal_fee = total_pay * 0.074 + 0.3;
    total_paypal_fee = parseFloat(total_paypal_fee).toFixed(2);

    total_priceanswers_fee = parseFloat(total_priceanswers_fee);
    total_paypal_fee = parseFloat(total_paypal_fee);

    var total_paid = total_price_question;
    


    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: 'contact@priceanswers.com', // sender address
      to: emailUser, // list of receivers
      subject: "Invoice Priceanswers", // Subject line
      template: 'html',
      context: {
        name: firstPartEmailUser,
        datenow: datenow,
        idQuestion: idquestionString,
        paypal_fee_1: '7.4',
        paypal_fee_2: '0.3',
        priceanswers_fee: '8',
        total_paid: total_paid,
        total_paypal_fee: total_paypal_fee,
        total_priceanswers_fee: total_priceanswers_fee,
        reward_offered: reward_offered

      }
    }).catch(console.error);

    console.log('se modifico envió correo');

  }


  //////////// Pagina de explicación Paypal y botón para redirigirlo al login de paypal /////////
  router.get('/paypal/testing', (req, res) => {
    res.render('emailtemplates/invoicepaidquestion/html');
  });

  module.exports = router;