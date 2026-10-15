"""Adapt Daniel Bystedt's authored curl groom as lightweight skinned geometry."""
import bpy
import bmesh
from mathutils.bvhtree import BVHTree
import json
import math
import random
import struct
import hashlib
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.local/bloodbound-tools/hair-next'
ASSETS = ROOT / 'public/assets/bloodbound/characters'
OUT = ASSETS / 'lucien-hair-option.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(str(WORK / 'hair-styles.blend'), link=False) as (source, target):
    target.objects = ['long hair main']
groom = bpy.data.objects['long hair main']
for obj in list(bpy.data.objects):
    if obj.type in ['CURVES', 'MESH', 'EMPTY']:
        bpy.context.collection.objects.link(obj)
        if obj != groom:
            for modifier in obj.modifiers:
                modifier.show_viewport = False
                modifier.show_render = False
for modifier in groom.modifiers:
    if modifier.name == 'Surface Deform':
        modifier.show_viewport = False
        modifier.show_render = False
    if modifier.node_group:
        for node in modifier.node_group.nodes:
            if node.type == 'GROUP' and node.node_tree and node.node_tree.name == 'Interpolate Hair Curves':
                node.inputs['Density'].default_value = 480
            if node.type == 'GROUP' and node.node_tree and node.node_tree.name == 'Hair Curves Noise':
                node.inputs['Distance'].default_value = .035
                node.inputs['Scale along Curve'].default_value = 3
            if node.type == 'GROUP' and node.node_tree and node.node_tree.name == 'Curl Hair Curves':
                node.inputs['Radius'].default_value = .07
            if node.type == 'GROUP' and node.node_tree and node.node_tree.name == 'Roll Hair Curves':
                node.inputs['Factor'].default_value = .42
