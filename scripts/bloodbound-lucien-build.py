# Lucien: Sketchfab "Alucard" body, coat and rig with an MPFB (MakeHuman CC0) head and expression morphs.
# Run: Blender -b --factory-startup -P scripts/bloodbound-lucien-build.py
from pathlib import Path
import os, sys, json, math, struct, hashlib
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT/'.local/bloodbound-tools'
SOURCE = TOOLS/'downloads/alucard-4k.glb'
OUT = Path(os.environ.get('LUCIEN_OUT', ROOT/'public/assets/bloodbound/characters/v3/lucien.glb'))
sys.path.insert(0, str(TOOLS/'mpfb2-master/src'))
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
bpy.context.preferences.use_preferences_save = False
bpy.context.preferences.addons.new().module = 'mpfb'
import mpfb
_original_extension_path = bpy.utils.extension_path_user
bpy.utils.extension_path_user = lambda package, path='', create=False: str(TOOLS/'mpfb-user'/path) if package == 'mpfb' else _original_extension_path(package, path=path, create=create)
mpfb.register()
mpfb.set_preference('mpfb_user_data', str(TOOLS/'mpfb-user'))
mpfb.set_preference('mpfb_second_root', str(TOOLS/'assets'))
from mpfb.services import HumanService, TargetService, ExportService
from mpfb.services.clothesservice import ClothesService
from mpfb.entities.clothes.mhclo import Mhclo
import importlib.util
spec = importlib.util.spec_from_file_location('lucien_detail', str(ROOT/'scripts/bloodbound-character-detail.py'))
detail = importlib.util.module_from_spec(spec); spec.loader.exec_module(detail)

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

# 1. MPFB head: the reviewed refined-v2 face.
macro = {'age':0.53,'cupsize':0.5,'firmness':0.5,'gender':1.0,'height':0.64,'muscle':0.58,'proportions':0.66,'race':{'african':0.0,'asian':0.04,'caucasian':0.96},'weight':0.44}
body = HumanService.create_human(macro_detail_dict=macro)
shapes = {
 'head/head-square':.10,
 'chin/chin-width-incr':.23,'chin/chin-prominent-incr':.21,'chin/chin-bones-incr':.22,'chin/chin-cleft-incr':.12,
 'cheek/l-cheek-bones-incr':.32,'cheek/r-cheek-bones-incr':.32,'cheek/l-cheek-volume-decr':.28,'cheek/r-cheek-volume-decr':.28,
 'nose/nose-scale-horiz-decr':.21,'nose/nose-greek-incr':.20,'nose/nose-point-width-decr':.13,'nose/nose-scale-depth-incr':.10,
 'eyebrows/eyebrows-trans-down':.17,'eyebrows/eyebrows-angle-down':.08,'eyebrows/eyebrows-trans-forward':.08,
 'eyes/l-eye-push1-in':.12,'eyes/r-eye-push1-in':.12,'eyes/l-eye-push2-in':.10,'eyes/r-eye-push2-in':.10,
 'eyes/l-eye-height1-decr':.20,'eyes/r-eye-height1-decr':.20,'eyes/l-eye-height2-decr':.08,'eyes/r-eye-height2-decr':.08,
 'mouth/mouth-upperlip-volume-decr':.10,'mouth/mouth-lowerlip-volume-decr':.06,
 'mouth/mouth-scale-horiz-incr':.07,'mouth/mouth-cupidsbow-incr':.12,'mouth/mouth-angles-up':.06,
}
TARGETS = TOOLS/'mpfb2-master/src/mpfb/data/targets'
for name, value in shapes.items():
    TargetService.load_target(body, str(TARGETS/(name+'.target.gz')), weight=value)
HumanService.set_character_skin(str(TOOLS/'assets/skins/young_caucasian_male/young_caucasian_male.mhmat'), body, skin_type='GAMEENGINE', material_instances=False)
proxies = {}
for path, typ, name in [('eyebrows/eyebrow001/eyebrow001.mhclo','Eyebrows','Lucien_Brows'),
                        ('eyelashes/eyelashes01/eyelashes01.mhclo','Eyelashes','Lucien_Lashes'),
                        ('eyes/high-poly/high-poly.mhclo','Eyes','Lucien_Eyes')]:
    ob = HumanService.add_mhclo_asset(str(TOOLS/'assets'/path), body, asset_type=typ, subdiv_levels=0, material_type='GAMEENGINE')
    ob.name = name; ob['mhclo_path'] = str(TOOLS/'assets'/path); proxies[name] = ob
TargetService.bake_targets(body)

