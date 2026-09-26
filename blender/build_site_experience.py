"""Build the editable Blender master scene and its WebGPU scroll data.

Run from the site root:
  blender -b blender/assets/tgdevs_brands_r2.blend --python blender/build_site_experience.py

Blender owns the scene modules, named scroll controls, markers, and sampled
curves. The browser consumes the generated manifest and Blender-authored point
data; WebGPU/TSL remains responsible for real-time deformation and rendering.
"""
import bpy
import json
import math
import os
import re
import struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'blender', 'assets')
os.makedirs(OUT, exist_ok=True)
MASTER = os.path.join(OUT, 'tgdevs_site_experience_r1.blend')
TIMELINE = os.path.join(OUT, 'site_timeline_r1.json')
PARTICLES = os.path.join(OUT, 'site_particles_r1.bin')
ARTWORK = os.path.join(OUT, 'site_artwork_r1.glb')

if bpy.context.scene is None or not bpy.data.collections.get('01 TGDevs • canonical vector geometry'):
    raise RuntimeError('Open tgdevs_brands_r2.blend before building the site master scene.')

brand_source = os.path.join(ROOT, 'brandContours-r1.js')
with open(brand_source, encoding='utf-8') as source_file:
    brand_match = re.search(r'export const BRAND=(.*);', source_file.read())
if not brand_match:
    raise RuntimeError('Canonical Blender site geometry needs brandContours-r1.js.')
BRAND = json.loads(brand_match.group(1))

def smooth(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)

def between(value, start, end):
    return smooth((value - start) / (end - start))

