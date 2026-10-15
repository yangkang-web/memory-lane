from pathlib import Path
import os,sys,json,math,hashlib
ROOT=Path(__file__).resolve().parents[1]
TOOLS=ROOT/'.local/bloodbound-tools'
HAIR=os.environ.get('LUCIEN_HAIR','short04')
BASENAME=os.environ.get('LUCIEN_OUTPUT','lucien')
assert HAIR in {'short03','short04'}
assert BASENAME in {'lucien','lucien-hair-option'}
sys.path.insert(0,str(TOOLS/'mpfb2-master/src'))
import bpy
from mathutils import Quaternion,Vector
bpy.context.preferences.use_preferences_save=False
bpy.context.preferences.addons.new().module='mpfb'
import mpfb
_original_extension_path = bpy.utils.extension_path_user
bpy.utils.extension_path_user = lambda package, path='', create=False: str(TOOLS/'mpfb-user'/path) if package == 'mpfb' else _original_extension_path(package, path=path, create=create)
(TOOLS/'mpfb-user').mkdir(exist_ok=True)
mpfb.register()
mpfb.set_preference('mpfb_user_data',str(TOOLS/'mpfb-user'))
mpfb.set_preference('mpfb_second_root',str(TOOLS/'assets'))
from mpfb.services import HumanService,TargetService,ExportService
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
macro={'age':0.53,'cupsize':0.5,'firmness':0.5,'gender':1.0,'height':0.64,'muscle':0.58,'proportions':0.66,'race':{'african':0.0,'asian':0.04,'caucasian':0.96},'weight':0.44}
body=HumanService.create_human(macro_detail_dict=macro)
body.name='Lucien_Skin'
shapes={
 'head/head-square':.10,
 'chin/chin-width-incr':.23,'chin/chin-prominent-incr':.21,'chin/chin-bones-incr':.22,'chin/chin-cleft-incr':.12,
 'cheek/l-cheek-bones-incr':.32,'cheek/r-cheek-bones-incr':.32,
 'cheek/l-cheek-volume-decr':.28,'cheek/r-cheek-volume-decr':.28,
 'nose/nose-scale-horiz-decr':.21,'nose/nose-greek-incr':.20,'nose/nose-point-width-decr':.13,'nose/nose-scale-depth-incr':.10,
 'eyebrows/eyebrows-trans-down':.17,'eyebrows/eyebrows-angle-down':.08,'eyebrows/eyebrows-trans-forward':.08,
 'eyes/l-eye-push1-in':.12,'eyes/r-eye-push1-in':.12,'eyes/l-eye-push2-in':.10,'eyes/r-eye-push2-in':.10,
 'eyes/l-eye-height1-decr':.20,'eyes/r-eye-height1-decr':.20,'eyes/l-eye-height2-decr':.08,'eyes/r-eye-height2-decr':.08,
 'mouth/mouth-upperlip-volume-decr':.10,'mouth/mouth-lowerlip-volume-decr':.06,
 'mouth/mouth-scale-horiz-incr':.07,'mouth/mouth-cupidsbow-incr':.12,'mouth/mouth-angles-up':.06,
}
for name,value in shapes.items():
 path=TOOLS/'mpfb2-master/src/mpfb/data/targets'/(name+'.target.gz')
 assert path.exists(),path
 TargetService.load_target(body,str(path),weight=value)