# Expression units stay live as morph targets; proxies follow through their MHCLO vertex weights.
EXPRESSIONS = {
 'blinkLeft':'eye-left-closure','blinkRight':'eye-right-closure',
 'squintLeft':'eye-left-slit','squintRight':'eye-right-slit',
 'browInnerUpLeft':'eyebrows-left-inner-up','browInnerUpRight':'eyebrows-right-inner-up',
 'browDownLeft':'eyebrows-left-down','browDownRight':'eyebrows-right-down',
 'jawOpen':'mouth-open','smile':'mouth-corner-puller','mouthPucker':'mouth-pursing',
 'mouthPress':'mouth-compression','upperLipRaise':'mouth-upward-retraction','mouthPart':'mouth-parling',
}
for key, unit in EXPRESSIONS.items():
    TargetService.load_target(body, str(TARGETS/f'expression/units/caucasian/{unit}.target.gz'), weight=0.0, name=key)
basis = [v.co.copy() for v in body.data.vertices]
for ob in proxies.values():
    mhclo = Mhclo(); mhclo.load(ob['mhclo_path'])
    ob.shape_key_add(name='Basis', from_mix=False)
    for key in EXPRESSIONS:
        src = body.data.shape_keys.key_blocks[key]
        dst = ob.shape_key_add(name=key, from_mix=False)
        for i, m in mhclo.verts.items():
            if i >= len(ob.data.vertices): continue
            off = sum(((src.data[v].co-basis[v])*w for v, w in zip(m['verts'], m['weights'])), Vector())
            dst.data[i].co = ob.data.vertices[i].co+off
sub = body.modifiers.new('Facial surface refinement', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
ExportService.bake_modifiers_remove_helpers(body, bake_masks=True, bake_subdiv=True, remove_helpers=True)
for ob in [body, *proxies.values()]:
    ob.modifiers.clear()
    for p in ob.data.polygons: p.use_smooth = True
print('MPFB', len(body.data.vertices), [k.name for k in body.data.shape_keys.key_blocks], flush=True)

def eye_centers(ob):
    vs = [ob.matrix_world@v.co for v in ob.data.vertices]
    left = [v for v in vs if v.x > 0]; right = [v for v in vs if v.x < 0]
    return sum(left, Vector())/len(left), sum(right, Vector())/len(right)
m_l, m_r = eye_centers(proxies['Lucien_Eyes'])

# 2. Alucard.
mpfb_objects = {body, *proxies.values()}
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
if arm.animation_data: arm.animation_data.action = None
for pb in arm.pose.bones: pb.matrix_basis = Matrix()
for name in ['Circle.004', 'Cube', 'Icosphere']:
    root = bpy.data.objects.get(name)
    if root:
        for o in [root, *root.children_recursive]: bpy.data.objects.remove(o, do_unlink=True)
old_head, old_eyes, old_lashes = (bpy.data.objects[n] for n in ['Object_117', 'Object_127', 'Object_139'])
a_l, a_r = eye_centers(old_eyes)
scale = (a_l-a_r).length/(m_l-m_r).length
align = Matrix.Translation((a_l+a_r)/2) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-(m_l+m_r)/2)
cut_z = min((old_head.matrix_world@v.co).z for v in old_head.data.vertices)
print('ALIGN scale', round(scale, 4), 'cut', round(cut_z, 4), flush=True)

# Alucard's head skin weights drive the new head, so the seam deforms like the original neck.
weight_tree = KDTree(len(old_head.data.vertices)); old_weights = []
group_names = {g.index: g.name for g in old_head.vertex_groups}
for v in old_head.data.vertices:
    weight_tree.insert(old_head.matrix_world@v.co, v.index)
    old_weights.append({group_names[g.group]: g.weight for g in v.groups if g.weight > 1e-4})
weight_tree.balance()

