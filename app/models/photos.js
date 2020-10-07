const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const PhotosSchema   = new Schema({
	album : {type : String},
	name : {type : String},
	path : {type : String},
	raw : {type : String},
}, { versionKey: false });

module.exports = mongoose.model('Photos', PhotosSchema);