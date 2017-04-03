//App.js

var express = require('express');
var app = express();
var serv = require('http').Server(app);

var db = require("mysql-native").createTCPClient('localhost', 3000);
var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'stargaze_logins'
});

connection.connect(function(e) {
		if(!e) {
			console.log("[Server]: Successfully connected to global database.");
		} else {
			console.log("ERROR");
		}
});


app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(3000);
console.log("[Server]: SERVER STARTED");

var Player = function(id,x,y) {
	var rand = Math.floor(Math.random()*3) + 1;
	if(rand == 1) {
		var color = "blue";
	} else if(rand == 2) {
		var color = "red";
	} else if(rand == 3) {
		var color = "green";
	}

	var self = {
		id: id,
		x: x,
		y: y,
		size: 5,
		speed: 3,
		trnPt1: [x,y],
		trnPt2: "undef",
		color: color,
		vx: 1,
		vy: 0,
		dead: true,
		immuneId: "none",
		logged: false
	};

	self.updatePosition = function() {
		if(!self.dead) {
			self.x += self.vx * self.speed;
			self.y += self.vy * self.speed;
			//Update player's pseudowall.
			if(self.trnPt1[0] < self.x) {
				//Player is to the left of their last turn pos.
				var wallXLength = self.x - self.trnPt1[0];
				var startpt = self.trnPt1;
			} else if(self.trnPt1[0] > self.x) {
				//Player is to the Right of their last turn pos.
				var wallXLength = self.trnPt1[0] - self.x;
				var startpt = [self.x, self.y];
			} else {
				//Player is on the same x-plane as their last turn pos.
				var wallXLength = 5;
			}

			if(self.trnPt1[1] < self.y) {
				//Player is below their last turn pos.
				var wallYLength = self.y - self.trnPt1[1];
				var startpt = self.trnPt1;
			} else if(self.trnPt1[1] > self.y) {
				//Player is above their last turn pos.
				var wallYLength = self.trnPt1[1] - self.y;
				var startpt = [self.x, self.y];
			} else {
				//Player is on the same y-plane as their last turn.
				var wallYLength = 5;
			}
			var id = self.id;
			var newPseudoWall = new Wall(id, startpt, wallXLength, wallYLength, self.color, self.id);
			//console.log(newPseudoWall);
			TEMP_WALL_LIST[self.id] = newPseudoWall;

		}
	}

	self.checkCollisions = function() {
		if(!self.dead) {
			for(var i in WALL_LIST) {
				var wall = WALL_LIST[i];
				//console.log(this.x + ", " + this.y + ", " + this.size + ", " + wall.startpt + ", " + wall.lengthX + ", " + wall.lengthY);
				//console.log(wall.ownerId);
				if(boxCollides([this.x, this.y],[this.size/2, this.size/2],[wall.startpt[0],wall.startpt[1]],[wall.lengthX, wall.lengthY])) {
					if(this.immuneId !== wall.id) {
						console.log("KILLING PLAYER");
						killPlayer(this.id);
					}
				}
			}

			for(var i in TEMP_WALL_LIST) {
				var wall = TEMP_WALL_LIST[i];
				if(boxCollides([this.x, this.y],[this.size/2, this.size/2],wall.startpt,[wall.lengthX, wall.lengthY])) {
					if(this.id !== wall.id) {
						killPlayer(this.id);
						console.log("KILLING PLAYER");
					}
				}
			}
		}
	}

	return self;
};