def frame_values(frame):
    # Match the scroll domain of the pre-CRM site: p=0..1 maps to source 0..0.439.
    legacy = frame / 1000.0 * 0.439
    tg_build = between(legacy, .005, .13)
    word_build = between(tg_build, .48, .94)
    final_mark = between(tg_build, .90, .99)
    # The field folds into an orb while the TGDevs mark dissolves.
    # Let the sheet field gather into a full spatial sphere as the TGDevs
    # mark dissolves, then keep that sphere surrounding the transition before
    # the following scene takes over.
    orb = between(legacy, .18, .22) * (1.0 - between(legacy, .295, .33))
    breakup = between(legacy, .200, .245)
    # TGDevs dissolves into its own particle silhouette and clears. Later, a
    # TGBC particle mark and its matching solid modules build from one clock.
    # Crossfade the independent particle silhouettes while TGBC assembles.
    # Give its first modules time to appear before the TGDevs cloud clears.
    dissolve_opacity = breakup * (1.0 - between(legacy, .300, .365))
    # Let the TGDevs mark clear before the TGBC modules move into their
    # desktop lockup position. The particle transition bridges this pause.
    clock = between(legacy, .300, .420)
    expand = between(legacy, .315, .395)
    tgbc_in = between(legacy, .405, .425)
    center = between(clock, .62, .76)
    # Finish the TGBC supporting line before the end of the scroll range so
    # the final lockup holds at full opacity instead of fading in at the edge.
    target_text = between(legacy, .405, .420) * center
    slogan_out = 1.0 - between(legacy, .201, .225)
    logo_visible = 1.0 - breakup
    arc_progress = between(tg_build, 0.0, .985)
    motor1 = between(tg_build, .16, .34)
    motor2 = between(tg_build, .38, .60)
    motor3 = between(tg_build, .64, .96)
    gear_turns = .55 * motor1 + .95 * motor2 + 2.5 * motor3
    gear_alpha = max(between(tg_build, .02, .42) *
                     (1.0 - between(tg_build, .83, .98)), final_mark) * logo_visible
    counter_progress = between(tg_build, .05, .92)
    counter_alpha = max((.72 + .28 * between(tg_build, .10, .30)) *
                        between(tg_build, .0, .12) *
                        (1.0 - between(tg_build, .83, .98)), final_mark) * logo_visible
    first_alpha = clock
    values = {
        'tgdevs_build': tg_build,
        'tgdevs_word_build': word_build,
        'tgdevs_final_mark': final_mark,
        'ring_progress': arc_progress,
        'gear_turns_ccw': gear_turns,
        'gear_opacity': gear_alpha,
        'counter_progress': counter_progress,
        'counter_opacity': counter_alpha,
        'particle_orb_morph': orb,
        'particle_spread': expand,
        'particle_flow': between(legacy, .005, .34),
        # Match the original hero: the first frame is black; the field is born
        # from the scroll-driven build, not already visible at page load.
        'particle_reveal': tg_build,
        # Keep the moving particles as a transition layer, then pull them
        # away from both finished brand lockups. The field must not cut
        # through the logos while they are being read.
        'particle_opacity': max(
            .72 * orb,
            (1.0 - .52 * between(legacy, .355, .425)) *
            (1.0 - .82 * between(legacy, .125, .15)) *
            (1.0 - .55 * between(legacy, .395, .415)) *
            (1.0 - .84 * between(legacy, .295, .340)) *
            (1.0 - between(legacy, .395, .430))),
        'tgdevs_breakup': breakup,
        'tgdevs_mark_opacity': logo_visible,
        'tgdevs_dissolve_progress': breakup,
        'tgdevs_dissolve_opacity': dissolve_opacity,
        'tgbc_particle_progress': clock,
        'tgbc_particle_opacity': clock * (1.0 - between(legacy, .405, .420)),
        'tgbc_assembly': clock,
        'tgbc_first_opacity': first_alpha,
        'tgbc_full_mark_opacity': tgbc_in,
        'tgbc_center_build': center,
        'tgbc_word_opacity': target_text,
        'tgbc_lead_opacity': between(legacy, .395, .405),
        'background_opacity': between(legacy, .325, .395),
        'scroll_hint_opacity': 1.0 - between(legacy, .005, .035),
        'scene_yaw': math.sin(legacy * math.pi) * .045,
        'tgdevs_yaw': -(1.0 - between(legacy, .13, .16)) * .12,
        'tgdevs_word_opacity': word_build * (1.0 - between(legacy, .19, .255)),
        # Cycle the four phrases while the favicon itself is being assembled.
        # They occupy the same baseline, so each phrase fades out before the
        # next one comes in; the complete sequence spans the favicon growth.
        'slogan_01_opacity': min(between(legacy, .015, .025),
                                 1.0 - between(legacy, .039, .045)) * slogan_out,
        'slogan_02_opacity': min(between(legacy, .043, .053),
                                 1.0 - between(legacy, .067, .073)) * slogan_out,
        'slogan_03_opacity': min(between(legacy, .071, .081),
                                 1.0 - between(legacy, .095, .101)) * slogan_out,
        'slogan_04_opacity': min(between(legacy, .099, .109),
                                 1.0 - between(legacy, .123, .129)) * slogan_out,
    }
    module_progress = []
    for index in range(6):
        start = index * .12
        local = between(clock, start, start + .13)
        module_progress.append(local)
        values[f'tgbc_module_{index + 1}_opacity'] = local
        values[f'tgbc_module_{index + 1}_progress'] = local
    values['tgbc_module_center_opacity'] = center
    # Drive the point logo from the same staggered assembly envelopes as the
    # solid modules, without changing their original reveal timing.
    values['tgbc_particle_progress'] = sum([clock, *module_progress, center]) / 8.0
    values['tgbc_particle_opacity'] = values['tgbc_particle_progress'] * (1.0 - between(legacy, .405, .420))
    return values

# One master scene links the original, editable Blender brand collections.
scene = bpy.data.scenes.new('TGDevs • WebGPU Scroll Master')
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.frame_start = 0
scene.frame_end = 1000
scene.render.fps = 30
scene['purpose'] = 'Authoritative modular scene and scroll timeline for the WebGPU site.'
scene['scroll_domain'] = 'normalized 0..1 maps to frames 0..1000; the CRM preview is outside this scene.'
scene['runtime_contract'] = 'GLB assets + site_timeline_r1.json + site_particles_r1.bin; WebGPU/TSL renders the live scene.'
scene['particle_spread_extent'] = 1.5
scene['particle_orb_radius'] = 4.6
scene['particle_orb_opacity'] = .95

for collection_name in (
    '01 TGDevs • canonical vector geometry',
    '02 TGBC • canonical vector geometry',
):
    scene.collection.children.link(bpy.data.collections[collection_name])

