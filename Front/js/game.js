
import * as THREE from './three.module.js';
import {GLTFLoader} from '../loaders/GLTFLoader.js';

/**
 *
 * BOXY RUN
 * ----
 * Simple Temple-Run-esque game, created with love by Wan Fung Chui.
 *
 */

/**
 * Constants used in this game.
 */
var Colors = {
	cherry: 0xe35d6a,
	blue: 0x1560bd,
	white: 0xd8d0d1,
	black: 0x000000,
	brown: 0x59332e,
	peach: 0xffdab9,
	yellow: 0xffff00,
	olive: 0x556b2f,
	grey: 0x696969,
	sand: 0xc2b280,
	brownDark: 0x23190f,
	green: 0x669900,
};

var deg2Rad = Math.PI / 180;
// Make a new world when the page is loaded.
window.addEventListener('load', function(){
	new World();
});

/** 
 *
 * THE WORLD
 * 
 * The world in which Boxy Run takes place.
 *
 */

/** 
  * A class of which the world is an instance. Initializes the game
  * and contains the main game loop.
  *
  */
let model, skeleton, mixer, clock;
let idleAction, walkAction, runAction;
let idleWeight, walkWeight, runWeight;
let actions;
function World() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Scoped variables in this world.
	var element, scene, camera, character, renderer, light,
		objects, paused, keysAllowed, score, difficulty,
		treePresenceProb, maxTreeSize, fogDistance, gameOver;
		
	// Initialize the world.
	init();
	
	/**
	  * Builds the renderer, scene, lights, camera, and the character,
	  * then begins the rendering loop.
	  */
	function init() {

		// Locate where the world is to be located on the screen.
		element = document.getElementById('world');

		// Initialize the renderer.
		renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true
		});
		renderer.setSize(element.clientWidth, element.clientHeight);
		renderer.shadowMap.enabled = true;
		element.appendChild(renderer.domElement);

		// Initialize the scene.
		scene = new THREE.Scene();
		fogDistance = 40000;
		scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

		// Initialize the camera with field of view, aspect ratio,
		// near plane, and far plane.
		camera = new THREE.PerspectiveCamera(
			60, element.clientWidth / element.clientHeight, 1, 120000);
		camera.position.set(0, 1500, -2000);
		camera.lookAt(new THREE.Vector3(0, 600, -5000));
		window.camera = camera;

		// Set up resizing capabilities.
		window.addEventListener('resize', handleWindowResize, false);

		// Initialize the lights.
		light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
		scene.add(light);

		// Initialize the character and add it to the scene.
		character = new Character();
		character.element.rotation.y = Math.PI;
		// character.element.position.z = 100; // à fix plus tard
		scene.add(character.element);

		var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
		scene.add(ground);

		objects = [];
		treePresenceProb = 0.2;
		maxTreeSize = 0.5;
		for (var i = 10; i < 40; i++) {
			createRowOfTrees(i * -3000, treePresenceProb, 0.5, maxTreeSize);
		}

		// The game is paused to begin with and the game is not over.
		gameOver = false;
		paused = true;

		// Start receiving feedback from the player.
		var left = 37;
		var up = 38;
		var right = 39;
		var p = 80;
		
		keysAllowed = {};
		document.addEventListener(
			'keydown',
			function(e) {
				if (!gameOver) {
					var key = e.keyCode;
					if (keysAllowed[key] === false) return;
					keysAllowed[key] = false;
					if (paused && !collisionsDetected() && key > 18) {
						paused = false;
						character.onUnpause();
						document.getElementById(
							"variable-content").style.visibility = "hidden";
						document.getElementById(
							"controls").style.display = "none";
					} else {
						if (key == p) {
							paused = true;
							character.onPause();
							document.getElementById(
								"variable-content").style.visibility = "visible";
							document.getElementById(
								"variable-content").innerHTML = 
								"Game is paused. Press any key to resume.";
						}
						if (key == up && !paused) {
							character.onUpKeyPressed();
						}
						if (key == left && !paused) {
							character.onLeftKeyPressed();
						}
						if (key == right && !paused) {
							character.onRightKeyPressed();
						}
					}
				}
			}
		);
		document.addEventListener(
			'keyup',
			function(e) {
				keysAllowed[e.keyCode] = true;
			}
		);
		document.addEventListener(
			'focus',
			function(e) {
				keysAllowed = {};
			}
		);

		// Initialize the scores and difficulty.
		score = 0;
		difficulty = 0;
		document.getElementById("score").innerHTML = score;

		// Begin the rendering loop.
		loop();

	}
	
	/**
	  * The main animation loop.
	  */
	function loop() {

		// Update the game.
		if (!paused) {
			// Add more trees and increase the difficulty.
			if ((objects[objects.length - 1].mesh.position.z) % 3000 == 0) {
				difficulty += 1;
				var levelLength = 30;
				if (difficulty % levelLength == 0) {
					var level = difficulty / levelLength;
					switch (level) {
						case 1:
							treePresenceProb = 0.35;
							maxTreeSize = 0.5;
							break;
						case 2:
							treePresenceProb = 0.35;
							maxTreeSize = 0.85;
							break;
						case 3:
							treePresenceProb = 0.5;
							maxTreeSize = 0.85;
							break;
						case 4:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 5:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 6:
							treePresenceProb = 0.55;
							maxTreeSize = 1.1;
							break;
						default:
							treePresenceProb = 0.55;
							maxTreeSize = 1.25;
					}
				}
				if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
					fogDistance -= (25000 / levelLength);
				} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
					fogDistance -= (5000 / levelLength);
				}
				createRowOfTrees(-120000, treePresenceProb, 0.5, maxTreeSize);
				scene.fog.far = fogDistance;
			}

			// Move the trees closer to the character.
			objects.forEach(function(object) {
				object.mesh.position.z += 100;
			});

			// Remove trees that are outside of the world.
			objects = objects.filter(function(object) {
				return object.mesh.position.z < 0;
			});

			// Make the character move according to the controls.
			character.update();

			// Check for collisions between the character and objects.
			if (collisionsDetected()) {
				gameOver = true;
				paused = true;
				document.addEventListener(
        			'keydown',
        			function(e) {
        				if (e.keyCode == 40)
            			document.location.reload(true);
        			}
    			);
    			var variableContent = document.getElementById("variable-content");
    			variableContent.style.visibility = "visible";
    			variableContent.innerHTML = 
    				"Game over! Press the down arrow to try again.";
    			var table = document.getElementById("ranks");
    			var rankNames = ["Typical Engineer", "Couch Potato", "Weekend Jogger", "Daily Runner",
    				"Local Prospect", "Regional Star", "National Champ", "Second Mo Farah"];
    			var rankIndex = Math.floor(score / 15000);

				// If applicable, display the next achievable rank.
				if (score < 124000) {
					var nextRankRow = table.insertRow(0);
					nextRankRow.insertCell(0).innerHTML = (rankIndex <= 5)
						? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
						: (rankIndex == 6)
							? "105k-124k"
							: "124k+";
					nextRankRow.insertCell(1).innerHTML = "*Score within this range to earn the next rank*";
				}

				// Display the achieved rank.
				var achievedRankRow = table.insertRow(0);
				achievedRankRow.insertCell(0).innerHTML = (rankIndex <= 6)
					? "".concat(rankIndex * 15, "k-", (rankIndex + 1) * 15, "k").bold()
					: (score < 124000)
						? "105k-124k".bold()
						: "124k+".bold();
				achievedRankRow.insertCell(1).innerHTML = (rankIndex <= 6)
					? "Congrats! You're a ".concat(rankNames[rankIndex], "!").bold()
					: (score < 124000)
						? "Congrats! You're a ".concat(rankNames[7], "!").bold()
						: "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();

    			// Display all ranks lower than the achieved rank.
    			if (score >= 120000) {
    				rankIndex = 7;
    			}
    			for (var i = 0; i < rankIndex; i++) {
    				var row = table.insertRow(i);
    				row.insertCell(0).innerHTML = "".concat(i * 15, "k-", (i + 1) * 15, "k");
    				row.insertCell(1).innerHTML = rankNames[i];
    			}
    			if (score > 124000) {
    				var row = table.insertRow(7);
    				row.insertCell(0).innerHTML = "105k-124k";
    				row.insertCell(1).innerHTML = rankNames[7];
    			}

			}

			// Update the scores.
			score += 10;
			document.getElementById("score").innerHTML = score;

		}

		// Render the page and repeat.
		renderer.render(scene, camera);
		requestAnimationFrame(loop);
	}

	/**
	  * A method called when window is resized.
	  */
	function handleWindowResize() {
		renderer.setSize(element.clientWidth, element.clientHeight);
		camera.aspect = element.clientWidth / element.clientHeight;
		camera.updateProjectionMatrix();
	}

	/**
	 * Creates and returns a row of trees according to the specifications.
	 *
	 * @param {number} POSITION The z-position of the row of trees.
 	 * @param {number} PROBABILITY The probability that a given lane in the row
 	 *                             has a tree.
 	 * @param {number} MINSCALE The minimum size of the trees. The trees have a 
 	 *							uniformly distributed size from minScale to maxScale.
 	 * @param {number} MAXSCALE The maximum size of the trees.
 	 *
	 */
	function createRowOfTrees(position, probability, minScale, maxScale) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				var scale = minScale + (maxScale - minScale) * Math.random();
				var tree = new Tree(lane * 800, -400, position, scale);
				objects.push(tree);
				scene.add(tree.mesh);
			}
		}
	}

	/**
	 * Returns true if and only if the character is currently colliding with
	 * an object on the map.
	 */
 	function collisionsDetected() {
 		var charMinX = character.element.position.x - 115;
 		var charMaxX = character.element.position.x + 115;
 		var charMinY = character.element.position.y - 310;
 		var charMaxY = character.element.position.y + 320;
 		var charMinZ = character.element.position.z - 40;
 		var charMaxZ = character.element.position.z + 40;
 		for (var i = 0; i < objects.length; i++) {
 			if (objects[i].collides(charMinX, charMaxX, charMinY, 
 					charMaxY, charMinZ, charMaxZ)) {
 				return true;
 			}
 		}
 		return false;
 	}
	
}

