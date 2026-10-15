import * as T from 'three';

export function classroomWood({baseColor=[163,110,59],roughnessLevel=100,roughness=.72,clearcoat=.9,clearcoatRoughness=.12}={}) {
  const width=1024,height=512;
  const canvases=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;});
  const contexts=canvases.map(c=>c.getContext('2d'));
  const data=contexts.map(c=>c.createImageData(width,height));
  let seed=801;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    const wave=y+Math.sin(x*.008+y*.012)*9+Math.sin(x*.021)*1.8;
    const grain=Math.sin(wave*.31)*1.7+Math.sin(wave*1.6)*.7;
    const growth=Math.pow(.5+.5*Math.sin(wave*.063+Math.sin(x*.004)*.6),14)*5;
    const fine=(rand()-.5)*3,variation=grain-growth+fine;
    for(let ch=0;ch<3;ch++) {
      data[0].data[i+ch]=baseColor[ch]+variation;
      data[1].data[i+ch]=130+grain*1.5-growth*.4;
      data[2].data[i+ch]=roughnessLevel+grain*2+fine*2;
    }
    data.forEach(d=>d.data[i+3]=255);
  }
  contexts.forEach((c,i)=>c.putImageData(data[i],0,0));
  // Restrained finish scratches and worn corners; most of the varnish is intact.
  for(let i=0;i<65;i++) {
    const x=rand()*width,y=rand()*height,length=8+rand()*75;
    contexts.forEach((c,j)=>{
      c.strokeStyle=j===0?'rgba(239,192,122,.14)':j===1?'rgba(70,70,70,.15)':'rgba(205,205,205,.35)';
      c.lineWidth=.4+rand()*.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+length,y+.7);c.stroke();
    });
  }
  const maps=canvases.map((c,i)=>{const t=new T.CanvasTexture(c);t.anisotropy=8;if(!i)t.colorSpace=T.SRGBColorSpace;return t;});
  return new T.MeshPhysicalMaterial({map:maps[0],bumpMap:maps[1],roughnessMap:maps[2],
    bumpScale:.0009,roughness,clearcoat,clearcoatRoughness});
}
