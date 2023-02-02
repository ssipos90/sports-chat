const bodyParser = require('body-parser');
const express = require('express');
const OAuthServer = require('express-oauth-server');
const { config } = require('dotenv');

config({ debug: true });

const app = express();

const mongoose = require('mongoose');
const { envStrict } = require('./util');

function start_server() {
  console.log('starting server...');
  app.oauth = new OAuthServer({
    model: require('./model'),
    debug: true,
  });

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(app.oauth.authorize());

  app.use(function(req, res) {
    console.log('request from within secret area :)');
    res.send('Secret area');
  });

  app.listen(3000);
  console.log('listening for connections...');
}

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin'
};

// Makes connection asynchronously. Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(envStrict('MONGODB_URI'), mongoOptions, function(err, res) {
  if (err) {
    console.error('ERROR connecting to mongodb. ' + err);
    process.exit(1);
  }
  start_server();
});
