
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
// ========db ==
// 
mongoose.connect('mongodb://localhost/job-site');
var Schema= mongoose.Schema;
var UserSchema = new Schema({
		name:{ type: String, trim: true ,unique:true},
		email:{ type: String, required: '{PATH} 是必填项!' },
		password:String,
		phone:{ 
			type: Number, 
			max:[13, ' `{PATH}`项的值: ({VALUE}) 超过了最大值 ({MAX}).']
			// min:
			},
		description:String,
		publisher:{ type:Boolean,default: false},
		published:[{
			job_id:Schema.Types.ObjectId,
		}],
		applied:[{
			job_id:Schema.Types.ObjectId,
			bio:String
		}]
	}),
	JobSchema = new mongoose.Schema({
		title:String,
		company:String,
		city:String,
		salary:{ type: String, default: '3000-5000' },
		category:String,
		hire_number:Number,
		require_exp:String,
		start:String,
		end:String,
		vote:Number,
		description:String
	});
var DB={
		user: mongoose.model('User',UserSchema),
		job:mongoose.model('Job',JobSchema)
	}

//======routes == 
var routes = require('./routes')(DB);


app.get('/', routes.home);
// routes.test();

app.get('/1234',function(req,res){
	res.send('sdfs');
});



//======server ======
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
