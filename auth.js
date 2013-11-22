
// passport.use(new LocalStrategy({
//     usernameField: 'email',
//     passwordField: 'password'
//   },
// 	function(username, password, done) {
// 		if (username === 'admin' && password === 'lynda') {
// 			return done(null, {username: 'admin'});
// 		}

// 		return done(null, false);
// 	}
// ));



module.exports = function(DB){
	var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy;

	var hash = require('./pass').hash;

	passport.use(new LocalStrategy({
	    usernameField: 'email',
	    passwordField: 'password'
	  },
		function(username, password, done) {
		    DB.user.findOne({ email: username }, function(err, user) {
			    if (err) { return done(err); }
			    if (!user) {
			        return done(null, false, { message: '用户不存在' });
			    }
				hash(password, user.salt, function (err, hash) {
				    if (err) return fn(err);
				    if (hash == user.hash) return done(null, user);
				    done(new Error('错误密码'));
				});
			      // return done(null, user);
			    });
		  }//end func
	  ));//end passport use

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, {user: user});
	});

	return passport;
};

