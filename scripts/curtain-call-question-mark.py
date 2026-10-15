# Exports the chrome question mark from the user-supplied Emochi model as a standalone prop.
#   /Applications/Blender.app/Contents/MacOS/Blender -b <white-character.blend> --python scripts/curtain-call-question-mark.py
# The hook (a curve), its two rounded tips and the dot are joined into one mesh, centred on its bounds and scaled to
# one unit tall. glTF is +y up with the face towards +z, as in the reference camera.
import bpy, os
from mathutils import Vector

target = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'curtain-call', 'question-mark.glb')
parts = [o for o in bpy.data.objects if o.name.startswith('Question mark')]
for other in [o for o in bpy.data.objects if o not in parts]: bpy.data.objects.remove(other)
bpy.ops.object.select_all(action='DESELECT')
for part in parts: part.select_set(True)
bpy.context.view_layer.objects.active = next(p for p in parts if p.type == 'CURVE')
bpy.ops.object.convert(target='MESH')
bpy.ops.object.join()
mark = bpy.context.view_layer.objects.active
mark.name = 'QuestionMark'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
corners = [mark.matrix_world @ Vector(c) for c in mark.bound_box]
low = Vector(map(min, *corners)); high = Vector(map(max, *corners))
centre = (low + high) / 2
for v in mark.data.vertices: v.co = (v.co - centre) / (high.z - low.z)
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=target, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('EXPORTED', target, len(mark.data.vertices), 'verts', tuple(round(x, 3) for x in (high - low)))