def collection(name):
    result = bpy.data.collections.new(name)
    scene.collection.children.link(result)
    return result

rig = collection('00 • Camera, lights and browser framing')
controllers = collection('01 • Scroll timeline and modular controls')
particles_collection = collection('02 • WebGPU particle field source')
art_collection = collection('03 • Exported interactive website artwork')

# Camera/light rig makes the authored scene directly inspectable in Blender.
camera_data = bpy.data.cameras.new('Responsive scene camera')
camera = bpy.data.objects.new('Camera • WebGPU frame reference', camera_data)
rig.objects.link(camera)
camera.location = (0, -18, 0)
camera.rotation_euler = (math.radians(90), 0, 0)
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 10.4
scene.camera = camera
for name, location, power, color in (
    ('Key • blue softbox', (-4, -5, 6), 950, (.35, .65, 1)),
    ('Fill • cyan', (5, -4, 0), 650, (.1, .72, 1)),
    ('Rim • emerald', (0, 2, 5), 850, (.08, 1, .36)),
):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = color
    data.shape = 'DISK'
    data.size = 5
    obj = bpy.data.objects.new(name, data)
    rig.objects.link(obj)
    obj.location = location

# The website artwork is real Blender geometry, organized by runtime node name.
# The browser only selects nodes and applies sampled timeline channels to them.
def make_root(name):
    obj = bpy.data.objects.new(name, None)
    art_collection.objects.link(obj)
    obj.empty_display_type = 'PLAIN_AXES'
    return obj

def brand_material(name, rgb):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = .2
    shader.inputs['Roughness'].default_value = .28
    if 'Emission Color' in shader.inputs:
        shader.inputs['Emission Color'].default_value = (*rgb, 1)
        shader.inputs['Emission Strength'].default_value = .07
    return material

def make_contour(name, spec, root, scale, flip_y=True, center_x=.5, center_y=.5):
    data = bpy.data.curves.new(name + ' • editable Blender contour', 'CURVE')
    data.dimensions = '2D'
    data.fill_mode = 'BOTH'
    data.resolution_u = 2
    data.extrude = .035
    data.bevel_depth = .006
    data.bevel_resolution = 3
    for points, reverse in [(spec['p'], False)] + [(hole, True) for hole in spec.get('h', [])]:
        points = list(reversed(points)) if reverse else points
        spline = data.splines.new('POLY')
        spline.points.add(len(points) - 1)
        spline.use_cyclic_u = True
        for point, (x, y) in zip(spline.points, points):
            point.co = ((x - center_x) * scale, (center_y - y if flip_y else y - center_y) * scale, 0, 1)
    obj = bpy.data.objects.new(name, data)
    art_collection.objects.link(obj)
    obj.parent = root
    obj.rotation_euler.x = math.radians(90)
    obj.data.materials.append(brand_material(name + ' • source palette', tuple(v / 255 for v in spec.get('c', [0, 199, 217]))))
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.name = name
    return obj

def make_text(name, text, root, size, width, color):
    data = bpy.data.curves.new(name + ' • editable text source', 'FONT')
    data.body = text
    data.size = size
    data.extrude = .025
    data.bevel_depth = .003
    data.align_x = 'CENTER'
    obj = bpy.data.objects.new(name, data)
    art_collection.objects.link(obj)
    obj.parent = root
    obj.rotation_euler.x = math.radians(90)
    obj.data.materials.append(brand_material(name + ' • material', color))
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.name = name + '_MESH'
    bpy.context.view_layer.update()
    current_width = obj.dimensions.x
    if current_width > 0:
        obj.scale.x *= width / current_width
    return obj

def favicon_layer_material(name, image_path):
    image = bpy.data.images.load(image_path, check_existing=True)
    image.colorspace_settings.name = 'sRGB'
    image.pack()
    material = bpy.data.materials.new(name + ' • original aligned artwork')
    material.use_nodes = True
    material.use_backface_culling = False
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (1, 1, 1, 1)
    shader.inputs['Roughness'].default_value = 1
    shader.inputs['Metallic'].default_value = 0
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.interpolation = 'Linear'
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    material.node_tree.links.new(texture.outputs['Alpha'], shader.inputs['Alpha'])
    if hasattr(material, 'surface_render_method'):
        material.surface_render_method = 'DITHERED'
    return material, image

