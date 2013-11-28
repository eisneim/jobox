module.exports = function(DB){
	var route = {};
	var passport = require('../auth')(DB);
	var hash = require('../pass').hash;

// =======
var city_array = ['北京','上海','成都','杭州','广州','其他'],
	salary_array = ['1k-3k','3k-5k','5k-7k','7k-10k'],
	category_array = ['IT/互联网','电子/通信','市场/销售','人事/管理','贸易/物流','医疗/护理','教育/培训','制造/生产'];

function job_form_validate(req){
	req.sanitize('title').trim();
	req.sanitize('company').trim();
	req.sanitize('hire_number').trim();
	req.sanitize('require_exp').trim();
	req.sanitize('description').trim();
	req.assert('title', '标题为必填项且不超过50字').len(3,50).notEmpty();
    req.assert('company', '公司为必填项').notEmpty();
    req.assert('city', '请选择正确的城市').notEmpty().isIn(city_array);
    req.assert('salary', '请选择正确的工资范围').notEmpty().isIn(salary_array);
    req.assert('category', '请选择正确分类').notEmpty().isIn(category_array);
    req.assert('hire_number', '招聘人数必填,且必须为数字').notEmpty().isNumeric();
    req.assert('require_exp', '经验要求必填').notEmpty();
    req.assert('description', '工作描述必填且不少于10字').notEmpty().len(10,1000);

    return req.validationErrors();
}
function login_form_validate(req){
	req.assert('email', '请输入正确的email地址').isEmail().notEmpty();
	req.assert('password', '密码必填且必须在4至12字之间').len(4,12).notEmpty();
	return req.validationErrors();
}
function signup_form_validate(req){
	req.sanitize('username').trim();
	req.assert('username', '用户名必须在2至10个字符之间').len(2,10).notEmpty();
	req.assert('email', '请输入正确的email地址').isEmail().notEmpty();
	req.assert('password', '密码必填且必须在4至12字之间').len(4,12).notEmpty();
	req.assert('password_confirm', '两次密码不一致！').equals(req.body.password).notEmpty();
	req.assert('phone', '请输入合法的电话号码!').isNumeric().len(4,15).notEmpty();
	return req.validationErrors();
}
// this func will format Date object : 2013-12-6
Date.prototype.yyyymmdd = function() {         
                                
    var yyyy = this.getFullYear().toString();                                    
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = this.getDate().toString();                                 
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}; 
function md5(str){
    var hash = require('crypto').createHash('md5');
    return hash.update(str+"").digest('hex');
}
// ======================================
	route.home = function(req,res){
		//do pagindation
		var pageNumber = req.param('page')?req.param('page')-1 : 0,
			perPage = 3;

		var condition = req.params.category? {category:(req.params.category).replace(/-/,'/')}:{};
		
		if (req.filter_condition) {
			condition = req.filter_condition;
			// console.log('home condition:'+JSON.stringify( req.filter_condition ));
		};

		//get job info ,and do pagination 
		DB.job.find(condition).select('_id title city company salary').sort('-_id')
			.skip(pageNumber * perPage )
			.limit( perPage ).exec(function(err,jobs){
				// if err ?
				//count for pagindation
				DB.job.count(condition,function(err,count){ //
					
					//get online user from session 
					DB.session.find({},function(err,users){
						// var user = users[0];
						// for(var key in user){
						// 	console.log(key);
						// }

						// console.log(JSON.parse(user._doc.session).passport.user.email);
						//extract user info from session string
						var online_users = [],online_user={};
						for(var index =0;index<users.length; index++){

							var i = JSON.parse(users[index]._doc.session);
							//when someone logout ,the session exits but passport.user ==null
							if (!i.passport.user) continue;

							online_user = {
								username: i.passport.user.username ,
								email_md5: md5( i.passport.user.email )
							}
							online_users.push(online_user);
						}
						
						//find most poplular job,by looking at how many applicants they have
						DB.job.aggregate(
							{ $project :{title:1,applicants:1 } },
							{ $unwind : "$applicants" },
							{ $group : { _id : "$_id", len : { $sum : 1 },title:{$addToSet:'$title'} } },
							{ $sort : { len : -1 } },
							{ $limit : 3 }
						).exec(function(err,hot_jobs){
							
							res.render('home/index', { 
								title: 'JobBox工作盒 - nodeJS 实战工程',
								//
								error:req.flash('error'),
								message:req.flash('message'),
								auth:req.session.passport.user,
								//
								category_array:category_array,
								city_array:city_array,
								salary_array:salary_array,
								active_category: req.params.category,
								//pagination
								totle_page: Math.round(count/perPage),
								current_page:pageNumber,
								//online user
								online_users:online_users,
								visiter_nubmer:users.length,
								hot_jobs:hot_jobs,
								jobs:jobs
							});
						});//end of find hot job
						
					});//online user
				});//count
			});//job

	};
	route.job_filter = function(req,res){
		var condition = {};

		if (req.body.category) {
			condition = {
				salary:req.body.salary,city:req.body.city,category:req.body.category 
			};
		}else{

			condition = {salary:req.body.salary,city:req.body.city};
		}
		req.filter_condition = condition;
		return route.home(req,res);
	}

	route.show_job = function(req,res){
		DB.job.findOne({_id:req.params.id},function(err,job){
			// if err do something
			if (err|| !job) {
				req.flash('error','你要找的招聘信息不纯在');
				res.redirect('/');
				return false;
			};
			res.render('home/job',{
				title: 'JobBox工作盒 - '+job.title,
					error:req.flash('error'),
					message:req.flash('message'),
					auth:req.session.passport.user,
					category_array:category_array,
					city_array:city_array,
					salary_array:salary_array,
					job:job
			});
		});
	}
	route.apply_job = function(req,res){

		// firs check if this user already applied this job before
		var check_exists=false;
		req.session.passport.user.applied.forEach(function(job_id){
			if (req.params.id == job_id) check_exists=true;
			// console.log('jobid:'+job_id);
		});

		if ( check_exists ) {
			req.flash('error','你已申请过该工作，发布者将会尽快联系你');
			return res.redirect('/job/'+ req.params.id );
		};

		DB.job.update(
			{_id:req.params.id},
			{$push:{applicants:req.session.passport.user._id}},
			function(err,job){
				if (err) return handleError(err);

				//now push job id to user's applied filed
				DB.user.update(
					{_id:req.session.passport.user._id},
					{$push:{applied:req.params.id}},
					function(err,user){
						//now update session info,cause session only update when user login
						req.session.passport.user.applied.push(req.params.id);

						req.flash('message','成功申请该工作,发布者将会尽快联系你');
						res.redirect('/job/'+ req.params.id );
				});//end of push job id
		});//push userid to job

	}

	route.cancel_job = function(req,res){
		var job_id = req.params.id,
			user_id = req.session.passport.user._id;
		DB.job.update({_id: job_id },{$pull:{applicants: user_id }},function(err,job){
			DB.user.update({_id: user_id},{$pull:{applied:job_id }},function(){
				if (err) return handleError(err);

				//we must remove id from session as well, display dashboard will need it
				var i = req.session.passport.user.applied.indexOf(job_id);
				if(i != -1) {
					req.session.passport.user.applied.splice(i, 1);
				}
				
				req.flash('message','您已取消该工作的申请');
				res.redirect('/dashboard');
			});

		});
	}

// handle user authentication
	route.signup = function(req,res){
		// res.send('show login in form');
		res.render('user/signup',{title:'JobBox工作盒 - 注册新用户',
				error:req.flash('error'),
				message:req.flash('message'),
				form_err:req.flash('form_err')
			});
	}
	route.signup_post = function(req,res){
		var b = req.body;
		//simple validate

		var errors = signup_form_validate(req);

		if ( !errors ){
			// console.log('no err:'+errors);
			hash(b.password, function (err, salt, hash) {
		        if (err) return handleError(err);
		        var new_user = {
						username: b.username,
						email: b.email,
						salt : salt,
						hash : hash,
						phone:b.phone
					};

				//determin user role
		        if (b.role == 'employee' ) {
		        	new_user.publisher=false;
				}else{
					new_user.publisher=true;
				}
				
				// console.log(new_user);
				//insert into db
				DB.user.create(new_user,function(err,user){
					if (err) throw err;
					req.flash('message','您已成功注册，现在就试试登录吧。');
					res.redirect('/')
					// passport.authenticate('local',{
					// 	failureRedirect:'/',
					// 	successRedirect:'/dashboard',
					// 	failureFlash: '用户名或者密码不正确.'
					// });

				});//end of db create

		    });//end of hash
		}else{
			req.flash('form_err',errors);
			res.redirect('/signup');
		}

	};//end of route

	route.dashboard = function(req,res){
		if (req.session.passport.user.publisher) {
			//published job's _id
			DB.user.findOne({email:req.session.passport.user.email},{_id:1,published:1,applicants:1},function(err,publisher){
				// res.send(JSON.stringify(publisher.published );
				DB.job.find({_id:{$in:publisher.published }},
					{title:1,applicants:1}).populate('applicants').exec(function(err,jobs){
					// res.send(JSON.stringify(jobs));
					// if err 
					console.log( jobs[0]);

					res.render('user/dashboard_publisher',{
						title:'JobBox工作盒 - 管理招聘信息',
						error:req.flash('error'),
						message:req.flash('message'),
						auth:req.session.passport.user,
						jobs:jobs
					});

				});
			});

			//get the job
			// DB.job.find({ })
			
		}else{//normal user's dashboard

			DB.job.find({ _id:{$in:req.session.passport.user.applied} },
				{title:1},
				function(err,jobs){

					res.render('user/dashboard_user',{
						title:'JobBox工作盒 - 个人中心',
						error:req.flash('error'),
						message:req.flash('message'),
						auth:req.session.passport.user,
						jobs:jobs
					});

			});

			
		};
		
	}
	route.logout = function(req,res){
		req.session.passport.user = null;
		req.flash('message', '您已登出');
		res.redirect('/');
	}
	// 
	route.new_job = function(req,res){
		res.render('home/new_job', { title: '发布新的招聘信息' ,
			error:req.flash('error'),
			message:req.flash('message'),
			auth:req.session.passport.user,
			city_array:city_array,
			salary_array:salary_array,
			category_array:category_array,
			form_err:req.flash('form_err')
		});	
	};

	route.new_job_post = function(req,res){

	    var errors = job_form_validate(req);
	    if( !errors){   //No errors were found.  Passed Validation!
	        // req.flash('message','passed');
	        // res.redirect('/job/new');
	        var b = req.body;
	        DB.job.create({
	        	title: b.title,
	        	company: b.company,
	        	city: b.city,
	        	salary: b.salary,
	        	category: b.category,
	        	hire_number: b.hire_number,
	        	require_exp: b.require_exp,
	        	description: b.description
	        },function(err,job){
	        	if(!err){
	        		DB.user.update({email: req.session.passport.user.email},
	        			{ $push:{ published:job._id } },false,function(err,user){
	        				if (err) throw err;
	        				req.flash('message','成功发布新招聘信息');
	        				res.redirect('/');
	        			});
	        	}
	        });

	    }
	    else {   //Display errors to user
	        req.flash('form_err',errors);
	        res.redirect('/job/new');
	    }
	}
	route.edit_job = function(req,res){
		DB.job.findOne({_id:req.params.id },function(err,job){
			// if err
			res.render('home/edit_job',{
				title:'JobBox工作盒 - 编辑招聘信息',
				error:req.flash('error'),
				message:req.flash('message'),
				auth:req.session.passport.user,
				city_array:city_array,
				salary_array:salary_array,
				category_array:category_array,
				form_err:req.flash('form_err'),
				job:job
			});
		})
	}
	route.edit_job_post = function(req,res){
	    var errors = job_form_validate(req);
	    if( !errors){   //No errors were found.  Passed Validation!
	    	var b = req.body;
	        DB.job.update({_id:req.params.id},{$set:{
	        	title: b.title,
	        	company: b.company,
	        	city: b.city,
	        	salary: b.salary,
	        	category: b.category,
	        	hire_number: b.hire_number,
	        	require_exp: b.require_exp,
	        	description: b.description
	        }},function(err,job){
	        	if(!err){
	        		DB.user.update({email: req.session.passport.user.email},
	        			{ $push:{ published:job._id } },false,function(err,user){
	        				// if (err) throw err;
	        				req.flash('message','成功更新招聘信息');
	        				res.redirect('/job/'+req.params.id);
	        			});
	        	}else{
	        		res.send(err);
	        	}
	        });

	    }else {   //Display errors to user
	        req.flash('form_err',errors);
	        res.redirect('/job/edit/'+req.params.id);
	    }
	}

	route.delete_job = function(req,res){
		DB.job.remove({_id:req.params.id },function(err,job){
			if (err) return handleError(err);
			//if job is removed, job's id must be removed in the user's collection
			//if not, app will crush due to broken relation.
			DB.user.update({$or:[{ published:DB.ObjectId(req.params.id )},{applied:DB.ObjectId(req.params.id )}]},
				{$pull:{ published:DB.ObjectId(req.params.id),applied:DB.ObjectId(req.params.id) }},
				function(err,user){
				
				if (err) return handleError(err);
				req.flash('message','该招聘信息已删除');
				res.redirect('/dashboard');
			})
		});
	}

	route.test = function(req,res){
		//get 3 most applied job
		DB.job.aggregate(
			{ $project :{title:1,applicants:1 } },
			{ $unwind : "$applicants" },
			{ $group : { _id : "$_id", len : { $sum : 1 },title:{$addToSet:'$title'} } },
			{ $sort : { len : -1 } },
			{ $limit : 3 }
		).exec(function(err,jobs){
			console.log(jobs);
			res.json(jobs);
		});

	}


	return route;
}