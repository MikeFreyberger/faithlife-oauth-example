var https = require('https');
var express = require('express');
var querystring = require('querystring');

var consumerToken = process.env.CONSUMER_TOKEN;
var consumerSecret = process.env.CONSUMER_SECRET;

var app = express()
	.use(express.cookieParser())
	.use(express.session({ secret: "don't steal this!" }))
	.get('/login', function(request, response) {
		https.request({
			hostname: 'auth.logos.com',
			method: 'POST',
			path: '/oauth/v1/temporarytoken',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_callback="http://' + request.headers.host + '/verify"'
			}
		}, function(temporaryTokenResponse) {
			var responseData = '';
			temporaryTokenResponse.on('data', function(data) {
				responseData += data;
			});

			temporaryTokenResponse.on('end', function() {
				request.session.oauth_token_secret = querystring.parse(responseData).oauth_token_secret;
				response.redirect('https://auth.logos.com/oauth/v1/authorize?' + responseData);
			})
		}).end();
	})
	.get('/verify', function(request, response) {
		https.request({
			hostname: 'auth.logos.com',
			method: 'POST',
			path: '/oauth/v1/accesstoken',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26' + request.session.oauth_token_secret + '", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_token="' + request.query.oauth_token + '", oauth_verifier="' + request.query.oauth_verifier + '"'
			}
		}, function(accessTokenResponse) {
			var responseData = '';
			accessTokenResponse.on('data', function(data) {
				responseData += data;
			});
			
			accessTokenResponse.on('end', function() {
				var parsedResponse = querystring.parse(responseData);
				request.session.oauth_token = parsedResponse.oauth_token;
				request.session.oauth_token_secret = parsedResponse.oauth_token_secret;
				response.redirect('/');
			});
		}).end();
	})
	.get('/', function(request, response) {
		if (!request.session.oauth_token || !request.session.oauth_token_secret) {
			response.send('<a href="/login">Sign in</a>');
			return;
		}

		https.request({
			hostname: 'accountsapi.logos.com',
			method: 'GET',
			path: '/v2/users/me',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26' + request.session.oauth_token_secret + '", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_token="' + request.session.oauth_token + '"'
			}
		}, function(userResponse) {
			var responseData = '';
			userResponse.on('data', function(data) {
				responseData += data;
			});
			
			userResponse.on('end', function() {
				response.send(responseData);
			});
		}).end();
	});


var server = app.listen(process.env.PORT || 3000);