bpy.context.view_layer.update()
evaluated = groom.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
points = [Vector(point.position) for point in evaluated.points]
lengths = [curve.points_length for curve in evaluated.curves]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ASSETS / 'lucien-next-candidate.glb'))
rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
rig_inverse = rig.matrix_world.inverted()
head = next(obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.name.startswith('LucienFaceAndHair'))
head_slots = {i for i, mat in enumerate(head.data.materials) if mat and 'm154_head' in mat.name}
head_bvh = BVHTree.FromPolygons([head.matrix_world @ v.co for v in head.data.vertices], [tuple(face.vertices) for face in head.data.polygons if face.material_index in head_slots])
old_hair_slots = {i for i, mat in enumerate(head.data.materials) if mat and 'm154_opacity' in mat.name}
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.material_index in old_hair_slots], context='FACES')
bm.to_mesh(head.data)
bm.free()
scalp = bpy.data.materials.new('LucienHairScalpUnderlay')
scalp.use_nodes = True
scalp_bsdf = next(node for node in scalp.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
scalp_bsdf.inputs['Base Color'].default_value = (.003, .0032, .0035, 1)
scalp_bsdf.inputs['Roughness'].default_value = .91
scalp_bsdf.inputs['Specular IOR Level'].default_value = .06
scalp_index = len(head.data.materials)
head.data.materials.append(scalp)
head_image = next(node.image for node in head.data.materials[min(head_slots)].node_tree.nodes if node.type == 'TEX_IMAGE' and node.image.colorspace_settings.name == 'sRGB')
head_pixels = list(head_image.pixels)
iw, ih = head_image.size
scalp_faces = 0
for face in head.data.polygons:
    if face.material_index not in head_slots:
        continue
    world = head.matrix_world @ face.center
    if world.z < 1.69:
        continue
    samples = []
    for li in face.loop_indices:
        uv = head.data.uv_layers.active.data[li].uv
        px, py = min(iw-1, max(0, int(uv.x*iw))), min(ih-1, max(0, int(uv.y*ih)))
        samples.append(sum(head_pixels[(py*iw+px)*4:(py*iw+px)*4+3])/3)
    if max(samples) < .14 or (world.y > -.005 and sum(samples) / len(samples) < .30):
        face.material_index = scalp_index
        scalp_faces += 1
print('scalp faces', scalp_faces, flush=True)
scalp_uv_keys = {tuple(sorted((round(head.data.uv_layers.active.data[li].uv.x, 4), round(1-head.data.uv_layers.active.data[li].uv.y, 4)) for li in face.loop_indices)) for face in head.data.polygons if face.material_index == scalp_index}
source_bytes = (ASSETS / 'lucien-next-candidate.glb').read_bytes()
source_json_length = struct.unpack_from('<I', source_bytes, 12)[0]
source_gltf = json.loads(source_bytes[20:20+source_json_length])
source_bin = source_bytes[28+source_json_length:]
def read_accessor(index):
    accessor = source_gltf['accessors'][index]
    view = source_gltf['bufferViews'][accessor['bufferView']]
    count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
    fmt = {5123:'H', 5125:'I', 5126:'f'}[accessor['componentType']] * count
    start = view.get('byteOffset',0)+accessor.get('byteOffset',0)
    stride = view.get('byteStride',struct.calcsize('<'+fmt))
    return [struct.unpack_from('<'+fmt, source_bin, start+i*stride) for i in range(accessor['count'])]
source_mesh_index = next(i for i,m in enumerate(source_gltf['meshes']) if m['name']=='LucienFaceAndHair')
source_mesh = source_gltf['meshes'][source_mesh_index]
source_primitive_index = next(i for i,p in enumerate(source_mesh['primitives']) if source_gltf['materials'][p['material']]['name']=='m154_head')
source_primitive = source_mesh['primitives'][source_primitive_index]
uvs = read_accessor(source_primitive['attributes']['TEXCOORD_0'])
indices = [item[0] for item in read_accessor(source_primitive['indices'])]
source_scalp_triangles = []
matched_keys = set()
for offset in range(0,len(indices),3):
    key = tuple(sorted((round(uvs[index][0],4), round(uvs[index][1],4)) for index in indices[offset:offset+3]))
    if key in scalp_uv_keys:
        source_scalp_triangles.append(offset//3)
        matched_keys.add(key)
assert len(matched_keys)==len(scalp_uv_keys), (len(matched_keys),len(scalp_uv_keys))
(ASSETS / 'lucien-hair-scalp-remap.json').write_text(json.dumps({
    'sourceSha256': hashlib.sha256(source_bytes).hexdigest(),
    'sourceMeshName': 'LucienFaceAndHair', 'sourceMeshIndex': source_mesh_index,
    'sourcePrimitiveIndex': source_primitive_index, 'sourceMaterialName':'m154_head',
    'triangleIndices': source_scalp_triangles,
    'removeMaterialPrimitive': 'm154_opacity',
    'replacementMaterial': {'name':'LucienHairScalpUnderlay','pbrMetallicRoughness':{'baseColorFactor':[.003,.0032,.0035,1],'metallicFactor':0,'roughnessFactor':.91},'extensions':{'KHR_materials_specular':{'specularFactor':.12}}},
    'note':'Zero-based triangle ordinals in source index accessor; split indices only, preserve all vertex attributes and morphs.'
},ensure_ascii=False,indent=2)+'\n')

materials = []
for index, factor in enumerate([.78, .92, 1.05]):
    material = bpy.data.materials.new('BystedtNaturalBlackCurl' + str(index))
    material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (.008 * factor, .0085 * factor, .010 * factor, 1)
    bsdf.inputs['Roughness'].default_value = .55
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Specular IOR Level'].default_value = .32
    materials.append(material)

def smooth_path(path):
    result = []
    for i in range(len(path) - 1):
        a, b, c, d = path[max(0, i - 1)], path[i], path[i + 1], path[min(len(path) - 1, i + 2)]
        for step in range(3):
            t = step / 3
            result.append(.5 * (2 * b + (-a + c) * t + (2*a - 5*b + 4*c - d) * t*t + (-a + 3*b - 3*c + d) * t*t*t))
    result.append(path[-1])
    return result

strand_material = bpy.data.materials.new('BystedtGroomRocketboxSilk')
strand_material.use_nodes = True
bsdf = next(node for node in strand_material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
image = bpy.data.images.load(str(WORK / 'male01-image-4.png'))
image.pack()
tex = strand_material.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = image
strand_material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
strand_material.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
bsdf.inputs['Roughness'].default_value = .73
bsdf.inputs['Specular IOR Level'].default_value = .2
strand_material.surface_render_method = 'DITHERED'
strand_material.use_backface_culling = False
materials.append(strand_material)
vertices, faces, mat_ids, face_uvs = [], [], [], []
rng = random.Random(1729)
offset = 0
for curve_index, length in enumerate(lengths):
    source = points[offset:offset + length]
    offset += length
    ribbon = curve_index % 3 == 0
    if not ribbon and curve_index % 8 != 0:
        continue
    path = [Vector((p.x * .098, p.y * .09 + .02, 1.725 + (p.z - 15.35) * .10)) for p in source]
    long_side = abs(path[-1].x) > .055 or path[-1].y > .02
    for i, point in enumerate(path):
        amount = i / (length - 1)
        if long_side:
            lower = max(0, min(1, (1.81 - point.z) / .24))
            side = 1 if point.x > 0 else -1
            phase = (1.81 - point.z) * 52 + source[0].x * 11
            point.x += side * (.018 * math.sin(math.pi * lower) - .018 * lower * lower + .008 * math.sin(phase) * math.sin(math.pi * lower))
            point.y += .010 * math.cos(phase) * math.sin(math.pi * lower)
            if point.y < -.03 and point.z < 1.73:
                point.y += .055 * max(0, min(1, (1.73 - point.z) / .10))
            if point.z < 1.60:
                point.z = 1.60 + (point.z - 1.60) * .5
        if point.y < -.07 and point.z > 1.73:
            point.z -= .008
    path = smooth_path(path)
    for point in path:
        if point.z > 1.65:
            nearest, normal, _, distance = head_bvh.find_nearest(point)
            signed = (point - nearest).dot(normal)
            if signed < .004:
                point += normal * (.004 - signed)
    length = len(path)
    start = len(vertices)
    width = rng.uniform(.0065, .009)
    radius = .00025 * rng.uniform(.82, 1.15)
    last_normal = None
    for i, point in enumerate(path):
        tangent = (path[min(i + 1, length - 1)] - path[max(0, i - 1)]).normalized()
        radial = (point - Vector((0, .015, 1.725))).normalized()
        if ribbon:
            normal = tangent.cross(radial).normalized()
            taper = min(1, (i + 1) / 6) * min(1, (length - i) / 10) ** .35
            vertices.extend([rig_inverse @ (point - normal * width * taper / 2), rig_inverse @ (point + normal * width * taper / 2)])
        else:
            if last_normal is None:
                reference = Vector((1, 0, 0)) if abs(tangent.x) < .8 else Vector((0, 1, 0))
                normal = tangent.cross(reference).normalized()
            else:
                normal = (last_normal - tangent * last_normal.dot(tangent)).normalized()
            bitangent = tangent.cross(normal).normalized()
            last_normal = normal
            taper = min(1, (length - i) / 5) ** .65
            for side in range(3):
                angle = side * math.tau / 3
                vertices.append(rig_inverse @ (point + radius * taper * (math.cos(angle) * normal + math.sin(angle) * bitangent)))
    for i in range(length - 1):
        if ribbon:
            a = start + i * 2
            faces.append((a, a + 1, a + 3, a + 2))
            mat_ids.append(3)
            v0, v1 = .99 - .36 * i / (length - 1), .99 - .36 * (i + 1) / (length - 1)
            face_uvs.append(((.29, v0), (.64, v0), (.64, v1), (.29, v1)))
        else:
            for side in range(3):
                a = start + i * 3 + side
                b = start + i * 3 + (side + 1) % 3
                faces.append((a, b, b + 3, a + 3))
                mat_ids.append(curve_index % 3)
                face_uvs.append(((0,0),)*4)
mesh = bpy.data.meshes.new('AuthoredCurlStrands')
mesh.from_pydata(vertices, [], faces)
for material in materials:
    mesh.materials.append(material)
for face, material_index in zip(mesh.polygons, mat_ids):
    face.use_smooth = True
    face.material_index = material_index
uv = mesh.uv_layers.new(name='UVMap')
for face, coords in zip(mesh.polygons, face_uvs):
    for loop, coord in zip(face.loop_indices, coords):
        uv.data[loop].uv = coord
mesh.update()
custom_normals = []
for face in mesh.polygons:
    for loop_index in face.loop_indices:
        vertex = mesh.vertices[mesh.loops[loop_index].vertex_index]
        if face.material_index == 3:
            direction = rig.matrix_world @ vertex.co - Vector((0, .015, 1.72))
            direction.z *= .85
            custom_normals.append((rig_inverse.to_3x3() @ direction).normalized())
        else:
            custom_normals.append(vertex.normal)
mesh.normals_split_custom_set(custom_normals)
hair = bpy.data.objects.new('LucienAuthoredCurlyHair', mesh)
bpy.context.collection.objects.link(hair)
hair.parent = rig
hair.matrix_parent_inverse = Matrix.Identity(4)
hair.matrix_basis = Matrix.Identity(4)
hair.vertex_groups.new(name='Head').add(list(range(len(vertices))), 1, 'REPLACE')
hair.modifiers.new('Head skin', 'ARMATURE').object = rig
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_animations=False,
    export_morph=True, export_morph_normal=True, export_morph_tangent=False, export_skins=True,
    export_yup=True, export_image_format='AUTO', export_extras=True)
bpy.ops.object.select_all(action='DESELECT')
hair.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = hair
hair_only_path = ASSETS / 'lucien-hair-only.glb'
bpy.ops.export_scene.gltf(filepath=str(hair_only_path), export_format='GLB', use_selection=True,
    export_animations=False, export_skins=True, export_yup=True, export_extras=True)
for export_path in [OUT, hair_only_path]:
    blob = export_path.read_bytes()
    json_length = struct.unpack_from('<I', blob, 12)[0]
    gltf = json.loads(blob[20:20 + json_length])
    for material in gltf['materials']:
        if material.get('name') == 'BystedtGroomRocketboxSilk':
            material['pbrMetallicRoughness']['baseColorFactor'] = [.16, .18, .21, 1]
            material['alphaMode'] = 'MASK'
            material['alphaCutoff'] = .045
            material['doubleSided'] = True
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    rest = blob[20 + json_length:]
    export_path.write_bytes(struct.pack('<4sII', b'glTF', 2, 20 + len(js) + len(rest)) + struct.pack('<I4s', len(js), b'JSON') + js + rest)
record = {
    'asset': OUT.name,
    'hairSource': 'https://download.blender.org/demo/geometry-nodes/hair_nodes-female_hair_styles.blend',
    'hairAuthor': 'Daniel Bystedt',
    'hairLicense': 'CC BY-SA; version unspecified in the original official page and embedded source text',
    'bodySource': 'Microsoft Rocketbox Medical_Male_02 and Business_Male_04, MIT',
    'adaptation': 'Native Long hair groom evaluated at reduced density; genuine authored curls preserved as slim tapered alpha strands using MIT Rocketbox hair atlas plus fine geometric fibers along smooth groom centerlines, rigid Head skin, black hair shading. No offline render.',
    'target': 'lucien-next-candidate.glb',
    'hairCurves': len(lengths), 'hairVertices': len(vertices), 'hairTriangles': len(faces) * 2,
    'up': '+Y', 'forward': '+Z', 'units': 'meters', 'bytes': OUT.stat().st_size,
    'status': 'front/side/back browser checked; final scene lighting review remains with root',
    'hairOnly': hair_only_path.name, 'hairOnlyBytes': hair_only_path.stat().st_size,
    'hairOnlySha256': hashlib.sha256(hair_only_path.read_bytes()).hexdigest(),
    'sourceBodySha256': hashlib.sha256(source_bytes).hexdigest(),
    'scalpRemap': 'lucien-hair-scalp-remap.json',
}
OUT.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(record, ensure_ascii=False), flush=True)
