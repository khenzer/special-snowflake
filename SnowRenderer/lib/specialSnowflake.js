/**
 * @brief JS lib and its initialization supporting the Special Snowflake Web Renderer. 
 * 
 * Depends on THREE.js
 * 
 * @author Kevin Henzer, Florian Segginger
 */
window.onload = function() {

  // Server to connect to
  var wsHost = "127.0.0.1"
 
  // Resolution of each snowflake, in pixels
  var textureResolution = 128;

  // Maximum simultaneous visible snowflakes
  var maxFlakes = 100;

  // Color of the snowflakes, randomly picked form array
  var snowflakeColor = ['#FFF','#EEE','#DDD'];

  // Min and max size of the flakes
  var flakeMinSize = 40;
  var flakeMaxSize = 40;

  // Min and max flake fall speed
  var flakeMinFallSpeed = 10; // in px/s
  var flakeMaxFallSpeed = 45;

  // Min and max self rotation speed, resolution is 0.1 rad/s
  var flakeMinRotationSpeed = 0.0; // in rad/s
  var flakeMaxRotationSpeed = 1.0;

  // Min max scaling of the flakes depending on the ampliture of their XZ oscillation
  var flakeMaxScale = 1.5;
  var flakeMinScale = 1;

  // Min an max rotation speed in th XZ plane
  var flakeMinOscillationSpeed = 0.0; // in rad/s, resolution is 0.1 rad/s
  var flakeMaxOscillationSpeed = 0.5;

  // Min max radius in the XZ plane
  var flakeMinOscillationRadius = 40; // in px
  var flakeMaxOscillationRadius = 60;

  // Wind parameters
  var windChangingTime = 1/40;
  var windWindowSize = 1/16;
  var windPower = 600;

  // User request flood protection
  var floodTimeoutAdd = 2000;
  var floodTimeoutHighlight = 2000;

  // Color fade speed when end of sjowflake highlighting  
  var lightnessDecrease = 0.999;

  // State initialization
  //
  var container, clock;
  var camera, scene, renderer, particles, geometry;
  var windowHalfX = window.innerWidth / 2;
  var windowHalfY = window.innerWidth / 2;
  var shownFlakes = 0;

  var lastAdd = {};
  var lastHighLight = {};

  var hues = [];
  var highLightList = [];

  var hue = 0;
  var lastAmountOfFlakes = 0;

  var coeffPosition = 0.5;
  var coeffAmplitude = 1;

  // Structure is {flakeId,userId,textureJSON}
  var availableFlakes = [];

  // Generate an unique textual ID. Used to store the flakes into the NoSQL backend.
  //
  var guid = function()
  {
    function s4()
    {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  };

  // Generate an integer between two given numbers, inclusive
  //
  var randomIntFromInterval = function(min,max)
  {

    return Math.floor(Math.random()*(max-min+1)+min);
  };

  // From the user-input 3 to 5 "seed" points, generate complete set of vertex composing the snowflake
  // 
  // This function is common to both the WebApp and the Web renderer
  //
  var generatePointList = function(points,petalAmount)
  {
    points1 = [];
    points2 = [];

    var orthX,orthY,orthXsym,orthYsym;

    for(var i=0;i<points.length;i++){

      // This function is common to both the WebApp and the Web renderer

      orthX = (points[i].x*textureResolution);
      orthY = (points[i].y*textureResolution);

      // Constraint x
      // if(orthX > $wrapper.width()/2)
      //   orthX = $wrapper.width()/2;

      // Get polar coordinates of the point, 
      var r     = Math.sqrt(Math.pow(orthX,2)+Math.pow(orthY,2));
      var theta = Math.atan(orthY/orthX);

      var thetaSym = -theta-Math.PI/petalAmount*(petalAmount-2);

      orthXsym = r*Math.cos(thetaSym);
      orthYsym = r*Math.sin(thetaSym);

      // Center of the snow flake as origin, normalized 
      points1.push({x:orthX,y:orthY});

      // "Reversed point", to force some symmetry
      points2.push({x:orthXsym,y:orthYsym});

    };

    points2.reverse();

    return {points1:points1,points2:points2};

  };  

  // Add new snowflake to the available list
  //
  var addNewSnowflakeToList = function(userId,flakeId,points,petalAmount,floodProtect)
  {
    var now = new Date();

    // Prevent user to add too many snowflakes in the defined time interval
    if(floodProtect && userId in lastAdd && (now.getTime()-lastAdd[userId].getTime() < floodTimeoutAdd))
      return;

    // If the snowflake corresponding to optional flakeID argument already exists, don't go further
    if(flakeId !== false && availableFlakes.find(function(e){return e.flakeId===flakeId;}) != undefined)
      return;  

    lastAdd[userId] = now;      

    flakeId = guid();

    // Sanity check on amount of received points
    if(points.length < 2 || points.length > 5)
      return; 

    // Cap points coordinates values
    for(var i=0;i < points.length; i++)
    {
      if(points[i].x < 0)
        points[i].x = 0;

      if(points[i].x > 0.5)
        points[i].x = 0.5;

      if(points[i].y < -0.5)
        points[i].y = -0.5;

      if(points[i].y > 0)
        points[i].y = 0;   
    }

    // From the key points, generate complete point list
    var pointsArrays = generatePointList(points,petalAmount);

    console.log("Adding snowflake");

    // Create an off-screen canvas, and draw the snowflake
    var canvas = document.createElement('canvas');
    canvas.setAttribute('width',textureResolution);
    canvas.setAttribute('height',textureResolution);

    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0,textureResolution,textureResolution);

    ctx.save();

    ctx.translate(textureResolution/2,textureResolution/2);

    ctx.fillStyle = snowflakeColor[randomIntFromInterval(0,snowflakeColor.length-1)];

    ctx.moveTo(pointsArrays.points1[0].x,pointsArrays.points1[0].y);
    ctx.beginPath();


    for(var j=1;j<petalAmount+1;j++)
    {
      for(var i=0;i<pointsArrays.points1.length;i++)
        ctx.lineTo(pointsArrays.points1[i].x,pointsArrays.points1[i].y);
      
      for(var i=0;i<pointsArrays.points2.length;i++)
        ctx.lineTo(pointsArrays.points2[i].x,pointsArrays.points2[i].y);   
      
      ctx.rotate(360/petalAmount*Math.PI/180);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Get canvas contents and save it to a new THREE texture
    availableFlakes.push({
      flakeId       : flakeId,
      userId        : userId,
      points        : points,
      texture       : new THREE.Texture(canvas)
    });

    availableFlakes[availableFlakes.length-1].texture.needsUpdate = true;

    delete canvas;
    canvas = null;

    return availableFlakes.length-1;    
  };

  // Colorize snowflakes owned by the specified user
  //
  var highlightSnowflake = function(userId,floodProtect)
  {
    var now = new Date();

    if(floodProtect && userId in lastHighLight && (now.getTime()-lastHighLight[userId].getTime() < floodTimeoutHighlight))
      return;

    lastHighLight[userId] = now;

    for(i=highLightList.length-1;i >= 0;i--)
    {
      if(highLightList[i].userId == userId)
        highLightList.splice(i,1);
    }
 
    var hue = hues.find(function(e){if(e.userId == userId) return e;}).hue;

    console.log("[highlightSnowflake] Highlighting "+userId+" with hue "+hue);

    highLightList.push({userId:userId,hue:hue,lightness:1});
  };

  // Add a snowflake that is in the "ready" list to the actual scene
  //
  var addAvailableFlakeToScene = function(id)
  {
    if(availableFlakes.length == 0)
      return;

    shownFlakes++;

    var flakeIndex = id;

    if(id === undefined || id === null)
     flakeIndex = randomIntFromInterval(0,availableFlakes.length-1);

    var size = randomIntFromInterval(flakeMinSize,flakeMaxSize);

    var geometry = new THREE.PlaneGeometry(size,size);
 
    var material = new THREE.MeshBasicMaterial({
      map         : availableFlakes[flakeIndex].texture,
      blending    : THREE.AdditiveBlending,
      side        : THREE.FrontSide,
      depthTest   : false,
      transparent : true,
      color       : 0xFFFFFF,
      opacity     : 1 });
    
    particle = new THREE.Mesh(geometry,material);

    particle.castShadow = false;
    particle.receiveShadow = false;

    var positionX = randomIntFromInterval(-windowHalfX,windowHalfX);
    var positionY = windowHalfY+60;
    var positionZ = randomIntFromInterval(40,80);

    particle.position.set(positionX,positionY,positionZ);

    // Store some private attributes directly to the MESH object in order to increase a bit access speed
    // this could have been stored into the availableFlakes list too, and looked up from here
    // 
    particle.privateAttributes = {

      flakeId   : availableFlakes[flakeIndex].flakeId,
      userId    : availableFlakes[flakeIndex].userId,
      size      : size,
      position:
      {
        x   : positionX,
        y   : positionY,
        z   : positionZ
      },
      speed:
      {
        h   : randomIntFromInterval(flakeMinFallSpeed,flakeMaxFallSpeed) // Pixels/sec
      },
      rotation:
      {
        z           : randomIntFromInterval(flakeMinRotationSpeed*10,flakeMaxRotationSpeed*10)/10, // in rad/s
        zPhase      : randomIntFromInterval(0,360)/(2*Math.PI), // random initial position
        zDirection  : randomIntFromInterval(-1,1), 

        // Rotation following a circle around y axis
        y           : randomIntFromInterval(flakeMinOscillationSpeed*10,flakeMaxOscillationSpeed*10)/10, // in rad/s
        yPhase      : randomIntFromInterval(0,360)/(2*Math.PI), // random initial position
        yRadius     : randomIntFromInterval(flakeMinOscillationRadius,flakeMaxOscillationRadius) 
      }
    };

    scene.add(particle);
  };

  // Simulate wind as a function of time and y (altitude, normalized from 0 to 1)
  //
  var wind = function(time,y)
  {
    var t = y*windWindowSize+time*windChangingTime;

    // Composition of sin/cos functions with different pulsation and phase
    return Math.sin(t)*Math.cos(3*t)*Math.sin(5*t)*Math.cos(7*t-1)*Math.sin(11*t-2)*Math.cos(13*t-3)*Math.sin(17*t-4)*Math.cos(21*t-5);
  };

  // Initialize THREE.js's world
  //
  var init = function()  
  {
    clock = new THREE.Clock();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    renderer = new THREE.WebGLRenderer({antialias:false});
    renderer.shadowMap.enabled = false;    

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(windowHalfX*2, windowHalfY*2);
    container.appendChild(renderer.domElement);

    // Camera to the center of the screen
    camera = new THREE.OrthographicCamera( -windowHalfX, windowHalfX, windowHalfY, -windowHalfY, -1000, 1000 );

    scene = new THREE.Scene(); 
  };

  // Simulate the world
  //
  var simulate = function() 
  {
    // Add new flake is scene not full enough 
    if(shownFlakes < maxFlakes)
      addAvailableFlakeToScene();

    var delta = clock.getDelta(); // In seconds
    var elapsedTime = clock.getElapsedTime(); // In seconds      
    var printone = false;
    // Browse all the objects of the scene
    for ( i = scene.children.length; i >= 0; i-- )
    {
      var object = scene.children[i];

      var printone = false;

      // If object is a mesh, it is a snowflake, as we have only that for now
      if(object instanceof THREE.Mesh)
      {
        // If snowflake gets ouf of the screen, remove it
        if(object.position.y < -windowHalfY-60)
        {
          shownFlakes--;            

          scene.remove(object);

          object.geometry.dispose();
          object.material.dispose();
        }


        // Move the snowflake down (y), horizontally (x) and its depth(z). 
        // Note than in orthographic projection, changing its depth (z) will not change its rendered size
        // 
        object.position.set(
          // On horizontal x axis, the snowflake moves following a cosine function
          object.privateAttributes.position.x + Math.cos(elapsedTime*object.privateAttributes.rotation.y+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius,
          
          // On horizontal y axis, the snowflake moves following a constant speed set at creation          
          object.position.y - delta*object.privateAttributes.speed.h,
          
          // On z axis (depth), the snowflake moves following a sin function. 
          // This actually makes the snowflake move in a cricular trajectory on the XZ plan.      
          object.privateAttributes.position.z + Math.sin(elapsedTime*object.privateAttributes.rotation.y+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius
        );

        // On the horizontal axis, the snowflakes moves with the global wind too
        var normalizePosition = (object.position.y+windowHalfY)/(2*windowHalfY);
        
        object.privateAttributes.position.x += wind(elapsedTime,normalizePosition)*windPower*delta; 

        // Wrap snowflakes positions around the horizontal axis. Center position is middle of the screen.
        if( object.privateAttributes.position.x > windowHalfX+60)
           object.privateAttributes.position.x = -windowHalfX-60;

        if( object.privateAttributes.position.x < -windowHalfX-60)
           object.privateAttributes.position.x = windowHalfX+60;

        // Make snowflakes rotate on temselves
        object.rotation.set(
          0,
          0,
          object.privateAttributes.rotation.zDirection*elapsedTime*object.privateAttributes.rotation.z + object.privateAttributes.rotation.zPhase, 'XYZ');

        // Generate scale from depth. First normalize between -1 and 1, then between 0 and 2, then 0 and 1
        var scale = ((object.position.z-object.privateAttributes.position.z)/object.privateAttributes.position.z+1)/2
        
        // ... and finally between flakeMinScale and flakeMaxScale
        scale = scale*(flakeMaxScale-flakeMinScale)+flakeMinScale;

        object.scale.x = scale;
        object.scale.y = scale;

        // If snowflake is part of the highlighted list , set a nice random saturated color
        var element = highLightList.find(function(element){
          if(element.userId == object.privateAttributes.userId)
            return element;
        });

        if(element)
        {
          var color = new THREE.Color("hsl("+element.hue+",100%,"+Math.round(100-element.lightness*50)+"%)");
          object.material.color = color;
          object.scale.x = 1+element.lightness*2;
          object.scale.y = 1+element.lightness*2;
        }
      }
    }

    /* Fade highlights */
    for(i = highLightList.length-1; i >=0 ;i--)
    {
      highLightList[i].lightness *= lightnessDecrease;

      if(highLightList[i].lightness == 0)
      {
        console.log("[render] Removing highlight");
        highLightList.splice(i,1);
      }
      else if(highLightList[i].lightness < 0.1)
      {
        highLightList[i].lightness = 0;
      }      
    }
  };

  // Animate the world
  //
  var animate = function()
  {
    simulate();    
    renderer.render( scene, camera );
    requestAnimationFrame( animate );    
  };

  // Send current word state through specified websocket connection
  //
  var saveState = function(connection) 
  {
    console.log("[saveState] savestate");

    filteredArray = [];

    for(var i=0;i<availableFlakes.length;i++)
    {
      filteredArray.push(
        {
          flakeId       : availableFlakes[i].flakeId,
          userId        : availableFlakes[i].userId,
          points        : availableFlakes[i].points
        });
    }

    connection.sendMessage({
      type: 'saveState',
      data: {flakes:filteredArray,hues:hues}
    });
  };

  // Websocket connection open callback
  //
  var onOpen = function(connection)
  {
    connection.sendMessage({
      type: 'hello',
      data: {
        game: 'special-snowflake'
      }
    });
  };

  // Websocket message received callback
  //
  var onMessage = function(connection, parsedMessage)
  {

    if(typeof(parsedMessage.data.userId) != 'undefined' && parsedMessage.data.userId != '')
    {
      if(hues.find(function(e){if(e.userId == parsedMessage.data.userId) return e;}) == undefined)
      {
        console.log("[onMessage] New user: "+parsedMessage.data.userId+" hue:"+hue);

        hues.push({userId:parsedMessage.data.userId,hue:hue});
        hue = (hue+60)%360;
        saveState(connection);
      }
    }

    // Parse messages from backend. userId is handled by the backend
    switch (parsedMessage.type) 
    {
      // message when a snowflake is created by the user
      case 'newSnowFlake':
        var id = addNewSnowflakeToList(parsedMessage.data.userId,false,parsedMessage.data.points,parsedMessage.data.petalAmount,true);
        addAvailableFlakeToScene(id,true);
        highlightSnowflake(parsedMessage.data.userId,true);        
        break;

      // message received when a used want its snowflakes highlighted
      case 'showMyFlakes':
        highlightSnowflake(parsedMessage.data.userId,true);
        break;

      // "hello" message is received once at connection and contains the last saved state
      case 'hello': 
        for(var i=0;i<parsedMessage.data.state.flakes.length;i++)
        { 
          var item = parsedMessage.data.state.flakes[i];

          var id = addNewSnowflakeToList(item.userId,item.flakeId,item.points,item.petalAmount,false);
        }
        break;
      default:
        break;
    }
  };

  init();
  animate();      

  // Websocket connection to the server
  //
  var connection = new WebsocketConnection(
    wsHost,
    8000,
    {
      open    : onOpen,
      close   : function () {},
      message : onMessage
    }, {
      autoConnect   : true,
      autoReconnect : true
    }
  );

  // Every 30 seconds, if new snowflakes have been created, save the state back to the server
  //
  window.setInterval(function(){
    
    if(lastAmountOfFlakes == availableFlakes.length)
      return;

    lastAmountOfFlakes = availableFlakes.length;

    saveState(connection);

  },30000); 

  // If page is loaded with the #demo hash in the url, add some flakes. Can be removed from production code
  //
  if (window.location.hash && window.location.hash.substring(1) == 'demo')
  {

    var flakes = [];

    flakes.push('[{"x":0.5,"y":0},{"x":0.36,"y":-0.17},{"x":0.21,"y":-0.15},{"x":0.09,"y":-0.08},{"x":0.35,"y":-0.17}]');
    flakes.push('[{"x":0.39,"y":-0.05},{"x":0.13,"y":-0.23},{"x":0.45,"y":-0.01},{"x":0.47,"y":-0.03},{"x":0.09,"y":-0.03}]');
    flakes.push('[{"x":0.38,"y":-0.16},{"x":0.43,"y":-0.1},{"x":0.32,"y":-0.05},{"x":0.13,"y":-0.1},{"x":0.23,"y":-0.11}]');
    flakes.push('[{"x":0.21,"y":-0.18},{"x":0.42,"y":-0.03},{"x":0.02,"y":-0.05},{"x":0.31,"y":-0.03},{"x":0,"y":-0.21}]');
    flakes.push('[{"x":0.17,"y":-0.01},{"x":0.11,"y":-0.07},{"x":0.14,"y":-0.2},{"x":0.29,"y":-0.17},{"x":0.03,"y":-0.16}]');
    flakes.push('[{"x":0.01,"y":-0.02},{"x":0.01,"y":-0.15},{"x":0.18,"y":-0.02},{"x":0.13,"y":-0.06},{"x":0,"y":-0.08}]');
    flakes.push('[{"x":0.12,"y":-0.24},{"x":0.32,"y":-0.03},{"x":0.37,"y":-0.01},{"x":0.2,"y":0},{"x":0.1,"y":-0.18}]');
    flakes.push('[{"x":0.27,"y":0},{"x":0.22,"y":0},{"x":0.33,"y":-0.07},{"x":0.18,"y":-0.1},{"x":0.33,"y":-0.07}]');
    flakes.push('[{"x":0.48,"y":0},{"x":0.35,"y":-0.01},{"x":0.04,"y":-0.06},{"x":0.49,"y":-0.01},{"x":0.14,"y":-0.06}]');
    flakes.push('[{"x":0.13,"y":-0.16},{"x":0.29,"y":-0.07},{"x":0.39,"y":-0.08},{"x":0.13,"y":-0.17},{"x":0.46,"y":-0.05}]');
    flakes.push('[{"x":0.49,"y":-0.02},{"x":0.18,"y":-0.06},{"x":0.42,"y":0},{"x":0.5,"y":0},{"x":0.09,"y":-0.13}]');
    flakes.push('[{"x":0.43,"y":0},{"x":0.49,"y":-0.03},{"x":0.12,"y":-0.05},{"x":0.31,"y":-0.12},{"x":0.24,"y":-0.1}]');
    flakes.push('[{"x":0.15,"y":-0.22},{"x":0.05,"y":-0.04},{"x":0.5,"y":0},{"x":0.38,"y":-0.12},{"x":0.5,"y":0}]');
    flakes.push('[{"x":0.17,"y":-0.11},{"x":0.34,"y":-0.11},{"x":0.46,"y":0},{"x":0.1,"y":-0.02},{"x":0.05,"y":-0.04}]');
    flakes.push('[{"x":0.42,"y":-0.13},{"x":0.5,"y":0},{"x":0.34,"y":-0.15},{"x":0.49,"y":-0.03},{"x":0.08,"y":-0.05}]');
    flakes.push('[{"x":0.48,"y":-0.02},{"x":0.06,"y":-0.14},{"x":0.03,"y":-0.17},{"x":0.02,"y":-0.23},{"x":0.04,"y":-0.04}]');
    flakes.push('[{"x":0.35,"y":-0.16},{"x":0.12,"y":-0.21},{"x":0.07,"y":-0.21},{"x":0.34,"y":-0.03},{"x":0.16,"y":-0.12}]');
    flakes.push('[{"x":0.06,"y":-0.23},{"x":0.11,"y":-0.07},{"x":0.31,"y":-0.02},{"x":0.41,"y":-0.11},{"x":0.15,"y":-0.07}]');
    flakes.push('[{"x":0.44,"y":0},{"x":0.1,"y":-0.21},{"x":0.33,"y":-0.15},{"x":0.06,"y":-0.07},{"x":0.2,"y":-0.1}]');
    flakes.push('[{"x":0.18,"y":-0.2},{"x":0.43,"y":-0.12},{"x":0.34,"y":-0.07},{"x":0.19,"y":0},{"x":0.15,"y":-0.01}]');
    flakes.push('[{"x":0.2,"y":-0.11},{"x":0.18,"y":-0.07},{"x":0.46,"y":-0.04},{"x":0.04,"y":-0.23},{"x":0.02,"y":-0.18}]');
    flakes.push('[{"x":0.38,"y":-0.15},{"x":0.46,"y":-0.07},{"x":0.21,"y":-0.14},{"x":0.28,"y":-0.1},{"x":0.11,"y":-0.06}]');
    flakes.push('[{"x":0.07,"y":-0.01},{"x":0.03,"y":-0.02},{"x":0.47,"y":-0.03},{"x":0.25,"y":-0.17},{"x":0.24,"y":-0.15}]');
    flakes.push('[{"x":0.49,"y":0},{"x":0.27,"y":-0.1},{"x":0.02,"y":-0.01},{"x":0.18,"y":-0.06},{"x":0.14,"y":-0.2}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.1,"y":-0.04},{"x":0.14,"y":-0.01},{"x":0.48,"y":-0.02},{"x":0.16,"y":-0.15}]');
    flakes.push('[{"x":0.03,"y":-0.01},{"x":0.29,"y":-0.06},{"x":0.12,"y":-0.04},{"x":0.35,"y":-0.17},{"x":0.24,"y":-0.1}]');
    flakes.push('[{"x":0.02,"y":-0.16},{"x":0.19,"y":-0.03},{"x":0.36,"y":-0.1},{"x":0.06,"y":-0.01},{"x":0.13,"y":-0.14}]');
    flakes.push('[{"x":0.09,"y":-0.21},{"x":0.49,"y":0},{"x":0,"y":-0.09},{"x":0.16,"y":-0.19},{"x":0.14,"y":-0.17}]');
    flakes.push('[{"x":0.22,"y":-0.08},{"x":0.46,"y":-0.07},{"x":0.39,"y":-0.14},{"x":0,"y":-0.03},{"x":0.19,"y":-0.16}]');
    flakes.push('[{"x":0.42,"y":-0.01},{"x":0.46,"y":-0.08},{"x":0.27,"y":-0.15},{"x":0.06,"y":-0.01},{"x":0.23,"y":-0.09}]');
    flakes.push('[{"x":0,"y":0},{"x":0.23,"y":-0.16},{"x":0.49,"y":0},{"x":0.43,"y":0},{"x":0.15,"y":-0.18}]');
    flakes.push('[{"x":0.29,"y":-0.12},{"x":0.5,"y":0},{"x":0.08,"y":-0.23},{"x":0.38,"y":-0.05},{"x":0.03,"y":0}]');
    flakes.push('[{"x":0.05,"y":-0.1},{"x":0.24,"y":-0.13},{"x":0.03,"y":-0.04},{"x":0.02,"y":-0.24},{"x":0.42,"y":-0.03}]');
    flakes.push('[{"x":0,"y":-0.08},{"x":0.17,"y":-0.18},{"x":0.43,"y":-0.02},{"x":0.25,"y":-0.18},{"x":0.09,"y":-0.19}]');
    flakes.push('[{"x":0.24,"y":-0.08},{"x":0.02,"y":-0.14},{"x":0.37,"y":-0.14},{"x":0.44,"y":-0.06},{"x":0.47,"y":0}]');
    flakes.push('[{"x":0.09,"y":-0.02},{"x":0.06,"y":-0.05},{"x":0.4,"y":-0.12},{"x":0.21,"y":-0.18},{"x":0.06,"y":-0.1}]');
    flakes.push('[{"x":0.43,"y":-0.04},{"x":0.19,"y":-0.08},{"x":0.05,"y":-0.07},{"x":0.06,"y":-0.14},{"x":0.06,"y":-0.05}]');
    flakes.push('[{"x":0.47,"y":-0.01},{"x":0.01,"y":-0.1},{"x":0.1,"y":-0.08},{"x":0.09,"y":-0.18},{"x":0.17,"y":-0.1}]');
    flakes.push('[{"x":0.07,"y":-0.24},{"x":0.45,"y":-0.08},{"x":0.47,"y":-0.07},{"x":0.45,"y":-0.02},{"x":0.4,"y":-0.01}]');
    flakes.push('[{"x":0.22,"y":-0.11},{"x":0.43,"y":-0.05},{"x":0.2,"y":-0.18},{"x":0.02,"y":-0.09},{"x":0.24,"y":-0.04}]');
    flakes.push('[{"x":0.37,"y":-0.05},{"x":0.09,"y":-0.06},{"x":0.3,"y":-0.07},{"x":0.08,"y":-0.02},{"x":0.07,"y":0}]');
    flakes.push('[{"x":0.12,"y":-0.04},{"x":0.13,"y":-0.12},{"x":0.05,"y":-0.11},{"x":0.16,"y":-0.01},{"x":0.12,"y":-0.09}]');
    flakes.push('[{"x":0.37,"y":-0.06},{"x":0.12,"y":-0.01},{"x":0.18,"y":-0.14},{"x":0.12,"y":0},{"x":0.06,"y":-0.01}]');
    flakes.push('[{"x":0.12,"y":-0.19},{"x":0.04,"y":-0.15},{"x":0.17,"y":-0.2},{"x":0.13,"y":-0.09},{"x":0.18,"y":-0.13}]');
    flakes.push('[{"x":0.08,"y":-0.23},{"x":0.24,"y":-0.05},{"x":0.21,"y":-0.2},{"x":0.14,"y":-0.1},{"x":0.28,"y":-0.05}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.31,"y":-0.08},{"x":0.4,"y":-0.08},{"x":0.48,"y":-0.02},{"x":0.43,"y":-0.01}]');
    flakes.push('[{"x":0.38,"y":0},{"x":0.21,"y":-0.14},{"x":0.35,"y":-0.09},{"x":0.4,"y":-0.1},{"x":0.06,"y":-0.17}]');
    flakes.push('[{"x":0.45,"y":-0.01},{"x":0.07,"y":-0.23},{"x":0.12,"y":-0.12},{"x":0.03,"y":-0.01},{"x":0.02,"y":-0.21}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.37,"y":-0.05},{"x":0.11,"y":-0.02},{"x":0.01,"y":-0.23},{"x":0.22,"y":-0.05}]');
    flakes.push('[{"x":0.02,"y":-0.03},{"x":0.27,"y":-0.21},{"x":0.29,"y":-0.1},{"x":0.3,"y":-0.11},{"x":0.03,"y":-0.07}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.19,"y":-0.02},{"x":0.28,"y":-0.02},{"x":0.14,"y":-0.01},{"x":0.05,"y":-0.17}]');
    flakes.push('[{"x":0.08,"y":-0.02},{"x":0.19,"y":-0.07},{"x":0.17,"y":-0.13},{"x":0.31,"y":-0.14},{"x":0.03,"y":-0.01}]');
    flakes.push('[{"x":0.13,"y":-0.21},{"x":0.45,"y":-0.1},{"x":0.48,"y":-0.06},{"x":0.44,"y":-0.03},{"x":0.06,"y":-0.06}]');
    flakes.push('[{"x":0.1,"y":-0.24},{"x":0.48,"y":-0.05},{"x":0.14,"y":-0.22},{"x":0.41,"y":-0.09},{"x":0.28,"y":0}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.02,"y":-0.05},{"x":0.31,"y":-0.13},{"x":0.02,"y":-0.12},{"x":0.02,"y":-0.09}]');
    flakes.push('[{"x":0.42,"y":-0.12},{"x":0.48,"y":-0.03},{"x":0.31,"y":-0.19},{"x":0.03,"y":-0.11},{"x":0.19,"y":-0.17}]');
    flakes.push('[{"x":0.17,"y":-0.01},{"x":0.5,"y":0},{"x":0.21,"y":-0.08},{"x":0.18,"y":-0.06},{"x":0.07,"y":-0.17}]');
    flakes.push('[{"x":0.42,"y":-0.06},{"x":0.29,"y":-0.07},{"x":0.37,"y":-0.11},{"x":0.48,"y":-0.02},{"x":0.08,"y":-0.04}]');
    flakes.push('[{"x":0.43,"y":-0.12},{"x":0.07,"y":-0.18},{"x":0.29,"y":-0.14},{"x":0.27,"y":-0.19},{"x":0.07,"y":-0.1}]');
    flakes.push('[{"x":0.18,"y":-0.06},{"x":0.14,"y":-0.05},{"x":0.1,"y":-0.05},{"x":0.12,"y":-0.15},{"x":0.1,"y":-0.09}]');
    flakes.push('[{"x":0.11,"y":-0.07},{"x":0.38,"y":0},{"x":0.46,"y":-0.03},{"x":0.14,"y":-0.08},{"x":0.2,"y":-0.06}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.14,"y":-0.06},{"x":0.43,"y":-0.09},{"x":0.13,"y":-0.02},{"x":0.1,"y":-0.06}]');
    flakes.push('[{"x":0.5,"y":0},{"x":0.07,"y":-0.03},{"x":0.08,"y":0},{"x":0.15,"y":-0.17},{"x":0.18,"y":-0.07}]');
    flakes.push('[{"x":0.42,"y":-0.03},{"x":0.28,"y":-0.03},{"x":0.27,"y":-0.03},{"x":0.44,"y":-0.11},{"x":0.1,"y":0}]');
    flakes.push('[{"x":0.29,"y":-0.01},{"x":0.42,"y":-0.07},{"x":0.41,"y":-0.13},{"x":0.03,"y":-0.01},{"x":0.22,"y":-0.13}]');
    flakes.push('[{"x":0.14,"y":0},{"x":0.04,"y":-0.18},{"x":0.05,"y":-0.13},{"x":0.1,"y":-0.02},{"x":0.31,"y":0}]');
    flakes.push('[{"x":0.05,"y":-0.16},{"x":0.37,"y":-0.11},{"x":0.48,"y":-0.01},{"x":0.3,"y":-0.19},{"x":0.08,"y":0}]');
    flakes.push('[{"x":0.46,"y":-0.0881816307401944},{"x":0.08,"y":-0.14806755215103679},{"x":-0.44,"y":-0.1021193419485261},{"x":0.18,"y":-0.13527808396041097},{"x":0.14,"y":-0.072}]');

    // Push them to the "ready" list. All demo flakes have 6 petals
    //
    for(var i=0;i<flakes.length;i++)
      addNewSnowflakeToList(0,false,JSON.parse(flakes[i]),6,false);

    console.log("*");
  }

}
 
