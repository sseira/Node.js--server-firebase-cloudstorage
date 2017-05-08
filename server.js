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

const SlackClient = require('@slack/client').WebClient

// cycle through colors?
// image_post_request must generate an id 
app.get('/slack_test', function(request, response) {

  var message_ts = '1493318230.244608'
  updateImageToShowVotes(message_ts, null, function(something) {
    console.log(something)
    response.end()
  })

})



var postImageToSlack = function(image_url, data_key, callback) {
  var channel_id = process.env.CONNECTED_SERVER_CHANNEL_ID,
      slack_bot = slackBotConnectServer(),
      options = {
        attachments: [
          {
            fallback: "Required plain-text summary of the attachment.",
            color: "#36a64f",
            text: "Optional text that appears within the attachment",
            image_url: image_url,
            callback_id: data_key,
            fields: [
                {
                    "title": "Yes and!",
                    "value": 0,
                    "short": true
                }, 
                {
                    "title": "Yes but maybe...",
                    "value": 0,
                    "short": true
                }
            ],
            ts: Date.now(),
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
        ],
        as_user: true
        // username: 'the pollster'
      }

      postToChannelAsBot(slack_bot, channel_id, 'text', options, function(err, res) {
        if (err) {
            console.log('Error:', err);
            callback(err)
        } else {

            callback(err) // redirect back to start page
        }
      })
}



var updateImageToShowVotes = function(message_ts, options, callback) {
  var slack_bot = slackBotConnectServer(),
      channel_id = process.env.CONNECTED_SERVER_CHANNEL_ID

  slack_bot.chat.update(message_ts, channel_id, 'thanks for AGAIN', options, callback)
}



var postToChannelAsBot = function(slack_bot, channel_id, text, attachment, callback) {
 
 slack_bot.chat.postMessage(channel_id, text, attachment, function(err, res) {
      callback(err, res)
  })
}




// slack bots connected to Slack Apps dont have permission to ready history 
// can only get channel info and other stuff : https://api.slack.com/bot-users#api_usage
var readChannel = function(slack_bot, channel_id, callback) {

   slack_bot.channels.info(channel_id, function(err, res) {
    if (err) {
          console.log('Error:', res);
          callback(err)
      } else {
          console.log('Message sent: ', res);
          callback(res)
      }
  })
}


app.get('/slack-read', function(request, response) {


  var channel_id = process.env.CONNECTED_SERVER_CHANNEL_ID,
      slack_bot = slackBotConnectServer()

  readChannel(slack_bot, channel_id, function(res) {
    console.log(res)
    response.end()
  })

})







//post
app.post('/slack-vote', function(request, response) {


  var payload = JSON.parse(request.body.payload)
      action  = payload.actions[0],
      name    = action.name,
      value   = action.value, // YES or NO 
      path    = 'images',
      image_id    = payload.callback_id,
      user_id     = payload.user.id,
      full_path   = path +'/'+ image_id,
      message_ts  = payload.message_ts,
      attachments = payload.original_message.attachments,
      options     = {attachments: attachments},
      field_index = name === 'yes_vote' ? 0 : 1

      options.attachments[0].text = 'updated this text'


  incrementDataValue(full_path, name, user_id, function(err, already_voted, data) {

    options.attachments[0].fields[field_index].value = data[name] 

    console.log('data has been incremented')
    console.log(data[name])

    if (already_voted) {
      response.send({
        "response_type": "ephemeral",
        "replace_original": false,
        "text": 'Sorry, you can only vote once'
      })
    } else {
      // can i respond to it outside of the callback????
      updateImageToShowVotes(message_ts, options, function() {
        response.send({
          "response_type": "ephemeral",
          "replace_original": false,
          "text": 'Your vote has been registered'
        })
     })
    }
  })
})


var slackBotConnectServer = function() {
  var token = process.env.SLACK_CONNECTION_BOT_TOKEN //see section above on sensitive data
  return new SlackClient(token)
}




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
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_DOMAIN,
    databaseURL: process.env.DATABASE_URL
  }

  firebase.initializeApp(config)
}()



var incrementDataValue = function(full_path, name, user_id, callback) {
  var valueRef = firebase.database().ref(full_path)

  console.log('about to start transaction')
  valueRef.transaction(function(image) {

    if (image) {
      if (image.hasVoted && image.hasVoted[user_id]) { // has already voted, dont change
        return
      } else {
        if (!image.hasVoted) {
          image.hasVoted = {}
        }
        image.hasVoted[user_id] = true

        if (image[name]) {
          image[name]++
        } else {
          image[name] = 1
        }
      }
      return image
    } else {
      return null // try again
    }

  }, function(error, committed, snapshot) {
    if (error) {
      console.log('Transaction failed abnormally!', error);
    } else if (!committed) {
      console.log('User already voted');
    } else {
      console.log('value incremented!');
    }
    console.log("value: ", snapshot.val());
    callback(error, !committed, snapshot.val())
  })
}

// data_params = {key: value, key1: value1}
var updateDataRow = function(path, id, data_params, callback) {
   
  firebase.database().ref(path +'/' + id).update(data_params, function(err) {
      callback(err)
    })
}



var updateMaxValue = function(new_value, max_ref, original_ref) {
  var maxDataRef = firebase.database().ref(ref),
      maxDataObj = maxDataRef.toJSON(),
      newDataObj = {
        value: new_value,
        original_ref: original_ref
      }

      if(!maxDataObj) {
        console.log('max object is null')
        maxDataRef.set(newDataObj)

      } else {
        console.log(maxDataObj)

        if (maxDataObj.value < new_value) {
           maxDataRef.set(newDataObj)
        }
      }


 // calculate max votes
        // if max = null, this = max
        // else if this>max, max = this
}

// data_params = {key: value, key1: value1}
var writeDataRow = function(path, data_params, callback) {

  // combine 
  var newDataRowRef = firebase.database().ref(path).push(data_params, function(err) {
    if (err) {
      console.log('error-writing data', err)
    } else {
      var new_path = path+'/'+newDataRowRef.key

      listenForChanges(new_path, function(data){
        console.log('heard an event!')
        // coul
        updateMaxValue(data.yes_vote, 'yes_max', newDataRowRef.key)
        updateMaxValue(data.no_vote, 'no_max', newDataRowRef.key)
      
      
        console.log(data.yes_vote)
        console.log(data.no_vote)
      })


      callback(newDataRowRef.key)
    }
  })
  
}


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




// does this 
var listenForChanges = function(db_ref, callback) {
  var tableRef = firebase.database().ref(db_ref);

  tableRef.on('value', function(snapshot) {
    callback(snapshot.val())


  });
}



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
  const projectId = process.env.STORAGE_ID,
        storage_bucket_url = process.env.STORAGE_BUCKET_URL

  // Instantiates a client
  const storageClient = Storage({
    projectId: projectId,
    keyFilename: process.env.STORAGE_KEY_FILENAME 
  });

  return storageClient.bucket(storage_bucket_url)
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
        console.log(err)
        response.status(500).end()
      } else {

        console.log('----- file uploaded, now posting to slack ----------')
        postImageToSlack(file_url, data_ref, function(err) {
          if(err) {
            console.log(err)
            response.status(500).end()
          } else {
            console.log('image posted')
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
        // location???
      }

      writeDataRow('images', file_obj, function(new_data_key) {
        callback(new_data_key, public_url, null)
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
  key: process.env.GOOGLE_MAPS_API_KEY
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







