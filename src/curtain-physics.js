// Small position-based cloth solver. Top hooks and the gathered tie stay fixed;
// gravity, damped inertia and changing wind move the fabric between them.
export function createCurtainSimulation({width=.64,height=3.22,nx=16,ny=38,phase=0,windStrength=1}={}) {
  const count=(nx+1)*(ny+1),positions=new Float32Array(count*3);
  const pinned=new Uint8Array(count),tieRow=Math.round(ny*.68);
  for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++) {
    const u=col/nx,v=row/ny,i=row*(nx+1)+col;
    const gather=1-.64*Math.exp(-Math.pow((v-.68)/.12,2));
    positions[i*3]=(u-.5)*width*gather;
    positions[i*3+1]=height*(.5-v)+Math.sin(u*Math.PI*4)*.012*v;
    positions[i*3+2]=Math.sin(u*Math.PI*8)*(.035+.025*v)+.075*Math.sin(v*Math.PI);
    pinned[i]=row===0||(row===tieRow&&Math.abs(col-nx/2)<=2)?1:0;
  }
  const rest=positions.slice(),previous=positions.slice(),links=[];
  function link(a,b,stiffness) {
    const i=a*3,j=b*3;
    links.push([a,b,Math.hypot(rest[i]-rest[j],rest[i+1]-rest[j+1],rest[i+2]-rest[j+2]),stiffness]);
  }
  for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++) {
    const i=row*(nx+1)+col;
    if(col<nx)link(i,i+1,1);
    if(row<ny)link(i,i+nx+1,1);
    if(row<ny&&col<nx){link(i,i+nx+2,.75);link(i+1,i+nx+1,.75);}
    if(col<nx-1)link(i,i+2,.25);
    if(row<ny-1)link(i,i+2*(nx+1),.3);
  }
  const fixed=1/60;let elapsed=0,accumulator=0;
  function integrate() {
    elapsed+=fixed;
    for(let i=0;i<count;i++) {
      if(pinned[i])continue;
      const n=i*3,v=Math.floor(i/(nx+1))/ny,u=(i%(nx+1))/nx;
      const gust=windStrength*(1.25+.8*Math.sin(elapsed*.85+phase)+.32*Math.sin(elapsed*2.1-v*4+phase));
      for(let axis=0;axis<3;axis++) {
        const index=n+axis,p=positions[index],velocity=(p-previous[index])*.975;
        const force=axis===1?-9.81:axis===0?.22*Math.sin(elapsed*1.2+phase+v*3):
          gust*(.65+.35*Math.sin(u*Math.PI)) - (p-rest[index])*9;
        positions[index]=p+velocity+force*fixed*fixed;previous[index]=p;
      }
    }
    for(let iteration=0;iteration<6;iteration++) {
      for(const [a,b,length,stiffness]of links) {
        const wa=1-pinned[a],wb=1-pinned[b];if(!wa&&!wb)continue;
        const i=a*3,j=b*3,dx=positions[j]-positions[i],dy=positions[j+1]-positions[i+1],dz=positions[j+2]-positions[i+2];
        const distance=Math.hypot(dx,dy,dz)||1;
        const correction=(distance-length)/distance*stiffness/(wa+wb);
        positions[i]+=dx*correction*wa;positions[i+1]+=dy*correction*wa;positions[i+2]+=dz*correction*wa;
        positions[j]-=dx*correction*wb;positions[j+1]-=dy*correction*wb;positions[j+2]-=dz*correction*wb;
      }
      for(let i=0;i<count;i++) {
        const n=i*3;
        if(pinned[i]){positions[n]=rest[n];positions[n+1]=rest[n+1];positions[n+2]=rest[n+2];}
        // Keep the cloth in front of the sill and within the clear window bay.
        else {
          positions[n]=Math.max(-width*.62,Math.min(width*.62,positions[n]));
          positions[n+1]=Math.max(-height*.53,positions[n+1]);
          positions[n+2]=Math.max(-.07,Math.min(.38,positions[n+2]));
        }
      }
    }
  }
  return {positions,rest,pinned,nx,ny,
    step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return false;
      accumulator+=Math.min(dt,.05);let changed=false;
      while(accumulator+1e-9>=fixed){integrate();accumulator-=fixed;changed=true;}
      return changed;
    },
    reset(){positions.set(rest);previous.set(rest);accumulator=0;elapsed=0;},
  };
}
