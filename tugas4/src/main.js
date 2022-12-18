function main() {
	//Access the canvas through DOM: Document Object Model
	var canvas = document.getElementById("myCanvas"); // The paper
	var gl = canvas.getContext("webgl"); // The brush and the paints

	// Define vertices data consisting of position and color properties
    var y_cube = [...box];
	var vertices = [];

	var indices = [...indice_right, ...indice_left, ...indice_box, ...indice_plane];

	// Create a linked-list for storing the vertices data
	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Create a linked-list for storing the indices data
	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices),
		gl.STATIC_DRAW
	);

	var vertexShaderSource = `
        attribute vec3 aPosition;
        attribute vec3 aColor;
        attribute vec3 aNormal;
        attribute float aShininessConstant;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vShininessConstant;
        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;
        void main() {
            gl_Position = uProjection * uView * uModel * (vec4(aPosition * 2. / 3., 1.25));
            vColor = aColor;
            vNormal = aNormal;
            vPosition = (uModel * (vec4(aPosition * 2. / 3., 1))).xyz;
            vShininessConstant = aShininessConstant;
        }
    `;

	var fragmentShaderSource = `
        precision mediump float;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vShininessConstant;
        uniform vec3 uLightConstant;        // It represents the light color
        uniform float uAmbientIntensity;    // It represents the light intensity
        // uniform vec3 uLightDirection;
        uniform vec3 uLightPosition;
        uniform mat3 uNormalModel;
        uniform vec3 uViewerPosition;
		uniform float uLightOn;
        void main() {
            vec3 ambient = uLightConstant * uAmbientIntensity;
            vec3 lightDirection = uLightPosition - vPosition;
            vec3 normalizedLight = normalize(lightDirection);  // [2., 0., 0.] becomes a unit vector [1., 0., 0.]
            vec3 normalizedNormal = normalize(uNormalModel * vNormal);
            float cosTheta = dot(normalizedNormal, normalizedLight);
            vec3 diffuse = vec3(0., 0., 0.);
            if (uLightOn == 1. && cosTheta > 0.) {
                float diffuseIntensity = cosTheta;
                diffuse = uLightConstant * diffuseIntensity;
            }
            vec3 reflector = reflect(-lightDirection, normalizedNormal);
            vec3 normalizedReflector = normalize(reflector);
            vec3 normalizedViewer = normalize(uViewerPosition - vPosition);
            float cosPhi = dot(normalizedReflector, normalizedViewer);
            vec3 specular = vec3(0., 0., 0.);
            if (uLightOn == 1. && cosPhi > 0.) {
                float specularIntensity = pow(cosPhi, vShininessConstant); 
                specular = uLightConstant * specularIntensity;
            }
            vec3 phong = ambient + diffuse + specular;
            gl_FragColor = vec4(phong * vColor, 1.);
        }
    `;

	// Create .c in GPU
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexShaderSource);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentShaderSource);

	// Compile .c into .o
	gl.compileShader(vertexShader);
	gl.compileShader(fragmentShader);
	let compiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
	if (!compiled) {
		console.error(gl.getShaderInfoLog(vertexShader));
	}

	// Prepare a .exe shell (shader program)
	var shaderProgram = gl.createProgram();

	// Put the two .o files into the shell
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);

	// Link the two .o files, so together they can be a runnable program/context.
	gl.linkProgram(shaderProgram);

	// Start using the context (analogy: start using the paints and the brushes)
	gl.useProgram(shaderProgram);

	// Teach the computer how to collect
	//  the positional values from ARRAY_BUFFER
	//  to each vertex being processed
	var aPosition = gl.getAttribLocation(shaderProgram, "aPosition");
	gl.vertexAttribPointer(
		aPosition,
		3,
		gl.FLOAT,
		false,
		10 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(aPosition);
	var aColor = gl.getAttribLocation(shaderProgram, "aColor");
	gl.vertexAttribPointer(
		aColor,
		3,
		gl.FLOAT,
		false,
		10 * Float32Array.BYTES_PER_ELEMENT,
		6 * Float32Array.BYTES_PER_ELEMENT
	);
	gl.enableVertexAttribArray(aColor);
	var aNormal = gl.getAttribLocation(shaderProgram, "aNormal");
	gl.vertexAttribPointer(
		aNormal,
		3,
		gl.FLOAT,
		false,
		10 * Float32Array.BYTES_PER_ELEMENT,
		3 * Float32Array.BYTES_PER_ELEMENT
	);
	gl.enableVertexAttribArray(aNormal);

	var aShininessConstant = gl.getAttribLocation(
		shaderProgram,
		"aShininessConstant"
	);
	gl.vertexAttribPointer(
		aShininessConstant,
		1,
		gl.FLOAT,
		false,
		10 * Float32Array.BYTES_PER_ELEMENT,
		9 * Float32Array.BYTES_PER_ELEMENT
	);
	gl.enableVertexAttribArray(aShininessConstant);

	// Connect the uniform transformation matrices
	var uModel = gl.getUniformLocation(shaderProgram, "uModel");
	var uView = gl.getUniformLocation(shaderProgram, "uView");
	var uProjection = gl.getUniformLocation(shaderProgram, "uProjection");

	// Set the projection matrix in the vertex shader
	var projection = glMatrix.mat4.create();
	glMatrix.mat4.perspective(
		projection,
		Math.PI / 3, // field of view
		1, // ratio
		0.5, // near clip
		10 // far clip
	);
	gl.uniformMatrix4fv(uProjection, false, projection);

	// Set the view matrix in the vertex shader
	var view = glMatrix.mat4.create();
	var camera = [0, 0, 3];
	var camNow = [0, 0, 0];
	glMatrix.mat4.lookAt(
		view,
		camera, // camera position
		camNow, // the point where camera looks at
		[0, 1, 0] // up vector of the camera
	);
	gl.uniformMatrix4fv(uView, false, view);

	// Define the lighting and shading
	var uLightConstant = gl.getUniformLocation(shaderProgram, "uLightConstant");
	var uAmbientIntensity = gl.getUniformLocation(
		shaderProgram,
		"uAmbientIntensity"
	);
	gl.uniform3fv(uLightConstant, [1.0, 1.0, 1.0]); // white light
	gl.uniform1f(uAmbientIntensity, 0.424); // light intensity: 224 (NRP) + 200 = 424
	// var uLightDirection = gl.getUniformLocation(shaderProgram, "uLightDirection");
	// gl.uniform3fv(uLightDirection, [2.0, 0.0, 0.0]);    // light comes from the right side
	var uLightPosition = gl.getUniformLocation(shaderProgram, "uLightPosition");
	var lightPosition = [0.0, 0.5, 0.0];
	gl.uniform3fv(uLightPosition, lightPosition);
	var uNormalModel = gl.getUniformLocation(shaderProgram, "uNormalModel");
	var uViewerPosition = gl.getUniformLocation(
		shaderProgram,
		"uViewerPosition"
	);
	gl.uniform3fv(uViewerPosition, camera);
	let cameraOrbit = 90;
    let cameraDistance = 3;
	// Lighting Challenge #4
	var uLightOnValue = 1.;
	var uLightOn = gl.getUniformLocation(shaderProgram, "uLightOn");
	
	function onKeyPressed(event) {
		if(event.keyCode == 32) {	//lighting
			if(uLightOnValue == 0.) {
				uLightOnValue = 1.;
			} else if(uLightOnValue == 1.) {
				uLightOnValue = 0.;
			}
			gl.uniform1f(uLightOn, uLightOnValue);
		} else if (event.keyCode == 83) {	//S button
			for (let i = 0; i < y_cube.length; i += 10) {
				y_cube[i + 2] += 0.04;
				lightPosition[1] += 0.04 * 1 / 20;
				console.log("Test");
			}
		} else if (event.keyCode == 87) {	//W Button
			for (let i = 0; i < y_cube.length; i += 10) {
				y_cube[i + 2] -= 0.04;
				lightPosition[1] -= 0.04 * 1 / 20;
			}
		} else if (event.keyCode == 68) {	//D button
			for (let i = 0; i < y_cube.length; i += 10) {
				y_cube[i] += 0.04;
				lightPosition[1] += 0.04 * 1 / 20;
				console.log("Test");
			}
		} else if (event.keyCode == 65) {	//A Button
			for (let i = 0; i < y_cube.length; i += 10) {
				y_cube[i] -= 0.04;
				lightPosition[1] -= 0.04 * 1 / 20;
			}
		}else if(event.keyCode == 38) { // arrow up
            cameraDistance -= 0.1
            let cos = Math.cos(cameraOrbit*Math.PI/180.0);
            let sin = Math.sin(cameraOrbit*Math.PI/180.0);
            camera = [cameraDistance*cos, 0, cameraDistance*sin];
            glMatrix.mat4.lookAt(
                view,
                camera,      // camera position
                camNow,      // the point where camera looks at
                [0, 1, 0]       // up vector of the camera
            );
            gl.uniformMatrix4fv(uView, false, view);
		} else if(event.keyCode == 40) { // arrow down
            cameraDistance += 0.1
            let cos = Math.cos(cameraOrbit*Math.PI/180.0);
            let sin = Math.sin(cameraOrbit*Math.PI/180.0);
            camera = [cameraDistance*cos, 0, cameraDistance*sin];
            glMatrix.mat4.lookAt(
                view,
                camera,      // camera position
                camNow,      // the point where camera looks at
                [0, 1, 0]       // up vector of the camera
            );
            gl.uniformMatrix4fv(uView, false, view);
        } else if(event.keyCode == 37) { // arrow left
            cameraOrbit += 0.5
            let cos = Math.cos(cameraOrbit*Math.PI/180.0);
            let sin = Math.sin(cameraOrbit*Math.PI/180.0);
            camera = [cameraDistance*cos, 0, cameraDistance*sin];
            glMatrix.mat4.lookAt(
                view,
                camera,      // camera position
                camNow,      // the point where camera looks at
                [0, 1, 0]       // up vector of the camera
            );
            gl.uniformMatrix4fv(uView, false, view);
        } else if(event.keyCode == 39) { // arrow right
            cameraOrbit -= 0.5
            let cos = Math.cos(cameraOrbit*Math.PI/180.0);
            let sin = Math.sin(cameraOrbit*Math.PI/180.0);
            camera = [cameraDistance*cos, 0, cameraDistance*sin];
            glMatrix.mat4.lookAt(
                view,
                camera,      // camera position
                camNow,      // the point where camera looks at
                [0, 1, 0]       // up vector of the camera
            );
            gl.uniformMatrix4fv(uView, false, view);
        }
	}
	document.addEventListener("keydown", onKeyPressed);

	//untuk putar
	var lastPointOnTrackBall, currentPointOnTrackBall;
	var lastQuat = glMatrix.quat.create();
	function computeCurrentQuat() {
		// Secara berkala hitung quaternion rotasi setiap ada perubahan posisi titik pointer mouse
		var axisFromCrossProduct = glMatrix.vec3.cross(glMatrix.vec3.create(), lastPointOnTrackBall, currentPointOnTrackBall);
		var angleFromDotProduct = Math.acos(glMatrix.vec3.dot(lastPointOnTrackBall, currentPointOnTrackBall));
		var rotationQuat = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), axisFromCrossProduct, angleFromDotProduct);
		glMatrix.quat.normalize(rotationQuat, rotationQuat);
		return glMatrix.quat.multiply(glMatrix.quat.create(), rotationQuat, lastQuat);
	}
	// Memproyeksikan pointer mouse agar jatuh ke permukaan ke virtual trackball
	function getProjectionPointOnSurface(point) {
		var radius = canvas.width/3;  // Jari-jari virtual trackball kita tentukan sebesar 1/3 lebar kanvas
		var center = glMatrix.vec3.fromValues(canvas.width/2, canvas.height/2, 0);  // Titik tengah virtual trackball
		var pointVector = glMatrix.vec3.subtract(glMatrix.vec3.create(), point, center);
		pointVector[1] = pointVector[1] * (-1); // Flip nilai y, karena koordinat piksel makin ke bawah makin besar
		var radius2 = radius * radius;
		var length2 = pointVector[0] * pointVector[0] + pointVector[1] * pointVector[1];
		if (length2 <= radius2) pointVector[2] = Math.sqrt(radius2 - length2); // Dapatkan nilai z melalui rumus Pytagoras
		else {  // Atur nilai z sebagai 0, lalu x dan y sebagai paduan Pytagoras yang membentuk sisi miring sepanjang radius
			pointVector[0] *= radius / Math.sqrt(length2);
			pointVector[1] *= radius / Math.sqrt(length2);
			pointVector[2] = 0;
		}
		return glMatrix.vec3.normalize(glMatrix.vec3.create(), pointVector);
	}

	var dragging, rotation = glMatrix.mat4.create();

	function onMouseDown(event) { //saat mouse di drag ke bawah
		var x = event.clientX;
		var y = event.clientY;
		var rect = event.target.getBoundingClientRect();

		if(
			rect.left <= x &&
			rect.right >= x &&
			rect.top <= y &&
			rect.bottom >= y
		) {
			dragging = true;
		}
		lastPointOnTrackBall = getProjectionPointOnSurface(glMatrix.vec3.fromValues(x,y,0));
		currentPointOnTrackBall = lastPointOnTrackBall;
	}

	function onMouseUp(event){
		dragging = false;
		if(currentPointOnTrackBall != lastPointOnTrackBall){
			lastQuat = computeCurrentQuat();
		}
	}

	function onMouseMove(event) {
		if (dragging){
			var x = event.clientX;
			var y = event.clientY;
			currentPointOnTrackBall = getProjectionPointOnSurface(glMatrix.vec3.fromValues(x,y,0));
			glMatrix.mat4.fromQuat(rotation,computeCurrentQuat());
		}
	}

	document.addEventListener("mousedown", onMouseDown, false);
	document.addEventListener("mouseup", onMouseUp, false);
	document.addEventListener("mousemove", onMouseMove, false);

	function render() {
		vertices = [...jar_right, ...jar_left, ...y_cube,...plane];
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(vertices),
			gl.STATIC_DRAW
		);
		gl.uniform3fv(uLightPosition, lightPosition);
		// Init the model matrix
		var model = glMatrix.mat4.create();
		glMatrix.mat4.multiply(model, model, rotation);
		gl.uniformMatrix4fv(uModel, false, model);
		// Set the model matrix for normal vector
		var normalModel = glMatrix.mat3.create();
		glMatrix.mat3.normalFromMat4(normalModel, model);
		gl.uniformMatrix3fv(uNormalModel, false, normalModel);
		// Reset the frame buffer
		gl.enable(gl.DEPTH_TEST);
		gl.clearColor(0.5, 0.5, 0.5, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}
