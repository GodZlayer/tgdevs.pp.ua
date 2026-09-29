"""Export the active Blender scene as one self-contained WebGPU GLB.

Run against blender/assets/tgdevs_site_experience_r1.blend after editing its
named timeline curves or modular artwork. Timeline, particle layout and logo
morph samples are packed into the GLB asset extras alongside all visible meshes.
"""
import bpy
import base64
import json
import os
import struct
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'blender', 'assets')
UNIVERSE = os.path.join(OUT, 'tgdevs_universe_r1.glb')

scene = bpy.context.scene
sys.path.insert(0, os.path.dirname(__file__))
from morph_targets import embed_targets, encode_target
control = bpy.data.objects.get('TIMELINE • Scroll-controlled scene state')
if scene.name != 'TGDevs • WebGPU Scroll Master' or control is None:
    raise RuntimeError('Open tgdevs_site_experience_r1.blend before exporting site artifacts.')
art_collection = bpy.data.collections.get('03 • Exported interactive website artwork')
if art_collection is None:
    raise RuntimeError('The Blender scene is missing its modular website artwork collection.')
particle_object = bpy.data.objects.get('WEBGPU • two-sheet particle source • 16,000 points')
if particle_object is None or particle_object.type != 'MESH':
    raise RuntimeError('The Blender scene is missing its editable particle source mesh.')
targets = {name: bpy.data.objects.get(name) for name in ('TGDEVS • particle morph target', 'TGBC • particle morph target')}
if any(target is None for target in targets.values()):
    embed_targets(OUT)
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    targets = {name: bpy.data.objects.get(name) for name in ('TGDEVS • particle morph target', 'TGBC • particle morph target')}

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
mesh = particle_object.data
attributes = {name: mesh.attributes.get(name) for name in ('wave_u', 'wave_depth', 'wave_layer', 'wave_seed')}
if any(attribute is None or len(attribute.data) != len(mesh.vertices) for attribute in attributes.values()):
    raise RuntimeError('Blender particle source attributes are incomplete or have inconsistent lengths.')
count = len(mesh.vertices)
if count > 65535:
    raise RuntimeError('The current compact particle format supports at most 65,535 points.')
particle_bytes = bytearray()
particle_bytes.extend(struct.pack('<4sHH', b'TGWF', 1, count))
for index in range(count):
    particle_bytes.extend(struct.pack('<4f', *(attributes[name].data[index].value for name in ('wave_u', 'wave_depth', 'wave_layer', 'wave_seed'))))

# Export every visible module, including the progressive arc, into one scene.
# Draco is disabled because it may reorder arc triangles and break drawRange.
bpy.ops.object.select_all(action='DESELECT')
for obj in art_collection.objects:
    if obj != particle_object:
        obj.select_set(True)
if not art_collection.objects:
    raise RuntimeError('The Blender website artwork collection is empty.')
bpy.context.view_layer.objects.active = bpy.data.objects.get('TGDEVS_MARK') or art_collection.objects[0]
bpy.ops.export_scene.gltf(filepath=UNIVERSE, export_format='GLB', use_selection=True,
                          export_apply=True, export_extras=True,
                          export_draco_mesh_compression_enable=False)

# Store nonstandard WebGPU data in glTF asset.extras. It remains part of the
# same GLB download and is ignored safely by ordinary glTF viewers.
extras = {
    'schema': 'tgdevs.webgpu.universe.v1',
    'timeline': manifest,
    'particleLayout': base64.b64encode(particle_bytes).decode('ascii'),
    'tgdevsMarkPoints': base64.b64encode(encode_target(targets['TGDEVS • particle morph target'])).decode('ascii'),
    'tgbcMarkPoints': base64.b64encode(encode_target(targets['TGBC • particle morph target'])).decode('ascii'),
}
with open(UNIVERSE, 'rb') as stream:
    source = stream.read()
if source[:4] != b'glTF' or struct.unpack_from('<I', source, 4)[0] != 2:
    raise RuntimeError('Blender did not produce a valid GLB 2.0 file.')
json_length, json_type = struct.unpack_from('<II', source, 12)
if json_type != 0x4E4F534A:
    raise RuntimeError('GLB JSON chunk is missing or malformed.')
document = json.loads(source[20:20 + json_length].decode('utf-8').rstrip(' \t\r\n\0'))
document.setdefault('asset', {}).setdefault('extras', {})['tgdevs'] = extras
json_chunk = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
json_chunk += b' ' * ((-len(json_chunk)) % 4)
rest = source[20 + json_length:]
packed = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(json_chunk) + len(rest))
packed += struct.pack('<II', len(json_chunk), 0x4E4F534A) + json_chunk + rest
with open(UNIVERSE, 'wb') as stream:
    stream.write(packed)

print('EXPORTED_SITE_UNIVERSE', UNIVERSE, os.path.getsize(UNIVERSE))
print('PACKED_TIMELINE', len(channels), 'tracks', frame_end - frame_start + 1, 'frames')
print('PACKED_PARTICLES', count, 'points and two 7,200-point logo morph targets')
