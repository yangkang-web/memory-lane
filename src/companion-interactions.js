import * as T from 'three';
import { smooth } from './last-companion-timeline.js';

// Actual scene props travel into the hands. Resetting their saved transforms makes
// backward seeking deterministic, including after a prop has changed parent.
export function createCompanionInteractions(camera,sets,actors,inventoryBag,door){
  const {items}=sets,left=actors.playerArms[0],right=actors.playerArms[1];
  const movable=[items.tin,items.halfWater,items.bag,items.power,...items.water,items.bandage,items.biscuits,items.lemons];
  const origins=new Map(movable.map(o=>[o,{parent:o.parent,position:o.position.clone(),quaternion:o.quaternion.clone()}]));
  const cableMaterial=new T.MeshStandardMaterial({color:'#292d28',roughness:.8});
  const cableGeometry=new T.CylinderGeometry(.003,.003,1,6),plugGeometry=new T.BoxGeometry(.018,.027,.012);
  const connection=new T.Group();camera.add(connection);
  const segments=Array.from({length:16},()=>{const m=new T.Mesh(cableGeometry,cableMaterial);connection.add(m);return m;});
  const plug=new T.Mesh(plugGeometry,new T.MeshStandardMaterial({color:'#8b938b',metalness:.7,roughness:.5}));connection.add(plug);
  const up=new T.Vector3(0,1,0);
  function reset(o){const saved=origins.get(o);if(o.parent!==saved.parent)saved.parent.add(o);o.position.copy(saved.position);o.quaternion.copy(saved.quaternion);}
  function local(o,p,r=[0,0,0]){if(o.parent!==camera)camera.add(o);o.position.fromArray(p);o.rotation.set(...r);o.visible=true;}
  function carry(o,p,r,u){const saved=origins.get(o);saved.parent.updateWorldMatrix(true,false);const world=saved.position.clone().applyMatrix4(saved.parent.matrixWorld);const q=saved.parent.getWorldQuaternion(new T.Quaternion()).multiply(saved.quaternion);q.premultiply(camera.getWorldQuaternion(new T.Quaternion()).invert());local(o,camera.worldToLocal(world).lerp(new T.Vector3(...p),u).toArray());o.quaternion.copy(q).slerp(new T.Quaternion().setFromEuler(new T.Euler(...r)),u);}
  function touch(arm,o,offset=[0,0,0],grip=.6,rotation=[0,0,Math.PI]){o.updateWorldMatrix(true,false);const p=o.localToWorld(new T.Vector3(...offset));actors.rig.updateWorldMatrix(true,false);arm.reach(actors.rig.worldToLocal(p));arm.palm.userData.grip(grip);arm.elbow.updateWorldMatrix(true,false);const orientation=camera.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(new T.Euler(...rotation)));arm.palm.quaternion.copy(arm.elbow.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));}
  function bag(t,start,end){const enter=smooth(t,start,start+.7),leave=smooth(t,end-.7,end);local(items.bag,[-.19-.5*leave,-1.15+.53*enter-.3*leave,-.57],[.03,0,-.08]);touch(left,items.bag,[-.18,.42,.06],.75);}
  function collect(o,t,start,end,bottle=true){
    if(t<start||t>=end)return;
    const lift=smooth(t,start+.45,start+1.2),drop=smooth(t,end-1.3,end-.15);
    carry(o,[.13-.3*drop,-.38-.26*drop,-.49],[-.1,0,.12],lift);
    touch(right,o,bottle?[.11,.18,.045]:[.085,-.025,.035],bottle?.85:.55,[0,0,-Math.PI/2]);
    // Disappears only once it is below the bag's rim.
    if(drop>.97)o.visible=false;
  }
  function update(s){const t=s.t;movable.forEach(reset);connection.visible=false;
    if(s.compact){
      inventoryBag.visible=false;items.power.visible=false;items.cable.visible=false;
      const p=s.playbackTime,term=items.terminal;
      if(p<3){left.reach(new T.Vector3(-.24,-.65,-.16));left.palm.userData.grip(.15,0);}
      const raised=p<3? smooth(p,.6,1.3)*(1-smooth(p,2.2,3)):smooth(p,53,54);
      local(term,[.08,-.64+.49*raised,-.30-.18*raised],[-.12,0,0]);
      term.visible=p<3||p>=53;
      if(term.visible){right.shoulder.position.set(.24,-.3,-.08);touch(right,term,[.145,-.105,.04],.65,[0,Math.PI/2,Math.PI]);right.palm.userData.grip(.65,1);}
      return;
    }
    if(t<91)inventoryBag.visible=false;
    if(t>=7&&t<11){const lift=smooth(t,7.35,8.1)*(1-smooth(t,10,10.8));carry(items.tin,[.08,-.08,-.46],[1.7*smooth(t,8.3,9.25),0,-.25],lift);touch(right,items.tin,[.075,.055,.015],.72);}
    if(t>=11&&t<15){bag(t,11,15);collect(items.halfWater,t,11,14.5);}
    if(t>=16.3&&t<37){
      const term=items.terminal,u=smooth(t,17,18.4),pocket=smooth(t,33,35.6);
      if(term.parent!==camera)camera.add(term);
      const from=camera.worldToLocal(new T.Vector3(-19.5,1.21,44.35));
      term.position.copy(from).lerp(new T.Vector3(-.09,-.04,-.51),u).lerp(new T.Vector3(.22,-.66,-.28),pocket);
      const initial=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)).premultiply(camera.getWorldQuaternion(new T.Quaternion()).invert());
      term.quaternion.copy(initial).slerp(new T.Quaternion().setFromEuler(new T.Euler(-.12,0,0)),u);
      touch(left,term,[-.145,-.105,.04],.65,[0,-Math.PI/2,Math.PI]);
      if(t<18.4)touch(right,term,[.07,-.075,.015],.65);
      else if(t<21.4){const wipe=smooth(t,19,21.2);touch(right,term,[Math.sin(wipe*Math.PI*3)*.055,.07-wipe*.12,.04],.05);}
      if(t>=21.4){
        const powerProgress=smooth(t,21.8,22.6);carry(items.power,[.16-.02*pocket,-.19-.55*pocket,-.48],[.1,0,.1],powerProgress);
        const insert=smooth(t,22.7,24),press=smooth(t,24.4,25.4)*(1-smooth(t,26.2,27));
        const socket=term.localToWorld(new T.Vector3(-.025,-.151,.005));camera.worldToLocal(socket);
        plug.position.set(.09,-.22-.55*pocket,-.44).lerp(socket,insert);plug.position.x-=press*.007;
        plug.quaternion.copy(term.quaternion);connection.visible=t<35.7;
        if(t<22.7)touch(right,items.power,[.03,.03,.015],.6);else if(t<28)touch(right,plug,[.065,-.055,.045],.7,[0,0,-Math.PI/2]);
        const a=items.power.localToWorld(new T.Vector3(-.075,0,0));camera.worldToLocal(a);
        const b=plug.position.clone(),middle=a.clone().lerp(b,.5).add(new T.Vector3(0,-.1,0));
        const curve=new T.QuadraticBezierCurve3(a,middle,b);
        segments.forEach((m,i)=>{const p=curve.getPoint(i/segments.length),q=curve.getPoint((i+1)/segments.length);m.position.copy(p).lerp(q,.5);m.scale.y=p.distanceTo(q);m.quaternion.setFromUnitVectors(up,q.sub(p).normalize());});
        items.cable.visible=false;
      }
    }
    if(t>=38&&t<41.5&&door){door.updateWorldMatrix(true,false);const target=door.localToWorld(new T.Vector3(1.05,1.25,.15));left.reach(actors.rig.worldToLocal(target));left.palm.userData.grip(.12);}
    if(t>=62&&t<72){bag(t,62,72);collect(items.water[0],t,63,66.7);collect(items.water[1],t,67,70.7);}
    if(t>=73&&t<82){bag(t,73,82);collect(items.bandage,t,73.5,77,false);collect(items.biscuits,t,77.5,81,false);}
    if(t>=82.5&&t<90.8){const u=smooth(t,83,84.1)*(1-smooth(t,89,90.8));carry(items.lemons,[.15,-.1,-.52],[1.15,0,-.1],u);touch(right,items.lemons,[.17,-.025,.07],.55,[0,0,-Math.PI/2]);right.palm.userData.grip(.55,1);}
    if(t>=180.8&&t<187.2)touch(left,items.backHandle,[-.06,-.045,.035],.9,[0,0,Math.PI]);
    if(t>=190.6&&t<194.2){left.shoulder.position.set(-.22,-.28,-.09);touch(left,items.bolt,[-.055,-.02,.04],.8,[0,0,-Math.PI/2]);}
  }
  function hide(){connection.visible=false;movable.forEach(reset);}
  return {update,hide,dispose(){hide();connection.removeFromParent();cableGeometry.dispose();plugGeometry.dispose();cableMaterial.dispose();plug.material.dispose();}};
}