/** 
 *
 * IMPORTANT OBJECTS
 * 
 * The character and environmental objects in the game.
 *
 */

/**
 * The player's character in the game.
 */
function Character() {

	// Explicit binding of this even in changing contexts.
	var self = this;
	clock = new THREE.Clock();
	// Character defaults that don't change throughout the game.
	this.skinColor = Colors.brown;
	this.jumpDuration = 0.6;
	this.jumpHeight = 2000;

	// Initialize the character.
	init();

	/**
	  * Builds the character in depth-first order. The parts of are 
  	  * modelled by the following object hierarchy:
	  *
	  * - character (this.element)
	  *
	  * Also set up the starting values for evolving parameters throughout
	  * the game.
	  * 
	  */
	function init() {
		const loader = new GLTFLoader();
		self.runner = createGroup(0, -420, -25);
		loader.load('../model/model_naruto/naruto_run_anim.glb', ( gltf ) => {
			model = gltf.scene;
			model.scale.set(2,2,2);
			self.runner.add(model);
			model.traverse( function ( object ) {

				if ( object.isMesh ) object.castShadow = true;

			} );

			skeleton = new THREE.SkeletonHelper( model );
			skeleton.visible = false;
			self.runner.add( skeleton );

			const animations = gltf.animations;

			mixer = new THREE.AnimationMixer( model );
		/*	Pour quand on rajoutera d'autres animations
			idleAction = mixer.clipAction( animations[ 1 ] );
			walkAction = mixer.clipAction( animations[ 6 ] );*/
			runAction = mixer.clipAction( animations[ 0 ] );

			actions = [ runAction ];

			activateAllActions();

			animate();
			},
			// called while loading is progressing
			function ( xhr ) {
		
				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
			},
			// called when loading has errors
			function ( error ) {
		
				console.log( 'An error happened' );
		
			}
			
		);
		// Build the character.
		self.element = createGroup(0, 0, -4000);
		self.element.add(self.runner);


		// Initialize the player's changing parameters.
		self.isJumping = false;
		self.isSwitchingLeft = false;
		self.isSwitchingRight = false;
		self.currentLane = 0;
		self.runningStartTime = new Date() / 1000;
		self.pauseStartTime = new Date() / 1000;
		self.stepFreq = 2;
		self.queuedActions = [];

	}

	
	/**
	 * A method called on the character when time moves forward.
	 */
	this.update = function() {

		// Obtain the curren time for future calculations.
		var currentTime = new Date() / 1000;

		// Apply actions to the character if none are currently being
		// carried out.
		if (!self.isJumping &&
			!self.isSwitchingLeft &&
			!self.isSwitchingRight &&
			self.queuedActions.length > 0) {
			switch(self.queuedActions.shift()) {
				case "up":
					self.isJumping = true;
					self.jumpStartTime = new Date() / 1000;
					break;
				case "left":
					if (self.currentLane != -1) {
						self.isSwitchingLeft = true;
					}
					break;
				case "right":
					if (self.currentLane != 1) {
						self.isSwitchingRight = true;
					}
					break;
			}
		}

		// If the character is jumping, update the height of the character.
		// Otherwise, the character continues running.
		if (self.isJumping) {
			var jumpClock = currentTime - self.jumpStartTime;
			self.element.position.y = self.jumpHeight * Math.sin(
				(1 / self.jumpDuration) * Math.PI * jumpClock) +
				sinusoid(2 * self.stepFreq, 0, 20, 0,
					self.jumpStartTime - self.runningStartTime);
			if (jumpClock > self.jumpDuration) {
				self.isJumping = false;
				self.runningStartTime += self.jumpDuration;
			}
		} else {
			var runningClock = currentTime - self.runningStartTime;
			self.element.position.y = sinusoid(
				2 * self.stepFreq, 0, 20, 0, runningClock);
			// If the character is not jumping, it may be switching lanes.
			if (self.isSwitchingLeft) {
				self.element.position.x -= 200;
				var offset = self.currentLane * 800 - self.element.position.x;
				if (offset > 800) {
					self.currentLane -= 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingLeft = false;
				}
			}
			if (self.isSwitchingRight) {
				self.element.position.x += 200;
				var offset = self.element.position.x - self.currentLane * 800;
				if (offset > 800) {
					self.currentLane += 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingRight = false;
				}
			}
		}
	}

	/**
	  * Handles character activity when the left key is pressed.
	  */
	this.onLeftKeyPressed = function() {
		self.queuedActions.push("left");
	}

	/**
	  * Handles character activity when the up key is pressed.
	  */
	this.onUpKeyPressed = function() {
		self.queuedActions.push("up");
	}

	/**
	  * Handles character activity when the right key is pressed.
	  */
	this.onRightKeyPressed = function() {
		self.queuedActions.push("right");
	}

	/**
	  * Handles character activity when the game is paused.
	  */
	this.onPause = function() {
		self.pauseStartTime = new Date() / 1000;
	}

	/**
	  * Handles character activity when the game is unpaused.
	  */
	this.onUnpause = function() {
		var currentTime = new Date() / 1000;
		var pauseDuration = currentTime - self.pauseStartTime;
		self.runningStartTime += pauseDuration;
		if (self.isJumping) {
			self.jumpStartTime += pauseDuration;
		}
	}

}




