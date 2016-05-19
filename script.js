// Script: [script name]
// Developer: Gage Coates
// Date: [date]

// global canvas variables
var canvas;
var ctx;
// global input handler
var input = new Input();

var game;
// gets called once the html is loaded
function initialize() {
	
	// initialize the canvas variables
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	
	// image interpolation off for IE, Chrome, Firefox
	ctx.msImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;

	// fit the canvas to the screen size
	ctx.canvas.width  = window.innerWidth-128;
	ctx.canvas.height = window.innerHeight-128;
	
	// add key listeners
	window.addEventListener('keydown', function (event) {
		input.keyDown(event);
	});
	window.addEventListener('keyup', function (event) {
		input.keyUp(event);
	});
	// add mouse listeners (only on the canvas)
	canvas.addEventListener('mousedown', function (event) {
		input.mouseDown(event);
	});
	canvas.addEventListener('mouseup', function (event) {
		input.mouseUp(event);
	});
	canvas.addEventListener('mousemove', function (event) {
		input.mouseMove(event);
	});
	canvas.addEventListener('mousewheel', function (event) {
		input.mouseWheel(event);
	});
	// add window listeners
	window.addEventListener('resize', function (event) {
		input.resize(event);
	});
	
	//  setup requestAnimFrame
	window.requestAnimFrame = (function () {
		return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000/60);
		};
	})();
	// create the game
	game = new Game();
	game.objects.push(new Object(0,0));
	// start the simulation
	game.start();
}

