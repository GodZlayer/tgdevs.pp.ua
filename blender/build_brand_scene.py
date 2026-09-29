import bpy, os, re, json, math, struct
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); OUT=os.path.join(ROOT,'blender','assets'); os.makedirs(OUT,exist_ok=True)
TGDEVS_ORIGINAL=ROOT
TGDEVS_FAVICON=os.path.join(ROOT,'blender','sources','tgdevs-favicon-full-r3.png')
TGDEVS_SVG_SOURCE=os.path.join(TGDEVS_ORIGINAL,'brandSvgSource-r1.js')
TGBC_WORDMARK=os.path.join(ROOT,'blender','sources','tgbc-wordmark-dark.png')
TGBC_FAVICON=os.path.join(ROOT,'blender','sources','tgbc-favicon-r2-source.png')
TGDEVS_ARC_LAYER=os.path.join(ROOT,'blender','sources','tgdevs-favicon-arc-r3.png')
TGDEVS_GEAR_LAYER=os.path.join(ROOT,'blender','sources','tgdevs-favicon-gear-r3.png')
TGDEVS_COUNTER_LAYER=os.path.join(ROOT,'blender','sources','tgdevs-favicon-counter-r3.png')
for required in [os.path.join(TGDEVS_ORIGINAL,'brandContours-r1.js'),TGDEVS_SVG_SOURCE,TGDEVS_FAVICON,TGDEVS_ARC_LAYER,TGDEVS_GEAR_LAYER,TGDEVS_COUNTER_LAYER,TGBC_WORDMARK,TGBC_FAVICON]:
    if not os.path.isfile(required):raise FileNotFoundError(f'Canonical brand source missing: {required}')
source=open(os.path.join(TGDEVS_ORIGINAL,'brandContours-r1.js'),encoding='utf-8').read(); match=re.search(r'export const BRAND=(.*);',source)
if not match: raise RuntimeError('Canonical brand contours missing')
BRAND=json.loads(match.group(1))
svg_source=open(TGDEVS_SVG_SOURCE,encoding='utf-8').read(); svg_match=re.search(r'^export const TGDEVS_LOADER_SVG=("(?:\\.|[^"\\])*");',svg_source,re.M)
if not svg_match:raise RuntimeError('Canonical TGDevs loader SVG missing')
loader_svg=json.loads(svg_match.group(1));open(os.path.join(OUT,'tgdevs-loader-r1.svg'),'w',encoding='utf-8',newline='\n').write(loader_svg)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection': bpy.data.collections.remove(c)
root=bpy.context.scene.collection
collections={n:bpy.data.collections.new(n) for n in ['01 TGDevs • canonical vector geometry','02 TGBC • canonical vector geometry']}
for c in collections.values():root.children.link(c)

def material(name,rgb):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*rgb,1); bs.inputs['Metallic'].default_value=.28; bs.inputs['Roughness'].default_value=.22
    if 'Emission Color' in bs.inputs:
        bs.inputs['Emission Color'].default_value=(*rgb,1); bs.inputs['Emission Strength'].default_value=.16
    return m

def contour_shape(name,spec,loc,scale,collection,shape_width=1):
    curve=bpy.data.curves.new(name+' | exact sampled outline','CURVE'); curve.dimensions='2D'; curve.fill_mode='BOTH'; curve.resolution_u=2; curve.extrude=.035; curve.bevel_depth=.006; curve.bevel_resolution=3
    for path,reverse in [(spec['p'],False)]+[(hole,True) for hole in spec.get('h',[])]:
        coords=list(reversed(path)) if reverse else path
        spline=curve.splines.new('POLY'); spline.points.add(len(coords)-1); spline.use_cyclic_u=True
        for point,(x,y) in zip(spline.points,coords): point.co=((shape_width/2-x)*scale,(.5-y)*scale,0,1)
    obj=bpy.data.objects.new(name,curve); collection.objects.link(obj); obj.location=loc; obj.rotation_euler=(math.radians(90),0,0)
    c=spec['c']; obj.data.materials.append(material(name+' | source color',tuple(v/255 for v in c)))
    return obj

