"""Convert the user-supplied Meshy FBX to a local GLB with its authored PBR maps.
Blender --background --factory-startup --disable-autoexec --python this.py -- source-dir output.glb
"""
import bpy, sys
from pathlib import Path
source, output = sys.argv[sys.argv.index('--') + 1:]
source = Path(source)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(next(source.glob('*.fbx'))))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
material = bpy.data.materials.new('User supplied collectible / authored PBR')
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
shader = nodes.get('Principled BSDF')
for suffix, socket, size in [('', 'Base Color', 2048), ('_roughness', 'Roughness', 1024), ('_metallic', 'Metallic', 1024), ('_normal', 'Normal', 2048)]:
    filename = next(p for p in source.glob('*.png') if p.stem.endswith('texture'+suffix))
    image = bpy.data.images.load(str(filename))
    if suffix: image.colorspace_settings.name = 'Non-Color'
    image.scale(size, size)
    node = nodes.new('ShaderNodeTexImage'); node.image = image
    if suffix == '_normal':
        normal = nodes.new('ShaderNodeNormalMap'); links.new(node.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs[socket])
    else: links.new(node.outputs['Color'], shader.inputs[socket])
    image.pack()
for obj in meshes:
    obj.data.materials.clear(); obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    print('SOURCE', obj.name, len(obj.data.vertices), len(obj.data.polygons), 'bounds', [(min(v.co[i] for v in obj.data.vertices),max(v.co[i] for v in obj.data.vertices)) for i in range(3)])
    # Retain silhouette and UVs; reduce excessive tessellation on a single shelf prop.
    if len(obj.data.polygons) > 80000:
        modifier = obj.modifiers.new('Shelf prop budget', 'DECIMATE'); modifier.ratio = 80000 / len(obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons: face.use_smooth = True
    print('OUTPUT', len(obj.data.vertices), len(obj.data.polygons))
Path(output).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=False, export_yup=True, export_image_format='AUTO')