HumanService.set_character_skin(str(TOOLS/'assets/skins/young_caucasian_male/young_caucasian_male.mhmat'),body,skin_type='GAMEENGINE',material_instances=False)
rig=HumanService.add_builtin_rig(body,'mixamo');rig.name='Lucien_Rig'
assets=[('clothes/male_elegantsuit01/male_elegantsuit01.mhclo','Clothes','Lucien_TailoredSuit'),('clothes/shoes01/shoes01.mhclo','Clothes','Lucien_Boots'),(f'hair/{HAIR}/{HAIR}.mhclo','Hair','Lucien_Hair'),('eyebrows/eyebrow001/eyebrow001.mhclo','Eyebrows','Lucien_Brows'),('eyelashes/eyelashes01/eyelashes01.mhclo','Eyelashes','Lucien_Lashes'),('eyes/high-poly/high-poly.mhclo','Eyes','Lucien_Eyes')]
for path,typ,name in assets:
 ob=HumanService.add_mhclo_asset(str(TOOLS/'assets'/path),body,asset_type=typ,subdiv_levels=0,material_type='GAMEENGINE')
 ob.name=name
 if typ=='Eyes':
  mat=bpy.data.materials.new('Lucien grey green eyes');mat.use_nodes=True
  bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.16
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TOOLS/'assets/eyes/materials/grey_eye.png'))
  mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
  mat.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
  mat.surface_render_method='DITHERED'
  ob.data.materials.clear();ob.data.materials.append(mat)
 for poly in ob.data.polygons:poly.use_smooth=True
 print('ASSET',name,len(ob.data.vertices),flush=True)
