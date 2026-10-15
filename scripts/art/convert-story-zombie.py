"""Blender 4.2, --disable-autoexec --python this.py -- source.blend texture.png output.glb.
Source: Rosswet Mobile, Thin Zombie, CC BY 3.0. No embedded scripts run.
"""
import bpy, sys, math
from mathutils import Vector
source, texture, output, *options = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=source)
for obj in list(bpy.data.objects):
    if obj.type not in {'MESH','ARMATURE'}:
        bpy.data.objects.remove(obj, do_unlink=True)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.animation_data_clear()
for bone in arm.pose.bones:
    for constraint in list(bone.constraints): bone.constraints.remove(constraint)
    bone.matrix_basis.identity()
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
print('SOURCE', len(mesh.data.vertices), len(mesh.data.polygons))
for modifier in list(mesh.modifiers):
    if modifier.type != 'ARMATURE': mesh.modifiers.remove(modifier)
# Repair Blender 2.6's legacy material as an explicit local PBR material.
material = bpy.data.materials.new('Weathered infected skin')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .86
image = bpy.data.images.load(texture)
node = material.node_tree.nodes.new('ShaderNodeTexImage'); node.image = image
material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
# Very subtle relief, never a glossy plastic surface.
bump = material.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .12; bump.inputs['Distance'].default_value = .008
material.node_tree.links.new(node.outputs['Color'], bump.inputs['Height'])
material.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
mesh.data.materials.clear(); mesh.data.materials.append(material)
for face in mesh.data.polygons: face.use_smooth = True
# One subdivision removes mobile-era silhouette corners while retaining authored UVs/weights.
if '--crowd' not in options:
    sub = mesh.modifiers.new('Close-up silhouette', 'SUBSURF'); sub.levels = 1
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_move_up(modifier=sub.name)
    bpy.ops.object.modifier_apply(modifier=sub.name)
bpy.context.view_layer.update()
print('OUTPUT',len(mesh.data.vertices),len(mesh.data.polygons))
# Export rest skeleton. Runtime adapts the existing deterministic performance to these bones.
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=False, export_yup=True, export_skins=True, export_apply=False)
