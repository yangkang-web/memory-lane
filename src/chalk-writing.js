// Original single-stroke lettering keeps the board hand-written on every OS,
// including devices without a handwriting font installed.
const letters = {
  A: ['M1 20 L9 0 L16 20 M4 12 L13 12',18],
  a: ['M12 9 C8 3 1 8 2 15 C3 22 11 19 12 12 M12 7 L12 19 L15 18',16],
  b: ['M3 0 L2 19 M3 11 C13 0 18 16 10 19 C5 21 2 16 3 11',17],
  e: ['M2 13 C18 13 13 4 6 7 C-1 10 2 23 13 18',16],
  g: ['M12 9 C5 3 0 11 3 17 C7 22 13 16 12 8 L12 24 C11 29 3 28 2 24',16],
  i: ['M5 8 L4 18 Q5 21 9 18 M5 2 L5 2.5',10],
  n: ['M2 8 L2 19 M2 12 C8 3 13 5 13 12 L13 19',17],
  o: ['M8 7 C-1 7 0 20 8 20 C17 20 17 7 8 7',18],
  s: ['M13 8 C4 2 -1 11 7 13 C18 16 10 24 2 18',16],
  w: ['M1 7 L5 20 L11 10 L15 20 L21 7',24],
  ',': ['M3 19 L1 24',8],
  '.': ['M3 19 L3.3 19.3',8],
};

export function drawChalkWriting(ctx,text,x,y,height,angle=0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(height/24,height/24);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=.9;
  ctx.strokeStyle='rgba(231,233,209,.95)';
  for(let i=0;i<text.length;i++) {
    const glyph=letters[text[i]];
    if(!glyph){ctx.translate(9,0);continue;}
    ctx.save();ctx.translate(0,Math.sin(i*2.4)*.6);ctx.rotate(Math.sin(i*1.7)*.035);
    ctx.stroke(new Path2D(glyph[0]));ctx.restore();ctx.translate(glyph[1]+2,0);
  }
  ctx.restore();
}
