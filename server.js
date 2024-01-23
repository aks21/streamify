// Requiring in-built https for creating 
// https server 
const https = require("https"); 
// Requiring file system to use local files 
const fs = require("fs");
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the PWA
app.use(express.static('public'));

// All GET requests that aren't to static files go to index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Creating object of key and certificate 
// for SSL 
const options = { 
  key: fs.readFileSync("server.key"), 
  cert: fs.readFileSync("server.cert"), 
}; 

// Start the server
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

// Creating https server by passing 
// options and app object 
https.createServer(options, app) 
.listen(3000, function (req, res) { 
  console.log("Server started at port 3000"); 
});