/**
  * A collidable tree in the game positioned at X, Y, Z in the scene and with
  * scale S.
  */
function Tree(x, y, z, s) {

	// Explicit binding.
	var self = this;

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();
	const loader = new GLTFLoader();
	self.runner = createGroup(0, 0, -25);
	loader.load('../model/cone.glb', ( gltf ) => {
		model = gltf.scene;
		// model.scale.set(250,250,250);
		self.mesh.add(model);
		},
		// called while loading is progressing
		function ( xhr ) {
	
		},
		// called when loading has errors
		function ( error ) {
	
			console.log( 'An error happened' );
	
		}
		
	);	
    let upscale = 1000;
    this.mesh.position.set(x, y, z);
	this.mesh.scale.set(s*upscale, s*upscale, s*upscale);
	this.scale = s;

	/**
	 * A method that detects whether this tree is colliding with the character,
	 * which is modelled as a box bounded by the given coordinate space.
	 */
    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    	var treeMinX = self.mesh.position.x - this.scale * 250;
    	var treeMaxX = self.mesh.position.x + this.scale * 250;
    	var treeMinY = self.mesh.position.y;
    	var treeMaxY = self.mesh.position.y + this.scale * 1150;
    	var treeMinZ = self.mesh.position.z - this.scale * 250;
    	var treeMaxZ = self.mesh.position.z + this.scale * 250;
    	return treeMinX <= maxX && treeMaxX >= minX
    		&& treeMinY <= maxY && treeMaxY >= minY
    		&& treeMinZ <= maxZ && treeMaxZ >= minZ;
    }

}