def make_favicon_layer(name, root, source_name, depth, arc_segments=0):
    image_path = os.path.join(ROOT, 'blender', 'sources', source_name)
    material, image = favicon_layer_material(name, image_path)
    width, height = image.size
    aspect = width / height
    vertices, faces, uv_coords = [], [], []
    if arc_segments:
        # The same 2×2 canvas as the supplied artwork, split into clockwise
        # sectors beginning at 7 o'clock so the original alpha image draws in
        # the exact position it occupies in the finished favicon.
        # Match the original loader SVG path (viewBox 0 0 220 220):
        # M40 173 ... 64 192. The canvas uses +Y at 12 o'clock.
        start = math.atan2(-(173 - 110), 40 - 110)
        end = math.atan2(-(192 - 110), 64 - 110)
        sweep = (start - end) % math.tau
        radius = 1.0
        for index in range(arc_segments):
            a0 = start - sweep * index / arc_segments
            a1 = start - sweep * (index + 1) / arc_segments
            base = len(vertices)
            sector = ((0.0, 0.0), (radius * math.cos(a0), radius * math.sin(a0)),
                      (radius * math.cos(a1), radius * math.sin(a1)))
            for x, y in sector:
                vertices.append((x, y, depth))
                uv_coords.append(((x / 2) + .5, (y / (2 * aspect)) + .5))
            faces.append((base, base + 2, base + 1))
    else:
        vertices = [(-1, -aspect, depth), (1, -aspect, depth),
                    (1, aspect, depth), (-1, aspect, depth)]
        uv_coords = [(0, 0), (1, 0), (1, 1), (0, 1)]
        faces = [(0, 1, 2, 3)]
    mesh = bpy.data.meshes.new(name + ' • source-canvas-aligned mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uv_coords[vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    art_collection.objects.link(obj)
    obj.parent = root
    obj.rotation_euler.x = math.radians(90)
    obj.data.materials.append(material)
    return obj

tg_mark = make_root('TGDEVS_MARK')
tg_gear = make_root('TGDEVS_GEAR')
make_favicon_layer('TGDEVS_GEAR_ART', tg_gear, 'tgdevs-favicon-part2.png', .02)
tg_arc = make_root('TGDEVS_ARC')
arc_obj = make_favicon_layer('TGDEVS_ARC_MESH', tg_arc, 'tgdevs-favicon-part1.png', .01, 180)
counter_root = make_root('TGDEVS_COUNTER')
needle = make_favicon_layer('TGDEVS_COUNTER_NEEDLE', counter_root, 'tgdevs-favicon-part3.png', .03)
hub_root = make_root('TGDEVS_COUNTER_HUB')

tg_word = make_root('TGDEVS_WORD')
for index, shape in enumerate(BRAND['tgdevsWord']['shapes']):
    make_contour(f'TGDEVS_WORD_GLYPH_{index:02d}', shape, tg_word, 5.3 / BRAND['tgdevsWord']['ratio'], flip_y=False, center_x=BRAND['tgdevsWord']['ratio'] / 2)

tgbc_first = make_root('TGBC_MODULE_0')
tgbc_modules = [make_root(f'TGBC_MODULE_{i}') for i in range(1, 7)]
tgbc_center = make_root('TGBC_MODULE_CENTER')
module_for_shape = {7: 0, 1: 1, 0: 2, 2: 3, 5: 4, 6: 5, 3: 6, 4: 7}
for index, shape in enumerate(BRAND['tgbcMark']['shapes']):
    module_index = module_for_shape[index]
    root = tgbc_first if module_index == 0 else (tgbc_center if module_index == 7 else tgbc_modules[module_index - 1])
    make_contour(f'TGBC_VECTOR_REGION_{index + 1:02d}', shape, root, 2.0)

tgbc_word = make_root('TGBC_WORD')
for index, shape in enumerate(BRAND['tgbcWord']['shapes']):
    center_x = sum(point[0] for point in shape['p']) / len(shape['p'])
    glyph = dict(shape)
    glyph['c'] = [8, 139, 255] if center_x < 1.9 else [225, 244, 250]
    make_contour(f'TGBC_WORD_GLYPH_{index:02d}', glyph, tgbc_word, 6.35 / BRAND['tgbcWord']['ratio'], flip_y=False, center_x=BRAND['tgbcWord']['ratio'] / 2)

copy_specs = (
    ('SLOGAN_01', 'Sistemas que simplificam', .34, 3.4),
    ('SLOGAN_02', 'Sofisticados', .37, 2.6),
    ('SLOGAN_03', 'Prontos para o mundo moderno', .31, 4.0),
    ('SLOGAN_04', 'Perfeito para sua empresa', .34, 3.6),
    ('TGBC_LEAD', 'Sua empresa merece :', .48, 4.1),
)
for name, text, size, width in copy_specs:
    make_text(name, text, make_root(name), size, width, (.91, .96, .98))

# Export the uncompressed, triangle-ordered arc before the compressed artwork.
# Blender's glTF exporter can change view-layer selection state after export,
# so this isolated object must be exported first.
bpy.ops.object.select_all(action='DESELECT')
for name in ('TGDEVS_ARC', 'TGDEVS_ARC_MESH'):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f'The Blender scene is missing arc object {name}.')
    obj.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects['TGDEVS_ARC']
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'site_arc_r1.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_draco_mesh_compression_enable=False)

