var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GameSchema = new Schema({
    savedata:{
        type:String
    },
    user:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    }
});

mongoose.model('playerdata', GameSchema);

