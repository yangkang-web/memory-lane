import * as T from 'three';

export function createPlantTextures(texture,random) {
  const range=(a,b)=>a+(b-a)*random();
  function leaf(c,x,y,length,width,angle,color) {
    c.save();c.translate(x,y);c.rotate(angle);
    const g=c.createLinearGradient(-width,0,width,0);g.addColorStop(0,color);g.addColorStop(.5,'#829260');g.addColorStop(1,'#344b2d');c.fillStyle=g;
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-width,-length*.3,-width*.6,-length*.8,0,-length);c.bezierCurveTo(width*.75,-length*.7,width,-length*.25,0,0);c.fill();
    c.strokeStyle='#9ba16c80';c.lineWidth=.7;c.beginPath();c.moveTo(0,0);c.lineTo(0,-length*.9);c.stroke();c.restore();
  }
  const leafMap=texture(512,512,c=>{
    for(let twig=0;twig<5;twig++) {
      const bx=256+range(-80,80),by=470-range(0,130),ex=range(80,440),ey=range(35,170);
      c.strokeStyle='#4c5134';c.lineWidth=2;c.beginPath();c.moveTo(bx,by);c.quadraticCurveTo(bx,ey,ex,ey);c.stroke();
      for(let k=1;k<10;k++) {
        const t=k/10,x=bx+(ex-bx)*t*t,y=by+(ey-by)*(2*t-t*t);
        for(const s of [-1,1])leaf(c,x+s*3,y,range(28,58),range(11,19),s*range(.6,1.2),['#526845','#657a48','#455e3b'][twig%3]);
      }
    }
  });
  const ivyMap=texture(256,256,c=>{
    const g=c.createLinearGradient(35,50,210,230);g.addColorStop(0,'#718248');g.addColorStop(.45,'#425b33');g.addColorStop(1,'#293e29');c.fillStyle=g;
    c.beginPath();c.moveTo(128,242);c.bezierCurveTo(102,199,34,205,17,132);c.lineTo(64,137);c.lineTo(40,57);c.lineTo(102,88);c.lineTo(127,8);c.lineTo(152,88);c.lineTo(218,54);c.lineTo(190,137);c.lineTo(239,132);c.bezierCurveTo(211,202,154,204,128,242);c.fill();
    c.strokeStyle='#afad735d';c.lineWidth=2.5;
    for(const [x,y]of [[127,18],[48,65],[24,137],[210,65],[230,137]]){c.beginPath();c.moveTo(128,230);c.quadraticCurveTo(125,140,x,y);c.stroke();}
    for(let i=0;i<250;i++){c.fillStyle='#c9b98f10';const x=range(70,185),y=range(95,175);c.fillRect(x,y,1,2);}
  });
  return {leafMap,ivyMap};
}

// Curved, folded blades cast real silhouettes instead of standing as flat grass pictures.
export function grassGeometry(random) {
  const positions=[],colors=[],indices=[],uv=[];
  const color=new T.Color();
  for(let blade=0;blade<18;blade++) {
    const a=random()*Math.PI*2,r=Math.sqrt(random())*.35,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const height=.3+random()*.7,width=.014+random()*.026,bend=.14+random()*.35,offset=positions.length/3;
    for(let j=0;j<=4;j++) {
      const t=j/4,w=width*(1-t)+.001,cx=x+Math.cos(a)*bend*t*t,cz=z+Math.sin(a)*bend*t*t,y=-.5+height*t;
      color.setHSL(.19+random()*.035,.32+random()*.16,.045+t*.09);
      for(const s of [-1,1]){positions.push(cx+Math.cos(a+Math.PI/2)*w*s,y,cz+Math.sin(a+Math.PI/2)*w*s);colors.push(color.r,color.g,color.b);uv.push((s+1)/2,t);}
      if(j<4){const k=offset+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(positions.length,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function fernGeometry() {
  const p=[],uv=[],idx=[];
  function leaf(x,y,z,tx,ty,tz,width) {
    const n=p.length/3,dx=tx-x,dz=tz-z,length=Math.hypot(dx,dz)||1;
    p.push(x,y,z,x+dx*.5-dz/length*width,y+(ty-y)*.5+.025,z+dz*.5+dx/length*width,tx,ty,tz,x+dx*.5+dz/length*width,y+(ty-y)*.5-.015,z+dz*.5-dx/length*width);
    uv.push(.5,0,0,.5,.5,1,1,.5);idx.push(n,n+1,n+2,n,n+2,n+3);
  }
  for(let i=0;i<9;i++) {
    const angle=i*2.4,len=.55+(i%3)*.17;
    for(let j=1;j<10;j++) {
      const t=j/10,r=len*t,y=.65*Math.sin(t*2),x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      for(const s of [-1,1]){const a=angle+s*.9,reach=.18*Math.sin(t*Math.PI);leaf(x,y,z,x+Math.cos(a)*reach,y-.025,z+Math.sin(a)*reach,.034*(1-t));}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
