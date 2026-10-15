"""Rig LokitoBlu's CC-BY-4.0 Zombie (Male 1) locally, without cloud autorigging.
Run Blender --background --factory-startup --disable-autoexec --python this.py -- source.glb output.glb
"""
import bpy, sys, math
from mathutils import Vector
source, output = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(v[i] for v in coords) for i in range(3)]);hi=Vector([max(v[i] for v in coords) for i in range(3)])
scale=1.79/(hi.z-lo.z)
for o in meshes:
    world=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
    for v in o.data.vertices:v.co=(world@v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*scale
    o.data.update()
    for p in o.data.polygons:p.use_smooth=True
    for material in o.data.materials:
        shader=material.node_tree.nodes.get('Principled BSDF')
        for key,value in [('Metallic',0),('Roughness',.87),('Specular IOR Level',.25)]:
            for link in list(shader.inputs[key].links):material.node_tree.links.remove(link)
            shader.inputs[key].default_value=value
        # Alpha testing preserves frayed cloth/hair without sorting whole bodies.
        material.surface_render_method='DITHERED' if hasattr(material,'surface_render_method') else None
        material.blend_method='CLIP';material.alpha_threshold=.45
bones=[('hips',(0,0,.94),(0,0,1.08),None),('spine',(0,0,1.08),(0,0,1.29),'hips'),('chest',(0,0,1.29),(0,0,1.46),'spine'),('neck',(0,0,1.46),(0,0,1.55),'chest'),('head',(0,0,1.55),(0,0,1.77),'neck')]
for side,sign in [('L',1),('R',-1)]:
    def p(x,y,z):return(sign*x,y,z)
    bones.extend([
        ('clavicle'+side,p(.03,0,1.46),p(.195,0,1.445),'chest'),
        ('upper_arm'+side,p(.195,0,1.445),p(.43,0,1.405),'clavicle'+side),
        ('forearm'+side,p(.43,0,1.405),p(.705,0,1.395),'upper_arm'+side),
        ('hand'+side,p(.705,0,1.395),p(.875,-.01,1.39),'forearm'+side),
        ('thigh'+side,p(.105,0,.94),p(.105,0,.51),'hips'),
        ('shin'+side,p(.105,0,.51),p(.105,0,.10),'thigh'+side),
        ('foot'+side,p(.105,0,.10),p(.105,-.13,.04),'shin'+side),
    ])
arm=bpy.data.armatures.new('Infected contact skeleton');rig=bpy.data.objects.new('Infected',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in bones:
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(a,b,v):
    u=max(0,min(1,(v-a)/(b-a)));return u*u*(3-2*u)
def pair(a,b,u):return {a:1-u,b:u}
# Region-aware smooth weights avoid transferring one sleeve to the torso or the
# other leg where layered clothing touches. UVs and authored normals are retained.
for o in meshes:
    groups={name:o.vertex_groups.new(name=name) for name,*_ in bones}
    for v in o.data.vertices:
        x,y,z=v.co;ax=abs(x);side='L' if x>=0 else 'R'
        if z>1.50 and ax<.19:w=pair('neck','head',smooth(1.48,1.58,z))
        elif z>1.25 and ax>.17:
            if ax<.26:w=pair('chest','upper_arm'+side,smooth(.17,.26,ax))
            elif ax<.51:w=pair('upper_arm'+side,'forearm'+side,smooth(.37,.49,ax))
            else:w=pair('forearm'+side,'hand'+side,smooth(.66,.74,ax))
        elif z<1.02:
            if z>.86:w=pair('thigh'+side,'hips',smooth(.86,1.02,z))
            elif z>.18:w=pair('shin'+side,'thigh'+side,smooth(.43,.59,z))
            else:w=pair('foot'+side,'shin'+side,smooth(.07,.18,z))
        elif z<1.22:w=pair('hips','spine',smooth(1.02,1.18,z))
        elif z<1.43:w=pair('spine','chest',smooth(1.22,1.38,z))
        else:w=pair('chest','neck',smooth(1.43,1.52,z))
        for name,weight in w.items():
            if weight>0:groups[name].add([v.index],weight,'REPLACE')
    modifier=o.modifiers.new('Skin','ARMATURE');modifier.object=rig;o.parent=rig
# Keep the 2K color/normal textures. Remove unsupported specular image branches.
for image in bpy.data.images:
    if image.size[0]>2048 or image.size[1]>2048:image.scale(min(2048,image.size[0]),min(2048,image.size[1]))
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_animations=False,export_skins=True,export_yup=True,export_image_format='AUTO')
print('RIGGED',len(bones),'bones',sum(len(o.data.vertices) for o in meshes),'vertices',output)
# Blender 4.2 exports the legacy clip mode as BLEND. Explicit glTF MASK keeps
# hair and torn cloth cutouts while preventing body layers drawing over clothing.
import json, struct
raw=open(output,'rb').read();length=struct.unpack_from('<I',raw,12)[0]
meta=json.loads(raw[20:20+length]);binary=raw[20+length:]
for material in meta['materials']:
    if material.get('alphaMode')=='BLEND':material['alphaMode']='MASK';material['alphaCutoff']=.4
encoded=json.dumps(meta,separators=(',',':')).encode();encoded+=b' ' *((-len(encoded))%4)
open(output,'wb').write(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
