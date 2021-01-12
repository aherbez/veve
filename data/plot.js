ctx.save();
ctx.lineWidth = 4;
ctx.translate(-stage.width * 0.4, -stage.height * 0.4);
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(0, stage.height * 0.8);
ctx.stroke();

ctx.moveTo(0, stage.height * 0.4);
ctx.lineTo(stage.width * 0.8, stage.height * 0.4);
ctx.stroke();
ctx.closePath();

// draw the function
ctx.save();
ctx.translate(0, stage.height * 0.4);
ctx.lineWidth = 4;
ctx.strokeStyle = "#00F";
ctx.beginPath();
ctx.moveTo(0,0);

for (let i=0; i < 100; i++) {
    let u = (i/99.0);
    let x = u * time * stage.width * 0.8;
    let input = u * (time * Math.PI * 4);
    let y = -Math.abs(Math.sin(input)) * 100;

    ctx.lineTo(x, y);
}
ctx.stroke();
ctx.closePath();

ctx.restore();

ctx.restore();