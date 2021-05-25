import * as THREE from './three.module.js';
import {GLTFLoader} from '../loaders/GLTFLoader.js';

THREE.Cache.enabled = true;

let Colors = {
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
let pausePersoRoad = 1;
let texture, material, geome;
// Make a new world when the page is loaded.
window.addEventListener('load', function(){
	new World();
});

let model, skeleton, mixer, clock;
let idleAction, walkAction, runAction;
let idleWeight, walkWeight, runWeight;
let actions, numAnimations;

let carrotModel = new THREE.Object3D();
let bottleModel= new THREE.Object3D();
let hurdleModel= new THREE.Object3D();

function World() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Scoped variables in this world.
	var element, scene, camera, character, renderer, light,
		objects, paused, keysAllowed, score, difficulty,
		presenceProb, maxTreeSize, fogDistance, gameOver;
		
	
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

		// Initialize the models.
		initModels();

		// Initialize the character and add it to the scene.
		character = new Character();
		character.element.rotation.y = Math.PI;
		// character.element.position.z = 100; // Ã  fix plus tard
		scene.add(character.element);

		// var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
		var ground = new road();
		scene.add(ground.element);
		
		// Initialize models

		objects = [];
		presenceProb = 0.2;
		maxTreeSize = 0.5;

		for (var i = 10; i < 40; i++) {
			create1stRowOfTrees(i * -3000, presenceProb);
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
					if (paused && !collisionMortelle() && key > 18) {
						pausePersoRoad = 0;
						paused = false;
						character.onUnpause();
						document.getElementById(
							"variable-content").style.visibility = "hidden";
						document.getElementById(
							"controls").style.display = "none";
					} else {
						if (key == p) {
							pausePersoRoad = 1;
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
							presenceProb = 0.35;
							break;
						case 2:
							presenceProb = 0.35;
							break;
						case 3:
							presenceProb = 0.5;
							break;
						case 4:
							presenceProb = 0.5;
							break;
						case 5:
							presenceProb = 0.5;
							break;
						case 6:
							presenceProb = 0.55;
							break;
						default:
							presenceProb = 0.55;
					}
				}
				if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
					fogDistance -= (25000 / levelLength);
				} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
					fogDistance -= (5000 / levelLength);
				}
				createRowOfTrees(-120000, presenceProb);
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
			if (collisionMortelle() || character.energy == 0) {
				gameOver = true;
				let a = document.getElementById("lol").style.visibility="hidden";
				pausePersoRoad = 1;
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
			if(score % 1000 == 0){
				character.energy -=1;
				character.hydratation -=1;
			}
			if(character.hydratation < 20){
				character.energy -=2;
			}
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

	function create1stRowOfTrees(position, probability) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				var obstacle = new FirstObstacles(lane * 800, -400, position);
				objects.push(obstacle);
				scene.add(obstacle.mesh);
			}
		}
	}

	function createRowOfTrees(position, probability) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				var obstacle = new Obstacle(lane * 800, -400, position);
				objects.push(obstacle);
				scene.add(obstacle.mesh);
			}
		}
	}

 	function collisionMortelle() {
 		var charMinX = character.element.position.x - 115;
 		var charMaxX = character.element.position.x + 115;
 		var charMinY = character.element.position.y - 310;
 		var charMaxY = character.element.position.y + 320;
 		var charMinZ = character.element.position.z - 40;
 		var charMaxZ = character.element.position.z + 40;
		
 		for (var i = 0; i < objects.length; i++) {
			let collision = objects[i].collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ);
 			if (collision && objects[i].nomObstacle=='hurdle') {
				return true;
 			}
			else if(collision && objects[i].nomObstacle=='carrot'){
				if(character.energy < 99) character.energy += (2/3);
			}
			else if(collision && objects[i].nomObstacle=='bottle'){
				if(character.energy < 99) character.energy += (2/3);
				if(character.hydratation < 99) character.hydratation += (10/3);
			}
 		}
		document.getElementById("energy").value = Math.round(character.energy);
		document.getElementById("hydratation").value = Math.round(character.hydratation);
 		return false;
 	}
	
}

