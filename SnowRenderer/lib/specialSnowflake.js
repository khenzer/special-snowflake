window.onload = function() {

  var ratio = 5.79;
  var boundariesXrel = [0.6622,4885/8000];
 
  var recycle = false;
  var maxFlakes = 100;
  var shownFlakes = 0;

  var windChangingTime = 1/40;
  var windWindowSize = 1/16;
  var windPower = 600;
  var textureResolution = 64;

  var floodTimeoutAdd = 2000;
  var floodTimeoutHighlight = 2000;

  var flakeMinSize = 40;
  var flakeMaxSize = 64;

  var lightnessDecrease = 0.995;

  var wsHost = "lausanne.pimp-my-wall.ch"

  var container, clock;
  var camera, scene, renderer, particles, geometry;
  var windowHalfX = window.innerWidth / 2;
  var windowHalfY = window.innerWidth/ratio / 2;

  var lastAdd = {};
  var lastHighLight = {};

  var hues = [];
  var highLightList = [];

  var hue = 0;
  var lastAmountOfFlakes = 0;

  coeffPosition = 0.5;
  coeffAmplitude = 1;

  // Structure: {flakeId,userId,textureJSON}
  var availableFlakes = [];

  // Structure: {flakeId,texCount,texture}
  // var textureRefCounter = [];

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

  var randomIntFromInterval = function(min,max)
  {
    return Math.floor(Math.random()*(max-min+1)+min);
  };

  var generatePointList = function(points)
  {
    points1 = [];
    points2 = [];

    var orthX,orthY,orthXsym,orthYsym;

    for(var i=0;i<points.length;i++){

      // points[i].x;
      // points[i].y*=textureResolution;

      orthX = (points[i].x*textureResolution);
      orthY = (points[i].y*textureResolution);

      var r = Math.sqrt(Math.pow(orthX,2)+Math.pow(orthY,2));

      // if(orthX<=0)
      //   orthX = 0.000001;
      // if(orthX >textureResolution/2)
      //   orthX = textureResolution/2;    

      // if(orthY <= 0)
      //   orthY = 0.000001;          
      // if(orthY > textureResolution/2)
      //   orthY = textureResolution/2;

      var theta = Math.atan(orthY/orthX);

      var thetaSym = theta-2*(theta+Math.PI/3);

      orthXsym = r*Math.cos(thetaSym);
      orthYsym = r*Math.sin(thetaSym);      

      points1.push({x:orthX,y:orthY});
      points2.push({x:orthXsym,y:orthYsym});
    }

    points2.reverse();

    return {points1:points1,points2:points2};
  };  

  var addNewSnowflakeToList = function(userId,flakeId,points,floodProtect)
  {
    var now = new Date();

    if(floodProtect && userId in lastAdd && (now.getTime()-lastAdd[userId].getTime() < floodTimeoutAdd))
      return;

    if(flakeId !== false && availableFlakes.find(function(e){return e.flakeId===flakeId;}) != undefined)
      return;  

    lastAdd[userId] = now;      

    flakeId = guid();

    // var points = JSON.parse(JSONpoints);

    // console.log(points);

    if(points.length < 2 || points.length > 5)
      return; 


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

    var pointsArrays = generatePointList(points);

    console.log("Adding snowflake");

    var canvas = $("<canvas>").attr('width',textureResolution).attr('height',textureResolution);

    // canvas.click(function(){
      // console.log(canvas.attr("data-source"));
    // });

    // $("body").append(canvas);
    var ctx = canvas[0].getContext('2d');

    ctx.clearRect(0, 0,textureResolution,textureResolution);

    ctx.save();

    ctx.translate(textureResolution/2,textureResolution/2);

    ctx.fillStyle = '#fff';
    ctx.beginPath();

    ctx.moveTo(points1[0].x,points1[0].y);

    curRot = 0;

    for(var j=1;j<7;j++)
    {
      for(var i=0;i<pointsArrays.points1.length;i++)
      {
        ctx.lineTo(pointsArrays.points1[i].x,pointsArrays.points1[i].y);
      }

      for(var i=0;i<pointsArrays.points2.length;i++)
      {
        ctx.lineTo(pointsArrays.points2[i].x,pointsArrays.points2[i].y);   
      }

      ctx.rotate(60*Math.PI/180);
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();

    availableFlakes.push({
      flakeId:flakeId,
      userId:userId,
      texturePoints:points,
      texture: new THREE.Texture(canvas[0])
    });

    availableFlakes[availableFlakes.length -1].texture.needsUpdate = true;

    delete canvas;
    canvas = null;

    return availableFlakes.length -1;    
  };

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

  var wind = function(time,x)
  {
    var t = x*windWindowSize+time*windChangingTime;

    return Math.sin(t)*Math.cos(3*t)*Math.sin(5*t)*Math.cos(7*t-1)*Math.sin(11*t-2)*Math.cos(13*t-3)*Math.sin(17*t-4)*Math.cos(21*t-5);
  };

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

    camera = new THREE.OrthographicCamera( -windowHalfX, windowHalfX, windowHalfY, -windowHalfY, -1000, 1000 );

    scene = new THREE.Scene(); 
    // scene.fog = new THREE.FogExp2( 0x000000, 0.8 );

    // var textureLoader = new THREE.TextureLoader();
  }
// j=0;
  function animate()
  {
    if(!recycle && shownFlakes < maxFlakes)
        addAvailableFlakeToScene();
 
    simulate();
    renderer.render( scene, camera );

    requestAnimationFrame( animate );    
  }

  function simulate() 
  {
    var delta = clock.getDelta(); // In seconds
    var elapsedTime = clock.getElapsedTime();        

    // j++;

    // if(j%100 == 0)
    //   console.log(scene.children.length);

    for ( i = scene.children.length; i >= 0; i-- )
    {
      var object = scene.children[i];

      if(object instanceof THREE.Mesh)
      {
        if(object.position.y < -windowHalfY-60)
        {
          if(recycle)
          {
          // if(object.privateAttributes.userId == 0)
          // {
            // var geometry = toRemove[i].geometry;
            // var material = toRemove[i].material;
            randX = randomIntFromInterval(-windowHalfX,windowHalfX);
            // console.log("From: "+(-windowHalfX)+" to "+windowHalfX);

            object.position.y = object.privateAttributes.position.y = windowHalfY + 60 + Math.random()*60;
            object.position.x = object.privateAttributes.position.x = randX;
          }
          else
          {
            shownFlakes--;            

            scene.remove(object);

            object.geometry.dispose();
            object.material.dispose();
          }

            // // console.log("Removing "+i);

            // continue;
          // }
          // else
            // object.position.setY(windowHalfY+60);
        }

        var normalizePosition = (object.position.y+windowHalfY)/(2*windowHalfY);

        object.privateAttributes.position.x += wind(elapsedTime,normalizePosition)*windPower*delta; 

        if( object.privateAttributes.position.x > windowHalfX+60)
           object.privateAttributes.position.x = -windowHalfX-60;
        if( object.privateAttributes.position.x < -windowHalfX-60)
           object.privateAttributes.position.x = windowHalfX+60;

        object.position.set(
          object.privateAttributes.position.x + Math.cos((elapsedTime/object.privateAttributes.rotation.y)*2*Math.PI+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius,
          object.position.y - delta*object.privateAttributes.speed.h,
          object.privateAttributes.position.z + Math.sin((elapsedTime/object.privateAttributes.rotation.y)*2*Math.PI+object.privateAttributes.rotation.yPhase)*object.privateAttributes.rotation.yRadius
        );

        object.rotation.set(0,0,object.privateAttributes.rotation.zDirection*(elapsedTime / object.privateAttributes.rotation.z) + object.privateAttributes.rotation.zPhase, 'XYZ');

        var scale = Math.abs(object.position.z-object.privateAttributes.position.z)/object.privateAttributes.position.z/4+1;

        object.scale.x = scale;
        object.scale.y = scale;


        var element = highLightList.find(function(element){
          if(element.userId == object.privateAttributes.userId)
            return element;
        });

        if(element)
        {
          var color = new THREE.Color("hsl("+element.hue+",100%,"+Math.round(100-element.lightness*50)+"%)");
          object.material.color= color;
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

  }

  function saveState(connection) {

    console.log("[saveState] savestate");

    filteredArray = [];

    for(var i=0;i<availableFlakes.length;i++)
    {
      filteredArray.push(
        {
          flakeId:availableFlakes[i].flakeId,
          userId:availableFlakes[i].userId,
          texturePoints:availableFlakes[i].texturePoints
        });
    }

    // console.log("Save state:",filteredArray);

    connection.sendMessage({
      type: 'saveState',
      data: {flakes:filteredArray,hues:hues}
    });

  }

  function onOpen(connection) {
    connection.sendMessage({
      type: 'hello',
      data: {
        game: 'special-snowflake'
      }
    });
  }  

  function onMessage(connection, parsedMessage) {

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

    switch (parsedMessage.type) {
      case 'newSnowFlake':
        // console.log(parsedMessage);
        var id = addNewSnowflakeToList(parsedMessage.data.userId,false,parsedMessage.data.points,true);
        addAvailableFlakeToScene(id,true);
        highlightSnowflake(parsedMessage.data.userId,true);        
        break;
      case 'showMyFlakes':
        highlightSnowflake(parsedMessage.data.userId,true);
        // saveState(connection);        
        break;
      case 'hello': 
        // console.log("Restore state:",parsedMessage);

        for(var i=0;i<parsedMessage.data.state.flakes.length;i++)
        { 
          var item = parsedMessage.data.state.flakes[i];

          var id = addNewSnowflakeToList(item.userId,item.flakeId,item.texturePoints,false);
          // addAvailableFlakeToScene(id);
        }
        break;
      default:
        break;
    }
  }

  var addAvailableFlakeToScene = function(id,showOnFirstFace)
  {
    if(availableFlakes.length == 0)
      return;

    shownFlakes++;

    var flakeIndex = id;

    // console.log(id);

    if(id === undefined || id === null)
     flakeIndex = randomIntFromInterval(0,availableFlakes.length-1);

    var size = randomIntFromInterval(flakeMinSize,flakeMaxSize);

    var geometry = new THREE.PlaneGeometry(size,size);
 
    // console.log(flakeIndex,availableFlakes[flakeIndex]);

    var material = new THREE.MeshBasicMaterial({
      map: availableFlakes[flakeIndex].texture,
      blending: THREE.AdditiveBlending,
      side:THREE.FrontSide,
      depthTest: false,
      transparent : true,
      color:0xFFFFFF,
      opacity:1 });
    
    particle = new THREE.Mesh(geometry,material);

    particle.castShadow = false;
    particle.receiveShadow = false;

    var positionX = showOnFirstFace ? randomIntFromInterval(-windowHalfX,boundariesXrel[0]*windowHalfX*2-windowHalfX) : randomIntFromInterval(-windowHalfX,windowHalfX);
    var positionY = windowHalfY+60;
    var positionZ = randomIntFromInterval(40,80);

    particle.position.set(positionX,positionY,positionZ);

    particle.privateAttributes = {
      flakeId:availableFlakes[flakeIndex].flakeId,
      userId:availableFlakes[flakeIndex].userId,
      size:size,
      position:
      {
        x:positionX,
        y:positionY,
        z:positionZ
      },
      speed:
      {
        h:randomIntFromInterval(15,75) // Pixels/sec
      },
      rotation:
      {
        z:randomIntFromInterval(1,10), // in ms/rad
        zPhase:randomIntFromInterval(0,360)/(2*Math.PI),
        zDirection:randomIntFromInterval(-1,1),
        y:randomIntFromInterval(5,10), // in s/rad
        yPhase:randomIntFromInterval(0,360)/(2*Math.PI),
        yRadius:randomIntFromInterval(20,60)
      }
    };

    scene.add(particle);

  }

  init();
  animate();      

  var flakes = [];

  // flakes.push('[{"x":0.5,"y":0},{"x":0.36,"y":-0.17},{"x":0.21,"y":-0.15},{"x":0.09,"y":-0.08},{"x":0.35,"y":-0.17}]');
  // flakes.push('[{"x":0.39,"y":-0.05},{"x":0.13,"y":-0.23},{"x":0.45,"y":-0.01},{"x":0.47,"y":-0.03},{"x":0.09,"y":-0.03}]');
  // flakes.push('[{"x":0.38,"y":-0.16},{"x":0.43,"y":-0.1},{"x":0.32,"y":-0.05},{"x":0.13,"y":-0.1},{"x":0.23,"y":-0.11}]');
  // flakes.push('[{"x":0.21,"y":-0.18},{"x":0.42,"y":-0.03},{"x":0.02,"y":-0.05},{"x":0.31,"y":-0.03},{"x":0,"y":-0.21}]');
  // flakes.push('[{"x":0.17,"y":-0.01},{"x":0.11,"y":-0.07},{"x":0.14,"y":-0.2},{"x":0.29,"y":-0.17},{"x":0.03,"y":-0.16}]');
  // flakes.push('[{"x":0.01,"y":-0.02},{"x":0.01,"y":-0.15},{"x":0.18,"y":-0.02},{"x":0.13,"y":-0.06},{"x":0,"y":-0.08}]');
  // flakes.push('[{"x":0.12,"y":-0.24},{"x":0.32,"y":-0.03},{"x":0.37,"y":-0.01},{"x":0.2,"y":0},{"x":0.1,"y":-0.18}]');
  // flakes.push('[{"x":0.27,"y":0},{"x":0.22,"y":0},{"x":0.33,"y":-0.07},{"x":0.18,"y":-0.1},{"x":0.33,"y":-0.07}]');
  // flakes.push('[{"x":0.48,"y":0},{"x":0.35,"y":-0.01},{"x":0.04,"y":-0.06},{"x":0.49,"y":-0.01},{"x":0.14,"y":-0.06}]');
  // flakes.push('[{"x":0.13,"y":-0.16},{"x":0.29,"y":-0.07},{"x":0.39,"y":-0.08},{"x":0.13,"y":-0.17},{"x":0.46,"y":-0.05}]');
  // flakes.push('[{"x":0.49,"y":-0.02},{"x":0.18,"y":-0.06},{"x":0.42,"y":0},{"x":0.5,"y":0},{"x":0.09,"y":-0.13}]');
  // flakes.push('[{"x":0.43,"y":0},{"x":0.49,"y":-0.03},{"x":0.12,"y":-0.05},{"x":0.31,"y":-0.12},{"x":0.24,"y":-0.1}]');
  // flakes.push('[{"x":0.15,"y":-0.22},{"x":0.05,"y":-0.04},{"x":0.5,"y":0},{"x":0.38,"y":-0.12},{"x":0.5,"y":0}]');
  // flakes.push('[{"x":0.17,"y":-0.11},{"x":0.34,"y":-0.11},{"x":0.46,"y":0},{"x":0.1,"y":-0.02},{"x":0.05,"y":-0.04}]');
  // flakes.push('[{"x":0.42,"y":-0.13},{"x":0.5,"y":0},{"x":0.34,"y":-0.15},{"x":0.49,"y":-0.03},{"x":0.08,"y":-0.05}]');
  // flakes.push('[{"x":0.48,"y":-0.02},{"x":0.06,"y":-0.14},{"x":0.03,"y":-0.17},{"x":0.02,"y":-0.23},{"x":0.04,"y":-0.04}]');
  // flakes.push('[{"x":0.35,"y":-0.16},{"x":0.12,"y":-0.21},{"x":0.07,"y":-0.21},{"x":0.34,"y":-0.03},{"x":0.16,"y":-0.12}]');
  // flakes.push('[{"x":0.06,"y":-0.23},{"x":0.11,"y":-0.07},{"x":0.31,"y":-0.02},{"x":0.41,"y":-0.11},{"x":0.15,"y":-0.07}]');
  // flakes.push('[{"x":0.44,"y":0},{"x":0.1,"y":-0.21},{"x":0.33,"y":-0.15},{"x":0.06,"y":-0.07},{"x":0.2,"y":-0.1}]');
  // flakes.push('[{"x":0.18,"y":-0.2},{"x":0.43,"y":-0.12},{"x":0.34,"y":-0.07},{"x":0.19,"y":0},{"x":0.15,"y":-0.01}]');
  // flakes.push('[{"x":0.2,"y":-0.11},{"x":0.18,"y":-0.07},{"x":0.46,"y":-0.04},{"x":0.04,"y":-0.23},{"x":0.02,"y":-0.18}]');
  // flakes.push('[{"x":0.38,"y":-0.15},{"x":0.46,"y":-0.07},{"x":0.21,"y":-0.14},{"x":0.28,"y":-0.1},{"x":0.11,"y":-0.06}]');
  // flakes.push('[{"x":0.07,"y":-0.01},{"x":0.03,"y":-0.02},{"x":0.47,"y":-0.03},{"x":0.25,"y":-0.17},{"x":0.24,"y":-0.15}]');
  // flakes.push('[{"x":0.49,"y":0},{"x":0.27,"y":-0.1},{"x":0.02,"y":-0.01},{"x":0.18,"y":-0.06},{"x":0.14,"y":-0.2}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.1,"y":-0.04},{"x":0.14,"y":-0.01},{"x":0.48,"y":-0.02},{"x":0.16,"y":-0.15}]');
  // flakes.push('[{"x":0.03,"y":-0.01},{"x":0.29,"y":-0.06},{"x":0.12,"y":-0.04},{"x":0.35,"y":-0.17},{"x":0.24,"y":-0.1}]');
  // flakes.push('[{"x":0.02,"y":-0.16},{"x":0.19,"y":-0.03},{"x":0.36,"y":-0.1},{"x":0.06,"y":-0.01},{"x":0.13,"y":-0.14}]');
  // flakes.push('[{"x":0.09,"y":-0.21},{"x":0.49,"y":0},{"x":0,"y":-0.09},{"x":0.16,"y":-0.19},{"x":0.14,"y":-0.17}]');
  // flakes.push('[{"x":0.22,"y":-0.08},{"x":0.46,"y":-0.07},{"x":0.39,"y":-0.14},{"x":0,"y":-0.03},{"x":0.19,"y":-0.16}]');
  // flakes.push('[{"x":0.42,"y":-0.01},{"x":0.46,"y":-0.08},{"x":0.27,"y":-0.15},{"x":0.06,"y":-0.01},{"x":0.23,"y":-0.09}]');
  // flakes.push('[{"x":0,"y":0},{"x":0.23,"y":-0.16},{"x":0.49,"y":0},{"x":0.43,"y":0},{"x":0.15,"y":-0.18}]');
  // flakes.push('[{"x":0.29,"y":-0.12},{"x":0.5,"y":0},{"x":0.08,"y":-0.23},{"x":0.38,"y":-0.05},{"x":0.03,"y":0}]');
  // flakes.push('[{"x":0.05,"y":-0.1},{"x":0.24,"y":-0.13},{"x":0.03,"y":-0.04},{"x":0.02,"y":-0.24},{"x":0.42,"y":-0.03}]');
  // flakes.push('[{"x":0,"y":-0.08},{"x":0.17,"y":-0.18},{"x":0.43,"y":-0.02},{"x":0.25,"y":-0.18},{"x":0.09,"y":-0.19}]');
  // flakes.push('[{"x":0.24,"y":-0.08},{"x":0.02,"y":-0.14},{"x":0.37,"y":-0.14},{"x":0.44,"y":-0.06},{"x":0.47,"y":0}]');
  // flakes.push('[{"x":0.09,"y":-0.02},{"x":0.06,"y":-0.05},{"x":0.4,"y":-0.12},{"x":0.21,"y":-0.18},{"x":0.06,"y":-0.1}]');
  // flakes.push('[{"x":0.43,"y":-0.04},{"x":0.19,"y":-0.08},{"x":0.05,"y":-0.07},{"x":0.06,"y":-0.14},{"x":0.06,"y":-0.05}]');
  // flakes.push('[{"x":0.47,"y":-0.01},{"x":0.01,"y":-0.1},{"x":0.1,"y":-0.08},{"x":0.09,"y":-0.18},{"x":0.17,"y":-0.1}]');
  // flakes.push('[{"x":0.07,"y":-0.24},{"x":0.45,"y":-0.08},{"x":0.47,"y":-0.07},{"x":0.45,"y":-0.02},{"x":0.4,"y":-0.01}]');
  // flakes.push('[{"x":0.22,"y":-0.11},{"x":0.43,"y":-0.05},{"x":0.2,"y":-0.18},{"x":0.02,"y":-0.09},{"x":0.24,"y":-0.04}]');
  // flakes.push('[{"x":0.37,"y":-0.05},{"x":0.09,"y":-0.06},{"x":0.3,"y":-0.07},{"x":0.08,"y":-0.02},{"x":0.07,"y":0}]');
  // flakes.push('[{"x":0.12,"y":-0.04},{"x":0.13,"y":-0.12},{"x":0.05,"y":-0.11},{"x":0.16,"y":-0.01},{"x":0.12,"y":-0.09}]');
  // flakes.push('[{"x":0.37,"y":-0.06},{"x":0.12,"y":-0.01},{"x":0.18,"y":-0.14},{"x":0.12,"y":0},{"x":0.06,"y":-0.01}]');
  // flakes.push('[{"x":0.12,"y":-0.19},{"x":0.04,"y":-0.15},{"x":0.17,"y":-0.2},{"x":0.13,"y":-0.09},{"x":0.18,"y":-0.13}]');
  // flakes.push('[{"x":0.08,"y":-0.23},{"x":0.24,"y":-0.05},{"x":0.21,"y":-0.2},{"x":0.14,"y":-0.1},{"x":0.28,"y":-0.05}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.31,"y":-0.08},{"x":0.4,"y":-0.08},{"x":0.48,"y":-0.02},{"x":0.43,"y":-0.01}]');
  // flakes.push('[{"x":0.38,"y":0},{"x":0.21,"y":-0.14},{"x":0.35,"y":-0.09},{"x":0.4,"y":-0.1},{"x":0.06,"y":-0.17}]');
  // flakes.push('[{"x":0.45,"y":-0.01},{"x":0.07,"y":-0.23},{"x":0.12,"y":-0.12},{"x":0.03,"y":-0.01},{"x":0.02,"y":-0.21}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.37,"y":-0.05},{"x":0.11,"y":-0.02},{"x":0.01,"y":-0.23},{"x":0.22,"y":-0.05}]');
  // flakes.push('[{"x":0.02,"y":-0.03},{"x":0.27,"y":-0.21},{"x":0.29,"y":-0.1},{"x":0.3,"y":-0.11},{"x":0.03,"y":-0.07}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.19,"y":-0.02},{"x":0.28,"y":-0.02},{"x":0.14,"y":-0.01},{"x":0.05,"y":-0.17}]');
  // flakes.push('[{"x":0.08,"y":-0.02},{"x":0.19,"y":-0.07},{"x":0.17,"y":-0.13},{"x":0.31,"y":-0.14},{"x":0.03,"y":-0.01}]');
  // flakes.push('[{"x":0.13,"y":-0.21},{"x":0.45,"y":-0.1},{"x":0.48,"y":-0.06},{"x":0.44,"y":-0.03},{"x":0.06,"y":-0.06}]');
  // flakes.push('[{"x":0.1,"y":-0.24},{"x":0.48,"y":-0.05},{"x":0.14,"y":-0.22},{"x":0.41,"y":-0.09},{"x":0.28,"y":0}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.02,"y":-0.05},{"x":0.31,"y":-0.13},{"x":0.02,"y":-0.12},{"x":0.02,"y":-0.09}]');
  // flakes.push('[{"x":0.42,"y":-0.12},{"x":0.48,"y":-0.03},{"x":0.31,"y":-0.19},{"x":0.03,"y":-0.11},{"x":0.19,"y":-0.17}]');
  // flakes.push('[{"x":0.17,"y":-0.01},{"x":0.5,"y":0},{"x":0.21,"y":-0.08},{"x":0.18,"y":-0.06},{"x":0.07,"y":-0.17}]');
  // flakes.push('[{"x":0.42,"y":-0.06},{"x":0.29,"y":-0.07},{"x":0.37,"y":-0.11},{"x":0.48,"y":-0.02},{"x":0.08,"y":-0.04}]');
  // flakes.push('[{"x":0.43,"y":-0.12},{"x":0.07,"y":-0.18},{"x":0.29,"y":-0.14},{"x":0.27,"y":-0.19},{"x":0.07,"y":-0.1}]');
  // flakes.push('[{"x":0.18,"y":-0.06},{"x":0.14,"y":-0.05},{"x":0.1,"y":-0.05},{"x":0.12,"y":-0.15},{"x":0.1,"y":-0.09}]');
  // flakes.push('[{"x":0.11,"y":-0.07},{"x":0.38,"y":0},{"x":0.46,"y":-0.03},{"x":0.14,"y":-0.08},{"x":0.2,"y":-0.06}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.14,"y":-0.06},{"x":0.43,"y":-0.09},{"x":0.13,"y":-0.02},{"x":0.1,"y":-0.06}]');
  // flakes.push('[{"x":0.5,"y":0},{"x":0.07,"y":-0.03},{"x":0.08,"y":0},{"x":0.15,"y":-0.17},{"x":0.18,"y":-0.07}]');
  // flakes.push('[{"x":0.42,"y":-0.03},{"x":0.28,"y":-0.03},{"x":0.27,"y":-0.03},{"x":0.44,"y":-0.11},{"x":0.1,"y":0}]');
  // flakes.push('[{"x":0.29,"y":-0.01},{"x":0.42,"y":-0.07},{"x":0.41,"y":-0.13},{"x":0.03,"y":-0.01},{"x":0.22,"y":-0.13}]');
  // flakes.push('[{"x":0.14,"y":0},{"x":0.04,"y":-0.18},{"x":0.05,"y":-0.13},{"x":0.1,"y":-0.02},{"x":0.31,"y":0}]');
  // flakes.push('[{"x":0.05,"y":-0.16},{"x":0.37,"y":-0.11},{"x":0.48,"y":-0.01},{"x":0.3,"y":-0.19},{"x":0.08,"y":0}]');

  // flakes.push(' [{"x":0.46,"y":-0.0881816307401944},{"x":0.08,"y":-0.14806755215103679},{"x":-0.44,"y":-0.1021193419485261},{"x":0.18,"y":-0.13527808396041097},{"x":0.14,"y":-0.072}]');

  // for(var i=0;i<flakes.length;i++)
  // {
  //   addNewSnowflakeToList(0,false,JSON.parse(flakes[i]),false);
  // }


  // window.setInterval(function(){

  //   var rand = function()
  //   {
  //     var x = randomIntFromInterval(0,50)/100;

  //     var maxY = Math.sqrt(Math.pow(0.5,2)-Math.pow(x,2));

  //     var y = -randomIntFromInterval(0,Math.floor(50*maxY))/100;

  //     return {x:x,y:y};
  //   }

  //   var p1 = rand();
  //   var p2 = rand();
  //   var p3 = rand();
  //   var p4 = rand();
  //   var p5 = rand();

  //   addNewSnowflakeToList(0,'[{"x":'+p1.x+',"y":'+p1.y+'},{"x":'+p2.x+',"y":'+p2.y+'},{"x":'+p3.x+',"y":'+p3.y+'},{"x":'+p4.x+',"y":'+p4.y+'},{"x":'+p5.x+',"y":'+p5.y+'}]',true);



  // },100);

  // window.setInterval(function(){
  //   highlightSnowflake(0,randomIntFromInterval(0,255),true);
  //   console.log("availableFlakes: "+availableFlakes.length);
  // },30000);

  var connection = new WebsocketConnection(
    wsHost,
    8000,
    {
      open: onOpen,
      close: function () {},
      message: onMessage
    }, {
      autoConnect: true,
      autoReconnect: true
    }
  );

  window.setInterval(function(){
    
    if(lastAmountOfFlakes == availableFlakes.length)
      return;

    lastAmountOfFlakes = availableFlakes.length;


    saveState(connection);

  },30000);  
}
 