def wordmark_geometry(name,spec,loc,collection,width=5.3):
    # Keep each canonical glyph as editable extruded Blender vector geometry.
    scale=width/spec['ratio']
    for glyph in spec['shapes']:
        glyph_curve=bpy.data.curves.new(name+' | glyph','CURVE');glyph_curve.dimensions='2D';glyph_curve.fill_mode='BOTH';glyph_curve.resolution_u=2;glyph_curve.extrude=.035;glyph_curve.bevel_depth=.006;glyph_curve.bevel_resolution=3
        for points,reverse in [(glyph['p'],False)]+[(hole,True) for hole in glyph.get('h',[])]:
            coords=list(reversed(points)) if reverse else points
            spline=glyph_curve.splines.new('POLY');spline.points.add(len(coords)-1);spline.use_cyclic_u=True
            for point,(x,y) in zip(spline.points,coords):point.co=((x-spec['ratio']/2)*scale,(y-.5)*scale,0,1)
        obj=bpy.data.objects.new(name+' • vector glyph',glyph_curve);collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(math.radians(90),0,0)
        obj.data.materials.append(material(name+' | canonical glyph color',tuple(v/255 for v in glyph['c'])))

def official_wordmark(name,path,center,collection,width=6.35,height=1.10):
    # Exact source artwork on a physically modeled, beveled mesh face. The
    # the canonical original remains in its own project and the image is packed in GLB.
    image=bpy.data.images.load(path,check_existing=True)
    w,h=image.size
    # Keep the high resolution canonical favicon intact so its separately
    # supplied aligned layers retain identical canvas dimensions and sampling.
    if w>2048 and 'favicon' not in name.lower():image.scale(2048,round(h*2048/w));w,h=image.size
    image.pack();rgba=image.pixels[:];xmin,ymin,xmax,ymax=w,h,0,0
    for y in range(h):
        for x in range(w):
            if rgba[(y*w+x)*4+3]>.04:xmin=min(xmin,x);xmax=max(xmax,x);ymin=min(ymin,y);ymax=max(ymax,y)
    if xmax<=xmin or ymax<=ymin:raise RuntimeError('Official wordmark has no alpha silhouette')
    aspect=(xmax-xmin)/(ymax-ymin);height=width/aspect
    u0,u1=xmin/w,xmax/w;v0,v1=ymin/h,ymax/h
    mesh=bpy.data.meshes.new(name+' • dimensional image face')
    mesh.from_pydata([(-width/2,0,-height/2),(width/2,0,-height/2),(width/2,0,height/2),(-width/2,0,height/2)],[],[(0,1,2,3)])
    uv=mesh.uv_layers.new(name='Official source UV')
    for poly in mesh.polygons:
        for loop,uvxy in zip(poly.loop_indices,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]):uv.data[loop].uv=uvxy
    obj=bpy.data.objects.new(name+' • official source artwork',mesh);collection.objects.link(obj);obj.location=center
    material=bpy.data.materials.new(name+' • source color + alpha');material.use_nodes=True
    nodes=material.node_tree.nodes;bs=nodes.get('Principled BSDF');texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.interpolation='Linear'
    material.node_tree.links.new(texture.outputs['Color'],bs.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Alpha'],bs.inputs['Alpha']);bs.inputs['Roughness'].default_value=.28
    material.surface_render_method='DITHERED';obj.data.materials.append(material)
    return obj

def image_alpha_aspect(path):
    image=bpy.data.images.load(path,check_existing=True);w,h=image.size;pixels=image.pixels[:]
    xmin,ymin,xmax,ymax=w,h,-1,-1
    for y in range(h):
        row=y*w*4
        for x in range(w):
            if pixels[row+x*4+3]>.04:xmin=min(xmin,x);xmax=max(xmax,x);ymin=min(ymin,y);ymax=max(ymax,y)
    if xmax<=xmin or ymax<=ymin:raise RuntimeError(f'Brand image has no visible alpha: {path}')
    return (xmax-xmin)/(ymax-ymin)

def add_aligned_artwork_layer(full_mark,path,name,collection):
    """Reuse the complete favicon's plane and UV crop for pixel registration."""
    source=bpy.data.images.load(path,check_existing=True)
    full_source=bpy.data.images.load(TGDEVS_FAVICON,check_existing=True)
    if tuple(map(int,source.size))!=tuple(map(int,full_source.size)):
        raise RuntimeError(f'Unaligned TGDevs favicon layer dimensions: {path}')
    source.pack()
    obj=full_mark.copy();obj.data=full_mark.data.copy();collection.objects.link(obj);obj.name=name
    material=obj.data.materials[0].copy();material.name=name+' | exact aligned source texture'
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE':node.image=source
    obj.data.materials.clear();obj.data.materials.append(material)
    obj['canvas_registered']=True
    return obj

def brand_lockup(key,mark_key,word_key,center_x,z,icon_h,word_h,collection,prefix):
    mark=BRAND[mark_key]; word=BRAND[word_key]
    mark_source=TGDEVS_FAVICON if key=='tgdevs' else TGBC_FAVICON
    mark_ratio=image_alpha_aspect(mark_source)
    mark_w=icon_h*mark_ratio; word_w=6.35 if key=='tgbc' else word_h*word['ratio']; gap=.48
    total=mark_w+gap+word_w; start=center_x-total/2
    icon_x=start+mark_w/2
    # normalized vector coordinates have height 1; center mark and word vertically on same baseline
    if key=='tgdevs':
        full_mark=official_wordmark(f'{prefix} favicon • official source artwork',TGDEVS_FAVICON,(icon_x,0,z),collection,width=mark_w)
        add_aligned_artwork_layer(full_mark,TGDEVS_ARC_LAYER,'TGDevs favicon layer 01 • outer arc',collection)
        add_aligned_artwork_layer(full_mark,TGDEVS_GEAR_LAYER,'TGDevs favicon layer 02 • gear',collection)
        add_aligned_artwork_layer(full_mark,TGDEVS_COUNTER_LAYER,'TGDevs favicon layer 03 • revolution counter',collection)
    else:
        # Keep the original TGBC mark as the lockup, and its vector modules
        # as separate Blender geometry for the existing scroll-driven assembly.
        official_wordmark(f'{prefix} favicon • official source artwork',TGBC_FAVICON,(icon_x,0,z),collection,width=mark_w)
        for i,s in enumerate(mark['shapes']):
            contour_shape(f'{prefix} favicon • vector region {i+1}',s,(icon_x,0,z),icon_h,collection)
    word_center_x=start+mark_w+gap+word_w/2
    if key=='tgbc':
        # Preserve each of the eight exact TGBC vector regions as a separate
        # scroll module: outer ring, six radial sections, then central core.
        module_order={7:0,1:1,0:2,2:3,5:4,6:5,3:6,4:7}
        for i,s in enumerate(mark['shapes']):
            obj=contour_shape(f'{prefix} favicon • vector region {i+1}',s,(icon_x,0,z),icon_h,collection)
            obj['module_index']=module_order[i]
        official_wordmark(f'{prefix} logotxt',TGBC_WORDMARK,(word_center_x,0,z),collection,width=word_w,height=word_h)
    else:
        wordmark_geometry(f'{prefix} logotxt',word,(word_center_x,0,z),collection,width=word_w)
    return total

def modular_mark(collection,center_x,z,icon_h,prefix):
    """Build the six canonical TGBC ring sectors as separate Blender modules."""
    from mathutils import Vector
    angles=[math.pi/2,math.pi/6,-math.pi/6,-math.pi/2,-5*math.pi/6,5*math.pi/6]
    scl=icon_h/2.606
    def point(radius,angle):return Vector((center_x+math.cos(angle)*radius*scl,0,z+math.sin(angle)*radius*scl))
    def steel(name,rgb):
        return material(name,tuple(v/255 for v in rgb))
    def sphere(name,loc,radius,mat):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=radius*scl,location=loc)
        obj=bpy.context.object
        for old_collection in list(obj.users_collection):old_collection.objects.unlink(obj)
        collection.objects.link(obj)
        obj.name=name;obj.data.materials.append(mat);obj.modifiers.new('Polished bevel','BEVEL').width=.015*scl;obj.modifiers[-1].segments=2
        for face in obj.data.polygons:face.use_smooth=True
        return obj
    def cylinder_between(name,a,b,radius,mat):
        delta=b-a;mid=(a+b)*.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius*scl,depth=delta.length,location=mid)
        obj=bpy.context.object
        for old_collection in list(obj.users_collection):old_collection.objects.unlink(obj)
        collection.objects.link(obj)
        obj.name=name;obj.rotation_mode='QUATERNION';obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized());obj.data.materials.append(mat)
        return obj
    base=steel(prefix+' | brushed cyan titanium',[0,197,217])
    glint=steel(prefix+' | azure emissive edge',[0,163,255])
    first=sphere(f'{prefix} | node 01',point(1.145,angles[0]),.158,base);first['module_index']=0
    for idx,angle in enumerate(angles[1:],start=1):
        node=sphere(f'{prefix} | node {idx+1:02d}',point(1.145,angle),.158,base);node['module_index']=idx
    for idx,start in enumerate(angles):
        # Split the canonical inner ring into independently animated Blender meshes.
        end=start-math.tau/6;vertices=[];faces=[];steps=32;radial=8
        for j in range(steps+1):
            angle=start+(end-start)*j/steps;cx=.625*scl*math.cos(angle);cz=.625*scl*math.sin(angle)
            for k in range(radial):
                phi=math.tau*k/radial;vertices.append((cx+.043*scl*math.cos(phi)*math.cos(angle),.043*scl*math.sin(phi),cz+.043*scl*math.cos(phi)*math.sin(angle)))
        for j in range(steps):
            for k in range(radial):
                a=j*radial+k;b=j*radial+(k+1)%radial;c=(j+1)*radial+(k+1)%radial;d=(j+1)*radial+k;faces.append((a,b,c,d))
        mesh=bpy.data.meshes.new(f'{prefix} | ring segment mesh {idx+1}');mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new(f'{prefix} | ring segment {idx+1}',mesh);collection.objects.link(obj);obj.location=(center_x,0,z);obj.data.materials.append(glint);obj['module_index']=idx
    for idx,angle in enumerate(angles):
        destination=angles[(idx+1)%6]
        rad=cylinder_between(f'{prefix} | radial rail {idx+1}',point(.665,destination),point(1.005,destination),.024,glint);rad['module_index']=idx
        rad.rotation_euler.x=math.pi/2
    # The official concentric core appears after the six outer modules.
    sphere(f'{prefix} | central glass core',Vector((center_x,0,z)),.525,base)['module_index']=6
    rim_data=bpy.data.curves.new(prefix+' | inner highlight rim path','CURVE');rim_data.dimensions='3D';rim_data.resolution_u=2;rim_data.bevel_depth=.034*scl;rim_data.bevel_resolution=3
    rim=rim_data.splines.new('POLY');rim.points.add(71)
    for j,v in enumerate(rim.points):
        angle=2*math.pi*j/72;v.co=(center_x+.585*scl*math.cos(angle),-.025*scl,z+.585*scl*math.sin(angle),1)
    rim.use_cyclic_u=True;rim_obj=bpy.data.objects.new(prefix+' | inner highlight rim',rim_data);collection.objects.link(rim_obj);rim_obj.data.materials.append(glint);rim_obj['module_index']=6
    for idx,angle in enumerate(angles):
        panel_angle=angle-math.pi/6
        bpy.ops.mesh.primitive_cube_add(size=1,location=point(.865,panel_angle))
        obj=bpy.context.object
        for old_collection in list(obj.users_collection):old_collection.objects.unlink(obj)
        collection.objects.link(obj)
        obj.name=f'{prefix} | modular panel region {idx+1}';obj.rotation_euler.y=math.pi/2;obj.rotation_euler.z=panel_angle+math.pi/2
        obj.dimensions=(.64*scl,.115*scl,.30*scl);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=obj.modifiers.new('Machined rounded corners','BEVEL');bevel.width=.07*scl;bevel.segments=2;obj.modifiers.new('Face normals','WEIGHTED_NORMAL');obj.data.materials.append(base);obj['module_index']=idx
    return True

