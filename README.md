# Node.js server hooked up to Firebase Database and Google Cloud Storage



## Establish Connections (create .env file to store process variables): 

### Firebase: 

#### https://firebase.google.com/docs/web/setup
#### https://console.firebase.google.com/

1) + Add Project

2) Add Firebase to your app
```sh
	{ Example response
		<script>
		  // Initialize Firebase
		  var config = {
		    apiKey: "xxxxxx",
		    authDomain: "xxxxxx.firebaseapp.com",
		    databaseURL: "https://xxxxxx.firebaseio.com",
		    projectId: "xxxxxx",
		    storageBucket: "xxxxxx.appspot.com",
		    messagingSenderId: "xxxxxx"
		  };
		  firebase.initializeApp(config);
		</script>
	}
```

3) Add apiKey, authDomain, databaseURL, projectId, and storageBucket in .env file


### Google Cloud Storage

#### https://firebase.google.com/docs/storage/
#### https://console.cloud.google.com

0) Setup public access to your Firebase database & Storage

	- firebase console -> Database tab -> Rules tab 
	- rules:
	```sh
		{
		  "rules": {
		    ".read": "auth == null",
		  	".write": "auth == null"
		  }
		}
	```

	- firebase console -> Storage tab -> Rules tab 
	- rules:
	```sh
		service firebase.storage {
		  match /b/{bucket}/o {
		    match /{allPaths=**} {
		      allow read, write;
		    }
		  }
		}
	```
	- https://firebase.google.com/docs/storage/security/start#sample-rules

1) Create a Cloud Storage project by using the drop down on the top left next to Google Cloud Platform logo

2) Click on the Credentials tab, create a new credential file
	- Service account key
		- Service account: App Engine default service account
		- Key type: JSON

	- Your private key .json file should automatically download


3) Rename and store private key file as private_key.json file in the server's main directory, ADD TO .gitignore!!

4) Add private_key.json filename as STORAGE_KEY_FILENAME into .env file




## Running Locally

```sh
$ npm install
$ nodemon ./server.js localhost 5000
$ npm start
```



