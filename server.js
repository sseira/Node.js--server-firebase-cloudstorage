var express = require('express')
var app = express()
var https = require('https')
var bodyParser = require('body-parser') // do i still need these?
var fs = require('fs')
require('dotenv').config()

app.set('port', (process.env.PORT || 5000))

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // eventually only allow from IDEO domains???
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/* ------------- if you want to implement a view with this server ------------- */
    app.get('/', function(request, response) {
      response.sendFile(__dirname + '/view.html')
    });
    // assumes you previously added a view.html file in same directory
/* ---------------------------------------------------------------------------- */

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



/* ------------------------------------------------------------------------------------------
   -------------------------------- Request Helper Functions --------------------------------
   ------------------------------------------------------------------------------------------
*/

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

  return  params ? params : ''
}

var findParameterByKey = function(params, key) {  

  var found_obj = params.find(function(param_obj) { return Object.keys(param_obj)[0] === key })

  return found_obj ? found_obj[key] : ''
}

var combineParameters = function(param1, param2) {
  return param1.concat(param2)
}


var sendGetRequest = function(url, callback) {//server_response) {
  
  https.get(url, (res) => {
     const statusCode = res.statusCode
     const contentType = res.headers['content-type']
      
      //-------- error handling ------------
     var error
     if (statusCode !== 200) {
       error = new Error(`Request Failed.\n` +
                         `Status Code: ${statusCode}`)
     } else if (!/^application\/json/.test(contentType)) {
       error = new Error(`Invalid content-type.\n` +
                         `Expected application/json but received ${contentType}`)
     }
     if (error) {
       console.log(error.message)
       // consume response data to free up memory
       res.resume()
       return
     }
 
     //-------- reading in data chunk by chunk ------------
     res.setEncoding('utf8')
     var rawData = ''
     res.on('data', (chunk) => rawData += chunk)

     //-------- finished reading data ------------
     res.on('end', () => {
       try {
         var parsedData = JSON.parse(rawData)
         // return parsedData to requester in response object 
         callback(parsedData)

         // server_response.json(parsedData)
       } catch (e) {
         console.log(e.message)
       }
     });
  }).on('error', (e) => {
     console.log(`Got error: ${e.message}`)
  });
}


var sendPostRequest = function(host_name, path, data, callback) {//server_response) {

 data = JSON.stringify(data)

  const options = {
    hostname: host_name,
    port: 443,
    path: '/' + path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    // console.log('statusCode:', res.statusCode)
    // console.log('headers:', res.headers)

    res.on('data', (d) => {
      // process.stdout.write(d)
    })

    res.on('end', () => {
      console.log('Data sent')
      callback('success')
      // server_response.end()
    });
  })

  req.on('error', (e) => {
    console.error(e);
  })
  // write data to request body
  req.write(data)

  req.end()
}


/* ------------------------------------------------------------------------------------------
   ----------------------------------- Call External API -----------------------------------
   ------------------------------------------------------------------------------------------
   Ex: 
*/
/* 

best to keep sensitive data such as API keys in the server side 
move to .env 

*/

app.get('/external_api', function(request, response) {

  var example_recipe_app_id = 'c5bd1e1a',
      example_recipe_key = '2b746487bce0eb83675174a4429c1a94',
      example_recipe_base_url = 'https://api.edamam.com/search',
      // server_params = [{app_id:example_recipe_app_id}, {app_key:example_recipe_key}]
      server_params = [{app_id:example_recipe_app_id}, {app_key:example_recipe_key}, {q: 'tomato soup'}]
      user_params = getParameters(request),
      encoded_params = encodeParameters(combineParameters(server_params, user_params)),
      url = example_recipe_base_url + encoded_params

      sendGetRequest(url, function(data) {
        console.log(data)
        response.json(data)
      })
      
})

/* 
   ------------------------------------------------------------------------------------------
   --------------------------------- Message Slack Channel ----------------------------------
   ------------------------------------------------------------------------------------------

   Ex: http://localhost:5000/slack?text=hiSlack
*/

const SlackWebhook = require('@slack/client').IncomingWebhook,
      SlackClient = require('@slack/client').WebClient

