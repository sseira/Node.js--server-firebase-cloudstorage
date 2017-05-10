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
   --------------------------------- Access Firebase Database -------------------------------
   ------------------------------------------------------------------------------------------
   Make sure to set up your own Firebase Project @ https://console.firebase.google.com/ 
   Set up keys in a seperate .env file, NOT INCLUDED IN GIT 
*/

// TODO
// explore authentication
// explore notifications


const firebase = require("firebase")

var initializeFirebase = function() {
  var config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  }

  firebase.initializeApp(config)
}()


// data = {key: value, key1: value1}
var writeDataRow = function(path, data, callback) {
  // add data to table in path
  var newDataRowRef = firebase.database().ref(path).push(data, function(err) {
    if (err) {
      console.log('error-writing data', err)
    } else {

      var new_path = path+'/'+newDataRowRef.key

        // sets up a listener for changes to this newly added data row
        listenForChanges(new_path, function(data){
          // do something interesting based on a change to the database
          if (data) {
            console.log('data has changed')
            // updateMaxValue(data.some_value, 'max_some_value', newDataRowRef.key)
          }
        })

      // return address of new data row
      callback(newDataRowRef.key)
    }
  })
}


// data = {key: value, key1: value1}
var updateDataRow = function(path, data, callback) {

  firebase.database().ref(path).update(data, function(err) {
      callback(err)
    })
}


var readData = function(path, callback) {
  var data = firebase.database().ref(path).once('value').then(function(snapshot) {
    callback(snapshot.val())
  });
}

var listenForChanges = function(db_ref, callback) {
  var tableRef = firebase.database().ref(db_ref)

  tableRef.on('value', function(snapshot) {
    callback(snapshot.val())
  });
}

// example call to write to db
app.get('/database', function(request, response) {

  var params = getParameters(request),
      username = findParameterByKey(params, 'username'),
      data = findParameterByKey(params, 'data')
      

  writeDataRow('users', {username: username, data: data}, function(data_address){
    console.log('data stored in ' + data_address)
  })

})


// example of a server side validation to only increment if user_id hasn't voted yet
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


// 
var updateMaxValue = function(new_value, max_ref, original_ref) {
  if (!new_value) return

  var maxDataRef = firebase.database().ref(max_ref),
      newDataObj = {
            value: new_value,
            original_ref: original_ref
          }

  maxDataRef.once("value")
    .then(function(snapshot) {

      if(!snapshot.val()) {
        maxDataRef.set(newDataObj)

      } else {
        if (snapshot.val().value < new_value) {
          console.log('updating max value ' + max_ref)

           maxDataRef.set(newDataObj)
        }
      }
    });
}




/* 
   ------------------------------------------------------------------------------------------
   --------------------------------- Access Google Cloud Storage ----------------------------
   ------------------------------------------------------------------------------------------
   Used to store large media files. Generate public/private link and store that in Firebase  
   Create your own Google Cloud Storage Project @ https://console.cloud.google.com 
   Set up keys in a seperate .env file, NOT INCLUDED IN GITHUB
   Download private file with secret keys from https://cloud.google.com/storage/docs/authentication
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
  const projectId = process.env.PROJECT_ID,
        storage_bucket_url = process.env.STORAGE_BUCKET

  // Instantiates a client
  const storageClient = Storage({
    projectId: projectId,
    keyFilename: process.env.STORAGE_KEY_FILENAME 
  });

  return storageClient.bucket(storage_bucket_url)
}()


// uploads a file into cloud storage and saves a public link to it on the firebase db
// returns a link to the hosted file and the address of the firebase db object where the link is stored
var uploadFile = function(file_name, file_data, file_type, callback) {
  // Create a new blob in the bucket and upload the file data into it.
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
      }

      writeDataRow('images', file_obj, function(new_data_key) {
        callback(new_data_key, public_url, null)
      }) 
      // const publicUrl = format(`https://storage.googleapis.com/${storageBucket.name}/${blob.name}`);

    });
  });

  stream.end(file_data);
}


var downloadFile = function(file_path) {

  var file = storageBucket.file(file_path)

// ---------------- DOWNLOAD IMAGE  ------------------

  file.download({
    destination: 'downloaded_from_the_cloud.jpg'
  }, function(err) {
    console.log(err)
  });

}

// assumes input file name = 'image' --- use .any() for all files 
app.post('/upload_image', upload.single('image'), function(request, response) {

    if (!request.file) {
      response.status(400).send('No file uploaded.')
      console.log('request strangeness')
      return
    } 

    var file_name = 'images/'+ Date.now() + request.file.originalname, 
        file_data = request.file.buffer,
        file_type = request.file.mimetype

    uploadFile(file_name, file_data, file_type, function(data_ref, file_url, err) {
      if (err) {
        console.log(err)
        response.status(500).end()
      } else {

        console.log('----- file uploaded ------')
        // do something interesting with the data_ref and file_url
        response.send(file_url)
 
      }
      
    })
})











/* 
   ------------------------------------------------------------------------------------------
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



