var express = require('express');
var app = express();
var https = require('https');
var fs = require('fs');


app.set('port', (process.env.PORT || 5000));


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // eventually only allow from IDEO domains???
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


/* ------------- if you want to implement a view with this server ------------- */
    // app.get('/', function(request, response) {
    //   response.sendFile(__dirname + '/view.html')
    // });

    // assumes you previously added a view.html file in same directory
/* ---------------------------------------------------------------------------- */



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});




/*--------------- Request Helper Functions ----------------*/

// params = [{key: value},...{key: value}]
var encodeParameters = function(params) {
  if (!params) return ''
  var encoded_params = '?'

  params.map(function(param_obj) {
    var key = encodeURIComponent(Object.keys(param_obj)[0]),
        value = encodeURIComponent(param_obj[key])
    encoded_params = encoded_params.concat(key +'='+ value +'&')
  })

  return encoded_params.substring(0, encoded_params.length-1)     // take out last &
}

var getParameters = function(request) {
  var keys = Object.keys(request.query),
      params = keys.map(function(key){
        var param_obj = {}
        param_obj[key] = request.query[key]
        return param_obj
      })

  return  params
}

var findParameterByKey = function(params, key) {
  return params.find(function(param_obj) { return Object.keys(param_obj)[0] === key })
}

var combineParameters = function(param1, param2) {
  return param1.concat(param2)
}


var sendGetRequest = function(base_url, paramaters) {
// helper for external_api
}



/* --------------- Call External API ---------------- 
  best to keep sensitive data such as API keys in the server side
*/

app.get('/external_api', function(request, response) {

console.log('requesting')
  var example_recipe_app_id = 'c5bd1e1a',
      example_recipe_key = '2b746487bce0eb83675174a4429c1a94',
      // server_params = [{app_id:example_recipe_app_id}, {app_key:example_recipe_key}]
      server_params = [{app_id:example_recipe_app_id}, {app_key:example_recipe_key}, {q: 'tomato soup'}]
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