// cycle through colors?
// image_post_request must generate an id 
app.get('/slack', function(request, response) {

  // postImageToSlack('https://storage.googleapis.com/exampledatabase-b0ae3.appspot.com/1Seira_Santi-Final%20(1).jpg', 'image_id')





      // slackBot(function(data) {
      //   response.json(data)
      // })
})



var postImageToSlack = function(image_url, data_key, callback) {


  console.log('slack webhook')
  console.log(process.env.SLACK_WEBHOOK_URL)
  var url = process.env.SLACK_WEBHOOK_URL || '',
      webhook = new SlackWebhook(url),
      // user_params = getParameters(request),
      // image_id = findParameterByKey(user_params, 'image_id') || 'image_id',
      // image_url = findParameterByKey(user_params, 'image_url') || 'https://storage.googleapis.com/exampledatabase-b0ae3.appspot.com/1Seira_Santi-Final%20(1).jpg',
      // user_message = findParameterByKey(user_params, 'text'),
      attachment = {
        attachments: [
          {
            fallback: "Required plain-text summary of the attachment.",
            color: "#36a64f",
            text: "Optional text that appears within the attachment",
            image_url: image_url,
            callback_id: data_key,
            // ts: new Date().now,
            actions: [
                {
                    "name": "yes_vote",
                    "text": "Yes and!",
                    "type": "button",
                    "value": "Yes"
                },
                {
                    "name": "no_vote",
                    "text": "Yes, but maybe...",
                    "type": "button",
                    "value": "No"
                }
            ]
          }
        ]
      }

      console.log(url)
      console.log('about to send')
      webhook.send(attachment, function(err, res) {
        if (err) {
            console.log('Error:', err);
            callback(err)
        } else {
            console.log('Message sent: ', res);
            callback()
        }
      })
}


// can read and post winner
var slackBot = function(callback) {

  var token = process.env.SLACK_DOODLE_POLLSTER_TOKEN || '', //see section above on sensitive data
      web_client = new SlackClient(token),
      connected_server_channel_id = 'C50V9HAKT',
      attachment = {
        attachments: [
          {
            fallback: "Required plain-text summary of the attachment.",
            color: "#36a64f",
            text: "Today's winner is!",
            ts: new Date().now,
         
          }
        ]
      }

 


  readChannel(web_client, connected_server_channel_id, callback)
  postToChannelAsBot(web_client, connected_server_channel_id, text, attachments, callback)
}


var postToChannelAsBot = function(web_client, channel_id, text, attachments, callback) {
 
 web_client.chat.postMessage(channel_id, text, attachment, function(err, res) {
      if (err) {
          console.log('Error:', err)
          callback(err)
      } else {
          console.log('Message sent: ', res)
          callback(res)
      }
  })
}



var readChannel = function(web_client, channel_id, callback) {

   web_client.channels.history(channel_id, function(err, res) {
    if (err) {
          console.log('Error:', err);
          callback(err)
      } else {
          console.log('Message sent: ', res);
          callback(res)
      }
  })
}


app.post('/slack-vote', function(request, response) {

  

  var payload = JSON.parse(request.body.payload)
      action = payload.actions.[0],
      name = action.name,
      value = action.value, // YES or NO 
      path = 'images',
      id = payload.callback_id,
      full_path = path +'/'+ id +'/'+ name ,
      message_ts = payload.message_ts




  incrementDataValue(full_path, function(err, data) {



    //  chat.update = message_ts value from origianl_message 
    //  hide buttons 
    console.log(data)

    response.send({
      "response_type": "ephemeral",
      "replace_original": false,
      "text": 'done'
    })
  })

})

/* ------------------------------------------------------------------------------------------
   --------------------------------- Access Firebase Database -------------------------------
   ------------------------------------------------------------------------------------------
*/

// TODO
// explore authentication
// signin through a front end button
// expect that front end apps have an authentication and they send the auth token with the request?
// store a global variable of signed in user 
// explore notifications



const firebase = require("firebase")

// const format = require('util').format;


