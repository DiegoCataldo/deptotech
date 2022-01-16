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
var path = require('path');
const Promise = require('bluebird');
var hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const fs = require('fs')


/// importar controlador paypal ///

const paypal_controller = require('../controller/paypal_controller');

const CLIENT = 'AZBsZtS53_tReLSnEsRXz_JkY5RY5hkQvG8mdirbLaDzK5973_3MCO0fnFx-QcgrQOjU3B8UYnZ1Qu4D';
const SECRET = 'EMN5jcBEeaK-it5gdX5gQTw8_dMDN_b23jxFy88Jdi7VZOTDvlPN5-y1c2XQCktc5fyzlXI-LU_LxVxs';
const PAYPAL_API = 'https://api-m.paypal.com'; // Live https://api-m.paypal.com  // test https://api-m.sandbox.paypal.com

const auth = { user: CLIENT, pass: SECRET }



///////////////////////  [4] WEBHOOKS ////////////
// webhook de PAYPAL, cada vez que se pague una pregunta llegará una solicitud de PAYPAL a esta url
router.post('/webhookcoinbase', express.json({ type: 'application/json' }), async (request, response) => {
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



module.exports = router;