# Export just the named, Blender-authored artwork hierarchy. The canonical
# source collections remain editable in the .blend but are not duplicated here.
bpy.ops.object.select_all(action='DESELECT')
for obj in art_collection.objects:
    if obj.name not in {'TGDEVS_ARC', 'TGDEVS_ARC_MESH'}:
        obj.select_set(True)
bpy.context.view_layer.objects.active = tg_mark
bpy.ops.export_scene.gltf(filepath=ARTWORK, export_format='GLB', use_selection=True,
                          export_apply=True, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6)

# The custom-property curves are intentionally named after visible scene
# controls. Artists can edit them in Blender's Graph Editor; the exporter
# samples those same curves for deterministic, scroll-scrubbable WebGPU playback.
control = bpy.data.objects.new('TIMELINE • Scroll-controlled scene state', None)
controllers.objects.link(control)
control.empty_display_type = 'CUBE'
control.empty_display_size = .25
control['role'] = 'Every named channel here is consumed by the WebGPU runtime.'
control['frame_to_scroll'] = 'scroll_fraction = frame / 1000'
control['source_limit'] = 'TGBC lockup ends before the CRM preview.'
channels = sorted(frame_values(0).keys())
channel_objects = {
    'tgdevs_mark_opacity': tg_mark, 'ring_progress': tg_arc,
    'gear_turns_ccw': tg_gear, 'gear_opacity': tg_gear,
    'counter_progress': counter_root, 'counter_opacity': counter_root,
    'tgdevs_word_build': tg_word, 'tgdevs_word_opacity': tg_word,
    'tgbc_first_opacity': tgbc_first, 'tgbc_module_center_opacity': tgbc_center,
    'tgbc_word_opacity': tgbc_word,
    'slogan_01_opacity': bpy.data.objects.get('SLOGAN_01'), 'slogan_02_opacity': bpy.data.objects.get('SLOGAN_02'),
    'slogan_03_opacity': bpy.data.objects.get('SLOGAN_03'), 'slogan_04_opacity': bpy.data.objects.get('SLOGAN_04'),
}
for index, module in enumerate(tgbc_modules, start=1):
    channel_objects[f'tgbc_module_{index}_opacity'] = module
    channel_objects[f'tgbc_module_{index}_progress'] = module
channel_objects['tgbc_center_build'] = tgbc_center
scene.timeline_markers.clear()
markers = [
    ('01 • TGDevs opens', 0.005),
    ('02 • TGDevs lockup settles', 0.13),
    ('03 • Brand copy sequence', 0.13),
    ('04 • Particle field folds into orb', .18),
    ('05 • TGDevs dissolves to particles', .205),
    ('06 • TGBC modular assembly', .265),
    ('07 • Gradient world resolves', .325),
    ('08 • TGBC emblem settles', .405),
    ('09 • TGBC headline and wordmark', .415),
    ('10 • Last frame before CRM', .439),
]
for label, source_position in markers:
    frame = round(source_position / .439 * 1000)
    scene.timeline_markers.new(label, frame=frame)

