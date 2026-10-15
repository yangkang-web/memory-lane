export const SCHOOL_PATH='/school';
export const isAppPath=path=>['/','/index.html',SCHOOL_PATH,SCHOOL_PATH+'/'].includes(path);

export function resolveExperience(path,search=''){
 const params=new URLSearchParams(search);
 if(!isAppPath(path))return {experience:'not-found'};
 if(params.has('emochi'))return {experience:'emochi'};
 const query=params.toString();
 const schoolLink=SCHOOL_PATH+(query?'?'+query:'');
 if(path===SCHOOL_PATH+'/')return {redirect:schoolLink};
 if(path===SCHOOL_PATH)return {experience:'school'};
 // Preserve shared character/story links while moving them off the home route.
 if(params.has('story')||params.has('student'))return {redirect:schoolLink};
 return {experience:'home'};
}