TargetService.bake_targets(body)
import importlib.util
spec=importlib.util.spec_from_file_location('lucien_detail',str(ROOT/'scripts/bloodbound-character-detail.py'))
detail=importlib.util.module_from_spec(spec);spec.loader.exec_module(detail)
opening=detail.prepare_open_neck(body,bpy.data.objects['Lucien_TailoredSuit'])
ExportService.bake_modifiers_remove_helpers(body,bake_masks=True,bake_subdiv=False,remove_helpers=True)
# Keep character surfaces smooth without expensive offline rendering.
for ob in list(bpy.context.scene.objects):
 if ob.type!='MESH':continue
 for p in ob.data.polygons:p.use_smooth=True
 for mat in ob.data.materials:
  if not mat or not mat.use_nodes:continue
  bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if not bs:continue
  bs.inputs['Metallic'].default_value=0
  bs.inputs['Roughness'].default_value=.6 if 'Skin' in ob.name else .72
  if 'Eyes' in ob.name:bs.inputs['Roughness'].default_value=.18
  if 'Boots' in ob.name:
   for l in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(l)
   bs.inputs['Base Color'].default_value=(.018,.024,.032,1)
   bs.inputs['Roughness'].default_value=.36
  if 'Suit' in ob.name or 'Hair' in ob.name:
   tex=next((n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name),None)
   if tex:
    mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY'
    mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.7,.7,.7,1)
    mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1])
    mat.node_tree.links.new(mix.outputs['Color'],bs.inputs['Base Color'])
   bs.inputs['Roughness'].default_value=.7
  if any(k in ob.name for k in ['Hair','Brows','Lashes']):
   if 'Hair' not in ob.name:
    for l in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(l)
    bs.inputs['Base Color'].default_value=(.012,.009,.014,1)
    bs.inputs['Roughness'].default_value=.42
   tex=next((n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE'),None)
   if tex:mat.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
   mat.surface_render_method='DITHERED'
   mat.use_transparency_overlap=False
   mat.use_backface_culling=False
detail.refine(body,rig,TOOLS,opening)
# Align each limb from the actual A-pose rest direction, including the forward forearm.
from mathutils import Matrix
for side,sign in [('Left',1),('Right',-1)]:
 for part,direction in [('Arm',(sign*.16,-.02,-1.)),('ForeArm',(sign*.11,-.10,-1.))]:
  bone=rig.pose.bones['mixamorig:'+side+part]
  bpy.context.view_layer.update()
  origin=bone.head.copy()
  current=(bone.tail-bone.head).normalized()
  turn=current.rotation_difference(Vector(direction).normalized())
  bone.matrix=Matrix.Translation(origin) @ turn.to_matrix().to_4x4() @ Matrix.Translation(-origin) @ bone.matrix
  bpy.context.view_layer.update()
 for part in ['Index','Middle','Ring','Pinky']:
  for seg in [1,2,3]:
   f=rig.pose.bones.get('mixamorig:'+side+'Hand'+part+str(seg))
   if f:f.rotation_mode='XYZ';f.rotation_euler[0]=math.radians(4 if seg==1 else 8)
bpy.context.view_layer.update()
# glTF converts Z-up to Y-up; MakeHuman faces -Y, becoming +Z.
rig['asset_note']='Original Lucien interpretation based on MakeHuman CC0 human topology. Not photoreal identity reconstruction.'
# Freeze the reviewed stance into a new rest pose, keeping editable finger bones.
for ob in list(bpy.context.scene.objects):
 if ob.type!='MESH':continue
 bpy.context.view_layer.objects.active=ob
 for mod in list(ob.modifiers):
  if mod.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH':
  mod=ob.modifiers.new('Armature','ARMATURE');mod.object=rig
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=rig
output_dir=ROOT/'public/assets/bloodbound' if BASENAME=='lucien' else TOOLS/'variants'
output_dir.mkdir(parents=True,exist_ok=True)
out=output_dir/f'{BASENAME}.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(TOOLS/f'{BASENAME}.blend'))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_animation_mode='ACTIONS',export_apply=False,export_morph=False,export_materials='EXPORT',export_yup=True)
# glTF alpha masks avoid sorting artifacts on hair cards and opaque clothing.
import struct
raw=out.read_bytes();json_length=struct.unpack_from('<I',raw,12)[0]
gltf=json.loads(raw[20:20+json_length]);binary=raw[20+json_length:]
for mat in gltf.get('materials',[]):
    textured=any(part in mat.get('name','') for part in ['short03','short04','male_elegantsuit01'])
    if textured:
        pbr=mat['pbrMetallicRoughness']
        assert 'baseColorTexture' in pbr, mat['name']
        pbr['baseColorFactor']=[.7,.7,.7,1]
        pbr['roughnessFactor']=1 if 'metallicRoughnessTexture' in pbr else .7
    if 'grey green eyes' in mat.get('name',''):
        mat['pbrMetallicRoughness']['baseColorFactor']=[.68,.73,.69,1]
    card=any(part in mat.get('name','') for part in ['short03','short04','eyebrow','eyelashes','grey green eyes'])
    mat['alphaMode']='MASK' if card else 'OPAQUE'
    mat['doubleSided']=card
    if card:mat['alphaCutoff']=.25 if 'eyebrow' in mat.get('name','') else (.30 if 'short04' in mat.get('name','') else .42)
    else:mat.pop('alphaCutoff',None)
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
out.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
report={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'meshGeometryBasis':'Blender source mesh; glTF splits vertices at UV/material seams','gltfMeshCount':len(gltf['meshes']),'gltfMaterialCount':len(gltf['materials']),'embeddedResources':not any(x.get('uri') for kind in ['images','buffers'] for x in gltf.get(kind,[])),'bones':[b.name for b in rig.data.bones],'meshes':[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'materials':[m.name for m in o.data.materials]} for o in bpy.context.scene.objects if o.type=='MESH'],'animation':None,'morphTargets':[],'hairAsset':HAIR+' with geometric parted waves','characterRevision':'reference-refinement-v2','modelLimitations':['Original interpretation, not a portrait identity reconstruction','Short hair base with geometric waves; not yet the reference medium-length groom','Short tailored jacket, not the reference long coat','Static pose only; no facial rig or blink morphs'],'pose':'natural standing rest pose','forward':'+Z','up':'+Y','skinJointCount':len(gltf['skins'][0]['joints']),'animationClipCount':len(gltf.get('animations',[])),'mpfbSourceRevision':'3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf','sources':['https://github.com/makehumancommunity/mpfb2','https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html'],'license':'CC0 core MakeHuman assets; project modelling edits'}
(output_dir/f'{BASENAME}-manifest.json').write_text(json.dumps(report,indent=2))
print('DONE',out,out.stat().st_size,flush=True)