/** 
 *
 * UTILITY FUNCTIONS
 * 
 * Functions that simplify and minimize repeated code.
 *
 */

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 *
 * @param {number} FREQUENCY The number of oscillations per second.
 * @param {number} MINIMUM The minimum value of the sinusoid.
 * @param {number} MAXIMUM The maximum value of the sinusoid.
 * @param {number} PHASE The phase offset in degrees.
 * @param {number} TIME The time, in seconds, in the sinusoid's scope.
 * @return {number} The value of the sinusoid.
 *
 */
function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

/**
 * Creates an empty group of objects at a specified location.
 *
 * @param {number} X The x-coordinate of the group.
 * @param {number} Y The y-coordinate of the group.
 * @param {number} Z The z-coordinate of the group.
 * @return {Three.Group} An empty group at the specified coordinates.
 *
 */
function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

/**
 * Creates and returns a simple box with the specified properties.
 *
 * @param {number} DX The width of the box.
 * @param {number} DY The height of the box.
 * @param {number} DZ The depth of the box.
 * @param {color} COLOR The color of the box.
 * @param {number} X The x-coordinate of the center of the box.
 * @param {number} Y The y-coordinate of the center of the box.
 * @param {number} Z The z-coordinate of the center of the box.
 * @param {boolean} NOTFLATSHADING True iff the flatShading is false.
 * @return {THREE.Mesh} A box with the specified properties.
 *
 */