var Wall = function(id, startpt, lengthX, lengthY, color, ownerId) {
	var self = {
		id: id,
		startpt: startpt,
		lengthX: lengthX,
		lengthY: lengthY,
		color: color,
		ownerId: ownerId
	};
	return self;
};

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var WALL_LIST = [];
var TEMP_WALL_LIST = {};

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	var player = Player(socket.id,Math.random()*250,Math.random()*250);
	PLAYER_LIST[socket.id] = player;

	console.log('socket connection');
	socket.emit('returnId', socket.id);
	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
	});

	socket.on('keyPress', function(data) {
		var player = PLAYER_LIST[data.id];

		if(data.inputId === 'left') {
			if(PLAYER_LIST[data.id].vx !== 1) {
				PLAYER_LIST[data.id].vx = -1;
				PLAYER_LIST[data.id].vy = 0;
			}
		} else if(data.inputId === 'right') {
			if(PLAYER_LIST[data.id].vx !== -1) {
				PLAYER_LIST[data.id].vx = 1;
				PLAYER_LIST[data.id].vy = 0;
			}
		} else if(data.inputId === 'up') {
			if(PLAYER_LIST[data.id].vy !== 1) {
				PLAYER_LIST[data.id].vx = 0;
				PLAYER_LIST[data.id].vy = -1;
			}
		} else if(data.inputId === 'down') {
			if(PLAYER_LIST[data.id].vy !== -1) {
				PLAYER_LIST[data.id].vx = 0;
				PLAYER_LIST[data.id].vy = 1;
			}
		}
		player.trnPt2 = [player.x, player.y];
		generateWall(player);
	});

	socket.on("updateTempArray", function(data) {
			TEMP_WALL_LIST[data.id] = data.wall;
	});

	socket.on('loginAttempt', function(data) {
		console.log("login Attempt: " + data.username);
		connection.query('SELECT * FROM accounts WHERE username="' + data.username + '" AND password="' + data.password + '"', function(err, rows, fields) {
				if(!err) {
					if(rows.length > 0) {
						 socket.emit('correctLogin', {rows: rows});
						 PLAYER_LIST[socket.id].logged = true;
						 PLAYER_LIST[socket.id].dead = false;
					} else {
						console.log("[Database]: Failed to find this user and pass combination!");
						socket.emit('incorrectLogin', "");
					}
				} else {
					console.log("[Database]: Failed to query database!");
				}
		});
	});


});

function killPlayer(id) {
	var player = PLAYER_LIST[id];
	player.dead = true;
	//splayer.trnPt2 = [player.x, player.y];
	generateWall(player);
}

function generateWall(player) {
	//console.log("Top Of generate: " + player.trnPt1 + " " + player.x + " " + player.y)
	if(!player.dead) {
		if(player.trnPt1[0] < player.x) {
			//Player is to the left of their last turn pos.
			var wallXLength = player.x - player.trnPt1[0];
			var startpt = player.trnPt1;
		} else if(player.trnPt1[0] > player.x) {
			//Player is to the Right of their last turn pos.
			var wallXLength = player.trnPt1[0] - player.x;
			var startpt = [player.x, player.y];
		} else if(player.trnPt1[0] == player.x) {
			//Player is on the same x-plane as their last turn pos.
			var wallXLength = 5;
			var startpt = [player.x, player.y];
		}

		if(player.trnPt1[1] < player.y) {
			//Player is below their last turn pos.
			var wallYLength = player.y - player.trnPt1[1] + 5;
			var startpt = player.trnPt1;
		} else if(player.trnPt1[1] > player.y) {
			//Player is above their last turn pos.
			var wallYLength = player.trnPt1[1] - player.y;
			var startpt = [player.x, player.y];
		} else if(player.trnPt1[1] == player.y){
			//Player is on the same y-plane as their last turn.
			var wallYLength = 5;
			//var startpt = [player.x, player.y];
		}

		var id = Math.random();
		var newWall = new Wall(id, startpt, wallXLength, wallYLength, player.color, player.id);
		WALL_LIST.push(newWall);
		player.immuneId = id;
		player.trnPt1 = [player.x, player.y];
		player.trnPt2 = "undef";
		//console.log("Player Deets: " + player.trnPt1 + ", " + player.x + ", " + player.y);
		//console.log("Id: " + id + ", Start Point: " + startpt + ", XLength: " + wallXLength + ", YLength" + wallYLength);
	}
	return;
}

setInterval(function() {
	var player_pack = {};

	var wall_pack = WALL_LIST;
	for(var i in PLAYER_LIST) {
		var player = PLAYER_LIST[i];

		player.updatePosition();
		player.checkCollisions();
		player_pack[player.id] = {
			id: player.id,
			x: player.x,
			y: player.y,
			vx: player.vx,
			vy: player.vy,
			size: player.size,
			speed: player.speed,
			color: player.color,
			trnPt1: player.trnPt1,
			trnPt2: player.trnPt2,
			dead: player.dead,
			immuneId: player.immuneId,
			logged: player.logged
		};
	}


	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit("newPositions", {player_list: player_pack, wall_list: wall_pack, temp_wall_list: TEMP_WALL_LIST});
	}
}, 15);

function collides(x, y, r, b, x2, y2, r2, b2) {
	return !(r <= x2 || x > r2 || b <= y2 || y > b2);
}
//Checks collisions for boxes only.
//pos = item x and y coordinates. eg [0, 0]
//size = item dimensions (size). eg [50, 50];
//pos2 = item 2 x and y coordinates.
//size2 = item 2 dimensions (size).
function boxCollides(pos, size, pos2, size2) {
		return collides(pos[0], pos[1], pos[0] + size[0], pos[1] + size[1], pos2[0], pos2[1], pos2[0] + size2[0], pos2[1] + size2[1]);
}
