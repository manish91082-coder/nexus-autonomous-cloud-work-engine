(function(root){
"use strict";
const DIRS=[{x:0,y:-1,n:"N"},{x:1,y:0,n:"E"},{x:0,y:1,n:"S"},{x:-1,y:0,n:"W"}];
function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seedFromString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function shuffled(a,rng){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function pathSearch(size,minLength,rng){
 const startRow=Math.floor(rng()*size),path=[{x:0,y:startRow}],seen=new Set([startRow*size]);
 let budget=18000;
 function dfs(x,y){
  if(--budget<0)return false;
  if(x===size-1&&path.length>=minLength)return true;
  const options=shuffled(DIRS,rng).map(d=>({x:x+d.x,y:y+d.y}));
  for(const p of options){
   if(p.x<0||p.y<0||p.x>=size||p.y>=size)continue;
   const k=p.y*size+p.x;if(seen.has(k))continue;
   if(p.x===size-1&&path.length+1<minLength)continue;
   seen.add(k);path.push(p);
   if(dfs(p.x,p.y))return true;
   path.pop();seen.delete(k);
  }
  return false;
 }
 return dfs(0,startRow)?path:null;
}
function fallbackPath(size){
 const path=[];for(let x=0;x<size;x++)path.push({x,y:0});
 for(let y=1;y<size;y++)path.push({x:size-1,y});
 return path;
}
function dirsBetween(a,b){
 if(b.x===a.x&&b.y===a.y-1)return 0;
 if(b.x===a.x+1&&b.y===a.y)return 1;
 if(b.x===a.x&&b.y===a.y+1)return 2;
 if(b.x===a.x-1&&b.y===a.y)return 3;
 throw new Error("Path contains non-adjacent cells.");
}
function mod4(n){return((n%4)+4)%4;}
function basePorts(type){if(type==="end")return[0];if(type==="straight")return[0,2];if(type==="corner")return[0,1];return[];}
function getPorts(tile){return basePorts(tile.type).map(d=>mod4(d+tile.rot));}
function findRotation(type,wanted){
 const target=wanted.slice().sort().join(",");
 for(let r=0;r<4;r++)if(basePorts(type).map(d=>mod4(d+r)).sort().join(",")===target)return r;
 throw new Error("No tile rotation matches the required connections.");
}
function isConnected(board,source,target){
 const size=board.length,queue=[source],seen=new Set([source.y*size+source.x]);
 while(queue.length){
  const p=queue.shift();
  if(p.x===target.x&&p.y===target.y)return true;
  const tile=board[p.y][p.x];if(!tile)continue;
  for(const d of getPorts(tile)){
   const v=DIRS[d],nx=p.x+v.x,ny=p.y+v.y;
   if(nx<0||ny<0||nx>=size||ny>=size)continue;
   const next=board[ny][nx];if(!next)continue;
   if(!getPorts(next).includes(mod4(d+2)))continue;
   const k=ny*size+nx;if(!seen.has(k)){seen.add(k);queue.push({x:nx,y:ny});}
  }
 }
 return false;
}
function createPuzzle(level=1,seed=1){
 const n=Math.min(7,5+Math.floor((level-1)/3));
 const minLength=Math.min(n*n,n+3+Math.floor(level/2));
 const rng=mulberry32(seed>>>0);
 const path=pathSearch(n,minLength,rng)||fallbackPath(n);
 const board=Array.from({length:n},()=>Array(n).fill(null));
 const targets=[];
 for(let i=0;i<path.length;i++){
  const p=path[i],wanted=[];
  if(i>0)wanted.push(dirsBetween(p,path[i-1]));
  if(i<path.length-1)wanted.push(dirsBetween(p,path[i+1]));
  const type=wanted.length===1?"end":(mod4(wanted[0]-wanted[1])===2||mod4(wanted[1]-wanted[0])===2?"straight":"corner");
  const targetRot=findRotation(type,wanted);
  targets.push({x:p.x,y:p.y,type,targetRot});
 }
 for(let attempt=0;attempt<40;attempt++){
  for(const t of targets){
   let offset=1+Math.floor(rng()*3);
   if(t.type==="straight")offset=1;
   board[t.y][t.x]={type:t.type,rot:mod4(t.targetRot+offset),targetRot:t.targetRot};
  }
  const source=path[0],target=path[path.length-1];
  if(!isConnected(board,source,target)){
   return{level,size:n,board,source,target,pathLength:path.length,seed:seed>>>0};
  }
 }
 for(const t of targets)board[t.y][t.x]={type:t.type,rot:t.targetRot===0?1:0,targetRot:t.targetRot};
 return{level,size:n,board,source:path[0],target:path[path.length-1],pathLength:path.length,seed:seed>>>0};
}
function rotateTile(puzzle,x,y){
 const t=puzzle.board[y]&&puzzle.board[y][x];if(!t)return false;
 t.rot=mod4(t.rot+1);return true;
}
function nextHint(puzzle){
 for(let y=0;y<puzzle.size;y++)for(let x=0;x<puzzle.size;x++){
  const t=puzzle.board[y][x];if(t&&getPorts(t).join(",")!==basePorts(t.type).map(d=>mod4(d+t.targetRot)).join(","))return{x,y};
 }
 return null;
}
function applyHint(puzzle){
 const p=nextHint(puzzle);if(!p)return null;
 puzzle.board[p.y][p.x].rot=puzzle.board[p.y][p.x].targetRot;return p;
}
function solved(puzzle){return isConnected(puzzle.board,puzzle.source,puzzle.target);}
function countMisaligned(puzzle){
 let n=0;for(const row of puzzle.board)for(const t of row)if(t&&getPorts(t).join(",")!==basePorts(t.type).map(d=>mod4(d+t.targetRot)).join(","))n++;return n;
}
const api={DIRS,mulberry32,seedFromString,createPuzzle,getPorts,isConnected,rotateTile,applyHint,nextHint,solved,countMisaligned,mod4};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.OrbitRelay=api;
})(typeof globalThis!=="undefined"?globalThis:this);
