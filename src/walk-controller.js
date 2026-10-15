import { HOME, canOccupy, floorHeight, isInsideHome, moveWithCollisions } from './walk-layout.js';

export function createWalkController(camera,canvas,{obstacles,render,onLocation,onRouteState}) {
  let enabled=false,frame=0,previous=0,pointer=null,route=null,routeIndex=0,stuck=0,lastZone=null;
  const keys=new Set();
  const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
  camera.rotation.order='YXZ';
  function stop(){keys.clear();route=null;onRouteState(false);pointer=null;}
  function reset() {
    stop();camera.position.set(HOME.spawn.x,HOME.floor+1.68,HOME.spawn.z);
    camera.lookAt(...HOME.lookAt);camera.rotation.order='YXZ';updateLocation();render();
  }
  function updateLocation(){const inside=isInsideHome(camera.position);if(lastZone!==inside){lastZone=inside;onLocation(inside);}return inside;}
  function onKeyDown(event) {
    if(!enabled||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(event.code==='Escape'){stop();return;}
    if(!movement.has(event.code))return;
    event.preventDefault();route=null;onRouteState(false);keys.add(event.code);
  }
  function onKeyUp(event){keys.delete(event.code);}
  function onPointerDown(event) {
    if(!enabled||event.button!==0)return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    route=null;onRouteState(false);
  }
  function onPointerMove(event) {
    if(!enabled||pointer?.id!==event.pointerId)return;
    camera.rotation.y-=(event.clientX-pointer.x)*.003;
    camera.rotation.x=Math.max(-1.15,Math.min(1.15,camera.rotation.x-(event.clientY-pointer.y)*.003));
    pointer.x=event.clientX;pointer.y=event.clientY;render();
  }
  function onPointerUp(event){if(pointer?.id===event.pointerId)pointer=null;}
  function visible(a,b) {
    const distance=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.ceil(distance/.12);
    for(let i=1;i<=steps;i++)if(!canOccupy(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,obstacles))return false;
    return true;
  }
  function followRoute() {
    if(!enabled)return;
    if(route){stop();return;}
    const points=isInsideHome(camera.position)?HOME.route:[...HOME.route].reverse();
    const options=points.map((point,index)=>({point,index,distance:Math.hypot(point.x-camera.position.x,point.z-camera.position.z)}))
      .filter(p=>visible(camera.position,p.point)).sort((a,b)=>a.distance-b.distance);
    if(!options.length){onRouteState(false,'请先走回门口附近');return;}
    route=points.slice(options[0].index);routeIndex=0;stuck=0;keys.clear();onRouteState(true);
  }
  function tick(time) {
    frame=requestAnimationFrame(tick);
    const dt=Math.min((time-previous)/1000,.05);previous=time;
    if(!enabled||document.hidden)return;
    let dx=0,dz=0,changed=false;
    if(route) {
      const destination=route[routeIndex],x=destination.x-camera.position.x,z=destination.z-camera.position.z,distance=Math.hypot(x,z);
      if(distance<.12) {
        routeIndex++;
        if(routeIndex===route.length){route=null;onRouteState(false);}
      } else {
        const speed=Math.min(2.3*dt,distance),yaw=Math.atan2(-x,-z);
        const difference=Math.atan2(Math.sin(yaw-camera.rotation.y),Math.cos(yaw-camera.rotation.y));
        camera.rotation.y+=difference*(1-Math.exp(-dt*5));camera.rotation.x*=Math.exp(-dt*4);
        dx=x/distance*speed;dz=z/distance*speed;changed=true;
      }
    } else {
      const turn=Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight'));
      if(turn){camera.rotation.y+=turn*dt*1.5;changed=true;}
      const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
      const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
      if(forward||right) {
        const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.8:2.3)*dt/Math.hypot(forward,right),yaw=camera.rotation.y;
        dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
        dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;changed=true;
      }
    }
    if(dx||dz) {
      const next=moveWithCollisions(camera.position,dx,dz,obstacles);
      const travelled=Math.hypot(next.x-camera.position.x,next.z-camera.position.z);
      camera.position.x=next.x;camera.position.z=next.z;
      camera.position.y+=(floorHeight(next)+1.68-camera.position.y)*(1-Math.exp(-dt*14));
      if(route){stuck=travelled<.001?stuck+dt:0;if(stuck>1){route=null;onRouteState(false,'通路受阻，可以用 WASD 调整位置');}}
      updateLocation();
    }
    if(changed)render();
  }
  const buttons=[...document.querySelectorAll('[data-move]')];
  function touchStart(event){if(!enabled)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);route=null;onRouteState(false);keys.add(event.currentTarget.dataset.move);}
  function touchEnd(event){keys.delete(event.currentTarget.dataset.move);}
  function visibility(){if(document.hidden)stop();}
  window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);canvas.addEventListener('lostpointercapture',onPointerUp);
  for(const button of buttons){button.addEventListener('pointerdown',touchStart);for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,touchEnd);}
  frame=requestAnimationFrame(tick);
  return {
    reset,followRoute,stop,
    setEnabled(value){enabled=value;stop();if(value){canvas.focus({preventScroll:true});updateLocation();}},
    dispose(){
      cancelAnimationFrame(frame);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);
      canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.removeEventListener(event,onPointerUp);
      for(const button of buttons){button.removeEventListener('pointerdown',touchStart);for(const event of ['pointerup','pointercancel','lostpointercapture'])button.removeEventListener(event,touchEnd);}
    },
  };
}