def sample_shape_points(key,count):
    """Area-weighted deterministic samples from the original vector contours."""
    shapes=BRAND[key]['shapes'];stats=[]
    for shape in shapes:
        points=shape['p'];area=sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))
        for hole in shape.get('h',[]):area-=abs(sum(hole[i][0]*hole[(i+1)%len(hole)][1]-hole[(i+1)%len(hole)][0]*hole[i][1] for i in range(len(hole))))
        stats.append((shape,max(1e-5,abs(area)*.5),min(p[0] for p in points),max(p[0] for p in points),min(p[1] for p in points),max(p[1] for p in points)))
    total=sum(s[1] for s in stats);ends=[];run=0
    for item in stats:run+=item[1]/total;ends.append(run)
    def inside(x,y,polygon):
        hit=False;j=len(polygon)-1
        for i in range(len(polygon)):
            xi,yi=polygon[i];xj,yj=polygon[j]
            if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:hit=not hit
            j=i
        return hit
    result=[]
    for i in range(count):
        state=((i+1)*2654435761)&0xffffffff
        def rand():
            nonlocal state
            state=(state*1664525+1013904223)&0xffffffff
            return state/4294967296
        pick=rand();si=next((n for n,end in enumerate(ends) if pick<=end),len(ends)-1);shape,_,min_x,max_x,min_y,max_y=stats[si]
        for _ in range(100):
            x=min_x+rand()*(max_x-min_x);y=min_y+rand()*(max_y-min_y)
            if inside(x,y,shape['p']) and not any(inside(x,y,hole) for hole in shape.get('h',[])):break
        result.append((x,y,shape['c']))
    min_x=min(v[0] for v in result);max_x=max(v[0] for v in result);min_y=min(v[1] for v in result);max_y=max(v[1] for v in result)
    center_x=(min_x+max_x)/2;center_y=(min_y+max_y)/2;span=max(max_y-min_y,1e-4)
    return [(((center_x-x)/span*2,(center_y-y)/span*2),rgb) for x,y,rgb in result],(max_x-min_x)/span

