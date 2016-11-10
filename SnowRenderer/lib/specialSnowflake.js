window.onload = function() {

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function wind(time,x)
{
  var t = x/4+time/20000;

  return Math.sin(t)*Math.cos(3*t)*Math.sin(5*t)*Math.cos(7*t-1)*Math.sin(11*t-2)*Math.cos(13*t-3)*Math.sin(17*t-4)*Math.cos(21*t-5);
}

      // if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
      var container, stats,clock;
      var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, sprite, size;
      var mouseX = 0, mouseY = 0;
      var windowHalfX = window.innerWidth / 2;
      var windowHalfY = window.innerHeight / 2;

      coeffPosition = 0.5;
      coeffAmplitude = 1;

      init();
      animate(); 

      function init()  
      {
        clock = new THREE.Clock();

        container = document.createElement( 'div' );
        document.body.appendChild( container );

        renderer = new THREE.WebGLRenderer();

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);        

        camera = new THREE.OrthographicCamera( -windowHalfX, windowHalfX, windowHalfY, -windowHalfY, -1000, 1000 );

        // camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, -1000, 1000 );
        // camera.position.z = 10;

        scene = new THREE.Scene(); 
        scene.fog = new THREE.FogExp2( 0x000000, 0.8 );

        var textureLoader = new THREE.TextureLoader();

        for(i=0;i<1000;i++)
        { 
          var sprite = textureLoader.load( "images/"+((i+1)%49)+".png" );

          var size = randomIntFromInterval(10,30);

          var geometry = new THREE.PlaneGeometry(size,size);

          // var geometry = new THREE.Geometry();
          // var vertex = new THREE.Vector3();

          // vertex.x = 0;
          // vertex.y = 0;
          // vertex.z = 0;

          // geometry.vertices.push(vertex);

          var material = new THREE.MeshBasicMaterial({
            // size: randomIntFromInterval(10,25),
            // sizeAttenuation:true, 
            map: sprite,
            blending: THREE.AdditiveBlending,
            side:THREE.DoubleSide,
            depthTest: false,
            transparent : true,
            opacity:1 });
          
          // material.side = THREE.DoubleSide;

          particle = new THREE.Mesh(geometry,material);
          particle.lookAt(camera.position);

          var positionX = randomIntFromInterval(-windowHalfX,windowHalfX);
          var positionY = randomIntFromInterval(-windowHalfY,windowHalfY);
          var positionZ = randomIntFromInterval(40,80);

          particle.position.set(positionX,positionY,positionZ);

          particle.privateAttributes = {
            size:size,
            position:
            {
              x:positionX,
              y:positionY,
              z:positionZ
            },
            speed:
            {
              h:randomIntFromInterval(10,40), // Pixels/sec
              v:300
            },
            rotation:
            {
              z:randomIntFromInterval(5000,10000), // in ms/rad
              zPhase:randomIntFromInterval(0,360)/(2*Math.PI),
              zDirection:randomIntFromInterval(-1,1),
              y:randomIntFromInterval(5000,10000), // in ms/rad
              yPhase:randomIntFromInterval(0,360)/(2*Math.PI),
              yRadius:randomIntFromInterval(20,60)
            }
          };

          scene.add(particle);
        }


      }

      function onWindowResize()
      {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
      }

      function animate()
      {
        requestAnimationFrame( animate );
        render();
      }

      function render()
      {

      var delta = clock.getDelta(); // In seconds
      var elapsedTime = clock.getElapsedTime()*1000;        

        // console.log(time);

        // camera.position.x += ( mouseX - camera.position.x ) * 0.05;
        // camera.position.y += ( - mouseY - camera.position.y ) * 0.05;
        // camera.lookAt( scene.position );
        // 


        coeffPosition += (Math.random()-0.5)/100;
        coeffAmplitude += (Math.random()-0.5)/100; 

        if(coeffPosition < 0.1)
          coeffPosition = 0.1;
        if(coeffPosition > 0.9)
          coeffPosition = 0.9;

        if(coeffAmplitude < 0.1)
          coeffAmplitude = 0.1;
        if(coeffAmplitude > 0.7)
          coeffAmplitude = 0.7;

        for ( i = 0; i < scene.children.length; i ++ )
        {
          var object = scene.children[i];
          // object.lookAt(camera.position);

          if(object instanceof THREE.Mesh)
          {
            if(object.position.y < -windowHalfY-60)
              object.position.setY(windowHalfY+60);

            var normalizePosition = (object.position.y+windowHalfY)/(2*windowHalfY);


            object.privateAttributes.position.x += wind(elapsedTime,normalizePosition)*object.privateAttributes.speed.v*delta; 
            // console.log(wind(elapsedTime,normalizePosition));  

            if( object.privateAttributes.position.x > windowHalfX+60)
               object.privateAttributes.position.x = -windowHalfX-60;
            if( object.privateAttributes.position.x < -windowHalfX-60)
               object.privateAttributes.position.x = windowHalfX+60;

            object.position.set(
              object.privateAttributes.position.x + Math.cos((elapsedTime%object.privateAttributes.rotation.y)/(object.privateAttributes.rotation.y-1)*2*Math.PI+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius,
              object.position.y - delta*object.privateAttributes.speed.h,
              object.privateAttributes.position.z + Math.sin((elapsedTime%object.privateAttributes.rotation.y)/(object.privateAttributes.rotation.y-1)*2*Math.PI+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius
            );
// 
            object.rotation.set(0,0,object.privateAttributes.rotation.zDirection*(elapsedTime % object.privateAttributes.rotation.z)/(object.privateAttributes.rotation.z-1) + object.privateAttributes.rotation.zPhase, 'XYZ');

            var scale = Math.abs(object.position.z-object.privateAttributes.position.z)/object.privateAttributes.position.z/4+1;

            // console.log((elapsedTime%object.privateAttributes.rotation.y)/object.privateAttributes.rotation.y);
            // 
            object.scale.x = scale;
            object.scale.y = scale;
            object.scale.z = 1;
 



// 
// object.updateMatrix();

// object.geometry.applyMatrix( object.matrix );

// // object.position.set( 0, 0, 0 );
// // object.rotation.set( 0, 0, 0 );
// object.scale.set( 1, 1, 1 );
// object.updateMatrix();            // 

            // object.scale.set(object.privateAttributes.size*scale,object.privateAttributes.size*scale,1);

            // console.log(object.position.z/object.privateAttributes.position.z);


            // console.log(object.privateAttributes.rotation.speed*elapsedTime+object.privateAttributes.rotation.phase)
          }
        }

        // for ( i = 0; i < materials.length; i ++ )
        // {
        //   color = parameters[i][0];
        //   h = ( 360 * ( color[0] + time ) % 360 ) / 360;
        //   materials[i].color.setHSL( h, color[1], color[2] );
        // }

        renderer.render( scene, camera );
      }
}
 
