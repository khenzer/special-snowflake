$(document).ready(function(){

  var serverUrl = "http://lausanne.pimp-my-wall.ch";
  var serverPage = "";

  var sendDisabled = false;

  var origPosLeft={top:$("#leftBoundary").position().top,left:$("#leftBoundary").position().left};
  var origPosRight={top:$("#rightBoundary").position().top,left:$("#rightBoundary").position().left};

  var $wrapper = $("#wrapper");
  var $canvas = $("#wrapper canvas");

  var ctx = $canvas[0].getContext("2d");

  ctx.canvas.height = $wrapper.outerHeight();
  ctx.canvas.width = $wrapper.outerWidth();

  var userId = '';

  var points1 = []; 
  var points2 = []; 

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

    // $(handle).parent().css({left:curPos.left+'px',top:curPos.top+'px'});


    console.log(1,curPos); 

    // curPos.top += $(handle).height()/2;
    // curPos.left += $(handle).width()/2;

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

      // leftBase.left += leftItem.width()/2;
      // leftBase.top += leftItem.height()/2;

      $(handle).prev(':not(".set")').css({
        top:((leftBase.top+curPos.top)/2)+'px',
        left:((leftBase.left+curPos.left)/2)+'px'});
    }

    if(rightItem.length > 0)
    {
      var rightBase = rightItem.position();

      // rightBase.left += rightItem.width()/2;    
      // rightBase.top += rightItem.height()/2;

      $(handle).next(':not(".set")').css({
        top:((rightBase.top+curPos.top)/2)+'px',
        left:((rightBase.left+curPos.left)/2)+'px'});
    }

    console.log(2,$(handle).position());    
  };

  var stopCallback  = function(handle){

    $(".cursor").each(function(){
      
      // var topAbs = ($(this).position().top);
      // var topRel = topAbs/$wrapper.outerHeight()*100;
      // var leftAbs = ($(this).position().left);
      // var leftRel = leftRel/$wrapper.width()*100;

      // $(this).css({
      //   top:topRel+'%',
      //   left:leftRel+'%'
      // });

    });
      makeDraggable();

  };


  var updatePointList = function(){

    points1 = [];
    points2 = [];

    var orthX,orthY,orthXsym,orthYsym;

    $(".cursor").each(function(){

      orthX = -($wrapper.width()/2-$(this).position().left-$(this).width()/2);
      orthY = -($wrapper.outerHeight()/2-$(this).position().top-$(this).height()/2);

      var r = Math.sqrt(Math.pow(orthX,2)+Math.pow(orthY,2));

      if(orthX<=0)
        orthX = 0.000001;
      if(orthX >$wrapper.width()/2)
        orthX = $wrapper.width()/2;    

      // if(orthY <= 0)
      //   orthY = 0.000001;          
      // if(orthY > $wrapper.height()/2)
      //   orthY = $wrapper.height()/2;

      var theta = Math.atan(orthY/orthX);

      var thetaSym = theta-2*(theta+Math.PI/3);

      orthXsym = r*Math.cos(thetaSym);
      orthYsym = r*Math.sin(thetaSym);      

      points1.push({x:orthX,y:orthY});
      points2.push({x:orthXsym,y:orthYsym});

    });

    points2.reverse();
  };

  var drawcanvas = function(ctx)
  {
    ctx.fillStyle = '#000';    
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();

    ctx.translate($wrapper.width()/2,$wrapper.outerHeight()/2);

    ctx.fillStyle = '#A5F2F3';
    ctx.beginPath();

    ctx.moveTo(points1[0].x,points1[0].y);

    curRot = 0;

    for(var j=1;j<7;j++)
    {
      for(var i=0;i<points1.length;i++)
        ctx.lineTo(points1[i].x,points1[i].y);

      for(var i=0;i<points2.length;i++)
        ctx.lineTo(points2[i].x,points2[i].y);   

      ctx.rotate(60*Math.PI/180);
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  var makeDraggable = function()
  {

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
  }

  $("#send").click(function(){
    
    if(sendDisabled)
      return false;

    updatePointList();
    drawcanvas(ctx);    
    
    sendDisabled = true;

    var normalizedPoints = [];

    for(var i=0;i<points1.length;i++)
    {
      normalizedPoints.push({x:points1[i].x/$wrapper.width(),y:points1[i].y/$wrapper.height()});

      if(normalizedPoints[i].x < 0)
        normalizedPoints[i].x = 0;
      if(normalizedPoints.x > 1)
        normalizedPoints[i].x = 1;

      if(normalizedPoints[i].y < 0)
        normalizedPoints[i].y = 0;
      if(normalizedPoints.y > 1)
        normalizedPoints[i].y = 1;
    }

    $(this).addClass('disabled');

    console.log(JSON.stringify(normalizedPoints));

    $.post(serverUrl+serverPage, { 
      type:"newSnowFlake",
      data:JSON.stringify(normalizedPoints)
    });    

    window.setTimeout(function(){
      
      $("#send").removeClass('disabled');
      sendDisabled = false;

    },5000);

  });

  $("#reset").click(function(){

    $(".cursor").remove();

    $wrapper.children("canvas").after('<div class="cursor set boundary" id="leftBoundary"></div>\
      <div class="cursor" id="middleBoundary"></div>\
      <div class="cursor set boundary" id="rightBoundary"></div>');

    makeDraggable();

    $(".cursor").each(function(){
      $(this).css({left:$(this).position().left-$(this).width()/2+"px"});
      $(this).css({top:$(this).position().top-$(this).height()/2+"px"});
    });

    updatePointList();
    drawcanvas(ctx);    
  });

  $("#showMyFlakes").click(function(){

    $.get(serverUrl+serverPage, { 
      type:"showMyFlakes",
      data:userId
    });   

  });

  makeDraggable();

  $(".cursor").each(function(){
    $(this).css({left:$(this).position().left-$(this).width()/2+"px"});
    $(this).css({top:$(this).position().top-$(this).height()/2+"px"});
  });

  updatePointList();
  drawcanvas(ctx);
});