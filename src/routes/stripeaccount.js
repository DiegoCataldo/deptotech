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
    const {accountID} = req.session;
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


router.post('/webhookstripe', express.json({type: 'application/json'}), (request, response) => {
  const event = request.body;

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(paymentIntent);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({received: true});
});

function generateAccountLink(stripeaccountID, origin) {
  return stripe.accountLinks.create({
    type: "account_onboarding",
    account: stripeaccountID,
    refresh_url: `${origin}/stripeaccount/refresh`,
    return_url: `${origin}/stripeaccount/successNewCostumer`,
  }).then((link) => link.url);
}

module.exports = router;