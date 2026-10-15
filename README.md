# Westbridge Academy · Interactive Campus

A locally hosted, walkable 3D school on the `school` branch; character previews are developed on `feature/character`. The campus uses an American academic architectural style: red brick, white limestone trim, slate pitched roofs, a clock-tower cupola, and a columned entrance. The active interface and all in-scene signs are in English.

Campus architecture and furniture use original procedural geometry built with Three.js. The two campus characters are the free CC0 Sakurada Fumiriya and Sendagaya Shino models by VRoid Project, bundled locally. No paid APIs or runtime asset services are needed.

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

## Campus characters

Use **Characters** in the top bar and choose **Fumiriya** or **Shino**. Both characters remain in the campus, with independent actions, chairs, and walking routes. The camera and action controls follow the selected character. Open `http://127.0.0.1:4317/?student=fumiriya` or `http://127.0.0.1:4317/?student=shino` to focus either character; the existing `?student=1` link still selects Fumiriya. Both are VRoid Project / pixiv models released under CC0. Shino is fitted to 1.65 m and retains her original long hair and school uniform. Each model loads locally with its own loading/error state and retry control.

Fumiriya wears a Natsume-inspired summer outfit: a soft white short-sleeved collared shirt with a button placket and breast pocket, plus matte charcoal twill trousers. The trousers use fine mipmapped diagonal weave, restrained fiber sheen and shallow knee/ankle normal folds; the original UV-aligned tailoring is remapped into a low-contrast neutral range to retain pockets and seams without the original navy shading dominating. The tie is hidden and the former vest artwork is replaced. The shirt retains its rigged collar, with room through the chest and waist, wider sleeve openings and a slightly longer curved hem; the garment mesh is refined with normalized skin weights, a smooth hanging torso profile, shallow asymmetric folds and a gently uneven shirt tail. A continuous seated shape raises the front tail over the thighs during sitting and rising, including interrupted transitions; its normals deform with it. Fine cotton normals, underarm compression creases and local crease occlusion preserve light-responsive fabric detail; seams and buttons follow the garment during motion. His original skeleton, facial expressions and source VRM file remain intact. The rear hair strands and scalp cap match the fringe's pale warm color in both light and shade, retaining their original strand detail and transparency. The model is fitted to 1.78 m, starts standing, and loads asynchronously with an explicit loading/error state and retry button. Its original 19.6 MB file is served locally.

**Stand**, **Walk**, **Run**, **Sit**, and **Wave** preview the humanoid in the campus. Walking and running start with locally bundled Quaternius CC0 full-body animation curves, including the legs and toes. Airborne legs retain the authored pose through the middle of each step; the step boundaries adapt to planned contacts along the curved route. Two-bone IK handles limb proportions, planted support feet and shoe clearance after sampling. Walking uses about 113 steps per minute at cruising speed, counter-swinging arms and a separate turning weight. The ankle and toe joints articulate heel strike and push-off. The head and chest anticipate the next route segment, hands stay loosely curled with slight wrist follow-through, and stopping finishes the airborne step before settling into a subtly asymmetric stance with authored idle movement. Standing starts include a brief 140 ms weight transfer before translation. Walking uses a taller supporting posture with a nearly upright chest; the source chest/neck pitch is reduced while preserving its counter-rotation. Shorter steps and lower swing clearance are paired with a proportionally lower travel speed. Walking foot tracks are narrower and scale to leg length (roughly 17–18 cm between ankle centers on Fumiriya), including the airborne leg; planted-foot turning clearance remains enforced. The hand arc is centered beside the thigh, with a softer elbow and eased direction changes; acceleration and braking add a small torso response. Stops preserve the final step's stagger instead of resetting both feet to a display pose. Finger curl and wrist follow-through vary gently with the arm swing. Acceleration, stopping and turning blend without resetting the character's facing direction. Sit approaches the entrance chair, steps back, lowers onto its seat and rests both palms on the thighs; choosing another action first completes a smooth rise. The status label reports transitions. Patrol routes use rounded inside corners with forward steering, preserving continuous walking speed instead of stopping to pivot at each waypoint. Turns preserve a minimum leg clearance, knees use a stable hinge plane, wrists have a bounded range, and departure rejoins the route in front of the chair. This combines adapted authored animation with procedural contact correction on the flat entrance path; it is not motion capture or general terrain navigation. Reduced-motion preferences hold static poses and stop locomotion, blinking and hair simulation. The camera follows the character and supports orbit and zoom. Overview or Escape returns to the campus.

`@pixiv/three-vrm` preserves the rigs, facial morphs and spring bones. All character surfaces use the same standard/physical lighting response as the campus: skin, hair and eyes receive the shared sun and sky fill, with no MToon backlight, matcap or self-emission. Clothing uses fine mipmapped weave normals, varied roughness and restrained sheen; shoes use a smoother finish. Shino retains her original color/alpha atlases, while Fumiriya’s shirt and trousers use the summer palette from `src/student-outfit.js`. Original normal maps and transparent facial detail are retained. Expanded outline passes are replaced, and alpha-to-coverage softens cutout edges in the antialiased renderer. All surfaces receive scene shadows; facial decals do not cast opaque card shadows, and the scalp cap uses an alpha-tested depth material. The shared sun uses a 4096 px shadow map with a smaller normal offset to keep shadows attached while avoiding stripes on clothing. Two small foot-following contact patches supplement the campus sun shadow and fade with foot lift; they assume the preview's flat path. The shirt combines sculpted drape with material shading, rather than a garment physics simulation. Source, embedded permissions and checksum are recorded in `ASSET-LICENSES.md`.

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
- `src/characters.js`: the two character identities, local assets, heights, chairs and routes.
- `src/main.js`: English interface, character selector and interaction flows.
- `src/style.css`: responsive interface styling.

