const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwtSecret = process.env.JWT_SECRET;
let UserSchema = new mongoose.Schema( {
	email: {
		type: String,
		required: true,
		trim: true,
		minlength: 5,
		unique: true,
		validate: {
			validator: validator.isEmail,
			message : '{VALUE} is not valid'
		}
	},
	password: {
		type : String,
		requred: true,
		minlength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
});

UserSchema.methods.toJSON = function () {
	let user = this;
	let userObject = user.toObject();

	return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function () {
	let user = this;
	let access = 'auth';
	let token = jwt.sign({_id: user._id.toHexString(), access}, jwtSecret).toString();

	user.tokens.push({
		access,
		token
	});
	return user.save().then(() => {
		return token;
	});
};

UserSchema.methods.removeToken = function (token) {
	let user = this;

	return user.update({
		$pull: {
			tokens: {token}
		}
	})
}

UserSchema.statics.findByToken = function (token) {

	let User = this;
	let decoded;

	try {
		decoded = jwt.verify(token, jwtSecret)
		console.log(JSON.stringify(decoded));
	} catch (e) {
		console.log('USER JWT ERRER');
		// return new Promise((resolve, reject) => {
		// 	reject();
		// })
		return Promise.reject();
	}


	return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
	//return User.findOne({'_id': decoded._id , tokens : {$elemMatch: { 'token' : token, 'access':'auth'}}});
};


UserSchema.pre('save', function(next) {

	let user = this;
	if (user.isModified('password')) {

		bcrypt.genSalt(10, (err,salt) => {
			bcrypt.hash(user.password, salt, (err, hash) => {
				user.password = hash;
				next();
			})
		})

	} else {
		next();
	}

})

let User = mongoose.model('User', UserSchema);

module.exports= {
	User
};