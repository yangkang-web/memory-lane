import * as T from 'three';

// Bake a small original room once. Window-shaped highlights help lacquer and
// steel read as different materials, without rendering a reflection each frame.
export function addClassroomReflections(renderer, scene) {
  const room = new T.Scene();
  const shell = new T.Mesh(new T.BoxGeometry(10, 6, 14),
    new T.MeshBasicMaterial({ color: '#656e79', side: T.BackSide }));
  room.add(shell);
  for (const z of [-4, 0, 4]) {
    const window = new T.Mesh(new T.PlaneGeometry(2.9, 3.6),
      new T.MeshBasicMaterial({ color: new T.Color('#fff2d9').multiplyScalar(2.4) }));
    window.position.set(-4.95, .5, z); window.rotation.y = Math.PI / 2; room.add(window);
    for (const [w,h] of [[.06,3.6],[2.9,.06]]) {
      const bar = new T.Mesh(new T.PlaneGeometry(w,h), new T.MeshBasicMaterial({color:'#727a82'}));
      bar.position.set(-4.92,.5,z); bar.rotation.y=Math.PI/2; room.add(bar);
    }
  }
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromScene(room, .025);
  scene.traverse(object => {
    const mat = object.material;
    if (!mat?.isMeshStandardMaterial || (!mat.clearcoat && mat.metalness < .5)) return;
    mat.envMap = target.texture;
    mat.envMapIntensity = mat.metalness >= .5 ? .75 : mat.transparent ? .25 : .60;
    mat.needsUpdate = true;
  });
  generator.dispose();
  room.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
}