Static geometry is normalized and merged by material to reduce draw calls. No remote assets are fetched while exploring the built campus.

Side-window classrooms use one local parallel sun with real window-frame shadows and three soft rectangular window fills. The interior classrooms retain three shared tall-window/clerestory projections. Only the occupied classroom enables its floor reflection, preventing recursive reflection passes. Furniture contact shadows and wall-edge shading remain lightweight static decals; this is not a full global-illumination simulation.

The reference refinement pass also reduces desk tops to 32 mm and chair seats to 24 mm, adds pointed hexagonal pencils, varies book and chair placement, softens regular wood grain, varies blossom clusters and distant rooflines, and gives each sheer curtain a distinct bounded wind strength. White plaster is retained. Window view uses a lower rear-of-room viewpoint for comparison with the reference image.

The character panel also provides **Give book**, a one-shot offering preview that extends the right arm, holds a small notebook on the palm, and returns to standing. It does not transfer inventory to another character. **Talk · English** plays Fumiriya’s locally generated English greeting using Kokoro’s American male Puck voice. The five VRM vowel shapes follow the audio clock and exported phoneme timings, including closed-mouth pauses. Playback stops on completion, cancellation, leaving the character preview, switching characters or hiding the page; failures show Retry voice. **Face close-up** makes articulation easier to inspect. Shino retains her **Talk (silent)** preview. Reduced-motion mode keeps the mouth closed while audio remains available. Audio generation is offline; the website serves a bundled WAV and does not call a TTS service.

## Verification

`npm run build` validates the active campus entry point. `npm test` includes tests against the shipped VRM skeleton for knee direction, foot contacts, run flight, stopping, sitting/rising, interrupted transitions and reduced motion, plus posed-mesh checks for shoe/floor and body/chair clearance, fingertip/garment intersections, leg separation and joint continuity, plus full-body loop seams, cadence, counter-swing, toe articulation, support-shoe contact, turn anticipation, idle foot stability, mid-stance support on both avatars, upright walking posture, front/back hand arcs, start anticipation and uninterrupted corner traversal; curtain stability, anchor, clearance and frame-rate checks alongside the earlier prototype's storage and literary source tests. The campus is separately checked in a browser, including independent review of desktop and narrow layouts, automatic doors and indoor walking routes.

## Original prototype and licensing

The repository's earlier Memory Lane prototype adapts Chapter VII, “A Mad Tea-Party,” from Lewis Carroll's *Alice's Adventures in Wonderland*. It is a literary adaptation, not actual user chat history. Its story, original scene, storage tests and licensed source material remain in the repository but are not loaded by the current campus entry point.

Original code is [MIT licensed](LICENSE). Retained third-party models and texts are documented in [ASSET-LICENSES.md](ASSET-LICENSES.md).

## Emochi mascot studio

Open `http://127.0.0.1:4317/?emochi=1`, or choose **Emochi** in the campus header. The studio loads independently of the campus. The original procedural mascot follows the user-supplied yellow Emochi icon: a soft round body, curved white face with a charcoal outline, dot eyes, a straight mouth, rounded mittens and stubby feet. Drag to orbit, scroll/pinch to zoom, choose Relax / Say hello / Little hop, auto-rotate, or reset the camera. Reduced-motion preferences keep mascot poses still.

A ready-to-use copy is bundled at `public/assets/characters/emochi.glb`. **↓ Model** exports a neutral-pose `emochi.glb` with separate named body, face, hand, foot and shoulder nodes and PBR materials. The downloaded model contains geometry and materials; the studio animations are procedural JavaScript, not baked animation clips or a skinned skeleton. `src/emochi.js` exports `createEmochi()` for reuse in another Three.js scene. `src/emochi-studio.js` and `src/emochi-studio.css` implement the studio. No remote assets or services are needed.

### First-person sunflower story

Open `/?story=1` or select **Always toward you → Play story** in the campus, then **Begin story**. This plays the user's fictional 60-second screenplay in Room 101 with Fumiriya as the only visible character. The English Puck voice reads his dialogue and letter; the first-person protagonist uses phone messages and subtitles. The four chapters include a pink envelope, two-sided letter, remembered sunflower message, confession, and a walk to the window painting.

**Pause/Resume**, **Replay**, the time slider, **Sound on/off**, and **Exit** are available throughout. Leaving the tab pauses playback. Voice, lip cues, props, captions, and camera all use the same audio clock. The local WAV is loaded as a Blob so seeking also works on static servers without byte-range support. No paid API, cloud service, or online speech service is required. The separate original Alice sample retains its own provenance.
