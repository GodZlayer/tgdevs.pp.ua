"""Export the active, editable Blender site scene to static browser assets.

Run against blender/assets/tgdevs_site_experience_r1.blend after editing its
named timeline curves or modular artwork.
"""
import bpy
import json
import os
import struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'blender', 'assets')
TIMELINE = os.path.join(OUT, 'site_timeline_r1.json')
PARTICLES = os.path.join(OUT, 'site_particles_r1.bin')
ARTWORK = os.path.join(OUT, 'site_artwork_r1.glb')
ARC_ARTWORK = os.path.join(OUT, 'site_arc_r1.glb')

scene = bpy.context.scene
control = bpy.data.objects.get('TIMELINE • Scroll-controlled scene state')
if scene.name != 'TGDevs • WebGPU Scroll Master' or control is None:
    raise RuntimeError('Open tgdevs_site_experience_r1.blend before exporting site artifacts.')
art_collection = bpy.data.collections.get('03 • Exported interactive website artwork')
if art_collection is None:
    raise RuntimeError('The Blender scene is missing its modular website artwork collection.')
particle_object = bpy.data.objects.get('WEBGPU • two-sheet particle source • 16,000 points')
if particle_object is None or particle_object.type != 'MESH':
    raise RuntimeError('The Blender scene is missing its editable particle source mesh.')

channels = sorted(key for key, value in control.items() if isinstance(value, (int, float)))
if not channels:
    raise RuntimeError('The Blender timeline controller has no animated numeric channels.')
frame_start, frame_end = scene.frame_start, scene.frame_end
tracks = {key: [] for key in channels}
for frame in range(frame_start, frame_end + 1):
    scene.frame_set(frame)
    for key in channels:
        tracks[key].append(round(float(control[key]), 7))
manifest = {
    'schema': 'tgdevs.webgpu.scene-timeline.v1',
    'authoring': 'Blender 5.2 • TGDevs WebGPU Scroll Master',
    'fps': scene.render.fps,
    'frameStart': frame_start,
    'frameEnd': frame_end,
    'scroll': {
        'start': 0,
        'end': 1,
        'frameExpression': f'scroll * {frame_end}',
        'trackHeightPx': int(scene.get('scroll_track_height_px', 5268)),
    },
    'settings': {'particleSpreadExtent': float(scene.get('particle_spread_extent', 1.5)),
                 'particleOrbOpacity': float(scene.get('particle_orb_opacity', .12))},
    'tracks': tracks,
    'markers': [{'label': marker.name, 'frame': marker.frame} for marker in scene.timeline_markers],
}
with open(TIMELINE, 'w', encoding='utf-8') as stream:
    json.dump(manifest, stream, separators=(',', ':'))

mesh = particle_object.data
attributes = {name: mesh.attributes.get(name) for name in ('wave_u', 'wave_depth', 'wave_layer', 'wave_seed')}
if any(attribute is None or len(attribute.data) != len(mesh.vertices) for attribute in attributes.values()):
    raise RuntimeError('Blender particle source attributes are incomplete or have inconsistent lengths.')
count = len(mesh.vertices)
if count > 65535:
    raise RuntimeError('The current compact particle format supports at most 65,535 points.')
with open(PARTICLES, 'wb') as stream:
    stream.write(struct.pack('<4sHH', b'TGWF', 1, count))
    for index in range(count):
        stream.write(struct.pack('<4f', *(attributes[name].data[index].value for name in ('wave_u', 'wave_depth', 'wave_layer', 'wave_seed'))))

bpy.ops.object.select_all(action='DESELECT')
for obj in art_collection.objects:
    if obj.name not in {'TGDEVS_ARC', 'TGDEVS_ARC_MESH'}:
        obj.select_set(True)
if not art_collection.objects:
    raise RuntimeError('The Blender website artwork collection is empty.')
bpy.context.view_layer.objects.active = art_collection.objects[0]
bpy.ops.export_scene.gltf(filepath=ARTWORK, export_format='GLB', use_selection=True,
                          export_apply=True, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6)
bpy.ops.object.select_all(action='DESELECT')
for name in ('TGDEVS_ARC', 'TGDEVS_ARC_MESH'):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f'The Blender scene is missing arc object {name}.')
    obj.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects['TGDEVS_ARC']
bpy.ops.export_scene.gltf(filepath=ARC_ARTWORK, export_format='GLB', use_selection=True,
                          export_apply=True, export_draco_mesh_compression_enable=False)
print('EXPORTED_SITE_ARTWORK', ARTWORK, os.path.getsize(ARTWORK))
print('EXPORTED_SITE_ARC', ARC_ARTWORK, os.path.getsize(ARC_ARTWORK))
print('EXPORTED_SITE_TIMELINE', TIMELINE, len(tracks), 'tracks', frame_end - frame_start + 1, 'frames')
print('EXPORTED_SITE_PARTICLES', PARTICLES, count, 'points')
