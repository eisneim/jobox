module.exports = function(DB){
	var route = {};
	var passport = require('../auth')(DB);
	var hash = require('../pass').hash;

// =======
var city_array = ['北京','上海','成都','杭州','广州','其他'],
	salary_array = ['1k-3k','3k-5k','5k-7k','7k-10k'],
	category_array = ['IT/互联网','电子/通信','市场/销售','人事/管理','贸易/物流','医疗/护理','教育/培训','制造/生产'];

function job_form_validate(req){
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
// this func will format Date object : 2013-12-6
Date.prototype.yyyymmdd = function() {         
                                
    var yyyy = this.getFullYear().toString();                                    
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = this.getDate().toString();                                 
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}; 
// ==================================
	route.home = function(req,res){
		//do pagindation
		var pageNumber = req.param('page')?req.param('page')-1 : 0,
			perPage = 2;

		var condition = req.params.category? {category:(req.params.category).replace(/-/,'/')}:{};
		//get job info ,and do pagination 
		DB.job.find(condition,{_id:1,title:1,city:1,company:1,salary:1})
			.skip(pageNumber * perPage )
			.limit( perPage ).exec(function(err,jobs){
				// if err ?
				DB.job.count({},function(err,count){ 
					// console.log(pageNumber);
					res.render('home/index', { 
						title: 'JobBox工作盒 - nodeJS 实战工程',
						error:req.flash('error'),
						message:req.flash('message'),
						auth:req.session.passport.user,
						category_array:category_array,
						city_array:city_array,
						salary_array:salary_array,
						active_category: req.params.category,
						totle_page: Math.round(count/perPage),
						current_page:pageNumber,
						jobs:jobs
					});
				});//count
			});

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

		DB.job.find(condition,{_id:1,title:1,city:1,company:1,salary:1},function(err,jobs){
			res.render('home/index', { 
					title: 'JobBox工作盒 - nodeJS 实战工程',
					error:req.flash('error'),
					message:req.flash('message'),
					auth:req.session.passport.user,
					category_array:category_array,
					city_array:city_array,
					salary_array:salary_array,
					active_category: req.params.category,
					jobs:jobs
				});
		});
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
// handle user authentication
	route.signup = function(req,res){
		// res.send('show login in form');
		res.render('user/signup',{title:'JobBox工作盒 - 注册新用户',
				error:req.flash('error'),
				message:req.flash('message'),
			});
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
						hash : hash,
						phone:b.phone
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
		if (req.session.passport.user.publisher) {
			//published job's _id
			DB.user.findOne({email:req.session.passport.user.email},{_id:1,published:1},function(err,publisher){
				// res.send(JSON.stringify(publisher.published );
				DB.job.find({_id:{$in:publisher.published } },function(err,jobs){
					// res.send(JSON.stringify(jobs));
					// if err 
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
			
		}else{
			res.render('user/dashboard',{
				title:'JobBox工作盒 - 个人中心',
				error:req.flash('error'),
				message:req.flash('message'),
				auth:req.session.passport.user
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

			DB.user.update({published:DB.ObjectId(req.params.id ) },
				{$pull:{ published:DB.ObjectId(req.params.id) }},
				function(err,user){
				
				if (err) return handleError(err);
				req.flash('message','该招聘信息已删除');
				res.redirect('/dashboard');
			})
		});
	}

	route.test = function(req,res){
		DB.user.find({published:DB.ObjectId("5291b49eb445910000000001")},function(err,user){
			res.json(user);
		});
	}


	return route;
}