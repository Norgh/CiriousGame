import * as THREE from './three.module.js'; // We import Three module, the 3D used
import {GLTFLoader} from '../loaders/GLTFLoader.js'; // We import GLTF, used to import 3D models (player, obstacles)

THREE.Cache.enabled = true; // Activate the cache, for less latencies

let pausePersoRoad = 1; // Used to stop the ground and player when the game is paused, or over
let texture, material;

// Make a new world when the page is loaded.
window.addEventListener('load', function(){
	new World();
});

// Variables used for the character
let model, skeleton, mixerRun, clock, idleAction, runAction, actions,numAnimations, modelisLoaded;

// Loading the obstacles
let carrotModel = new THREE.Object3D(); 
let bottleModel= new THREE.Object3D();
let cigarettesModel= new THREE.Object3D();
let hurdleModel= new THREE.Object3D();
let wineModel = new THREE.Object3D();

// The main function, managing the whole game
function World() {

	let self = this; // Explicit binding of this even in changing contexts.

	// Scoped variables in this world.
	let element, scene, camera, character, renderer, light, objects, paused, keysAllowed, score, difficulty,presenceProb, fogDistance, gameOver;
		
	// Initialize the world.
	init();
	
	// Set the initial settings
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

		// Initialize the camera with field of view, aspect ratio, near plane, and far plane.
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
		scene.add(character.element);

		// Initialize the ground and add it to the scene
		let ground = new road();
		scene.add(ground.element);
		
		// Initialize models

		objects = [];
		presenceProb = 0.2;

		for (let i = 10; i < 40; i++) {
			create1stRow(i * -3000, presenceProb);
		}

		// The game is paused to begin with and the game is not over.
		gameOver = false;
		paused = true;

		// Key codes 
		let up = 90; // Z KeyCode
		let left = 81; // Q KeyCode
		let right = 68; // D KeyCode
		let p = 32; // SpaceBar KeyCode

		// Start receiving feedback from the player.
		keysAllowed = {};
		document.addEventListener(
			'keydown',
			function(e) {
				if (!gameOver) {
					let key = e.keyCode;
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
						if (key == p && character.isJumping== false) {
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

		// Initialize the score and difficulty.
		score = 0;
		difficulty = 0;
		document.getElementById("score").innerHTML = score;

		// Begin the rendering loop.
		loop();
	}
	
	// The main loop
	function loop() {
		// Update the game.
		if (!paused) {
			// Add more obstacles and increase the difficulty.
			if ((objects[objects.length - 1].mesh.position.z) % 3000 == 0) {
				difficulty += 1;
				let levelLength = 30;
				if (difficulty % levelLength == 0) {
					let level = difficulty / levelLength;
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
				createRow(-120000, presenceProb); // Call the function creating the obstacles
				scene.fog.far = fogDistance;
			}

			// Move the obstacles closer to the character.
			objects.forEach(function(object) {
				object.mesh.position.z += 100;
			});

			// Remove obstacles that are outside of the world.
			objects = objects.filter(function(object) {
				return object.mesh.position.z < 0;
			});

			// Makes the character move according to the controls.
			character.update();
			

			// Check for a collision between the character and an object, or if the energy is too low to keep running.
			if (collisionMortelle() || character.energy <= 0) {
				gameOver = true;
				pausePersoRoad = 1;
				paused = true;
				var xhr = new XMLHttpRequest();
				xhr.open("POST", "/game", true);
				xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
				xhr.send(score + 10);
				document.addEventListener(
        			'keydown',
        			function(e) {
        				if (e.keyCode == 83)
            			document.location.reload(true);
        			}
    			);
				// Displaying the ending messages with the score and other infos.
    			let variableContent = document.getElementById("variable-content");
    			variableContent.style.visibility = "visible";
    			variableContent.innerHTML = 
    				"Game over! Press s to try again.";
    			let table = document.getElementById("ranks");
    			let rankNames = ["Typical Engineer", "Couch Potato", "Weekend Jogger", "Daily Runner",
    				"Local Prospect", "Regional Star", "National Champ", "Second Mo Farah"];
    			let rankIndex = Math.floor(score / 15000);

				// If applicable, display the next achievable rank.
				if (score < 124000) {
					let nextRankRow = table.insertRow(0);
					nextRankRow.insertCell(0).innerHTML = (rankIndex <= 5)
						? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
						: (rankIndex == 6)
							? "105k-124k"
							: "124k+";
					nextRankRow.insertCell(1).innerHTML = "*Score within this range to earn the next rank*";
				}

				// Display the achieved rank.
				let achievedRankRow = table.insertRow(0);
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
    			for (let i = 0; i < rankIndex; i++) {
    				let row = table.insertRow(i);
    				row.insertCell(0).innerHTML = "".concat(i * 15, "k-", (i + 1) * 15, "k");
    				row.insertCell(1).innerHTML = rankNames[i];
    			}
    			if (score > 124000) {
    				let row = table.insertRow(7);
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
		if(score>0 && modelisLoaded == 1){
			character.changeAnimation();
		}
	}

	// If the window is resized this function is called, to handle the new size
	function handleWindowResize() {
		renderer.setSize(element.clientWidth, element.clientHeight);
		camera.aspect = element.clientWidth / element.clientHeight;
		camera.updateProjectionMatrix();
	}

	// Having issues with preload GLTF, we use another specific method for the 1st call of obstacles constructor
	function create1stRow(position, probability) {
		for (let lane = -1; lane < 2; lane++) { // There are 3 lanes in the game
			let randomNumber = Math.random(); // random number
			if (randomNumber < probability) { // Higher is the difficulty, higher is the "chance" for an obstacle to spawn on the map
				let obstacle = new FirstObstacles(lane * 800, -400, position); // Calling the constructor
				objects.push(obstacle);
				scene.add(obstacle.mesh);
			}
		}
	}

	// Now that the preload works we use it to load only once each obstacle, and then clone it, as the size of the file may cause lags due to its size
	function createRow(position, probability) {
		for (let lane = -1; lane < 2; lane++) { // There are 3 lanes in the game
			let randomNumber = Math.random(); // random number
			if (randomNumber < probability) { // Higher is the difficulty, higher is the "chance" for an obstacle to spawn on the map
				let obstacle = new Obstacle(lane * 800, -400, position); // Calling the constructor
				objects.push(obstacle);
				scene.add(obstacle.mesh);
			}
		}
	}

	// Checking for a deadly end, meaning a collision with a hurdle
 	function collisionMortelle() { 
		// character current position
 		let charMinX = character.element.position.x - 115;
 		let charMaxX = character.element.position.x + 115;
 		let charMinY = character.element.position.y - 310;
 		let charMaxY = character.element.position.y + 320;
 		let charMinZ = character.element.position.z - 40;
 		let charMaxZ = character.element.position.z + 40;
		// checking what item the character is in collision with, if there is a collision
 		for (let i = 0; i < objects.length; i++) {
			let collision = objects[i].collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ);
 			if (collision && objects[i].nomObstacle=='hurdle') { // A hurdle means death
				return true;
 			}
			else if(collision && objects[i].nomObstacle=='carrot'){
				objects[i].mesh.position.z=100; //removing it to the map, as if it was 'eaten' by the player
				if(character.energy < 99) character.energy += 2; // carrots are healthy, u won some extra energy
			}
			else if(collision && objects[i].nomObstacle=='bottle'){
				objects[i].mesh.position.z=100; //removing it to the map, as if it was 'eaten' by the player
				if(character.energy < 99) character.energy += 2; // Water is important, it hydrates your body, you get more energy
				if(character.hydratation < 99) character.hydratation += 10; // Water is important, it hydrates your body, you are more hydrated
			}
			else if(collision && objects[i].nomObstacle=='cigarettes'){
				objects[i].mesh.position.z=100; //removing it to the map, as if it was 'eaten' by the player
                if(character.energy > 5) character.energy -= 5; // Cigarettes are bad, u lost energy, next time try to avoid them
            }
			else if(collision && objects[i].nomObstacle=='wine'){
				objects[i].mesh.position.z=100; //removing it to the map, as if it was 'eaten' by the player
                if(character.hydratation > 5) character.hydratation -= 8; // wine is bad, u lost energy, next time try to avoid them
            }
 		}
		document.getElementById("energy").value = Math.round(character.energy);
		document.getElementById("hydratation").value = Math.round(character.hydratation);
 		return false;
 	}
	
}

// The character and its data, function, and everything needed to run correctly
function Character() {

	let self = this; // Explicit binding of this even in changing contexts.
	clock = new THREE.Clock(); // A clock needed for the time

	// Character defaults that doesn't change throughout the game.
	this.skinColor = 0x59332e;
	this.jumpDuration = 0.6;
	this.jumpHeight = 1000;

	// Character defaults that change throughout the game.
	this.energy = 100;
	this.hydratation = 100;

	// Initialize the character.
	init();
	function init() {
		const loader = new GLTFLoader(); // Calling the loader
		self.runner = createGroup(0, -390, -25);
		loader.load('../model/perso.glb', ( gltf ) => {
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
			mixerRun = new THREE.AnimationMixer( model );

			numAnimations = animations.length;
			runAction = mixerRun.clipAction( animations[ 0 ] );
			idleAction = mixerRun.clipAction( animations[ 1 ] );

			actions = [ runAction, idleAction];
			activateAction();

			animate();
			},
			// called while loading is progressing
			function ( xhr ) {
				modelisLoaded = xhr.loaded / xhr.total;
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

	this.changeAnimation = function() {
		if(pausePersoRoad == 0){
			self.element.rotation.y = - Math.PI/1.35;
		}else{
			self.element.rotation.y =  Math.PI;
		}
		actions[0].enabled = 1 - pausePersoRoad;
		actions[1].enabled =  pausePersoRoad;
	}

	// Update the character after every loop
	this.update = function() {

		// Obtain the current time for future calculations.
		let currentTime = new Date() / 1000;
 
		// Apply actions to the character if none is currently being carried out.
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
			let jumpClock = currentTime - self.jumpStartTime;
			self.element.position.y = self.jumpHeight * Math.sin(
				(1 / self.jumpDuration) * Math.PI * jumpClock) +
				sinusoid(2 * self.stepFreq, 0, 20, 0,
					self.jumpStartTime - self.runningStartTime);
			if (jumpClock > self.jumpDuration) {
				self.isJumping = false;
				self.runningStartTime += self.jumpDuration;
			}
		} else {
			let runningClock = currentTime - self.runningStartTime;
			self.element.position.y = sinusoid(
				2 * self.stepFreq, 0, 20, 0, runningClock);
			// If the character is not jumping, it may be switching lanes.
			if (self.isSwitchingLeft) {
				self.element.position.x -= 200;
				let offset = self.currentLane * 800 - self.element.position.x;
				if (offset > 800) {
					self.currentLane -= 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingLeft = false;
				}
			}
			if (self.isSwitchingRight) {
				self.element.position.x += 200;
				let offset = self.element.position.x - self.currentLane * 800;
				if (offset > 800) {
					self.currentLane += 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingRight = false;
				}
			}
		}
	}

	this.onLeftKeyPressed = function() {
		self.queuedActions.push("left"); // If left key is pressed then we add the action 'left'
	}

	this.onUpKeyPressed = function() {
		self.queuedActions.push("up"); // If up key is pressed then we add the action 'up'
	}

	this.onRightKeyPressed = function() {
		self.queuedActions.push("right"); // If right key is pressed then we add the action 'right'
	}

	this.onPause = function() { // We start the pause
		self.pauseStartTime = new Date() / 1000;
		pausePersoRoad = 1;
	}

	this.onUnpause = function() { // We stop the pause, the game can continue
		let currentTime = new Date() / 1000;
		let pauseDuration = currentTime - self.pauseStartTime;
		pausePersoRoad = 0;
		self.runningStartTime += pauseDuration;
		if (self.isJumping) {
			self.jumpStartTime += pauseDuration;
		}
	}

}

// Initialize the obstacles
function Obstacle(x, y, z) {
	
	let self = this; // Explicit binding.

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();

	let rand = getRandomInt(1,20); // Get a random, to decide what obstacle will spawn

	switch (rand) {
		case 1:
			this.mesh.add(carrotModel.clone()); // A carrot?
			this.nomObstacle= 'carrot';
			break;
		case 2:
			this.mesh.add(bottleModel.clone()); // A water bottle?
			this.nomObstacle= 'bottle';
			break;
		case 3:
			this.mesh.add(cigarettesModel.clone()); // Cigarettes ?
			this.nomObstacle= 'cigarettes';
			break;
		case 4:
			this.mesh.add(wineModel.clone()); // Wine ?
			this.nomObstacle= 'wine';
			break;
		default:
			this.mesh.add(hurdleModel.clone()); // Or just a hurdle?
			this.nomObstacle= 'hurdle';
	}
	
    let upscale = 500;
    this.mesh.position.set(x, y, z); // set the position where the obstacle will be placed on the map
	this.mesh.scale.set(upscale, upscale, upscale);
	this.scale = 0.5;

    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) { // Set up the informations needed to know if the character is in collision with this obstacle
    	let MinX = self.mesh.position.x - this.scale * 250;
    	let MaxX = self.mesh.position.x + this.scale * 250;
    	let MinY = self.mesh.position.y;
    	let MaxY = self.mesh.position.y + this.scale * 1150;
    	let MinZ = self.mesh.position.z - this.scale * 250;
    	let MaxZ = self.mesh.position.z + this.scale * 250;
    	return MinX <= maxX && MaxX >= minX
    		&& MinY <= maxY && MaxY >= minY
    		&& MinZ <= maxZ && MaxZ >= minZ;
    }

}

// Same as Obstacle, but for the first obstacles we can't preload due to the time needed to load the functions preload of GLTF
function FirstObstacles(x, y, z) {
	
	let self = this; // Explicit binding.

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
		case 3:
			word='cigarettes';
			this.nomObstacle= 'cigarettes';
			break;
		case 4:
			word='wine';
			this.nomObstacle= 'wine';
			break;
		default:
			word='hurdle';
			this.nomObstacle= 'hurdle';
	}
 	// Here we load the image 'word' to place the obstacle
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

    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) { // Valued needed to check for collision with an obstacle
    	let MinX = self.mesh.position.x - this.scale * 250;
    	let MaxX = self.mesh.position.x + this.scale * 250;
    	let MinY = self.mesh.position.y;
    	let MaxY = self.mesh.position.y + this.scale * 1150;
    	let MinZ = self.mesh.position.z - this.scale * 250;
    	let MaxZ = self.mesh.position.z + this.scale * 250;
    	return MinX <= maxX && MaxX >= minX
    		&& MinY <= maxY && MaxY >= minY
    		&& MinZ <= maxZ && MaxZ >= minZ;
    }

}

// A function used to create the movement of the character during a jump : a sinusoid
function sinusoid(frequency, minimum, maximum, phase, time) {
	let amplitude = 0.5 * (maximum - minimum);
	let angularFrequency = 2 * Math.PI * frequency;
	let phaseRadians = phase * Math.PI / 180;
	let offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	let average = (minimum + maximum) / 2;
	return average + offset;
}

// Creates a THREE group at the position set
function createGroup(x, y, z) {
	let group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

// Used for the animation of the character : running or idle
function activateAction() {
	actions[0].enabled = 1 - pausePersoRoad;
	actions[1].enabled =  pausePersoRoad;
	actions.forEach( function ( actions ) {
		actions.play();
	} );

}


// Animate the character in loop mode
function animate() {

	// Render loop
	requestAnimationFrame( animate );

	// Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
	let mixerUpdateDelta = clock.getDelta();

	// Update the animation mixer, the stats panel, and render this frame
	mixerRun.update( mixerUpdateDelta );
}



// Creating the ground, a picture called in loop, repeating itself
function road(){

	let self = this; // Its explicit binding

	init(); // Initialize the road
	animateTexture(); // Animate it

	function init() {
	 	// Create the floor geometry
		let geom = new THREE.BoxGeometry(3000, 20, 120000);

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

// If the game isn't on pause we animate the road
function animateTexture() {
    requestAnimationFrame(animateTexture);
	if(pausePersoRoad == 0){
		texture.offset.y += .008;
	}else{

	};
    
}

// Returns a random int between min and max
function getRandomInt(min,max){
	return Math.trunc(Math.random() * (max - min) + min);
}

// Initialize the different models (obstacles)
function initModels() {
	// Initialize models
	// We preload them, to clone when appearing, instead of loading them each time they appear
	const preloader = new GLTFLoader();
	preloader.load('../model/hurdle.glb', ( gltf ) => {
		hurdleModel = gltf.scene;
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
		},
		// called while loading is progressing
		function ( xhr ) {
		},
		// called when loading has errors
		function ( error ) {

			console.log( 'An error happened' );
		}
		
	);

	preloader.load('../model/cigarettes.glb', ( gltf ) => {
		cigarettesModel = gltf.scene;
		},
		// called while loading is progressing
		function ( xhr ) {
		},
		// called when loading has errors
		function ( error ) {
			console.log( 'An error happened' );
		}
		
	);

	preloader.load('../model/wine.glb', ( gltf ) => {
		wineModel = gltf.scene;
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