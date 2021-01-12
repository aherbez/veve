let xPos = -50;
let yPos = -50;

ctx.save();
ctx.fillStyle = "#0F0";
ctx.translate(Math.sin(time * 20) * 50,
    Math.cos(time * 20) * 50);
    
ctx.fillRect(xPos, yPos, 100, 100);
ctx.restore();

ctx.save();
ctx.translate(time * stage.width - (stage.width/2), -5);
ctx.fillStyle = "#00F";
ctx.fillRect(10, 10, 20, 10);
ctx.restore();




