import * as T from 'three';
import {sampleLocomotion,sampleIdle} from './student-locomotion.js';
import {mouthShapes,speechPose,offerPose} from './student-gestures.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=T.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const sides=['left','right'];
export const STUDENT_CHAIR={x:-8.65,y:.41,z:24,seatHeight:.46};
const defaultWaypoints=[V(-7.7,.41,29),V(-4.4,.41,29),V(-4.4,.41,21),V(-7.7,.41,21)];

// Aim in world space: the legacy VRM has a rotated scene, so Euler signs alone
// cannot specify a human knee's bend direction reliably.
function aim(bone,child,target) {
  const origin=bone.getWorldPosition(V());
  const from=child.getWorldPosition(V()).sub(origin).normalize();
  const to=target.clone().sub(origin).normalize();
  const world=new T.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
  bone.updateWorldMatrix(false,true);
}
function aimPlane(bone,child,target,normal,hingeAxis) {
  const from=child.position.clone().normalize(),localNormal=hingeAxis.clone().addScaledVector(from,-hingeAxis.dot(from)).normalize();
  const to=target.clone().sub(bone.getWorldPosition(V())).normalize(),worldNormal=normal.clone().addScaledVector(to,-normal.dot(to)).normalize();
  const source=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(from,localNormal,from.clone().cross(localNormal)));
  const desired=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(to,worldNormal,to.clone().cross(worldNormal)));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desired).multiply(source.invert()));
  bone.updateWorldMatrix(false,true);
}
export function solveLimb(upper,lower,end,target,pole,hingeAxis=null) {
  const a=upper.getWorldPosition(V()),b=lower.getWorldPosition(V()),c=end.getWorldPosition(V());
  const l1=a.distanceTo(b),l2=b.distanceTo(c);
  const direction=target.clone().sub(a);
  // Human hinge range: retain a small bend and reject folded-back targets.
  const minReach=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(2.5));
  const maxReach=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(.07));
  const distance=clamp(direction.length(),minReach,maxReach);
  direction.normalize();
  const bend=pole.clone().sub(a).addScaledVector(direction,-pole.clone().sub(a).dot(direction));
  if(bend.lengthSq()<1e-8)bend.set(0,0,1);
  bend.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  const knee=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  if(hingeAxis){
    const normal=direction.clone().cross(bend).normalize();
    aimPlane(upper,lower,knee,normal,hingeAxis);
    aimPlane(lower,end,a.addScaledVector(direction,distance),normal,hingeAxis);
  } else {
    aim(upper,lower,knee);
    aim(lower,end,a.addScaledVector(direction,distance));
  }
}

