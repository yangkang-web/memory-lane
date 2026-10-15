"""Convert Microsoft's MIT Rocketbox source into inspectable realtime candidates."""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / '.local/bloodbound-tools/character-next/rocketbox'
OUT = ROOT / 'public/assets/bloodbound/characters'
OUT.mkdir(parents=True, exist_ok=True)

ALIASES = {
    'Pelvis': 'Hips', 'Spine': 'Spine', 'Spine1': 'Spine1', 'Spine2': 'Spine2',
    'Neck': 'Neck', 'Head': 'Head', 'MJaw': 'Jaw', 'LEye': 'LeftEye', 'REye': 'RightEye',
    'MUpperLip': 'UpperLip', 'MBottomLip': 'LowerLip',
    'LUpperlip': 'UpperLipLeft', 'RUpperlip': 'UpperLipRight',
    'LMouthCorner': 'MouthCornerLeft', 'RMouthCorner': 'MouthCornerRight',
    'LCaninus': 'CaninusLeft', 'RCaninus': 'CaninusRight',
}
for side, label in [('L', 'Left'), ('R', 'Right')]:
    for old, new in [('Clavicle', 'Shoulder'), ('UpperArm', 'Arm'), ('Forearm', 'ForeArm'),
                     ('Hand', 'Hand'), ('Thigh', 'UpLeg'), ('Calf', 'Leg'), ('Foot', 'Foot'), ('Toe0', 'ToeBase')]:
        ALIASES[f'{side} {old}'] = label + new
    for digit, name in enumerate(['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']):
        for joint, suffix in enumerate(['', '1', '2']):
            ALIASES[f'{side} Finger{digit}{suffix}'] = f'{label}Hand{name}{joint + 1}'
ALIASES = {'Bip01 ' + k: v for k, v in ALIASES.items()}


def materials(folder):
    textures = {p.name.lower(): p for p in (folder / 'Textures').glob('*')}
    for image in bpy.data.images:
        basename = image.filepath.replace('\\', '/').split('/')[-1].lower()
        if basename in textures:
            compressed = ROOT/'.local/bloodbound-tools/character-next/texture-cache'/(Path(basename).stem+'.jpg')
            image.filepath = str(compressed if compressed.exists() else textures[basename])
            image.reload()
            image.pack()
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Metallic'].default_value = 0
        bsdf.inputs['Roughness'].default_value = .6 if 'head' in mat.name else .78
        bsdf.inputs['Specular IOR Level'].default_value = .25
        for socket in ['Specular IOR Level', 'Metallic', 'Roughness']:
            for link in list(bsdf.inputs[socket].links):
                links.remove(link)
        for n in nodes:
            if n.type == 'NORMAL_MAP':
                n.inputs['Strength'].default_value = .7
        if 'opacity' in mat.name:
            mat.surface_render_method = 'DITHERED'
            mat.use_backface_culling = False
            mat['alphaCutoff'] = .45
            bsdf.inputs['Roughness'].default_value = .82
        else:
            for link in list(bsdf.inputs['Alpha'].links):
                links.remove(link)
            bsdf.inputs['Alpha'].default_value = 1


def convert(category, name, output, hands=False, refinement=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    folder = SRC / 'Assets/Avatars' / category / name
    fbx = next((folder / 'Export').glob('*facial.fbx'))
    bpy.ops.import_scene.fbx(filepath=str(fbx), use_anim=False)
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    materials(folder)
    if refinement:
        meshes = refinement(rig, meshes)
    for obj in meshes:
        if obj.data.shape_keys:
            if hands:
                obj.shape_key_clear()
            else:
                for key in list(obj.data.shape_keys.key_blocks)[::-1]:
                    if key.name != 'Basis' and not key.name.startswith(('AK_', 'AA_VI_')):
                        obj.shape_key_remove(key)
                for key in obj.data.shape_keys.key_blocks:
                    if key.name.startswith('AK_'):
                        name_part = key.name.split('_', 2)[2]
                        key.name = name_part[0].lower() + name_part[1:]
                    elif key.name.startswith('AA_VI_'):
                        key.name = 'viseme_' + key.name.rsplit('_', 1)[-1].lower()
                    key.value = 0
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if hands:
        for obj in meshes:
            groups = {g.index for g in obj.vertex_groups if any(s in g.name for s in [' Forearm', ' Hand', ' Finger'])}
            keep = {v.index for v in obj.data.vertices if sum(g.weight for g in v.groups if g.group in groups) > .15}
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bm.verts.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context='VERTS')
            bm.to_mesh(obj.data)
            bm.free()
    # Keep the imported inverse binds. A parent handles units and forward direction.
    eye = (rig.data.bones['Bip01 LEye'].head_local + rig.data.bones['Bip01 REye'].head_local) * .5
    head = rig.data.bones['Bip01 Head'].head_local
    forward = rig.matrix_world.to_3x3() @ (eye - head)
    yaw = -math.pi / 2 - math.atan2(forward.y, forward.x)
    all_points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    if hands:
        scale = 1
        floor = 0
    else:
        floor = min(v.z for v in all_points)
        scale = 1.83 / (max(v.z for v in all_points) - floor)
    root = bpy.data.objects.new('LucienRoot' if not hands else 'PlayerHandsRoot', None)
    bpy.context.collection.objects.link(root)
    for obj in [o for o in bpy.data.objects if o != root and o.parent is None]:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world
    root.rotation_euler.z = yaw
    root.scale = (scale,) * 3
    root.location.z = -floor * scale
    for old, new in ALIASES.items():
        bone = rig.data.bones.get(old)
        if bone:
            bone.name = new
        for obj in meshes:
            group = obj.vertex_groups.get(old)
            if group:
                group.name = new
    bpy.context.view_layer.update()
    target = OUT / output
    if refinement:
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'.local/bloodbound-tools/character-next/lucien-next.blend'))
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_animations=False,
                              export_morph=True, export_morph_normal=True, export_morph_tangent=False,
                              export_skins=True, export_yup=True, export_image_format='AUTO',
                              export_extras=True, export_all_influences=False)
    manifest = {
        'asset': output, 'source': str(fbx.relative_to(SRC)),
        'sourceRepository': 'https://github.com/microsoft/Microsoft-Rocketbox', 'license': 'MIT',
        'role': 'first-person forearms/hands' if hands else 'comparison candidate, not P1-approved',
        'boneNames': [b.name for b in rig.data.bones],
        'morphTargets': [k.name for o in meshes if o.data.shape_keys for k in o.data.shape_keys.key_blocks if k.name != 'Basis'],
        'vertices': sum(len(o.data.vertices) for o in meshes),
        'triangles': sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons),
        'forward': '+Z', 'up': '+Y', 'heightMeters': None if hands else 1.83,
        'bytes': target.stat().st_size,
    }
    target.with_suffix('.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('EXPORTED', output, manifest['bytes'], 'vertices', manifest['vertices'], flush=True)


if __name__ == '__main__':
    mode = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
    if mode in ['all', 'male01']:
        convert('Professions', 'Medical_Male_01', 'rocketbox-male01.glb')
    if mode in ['all', 'male02']:
        convert('Professions', 'Medical_Male_02', 'rocketbox-male02.glb')
    if mode in ['all', 'hands']:
        convert('Adults', 'Female_Adult_03', 'player-hands.glb', hands=True)
