var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext('2d');

// VARIABLES //
///////////////

//Classes

var player = {x: };

//General

var WIDTH = canvas.width;
var HEIGHT = canvas.height;

//Movement

var upPressed = false;
var downPressed = false;
var leftPressed = false;
var rightPressed = false;

//Timing
var dt = 0;
var gameTime = 0;
var now;

//Arrays
var playerWallArray = [];

//Other

// FUNCTIONS //
///////////////

//Event Handlers
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("keydown", keyDownHandler, false);

function keyDownHandler(e){
	if(e.keyCode==38){	
		upPressed=true;		
	} else if(e.keyCode==40){	
		downPressed=true;	
	} else if(e.keyCode==39) {
		rightPressed = true;
	} else if(e.keyCode==37) {
		leftPressed = true;
	}
				
}
			
function keyUpHandler(e){
			
	if(e.keyCode==38){	
		upPressed=false;
	} else if(e.keyCode==40){
		downPressed=false;	
	} else if(e.keyCode==39) {
		rightPressed = false;
	} else if(e.keyCode==37) {
		leftPressed = false;
	}
}

//Game Functions

function preInitialize() {
	setInterval(main, 15);
}

function main() {
	

	update(dt);
	render();
}

function update(dt) {
	//Update Player

}

function render() {
	//Draw Player
	
	//Draw player's walls.
}

//Other Functions

