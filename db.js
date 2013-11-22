var mongoose = require('mongoose');

// establish a db connection 
var connections = mongoose.connect('mongodb://localhost/job-site');

var Schema= mongoose.Schema;
var UserSchema = new Schema({
		name:{ type: String, trim: true ,unique:true},
		email:{ type: String, required: '{PATH} 是必填项!' },
		password:String,
		salt: String,
    	hash: String,
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
		isend:{ type: Boolean, default: false },
		vote:Number,
		description:String
	});
// var DB={
// 		user: mongoose.model('User',UserSchema),
// 		job:mongoose.model('Job',JobSchema)
// 	}

module.exports = {
	connetion: connections,
	user: mongoose.model('User',UserSchema),
	job:mongoose.model('Job',JobSchema)
};