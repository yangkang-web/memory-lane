import bpy
import bmesh
import importlib.util
import math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from pathlib import Path

spec = importlib.util.spec_from_file_location('candidate_builder', Path(__file__).with_name('bloodbound-character-next.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def subset(obj, material_fragment, name, inverse=False, predicate=None):
    polys = [p for p in obj.data.polygons if (material_fragment in obj.data.materials[p.material_index].name) != inverse and (predicate is None or predicate(p))]
    indices = sorted({i for p in polys for i in p.vertices})
    remap = {i: n for n, i in enumerate(indices)}
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([obj.data.vertices[i].co for i in indices], [], [[remap[i] for i in p.vertices] for p in polys])
    mesh.update()
    out = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(out)
    out.parent = obj.parent
    out.matrix_world = obj.matrix_world.copy()
    for mat in obj.data.materials:
        mesh.materials.append(mat)
    for p, old in zip(mesh.polygons, polys):
        p.material_index = old.material_index
        p.use_smooth = True
    for uv in obj.data.uv_layers:
        layer = mesh.uv_layers.new(name=uv.name)
        for p, old in zip(mesh.polygons, polys):
            for new_loop, old_loop in zip(p.loop_indices, old.loop_indices):
                layer.data[new_loop].uv = uv.data[old_loop].uv
    for group in obj.vertex_groups:
        out.vertex_groups.new(name=group.name)
    for old_index, new_index in remap.items():
        for weight in obj.data.vertices[old_index].groups:
            out.vertex_groups[weight.group].add([new_index], weight.weight, 'REPLACE')
    if obj.data.shape_keys:
        for old_key in obj.data.shape_keys.key_blocks:
            key = out.shape_key_add(name=old_key.name)
            for ni, oi in enumerate(indices):
                key.data[ni].co = old_key.data[oi].co
    for mod in obj.modifiers:
        if mod.type == 'ARMATURE':
            new_mod = out.modifiers.new(mod.name, 'ARMATURE')
            new_mod.object = mod.object
    return out


def color_factor(mat, rgb, roughness):
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    socket = bsdf.inputs['Base Color']
    socket.default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    mat['gltf_color_factor'] = list(rgb)


def retarget(obj, old_rig, rig):
    transforms = {}
    for group in obj.vertex_groups:
        old_bone, new_bone = old_rig.data.bones.get(group.name), rig.data.bones.get(group.name)
        if old_bone and new_bone:
            transforms[group.index] = rig.matrix_world @ new_bone.matrix_local @ old_bone.matrix_local.inverted() @ old_rig.matrix_world.inverted()
    old_world = obj.matrix_world.copy()
    coords = []
    for v in obj.data.vertices:
        p = old_world @ v.co
        p_new = Vector((0,0,0)); total = 0
        for g in v.groups:
            if g.group in transforms:
                p_new += (transforms[g.group] @ p) * g.weight
                total += g.weight
        coords.append(p_new/total if total else p)
    obj.parent = rig
    obj.matrix_world = Matrix.Identity(4)
    for v,p in zip(obj.data.vertices,coords):
        v.co = p
    for mod in obj.modifiers:
        if mod.type == 'ARMATURE':
            mod.object = rig


def refine(rig, meshes):
    source = meshes[0]
    head = subset(source, '_body', 'LucienFaceAndHair', inverse=True)
    bpy.data.objects.remove(source, do_unlink=True)
    # Retain the scanned face and all its expression deltas; sculpt the neutral shape consistently.
    basis = head.data.shape_keys.key_blocks[0]
    world = head.matrix_world.copy()
    inv = world.inverted()
    eye_mid = rig.matrix_world @ ((rig.data.bones['Bip01 LEye'].head_local + rig.data.bones['Bip01 REye'].head_local) * .5)
    print('EYE', list(eye_mid), 'HEAD_BOUNDS', [min((world @ v.co).z for v in head.data.vertices), max((world @ v.co).z for v in head.data.vertices)])
    head_material = next(m for m in head.data.materials if '_head' in m.name)
    edited_atlas=base.OUT/'source/lucien-head-atlas.jpg'
    if edited_atlas.exists():
        for node in head_material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and '_color' in node.image.filepath:
                node.image=bpy.data.images.load(str(edited_atlas),check_existing=True)
                node.image.pack()
    eyes_mat = head_material.copy()
    eyes_mat.name = 'LucienGrayGreenEyes'
    color_factor(eyes_mat, (.86, .88, .87), .48)
    head.data.materials.append(eyes_mat)
    eyes_index = len(head.data.materials)-1
    for poly in head.data.polygons:
        if head.data.materials[poly.material_index] != head_material:
            continue
        p = sum((world @ head.data.vertices[i].co for i in poly.vertices),Vector()) / len(poly.vertices)
        uv = sum((head.data.uv_layers.active.data[i].uv for i in poly.loop_indices),Vector((0,0))) / len(poly.loop_indices)
        if uv.y < .18 and .18 < uv.x < .36:
            poly.material_index = eyes_index
            continue
    # World x is lateral and -y is forward in these imported sources.
    for vi, vertex in enumerate(basis.data):
        p = world @ vertex.co
        z = p.z - eye_mid.z
        delta = Vector((0, 0, 0))
        if -.15 < z < -.055:
            jaw = max(0, 1-abs(z+.10)/.055)
            delta.x = p.x * .025 * jaw
            delta.z -= .006 * jaw
        if .025 < z < .10 and abs(p.x) < .09:
            delta.x -= p.x * .03 * math.sin((z-.025)/.075*math.pi)
        if delta.length:
            local_delta = inv.to_3x3() @ delta
            for key in head.data.shape_keys.key_blocks:
                key.data[vi].co += local_delta
    # Slight lid relaxation is baked into every key so all expressions remain relative.
    keys = head.data.shape_keys.key_blocks
    for name, strength in [('AK_09_EyeBlinkLeft', .10), ('AK_10_EyeBlinkRight', .10),
                           ('AK_19_EyeSquintLeft', .04), ('AK_20_EyeSquintRight', .04),
                           ('AK_44_MouthSmileLeft', .035), ('AK_45_MouthSmileRight', .018)]:
        key = keys.get(name)
        if key:
            deltas = [(p.co-b.co)*strength for p,b in zip(key.data,basis.data)]
            for other in keys:
                for p,d in zip(other.data,deltas):
                    p.co += d
    for mat in head.data.materials:
        if 'opacity' in mat.name:
            color_factor(mat, (.20, .24, .30), .78)
        elif 'head' in mat.name:
            color_factor(mat, (.96, .98, 1), .62)

    old_objects = set(bpy.data.objects)
    folder = base.SRC/'Assets/Avatars/Professions/Medical_Male_01'
    bpy.ops.import_scene.fbx(filepath=str(next((folder/'Export').glob('*facial.fbx'))), use_anim=False)
    added = [o for o in bpy.data.objects if o not in old_objects]
    old_rig = next(o for o in added if o.type == 'ARMATURE')
    old_body = next(o for o in added if o.type == 'MESH')
    base.materials(folder)
    adjacency={v.index:set() for v in old_body.data.vertices}
    for edge in old_body.data.edges:
        a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
    seen=set();badge=set()
    for i in adjacency:
        if i in seen:continue
        component={i};stack=[i];seen.add(i)
        while stack:
            for other in adjacency[stack.pop()]:
                if other not in seen:seen.add(other);component.add(other);stack.append(other)
        points=[old_body.matrix_world@old_body.data.vertices[j].co for j in component]
        if len(component)<100 and min(p.z for p in points)>1.2 and max(p.z for p in points)<1.4:
            badge.update(component)
    def keep_coat(poly):
        p=sum((old_body.matrix_world@old_body.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
        uv=sum((old_body.data.uv_layers.active.data[i].uv for i in poly.loop_indices),Vector((0,0)))/len(poly.loop_indices)
        return poly.vertices[0] not in badge
    coat = subset(old_body, '_body', 'LucienCoatAndBody', predicate=keep_coat)
    if coat.data.shape_keys:
        coat.shape_key_clear()
    retarget(coat,old_rig,rig)
    recessed=set()
    for poly in coat.data.polygons:
        for li in poly.loop_indices:
            i=coat.data.loops[li].vertex_index;p=coat.data.vertices[i].co;uv=coat.data.uv_layers.active.data[li].uv
            if .455<uv.x<.545 and .43<uv.y<.55 and abs(p.x)<.067 and p.z>1.445 and p.y<0:
                recessed.add(i)
    for i in recessed:
        coat.data.vertices[i].co.y+=.045
    # Keep hand skin untouched while giving the long coat and trousers a charcoal textile.
    original_mat = next(m for m in coat.data.materials if '_body' in m.name)
    cloth = original_mat.copy()
    cloth.name = 'LucienCharcoalCoat'
    color_factor(cloth, (.025, .032, .043), .88)
    coat.data.materials.append(cloth)
    cloth_index = len(coat.data.materials)-1
    undershirt = original_mat.copy()
    undershirt.name = 'LucienInnerShirtContinuation'
    color_factor(undershirt, (.0018, .0020, .0023), .9)
    coat.data.materials.append(undershirt)
    undershirt_index = len(coat.data.materials)-1
    skin_groups = {g.index for g in coat.vertex_groups if ' Hand' in g.name or ' Finger' in g.name}
    for p in coat.data.polygons:
        hand = sum(sum(g.weight for g in coat.data.vertices[i].groups if g.group in skin_groups) for i in p.vertices)/len(p.vertices)
        uv=sum((coat.data.uv_layers.active.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices)
        hand_skin=hand>.05 and uv.y<.145 and (uv.x<.30 or uv.x>.70)
        if not hand_skin:
            p.material_index = cloth_index
            if .473 < uv.x < .527 and .18 < uv.y < .49:
                p.material_index = undershirt_index
    for obj in added:
        bpy.data.objects.remove(obj, do_unlink=True)
    old_objects=set(bpy.data.objects)
    folder=base.SRC/'Assets/Avatars/Professions/Business_Male_04'
    bpy.ops.import_scene.fbx(filepath=str(next((folder/'Export').glob('*facial.fbx'))),use_anim=False)
    added=[o for o in bpy.data.objects if o not in old_objects]
    shirt_rig=next(o for o in added if o.type=='ARMATURE')
    shirt_src=next(o for o in added if o.type=='MESH')
    base.materials(folder)
    def keep_shirt(poly):
        p=sum((shirt_src.matrix_world@shirt_src.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
        skin='_head' in shirt_src.data.materials[poly.material_index].name
        return abs(p.x)<.16 and p.y<.025 and 1.39<p.z<1.60
    shirt=subset(shirt_src,'','LucienOpenShirt',predicate=keep_shirt)
    if shirt.data.shape_keys:
        shirt.shape_key_clear()
    retarget(shirt,shirt_rig,rig)
    bm=bmesh.new();bm.from_mesh(shirt.data)
    for co,no in [((.092,0,0),(1,0,0)),((-.092,0,0),(-1,0,0)),((0,-.02,0),(0,1,0)),((0,0,1.41),(0,0,-1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=co,plane_no=no,clear_outer=True,clear_inner=False)
    bm.to_mesh(shirt.data);bm.free()
    for vertex in shirt.data.vertices:
        if vertex.co.z<1.49:
            vertex.co.y-=.002
        if vertex.co.z>1.49:
            vertex.co.x*=.96
            vertex.co.y*=.97
    shirt.data.materials.append(head_material)
    neck_material_index=len(shirt.data.materials)-1
    for poly in shirt.data.polygons:
        if '_head' in shirt.data.materials[poly.material_index].name:
            poly.material_index=neck_material_index
            for li in poly.loop_indices:
                p=shirt.data.vertices[shirt.data.loops[li].vertex_index].co
                shirt.data.uv_layers.active.data[li].uv=(max(.35,min(.65,.5+p.x*2.6)),max(.314,min(.47,.314+(p.z-1.488)*1.9)))
    for mat in shirt.data.materials:
        if '_body' in mat.name:
            color_factor(mat,(.06,.07,.09),.9)
    for obj in added:
        bpy.data.objects.remove(obj,do_unlink=True)
    # Re-apply head controls after material loading touches only shared Principled defaults.
    for mat in head.data.materials:
        if 'opacity' in mat.name:
            color_factor(mat, (.20, .24, .30), .78)
    bv=BVHTree.FromPolygons([v.co for v in shirt.data.vertices],[list(p.vertices)for p in shirt.data.polygons])
    hit,normal,_,_=bv.ray_cast(Vector((0,-.5,1.415)),Vector((0,1,0)),1)
    extras=[]
    enamel=bpy.data.materials.new('LucienCanineEnamel');enamel.use_nodes=True
    tooth_shader=next(n for n in enamel.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    tooth_shader.inputs['Base Color'].default_value=(.68,.64,.55,1)
    tooth_shader.inputs['Roughness'].default_value=.37
    tooth_shader.inputs['Specular IOR Level'].default_value=.3
    for side in [-1,1]:
        points=[];faces=[]
        for z,width,depth,bend in [(1.614,.00145,.0011,.008),(1.610,.0014,.001,.005),(1.606,.00085,.0007,.002),(1.6025,.0001,.0001,.002)]:
            for i in range(12):
                angle=i*math.tau/12
                points.append((side*.016+math.cos(angle)*width,-.123+math.sin(angle)*depth+bend,z))
        for ring in range(3):
            for i in range(12):
                faces.append((ring*12+i,ring*12+(i+1)%12,(ring+1)*12+(i+1)%12,(ring+1)*12+i))
        faces.extend([tuple(reversed(range(12))),tuple(range(36,48))])
        data=bpy.data.meshes.new('SubtleUpperCanine');data.from_pydata(points,[],[tuple(reversed(face)) for face in faces]);data.update()
        tooth=bpy.data.objects.new('LucienUpperCanine'+('Left' if side>0 else 'Right'),data)
        bpy.context.collection.objects.link(tooth)
        tooth.parent=rig;tooth.matrix_world=Matrix.Identity(4)
        data.materials.append(enamel)
        for poly in data.polygons:poly.use_smooth=True
        neutral=tooth.shape_key_add(name='Basis')
        reveal=tooth.shape_key_add(name='AK_99_FangReveal')
        for vertex in neutral.data:
            vertex.co.z=1.614+(vertex.co.z-1.614)*.40
        tooth.vertex_groups.new(name='Bip01 Head').add(list(range(len(points))),1,'REPLACE')
        tooth.modifiers.new('Armature','ARMATURE').object=rig
        extras.append(tooth)
    if hit:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.0009,depth=.014,location=hit+Vector((0,-.002,0)),rotation=(0,math.pi/2,0))
        clasp=bpy.context.object;clasp.name='LucienSilverClasp'
        mat=bpy.data.materials.new('LucienSilver');mat.use_nodes=True
        node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        node.inputs['Base Color'].default_value=(.55,.59,.62,1);node.inputs['Metallic'].default_value=.93;node.inputs['Roughness'].default_value=.28
        clasp.data.materials.append(mat)
        world=clasp.matrix_world.copy();clasp.parent=rig;clasp.matrix_world=world
        clasp.vertex_groups.new(name='Bip01 Spine2').add(list(range(len(clasp.data.vertices))),1,'REPLACE')
        clasp.modifiers.new('Armature','ARMATURE').object=rig
        extras.append(clasp)
    bpy.context.view_layer.update()
    return [head, coat, shirt]+extras


base.convert('Professions', 'Medical_Male_02', 'lucien-next-candidate.glb', refinement=refine)

# The exporter retains a connected image but does not always serialize its color multiplier.
import json, struct
p=base.OUT/'lucien-next-candidate.glb'
b=p.read_bytes(); length=struct.unpack_from('<I',b,12)[0]
j=json.loads(b[20:20+length]); binary=b[20+length:]
for material in j['materials']:
    factor=material.get('extras',{}).get('gltf_color_factor')
    if factor:
        material.setdefault('pbrMetallicRoughness',{})['baseColorFactor']=[*factor,1]
    if 'opacity' in material['name']:
        material['alphaMode']='BLEND'; material.pop('alphaCutoff',None); material['doubleSided']=True
raw=json.dumps(j,separators=(',',':')).encode();raw+=b' ' *((4-len(raw)%4)%4)
p.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(raw)+len(binary))+struct.pack('<I4s',len(raw),b'JSON')+raw+binary)
print('REFINED',p.stat().st_size,flush=True)
import hashlib
manifest_path=p.with_suffix('.json')
manifest=json.loads(manifest_path.read_text())
manifest['morphTargets']=list(dict.fromkeys(manifest.get('morphTargets',[])))
manifest.update({
    'file':'/assets/bloodbound/characters/'+p.name,
    'status':'candidate, awaiting combined-scene art approval',
    'bytes':p.stat().st_size,
    'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
    'sourceRevision':'0943055db6ec570bcef9f2c8b41c9e5467c808f9',
    'sourceAvatars':['Medical_Male_02','Medical_Male_01','Business_Male_04'],
    'sourceNotes':'SOURCES.md',
    'textureEnhancement':{'provider':'company Kaon','model':'kaon/seedream-5-pro','file':'source/lucien-head-atlas.jpg'},
    'embeddedResources':True,
    'gltfJoints':len(j['skins'][0]['joints']),
    'gltfMeshes':len(j['meshes']),
    'gltfPrimitives':sum(len(m['primitives']) for m in j['meshes']),
    'limitations':['Stock avatar likeness; not an identity reconstruction of P1.','Original wavy hairstyle is shorter and has a higher hairline than P1.','Cinematic shoulder poses must be checked in the runtime.'],
})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
from mathutils import Quaternion
parents={child:i for i,node in enumerate(j['nodes']) for child in node.get('children',[])}
def node_world(index):
    node=j['nodes'][index]
    if 'matrix' in node:
        local=Matrix([node['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
    else:
        q=node.get('rotation',[0,0,0,1])
        local=Matrix.LocRotScale(Vector(node.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(node.get('scale',[1,1,1])))
    return node_world(parents[index])@local if index in parents else local
node_indices={node.get('name'):i for i,node in enumerate(j['nodes'])}
head_inverse=node_world(node_indices['Head']).inverted()
anchor_names=['UpperLip','LowerLip','UpperLipLeft','UpperLipRight','MouthCornerLeft','MouthCornerRight','LeftEye','RightEye','Jaw']
anchors={}
for name in anchor_names:
    point=node_world(node_indices[name]).translation
    anchors[name]={'restWorldMeters':list(point),'headLocal':list(head_inverse@point)}
mouth=(Vector(anchors['UpperLip']['restWorldMeters'])+Vector(anchors['LowerLip']['restWorldMeters']))*.5
anchors['MouthCenter']={'restWorldMeters':list(mouth),'headLocal':list(head_inverse@mouth)}
(base.OUT/'lucien-face-anchors.json').write_text(json.dumps({
    'asset':p.name,'sha256':manifest['sha256'],
    'space':'glTF +Y up / +Z forward; headLocal uses Head.localToWorld, not a meter offset',
    'runtime':'Prefer current UpperLip/LowerLip/LeftEye/RightEye world bone positions. MouthCenter is their upper/lower midpoint. Add a small forward clearance before aiming a hand.',
    'anchors':anchors,
    'fangs':{'meshes':['LucienUpperCanineLeft','LucienUpperCanineRight'],'skinBone':'Head','morph':'fangReveal','tipExtensionMeters':.003,'visiblePose':{'fangReveal':1,'jawOpen':.4,'mouthUpperUpLeft':.45,'mouthUpperUpRight':.45}}
},indent=2)+'\n')
