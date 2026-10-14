# Westbridge Academy · Interactive Campus

A locally hosted, walkable 3D school on the `学校` branch. The campus uses an American academic architectural style: red brick, white limestone trim, slate pitched roofs, a clock-tower cupola, and a columned entrance. The active interface and all in-scene signs are in English.

All campus models are original procedural geometry built with Three.js. No paid APIs or external asset services are needed.

## Explore

- Westbridge Hall: three exterior floors, a clock tower, a four-column portico and automatic entrance doors.
- A continuous ground-floor hallway connecting Rooms 101–104.
- Four classrooms deepened by five meters, each with 16 individual desks in four front-facing rows, a central aisle and a clear rear passage to the hallway.
- Detailed oak desktops and wooden chair seats, rounded edges, metal frames, under-desk trays, notebooks and backpacks; clean warm-white plaster walls, off-white wainscoting, noticeboards, outlets, radiators and acoustic ceilings with suspended linear lights.
- A front teaching wall and green chalkboard with English lettering, a teacher's desk, a projector and rear storage in each classroom.
- A framed reproduction of Vincent van Gogh’s *Sunflowers* (1888, National Gallery, London) hangs on each classroom’s solid side wall. The public-domain image is bundled locally; provenance is recorded in `ASSET-LICENSES.md`.
- Rear cabinets have oak panels and rounded shelf edges, a recessed plinth, framed lower doors with metal pulls and hinges, shelf supports and subject labels. Open cubbies hold titled books with separate covers and page blocks, bookends, a woven storage basket and lidded archive boxes. The doors and storage props are static visual details.
- Fine plaster pores and subtle trowel relief give white walls a clean surface texture, with minimal pigment variation and restrained wear. Classroom floors use warm mineral tiles with small aggregate, recessed 90 cm joints and varied polish; color, relief and roughness share the same physical scale.
- Aligned window openings with deep reveals, projecting sills and layered door casings; soft window light, furniture contact shading and restrained wall scuffs. Daylight and sunset adjust the indoor lighting as well as the campus.
- A bright spring palette: warm ivory plaster, honey-colored wooden furniture and pale curtains. Soft sky and floor bounce keep the room airy, with a blue sky, procedural clouds and cherry blossoms outside.
- Rooms 101 and 104 occupy the exterior wings, with three tall divided side windows, gathered sheer curtains and cherry trees outside. Rooms 102 and 103 retain two front windows and three clerestory panes. Glass highlights and diagonal window light illuminate desks, floors and teaching walls.
- Directional warm window light and cooler, restrained fill reveal the furniture and surface textures. Honey-brown wood has grain, varnish and light wear; steel frames have bent tubes, screw heads and shared baked window reflections. Curtains include a fine weave, with sash tracks, latches, sill plants and stacked books nearby.
- Cherry trees have asymmetric spreading boughs, visible tapered branches and open sky between flowering sprays. Small five-petal blossoms follow fine twigs, with soft ivory-pink petals, stamens, buds and occasional emerging leaves; curved trunks retain shallow cherry-bark relief and root flares. Window-side trees are staggered in distance and scale. Sparse petals drift and tumble outside the windows and scatter beneath each tree; reduced-motion preferences disable falling petals. Original flower-spray and petal textures are generated locally and shared across instanced meshes. The branching and canopy spacing were studied from [Will Granda’s Cherry Blossom Tree](https://www.willgranda.com/projects/XJ1gqw?album_id=6019978); no model or texture assets were imported. A distant illustrated panorama adds hills and rooflines. The teaching area includes chalk wipe marks, English notices with curled corners, loose chalk and a glass flower vase.
- Teacher laptops have individual keycaps, legends, trackpads, hinges, ports, webcams and readable English lesson screens. Books have titled covers and spines, layered page edges, bookmarks and curved open pages. Teacher pedestals have separate drawer fronts and pulls, with a partly open stationery drawer; student book trays have rolled lips, rivets and stored folders. These small props are modeled details, not interactive computer or drawer controls.
- Sheer curtains have heavier sewn edges and curved ties. A small fixed-step cloth simulation applies gravity, damped wind and stretch/bend constraints while pinning the top edge and tie. Motion runs only in the occupied exterior classroom; reduced-motion preferences keep a static drape. Sill clearance uses bounded displacement rather than full scene or cloth self-collision.
- Oak Library, the dining hall, the quad, picnic tables and planted walks.
- A running track, soccer pitch, basketball court and bleachers.
- Daylight and sunset lighting, an orbit camera and first-person walking.

## Run locally

Use Node.js 22.12+ (Node.js 24 recommended) and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4317/ . The server listens only on the local machine.

For the built version:

```sh
npm run build
npm start
```

## Campus student

Use **Meet student** in the top bar, or open `http://127.0.0.1:4317/?student=1`, to inspect Alex, an original procedural student with a green uniform and a backpack. **Stand**, **Walk**, and **Wave** switch between a resting pose, a short looping walk on the entrance path, and a greeting. The inspection camera follows the student and supports orbit and zoom. Overview or Escape returns to the campus.

`src/student.js` attaches rigid mesh parts to a named bone hierarchy and animates shoulder, elbow, hip, knee, and ankle rotations locally. This is a simple articulated character, without smooth skin deformation, imported motion clips, or cloth physics. Its fixed path does not provide general navigation or dynamic collision avoidance. Reduced-motion preferences start the character standing; explicit action buttons can start motion. No external assets or services are used.

## Controls

- Overview: drag to orbit, scroll to zoom, right-drag to pan.
- Destination buttons focus on the hall, library, athletics field or quad.
- Main gate, Main hallway and Room 101 enter their corresponding walking viewpoints. Window view opens a lower classroom viewpoint, with a narrower lens on desktop; movement and dragging remain available.
- Walking: WASD or arrow keys to move; drag to look. Touchscreens also have directional buttons.
- Doors open on approach and close when you move away.
- Escape, Overview or Reset returns to the initial campus view.
- Labels toggles overview markers; walking hides these markers automatically.
- Daylight / Sunset changes the lighting.

The outdoor campus, hallway and four ground-floor classrooms are connected. Upper floors are exterior models only. Walls, doors and furniture have collision boundaries.

## Source files

- `src/school.js`: campus geometry, camera, lighting, movement and collision checks.
- `src/campus-architecture.js`: pitched roofs, cupola, brick piers, stone trim, portico and entrance gate.
- `src/school-interior.js`: ground-floor shell, doors and interior destinations.
- `src/classroom.js`: classroom row layout, detailed furniture, wall finishes and teaching equipment.
- `src/classroom-props.js`: shared laptop, book, drawer and book-tray geometry and original English textures.
- `src/classroom-cabinet.js`: detailed rear storage cabinets, hardware, books, boxes and shared label/fabric textures.
- `src/classroom-floor.js`: shared procedural mineral-tile color, relief and roughness maps.
- `src/classroom-wood.js`: oak grain, varnish wear and roughness textures.
- `src/classroom-reflections.js`: a small original room baked once for window-shaped environment highlights on wood, steel and glass.
- `src/classroom-floor-reflection.js`: one live 512 × 512 reflection for the occupied classroom, softly blurred and blended with the mineral floor.
- `src/chalk-writing.js`: original single-stroke English lettering without reliance on installed fonts.
- `src/wall-materials.js`: seamless plaster and painted wall textures with color, bump and roughness maps, projected at a consistent physical scale.
- `src/classroom-surface-detail.js`: shared contact-shadow, corner-shading and localized wear decals.
- `src/spring-window-details.js`: pleated curtains, window accessories and window-side cherry trees.
- `src/cherry-blossoms.js`: shared blossom/petal textures, curved cherry branches, buds, fallen petals and nearby falling-petal animation.
- `src/curtain-physics.js`: fixed-step curtain motion, anchored hooks/ties and bounded sill clearance.
- `src/spring-sky.js`: shared procedural daylight and sunset sky panoramas.
- `src/main.js`: English interface and interaction flows.
- `src/style.css`: responsive interface styling.

Static geometry is normalized and merged by material to reduce draw calls. No remote assets are fetched while exploring the built campus.

Side-window classrooms use one local parallel sun with real window-frame shadows and three soft rectangular window fills. The interior classrooms retain three shared tall-window/clerestory projections. Only the occupied classroom enables its floor reflection, preventing recursive reflection passes. Furniture contact shadows and wall-edge shading remain lightweight static decals; this is not a full global-illumination simulation.

The reference refinement pass also reduces desk tops to 32 mm and chair seats to 24 mm, adds pointed hexagonal pencils, varies book and chair placement, softens regular wood grain, varies blossom clusters and distant rooflines, and gives each sheer curtain a distinct bounded wind strength. White plaster is retained. Window view uses a lower rear-of-room viewpoint for comparison with the reference image.

## Verification

`npm run build` validates the active campus entry point. `npm test` includes curtain stability, anchor, clearance and frame-rate checks alongside the earlier prototype's storage and literary source tests. The campus is separately checked in a browser, including independent review of desktop and narrow layouts, automatic doors and indoor walking routes.

## Original prototype and licensing

The repository's earlier Memory Lane prototype adapts Chapter VII, “A Mad Tea-Party,” from Lewis Carroll's *Alice's Adventures in Wonderland*. It is a literary adaptation, not actual user chat history. Its story, original scene, storage tests and licensed source material remain in the repository but are not loaded by the current campus entry point.

Original code is [MIT licensed](LICENSE). Retained third-party models and texts are documented in [ASSET-LICENSES.md](ASSET-LICENSES.md).
