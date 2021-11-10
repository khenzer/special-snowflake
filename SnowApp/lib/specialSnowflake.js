/**
 * @brief JS lib supporting the Special Snowflake WebApp UI. 
 * 
 * Depends jQuery and jQueryUI for the .draggable feature
 * 
 * @author Kevin Henzer, Florian Segginger
 */

$(document).ready(function(){

  // Are we running in debug mode?
  var debug = window.location.hash && window.location.hash.substring(1) == 'debug';

  // URL to send our snowflakes to
  var serverUrl = null;

  // Amount of petals
  var petalAmount = 6;

  // Color of the snowflake
  var snowFlakeColor = 'rgba(0,255,255,0.5)';

  // UI State variables
  var sendDisabled = false;

  var $wrapper = $("#wrapper");
  var $canvas = $("#wrapper canvas");

  var ctx = $canvas[0].getContext("2d");

  ctx.canvas.height = $wrapper.outerHeight();
  ctx.canvas.width = $wrapper.outerWidth();

  // List of snowflake edges, and its symmetry
  var points1 = []; 
  var points2 = []; 

  // Sync points list from cursor DOM elements
  //
  // This function is common to both the WebApp and the Web renderer
  //
  var updatePointList = function(){

    points1 = [];
    points2 = [];

    var orthX,orthY,orthXsym,orthYsym;

    $(".cursor").each(function(){

      // This function is common to both the WebApp and the Web renderer

      // Get coordinates of the cursors, in pixels, with the middle of the snowflake as origin
      orthX = -($wrapper.width()/2-$(this).position().left-$(this).width()/2);
      orthY = -($wrapper.outerHeight()/2-$(this).position().top-$(this).height()/2);

      // Constraint x
      if(orthX > $wrapper.width()/2)
        orthX = $wrapper.width()/2;
      else if(orthX < 0)
        orthX = 0;

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

    });

    points2.reverse();
  };

  // Draw actual snowflake shape from points list
  var drawcanvas = function(ctx)
  {
    var debugColors = ['#FF0000','#FFFF00','#00FFFF','#0000FF','#00FF00','#FF00FF'];
    ctx.fillStyle = '#000';    
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();

    ctx.translate($wrapper.width()/2,$wrapper.outerHeight()/2);

    if(debug)
      ctx.font = "60px Arial";

    ctx.beginPath();
    ctx.moveTo(points1[0].x,points1[0].y);


    for(var j=1;j<petalAmount+1;j++)
    {
      if(debug)
        ctx.fillStyle = debugColors[j-1];

      for(var i=0;i<points1.length;i++)
      {
        if(debug)
          ctx.fillText(`${j-1} ${i} {${Math.round(points1[i].x,1)};${Math.round(points1[i].y,1)}}`,points1[i].x,points1[i].y);                 
        
        ctx.lineTo(points1[i].x,points1[i].y);
      }
      
      for(var i=0;i<points2.length;i++)
      {
        if(debug)
          ctx.fillText(`#2 ${j-1} ${i} {${Math.round(points2[i].x,1)};${Math.round(points2[i].y,1)}}`,points2[i].x+30,points2[i].y+30);                 
        
        ctx.lineTo(points2[i].x,points2[i].y);   
      }

      ctx.rotate(360/petalAmount*Math.PI/180);
    }

    ctx.closePath();

    if(debug)
    {
      ctx.strokeStyle = '#FF0000';
      ctx.stroke();
    }
    ctx.fillStyle = snowFlakeColor;    
    ctx.fill();

    ctx.restore();
  };

  // Make DOM cursors draggeable, and install the correct callbacks
  var makeDraggable = function()
  {
    
    var startCallback = function(handle,ui){

      if($(".cursor").length < 5)
      {
        $(handle).next('.set').before($('<div class="cursor"><div></div></div>'));
        $(handle).prev('.set').after( $('<div class="cursor"><div></div></div>'));
      }
      $(handle).addClass("set");
    }; 

    var dragCallback = function(handle,ui){

      var curPos = {
        left:$(handle).position().left,
        top:$(handle).position().top
      };

      centerPos = {top:$wrapper.outerWidth()/2,left:$wrapper.outerHeight()/2};

      if(ui.position.top > centerPos.top - $(handle).height()/2)
      {
        console.log("Constraining top");
        ui.position.top = curPos.top = centerPos.top - $(handle).height()/2;
      }

      if(ui.position.left < centerPos.left-$(handle).width()/2)
      {
        console.log("Constraining left");      
        ui.position.left = curPos.left = centerPos.left-$(handle).width()/2;        
      }

      if(ui.position.top < 0)
      {
        console.log("Constraining top");      
        ui.position.top = curPos.top = 0;
      }

      if(ui.position.left > $wrapper.outerWidth()-$(handle).width())
      {
        console.log("Constraining left");      
        ui.position.left = curPos.left = $wrapper.outerWidth()-$(handle).width();  
      }

      var leftItem = $(handle).prev().prev();
      var rightItem = $(handle).next().next();

      if(leftItem.length > 0)
      {
        var leftBase = leftItem.position();

        $(handle).prev(':not(".set")').css({
          top:((leftBase.top+curPos.top)/2)+'px',
          left:((leftBase.left+curPos.left)/2)+'px'});
      }

      if(rightItem.length > 0)
      {
        var rightBase = rightItem.position();

        $(handle).next(':not(".set")').css({
          top:((rightBase.top+curPos.top)/2)+'px',
          left:((rightBase.left+curPos.left)/2)+'px'});
      }
    };

    var stopCallback  = function(handle){

      makeDraggable();
    };

   $(".cursor").draggable({

      start: function(e,ui) {

        startCallback($(this),ui);

      },
      drag: function(e, ui) {

        $("#log").html($("#log").html()+"*");

        dragCallback($(this),ui);
        
        updatePointList();
        drawcanvas(ctx);
      },
      stop: function() { 

        stopCallback($(this));

        updatePointList();
        drawcanvas(ctx);
      }
    }); 
  };

  // Install UI buttons callbacks

  var setPetalsAmount = function(amount){
    
    if(petalAmount == amount)
      return;

    petalAmount = amount;
    resetUI();
  };

  var resetUI = function(){

    // Remove all cursors, and re-create the original 3 
    $(".cursor").remove();

    $wrapper.children("canvas").after('<div class="cursor set boundary" id="leftBoundary"></div>\
      <div class="cursor" id="middleBoundary"></div>\
      <div class="cursor set boundary" id="rightBoundary"></div>');    

    // Adjust initial position according to the amount of petals
    var petalAngle = 2*Math.PI/petalAmount/2; 

    $('#rightBoundary').css({'left':Math.sin(petalAngle)*50+50+'%'}).addClass("set");
    $('#rightBoundary').css({'top':50-Math.cos(petalAngle)*50+'%'});

    $('#middleBoundary').css({'left':Math.sin(petalAngle/2)*30+50+'%'}).addClass("set");
    $('#middleBoundary').css({'top':50-Math.cos(petalAngle/2)*30+'%'});

    makeDraggable();

    // Compensate cursor width/height
    $(".cursor").each(function(){
      $(this).css({left:$(this).position().left-$(this).width()/2+"px"});
      $(this).css({top:$(this).position().top-$(this).height()/2+"px"});
    });

    // Re-draw
    updatePointList();
    drawcanvas(ctx);     
  }

  $("#petals_4").click(() => {setPetalsAmount(4)});
  $("#petals_6").click(() => {setPetalsAmount(6)});
  $("#petals_8").click(() => {setPetalsAmount(8)});

  $("#send").click(function(){
    
    if(sendDisabled)
      return false;

    updatePointList();
    drawcanvas(ctx);    
    
    $(this).addClass('disabled');    
    sendDisabled = true;

    var normalizedPoints = [];

    for(var i=0;i<points1.length;i++)
      normalizedPoints.push({x:points1[i].x/$wrapper.width(),y:points1[i].y/$wrapper.outerHeight()});

    console.log(JSON.stringify({petalAmount:petalAmount,normalizedPoints:normalizedPoints}));

    // Send new snowflake to the server
    $.post(serverUrl, { 
      type:"newSnowFlake",
      data:JSON.stringify({petalAmount:petalAmount,points:normalizedPoints})
    });    

    // Allow sending a new one after 5 seconds
    window.setTimeout(function(){
      
      $("#send").removeClass('disabled');
      sendDisabled = false;

    },5000);    
  });

  $("#reset").click(function(){resetUI();});

  $("#showMyFlakes").click(function(){

    $.get(serverUrl, { 
      type:"showMyFlakes",
      data:''
    });   
  });

  makeDraggable();

  // Center DOM cursors
  $(".cursor").each(function(){
    $(this).css({left:$(this).position().left-$(this).width()/2+"px"});
    $(this).css({top:$(this).position().top-$(this).height()/2+"px"});
  });

  updatePointList();
  drawcanvas(ctx);
});