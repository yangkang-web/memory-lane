# Hunter step 1: Sketchfab "Old Hunter" (Blue-Spirit, CC-BY) without weapons and floor, reduced, as FBX for Mixamo auto-rigging.
# Run: Blender -b --factory-startup -P scripts/bloodbound-hunter-prep.py
from pathlib import Path
import bpy
ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT/'.local/bloodbound-tools'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=str(TOOLS/'downloads/oldhunter.glb'))
for name in ['Hunter_Pistol', 'Hunter_Claw', 'Plane']:
    root = bpy.data.objects[name]
    for o in [root, *root.children_recursive]: bpy.data.objects.remove(o, do_unlink=True)
RATIO = {'hunter Coat': .5, 'Hunter Boot': .4, 'Hunter Gloves': .6, 'Hunter Mask': .7}
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for ob in meshes:
    mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw
    ratio = next((r for k, r in RATIO.items() if ob.name.startswith(k)), None)
    if ratio:
        mod = ob.modifiers.new('Budget', 'DECIMATE'); mod.ratio = ratio
        with bpy.context.temp_override(object=ob, active_object=ob): bpy.ops.object.modifier_apply(modifier=mod.name)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_editable_objects=[ob]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.context.scene.objects if o.type == 'EMPTY']: bpy.data.objects.remove(o, do_unlink=True)
for ob in meshes: ob.name = ob.name.split('_')[0].replace(' ', '_')
print('PREP', [(o.name, len(o.data.polygons)) for o in bpy.context.scene.objects], flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(TOOLS/'hunter/hunter-prep.blend'))
bpy.ops.export_scene.fbx(filepath=str(TOOLS/'hunter/hunter-for-mixamo.fbx'), use_selection=False, object_types={'MESH'},
    path_mode='COPY', embed_textures=True, apply_scale_options='FBX_SCALE_ALL', add_leaf_bones=False)
