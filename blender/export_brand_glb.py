import bpy, os
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); out=os.path.join(root,'blender','assets')
for coll in [c for c in bpy.data.collections if c.name.startswith(('01 TGDevs','02 TGBC'))]:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in coll.objects: obj.select_set(True)
    name='tgdevs' if coll.name.startswith('01') else 'tgbc'
    path=os.path.join(out,name+'_identity_r1.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    print('EXPORTED',path,os.path.getsize(path))
