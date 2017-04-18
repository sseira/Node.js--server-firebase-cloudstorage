var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});







/* --------------- Call External API ---------------- 
  best to keep sensitive data such as API keys in the server side
*/

app.get('/external_api', function(request, response) {

console.log(request)
  var example_recipe_app_id = 'c5bd1e1a',
      example_recipe_key = '2b746487bce0eb83675174a4429c1a94',
      server_params = [{app_id:example_recipe_app_id}, {app_key:example_recipe_key}]
      example_recipe_base_url = 'https://api.edamam.com/search',
      user_params = getParameters(request),
      encoded_params = encodeParameters(combineParameters(server_params, user_params)),
      url = example_recipe_base_url + encoded_params

      console.log(url)
  // combine user and server parameters

  https.get(url, (res) => {
     const statusCode = res.statusCode;
     const contentType = res.headers['content-type'];
      
      //-------- error handling ------------
     var error;
     if (statusCode !== 200) {
       error = new Error(`Request Failed.\n` +
                         `Status Code: ${statusCode}`);
     } else if (!/^application\/json/.test(contentType)) {
       error = new Error(`Invalid content-type.\n` +
                         `Expected application/json but received ${contentType}`);
     }
     if (error) {
       console.log(error.message);
       // consume response data to free up memory
       res.resume();
       return;
     }
 
     //-------- reading in data chunk by chunk ------------

     res.setEncoding('utf8');
     var rawData = '';
     res.on('data', (chunk) => rawData += chunk);

     //-------- finished reading data ------------
     res.on('end', () => {
       try {
         var parsedData = JSON.parse(rawData);
         response.json(parsedData);
         console.log(parsedData);
       } catch (e) {
         console.log(e.message);
       }
     });
  }).on('error', (e) => {
     console.log(`Got error: ${e.message}`);
  });
 
 

})