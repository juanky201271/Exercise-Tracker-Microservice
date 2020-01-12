const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }); 

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var UserSchema = new mongoose.Schema({
  _id: Number,
  username: String
});

var UserModel = mongoose.model("UserModel", UserSchema);

var ExerciseUserSchema = new mongoose.Schema({
  userId: Number,
  description: String,
  duration: Number,
  date: String
});

var ExerciseUserModel = mongoose.model("ExerciseUserModel", ExerciseUserSchema);

app.post('/api/exercise/new-user', function(req,res) {
  var q = UserModel.find().count();
  q.exec(function(err,data) {
    if (err) {
      return console.log(err);
    } else {
      if (data === 0 || data === null) {
        var doc = new UserModel({username:req.body.username ,_id:1});
        doc.save(function(err,d) {
          if (err) {
            return console.error(err);
          } else {
            res.json({username:req.body.username ,_id:1});
          }
        });
      } else {
        var doc = new UserModel({username:req.body.username ,_id:(data + 1)});
        doc.save(function(err,d) {
          if (err) {
            return console.error(err);
          } else {
            res.json({username:req.body.username ,_id:(data + 1)});
          }
        });
      }
    }
  });
});

app.get('/api/exercise/users', function(req,res) {
  var q = UserModel.find().select({username: 1, _id: 1});
  q.exec(function(err,data) {
    if (err || data === null) {
      return console.log(err);
    } else {
      res.json(data);
    }
  });
});

app.post('/api/exercise/add', function(req,res) {
  var d = new Date(req.body.date);
  console.log(d);
  var ds = '';
  if (d.toString() === 'Invalid Date') {
    ds = new Date().toISOString().substr(0,10);
  } else {
    ds = d.toISOString().substr(0,10);
  }
  console.log(ds);
  var q = UserModel.findById(req.body.userId, 'username');
  q.exec(function(err,data) {
    if (err || data === null) {
      res.json({'error': 'User not found'});
      return console.log(err);
    } else {
      var doc = new ExerciseUserModel({userId: req.body.userId, description: req.body.description, duration: req.body.duration, date: ds});
      doc.save(function(err,d) {
        if (err) {
          return console.error(err);
        } else {
          res.json({userId: req.body.userId, username: data.username, description: req.body.description, duration: req.body.duration, date: ds});
        }
      });
    }
  });
});

app.get('/api/exercise/log', function(req,res) {
  var userId = req.query.userId;
  var from = new Date(req.query.from);
  if (from.toString() === 'Invalid Date') {
    from = '';
  } else {
    from = from.toISOString().substr(0,10);
  }
  var to = new Date(req.query.to);
  if (to.toString() === 'Invalid Date') {
    to = '';
  } else {
    to = to.toISOString().substr(0,10);
  }
  var limit = Number(req.query.limit);
  if (limit.toString() === 'NaN') {
    limit = -1;
  }
  
  var vquery = '';
  vquery = '"userId": " ' + userId + '"';
  if (from != '' && to == '') {
    vquery += ', "date": {"$gte": "' + from + '"}';
  }
    if (to != '' && from == '') {
    vquery += ', "date": {"$lte": "' + to + '"}';
  }
  if (from != '' && to != '') {
    vquery += ', "date": {"$gte": "' + from + '", "$lte": "' + to + '"}';
  }
  
  
  var vqueryJSON = JSON.parse('{' + vquery + '}');
  var q = UserModel.findById(userId, 'username');
  q.exec(function(err,data) {
    if (err || data === null) {
      res.json({'error': 'User not found'});
      return console.log(err);
    } else {
      var q = ExerciseUserModel.find(vqueryJSON).count();
      if (limit >= 0) {
        q = q.limit(limit);
      }
      q.exec(function(err,dat) {
        if (err) {
          return console.log(err);
        } else {
          if (dat === 0 || dat === null) {
            res.json({_id: userId, username: data.username, count: 0, log: []});
          } else {
            var q = ExerciseUserModel.find(vqueryJSON).select({_id: 0, userId: 0, __v: 0});
            if (limit >= 0) {
              q = q.limit(limit);
            }
            q.exec(function(err,da) {
              if (err || da === null) {
                return console.log(err);
              } else {
                res.json({_id: userId, username: data.username, count: dat, log: da});
              }
            });
          }
        }
      });
    }
  });
});





// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