for frame in range(1001):
    values = frame_values(frame)
    for key, value in values.items():
        control[key] = float(value)
        control.keyframe_insert(data_path=f'["{key}"]', frame=frame, group=key)
        target = channel_objects.get(key)
        if target:
            target['timeline_channel'] = key
            target[f'animated_{key}'] = float(value)
            target.keyframe_insert(data_path=f'["animated_{key}"]', frame=frame, group=key)
scene.frame_set(0)
if control.animation_data and control.animation_data.action:
    action = control.animation_data.action
    action.name = 'Scroll Master • Blender-authored WebGPU controls'
    # Dense, linear samples reproduce the editor's exact values while still
    # allowing the original curves to be reshaped in Blender.
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                for curve in bag.fcurves:
                    for point in curve.keyframe_points:
                        point.interpolation = 'LINEAR'
    # Older Blender action API compatibility.
    for curve in getattr(action, 'fcurves', []):
        for point in curve.keyframe_points:
            point.interpolation = 'LINEAR'

tracks = {key: [] for key in channels}
for frame in range(1001):
    scene.frame_set(frame)
    for key in channels:
        tracks[key].append(round(float(control[key]), 7))
manifest = {
    'schema': 'tgdevs.webgpu.scene-timeline.v1',
    'authoring': 'Blender 5.2 • TGDevs WebGPU Scroll Master',
    'fps': scene.render.fps,
    'frameStart': 0,
    'frameEnd': 1000,
    'scroll': {'start': 0, 'end': 1, 'frameExpression': 'scroll * 1000', 'trackHeightPx': 5268},
    'settings': {'particleSpreadExtent': float(scene['particle_spread_extent']),
                 'particleOrbRadius': float(scene['particle_orb_radius']),
                 'particleOrbOpacity': float(scene['particle_orb_opacity'])},
    'tracks': tracks,
    'markers': [{'label': label, 'frame': round(position / .439 * 1000)}
                for label, position in markers],
}
with open(TIMELINE, 'w', encoding='utf-8') as stream:
    json.dump(manifest, stream, separators=(',', ':'))

# Blender-authored seeds and layout attributes for the two moving wave sheets.
def seeded(number):
    value = math.sin(number * 12.9898 + 78.233) * 43758.5453
    return value - math.floor(value)

particle_count = 16000
mesh = bpy.data.meshes.new('16k deterministic wave samples • source geometry')
mesh.from_pydata([(0, 0, 0)] * particle_count, [], [])
mesh.update()
point_obj = bpy.data.objects.new('WEBGPU • two-sheet particle source • 16,000 points', mesh)
particles_collection.objects.link(point_obj)
point_obj['runtime_renderer'] = 'Three.js WebGPU / TSL'
point_obj['editable_attributes'] = 'wave_u, wave_depth, wave_layer, wave_seed'
attributes = {}
for name in ('wave_u', 'wave_depth', 'wave_layer', 'wave_seed'):
    attributes[name] = mesh.attributes.new(name, 'FLOAT', 'POINT')
for index in range(particle_count):
    attributes['wave_u'].data[index].value = seeded(index * 2.317)
    attributes['wave_depth'].data[index].value = seeded(index * 5.731 + .31)
    attributes['wave_layer'].data[index].value = float(index % 2)
    attributes['wave_seed'].data[index].value = seeded(index * 11.17 + .7)
with open(PARTICLES, 'wb') as stream:
    stream.write(struct.pack('<4sHH', b'TGWF', 1, particle_count))
    for index in range(particle_count):
        stream.write(struct.pack('<4f',
            attributes['wave_u'].data[index].value,
            attributes['wave_depth'].data[index].value,
            attributes['wave_layer'].data[index].value,
            attributes['wave_seed'].data[index].value,
        ))

scene.frame_set(0)
bpy.context.window.scene = scene
bpy.ops.wm.save_as_mainfile(filepath=MASTER)
print('SITE_MASTER', MASTER)
print('SITE_TIMELINE', TIMELINE, 'tracks', len(tracks), 'frames', 1001)
print('SITE_PARTICLES', PARTICLES, 'points', particle_count)
