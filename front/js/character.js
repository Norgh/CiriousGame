function Character() {
    
    var self = this;
	clock = new THREE.Clock();
	this.skinColor = Colors.brown;
	this.jumpDuration = 0.6;
	this.jumpHeight = 2000;

    init();

    function init() {
		const loader = new GLTFLoader();
		self.runner = createGroup(0, -420, -25);
		loader.load('/3D/model/model_naruto/naruto_run_anim.glb', ( gltf ) => {
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
		    /*Pour quand on rajoutera d'autres animations
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

    function createLimb(dx, dy, dz, color, x, y, z) {
        var limb = createGroup(x, y, z);
        var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
        var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
        limb.add(limbBox);
        return limb;
    }

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
            self.head.rotation.x = sinusoid(
                2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
            self.torso.rotation.x = sinusoid(
                2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
            self.leftArm.rotation.x = sinusoid(
                self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
            self.rightArm.rotation.x = sinusoid(
                self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
            self.leftLowerArm.rotation.x = sinusoid(
                self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
            self.rightLowerArm.rotation.x = sinusoid(
                self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
            self.leftLeg.rotation.x = sinusoid(
                self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
            self.rightLeg.rotation.x = sinusoid(
                self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
            self.leftLowerLeg.rotation.x = sinusoid(
                self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
            self.rightLowerLeg.rotation.x = sinusoid(
                self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;
    
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
    }

    this.onUnpause = function() {
        var currentTime = new Date() / 1000;
        var pauseDuration = currentTime - self.pauseStartTime;
        self.runningStartTime += pauseDuration;
        if (self.isJumping) {
            self.jumpStartTime += pauseDuration;
        }
    }

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