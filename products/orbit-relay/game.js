(()=>{
"use strict";
const $=id=>document.getElementById(id);
let level=1,puzzle=null,moves=0,timeLeft=90,timer=null,paused=false,hints=0,score=0;
const bestKey="orbit-relay-best-v1";
function best(){try{return Number(localStorage.getItem(bestKey)||0)}catch{return 0}}
function setBest(v){try{localStorage.setItem(bestKey,String(v))}catch{}}
function seed(){const day=new Date().toISOString().slice(0,10);return OrbitRelay.seedFromString(day+"-level-"+level+"-"+Date.now())}
function portsSVG(tile){const ports=OrbitRelay.getPorts(tile);const points=[[50,8],[92,50],[50,92],[8,50]];return ports.map(d=>'<path d="M50 50 L'+points[d][0]+' '+points[d][1]+'"/>').join("")+'<circle class="core" cx="50" cy="50" r="10"/>'}
function render(){
 const board=$("board");board.style.gridTemplateColumns="repeat("+puzzle.size+",1fr)";board.innerHTML="";
 for(let y=0;y<puzzle.size;y++)for(let x=0;x<puzzle.size;x++){
  const tile=puzzle.board[y][x],b=document.createElement("button");b.type="button";b.className="tile";
  if(!tile){b.classList.add("empty");b.disabled=true;b.setAttribute("aria-label","Empty cell");board.appendChild(b);continue}
  if(x===puzzle.source.x&&y===puzzle.source.y)b.classList.add("source");
  if(x===puzzle.target.x&&y===puzzle.target.y)b.classList.add("target");
  b.setAttribute("aria-label","Relay tile row "+(y+1)+", column "+(x+1)+", rotate clockwise");
  b.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true">'+portsSVG(tile)+'</svg>';
  b.querySelector("svg").style.transform="rotate("+(tile.rot*90)+"deg)";
  b.addEventListener("click",()=>{if(paused)return;OrbitRelay.rotateTile(puzzle,x,y);moves++;updateHUD();render();checkSolved()});
  board.appendChild(b);
 }
 $("level").textContent=level;$("moves").textContent=moves;$("time").textContent=timeLeft;$("best").textContent=best();$("pathInfo").textContent=puzzle.size+" × "+puzzle.size+" / "+puzzle.pathLength+" relays";
}
function updateHUD(){$("moves").textContent=moves;$("time").textContent=timeLeft;$("best").textContent=best()}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function startTimer(){stopTimer();timer=setInterval(()=>{if(paused)return;timeLeft--;updateHUD();if(timeLeft<=0){stopTimer();showFailure()}},1000)}
function newLevel(restart=false){
 stopTimer();paused=false;moves=0;hints=0;timeLeft=Math.max(45,90-Math.floor((level-1)/2)*5);
 const s=seed();puzzle=OrbitRelay.createPuzzle(level,s);$("board").classList.remove("solved");$("message").textContent="Find the route. Rotate each relay to connect the signal.";
 $("pauseBtn").textContent="Pause";render();startTimer();
}
function checkSolved(){
 if(!OrbitRelay.solved(puzzle))return;
 stopTimer();$("board").classList.add("solved");
 score=Math.max(100,1000+level*100+timeLeft*5-moves*10-hints*100);
 if(score>best())setBest(score);
 $("modalTitle").textContent="Signal restored!";$("modalText").textContent="The source reached the destination."; $("modalScore").textContent=score.toLocaleString()+" pts";$("modalSub").textContent="Time left: "+timeLeft+"s · Moves: "+moves+" · Hints: "+hints;
 $("modalBtn").textContent="Next level →";$("modalBtn").onclick=()=>{$("overlay").style.display="none";level++;newLevel()};$("overlay").style.display="flex";
}
function showFailure(){$("modalTitle").textContent="Signal lost";$("modalText").textContent="The network timed out. Every relay is ready for another attempt."; $("modalScore").textContent="Try again";$("modalSub").textContent="Best score: "+best().toLocaleString()+" pts";$("modalBtn").textContent="Retry level";$("modalBtn").onclick=()=>{$("overlay").style.display="none";newLevel(true)};$("overlay").style.display="flex"}
$("startBtn").onclick=()=>{$("start").style.display="none";$("game").style.display="block";level=1;newLevel()};
$("hintBtn").onclick=()=>{if(paused)return;const p=OrbitRelay.applyHint(puzzle);if(!p){$("message").textContent="No hint needed.";return}hints++;moves++;render();$("message").textContent="A relay was aligned. Hint penalty: 100 points.";checkSolved()};
$("restartBtn").onclick=()=>newLevel(true);
$("pauseBtn").onclick=()=>{if(!puzzle)return;paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause";$("message").textContent=paused?"Paused. Take your time.":"Back online. Find the route."};
})();
