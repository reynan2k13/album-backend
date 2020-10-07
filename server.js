
const express    	= require('express');
const bodyParser 	= require('body-parser');
const app        	= express();
const morgan     	= require('morgan');
const cors 	   		= require('cors');
const serveStatic	= require('serve-static');
const path			= require('path');
const formidable  	= require('formidable');
const fs  			= require('fs');

// configure app
app.use(morgan('dev')); // log requests to the console
app.use(cors()); 
app.use(serveStatic(path.join(__dirname, '/album'))); // static path

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port     = process.env.PORT || 8888; 

const mongoose   = require('mongoose');
mongoose.connect('mongodb://testrestify:testrestify@ds157078.mlab.com:57078/restifycollection', { useUnifiedTopology: true , useNewUrlParser: true }); // connect to our database
const Photos     = require('./app/models/photos'); // photos model


const router = express.Router();


router.use((req, res, next) => {
	console.log('Event triggered.');
	next();
});


router.get('/health', (req, res) => {
	res.json({ message: 'OK' });	
});


router.route('/photos/list')
	.post((req, res) => {
		if(Number.isInteger(req.body.skip) && Number.isInteger(req.body.limit)){
			let documents = [];
			Photos.find((err, photos) => {
				if (err) res.send(err);
				for(const item of photos){
					documents.push({
						id : item._id,
						album : item.album,
						name : item.name,
						path : item.path,
						raw : item.raw
					})
				}
				res.json({
					message : 'OK',
					documents : documents,
					count : photos.length,
					skip : req.body.skip,
					limit : req.body.limit
					});
			}).skip(req.body.skip).limit(req.body.limit);
		}else{
			res.json({
				message : 'error value of limit or skip'
			})
		}
	});

router.route('/photos')
	
	.put((req, res) => {
		const sendResponse = true;
		const form = new formidable.IncomingForm();
		let files = [];
		let filePath = "";
		form.uploadDir = __dirname + '/uploads'; 

		form
			.on('field', (album, category) => {
				filePath =  album + '/' + category;
			})
			.on('file', (field, file) => {
				files.push([field, file]);
			})
			.on('end', () => {
				console.log('-> upload done');
			});

			form.parse(req, (err)=> {
				if(!err){
					const documents = [];
					for(let i=0; i<files.length;i++){
						fs.rename(files[i][1].path, filePath +'/'+ files[i][1].name, function (error) {
							if (error) {
								fs.unlink(filePath +'/'+ files[i][1].name);
								fs.rename(files[i][1].path, filePath +'/'+files[i][1].name);
							}
						});

						var photos = new Photos();		
						photos.album = filePath.split('/')[1];
						photos.name = files[i][1].name;
						photos.path = '/' + filePath +'/'+files[i][1].name;
						photos.raw = 'http://localhost:'+port+'/'+ photos.album +'/'+ files[i][1].name;
						documents.push({
							album : photos.album,
							name : photos.name,
							path : photos.path,
							raw : photos.raw
						})
						photos.save(function(err) {
							if (err){
								res.send(err);
								sendResponse = false
							} 
						});
					}
					if(sendResponse)
						res.json({
							message : 'OK',
							documents : documents,
						});
				}
			});

	})

	.delete((req, res) => {
		const sendResponse = true;
		for(const item of req.body){
			let {album ,documents} = item;
			if(album && documents){
				let name = documents.split(',');
				Photos.deleteMany({
					album: album,
					name : { $in: name}
				}, (err) => {
					if (err){
						res.send(err);
						sendResponse = false;
					}
				});
		
				name.forEach(val => {
					try {
						fs.unlinkSync((path.resolve(__dirname + '/album/'+ album + '/'+val))) //remove file in the path folder
					} catch(err) {
						console.error(err)
					}
				})
			}
		}
		if(sendResponse) res.json({ message: 'OK' });
	});


app.use('/', router);

app.listen(port);
console.log('Server is listening on port ' + port);
