import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND = os.path.join(ROOT, "blender", "assets", "tgdevs_brands_r2.blend")
OUTPUT = os.path.join(ROOT, "blender", "assets", "tgdevs-favicon-render-r2.png")


if bpy.data.filepath != BLEND:
    bpy.ops.wm.open_mainfile(filepath=BLEND)

scene = bpy.context.scene
icon_objects = [
    obj
    for obj in bpy.data.objects
    if obj.name.startswith("TGDevs favicon")
]
if not icon_objects:
    raise RuntimeError("TGDevs favicon geometry is missing from the Blender source")

for obj in bpy.data.objects:
    obj.hide_render = obj not in icon_objects and obj.type != "LIGHT"
    if obj.type == "LIGHT":
        obj.data.use_shadow = False

depsgraph = bpy.context.evaluated_depsgraph_get()
corners = []
for obj in icon_objects:
    evaluated = obj.evaluated_get(depsgraph)
    corners.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)

minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
center = (minimum + maximum) * 0.5
width = maximum.x - minimum.x
height = maximum.z - minimum.z

camera_data = bpy.data.cameras.new("TGDevs Favicon Render Camera")
camera = bpy.data.objects.new("TGDevs Favicon Render Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (center.x, minimum.y - max(width, height) * 4, center.z)
camera.rotation_euler = (math.pi / 2, 0, 0)
camera_data.type = "ORTHO"
camera_data.ortho_scale = max(width, height) * 1.13
scene.camera = camera

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = OUTPUT
scene.render.image_settings.compression = 20
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world.color = (0.003, 0.006, 0.008)
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1

bpy.ops.render.render(write_still=True)
print(f"FAVICON_RENDERED {OUTPUT} {os.path.getsize(OUTPUT)} bytes {width:.4f}x{height:.4f}")
