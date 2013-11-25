
var express = require('express');
var http = require('http');
var path = require('path');
//session
var MongoStore = require('connect-mongo')(express);
var flash = require('connect-flash');

var expressValidator = require('express-validator'); //Declare Express-Validator
var app = express();

var mongoose = require('mongoose');

// establish a db connection 
mongoose.connect('mongodb://localhost/job-site');
// ========================== db setup ============
var Schema= mongoose.Schema;
var UserSchema = new Schema({
		username:{ type: String, trim: true },
		email:{ type: String,unique:'此email地址已存在'},
		password:{type:String},
		salt: String,
    	hash: String,
		phone:{ 
			type: Number, 
			// max:[13, ' `{PATH}`项的值: ({VALUE}) 超过了最大值 ({MAX}).']
			// min:
			},
		description:String,
		publisher:{ type:Boolean,default: false},
		published:Array,
		applied:Array,
	}),
	JobSchema = new mongoose.Schema({
		title:String,
		company:String,
		city:String,
		salary:{ type: String, default: '3000-5000' },
		category:String,
		hire_number:Number,
		require_exp:String,
		isend:{ type: Boolean, default: false },
		vote:Number,
		description:String
	});
var DB={
		user: mongoose.model('User',UserSchema),
		job:mongoose.model('Job',JobSchema),
		ObjectId:mongoose.Types.ObjectId
	}
//======routes == 
var routes = require('./routes')(DB);
var passport = require('./auth')(DB);


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
//use session
app.use(express.cookieParser('somestring'));
app.use(express.session({
	secret:'saklsd890lldfqwxcgqnjlds',
	store:new MongoStore({
		mongoose_connection: mongoose.connection
	}),
	cookie: { maxAge: 60000 }
}));
app.use(flash());
// app.use(express.csrf());
// ======auth===================
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());


// =================================app vars meddleware======
 app.use(function(req, res, next)
	{
        // res.locals.req = req;
        // res.locals.session = req.session;
        // console.log(JSON.stringify(req.session));
        res.locals.test_val = 'test value';
        res.locals.csrf = req.session ? req.session._csrfSecret : '';
        // console.log( 'secret: '+req.session._csrfSecret  );
        next();
    });

app.locals({
    // token: function(req, res) {
    //     return req.session._csrfSecret;
    // },

});
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));  //required for Express-Validator
// ===========before router is middleware === 
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// =======err handling ============

// app.use(function(err, req, res, next) {
//     if(!err) return next(); // you also need this line
//     console.log("error!!!:"+err);
//     res.send("error!!!:"+err);
// });

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
//==========================route filter===========
function auth_filter(req, res, next) {
  if (req.session.passport.user) {
    next();
  } else {
    req.flash('error','请登录');
    res.redirect('/');
  }
}
function publish_filter(req,res,next){
	if(req.session.passport.user){
		var user = req.session.passport.user;
		if (user.publisher) {
			next();
		}else{
			req.flash('error','您不是发布者，无法发布招聘信息');
    		res.redirect('/');
		}
	}else{
		req.flash('error','你还没登录呢');
    	res.redirect('/');
	}
}


// =================================routes =========
app.get('/', routes.home);
app.post('/', routes.job_filter);
app.get('/category/:category', routes.home);
app.get('/job/new',publish_filter,routes.new_job);
app.post('/job/new', routes.new_job_post);
app.get('/job/:id',routes.show_job);
app.get('/job/edit/:id', routes.edit_job);
app.post('/job/edit/:id', routes.edit_job_post);
app.get('/job/delete/:id', routes.delete_job);
// app.get('/login', routes.login);
app.post('/login',passport.authenticate('local',{
	failureRedirect:'/',
	successRedirect:'/dashboard',
	failureFlash: '用户名或者密码不正确.'
}));

app.get('/signup', routes.signup);
app.post('/signup', routes.signup_post);

app.get('/logout', routes.logout);
app.get('/dashboard',auth_filter,routes.dashboard);
// app.get('/apply', routes.apply);
// routes.test();

app.get('/test',routes.test);

//======server ======
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
