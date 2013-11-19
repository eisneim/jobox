module.exports = function(DB){
	var route = {};

	route.home = function(req,res){
		res.render('home/index', { title: 'JobBox工作盒 - nodeJS 实战工程' });	
	};

	route.new_job = function(req,res){
		res.render('home/new_job', { title: '发布新的招聘信息' });	
	};

	route.test = function(){
		console.log('hello form test route');
	}


	return route;
}