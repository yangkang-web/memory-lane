# Hunter step 2: Mixamo-rigged FBX + the original Sketchfab materials + Mixamo clips -> GLB. The estoc is attached at runtime.
# Run: Blender -b --factory-startup -P scripts/bloodbound-hunter-build.py
from pathlib import Path
import os, json, struct
import numpy as np
import bpy
ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'.local/bloodbound-tools/hunter'
OUT = Path(os.environ.get('HUNTER_OUT', ROOT/'public/assets/bloodbound/characters/v3/hunter.glb'))
bpy.ops.wm.open_mainfile(filepath=str(WORK/'hunter-prep.blend'))
source = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
bpy.ops.import_scene.fbx(filepath=str(WORK/'hunter-rigged.fbx'), automatic_bone_orientation=False, ignore_leaf_bones=True)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
arm.name = 'Hunter'
if arm.animation_data: arm.animation_data.action = None
for pb in arm.pose.bones: pb.matrix_basis.identity()
src_set = set(source.values())
for ob in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o not in src_set]:
    base = ob.name.split('.')[0]
    src = source.get(base)
    if src:
        ob.data.materials.clear()
        for m in src.data.materials: ob.data.materials.append(m)
for o in source.values(): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

# Mixamo clips exported for this exact rig; each becomes one NLA track, i.e. one glTF animation.
arm.animation_data_create()
for fbx in sorted((WORK/'anim').glob('*.fbx')):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False, ignore_leaf_bones=True)
    new = set(bpy.data.objects)-before
    src_arm = next(o for o in new if o.type == 'ARMATURE')
    action = src_arm.animation_data.action; action.name = fbx.stem
    track = arm.animation_data.nla_tracks.new(); track.name = fbx.stem
    track.strips.new(fbx.stem, int(action.frame_range[0]), action)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data.action = None

def tint_image(mat, color):
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bs.inputs['Base Color'].links[0].from_node
    while node.type != 'TEX_IMAGE': node = next(l.from_node for i in node.inputs for l in i.links)
    im = node.image
    px = np.empty(len(im.pixels), np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
    px[:, :3] *= np.array(color, np.float32)
    im.pixels.foreach_set(px.ravel()); im.pack()
# Grey-green coat pulled towards the chapel's brown-black.
TINTS = {'hunter_Coat': (.42, .36, .33), 'Hunter_Outfit': (.55, .5, .48)}
for m in bpy.data.materials:
    if m.name in TINTS and m.use_nodes: tint_image(m, TINTS[m.name])
for img in bpy.data.images:
    if img.size[0] > 2048: img.scale(2048, 2048 * img.size[1] // img.size[0]); img.pack()

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_image_format='WEBP',
    export_image_quality=88, export_yup=True)
raw = OUT.read_bytes(); jl = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+jl]); binary = raw[20+jl:]
for m in gltf.get('materials', []):
    pbr = m.setdefault('pbrMetallicRoughness', {})
    if m.get('alphaMode') == 'BLEND': m['alphaMode'] = 'OPAQUE'
    pbr['metallicFactor'] = min(pbr.get('metallicFactor', 1.0), 0.0 if m['name'] in ['Skin', 'hunter_Coat', 'Hunter_Outfit'] else 1.0)
enc = json.dumps(gltf, separators=(',', ':')).encode(); enc += b' '*((-len(enc)) % 4)
OUT.write_bytes(struct.pack('<4sII', b'glTF', 2, 20+len(enc)+len(binary))+struct.pack('<II', len(enc), 0x4e4f534a)+enc+binary)
print('DONE', OUT, OUT.stat().st_size, [(o.name, len(o.data.polygons), [m.name for m in o.data.materials]) for o in bpy.context.scene.objects if o.type == 'MESH'], flush=True)
