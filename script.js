'use strict';
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
	
	// temp
	this.collide = false;
	
	// simulation objects
	this.objects = [];
	
	var obj = new Object(-0.25,0.25);
	obj.triangles.push(new Triangle(new Vector(-1,-1),new Vector(-1,1),new Vector(1,1)));
	obj.triangles[0].setDensity(2);
	obj.velocity.y = 0;
	obj.updateProperties();
	this.objects.push(obj);
	
	var obj2 = new Object(0,5);
	obj2.triangles.push(new Triangle(new Vector(-1,-1),new Vector(-1,1),new Vector(1,1)));
	obj2.velocity.y = -1;
	obj2.updateProperties();
	this.objects.push(obj2);
	
	var obj3 = new Object(-5,0);
	obj3.triangles.push(new Triangle(new Vector(-1,-1),new Vector(-1,1),new Vector(1,1)));
	obj3.velocity.x = 1;
	obj3.updateProperties();
	//this.objects.push(obj3);
	
	this.collision = function (elapsed) {
		var self = this;
		// for every object
		self.objects.forEach(function (object,index) {
			// for every triangle in an object
			object.triangles.forEach(function (triangle) {
				// check every other object
				self.objects.forEach(function (object2,index2) {
					if (index2 !== index) {
						// check every triangle in other object
						object2.triangles.forEach(function (triangle2) {
							// check every vertex
							triangle2.vertices.some(function (vertex) {
								// convert each vector to world space
								if (!self.collide && VectorInTriangle (vertex.add(object2.position),triangle.vertices[0].add(object.position),triangle.vertices[1].add(object.position),triangle.vertices[2].add(object.position))) {
									// collision detected
									triangle.color = 'red';
									triangle2.color = 'red';
									
									// elastic collision
									var elasticity = 1;
									var force = new Vector(
										((object.mass+object2.mass)*(object.velocity.x-object2.velocity.x))/(2*elapsed)
										,((object.mass+object2.mass)*(object.velocity.y-object2.velocity.y))/(2*elapsed)
									);
									/* var force = new Vector(
										(object.mass*object.velocity.x)/(elapsed)
										,(object.mass*object.velocity.y)/(elapsed)
									); */
									object.force.x += -force.x*elasticity;
									object.force.y += -force.y*elasticity;
									object2.force.x += force.x*elasticity;
									object2.force.y += force.y*elasticity;
									self.collide = true;
									return true;
								} else {
									triangle.color = '#00e600';
								}
							});
						});
					}
				});
			});
		});
	}
	function sign( p1,  p2,  p3) {
		return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
	}
	function VectorInTriangle ( pt,  v1,  v2,  v3) {
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

		// update game
		self.update(elapsed);
		// check for collisions
		self.collision(elapsed);
		
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
	this.position = new Vector (xPos,yPos);
	this.rotation = 0;
	// velocity
	this.velocity = new Vector (0,0);
	this.angularVel = 0;
	// acceleration
	this.acceleration = new Vector (0,9.8);
	this.angularAcc = 0;
	
	// impulses
	this.force = new Vector (0,0);
	
	// physical properties
	this.triangles = [];
	this.mass = 0;
	this.centerOfMass = new Vector(0,0);

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
		// calculate center of mass
		self.centerOfMass.x = xSum/massTotal;
		self.centerOfMass.y = ySum/massTotal;
		// total mass
		self.mass = massTotal;
	}
	// update physics
	this.update = function (elapsed) {
		var self = this;
		
		// impulses
		//self.force.y += self.mass * 9.8;
		self.acceleration.x = self.force.x / self.mass;
		self.acceleration.y = self.force.y / self.mass;
		self.force.x = 0;
		self.force.y = 0;
		// update velocity
		self.velocity.x += self.acceleration.x * elapsed;
		self.velocity.y += self.acceleration.y * elapsed;
		// update position
		self.position.x += self.velocity.x * elapsed;
		self.position.y += self.velocity.y * elapsed;
		
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
					var vector = self.worldToScreen(self.position.x + vertex.x,self.position.y + vertex.y);
					ctx.moveTo(vector.x,vector.y); // minus for is to center the lines on the coordinate
				} else {
					var vector = self.worldToScreen(self.position.x + vertex.x,self.position.y + vertex.y);
					ctx.lineTo(vector.x,vector.y);
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
		var vector = self.worldToScreen(self.centerOfMass.x+ self.position.x,self.centerOfMass.y+ self.position.y);
		ctx.arc(vector.x,vector.y,4,0,Math.PI*2);
		ctx.closePath();
		ctx.stroke();
		ctx.fillStyle = 'red';
		ctx.fill();
		// object space origin
		var origin = self.worldToScreen(self.position.x,self.position.y);
		self.crossHair(origin.x,origin.y);
		// velocity
		ctx.font = '30px Arial';
		ctx.fillStyle = 'black';
		ctx.fillText('(' + self.velocity.x + ',' + self.velocity.y + ')',origin.x+16,origin.y);
	}
	this.crossHair = function (x,y) {
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x,y-8);
		ctx.lineTo(x,y+8);
		ctx.moveTo(x-8,y);
		ctx.lineTo(x+8,y);
		ctx.stroke();
	}
	// convert from world to screen space
	this.worldToScreen = function (x,y) {
		return new Vector((x - game.focusX) * game.scale + canvas.width/2 - 4, (y - game.focusY) * game.scale + canvas.height/2 - 4);
	}
	this.initialize();
}
// combine to create objects
function Triangle(vertex1,vertex2,vertex3) {
	// physical properties
	this.vertices = [vertex1,vertex2,vertex3];
	this.area = 0;
	this.mass = 0;
	this.density = 1;
	this.centerOfMass = new Vector(0,0);
	this.color = '#00e600';
	
	// setters
	this.setMass = function (mass) {
		this.mass = mass;
		this.density = this.mass / this.area;
	}
	this.setDensity = function (density) {
		this.density = density;
		this.mass = this.density * this.area;
	}
	
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
function Vector(x,y) {
	this.x = x;
	this.y = y;
	this.add = function (vector) {
		return new Vector(this.x+vector.x,this.y+vector.y);
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


