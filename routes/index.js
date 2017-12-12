var express = require('express');
var passport = require('passport');
var httpProxy = require('http-proxy');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn()
var router = express.Router();

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
}

var proxy = httpProxy.createProxyServer({
  target: {
      host: process.env.SHINY_HOST,
      port: process.env.SHINY_PORT
    }
});

proxy.on('error', function(e) {
  console.log('Error connecting');
  console.log(e);
});

var setIfExists = function(proxyReq, header, value){
  if(value){
    proxyReq.setHeader(header, value);
  }
}

proxy.on('proxyReq', function(proxyReq, req, res, options) {
  setIfExists(proxyReq, 'x-auth0-nickname', req.user._json.nickname);
  setIfExists(proxyReq, 'x-auth0-user_id', req.user._json.user_id);
  setIfExists(proxyReq, 'x-auth0-email', req.user._json.email);
  setIfExists(proxyReq, 'x-auth0-name', req.user._json.name);
  setIfExists(proxyReq, 'x-auth0-picture', req.user._json.picture);
  setIfExists(proxyReq, 'x-auth0-locale', req.user._json.locale);
});

/* Proxy all requests */

/* GET home page. */

router.get('/login',
  function(req, res){
    res.render('login', { env: env });
  });

router.get('/logout', function(req, res){
  req.logout();
  res.cookie('uid', '', { expires: new Date() });
  res.redirect('/login');
});

router.get('/callback',
  passport.authenticate('auth0', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/');
  });

router.all('/invitation', function(req, res, next) {
  res.cookie('uid', req.user._json.user_id);
  proxy.web(req, res);
});

router.all(/.*/, ensureLoggedIn, function(req, res, next) {
  res.cookie('uid', req.user._json.user_id);
  proxy.web(req, res);
});

module.exports = router;
