import * as T from 'three';

// World-space attachment avoids inheriting the VRM import scale twice.
export function createOfferBook(scene) {
  const book=new T.Group();book.name='Offered campus notebook';book.visible=false;scene.add(book);
  const cover=new T.MeshStandardMaterial({color:0x315866,roughness:.64,transparent:true});
  const paper=new T.MeshStandardMaterial({color:0xf3ead6,roughness:.9,transparent:true});
  const ink=new T.MeshStandardMaterial({color:0xd5be8c,roughness:.7,transparent:true});
  const part=(x,y,z,w,h,d,material)=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;book.add(mesh);
  };
  part(0,0,0,.19,.018,.135,paper);
  for(const y of [-.012,.012])part(0,y,0,.2,.004,.145,cover);
  part(-.097,0,0,.006,.024,.145,cover);
  // The negative-Y cover faces away from the supporting palm.
  part(0,-.0145,0,.09,.001,.008,ink);
  part(0,-.0145,.016,.06,.001,.003,ink);
  const offset=new T.Vector3(.065,-.027,0),position=new T.Vector3(),rotation=new T.Quaternion();
  return (hand,amount)=>{
    book.visible=Boolean(hand)&&amount>.005;
    if(!book.visible)return;
    hand.getWorldPosition(position);hand.getWorldQuaternion(rotation);
    book.position.copy(offset).applyQuaternion(rotation).add(position);
    book.quaternion.copy(rotation);
    for(const material of [cover,paper,ink])material.opacity=T.MathUtils.clamp(amount/.18,0,1);
  };
}
