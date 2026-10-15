import {resolveExperience} from './routes.js';

// Load only the selected experience; the home page does not create a 3D campus.
const route=resolveExperience(location.pathname,location.search);
if(route.redirect){
 location.replace(route.redirect+location.hash);
}else if(route.experience==='journey'){
 import('./journey.js');
}else if(route.experience==='bloodbound'){
 import('./bloodbound/main.js');
}else if(route.experience==='blank'){
 import('./journey-blank.js');
}else if(route.experience==='emochi'){
 import('./emochi-studio.js');
}else if(route.experience==='apocalypse'){
 import('./map.js');
}else if(route.experience==='seaside'){
 import('./seaside.js');
}else if(route.experience==='white-room'){
 import('./white-room.js');
}else if(route.experience==='school'){
 document.title='Westbridge Academy · Interactive Campus';
 document.querySelector('meta[name="description"]').content='Explore Westbridge Academy: a walkable 3D campus with sunny classrooms and a first-person sunflower story.';
 import('./main.js');
}else{
 import('./scene-home.js').then(({mountSceneHome})=>mountSceneHome(route.experience==='not-found'));
}