function Character() {

	// Explicit binding of this even in changing contexts.
	var self = this;
	clock = new THREE.Clock();
	// Character defaults that don't change throughout the game.
	this.skinColor = Colors.brown;
	this.jumpDuration = 0.6;
	this.jumpHeight = 2000;
	this.energy = 100;
	this.hydratation = 100;
	// Initialize the character.
	init();
	function init() {
		const loader = new GLTFLoader();
		self.runner = createGroup(0, -420, -25);
		loader.load('../model/playermodel1_no_texture.glb', ( gltf ) => {
			model = gltf.scene;
			model.scale.set(500,500,500);
			self.runner.add(model);
			model.traverse( function ( object ) {

				if ( object.isMesh ) object.castShadow = true;

			} );

			skeleton = new THREE.SkeletonHelper( model );
			skeleton.visible = false;
			self.runner.add( skeleton );

			const animations = gltf.animations;
			console.log(animations);
			mixer = new THREE.AnimationMixer( model );

			numAnimations = animations.length;
		/*	Pour quand on rajoutera d'autres animations
			idleAction = mixer.clipAction( animations[ 1 ] );
			walkAction = mixer.clipAction( animations[ 6 ] );*/
			runAction = mixer.clipAction( animations[ 0 ] );

			actions = [ runAction ];
			// activateActions(pausePersoRoad);
			activateActions(0);

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
	
	this.update = function() {

		// Obtain the current time for future calculations.
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

	this.onLeftKeyPressed = function() {
		self.queuedActions.push("left");
	}

	this.onUpKeyPressed = function() {
		self.queuedActions.push("up");
	}

	this.onRightKeyPressed = function() {
		self.queuedActions.push("right");
	}

	this.onPause = function() {
		self.pauseStartTime = new Date() / 1000;
		pausePersoRoad = 1;
	}

	this.onUnpause = function() {
		var currentTime = new Date() / 1000;
		var pauseDuration = currentTime - self.pauseStartTime;
		pausePersoRoad = 0;
		self.runningStartTime += pauseDuration;
		if (self.isJumping) {
			self.jumpStartTime += pauseDuration;
		}
	}

}

function Obstacle(x, y, z) {

	// Explicit binding.
	var self = this;

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();
	let rand = getRandomInt(1,20);
	switch (rand) {
		case 1:
			this.mesh.add(carrotModel.clone());
			this.nomObstacle= 'carrot';
			break;
		case 2:
			this.mesh.add(bottleModel.clone());
			this.nomObstacle= 'bottle';
			break;
		default:
			this.mesh.add(hurdleModel.clone());
			this.nomObstacle= 'hurdle';
	}
	
    let upscale = 500;
    this.mesh.position.set(x, y, z);
	this.mesh.scale.set(upscale, upscale, upscale);
	this.scale = 0.5;

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

function FirstObstacles(x, y, z) {

	// Explicit binding.
	var self = this;

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();
	const loader = new GLTFLoader();
	self.runner = createGroup(0, 0, -25);
	let rand = getRandomInt(1,20);
	let word= '';

	switch (rand) {
		case 1:
			word='carrot';
			this.nomObstacle= 'carrot';
			break;
		case 2:
			word='bottle';
			this.nomObstacle= 'bottle';
			break;
		default:
			word='hurdle';
			this.nomObstacle= 'hurdle';
	}

	loader.load('../model/'+ word +'.glb', ( gltf ) => {
		model = gltf.scene;
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
	
    let upscale = 500;
    this.mesh.position.set(x, y, z);
	this.mesh.scale.set(upscale, upscale, upscale);
	this.scale = 0.5;

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

function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

function activateActions(isIdle) {
/*
	setWeight( idleAction, 0+isIdle );*/
	setWeight( runAction, 1-isIdle );

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

	// Get the time elapsed since the last frame, used for mixer update (if not in single step mode)

	let mixerUpdateDelta = clock.getDelta();

	// Update the animation mixer, the stats panel, and render this frame

	mixer.update( mixerUpdateDelta );
}

function road(){
	var self = this;
	init();
	animateTexture();

	function init() {
	 // Create the floor geometry
	 let geom = new THREE.BoxGeometry(3000, 20, 120000);
	 // geom.element.position.y = 0;
	  // Load the texture and assign it to the material
	  THREE.ImageUtils.crossOrigin = '';
	  texture = new THREE.TextureLoader().load('./textures/road.jpg');
	  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	  texture.repeat.set(1, 10);
  
	  material = new THREE.MeshLambertMaterial({
		map: texture
	  });
  
	  // Create the mesh for the floor and add it to the scene
	  
	  self.geome = new THREE.Mesh(geom, material);
	  self.element = createGroup(0, -370, -4000);
	self.element.add(self.geome);
	}
}

function animateTexture() {
    requestAnimationFrame(animateTexture);
	if(pausePersoRoad == 0){
		texture.offset.y += .008;
	}else{

	};
    
}

function getRandomInt(min,max){
	return Math.trunc(Math.random() * (max - min) + min);
}

function initModels() {
	// Initialize models

	const preloader = new GLTFLoader();
	preloader.load('../model/hurdle.glb', ( gltf ) => {
		hurdleModel = gltf.scene;
		
		// model.scale.set(250,250,250);
		//hurdleModel.add(model);
		},
		// called while loading is progressing
		function ( xhr ) {

		},
		// called when loading has errors
		function ( error ) {

			console.log( 'An error happened' );

		}
		
	);
	preloader.load('../model/carrot.glb', ( gltf ) => {
		carrotModel = gltf.scene;
		// model.scale.set(250,250,250);
		//carrotModel.add(model);
		},
		// called while loading is progressing
		function ( xhr ) {

		},
		// called when loading has errors
		function ( error ) {

			console.log( 'An error happened' );

		}
		
	);
	preloader.load('../model/bottle.glb', ( gltf ) => {
		bottleModel = gltf.scene;
		// model.scale.set(250,250,250);
		//bottleModel.add(model);
		},
		// called while loading is progressing
		function ( xhr ) {

		},
		// called when loading has errors
		function ( error ) {

			console.log( 'An error happened' );

		}
		
	);
}