def export_vector_morph_points():
    """Bake the canonical project contours into compact browser morph samples."""
    count=7200
    for key in ['tgdevsMark','tgbcMark']:
        if key=='tgdevsMark':
            image=bpy.data.images.load(TGDEVS_FAVICON,check_existing=True);w,h=image.size;pixels=image.pixels[:]
            samples=[]
            for y in range(h):
                row=y*w*4
                for x in range(w):
                    off=row+x*4
                    if pixels[off+3]>.25:samples.append((x,y,(pixels[off],pixels[off+1],pixels[off+2])))
            if not samples:raise RuntimeError('TGDevs source favicon has no opaque samples')
            xmin=min(p[0] for p in samples);xmax=max(p[0] for p in samples);ymin=min(p[1] for p in samples);ymax=max(p[1] for p in samples);cx=(xmin+xmax)/2;cy=(ymin+ymax)/2;span=max(ymax-ymin,1)
            points=[]
            for i in range(count):
                state=((i+1)*2654435761)&0xffffffff;state=(state*1664525+1013904223)&0xffffffff;sample=samples[state%len(samples)]
                x,y,rgb=sample;points.append((((x-cx)/span*2,(cy-y)/span*2),tuple(round(v*255) for v in rgb)))
            aspect=(xmax-xmin)/span
        else:points,aspect=sample_shape_points(key,count)
        data=bytearray(struct.pack('<4sHHHf',b'TGVP',1,count,0,aspect))
        for (x,y),rgb in points:data.extend(struct.pack('<ffBBB',x,y,*rgb))
        output=os.path.join(OUT,f'{key}-points-r2.bin')
        with open(output,'wb') as stream:stream.write(data)
        print('EXPORTED CANONICAL_VECTOR_MORPH',key,len(data),'aspect',round(aspect,4))

