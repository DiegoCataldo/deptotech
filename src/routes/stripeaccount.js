const express = require('express')
const router = express.Router(); //me permite crear rutas
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/Users');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const stripe = require("stripe")('sk_test_51Ibu5uDyfMeOA6sJnuFnlxOrrT2nR4nmhiFzrbNhEcNXGXzdRSF9lCGVD80dFk3RcXoAgpkyKRkQ7RORPjZ6lEiL00vRPvaymY');




//////////// Crear nuevap costumer /////////
router.get('/stripeaccount/addcustomer', (req, res) => {
  res.render('stripeaccount/new-customer');
});
router.get('/stripeaccount/successNewCostumer', (req, res) => {
  res.render('stripeaccount/success-new-costumer');
});


router.get("/stripeaccount/refresh", async (req, res) => {
  if (!req.session.accountID) {
    res.redirect("/");
    return;
  }
  try {
    const { accountID } = req.session;
    const origin = `${req.secure ? "https://" : "https://"}${req.headers.host}`;

    const accountLinkURL = await generateAccountLink(accountID, origin)
    res.redirect(accountLinkURL);
  } catch (err) {
    res.status(500).send({
      error: err.message
    });
  }
});



router.post('/stripeaccount/addcustomerbutton', isAuthenticated, async (req, res) => {

  try {
    const user = await User.findById(req.user.id).lean();
    var stripeaccountID = user.stripe_account_id;


    if (typeof stripeaccountID === 'undefined' || stripeaccountID == null || stripeaccountID == '') {
      const stripeaccountNew = await stripe.accounts.create({ type: "express", business_type: 'individual' });
      stripeaccountID = stripeaccountNew.id;
      const filter_new_account = { _id: req.user.id };
      const update_new_account = { stripe_account_id: stripeaccountID };
      await User.findOneAndUpdate(filter_new_account, update_new_account);
    }
    req.session.accountID = stripeaccountID;
    const origin = `${req.headers.origin}`;

    const accountLinkURL = await generateAccountLink(stripeaccountID, origin);
    res.send({ url: accountLinkURL });

  } catch (err) {
    res.status(500).send({
      error: err.message
    });
  }




  /*
    const account = await stripe.accounts.retrieve(
      'd'
    ).catch(console.error)
    .then(() => console.log('We do cleanup here'));
  
    console.log(account);
     */
});


// webhook de stripe, cada vez que se pague una pregunta llegará una solicitud de stripe a esta url

router.post('/webhookstripe', express.json({ type: 'application/json' }), (request, response) => {
  const event = request.body;
  console.log(event);
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const paymentIntent = event.data.object;
      console.log(event.data.object);

      updatePaidQuestion(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({ received: true, event: event, eventype: event.type  });
});



// webhook de stripe, cada vez que se pague una pregunta llegará una solicitud de stripe a esta url
/* exports.webhookstripe2 = (request, response, next) => {
  const signature = req.headers['stripe-signature'];

 let event;

  try{
    event = stripe.webhooks.constructEvent(request.body, signature,  process.env.STRIPE_WEBHOOK_SECRET);
  }catch(err) {
  return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log(event);
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const paymentIntent = event.data.object;
      console.log(event.data.object);

      updatePaidQuestion(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
   response.status(200).json({ received: true });
};
 */

router.post('/create-checkout-session', async (req, res) => {

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    client_reference_id: 'question.id',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'T-shirt',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });

  res.redirect(303, session.url);
});

/// procesar por stripe el pago de una pregunta para habilitar sus respuestas ///
router.post('/checkout-session-enableanswers', async (req, res) => {

  const idQuestion = mongoose.Types.ObjectId(req.body.idquestion);
  const question = await Question.findById(req.body.idquestion).lean()
    .then(data => {
      return {
        _id: data._id,
        user_question: data.user_question,
        reward_offered: data.reward_offered,
        title: data.title
      }
    });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [

      {
        price_data:{
          currency: 'usd',
          product_data: {
            name: "question",
            metadata: {
                title: question.title,
                id_question: idQuestion.toString(),
                user_question: question.user_question.toString()
            }
          },
          
        unit_amount: question.reward_offered*100,
        },
        quantity: 1,
      }
    ],
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });

  res.redirect(303, session.url);
});

function generateAccountLink(stripeaccountID, origin) {
  return stripe.accountLinks.create({
    type: "account_onboarding",
    account: stripeaccountID,
    refresh_url: `${origin}/stripeaccount/refresh`,
    return_url: `${origin}/stripeaccount/successNewCostumer`,
  }).then((link) => link.url);
}

const updatePaidQuestion = async session => {
  const idQuestion = mongoose.Types.ObjectId(session.client_reference_id);
  const update = { answers_enabled: true };
  const filter = { _id: idQuestion };

  await Question.findOneAndUpdate(filter, update, { new: true }).lean();


}

module.exports = router;
