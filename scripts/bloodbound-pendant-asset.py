# Builds public/assets/bloodbound/heart-pendant.glb from the user-provided Meshy AI necklace.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/bloodbound-pendant-asset.py -- <source folder>
# The source is one mesh lying flat: heart vial, neck, cap and cross bail, a wire chain and a clasp extender. The chain
# is dropped (it is laid out flat and the runtime draws one that hangs and goes round a neck, in the same wire); the
# vial and its fittings become "HeartPendant", standing up with the top of the bail at the origin and one unit tall,
# face towards glTF +z; the extender becomes "Clasp", its chain end at the origin, hanging down -y.
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix

source = sys.argv[sys.argv.index('--') + 1]
stem = os.path.join(source, 'Meshy_AI_Heart_Necklace_Pendan_1015054857_texture')
target = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'bloodbound', 'heart-pendant.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=stem + '.fbx')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# The FBX points at textures it does not ship; wire up the PBR maps that come beside it.
material = mesh.data.materials[0]
tree = material.node_tree
bsdf = next(n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED')
for node in [n for n in tree.nodes if n.type in ('TEX_IMAGE', 'NORMAL_MAP')]: tree.nodes.remove(node)
def texture(suffix, data):
    node = tree.nodes.new('ShaderNodeTexImage')
    node.image = bpy.data.images.load(stem + suffix)
    if data: node.image.colorspace_settings.name = 'Non-Color'
    return node
tree.links.new(texture('.png', False).outputs[0], bsdf.inputs['Base Color'])
tree.links.new(texture('_metallic.png', True).outputs[0], bsdf.inputs['Metallic'])
tree.links.new(texture('_roughness.png', True).outputs[0], bsdf.inputs['Roughness'])
normal = tree.nodes.new('ShaderNodeNormalMap')
tree.links.new(texture('_normal.png', True).outputs[0], normal.inputs['Color'])
tree.links.new(normal.outputs[0], bsdf.inputs['Normal'])

# Sort the loose parts: the chain spans the whole piece, the extender lies off to the right, the rest is the vial.
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.separate(type='LOOSE')
bpy.ops.object.mode_set(mode='OBJECT')
def bounds(vertices):
    return Vector([min(v.co[i] for v in vertices) for i in range(3)]), Vector([max(v.co[i] for v in vertices) for i in range(3)])
def centre(o): return sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
groups = {'chain': [], 'clasp': [], 'vial': []}
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    lo, hi = bounds(o.data.vertices)
    groups['chain' if hi.x - lo.x > 0.6 else 'clasp' if lo.x > 0.2 else 'vial'].append(o)
print('parts', {k: sum(len(o.data.vertices) for o in v) for k, v in groups.items()})
# Where the extender joins the chain (its lowest link) and where it ends (the lobster clasp, its largest part).
join = centre(min(groups['clasp'], key=lambda o: bounds(o.data.vertices)[0].y))
far = centre(max(groups['clasp'], key=lambda o: len(o.data.vertices)))
for o in groups['chain']: bpy.data.objects.remove(o)
def merge(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = objects[0].data.name = name
    return objects[0]
mesh = merge(groups['vial'], 'HeartPendant')
clasp = merge(groups['clasp'], 'Clasp')

# Stand the vial up: flat face (+z) to Blender -y, which is glTF +z; heart point (-y) down.
stand = Matrix.Rotation(math.radians(90), 4, 'X')
lo, hi = bounds(mesh.data.vertices)
top = Vector(((lo.x + hi.x) / 2, hi.y, 0))
scale = 1 / (hi.y - lo.y)
mesh.data.transform(Matrix.Scale(scale, 4) @ stand @ Matrix.Translation(-top))
# The extender: its chain end at the origin, hanging along -z (glTF -y), its flat face the same way as the vial's.
down = (far - join).normalized()
side = Vector((0, 0, 1)).cross(down).normalized()
basis = Matrix((side, -down, Vector((0, 0, 1)))).to_4x4()  # rows: source axes onto x, z-up, y
turn = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
clasp.data.transform(Matrix.Scale(scale, 4) @ turn @ basis @ Matrix.Translation(-join))
for o in (mesh, clasp): o.data.update()

bpy.ops.export_scene.gltf(filepath=os.path.abspath(target), export_format='GLB', export_image_format='JPEG',
                          export_jpeg_quality=92, export_yup=True, export_apply=True, export_animations=False,
                          export_materials='EXPORT')
print('wrote', os.path.abspath(target), os.path.getsize(target))