def transplant(ob, cut=None):
    local = old_head.matrix_world.inverted() @ align @ ob.matrix_world
    if cut is not None:
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if (align @ ob.matrix_world @ v.co).z < cut], context='VERTS')
        bm.to_mesh(ob.data); bm.free()
    n = len(ob.data.vertices)
    R = np.array(local)
    for kb in (ob.data.shape_keys.key_blocks if ob.data.shape_keys else []):
        co = np.empty(n*3, np.float32); kb.data.foreach_get('co', co); co = co.reshape(-1, 3)
        kb.data.foreach_set('co', (co@R[:3, :3].T+R[:3, 3]).astype(np.float32).ravel())
    co = np.empty(n*3, np.float32); ob.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    ob.data.vertices.foreach_set('co', (co@R[:3, :3].T+R[:3, 3]).astype(np.float32).ravel())
    ob.data.update()
    ob.parent = old_head.parent; ob.matrix_parent_inverse = old_head.matrix_parent_inverse.copy(); ob.matrix_basis = old_head.matrix_basis.copy()
    ob.vertex_groups.clear()
    groups = {}
    bpy.context.view_layer.update()
    for v in ob.data.vertices:
        acc = {}; total = 0
        for _, idx, dist in weight_tree.find_n(ob.matrix_world@v.co, 4):
            inf = 1/max(dist, 1e-4)**2; total += inf
            for g, w in old_weights[idx].items(): acc[g] = acc.get(g, 0)+w*inf
        for g, w in acc.items():
            if w/total > 1e-3:
                if g not in groups: groups[g] = ob.vertex_groups.new(name=g)
                groups[g].add([v.index], w/total, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
for ob in proxies.values(): transplant(ob)
transplant(body, cut=cut_z-0.004)
body.name = 'Lucien_Head'

# The MPFB neck and trapezius are wider than Alucard's: keep the neck inside his original neck surface.
old_world = [old_head.matrix_world@v.co for v in old_head.data.vertices]
old_tree = BVHTree.FromPolygons(old_world, [tuple(p.vertices) for p in old_head.data.polygons])
old_np = np.array([tuple(v) for v in old_world])
NECK_TOP = (a_l.z+a_r.z)/2-0.125
bpy.context.view_layer.update()
mw = body.matrix_world; mwi = mw.inverted()
remove, moves = [], {}
for v in body.data.vertices:
    p = mw@v.co
    if p.z > NECK_TOP: continue
    band = old_np[np.abs(old_np[:, 2]-p.z) < 0.004]
    if len(band) < 8: remove.append(v.index); continue
    axis = Vector((band[:, 0].mean(), band[:, 1].mean(), p.z))
    d = Vector((p.x-axis.x, p.y-axis.y, 0))
    if d.length < 1e-4: continue
    hit = old_tree.ray_cast(axis, d.normalized(), 0.3)[0]
    if hit is None or d.length > (hit-axis).length+0.012: remove.append(v.index)
    elif d.length > (hit-axis).length-0.001:
        moves[v.index] = mwi@(axis+d.normalized()*((hit-axis).length-0.001))-v.co
for kb in body.data.shape_keys.key_blocks:
    for i, delta in moves.items(): kb.data[i].co += delta
for i, delta in moves.items(): body.data.vertices[i].co += delta
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in remove], context='VERTS'); bm.to_mesh(body.data); bm.free()
print('NECK moved', len(moves), 'removed', len(remove), flush=True)
for o in [old_head, old_eyes, old_lashes]: bpy.data.objects.remove(o, do_unlink=True)

# 3. Hair: darken, and push any strand that falls inside the new skull back out.
hair = bpy.data.objects['Object_149']; hair.name = 'Lucien_Hair'
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
head_world = [body.matrix_world@v.co for v in body.data.vertices]
tree = BVHTree.FromPolygons(head_world, [tuple(p.vertices) for p in body.data.polygons])
centre = (a_l+a_r)/2+Vector((0, 0.045, 0.03))
inv = hair.matrix_world.inverted(); pushed = 0
for v in hair.data.vertices:
    p = hair.matrix_world@v.co; d = (p-centre)
    if d.length < 1e-5: continue
    hit = tree.ray_cast(centre, d.normalized(), 0.25)[0]
    if hit is not None and d.length < (hit-centre).length+0.003:
        v.co = inv@(hit+d.normalized()*0.003); pushed += 1
print('HAIR pushed', pushed, 'of', len(hair.data.vertices), flush=True)

# Scalp under the hair takes the hair colour with a soft edge, so the hairline is not a hard wig line.
bpy.context.view_layer.update()
hair_tree = BVHTree.FromPolygons([hair.matrix_world@v.co for v in hair.data.vertices], [tuple(p.vertices) for p in hair.data.polygons])
nm = body.matrix_world.to_3x3().inverted().transposed()
cover = np.zeros(len(body.data.vertices))
for v in body.data.vertices:
    p = body.matrix_world@v.co
    if p.z < (a_l.z+a_r.z)/2: continue
    hit = hair_tree.ray_cast(p+(nm@v.normal).normalized()*0.0005, (nm@v.normal).normalized(), 0.025)[0]
    cover[v.index] = 1.0 if hit is not None else 0.0
edges = np.array([tuple(e.vertices) for e in body.data.edges])
for _ in range(28):
    acc = np.zeros_like(cover); cnt = np.zeros_like(cover)
    np.add.at(acc, edges[:, 0], cover[edges[:, 1]]); np.add.at(acc, edges[:, 1], cover[edges[:, 0]])
    np.add.at(cnt, edges[:, 0], 1); np.add.at(cnt, edges[:, 1], 1)
    cover = (cover+acc)/(1+cnt)