export function createStudentMotion(root,model,{reducedMotion=false,chair:chairConfig=STUDENT_CHAIR,waypoints:route}={}) {
  const waypoints=route?route.map(p=>new T.Vector3().fromArray(p)):defaultWaypoints;
  // Rounded route corners let heading evolve before reaching a waypoint.
  // This stays inside the route polygon, unlike an overshooting spline.
  let routePoints=null,routeIndex=0,routeSpacing=1;
  if(waypoints.length>=3){
    const path=new T.CurvePath(),corners=waypoints.map((p,i)=>{
      const previous=waypoints[(i+waypoints.length-1)%waypoints.length],next=waypoints[(i+1)%waypoints.length];
      const radius=Math.min(.95,p.distanceTo(previous)*.4,p.distanceTo(next)*.4);
      return {p,entry:p.clone().addScaledVector(previous.clone().sub(p).normalize(),radius),exit:p.clone().addScaledVector(next.clone().sub(p).normalize(),radius)};
    });
    corners.forEach((c,i)=>{path.add(new T.QuadraticBezierCurve3(c.entry,c.p,c.exit));path.add(new T.LineCurve3(c.exit,corners[(i+1)%corners.length].entry));});
    routePoints=path.getSpacedPoints(320).slice(0,-1);routeSpacing=path.getLength()/320;
  }
  function nearestRoute(){
    if(routePoints)routeIndex=routePoints.reduce((best,p,i)=>p.distanceToSquared(root.position)<routePoints[best].distanceToSquared(root.position)?i:best,0);
  }
  function routeTarget(){
    if(!routePoints)return waypoints[waypoint];
    let closest=routeIndex;
    for(let n=-5;n<=20;n++){const i=(routeIndex+n+routePoints.length)%routePoints.length;if(routePoints[i].distanceToSquared(root.position)<routePoints[closest].distanceToSquared(root.position))closest=i;}
    routeIndex=closest;
    const crossTrack=root.position.distanceTo(routePoints[routeIndex]);
    const lookAhead=T.MathUtils.lerp(.65,.95,runMix)+Math.min(1.5,crossTrack*1.5);
    return routePoints[(routeIndex+Math.ceil(lookAhead/routeSpacing))%routePoints.length];
  }
  // Predict the same steering path the body will actually take. Projecting
  // a foot directly onto the ideal route cuts across tight corners and can
  // leave the outside support leg behind the pelvis.
  function predictRoute(horizon){
    const position=root.position.clone();let yaw=heading,index=routeIndex;
    const steps=Math.min(30,Math.max(4,Math.ceil(horizon/.07))),step=horizon/steps;
    for(let k=0;k<steps;k++){
      let closest=index;
      for(let n=-5;n<=20;n++){
        const i=(index+n+routePoints.length)%routePoints.length;
        if(routePoints[i].distanceToSquared(position)<routePoints[closest].distanceToSquared(position))closest=i;
      }
      index=closest;
      const lookAhead=T.MathUtils.lerp(.65,.95,runMix)+Math.min(1.5,position.distanceTo(routePoints[index])*1.5);
      const target=routePoints[(index+Math.ceil(lookAhead/routeSpacing))%routePoints.length];
      const desired=Math.atan2(target.x-position.x,target.z-position.z);
      yaw+=clamp(Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw)),-1.8*step,1.8*step);
      position.addScaledVector(V(Math.sin(yaw),0,Math.cos(yaw)),speed*step);
    }
    return {position,yaw};
  }
  root.updateWorldMatrix(true,true);
  const joints={},rest={};
  for(const [name,{node}] of Object.entries(model.humanoid.normalizedHumanBones)) {
    joints[name]=node;rest[name]={position:node.position.clone(),quaternion:node.quaternion.clone()};
  }
  const local=node=>root.worldToLocal(node.getWorldPosition(V()));
  const hipsRest=local(joints.hips);
  const legLength=local(joints.leftUpperLeg).distanceTo(local(joints.leftLowerLeg))+local(joints.leftLowerLeg).distanceTo(local(joints.leftFoot));
  const gaitScale=clamp(legLength/.906,.75,1.25);
  const walkingHalfWidth=.09*gaitScale;
  const feet=sides.map(side=>({side,rest:local(joints[`${side}Foot`]),rotation:root.getWorldQuaternion(new T.Quaternion()).invert().multiply(joints[`${side}Foot`].getWorldQuaternion(new T.Quaternion())),anchor:joints[`${side}Foot`].getWorldPosition(V()),from:V(),to:V(),swing:false,p:0,swingU:0,liftPhase:0,stanceTime:1,pitch:0,liftPitch:0,yaw:root.rotation.y,fromYaw:root.rotation.y,solvedTarget:V()}));
  feet.forEach((f,i)=>{f.rest.x=i===0?.12:-.12;f.anchor.copy(root.localToWorld(f.rest.clone()));});
  const arms=sides.map(side=>({side,twist:0,wrist:new T.Quaternion(),upperRotation:null,lowerRotation:null,shoulder:local(joints[`${side}UpperArm`]),length:joints[`${side}UpperArm`].getWorldPosition(V()).distanceTo(joints[`${side}LowerArm`].getWorldPosition(V()))+joints[`${side}LowerArm`].getWorldPosition(V()).distanceTo(joints[`${side}Hand`].getWorldPosition(V()))}));
  let action='idle',state='Standing',time=0,speed=0,cycle=.32,runMix=0,waveMix=0,waveProgress=0,seat=0,seatTime=0,stage='standing',waypoint=0;
  let settleIndex=0,settleTime=0,settleFrom,settleTo,settleOrder=[0,1];
  let pelvisY=hipsRest.y-.008,locomotionWeight=0,turnRate=0,lookLead=0,idleWeight=1;
  let startTime=1,acceleration=0;
  let giveTime=0,giveMix=0,speaking=false,speechTime=0,speechFrame=null;
  const mouth=Object.fromEntries(mouthShapes.map(name=>[name,0]));
  const strideLength=()=>gaitScale*T.MathUtils.lerp(1.02,1.85,runMix)*(1-.12*clamp(Math.abs(turnRate)/1.3,0,1)*(1-runMix));
  let heading=root.rotation.y,desiredHeading=heading,velocity=V(),travelDirection=V(0,0,1),lastPose=0,approachChair=0,exitChair=false;
  const chair=V(chairConfig.x,chairConfig.y,chairConfig.z);
  const seatMark=chair.clone().add(V(0,0,.35));
  const world=p=>root.localToWorld(p.clone());
  const yawTo=yaw=>Math.atan2(Math.sin(yaw-heading),Math.cos(yaw-heading));
  const turn=(yaw,dt)=>{
    desiredHeading=yaw;
    let delta=clamp(yawTo(yaw),-1.8*dt,1.8*dt);
    // Turn with steps. A planted foot must not be left facing backwards while
    // the pelvis rotates over it; the swing foot can lead the next turn.
    for(const f of feet)if(!f.swing){
      const relative=Math.atan2(Math.sin(heading-f.yaw),Math.cos(heading-f.yaw));
      delta=clamp(delta,-.55-relative,.55-relative);
    }
    // Preserve each planted ankle on its own side of the pelvis while turning.
    // Restrict yaw instead of dragging a supporting foot across the floor.
    for(const [i,f] of feet.entries())if(!f.swing){
      const sign=i===0?1:-1,relative=f.anchor.clone().sub(root.position);
      const clearance=y=>sign*(relative.x*Math.cos(y)-relative.z*Math.sin(y));
      const minimum=Math.min(.065*gaitScale,clearance(heading));
      if(clearance(heading+delta)<minimum){
        let lo=0,hi=1;
        for(let n=0;n<12;n++){const mid=(lo+hi)/2;if(clearance(heading+delta*mid)>=minimum)lo=mid;else hi=mid;}
        delta*=lo;
      }
    }
    heading+=delta;root.rotation.y=heading;
  };
  function resetGait(){cycle=Math.floor(cycle)+(runMix>.5?0:.14);feet.forEach((f,i)=>{f.swing=false;f.p=(cycle+i*.5)%1;});}
  function setAction(value) {
    if(!['idle','walk','run','sit','wave','give'].includes(value)||value===action)return;
    action=value;
    if(value==='give')giveTime=0;
    if(value==='sit')approachChair=2;
    if((value==='walk'||value==='run')&&root.position.distanceTo(chair)<.8)exitChair=true;
    if(stage==='seated'||stage==='sitting') {
      if(value!=='sit'){stage='rising';}
    } else if(stage==='rising') {
      if(value==='sit'){stage='sitting';}
    } else if(value==='walk'||value==='run'||value==='sit') {
      if((stage==='standing'||stage==='settling')&&value!=='sit')startTime=0;
      if(stage!=='moving'&&stage!=='stopping')resetGait();
      stage='moving';settleFrom=null;
      if(value!=='sit'){waypoint=waypoints.reduce((best,p,i)=>p.distanceTo(root.position)<waypoints[best].distanceTo(root.position)?i:best,0);nearestRoute();}
    } else if(stage==='moving')stage='stopping';
  }
  function beginSettle(){
    stage='settling';settleIndex=0;settleTime=0;settleFrom=null;
    // Finish the airborne step first, rather than freezing it while the other
    // foot performs a scripted left/right reset.
    settleOrder=[0,1].sort((a,b)=>Number(feet[b].swing)-Number(feet[a].swing)||feet[b].anchor.distanceTo(world(feet[b].rest))-feet[a].anchor.distanceTo(world(feet[a].rest)));
    feet.forEach(f=>{if(f.swing&&f.contactOffset)f.anchor.copy(f.solvedTarget).sub(f.contactOffset);f.swing=false;});
  }
  function updateMovement(dt) {
    velocity.set(0,0,0);
    startTime=Math.min(1,startTime+dt);
    runMix=T.MathUtils.damp(runMix,action==='run'?1:0,4,dt);
    if(stage==='moving'||stage==='stopping') {
      const target=stage==='stopping'?root.position.clone().addScaledVector(travelDirection,100):action==='sit'?(approachChair?chair.clone().add(V(approachChair===2?.9:0,0,1.1)):seatMark):exitChair?chair.clone().add(V(0,0,1.1)):routeTarget();
      const delta=target.clone().sub(root.position);delta.y=0;
      const distance=delta.length();
      if(stage==='moving'&&action!=='sit'&&!exitChair&&!routePoints&&distance<.28)waypoint=(waypoint+1)%waypoints.length;
      const yaw=action==='sit'&&!approachChair?0:Math.atan2(delta.x,delta.z);
      if(stage==='moving'&&distance>.035)turn(yaw,dt);
      let wanted=stage==='stopping'?0:gaitScale*T.MathUtils.lerp(.96,2.45,runMix);
      wanted*=smooth((Math.cos(yawTo(yaw))-.72)/.28);
      if(action==='sit')wanted=Math.min(wanted,distance*2.6,approachChair?1.05:.42);
      else if(!routePoints&&distance<.7)wanted=Math.min(wanted,Math.max(.45,distance*2));
      if(startTime<.14)wanted=0;
      speed=T.MathUtils.damp(speed,wanted,stage==='stopping'?5:3.7,dt);
      const travel=Math.min(speed*dt,distance);
      if(distance>.001){if(stage==='moving'){if(action==='sit'&&!approachChair)travelDirection.copy(delta).normalize();else travelDirection.set(Math.sin(heading),0,Math.cos(heading));}velocity.copy(travelDirection).multiplyScalar(travel/Math.max(dt,.00001));root.position.addScaledVector(velocity,dt);}
      if((stage==='stopping'&&speed<.035)||(action==='sit'&&!approachChair&&distance<.035&&speed<.11)) {
        speed=0;velocity.set(0,0,0);beginSettle();
      }
      if(action==='sit'&&approachChair&&distance<.04)approachChair--;
      if(exitChair&&action!=='sit'&&distance<.08){
        exitChair=false;nearestRoute();
        // Rejoin the route ahead of the chair. The nearest waypoint can be
        // behind its backrest and would send the first running turn through it.
        const ahead=waypoints.map((p,i)=>({p,i})).filter(({p})=>p.z>chair.z+1.1);
        if(ahead.length)waypoint=ahead.reduce((a,b)=>a.p.distanceTo(root.position)<b.p.distanceTo(root.position)?a:b).i;
      }
    } else if(stage==='settling') {
      cycle+=dt*.6*locomotionWeight;
      // Settle each foot in turn. A direction change never rotates planted feet
      // or snaps a character back to the front-facing default.
      if(action==='sit'&&Math.abs(yawTo(0))>.015) {
        turn(0,dt);settleFrom=null;settleIndex=0;
      } else {
        const f=feet[settleOrder[settleIndex]];
        if(f) {
          if(!settleFrom){
            settleFrom=f.anchor.clone();
            // Keep the last step's natural stagger instead of shuffling both
            // feet back to a symmetrical display pose after every stop.
            const resting=f.rest.clone();
            if(action!=='sit'){
              const current=root.worldToLocal(f.anchor.clone());
              resting.z=clamp(current.z,-.13,.16);
              resting.x=T.MathUtils.lerp(current.x,f.rest.x,.35);
            }
            settleTo=world(resting);settleTime=0;
          }
          settleTime+=dt;
          const distance=settleFrom.distanceTo(settleTo);
          const u=clamp(settleTime/clamp(distance,.16,.3),0,1);
          f.yaw+=Math.atan2(Math.sin(heading-f.yaw),Math.cos(heading-f.yaw))*(1-Math.exp(-dt*15));
          f.anchor.lerpVectors(settleFrom,settleTo,smooth(u));f.anchor.y+=Math.sin(u*Math.PI)**2*Math.min(.045,distance*.2);
          if(u===1){settleIndex++;settleFrom=null;}
        } else {stage=action==='sit'?'sitting':'standing';seatTime=0;}
      }
    } else if(stage==='sitting'||stage==='rising') {
      seatTime=clamp(seatTime+(stage==='sitting'?dt:-dt),0,1.3);
      seat=smooth(seatTime/1.3);
      if(stage==='sitting'&&seatTime===1.3)stage='seated';
      else if(stage==='rising'&&seatTime===0){stage=(action==='walk'||action==='run'||action==='sit')?'moving':'standing';if(stage==='moving')resetGait();}
    }
  }
  function gait(dt) {
    if(stage!=='moving'&&stage!=='stopping')return;
    if(stage==='moving'&&startTime<.14)return;
    const stride=strideLength(),duty=T.MathUtils.lerp(.58,.27,runMix);
    cycle+=Math.max(speed,Math.abs(yawTo(desiredHeading))>.2?.65:.16)/stride*dt;
    feet.forEach((f,i)=>{
      const p=(cycle+i*.5)%1,wrapped=p<f.p;
      const trailing=root.worldToLocal(f.anchor.clone()).z;
      const earlyPushOff=runMix<.2&&p>=.5&&trailing<-.28&&!feet[1-i].swing;
      if((f.swing&&!wrapped)||p>=duty||earlyPushOff){
        if(!f.swing){f.swing=true;f.from.copy(f.anchor);f.fromYaw=f.yaw;f.to.copy(world(f.rest));f.liftPhase=p;f.liftPitch=f.pitch;f.newStep=true;}
        const u=clamp((p-f.liftPhase)/(1-f.liftPhase),0,1);f.swingU=u;
        const horizon=((1-p)+duty*.5)*stride/Math.max(speed,.3),sign=i===0?1:-1;
        const halfWidth=T.MathUtils.lerp(walkingHalfWidth,.12,runMix);
        const stepOffset=f.rest.clone();stepOffset.x=sign*halfWidth;
        if(f.newStep)f.followRoute=routePoints&&(action==='walk'||action==='run')&&!exitChair&&stage==='moving';
        const onRoute=f.followRoute;
        let landing;
        if(onRoute){
          const future=predictRoute(horizon);
          landing=future.position.add(stepOffset.clone().applyAxisAngle(V(0,1,0),future.yaw));
        } else {
          landing=world(stepOffset).addScaledVector(velocity,horizon);
          const landingLocal=root.worldToLocal(landing.clone());
          landingLocal.x=sign*clamp(sign*landingLocal.x,halfWidth,.24);
          landing.copy(world(landingLocal));
        }
        landing.y=root.position.y+f.rest.y;
        if(action==='sit'&&!approachChair)landing.z=Math.max(chair.z+.34,landing.z);
        if(f.newStep){f.to.copy(landing);f.newStep=false;}
        else f.to.lerp(landing,(1-Math.exp(-dt*18))*(1-smooth((u-.65)/.3)));
        const committed=root.worldToLocal(f.to.clone());
        if(!onRoute||u>.85)committed.x=sign*Math.max(halfWidth*.82,sign*committed.x);
        f.to.copy(world(committed));
        // Carry push-off momentum into swing; an ease-in from zero holds the
        // trailing ankle back while the torso advances and forces a hip dip.
        const advance=smooth(u)+.32*u*(1-u)**2;
        f.anchor.lerpVectors(f.from,f.to,advance);
        const pathLocal=root.worldToLocal(f.anchor.clone());
        pathLocal.x=sign*Math.max(halfWidth*.82,sign*pathLocal.x);
        f.anchor.copy(world(pathLocal));
        f.anchor.y+=Math.sin(Math.PI*u)**2*T.MathUtils.lerp(.085,.19,runMix);
        const landingYaw=heading+clamp(yawTo(desiredHeading),-.4,.4);
        const desiredFootYaw=f.fromYaw+Math.atan2(Math.sin(landingYaw-f.fromYaw),Math.cos(landingYaw-f.fromYaw))*smooth(u);
        f.yaw+=clamp(Math.atan2(Math.sin(desiredFootYaw-f.yaw),Math.cos(desiredFootYaw-f.yaw)),-dt*3,dt*3);
      }else {if(f.swing){f.anchor.copy(f.to);f.stanceTime=0;}f.swing=false;f.stanceTime+=dt;}
      f.p=p;
    });
  }
  function updateFootTargets(active,dt) {
    feet.forEach(f=>{
      const duty=T.MathUtils.lerp(.58,.27,runMix);
      const gaitActive=(stage==='moving'||stage==='stopping')?active:0;
      // Roll around the heel at landing and the toe at push-off. Moving the
      // ankle around that pivot keeps the sole above, rather than in, the floor.
      const swingTime=f.swingU;
      const supportDuration=duty*strideLength()/Math.max(speed,.3);
      let pitch=f.swing?T.MathUtils.lerp(f.liftPitch,-.13,smooth(swingTime))-.05*Math.sin(swingTime*Math.PI):
        f.stanceTime<.12?-.13*(1-smooth(f.stanceTime/.12)):.2*smooth((f.stanceTime/supportDuration-.75)/.25);
      // The authored ankle roll has heel strike and toe push-off; the source
      // toe joint counter-rotates so the forefoot can remain on the ground.
      if(f.authoredRotation&&gaitActive>.001){
        const relative=new T.Quaternion().setFromAxisAngle(V(0,1,0),-heading).multiply(f.authoredRotation).multiply(f.rotation.clone().invert());
        const forward=V(0,0,1).applyQuaternion(relative);
        const sourcePitch=clamp(-Math.atan2(forward.y,forward.z),-.4,1.15);
        pitch=T.MathUtils.lerp(pitch,sourcePitch,f.swing?.85:.7);
      }
      pitch*=gaitActive;
      f.pitch=T.MathUtils.damp(f.pitch,pitch,22,dt);pitch=f.pitch;
      const turnQ=new T.Quaternion().setFromAxisAngle(V(0,1,0),f.yaw);
      const pitchQ=new T.Quaternion().setFromAxisAngle(V(1,0,0),pitch);
      const pivot=V(0,-f.rest.y,pitch<0?-.081:.192);
      const offset=pivot.clone().sub(pivot.clone().applyQuaternion(pitchQ)).applyQuaternion(turnQ);
      f.contactOffset=offset;
      f.solvedTarget.copy(f.anchor).add(offset);
      if(f.swing&&f.authoredPosition){
        // A full authored pose drives the airborne leg. Only the ends of
        // the swing are warped toward the planned contact on a curved route.
        const freeSwing=smooth(f.swingU/.35)*(1-smooth((f.swingU-.6)/.4))*gaitActive;
        f.solvedTarget.lerp(f.authoredPosition,freeSwing);
        const safe=root.worldToLocal(f.solvedTarget.clone()),sign=f.side==='left'?1:-1;
        safe.x=sign*Math.max(T.MathUtils.lerp(walkingHalfWidth*.88,.105,runMix),sign*safe.x);f.solvedTarget.copy(world(safe));
        f.solvedTarget.y=Math.max(f.solvedTarget.y,root.position.y+f.rest.y+offset.y);
      }
      f.worldRotation=turnQ.multiply(pitchQ).multiply(f.rotation);
    });
  }
  function pose(dt) {
    if(action==='give'&&stage==='standing'){
      if(!reducedMotion)giveTime+=dt;
      if(giveTime>4.2)action='idle';
    }
    const offering=action==='give'&&stage==='standing';
    giveMix=T.MathUtils.damp(giveMix,offering?(reducedMotion?1:offerPose(giveTime)):0,10,dt);
    // Rebuild from the bind pose each frame; never accumulate IK drift.
    for(const [name,bone] of Object.entries(joints)){bone.position.copy(rest[name].position);bone.quaternion.copy(rest[name].quaternion);}
    root.updateWorldMatrix(true,true);
    const stepping=stage==='moving'||stage==='stopping';
    const turnActivity=stepping?smooth(Math.abs(yawTo(desiredHeading))/.7)*.5:0;
    const desiredActivity=Math.max(clamp(speed/.8,0,1),turnActivity,stage==='settling'?.28:0);
    locomotionWeight=T.MathUtils.damp(locomotionWeight,desiredActivity,stepping?5:3.5,dt);
    const active=locomotionWeight*(1-seat);
    const authored=sampleLocomotion(cycle,runMix),idle=sampleIdle(time);
    idleWeight=T.MathUtils.damp(idleWeight,stage==='standing'&&action!=='wave'&&action!=='give'?1:0,2,dt);
    for(const [name,q] of Object.entries(authored))if(joints[name]&&q.isQuaternion&&name!=='hips'){
      // Apply the complete retargeted pose first, including legs and toes.
      joints[name].quaternion.slerp(q,active);
      if(['spine','chest','upperChest','neck','head','leftShoulder','rightShoulder'].includes(name)&&idle[name])joints[name].quaternion.slerp(idle[name],idleWeight*.55);
    }
    // The source clip bends both chest segments and compensates at the neck.
    // Retain its twist/counter-swing, but soften that crouched profile for walking.
    for(const name of ['chest','upperChest','neck','head'])if(joints[name])joints[name].rotation.x*=T.MathUtils.lerp(1,.44,active*(1-runMix)*(1-seat));
    for(const side of sides){
      joints[side+'Shoulder'].quaternion.slerp(rest[side+'Shoulder'].quaternion,.3*(1-runMix)*active);
      joints[side+'Hand'].quaternion.slerp(rest[side+'Hand'].quaternion,.65*(1-runMix)*active);
    }
    // Look toward the next route segment before the pelvis follows it.
    let anticipation=0;
    if(routePoints&&stepping&&action!=='sit'){
      const ahead=routePoints[(routeIndex+Math.ceil(1.35/routeSpacing))%routePoints.length].clone().sub(root.position);
      anticipation=clamp(Math.atan2(Math.sin(Math.atan2(ahead.x,ahead.z)-heading),Math.cos(Math.atan2(ahead.x,ahead.z)-heading)),-.65,.65);
    }
    lookLead=T.MathUtils.damp(lookLead,anticipation,5,dt);
    joints.head.rotation.y+=lookLead*.4;
    joints.neck.rotation.y+=lookLead*.18;
    joints.chest.rotation.y+=lookLead*.14;
    joints.spine.rotation.z+=clamp(turnRate,-1.2,1.2)*.025*active;
    const hipTarget=hipsRest.clone();
    hipTarget.y-=T.MathUtils.lerp(.008,T.MathUtils.lerp(.010,.035,runMix),active);
    hipTarget.x+=(authored.pelvis.x-.0038)*.8*active;
    hipTarget.y+=(authored.pelvis.y-.895)*T.MathUtils.lerp(.45,.7,runMix)*active;
    hipTarget.y=T.MathUtils.lerp(hipTarget.y,chairConfig.seatHeight+.125,seat);
    hipTarget.z-=seat*.35;
    hipTarget.x+=(.012+Math.sin(time*.65)*.003)*idleWeight*(1-seat);
    const preparation=Math.sin(Math.PI*clamp(startTime/.34,0,1))*(1-seat);
    hipTarget.x+=preparation*.014;
    hipTarget.z+=(.012*active*(1-runMix)+preparation*.012)*(1-seat);
    // Evaluate reach from the posed hip sockets, including weight shift and
    // pelvic rotation. Bind-pose sockets otherwise demand a false extra crouch.
    joints.hips.position.copy(joints.hips.parent.worldToLocal(world(hipTarget)));
    joints.hips.quaternion.slerp(authored.hips,active*.7);
    root.updateWorldMatrix(true,true);
    for(const f of feet){
      f.authoredPosition=joints[f.side+'Foot'].getWorldPosition(V());
      // The source walk is deliberately high-stepping. Adapt its amplitude
      // for a relaxed campus pace while preserving its timing and ankle arc.
      const ankleFloor=root.position.y+f.rest.y;
      f.authoredPosition.y=ankleFloor+(f.authoredPosition.y-ankleFloor)*T.MathUtils.lerp(.52,1,runMix);
      const swingLocal=root.worldToLocal(f.authoredPosition.clone());
      swingLocal.z*=T.MathUtils.lerp(1.02/1.10,1,runMix);
      // Keep the swing on the narrower walking track as well as narrowing
      // landing points; otherwise the source pose still throws each leg out.
      const sign=f.side==='left'?1:-1;
      swingLocal.x=T.MathUtils.lerp(sign*walkingHalfWidth+(swingLocal.x-sign*.12)*.35,swingLocal.x,runMix);
      f.authoredPosition.copy(world(swingLocal));
      f.authoredPole=joints[f.side+'LowerLeg'].getWorldPosition(V());
      f.authoredRotation=joints[f.side+'Foot'].getWorldQuaternion(new T.Quaternion());
    }
    updateFootTargets(active,dt);
    const posedHipY=hipTarget.y;
    if(!seat)for(const f of feet) {
      const a=local(joints[`${f.side}UpperLeg`]),b=local(joints[`${f.side}LowerLeg`]);
      const length=a.distanceTo(b)+b.distanceTo(local(joints[`${f.side}Foot`]));
      const target=root.worldToLocal(f.solvedTarget.clone());
      const horizontal=Math.hypot(target.x-a.x,target.z-a.z);
      const ceiling=target.y+Math.sqrt(Math.max(.05,length*length-horizontal*horizontal))+(posedHipY-a.y)-T.MathUtils.lerp(.003,T.MathUtils.lerp(.009,.02,runMix),active);
      hipTarget.y=Math.min(hipTarget.y,ceiling);
    }
    if(!seat&&hipTarget.y>pelvisY)hipTarget.y=Math.min(hipTarget.y,pelvisY+dt*.7);
    pelvisY=hipTarget.y;
    joints.hips.position.copy(joints.hips.parent.worldToLocal(world(hipTarget)));
    const lean=T.MathUtils.lerp(.005,.12,runMix)*active+preparation*.012+clamp(acceleration,-1.5,1.5)*.007*(1-seat)+Math.sin(seat*Math.PI)*.22+seat*.025;
    joints.spine.rotation.x+=-lean+Math.sin(time*1.7)*.004;

    joints.head.rotation.z+=-waveMix*.035;
    root.updateWorldMatrix(true,true);
    feet.forEach(f=>{
      const foot=joints[`${f.side}Foot`];
      const contactPole=f.solvedTarget.clone().add(V(0,.5,1).applyAxisAngle(V(0,1,0),heading+clamp(Math.atan2(Math.sin(f.yaw-heading),Math.cos(f.yaw-heading)),-.12,.12)));
      const pole=f.authoredPole.clone().lerp(contactPole,1-active*.65);
      solveLimb(joints[`${f.side}UpperLeg`],joints[`${f.side}LowerLeg`],foot,f.solvedTarget,pole,V(1,0,0));
      const q=f.worldRotation;
      foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
      foot.updateWorldMatrix(false,true);
    });
    waveProgress+=clamp((action==='wave'&&stage==='standing'?1:0)-waveProgress,-dt/.9,dt/.9);
    waveMix=smooth(waveProgress);
    arms.forEach((arm,i)=>{
      const {side,shoulder,length}=arm;
      const sign=i===0?1:-1;
      const liveShoulder=local(joints[`${side}UpperArm`]);
      const target=V(liveShoulder.x+sign*.075,liveShoulder.y-length*.975,liveShoulder.z+.015);
      const elbow=liveShoulder.clone().add(V(sign*.055,-.08,-.55));
      // Sample a coordinated shoulder/elbow arc, then solve for this avatar's
      // arm lengths. The contact layer keeps hands outside the torso.
      for(const part of ['UpperArm','LowerArm'])joints[side+part].quaternion.copy(authored[side+part]);
      joints[side+'LowerArm'].quaternion.slerp(rest[side+'LowerArm'].quaternion,.25*(1-runMix));
      joints[side+'UpperArm'].updateWorldMatrix(false,true);
      const animatedHand=local(joints[side+'Hand']),animatedElbow=local(joints[side+'LowerArm']);
      // Center the casual swing around the thigh, rather than carrying both
      // hands ahead of the body as in the source's bent-elbow walk.
      animatedHand.z-=.1*(1-runMix)*gaitScale;
      animatedHand.x=sign*Math.max(sign*animatedHand.x,liveShoulder.x*sign+.08);
      const armWeight=active*T.MathUtils.lerp(.82,1,runMix);
      target.lerp(animatedHand,armWeight);elbow.lerp(animatedElbow,armWeight);
      for(const part of ['UpperArm','LowerArm'])joints[side+part].quaternion.copy(rest[side+part].quaternion);
      joints[side+'UpperArm'].updateWorldMatrix(false,true);
      const handSeat=smooth((seat-.55)/.45);
      target.lerp(V(sign*.12,chairConfig.seatHeight+.218,-.12),handSeat);
      target.y+=Math.sin(handSeat*Math.PI)*.055;
      elbow.lerp(V(sign*.23,chairConfig.seatHeight+.34,-.32),handSeat);
      const waving=side==='right'?waveMix:0;
      const giving=side==='right'?giveMix:0;
      target.lerp(V(sign*(.36+Math.sin(time*5)*.045),shoulder.y+.21,.13),waving);
      elbow.lerp(liveShoulder.clone().add(V(sign*.6,-.25,-.35)),waving);
      target.lerp(liveShoulder.clone().add(V(sign*.035,-length*.48,length*.78)),giving);
      elbow.lerp(liveShoulder.clone().add(V(sign*.16,-length*.42,length*.22)),giving);
      solveLimb(joints[`${side}UpperArm`],joints[`${side}LowerArm`],joints[`${side}Hand`],world(target),world(elbow));
      const upperArm=joints[`${side}UpperArm`],lowerArm=joints[`${side}LowerArm`];
      if(!arm.upperRotation){arm.upperRotation=upperArm.quaternion.clone();arm.lowerRotation=lowerArm.quaternion.clone();}
      const relaxedSwing=active*(1-runMix)*(1-seat)*(1-waveMix);
      const smoothUpper=arm.upperRotation.clone().slerp(upperArm.quaternion,1-Math.exp(-dt*14));
      const smoothLower=arm.lowerRotation.clone().slerp(lowerArm.quaternion,1-Math.exp(-dt*12));
      arm.upperRotation.rotateTowards(upperArm.quaternion,dt*7).slerp(smoothUpper,relaxedSwing);
      arm.lowerRotation.rotateTowards(lowerArm.quaternion,dt*7).slerp(smoothLower,relaxedSwing);
      upperArm.quaternion.copy(arm.upperRotation);lowerArm.quaternion.copy(arm.lowerRotation);
      upperArm.updateWorldMatrix(false,true);
      const hand=joints[`${side}Hand`];
      function palmPose(finger,normal) {
        const x=finger.multiplyScalar(-sign),y=normal.negate(),z=x.clone().cross(y);
        return root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)));
      }
      const handWorld=hand.getWorldQuaternion(new T.Quaternion());
      handWorld.slerp(palmPose(V(0,0,1),V(0,-1,0)),handSeat);
      handWorld.slerp(palmPose(V(0,1,0),V(0,0,1)),waving);
      handWorld.slerp(palmPose(V(0,0,1),V(0,1,0)),giving);
      // Palm rotation is mostly forearm pronation, not a 90-degree wrist bend.
      const lower=joints[`${side}LowerArm`];
      const axis=hand.getWorldPosition(V()).sub(lower.getWorldPosition(V())).normalize();
      const currentNormal=V(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new T.Quaternion()));
      const desiredNormal=V(0,-1,0).applyQuaternion(handWorld);
      currentNormal.addScaledVector(axis,-currentNormal.dot(axis)).normalize();
      desiredNormal.addScaledVector(axis,-desiredNormal.dot(axis)).normalize();
      const twist=Math.atan2(axis.dot(currentNormal.clone().cross(desiredNormal)),currentNormal.dot(desiredNormal));
      arm.twist=T.MathUtils.damp(arm.twist,clamp(twist,-1.4,1.4),12,dt);
      const lowerWorld=new T.Quaternion().setFromAxisAngle(axis,arm.twist).multiply(lower.getWorldQuaternion(new T.Quaternion()));
      lower.quaternion.copy(lower.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(lowerWorld));
      lower.updateWorldMatrix(false,true);
      const wrist=hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(handWorld);
      const handPhase=cycle*Math.PI*2+(i?0:Math.PI)-.45;
      wrist.multiply(new T.Quaternion().setFromAxisAngle(V(0,0,1),waving*Math.sin(time*5)*.07+sign*active*Math.sin(handPhase)*.04));
      const wristAngle=wrist.angleTo(rest[`${side}Hand`].quaternion);
      if(wristAngle>.58)wrist.slerp(rest[`${side}Hand`].quaternion,1-.58/wristAngle);
      const smoothWrist=arm.wrist.clone().slerp(wrist,1-Math.exp(-dt*12));
      arm.wrist.rotateTowards(wrist,dt*5).slerp(smoothWrist,relaxedSwing);
      hand.quaternion.copy(arm.wrist);
      // A relaxed hand has a curved silhouette; a wave opens gradually.
      for(const finger of ['Index','Middle','Ring','Little'])for(const [n,joint] of ['Proximal','Intermediate','Distal'].entries()){
        const bone=joints[`${side}${finger}${joint}`];
        if(bone){const curl=(1-waving)*([.48,.58,.32][n]+['Index','Middle','Ring','Little'].indexOf(finger)*.04+runMix*[.22,.25,.16][n]+active*Math.sin(handPhase)*.035)*(1-seat*.75);bone.quaternion.copy(rest[`${side}${finger}${joint}`].quaternion);bone.rotation.z=sign*T.MathUtils.lerp(curl,[.06,.12,.08][n],giving);}
      }
      const thumb=joints[`${side}ThumbMetacarpal`];if(thumb)thumb.rotation.y=sign*(.12+runMix*.25)*(1-waving);
    });
    const blink=time%4.6;
    model.expressionManager?.setValue('blink',!reducedMotion&&blink>4.35?Math.sin((blink-4.35)/.25*Math.PI):0);
    model.expressionManager?.setValue('happy',waveMix*.16);
    if(speaking&&!reducedMotion)speechTime+=dt;
    const syllable=speaking&&!reducedMotion?(speechFrame??speechPose(speechTime)):{};
    for(const name of mouthShapes){mouth[name]=T.MathUtils.damp(mouth[name],syllable[name]??0,24,dt);model.expressionManager?.setValue(name,mouth[name]);}
    root.updateWorldMatrix(true,true);
  }
  function update(delta) {
    const dt=Number.isFinite(delta)?clamp(delta,0,.05):0;
    time+=reducedMotion?0:dt;
    if(!reducedMotion){const before=heading,beforeSpeed=speed;updateMovement(dt);acceleration=T.MathUtils.damp(acceleration,dt?(speed-beforeSpeed)/dt:0,8,dt);turnRate=T.MathUtils.damp(turnRate,dt?(heading-before)/dt:0,6,dt);gait(dt);}
    else if(action==='sit'){seat=1;root.position.copy(seatMark);heading=root.rotation.y=0;feet.forEach(f=>f.anchor.copy(world(f.rest)));stage='seated';}
    else {seat=0;stage='standing';}
    pose(dt||1/60);
    const labels={moving:action==='sit'?'Walking to chair':action==='run'?'Running':'Walking',stopping:'Slowing down',settling:'Settling feet',sitting:'Sitting down',seated:'Seated',rising:'Standing up',standing:action==='wave'?'Waving':action==='give'?(giveTime<.9?'Offering book':giveTime<2.3?'Holding out book':'Returning hand'):'Standing'};
    state=reducedMotion&&(action==='walk'||action==='run')?'Motion reduced':labels[stage];
    lastPose=dt;
  }
  update(0);
  return {update,setAction,setSpeechFrame(value){speechFrame=value;},setSpeaking(value){if(Boolean(value)!==speaking)speechTime=0;speaking=Boolean(value);},get speaking(){return speaking;},get action(){return action;},get label(){return state;},
    // Read-only diagnostics also support tests against the original VRM rig.
    inspect(){return {stage,speed,seat,heading,cycle,giveMix,speaking,mouth:{...mouth},dt:lastPose,feet:feet.map(f=>({side:f.side,swing:f.swing,pitch:f.pitch,swingU:f.swingU,target:f.solvedTarget.clone(),contact:f.anchor.clone()}))};}};
}
