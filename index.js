// Imports dependencies and set up http server
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express'),
  bodyParser = require('body-parser'),
  axios = require('axios'),
  app = express().use(bodyParser.json()); // creates express http server

const COMMANDS = {
  DOGE: 'DOGE',
};

function getDogeValue() {
  return axios.get(process.env.DOGE_URL);
}
// Handles messages events
function handleMessage(senderPSID, receivedMessage) {
  let response;

  // Check if the message contains text
  if (receivedMessage.text) {
    // Create the payload for a basic text message
    response = {
      text: `You sent the message: "${receivedMessage.text}".`,
    };

    // Sends the sample response message
    callSendAPI(senderPSID, response);
  }

  if (receivedMessage.text == COMMANDS.DOGE) {
    getDogeValue()
      .then(({ data }) => {
        response.text = `Value @ ${data}`;
        callSendAPI(senderPSID, response);
      })
      .error(() => console.err(err));
  }
}

// Sends response messages via the Send API
function callSendAPI(senderPSID, response) {
  let requestBody = {
    recipient: {
      id: senderPSID,
    },
    message: response,
  };

  axios
    .post('https://graph.facebook.com/v2.6/me/messages', {
      headers: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
      },
      data: {
        ...requestBody,
      },
    })
    .then(() => {
      console.log('message sent');
    })
    .error((err) => {
      console.error('Unable to send message:' + err);
    });
}

app.get('/webhook', function (req, res) {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
  let body = req.body;
  // Checks this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      let senderPSID = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPSID);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        handleMessage(senderPSID, webhookEvent.message);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log(`App listening on port: ${PORT}`);
});