cover = np.clip((cover-.04)/.5, 0, 1)**.8
scalp = np.array([.20, .16, .16])
col = body.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
rgba = np.ones((len(cover), 4), np.float32); rgba[:, :3] = 1-cover[:, None]*(1-scalp)
col.data.foreach_set('color', rgba.ravel())
print('SCALP covered', int((cover > .5).sum()), flush=True)

def tint_image(mat, color, socket='Base Color'):
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    links = bs.inputs[socket].links
    if not links: bs.inputs[socket].default_value = (*color, 1); return
    node = links[0].from_node
    while node.type != 'TEX_IMAGE':
        node = next(l.from_node for i in node.inputs for l in i.links)
    im = node.image
    px = np.empty(len(im.pixels), np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
    px[:, :3] *= np.array(color, np.float32)
    im.pixels.foreach_set(px.ravel()); im.pack()
HAIR_TINT = (.032, .027, .030)
tint_image(hair.data.materials[0], HAIR_TINT)
next(n for n in hair.data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Roughness'].default_value = .55
# Black wool coat (gold trim becomes dark bronze), dark trousers, wine-dark cape.
for ob_name, tint in [('Object_123', (.26, .25, .27)), ('Object_113', (.45, .45, .47)), ('Object_153', (.24, .055, .065))]:
    tint_image(bpy.data.objects[ob_name].data.materials[0], tint)

# 4. Wine silk cravat instead of white lace; the shirt gets its own matte material (it shares the coat texture).
cravat = bpy.data.objects['Object_147']; cravat.name = 'Lucien_Cravat'
silk = detail.material('Lucien wine silk cravat', (.035, .004, .008), .62)
shirt = bpy.data.objects['Object_145']; shirt.name = 'Lucien_Shirt'
shirt.data.materials[0] = shirt.data.materials[0].copy(); shirt.data.materials[0].name = 'Lucien shirt'
cravat.data.materials.clear(); cravat.data.materials.append(silk)

# 5. Face materials.
skin = body.data.materials[0]
detail.surface_maps(skin)
skin.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value = 1.42
eyes = proxies['Lucien_Eyes']
mat = bpy.data.materials.new('Lucien grey eyes'); mat.use_nodes = True
bs = mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value = .16
tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(str(TOOLS/'assets/eyes/materials/grey_eye.png'))
mat.node_tree.links.new(tex.outputs['Color'], bs.inputs['Base Color']); mat.node_tree.links.new(tex.outputs['Alpha'], bs.inputs['Alpha'])
mat.surface_render_method = 'DITHERED'
eyes.data.materials.clear(); eyes.data.materials.append(mat)
for name in ['Lucien_Brows', 'Lucien_Lashes']:
    m = proxies[name].data.materials[0]
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for l in list(bs.inputs['Base Color'].links): m.node_tree.links.remove(l)
    bs.inputs['Base Color'].default_value = (.012, .009, .014, 1); bs.inputs['Roughness'].default_value = .5
    tex = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'), None)
    if tex: m.node_tree.links.new(tex.outputs['Alpha'], bs.inputs['Alpha'])
    m.surface_render_method = 'DITHERED'; m.use_backface_culling = False
for m in bpy.data.materials:
    if not m.use_nodes: continue
    bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bs and m.name == 'Hair': m.surface_render_method = 'DITHERED'

# 6. Mixamo-standard bone names so downloaded clips bind directly.
import re
for b in arm.data.bones:
    clean = re.sub(r'_\d+$', '', b.name)
    if clean != b.name and clean.startswith('mixamorig:'): b.name = clean
for img in bpy.data.images:
    if img.size[0] > 2048 or img.size[1] > 2048:
        img.scale(min(2048, img.size[0]), min(2048, img.size[1])); img.pack()

# 7. Polygon budget: the head keeps full density for close-ups; clothing and hair cards are collapsed.
DECIMATE = {'Lucien_Hair': .6, 'Object_123': .4, 'Object_153': .45, 'Object_113': .45, 'Object_133': .5, 'Object_143': .5, 'Object_135': .5, 'Lucien_Cravat': .5}
for name, ratio in DECIMATE.items():
    ob = bpy.data.objects[name]
    mod = ob.modifiers.new('Budget', 'DECIMATE'); mod.ratio = ratio
    while ob.modifiers[0] != mod: ob.modifiers.move(ob.modifiers.find(mod.name), 0)
    with bpy.context.temp_override(object=ob, active_object=ob):
        bpy.ops.object.modifier_apply(modifier=mod.name)

# 8. Mixamo clips exported for Lucien's own upload. The FBX importer rolls bones differently from the glTF importer,
# so each frame is transferred through world space with a per-bone rest correction.
def retarget(fbx):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(fbx), ignore_leaf_bones=True)
    new = set(bpy.data.objects)-before
    src = next(o for o in new if o.type == 'ARMATURE')
    f0, f1 = (int(round(f)) for f in src.animation_data.action.frame_range)
    At, As = arm.matrix_world, src.matrix_world
    corr = {b.name: (As@src.data.bones[b.name].matrix_local).inverted()@(At@b.matrix_local) for b in arm.data.bones if b.name in src.data.bones}
    order = sorted(arm.data.bones, key=lambda b: len(b.parent_recursive))
    action = bpy.data.actions.new(fbx.stem); arm.animation_data.action = action
    for f in range(f0, f1+1):
        bpy.context.scene.frame_set(f)
        pose = {}
        for b in order:
            if b.name in corr:
                M = At.inverted()@As@src.pose.bones[b.name].matrix@(As@src.data.bones[b.name].matrix_local).inverted()@At@b.matrix_local
            else:
                M = pose[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local.copy()
            loc, rot, _ = M.decompose(); pose[b.name] = Matrix.LocRotScale(loc, rot, None)
            local = b.matrix_local if not b.parent else b.parent.matrix_local.inverted()@b.matrix_local
            parent = pose[b.parent.name] if b.parent else Matrix()
            basis = local.inverted()@parent.inverted()@pose[b.name] if b.parent else b.matrix_local.inverted()@pose[b.name]
            pb = arm.pose.bones[b.name]
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = basis.to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=f-f0)
            if b.name == 'mixamorig:Hips':
                pb.location = basis.to_translation(); pb.keyframe_insert('location', frame=f-f0)
    track = arm.animation_data.nla_tracks.new(); track.name = fbx.stem
    track.strips.new(fbx.stem, 0, action); arm.animation_data.action = None
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    print('CLIP', fbx.stem, f1-f0+1, flush=True)
arm.animation_data_create()
clips = sorted((TOOLS/'lucien/anim').glob('*.fbx'))
for fbx in clips: retarget(fbx)
# Drop the source model's "ArmatureAction" track and the imported FBX actions; export only the retargeted clips.
for t in [t for t in arm.animation_data.nla_tracks if t.name not in {f.stem for f in clips}]: arm.animation_data.nla_tracks.remove(t)
for a in [a for a in bpy.data.actions if a.name not in {f.stem for f in clips}]: bpy.data.actions.remove(a)
for pb in arm.pose.bones: pb.matrix_basis = Matrix()

if os.environ.get('LUCIEN_BLEND'):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ['LUCIEN_BLEND'])
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_morph=True,
    export_morph_normal=False, export_vertex_color='ACTIVE', export_image_format='WEBP', export_image_quality=88, export_yup=True, export_apply=False)