var initializeFirebase = function() {
  var config = {
    apiKey: "AIzaSyC-dEU8rrYcPZjIyiD5paZFaWGLrGSjK4Q",
    authDomain: "exampledatabase-b0ae3.firebaseapp.com",
    databaseURL: "https://exampledatabase-b0ae3.firebaseio.com"
  }

  firebase.initializeApp(config)

  var listenForChanges = function(db_table) {
    var tableRef = firebase.database().ref('users/');

    tableRef.on('value', function(snapshot) {
      doSomethingBasedOnData(snapshot.val());
    });
  }

  // listenForChanges('users')

}()



var incrementDataValue = function(full_path, callback) {
  // Increment value by 1.
  var valueRef = firebase.database().ref(full_path)
  valueRef.transaction(function(value) {
    // If value has never been set, value will be `null`.
    if (!value) return 1

    return value + 1
  }, function(error, committed, snapshot) {
    if (error) {
      console.log('Transaction failed abnormally!', error);
    } else if (!committed) {
      console.log('We aborted the transaction ');
    } else {
      console.log('value incremented!');
    }
    console.log("value: ", snapshot.val());
    callback(error, snapshot.val())
  })
}

// data_params = {key: value, key1: value1}
var updateDataRow = function(path, id, data_params, callback) {
   
  firebase.database().ref(path +'/' + id).update(data_params, function(err) {
      callback(err)
    })
}

// data_params = {key: value, key1: value1}
var writeDataRow = function(path, data_params, callback) {

  // combine 
  var newDataRowRef = firebase.database().ref(path).push(data_params, function(err) {
    if (err) {
      console.log('error-writing data', err)
    } else {
      callback(newDataRowRef.key)
    }
  })
  
}


//abstract this
var readUserData = function(path, id, callback) {
    var data = firebase.database().ref('/'+ path +'/'+ id).once('value').then(function(snapshot) {
      callback(snapshot.val())
    });
  }

// split up to database/read --- database/write
app.get('/database', function(request, response) {

  
  var params = getParameters(request),
      userID = findParameterByKey(params, 'userID'),
      username = findParameterByKey(params, 'username'),
      data = findParameterByKey(params, 'data')
      

  // writeDataRow('users', userID, {username: username, data: data})
  // readUserData(userID, response)

})




/* ------------------------------------------------------------------------------------------
   --------------------------------- Access Google Cloud Storage -------------------------------
   ------------------------------------------------------------------------------------------
*/

const Storage = require('@google-cloud/storage')
// Multer is required to process file uploads and make them available via req.files.
const multer = require('multer')
var upload = multer({
              storage: multer.memoryStorage(),
              limits: {
                fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
              }
            })



// --------------- initialize cloud storage reference --------------
var storageBucket = function() {
  // Your Google Cloud Platform project ID
  const projectId = 'exampledatabase-b0ae3';

  // Instantiates a client
  const storageClient = Storage({
    projectId: projectId,
    keyFilename: 'private_key_SECRET.json'
  });

  return storageClient.bucket('exampledatabase-b0ae3.appspot.com')
}()



// assumes input file name = 'image' --- use .any() for all files 
app.post('/upload_image', upload.single('image'), function(request, response) {

    if (!request.file) {
      response.status(400).send('No file uploaded.')
      console.log('requst strangeness')
      return
    } 

    var file_name = 'images/'+ Date.now() + request.file.originalname, // what happens when the image is just taken and doesnt have a name?
        file_data = request.file.buffer,
        file_type = request.file.mimetype

    uploadFile(file_name, file_data, file_type, function(data_ref, file_url, err) {
      if (err) {
        response.status(500).end()
      } else {

        console.log('----- file uploaded, now posting to slack ----------')
        postImageToSlack(file_url, data_ref, function(err) {
          if(err) {
            response.status(500).end()
          } else {
            response.status(200).end()
          }
        })
      }
      
    })
})


