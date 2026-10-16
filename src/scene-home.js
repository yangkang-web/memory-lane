import './scene-home.css';

export function mountSceneHome(notFound=false){
 document.title=notFound?'Scene not found · Memory Lane':'Memory Lane · Choose your world';
 document.querySelector('#app').innerHTML=`
 <header class="home-brand">MEMORY LANE<span>PLACES WORTH REMEMBERING</span></header>
 <section class="home-intro"><small>${notFound?'SCENE NOT FOUND':'A LITTLE WORLD, WAITING FOR YOU'}</small><h1>${notFound?'Let’s find your way back.':'Where shall we go?'}</h1><p>${notFound?'Choose a world to continue exploring.':'Step into a familiar place. Stay for a little story.'}</p></section>
 <nav class="home-scenes" aria-label="Choose a scene">
 <a class="home-school" href="/journey?play=1"><span class="home-campus-mark" aria-hidden="true">✦</span><div><small>WALK IT YOURSELF</small><h2>Every world, in your hands.</h2><p>亲手触碰每一件信物，<br>走进项链、血色承诺、向日葵与末世。</p><strong>亲自走一遍 ↗</strong></div></a>
 <a class="home-school" href="/journey"><span class="home-campus-mark" aria-hidden="true">◈</span><div><small>A CONTINUOUS MEMORY</small><h2>Every world, connected.</h2><p>项链 · 血色承诺 · 向日葵 · 末世<br>一段连续播放的回忆。</p><strong>观看完整旅程 ↗</strong></div></a>
 <a class="home-school" href="/school"><span class="home-campus-mark" aria-hidden="true">W</span><div><small>01 / WESTBRIDGE ACADEMY</small><h2>A place to belong.</h2><p>Sunlit classrooms, quiet courtyards<br>and a letter written just for you.</p><strong>Explore the school <span>↗</span></strong></div></a>
 <a class="home-mascot" href="/?emochi=1"><span aria-hidden="true">✺</span><div><small>THE EMOCHI STUDIO</small><h2>A little sunshine.</h2><p>Meet your round little friend.</p><strong>Meet Emochi ↗</strong></div></a>
 </nav><footer class="home-footer">EXPLORE AT YOUR OWN PACE</footer>`;
}