raw = OUT.read_bytes(); jl = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+jl]); binary = raw[20+jl:]
for m in gltf.get('materials', []):
    name = m.get('name', '')
    if any(k in name for k in ['eyebrow', 'eyelash', 'grey eyes', 'Hair']):
        m['alphaMode'] = 'MASK'; m['alphaCutoff'] = .3 if 'Hair' in name else .4; m['doubleSided'] = True
    elif m.get('alphaMode') == 'BLEND':
        m['alphaMode'] = 'OPAQUE'
    pbr = m.setdefault('pbrMetallicRoughness', {})
    # Sketchfab ORM maps carry no real metal; a metallic factor of 1 turns wool and skin into latex.
    if name in ['material', 'bottom', 'cape', 'sword_holster', 'Human.body']: pbr['metallicFactor'] = 0.0
    if name == 'Lucien shirt':
        pbr.pop('metallicRoughnessTexture', None); m.pop('occlusionTexture', None)
        pbr.update(metallicFactor=0.0, roughnessFactor=.8, baseColorFactor=[.36, .36, .4, 1])
enc = json.dumps(gltf, separators=(',', ':')).encode(); enc += b' '*((-len(enc)) % 4)
OUT.write_bytes(struct.pack('<4sII', b'glTF', 2, 20+len(enc)+len(binary))+struct.pack('<II', len(enc), 0x4e4f534a)+enc+binary)
tris = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
print('DONE', OUT, OUT.stat().st_size, 'tris', tris, 'morphs', [t for mesh in gltf['meshes'] for t in mesh.get('extras', {}).get('targetNames', [])][:20], flush=True)
