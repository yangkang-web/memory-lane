import * as T from 'three';

const WIDTH=2048, HEIGHT=1024;
let cloudLayers;

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function noise(x,y) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
function detail(x,y) {
  return noise(x,y)*.56+noise(x*2.07+13,y*2.07)*.27+noise(x*4.13,y*4.13+7)*.12+noise(x*8.31,y*8.31)*.05;
}

// Bake once, then reuse identical silhouettes for daylight and sunset. No per-frame cloud work.
function makeCloudLayers() {
  let seed=475;
  const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  const layers=[];
  for(let i=0;i<27;i++) {
    const distant=i<11;
    const width=Math.round(distant?85+rand()*125:140+rand()*180);
    const height=Math.round(distant?18+rand()*18:55+rand()*55);
    const x=(i*(WIDTH/11)+rand()*95)%WIDTH;
    const y=distant?432+rand()*30:270+rand()*135;
    const lobes=Array.from({length:7},(_,j)=>({
      x:.16+j*.11+(rand()-.5)*.07,
      y:.49-Math.sin(j/6*Math.PI)*(.12+rand()*.12),
      rx:.12+rand()*.07,ry:.19+rand()*.15,
    }));
    const pixels=new Float32Array(width*height*2),offset=rand()*200;
    for(let py=0;py<height;py++)for(let px=0;px<width;px++) {
      const u=px/width,v=py/height;
      const n=detail(u*7+offset,v*4+offset);
      const warpX=(noise(u*12+offset,v*9)-.5)*.045;
      const warpY=(noise(u*11,v*12+offset)-.5)*.065;
      let body=0;
      for(const lobe of lobes) {
        const dx=(u+warpX-lobe.x)/lobe.rx,dy=(v+warpY-lobe.y)/lobe.ry;
        body=Math.max(body,1-dx*dx-dy*dy);
      }
      const density=body+(n-.5)*.65;
      const edge=smooth(0,.1,u)*(1-smooth(.9,1,u))*smooth(0,.1,v);
      const alpha=smooth(-.12,.34,density)*(1-smooth(.57,.82,v))*edge*(distant?.58:.96);
      const shade=smooth(.27,.73,v)*.55+(1-n)*.3;
      const p=(py*width+px)*2;pixels[p]=alpha;pixels[p+1]=shade;
    }
    layers.push({x,y,width,height,pixels});
  }
  return layers;
}

function paintClouds(ctx,sunset) {
  cloudLayers??=makeCloudLayers();
  for(const {x,y,width,height,pixels} of cloudLayers) {
    const patch=document.createElement('canvas');patch.width=width;patch.height=height;
    const pctx=patch.getContext('2d'),image=pctx.createImageData(width,height);
    const lit=sunset?[255,246,230]:[255,255,253];
    const shade=sunset?[192,181,189]:[166,193,213];
    for(let p=0;p<width*height;p++) {
      const shadow=pixels[p*2+1];
      for(let c=0;c<3;c++)image.data[p*4+c]=lit[c]+(shade[c]-lit[c])*shadow;
      image.data[p*4+3]=pixels[p*2]*255;
    }
    pctx.putImageData(image,0,0);
    // Wrap across the longitude seam, including clouds that straddle the edge.
    for(const shift of [-WIDTH,0,WIDTH])ctx.drawImage(patch,x-width/2+shift,y-height/2);
  }
}

export function springSky(sunset=false) {
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d'),g=ctx.createLinearGradient(0,0,0,HEIGHT);
  g.addColorStop(0,sunset?'#829ec5':'#478fcb');
  g.addColorStop(.27,sunset?'#b6c6df':'#69b2e5');
  g.addColorStop(.43,sunset?'#e6d4d3':'#a3cfee');
  g.addColorStop(.5,sunset?'#f7e2c9':'#dceaf1');
  g.addColorStop(.6,'#e8eadc');g.addColorStop(1,'#e8eadc');
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  paintClouds(ctx,sunset);
  let seed=475;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  // Low-contrast distant hills and rooflines behind the three-dimensional trees.
  for(let layer=0;layer<3;layer++) {
    ctx.fillStyle=(sunset?['#c4c1be','#adb8b0','#a6b39c']:['#c4d9df','#b7ced0','#adc5ba'])[layer];
    ctx.beginPath();ctx.moveTo(0,620);
    for(let x=0;x<=WIDTH;x+=8)ctx.lineTo(x,496+layer*12-Math.pow(Math.sin(x*Math.PI/512+layer),2)*(27-layer*5)-Math.sin(x*Math.PI/256)*9);
    ctx.lineTo(WIDTH,700);ctx.lineTo(0,700);ctx.fill();
  }
  for(let i=0;i<52;i++) {
    const x=rand()*WIDTH,y=511+rand()*12,w=9+rand()*24,h=10+rand()*28;
    ctx.fillStyle=i%3?'#d4d5d0':'#b9c6ca';ctx.fillRect(x,y-h,w,h);
    ctx.fillStyle='#a9b7b9';ctx.fillRect(x-1,y-h-2,w+2,2);
    for(let dx=2;dx<w-2;dx+=5)for(let dy=4;dy<h-2;dy+=6)ctx.fillRect(x+dx,y-h+dy,2,3);
  }
  const texture=new T.CanvasTexture(canvas);texture.mapping=T.EquirectangularReflectionMapping;
  texture.wrapS=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;return texture;
}
