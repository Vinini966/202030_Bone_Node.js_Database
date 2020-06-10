var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GameSchema = new Schema({
    inventory:{
        type:Schema.Types.Mixed
    },
    playerPref:{
        type:Schema.Types.Mixed
    },
    user:{
        type:String,
        required:true
    }
});

mongoose.model('playerdata', GameSchema);

