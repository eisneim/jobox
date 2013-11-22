module.exports = function(DB){
	var route = {};
	var passport = require('../auth')(DB);
	var hash = require('../pass').hash;


	route.home = function(req,res){
		// console.log(JSON.stringify(req.flash('alert'));
			// console.log(req.flash('alert'));
		res.render('home/index', { 
			title: 'JobBox工作盒 - nodeJS 实战工程',
			error:req.flash('error'),
			message:req.flash('message'),
			auth:req.session.passport.user
		});

	};

// handle user authentication
	route.signup = function(req,res){
		// res.send('show login in form');
		res.render('user/signup',{title:'JobBox工作盒 - 注册新用户'})
	}
	route.signup_post = function(req,res){
		var b = req.body;
		//simple validate
		if ( b.password == b.password_confirm ) {
			hash(b.password, function (err, salt, hash) {
		        if (err) throw err;
		        var new_user = {
						username: b.username,
						email: b.email,
						salt : salt,
						hash : hash
					};

				//determin user role
		        if (b.role == 'employee' ) {
		        	new_user.publisher=false;
				}else{
					new_user.publisher=true;
				}
				
				console.log(new_user);
				//insert into db
				DB.user.create(new_user,function(err,user){
					if (err) throw err;
					req.flash('message','welcome');
					res.redirect('/')
					// passport.authenticate('local',{
					// 	failureRedirect:'/',
					// 	successRedirect:'/dashboard',
					// 	failureFlash: '用户名或者密码不正确.'
					// });

				});//end of db create

		    });//end of hash
		}else{
			req.flash('error', '两次密码不匹配');
			res.redirect('/');
		}

		


	};//end of route

	route.dashboard = function(req,res){
		res.render('user/dashboard',{
			title:'JobBox工作盒 - 个人中心',
			error:req.flash('error'),
			message:req.flash('message'),
			auth:req.session.passport.user
		});
		
	}
	route.logout = function(req,res){
		req.session.passport.user = null;
		req.flash('error', '您已登出');
		res.redirect('/');
	}
	// 
	route.new_job = function(req,res){
		res.render('home/new_job', { title: '发布新的招聘信息' ,
			error:req.flash('error'),
			message:req.flash('message'),
			auth:req.session.passport.user});	
	};


	route.test = function(){
		console.log('hello form test route');
	}


	return route;
}