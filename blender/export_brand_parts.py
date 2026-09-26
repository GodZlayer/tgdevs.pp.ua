import bpy, os
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); out=os.path.join(root,'blender','assets')
for coll in [c for c in bpy.data.collections if c.name.startswith(('01 TGDevs','02 TGBC'))]:
    brand='tgdevs' if coll.name.startswith('01') else 'tgbc'
    for kind,needle in [('favicon','favicon'),('wordmark','logotxt')]:
        bpy.ops.object.select_all(action='DESELECT')
        selected=[o for o in coll.objects if needle in o.name.lower()]
        if brand=='tgbc' and kind=='favicon':
            selected=[]
            for source in [o for o in coll.objects if 'favicon' in o.name.lower()]:
                duplicate=source.copy();duplicate.data=source.data.copy();coll.objects.link(duplicate);duplicate.name=source.name.split(' | exact sampled outline')[0]
                bpy.ops.object.select_all(action='DESELECT');duplicate.select_set(True);bpy.context.view_layer.objects.active=duplicate
                bpy.ops.object.convert(target='MESH');duplicate=bpy.context.object
                if 'module_index' in source:duplicate['module_index']=int(source['module_index'])
                else:duplicate['module_index']=-1
                selected.append(duplicate)
        if brand=='tgbc' and kind=='wordmark':selected=[o for o in coll.objects if 'logotxt' in o.name.lower()]
        if brand=='tgdevs':
            selected=[o for o in selected if o.type in {'CURVE','MESH'}]
            if kind=='favicon':selected=[o for o in selected if 'official source artwork' in o.name.lower()]
        elif not(brand=='tgbc' and kind=='favicon'):selected=[o for o in selected if o.type=='MESH']
        for obj in selected:obj.select_set(True)
        if not selected:raise RuntimeError(f'No {brand}/{kind} source objects')
        path=os.path.join(out,f'{brand}_{kind}_r2.glb')
        bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
        if brand=='tgdevs' and kind=='favicon':
            layers=[
                ('outer arc','tgdevs_favicon_arc_r3.glb'),
                ('gear','tgdevs_favicon_gear_r3.glb'),
                ('revolution counter','tgdevs_favicon_counter_r3.glb')
            ]
            for label,filename in layers:
                layer_objects=[o for o in coll.objects if o.name.lower().endswith('• '+label)]
                if len(layer_objects)!=1:raise RuntimeError(f'Expected one TGDevs {label} layer, found {len(layer_objects)}')
                bpy.ops.object.select_all(action='DESELECT')
                layer_objects[0].select_set(True);bpy.context.view_layer.objects.active=layer_objects[0]
                layer_path=os.path.join(out,filename)
                bpy.ops.export_scene.gltf(filepath=layer_path,export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
                print('EXPORTED',os.path.basename(layer_path),os.path.getsize(layer_path))
        if brand=='tgbc' and kind=='favicon':
            import json,struct
            with open(path,'rb') as stream:data=bytearray(stream.read())
            if data[:4]!=b'glTF' or struct.unpack_from('<I',data,8)[0]!=len(data):raise RuntimeError('Invalid TGBC GLB container')
            json_length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+json_length].decode('utf-8').rstrip(' \0'))
            labels={obj.name.lower().replace('tgbc | ','').replace('tgbc ','').replace(' ','_'):int(obj.get('module_index',-1)) for obj in selected}
            for node in doc.get('nodes',[]):
                raw=(node.get('name') or '').lower().replace('tg bc | ','').replace('tgbc | ','').replace(' ','_')
                module=next((value for key,value in labels.items() if key in raw or raw in key),None)
                if module is not None:node.setdefault('extras',{})['moduleIndex']=module
            encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8');encoded+=b' '*((4-len(encoded)%4)%4)
            old_binary_offset=20+json_length;binary_header=data[old_binary_offset:old_binary_offset+8];binary=data[old_binary_offset+8:]
            total=12+8+len(encoded)+len(binary_header)+len(binary);result=bytearray(b'glTF'+struct.pack('<II',2,total)+struct.pack('<I4s',len(encoded),b'JSON')+encoded+binary_header+binary)
            with open(path,'wb') as stream:stream.write(result)
            print('EMBEDDED TGBC_MODULE_INDEX',len(labels),'pieces; GLB',len(result))
        print('EXPORTED',os.path.basename(path),os.path.getsize(path))