var uploadFile = function(file_name, file_data, file_type, callback) {
  // Create a new blob in the bucket and upload the file data.
  const blob = storageBucket.file(file_name),
        stream = blob.createWriteStream({
          metadata: {
            contentType: file_type
          }
        })

  stream.on('error', (err) => {
    console.error('error')
    callback(null, null, err)
    return
  });

  stream.on('finish', () => {
    // using a signed URL, NOT SECURE
    //store public url in firebase db 
    var config = {
      action: 'read',
      expires: '03-17-2025'
    };

    blob.getSignedUrl(config, function(err, public_url) {
      if (err) {
        console.error(err);
        callback(null, null, err)
        return
      }

      var file_obj = {
        public_url: public_url,
        time_stamp: Date.now()
        // yes_votes: 0,
        // no_votes: 0
        // location???
      }

      writeDataRow('images', file_obj, function(new_data_key) {

        callback(new_data_key, public_url, null)

        // // post to slack with image_url = url & row_id = callback_id
        console.log('location')
        console.log(new_data_key)
        // console.log('url')
        // console.log(blob_url)
      }) 
      // const publicUrl = format(`https://storage.googleapis.com/${storageBucket.name}/${blob.name}`);

    });
  });

  stream.end(file_data);
}
// how to download to local memory not to local storage
// do we want to download local data or do we want to just pass the link url so others can access through that???
var downloadImage = function(image_name) {

  var image_file = storageBucket.file('images/'+image_name)

// ---------------- DOWNLOAD IMAGE  ------------------

  image_file.download({
    destination: 'test_deco3mp.jpg'
  }, function(err) {
    console.log(err)
  });



// ----------- write stream --------------
// var fs = require('fs');
// var remoteFile = bucket.file('image.png');
// var localFilename = '/Users/stephen/Photos/image.png';

// remoteFile.createReadStream()
//   .on('error', function(err) {})
//   .on('response', function(response) {
//     // Server connected and responded with the specified status and headers.
//    })
//   .on('end', function() {
//     // The file is fully downloaded.
//   })
//   .pipe(fs.createWriteStream(localFilename));





// // ---------------- GET IMAGE FILE ------------------

//   image_file.get().then(function(data){
//     var file = data[0],
//         apiResponse = data[1]

//   })

// ---------------- GET IMAGE URL ------------------
  // var config = {
  //   action: 'read',
  //   expires: '03-17-2025'
  // };

  // image_file.getSignedUrl(config, function(err, url) {
  //   if (err) {
  //     console.error(err);
  //     return
  //   }
  //   console.log(url)

  // });

}



/* ------------------------------------------------------------------------------------------
   --------------------------------- Get Google Directions ----------------------------------
   ------------------------------------------------------------------------------------------
*/

/*

  Google Directions API blocks your key if it is called too much
  Also, modify algorithm to get simple A->B directions for next stop and B->C->...->X for the rest of stops
  Traffic data is only available for A->B queries

  If cloning, get your own key for any of these services https://developers.google.com/maps/web-services/overview 

            ------ from Google Directions API Docs -----------
The duration in traffic is returned only if all of the following are true:

The request does not include stopover waypoints. 
If the request includes waypoints, they must be prefixed with via: to avoid stopovers.

If you'd like to influence the route using waypoints without adding a stopover, 
prefix the waypoint with via:. Waypoints prefixed with via: will not add an entry to the legs
 array, but will instead route the journey through the provided waypoint.

*/
var googleMapsDirectionsClient = require('@google/maps').createClient({
  key: 'AIzaSyDhYQs3y6neWPf1TIX_Y8IgjTtOcpSe7X0'//'AIzaSyDVl65wW5zqkICh0c1UrabLIn4MV8ryIfk'
})


app.get('/googleDirections', function(request, response) {


  //testing
  console.log(request.param('origin'))
  // ---------


  var params = getParameters(request),
      origin = findParameterByKey(params, 'origin'),
      destination = findParameterByKey(params, 'destination')

  googleMapsDirectionsClient.directions({
    origin: origin,
    // waypoints: waypoints,
    destination: destination, 
    departure_time: 'now', 
    traffic_model: 'best_guess'
  }, function(err, data) {    
    if (!err) {

      response.json(data.json)

    } else {
      console.log('google direction api err-' + err)
    }
  })

})







