const express = require('express')
const fileUpload = require('express-fileupload');
const fs = require('fs')
const path = require('path')
const app = express()
const crypto = require('crypto');

app.use(express.static(path.join(__dirname, 'public')))
app.use(fileUpload());

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.htm'))
})
app.get('/upload', function(req, res) {
  res.sendFile(path.join(__dirname + '/upload.htm'))
})

app.post('/upload', function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  let sampleFile = req.files.sampleFile;
  sampleFile.name = crypto.createHash('md5').update(sampleFile.name).digest('hex') + '.mp4';
  sampleFile.mv(__dirname + `/assets/${sampleFile.name}`, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send(`File uploaded! <a href="http://localhost:3000/video/${sampleFile.name.slice(0, -4)}" target="_blank">Player</a>`);
  });
});

app.get('/video/:video', function(req, res) {  
  const path = `assets/${req.params.video}.mp4`
  if(!fs.existsSync(path)){
    res.status(404).send('File not found');
  }
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1

    if(start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n'+start+' >= '+fileSize);
      return
    }
    
    const chunksize = (end-start)+1
    const file = fs.createReadStream(path, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }

    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
})

app.listen(3000, function () {
  console.log('Listening on port 3000!')
})
