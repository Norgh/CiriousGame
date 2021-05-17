function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
    var geom = new THREE.BoxGeometry(dx, dy, dz);
    var mat = new THREE.MeshPhongMaterial({color:color, flatShading: notFlatShading != true});
    var box = new THREE.Mesh(geom, mat);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(x, y, z);
    return box;
}

function createCylinder(radiusTop, radiusBottom, height, radialSegments, color, x, y, z) {
    var geom = new THREE.CylinderGeometry(
    radiusTop, radiusBottom, height, radialSegments);
    var mat = new THREE.MeshPhongMaterial({color: color,flatShading: true});
    var cylinder = new THREE.Mesh(geom, mat);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.position.set(x, y, z);
    return cylinder;
}