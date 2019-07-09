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
	ctx.canvas.width  = window.innerWidth;
	ctx.canvas.height = window.innerHeight;
	
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
	//game.start();

	
	let ground = new Entity(new Polygon(
		new Vector(-10, 0), new Vector(10, 0),
		new Vector(10,-1), new Vector(-10,-1)
	));
	var circle = new Entity(new Circle(
		new Vector(2, 2),
		2
	), true);

	var triangle = new Entity(new Polygon(
		new Vector(5, 4), new Vector(6, 4),
		new Vector(5.25, 3)
	), true);
	//game.objects.push(circle);
	game.objects.push(new Entity(new Polygon(
		new Vector(-2, 4), new Vector(-1, 4),
		new Vector(-1, 3), new Vector(-2, 3)
	), true));
	game.objects.push(new Entity(new Polygon(
		new Vector(-7, 6), new Vector(0, 6),
		new Vector(0, 5), new Vector(-7, 5)
	), true));

	//game.objects.push(triangle);
	game.objects.push(ground);
	
	game.start();
}

// handles the simulation
class Game {
	constructor() {
		// animation variables
		this.animationRequest;
		this.timeOfLastFrame = Date.now();
		this.scale = 64;
		this.camera = new Vector();
		this.cameraSpeed = 10;
		// temp
		this.collide = false;

		// simulation objects
		this.objects = [];
		this.constraints = {};
	}
	gjk(a, b) {
		let s = new Simplex();
		s.add(new MinkowskiDifference(a,b,Vector.unitY));
		let dir = s.a.negate().normalize();
		let it = 0;
		do {
			let support = new MinkowskiDifference(a, b, dir);
			if (support.dot(dir) < 0)
				return false;
			s.add(support);
			it++;
		} while (it < 100 && !(() => {
			switch (s.size) {
				case 1: {
					dir = s.a.negate().normalize();
					return false;
				}
				case 2: {
					let ab = s.b.subtract(s.a);
					
					if (ab.dot(s.b) >= 0) {
						let ao = s.a.negate();
						dir = ab.normal.negate().normalize();
						if (dir.dot(ao) < 0) {
							dir = dir.negate();
							// flip the winding to be ccw
							let temp = s.a;
							s.vertices[0] = s.vertices[1];
							s.vertices[1] = s.vertices[0];
						}
					}
					return false;
				}
				case 3: {
					let ab = s.b.subtract(s.a);
					let ca = s.a.subtract(s.c);
					let bc = s.c.subtract(s.b);
					let ao = s.a.negate();
					dir = ca.normal.normalize();
					if (dir.dot(ao) > 0) {
						s.vertices.splice(1, 1);
					} else {
						dir = bc.normal.normalize();
						if (dir.dot(s.c.negate()) > 0) {
							s.vertices.splice(0, 1);
							// flip the winding to be ccw
							let temp = s.a;
							s.vertices[0] = s.vertices[1];
							s.vertices[1] = s.vertices[0];
						} else {
							return true;
						}
					}
					return false;
				}
			}
			return true;
		})());
		return s;
	}
	epa(s, A, B) {
		let closest = null;
		for (let e = 0; e < 20; e++) {
			closest = {
				distance: Infinity,
				normal: null,
				index: -1
			};
			for (let i = 0; i < s.size; i++) {
				let a = s.vertices[i];
				let b = s.vertices[(i + 1) % s.size];
				let ab = b.subtract(a);
				let normal = ab.normal.normalize();
				let d = a.dot(normal);
				if (d < closest.distance) {
					closest = {
						distance: d,
						normal: normal,
						index: i
					};
				}
			}
			let support = new MinkowskiDifference(A, B, closest.normal);
			let d = support.dot(closest.normal);
			if (d - closest.distance <= 0.001) {
				closest.distance = d;
				break;
			} else {
				s.vertices.splice(closest.index + 1, 0, support);
				//s.render(ctx);
			}
		}
		let a = s.vertices[closest.index];
		let b = s.vertices[(closest.index + 1) % s.size];
		let points = [a.b];
		if (!a.b.equals(b.b)) {
			points.push(b.b);
		}
		return {
			distance: closest.distance,
			normal: closest.normal,
			points: points
		};

	}
	render() {
		// clear the screen
		ctx.fillStyle = 'rgb(192,192,255)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// loop through the objects
		this.objects.forEach( (object) =>  {
			// render objects
			ctx.strokeStyle = 'black';
			ctx.fillStyle = 'white';
			object.render(ctx);
			object.contacts.forEach(contact => {
				contact.points.forEach(point => {
					this.crossHair(point);
				})
				
			});
		});

		// render the origin
		this.crossHair(new Vector());
	}
	update(elapsed) {
		
		let oldConstraints = this.constraints;
		this.constraints = {};
		// Generate contacts
		this.objects.forEach(obj => {
			obj.contacts = [];
			this.objects.forEach(other => {
				if (other !== obj) {
					let simplex = this.gjk(other.volume, obj.volume);
					if (simplex) {
						let contact = this.epa(simplex, other.volume, obj.volume);
						contact.points.forEach(point => {
							let radius = point.subtract(obj.centerOfMass);
							// perturb the normal to simulate surface imperfections
							let normal = contact.normal;
							let oldImpulse = 0;
							if (oldConstraints[obj.id] && oldConstraints[obj.id][other.id]) {
								oldImpulse = oldConstraints[obj.id][other.id][0].impulse;
							}
							
							let constraint = new Constraint(
								obj,
								contact.distance,
								radius,
								contact.normal
							);
							constraint.impulse = oldImpulse;
							if (!this.constraints[obj.id])
								this.constraints[obj.id] = {};
							if (!this.constraints[obj.id][other.id])
								this.constraints[obj.id][other.id] = [];
							
							this.constraints[obj.id][other.id].push(constraint);
						})
					}
				}
			});
		});
	}
	animation() {
		
		// update the time between frames
		var elapsed = (Date.now() - this.timeOfLastFrame) / 1000;
		elapsed = .016;
		this.timeOfLastFrame = Date.now();
		// Y
		if (input.keyMap[83] && !input.keyMap[87]) {
			this.camera.y -= this.cameraSpeed * elapsed;
		} else if (input.keyMap[87] && !input.keyMap[83]) {
			this.camera.y += this.cameraSpeed * elapsed;
		}
		// X
		if (input.keyMap[65] && !input.keyMap[68]) {
			this.camera.x -= this.cameraSpeed * elapsed;
		} else if (input.keyMap[68] && !input.keyMap[65]) {
			this.camera.x += this.cameraSpeed * elapsed;
		}
		this.render();
		
		// Apply gravity
		this.objects.forEach(obj => {
			obj.applyImpulse(new Vector(0, obj.mass * -9.8 * elapsed), Vector.unitY);
		});
		// Warm start
		for (let obj in this.constraints) {
			for (let other in this.constraints[obj]) {
				this.constraints[obj][other].forEach(c => c.applyImpulse(this.constraints[obj][other].impulse));
			}
		}
		
		for (let i = 0; i < 8; i++) {
			// Generate constraints
			this.update(elapsed || 0);
			// Solve constraints
			for (let obj in this.constraints) {
				for (let other in this.constraints[obj]) {
					this.constraints[obj][other].forEach(c => c.solve());
				}
			}
		}
		// clear pseudo vectors
		this.objects.forEach(obj => {
			obj.pseudoVelocity = new Vector();
			obj.pseduoImpulse = new Vector();
		})
		for (let i = 0; i < 3; i++) {
			// Position constraint
			for (let obj in this.constraints) {
				for (let other in this.constraints[obj]) {
					this.constraints[obj][other].forEach(c => c.solvePosition());
				}
			}
		}
		// Update position
		this.objects.forEach(obj => obj.translate(obj.velocity.scale(elapsed)));
		this.objects.forEach(obj => obj.rotate(obj.angular * elapsed));
		this.animationRequest = window.requestAnimationFrame(() => {
			this.animation();
		});
	}
	start() {
		// start the loop
		this.animation();
	}
	stop() {
		// stop the loop
		window.cancelAnimationFrame(this.animationRequest);
	}
	crossHair(p) {
		let screen = this.worldToScreen(p);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(screen.x, screen.y - 8);
		ctx.lineTo(screen.x, screen.y + 8);
		ctx.moveTo(screen.x - 8, screen.y);
		ctx.lineTo(screen.x + 8, screen.y);
		ctx.stroke();
	}
	// convert from world to screen space
	worldToScreen(point) {
		let viewPoint = point.subtract(this.camera).scale(this.scale);
		viewPoint.y = -viewPoint.y;
		return viewPoint.add(new Vector(canvas.width / 2, canvas.height / 2));
	}
}
class Constraint {
	constructor(object,depth,radius,normal) {
		this.object = object;
		this.depth = depth;
		this.solver = solver;
		this.radius = radius;
		this.normal = normal;
		this.impulse = 0;
	}
	constrain(velocity) {
		velocity.add(this.radius.cross(this.object.angular)).dot(this.normal);
	}
	computeImpulse() {
		let constraint = this.constrain(this.object.velocity);
		return - constraint / (1 / this.object.mass + Math.pow(this.radius.crossMag(this.normal), 2) / this.object.moment);
	}
	applyImpulse(impulse) {
		let impulseVector = this.normal.scale(impulse);
		this.object.applyImpulse(impulseVector,this.radius);
	}
	solve() {
		let oldImpulse = this.impulse;
		let delta = this.computeImpulse();
		this.impulse += delta;
		this.impulse = Math.max(0,this.impulse);
		delta = this.impulse - oldImpulse;
		this.applyImpulse(delta);
		
	}
	solvePosition() {
		if (!this.object.static) {
			this.object.translate(this.normal.scale(this.constrain(this.object.pseudoVelocity) - this.depth));
		}
	}
}
class Entity {
	constructor(volume,dynamic) {
		this.volume = volume || new Polygon();
		this.velocity = new Vector();
		this.angular = 0;
		this.impulse = new Vector();
		this.pseudoVelocity = new Vector();
		this.pseduoImpulse = new Vector();
		this.contacts = [];
		this.static = !dynamic;
		this.id = Entity.nextId++;
	}
	get mass() {
		return this.volume.area;
	}
	get centerOfMass() {
		return this.volume.centroid;
	}
	get moment() {
		return this.volume.moment;
	}
	translate(vector) {
		this.volume.translate(vector);
	}
	rotate(angle) {
		this.volume.rotate(this.centerOfMass,angle);
	}
	applyImpulse(impulse,radius) {
		if (!this.static) {
			this.angular += radius.crossMag(impulse) / this.moment;
			let dv = radius.normalize().scale(impulse.dot(radius.normalize()) / this.mass);
			this.velocity = this.velocity.add(dv);
		}
	}
	render(ctx) {
		this.volume.render(ctx);
	}
	static nextId = 0;
}
class Convex {
	constructor() {
	}
	support(dir) {
	}
	translate(vector) {
	}
	rotate(pivot, radians) {
	}
	get area() { return 0;}
	get centroid() {}
}
class Simplex {
	constructor() {
		this.vertices = [];
	}
	add(vertex) {
		this.vertices.push(vertex);
	}
	get size() {
		return this.vertices.length;
	}
	get a() {
		return this.vertices[0];
	}
	get b() {
		return this.vertices[1];
	}
	get c() {
		return this.vertices[2];
	}
	render(ctx) {

		ctx.beginPath();
		let screen = game.worldToScreen(this.vertices[0]);
		ctx.moveTo(screen.x, screen.y);
		for (let i = 1; i <= this.vertices.length; i++) {
			screen = game.worldToScreen(this.vertices[i % this.vertices.length]);
			ctx.lineTo(screen.x, screen.y);
		}
		ctx.fill();
		ctx.stroke();

	}
}
class Polygon extends Convex {
	constructor(...vertices) {
		super();
		this.vertices = vertices;
	}
	add(vertex) {
		this.vertices.push(vertex);
	}
	support(dir) {
		let maxDot = -Infinity;
		let maxSupport = null;
		this.vertices.forEach(p => {
			let dot = p.dot(dir);
			if (dot > maxDot) {
				maxDot = dot;
				maxSupport = p;
			}
		});
		return maxSupport;
	}
	translate(vector) {
		this.vertices.forEach((p, i) => {
			this.vertices[i] = p.add(vector);
		});
	}
	rotate(pivot, radians) {
		this.translate(pivot.negate());
		this.vertices.forEach((p,i) => {
			this.vertices[i] = Matrix.rotation(radians).transformVector(p);
		});
		this.translate(pivot);
	}
	get centroid() {
		let centroid = new Vector();
		this.vertices.forEach(p => centroid = centroid.add(p));
		return centroid.scale(1 / this.vertices.length);
	}
	get area() {
		let area = 0;
		for (let i = 1; i < this.vertices.length - 1; i++) {
			let base = this.vertices[i].subtract(this.vertices[0]);
			let height = Math.abs(base.normal.normalize().dot(this.vertices[i + 1].subtract(this.vertices[0])));
			area += 0.5 * base.length * height;
		}
		return area;
	}
	get moment() {
		let moment = 0;
		let centroid = this.centroid;
		this.translate(centroid.negate());
		let bottom = 0;
		this.vertices.forEach((v, i) => {
			bottom += 6 * this.vertices[(i + 1) % this.vertices.length].crossMag(v);
		});
		this.vertices.forEach((v, i) => {
			let u = this.vertices[(i + 1) % this.vertices.length];
			moment += u.crossMag(v) * (v.dot(v) + v.dot(u) + u.dot(u));
		});

		this.translate(centroid);
		return moment / bottom;
	}
	render(ctx) {
		
		ctx.beginPath();
		let screen = game.worldToScreen(this.vertices[0]);
		ctx.moveTo(screen.x,screen.y);
		for (let i = 1; i <= this.vertices.length; i++) {
			screen = game.worldToScreen(this.vertices[i % this.vertices.length]);
			ctx.lineTo(screen.x, screen.y);
		} 
		ctx.fill();
		ctx.stroke();
		
	}
}
class Circle extends Convex {
	constructor(center, radius) {
		super();
		this.center = center || new Vector();
		this.radius = radius || 1;
	}
	support(dir) {
		return this.center.add(dir.scale(this.radius));
	}
	translate(vector) {
		this.center = this.center.add(vector);
	}
	rotate(pivot, radians) {
		this.translate(pivot.negate());
		this.center = Matrix.rotation(radians).transformVector(this.center);
		this.translate(pivot);
	}
	get centroid() {
		return this.center;
	}
	get area() {
		return this.radius * this.radius * Math.PI;
	}
	get moment() {
		return this.radius * this.radius * 0.5;
	}
	render(ctx) {
		ctx.beginPath();
		let screen = game.worldToScreen(this.center);
		let radius = this.radius * game.scale;
		ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2, true);
		ctx.fill();
		ctx.stroke();
	}
}
class Vector {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}
	add(b) {
		return new Vector(this.x + b.x, this.y + b.y);
	}
	subtract(b) {
		return new Vector(this.x - b.x, this.y - b.y);
	}
	negate() {
		return new Vector(-this.x, -this.y);
	}
	scale(s) {
		return new Vector(this.x * s, this.y * s);
	}
	normalize() {
		let length = this.length;
		if (length > 0) {
			return this.scale(1 / length);
		} else {
			return new Vector(this.x, this.y);
		}
	}
	equals(b) {
		return this.x === b.x && this.y === b.y;
	}
	dot(b) {
		return this.x * b.x + this.y * b.y;
	}
	cross(b) {
		return new Vector(-b * this.y, b * this.x);
	}
	crossMag(b) {
		return this.x * b.y - this.y * b.x;
	}
	tripleProduct(a,b) {
		return this.cross(a.crossMag(b));
	}
	transform(matrix) {

	}
	get length() {
		return Math.sqrt(this.lengthSquared);
	}
	get lengthSquared() {
		return this.x * this.x + this.y * this.y;
	}
	get normal() {
		return new Vector(this.y, -this.x);
	}
	static get unitX() {
		return new Vector(1, 0);
	}
	static get unitY() {
		return new Vector(0, 1);
	}
}
class MinkowskiDifference extends Vector {
	constructor(a, b, dir) {
		super();
		this.a = a.support(dir);
		this.b = b.support(dir.negate());
		this.x = this.a.x - this.b.x;
		this.y = this.a.y - this.b.y;
	}
}
class Matrix {
	constructor(_11,_12,_21,_22) {
		this._11 = _11;
		this._12 = _12;
		this._21 = _21;
		this._22 = _22;
	}
	transformMatrix(b) {
		return new Matrix(
			this._11 * b._11 + this._12 * b._21, this._11 * b._12 + this._12 * b._22,
			this._21 * b._11 + this._22 * b._21, this._21 * b._12 + this._22 * b._22
		);
	}
	transformVector(b) {
		return new Vector(this._11 * b.x + this._12 * b.y, this._21 * b.x + this._22 * b.y);
	}
	static get identity() {
		return new Matrix(
			1, 0,
			0, 1
		);
	}
	// counterclockwise
	static rotation(radians) {
		return new Matrix(
			Math.cos(radians), -Math.sin(radians),
			Math.sin(radians), Math.cos(radians)
		);
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