# The site's canonical complete favicon and wordmark contours are multi-region vector shapes.
brand_lockup('tgdevs','tgdevsMark','tgdevsWord',0,2.35,2.1,1.2,collections['01 TGDevs • canonical vector geometry'],'TGDevs')
brand_lockup('tgbc','tgbcMark','tgbcWord',0,-2.35,2.1,1.2,collections['02 TGBC • canonical vector geometry'],'TGBC')

# Blender bakes point samples only for the TGDevs-to-TGBC favicon morph.
# The source timeline keeps wordmarks as 3D meshes and does not reveal them as points.
export_vector_morph_points()

# Dark studio ground and measured area-lighting for the editable asset review.
world=bpy.data.worlds.new('Midnight studio') if not bpy.data.worlds else bpy.data.worlds[0]; bpy.context.scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.004,.008,.02,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
bpy.ops.object.camera_add(location=(0,-18,0),rotation=(math.radians(90),0,0)); cam=bpy.context.object; cam.name='Canonical logo inspection camera'; cam.data.type='ORTHO'; cam.data.ortho_scale=10.4; bpy.context.scene.camera=cam
for name,loc,power,color,size in [('Key • blue softbox',(-4,-5,6),950,(.35,.65,1),6),('Fill • cyan',(5,-4,0),650,(.1,.72,1),5),('Rim • emerald',(0,2,5),850,(.08,1,.36),5)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.name=name; light.data.energy=power; light.data.color=color; light.data.shape='DISK'; light.data.size=size; light.rotation_euler=(math.radians(30),0,math.radians(15))
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1600; scene.render.resolution_y=900; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.filepath=os.path.join(OUT,'tgdevs_brands_r2_preview.png'); scene.view_settings.view_transform='AgX'
scene['purpose']='Canonical brand vector geometry reconstructed as editable Blender curves with real depth.'; scene['canonical_source']='brandContours-r1.js'; scene['included_lockups']='TGDevs mark+wordmark; TGBC mark+wordmark'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'tgdevs_brands_r2.blend'))
print('CANONICAL_VECTOR_SHAPES',sum(len(BRAND[k]['shapes']) for k in ['tgdevsMark','tgdevsWord','tgbcMark','tgbcWord']))