// handles the simulation
function Game() {
	
	// animation variables
	this.animationRequest;
	this.timeOfLastFrame = Date.now();
	this.scale = 64;
	this.focusX = 0;
	this.focusY = 0;
	this.xVel = 5;
	this.yVel = 5;
	
	// simulation objects
	var obj = new Object(1,0);
	obj.triangles.push(new Triangle(new Point(-1,-1),new Point(2,-2),new Point(1,1)));
	obj.triangles.push(new Triangle(new Point(-1,-1),new Point(-1,1),new Point(1,1)));
	obj.acceleration.y = 0;
	obj.velocity.y = 1;
	obj.updateProperties();
	var obj2 = new Object(0,5);
	obj2.triangles.push(new Triangle(new Point(-1,-1),new Point(1,-1),new Point(1,1)));
	obj2.triangles.push(new Triangle(new Point(-1,-1),new Point(-1,1),new Point(1,1)));
	obj2.acceleration.y = 0;
	obj2.updateProperties();
	this.objects = [obj,obj2];
	this.collision = function () {
		var self = this;
		// for every object
		self.objects.forEach(function (object,index) {
			// for every triangle in an object
			object.triangles.forEach(function (triangle) {
				
			});
		});
	}
	function sign( p1,  p2,  p3) {
		return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
	}
	function pointInTriangle ( pt,  v1,  v2,  v3) {
		var b1, b2, b3;

		b1 = sign(pt, v1, v2) <= 0;
		b2 = sign(pt, v2, v3) <= 0;
		b3 = sign(pt, v3, v1) <= 0;

		return ((b1 == b2) && (b2 == b3));
	}

	// main animation loop
	this.simulation = function () {
		var self = this;
		
		// update the time between frames
		var elapsed = (Date.now() - self.timeOfLastFrame)/1000;
		this.timeOfLastFrame = Date.now();
		
		// check for collisions
		self.collision();
		// update game
		self.update(elapsed);
			
		// clear the screen
		ctx.fillStyle = 'rgb(192,192,255)';
		ctx.fillRect(0,0,canvas.width,canvas.height);

		// loop through the objects
		self.objects.forEach(function(object,index) {
			// update objects
			object.update(elapsed);
			// render objects
			object.render();
		});
	}
	this.update = function (elapsed) {
		// Y
		if (input.keyMap[87] && !input.keyMap[83]) {
			this.focusY -= this.yVel * elapsed;
		} else if (input.keyMap[83] && ! input.keyMap[87]) {
			this.focusY += this.yVel * elapsed;
		}
		// X
		if (input.keyMap[65] && !input.keyMap[68]) {
			this.focusX -= this.xVel * elapsed;
		} else if (input.keyMap[68] && ! input.keyMap[65]) {
			this.focusX += this.xVel * elapsed;
		}
	}
	this.start = function () {
		// start the loop
		animation();
	}
	this.stop = function () {
		// stop the loop
		window.cancelAnimationFrame(this.animationRequest);
	}
}
function animation() {
	game.simulation();
	game.animationRequest = window.requestAnimFrame(animation);
}
// object class
function Object(xPos,yPos) {
	// position
	this.position = new Point (xPos,yPos);
	this.rotation = 0;
	// velocity
	this.velocity = new Point (0,0);
	this.angularVel = 0;
	// acceleration
	this.acceleration = new Point (0,9.8);
	this.angularAcc = 0;
	
	// physical properties
	this.triangles = [];
	this.mass = 0;
	this.centerOfMass = new Point(0,0);

	// initialize
	this.initialize = function () {
		var self = this;
	}
	// update physical properties
	this.updateProperties = function () {
		var self = this;
		// calculate the center of mass
		var xSum = 0;
		var ySum = 0;
		var massTotal = 0;
		self.triangles.forEach(function (triangle) {
			xSum += triangle.mass * (triangle.centerOfMass.x);
			ySum += triangle.mass * (triangle.centerOfMass.y);
			massTotal += triangle.mass;
		});
		self.centerOfMass.x = xSum/massTotal;
		self.centerOfMass.y = ySum/massTotal;
	}
	// update physics
	this.update = function (elapsed) {
		var self = this;
		// update position
		self.position.x += self.velocity.x * elapsed;
		self.position.y += self.velocity.y * elapsed;
		// update velocity
		self.velocity.x += self.acceleration.x * elapsed;
		self.velocity.y += self.acceleration.y * elapsed;
	}
	
	// draw the shape using a path
	this.render = function () {
		var self = this;
		// loop through triangles
		self.triangles.forEach(function (triangle) {
			ctx.beginPath();
			ctx.lineWidth = 0;
			ctx.fillStyle = triangle.color;
			ctx.strokeStyle = 'black';
			triangle.vertices.forEach(function (vertex,index) {
				if (index == 0) {
					ctx.moveTo((self.position.x + vertex.x - game.focusX) * game.scale + canvas.width/2 - 4, (self.position.y + vertex.y - game.focusY) * game.scale + canvas.height/2 - 4); // minus for is to center the lines on the coordinate
				} else {
					ctx.lineTo((self.position.x + vertex.x - game.focusX) * game.scale + canvas.width/2 - 4, (self.position.y + vertex.y - game.focusY) * game.scale + canvas.height/2 - 4);
				}
			});
			ctx.closePath();
			// make the line
			ctx.stroke();
			// fill it in
			ctx.fill();
			
			
		});
		// center of mass
			ctx.beginPath();
			ctx.arc((self.centerOfMass.x+ self.position.x - game.focusX)* game.scale + canvas.width/2 - 4,(self.centerOfMass.y+ self.position.y- game.focusY)* game.scale + canvas.height/2 - 4,4,0,Math.PI*2);
			ctx.closePath();
			ctx.stroke();
	}
	
	this.initialize();
}
// combine to create objects
function Triangle(vertex1,vertex2,vertex3) {
	// position
	this.position = new Point(0,0);
	// physical properties
	this.vertices = [vertex1,vertex2,vertex3];
	this.area = 0;
	this.mass = 0;
	this.density = 1;
	this.centerOfMass = new Point(0,0);
	this.color = 'blue';
	
	// update physical properties
	this.updateProperties = function () {
		var self = this;
		// calculate area
		self.area = Math.abs((self.vertices[0].x-self.vertices[2].x) * (self.vertices[1].y - self.vertices[0].y) - (self.vertices[0].x -self.vertices[1].x) * (self.vertices[2].y-self.vertices[0].y))/2;
		self.mass = self.area * self.density;
		// calculate centroid
		self.centerOfMass.x = (self.vertices[0].x + self.vertices[1].x + self.vertices[2].x)/3;
		self.centerOfMass.y = (self.vertices[0].y + self.vertices[1].y + self.vertices[2].y)/3;
	}
	this.updateProperties();
}
function Point(x,y) {
	this.x = x;
	this.y = y;
	this.add = function (point) {
		return new Point(this.x+point.x,this.y+point.y);
	}
}
// handle input events
function Input() {
	// input states
	this.keyMap = [];
	this.mouse = {
		xPos: 0,
		yPos: 0,
		left: false,
		middle: false,
		right: false
	}
	// set all keys to false
	for (var i = 0; i < 222; i++) {
		this.keyMap.push(false);
	}
	// key listeners
	this.keyDown = function (event) {
		event.preventDefault();
		this.keyMap[event.keyCode] = true;
	}
	this.keyUp = function (event) {
		event.preventDefault();
		this.keyMap[event.keyCode] = false;
	}
	// mouse listeners
	this.mouseDown = function (event) {
		event.preventDefault();
		switch (event.which) {
			case 1: this.mouse.left = true; break;
			case 2: this.mouse.middle = true; break;
			case 3: this.mouse.right = true; break;
		}
	}
	this.mouseUp = function (event) {
		event.preventDefault();
		switch (event.which) {
			case 1: this.mouse.left = false; break;
			case 2: this.mouse.middle = false; break;
			case 3: this.mouse.right = false; break;
		}
	}
	this.mouseMove = function (event) {
		event.preventDefault();
		var rect = canvas.getBoundingClientRect();
		this.mouse.xPos = event.clientX - rect.left;
		this.mouse.yPos = event.clientY - rect.top;
	}
	this.mouseWheel = function (event) {
		
	}
	// window listeners
	this.resize = function (event) {
		
	}
}