function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
    
	const loader = new THREE.TextureLoader().load('textures/road_long_90deg.jpg');
	// loader.repeat.set(1,10)
	const material = new THREE.MeshBasicMaterial({
  		map: loader,
	});
	let geom = new THREE.BoxGeometry(dx, dy, dz);
	const road = new THREE.Mesh(geom, material);
	road.position.set(x, y, z);
    return road;
}

/**
 * Creates and returns a (possibly asymmetrical) cyinder with the 
 * specified properties.
 *
 * @param {number} RADIUSTOP The radius of the cylinder at the top.
 * @param {number} RADIUSBOTTOM The radius of the cylinder at the bottom.
 * @param {number} HEIGHT The height of the cylinder.
 * @param {number} RADIALSEGMENTS The number of segmented faces around 
 *                                the circumference of the cylinder.
 * @param {color} COLOR The color of the cylinder.
 * @param {number} X The x-coordinate of the center of the cylinder.
 * @param {number} Y The y-coordinate of the center of the cylinder.
 * @param {number} Z The z-coordinate of the center of the cylinder.
 * @return {THREE.Mesh} A box with the specified properties.
 */
function createCylinder(radiusTop, radiusBottom, height, radialSegments, 
						color, x, y, z) {
    var geom = new THREE.CylinderGeometry(
    	radiusTop, radiusBottom, height, radialSegments);
    var mat = new THREE.MeshPhongMaterial({
    	color: color,
    	flatShading: true
    });
    var cylinder = new THREE.Mesh(geom, mat);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.position.set(x, y, z);
    return cylinder;
}

function activateAllActions() {
/*
	setWeight( idleAction, 0 );
	setWeight( walkAction, 0 );*/
	setWeight( runAction, 1 );

	actions.forEach( function ( action ) {

		action.play();

	} );

}

function setWeight( action, weight ) {

	action.enabled = true;
	action.setEffectiveTimeScale( 1 );
	action.setEffectiveWeight( weight );

}

function animate() {

	// Render loop

	requestAnimationFrame( animate );

	idleWeight = 0;
	walkWeight = 0;
	runWeight = 1;

	// Get the time elapsed since the last frame, used for mixer update (if not in single step mode)

	let mixerUpdateDelta = clock.getDelta();

	// Update the animation mixer, the stats panel, and render this frame

	mixer.update( mixerUpdateDelta );
}