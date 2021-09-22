var fs = require('fs');
var path = require('path');
const axios = require('axios');
const uniqid = require('uniqid');
const http = require('https');

var controller = {
  generarTokenPaypal: async function (req, res) {

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
        return res.status(200).send({
          status: 'success',
          message: 'su token es',
          access_token: access_token,
          token_type: token_type
        })

      } catch (error) {
        console.log('error: ', error);
        return res.status(400).send({
          status: 'error',
          message: 'Error de paypal revisar logs'
        });
      }
    })();
  },

  generarPayoutPaypal: async function (req, res) {
    let params = req.body;
    let modo = params.modo;
    let batch_code = uniqid(); // numero de factura unico

    var options = {

      "method": "POST",
      "hostname": "https://api.sandbox.paypal.com",
      "headers": {
        "accept": "application/json",
        "authorization": "Bearer "+ req.params.token,
        "content-type": "application/json",
      }
    };
    var req = http.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });
      res.on("end", function (){
        var body = Buffer.concat(chunks);
        //ver respuesta
        console.log(body.toString);
      });
    });

    console.log(modo);

    if (modo == "EMAIL") {
      let email = params.email;
      let monto_a_cobrar = params.value;

      req.write(JSON.stringify({
        sender_batch_header:
        {
          email_subject: 'Pago realizado',
          sender_batch_id: 'batch-' + batch_code,
          items: [
            {
              recipient_type: 'EMAIL',
              amount: { value: monto_a_cobrar, currency: 'USD' },
              receiver: email,
              note: 'Pago desde el backendo con node token working'
            }
          ]
        }
      }));
      req.end();

      return res.status(200).send({
        status: 'success',
        message: 'pago realizado a :'+ email
      })
    }
  }
}

module.exports = controller;