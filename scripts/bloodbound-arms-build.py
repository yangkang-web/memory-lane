# First-person body: Mixamo "Louise" (skinned T-pose FBX) reduced to the torso, arms and hands in dark clothes, plus
# Mixamo clips -> GLB. The torso is what the pendant rests on when the player looks down; head, neck and legs go.
# The full skeleton is kept so clips bind directly; the runtime pins mixamorigHead to the camera.
# Run (Blender 4.x; 5.x changed the Action API): Blender -b --factory-startup -P scripts/bloodbound-arms-build.py
from pathlib import Path
import os, json, struct
import numpy as np
import bpy
ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'.local/bloodbound-tools/arms'
OUT = Path(os.environ.get('ARMS_OUT', ROOT/'public/assets/bloodbound/characters/v3/arms.glb'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(WORK/'louise.fbx'), automatic_bone_orientation=False, ignore_leaf_bones=True)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
arm.name = 'PlayerArms'
if arm.animation_data: arm.animation_data.action = None
for pb in arm.pose.bones: pb.matrix_basis.identity()
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
# Louise's export uses a numbered "mixamorig8:" prefix; normalise to the plain Mixamo names the other characters use.
def plain(name): return 'mixamorig:'+name.split(':', 1)[1] if name.startswith('mixamorig') and ':' in name else name
for b in arm.data.bones: b.name = plain(b.name)

# Keep only faces whose every vertex is mostly driven by the chest, shoulders and arms; head, neck, hips and legs go.
def kept(bone): return any(bone.startswith(f'mixamorig:{s}') for s in ('Spine', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'))
for ob in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    keep_groups = {g.index for g in ob.vertex_groups if kept(g.name)}
    w = np.array([sum(g.weight for g in v.groups if g.group in keep_groups) for v in ob.data.vertices])
    good = w >= .5
    faces = [p.index for p in ob.data.polygons if not all(good[i] for i in p.vertices)]
    print('MESH', ob.name, len(ob.data.polygons), '->', len(ob.data.polygons)-len(faces), [m.name for m in ob.data.materials], flush=True)
    # A few stray waistband faces of the trousers survive the weight test; they are not wanted.
    if len(faces) == len(ob.data.polygons) or ob.name == 'Ch07_Pants': bpy.data.objects.remove(ob, do_unlink=True); continue
    import bmesh
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in faces], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(ob.data); bm.free()

# Mixamo clips exported for Louise; each becomes one NLA track, i.e. one glTF animation.
arm.animation_data_create()
for fbx in sorted((WORK/'anim').glob('*.fbx')):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False, ignore_leaf_bones=True)
    new = set(bpy.data.objects)-before
    src_arm = next(o for o in new if o.type == 'ARMATURE')
    action = src_arm.animation_data.action; action.name = fbx.stem
    for fc in action.fcurves:
        if '"' in fc.data_path:
            head, bone, tail = fc.data_path.split('"', 2); fc.data_path = f'{head}"{plain(bone)}"{tail}'
    track = arm.animation_data.nla_tracks.new(); track.name = fbx.stem
    track.strips.new(fbx.stem, int(action.frame_range[0]), action)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data.action = None
for a in [a for a in bpy.data.actions if a.users == 0]: bpy.data.actions.remove(a)

def tint_image(mat, color):
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bs.inputs['Base Color'].links[0].from_node
    while node.type != 'TEX_IMAGE': node = next(l.from_node for i in node.inputs for l in i.links)
    im = node.image
    px = np.empty(len(im.pixels), np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
    px[:, :3] *= np.array(color, np.float32)
    im.pixels.foreach_set(px.ravel()); im.pack()
# Navy jacket pulled down to near-black so the sleeves sit in the chapel's palette. Skin and suit share one atlas,
# so the suit gets its own material and image copy before tinting.
suit = bpy.data.objects.get('Ch07_Suit')
if suit:
    mat = suit.data.materials[0].copy(); mat.name = 'PlayerSleeve'; suit.data.materials[0] = mat
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = bs.inputs['Base Color'].links[0].from_node
    while tex.type != 'TEX_IMAGE': tex = next(l.from_node for i in tex.inputs for l in i.links)
    tex.image = tex.image.copy(); tex.image.name = 'PlayerSleeve'
    tint_image(mat, (.32, .3, .34))
    # The source's specular and roughness maps read as patent leather once darkened; make it matte wool.
    for name in ('Roughness', 'Specular IOR Level', 'Specular Tint'):
        for l in list(bs.inputs[name].links): mat.node_tree.links.remove(l)
    bs.inputs['Roughness'].default_value = .82
    bs.inputs['Specular IOR Level'].default_value = .3
# The white shirt in the jacket's V would glare in the dark; it shares the skin atlas, so it gets its own copy too.
shirt = bpy.data.objects.get('Ch07_Shirt')
if shirt:
    mat = shirt.data.materials[0].copy(); mat.name = 'PlayerShirt'; shirt.data.materials[0] = mat
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = bs.inputs['Base Color'].links[0].from_node
    while tex.type != 'TEX_IMAGE': tex = next(l.from_node for i in tex.inputs for l in i.links)
    tex.image = tex.image.copy(); tex.image.name = 'PlayerShirt'
    tint_image(mat, (.2, .17, .18))
    for l in list(bs.inputs['Roughness'].links): mat.node_tree.links.remove(l)
    bs.inputs['Roughness'].default_value = .7
for img in bpy.data.images:
    if img.size[0] > 2048: img.scale(2048, 2048 * img.size[1] // img.size[0]); img.pack()

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_image_format='WEBP',
    export_image_quality=88, export_yup=True)
raw = OUT.read_bytes(); jl = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+jl]); binary = raw[20+jl:]
for m in gltf.get('materials', []):
    if m.get('alphaMode') == 'BLEND': m['alphaMode'] = 'OPAQUE'
    m.setdefault('pbrMetallicRoughness', {})['metallicFactor'] = 0.0
enc = json.dumps(gltf, separators=(',', ':')).encode(); enc += b' '*((-len(enc)) % 4)
OUT.write_bytes(struct.pack('<4sII', b'glTF', 2, 20+len(enc)+len(binary))+struct.pack('<II', len(enc), 0x4e4f534a)+enc+binary)
print('DONE', OUT, OUT.stat().st_size, [(o.name, len(o.data.polygons), [m.name for m in o.data.materials]) for o in bpy.context.scene.objects if o.type == 'MESH'], [t.name for t in arm.animation_data.nla_tracks], flush=True)
