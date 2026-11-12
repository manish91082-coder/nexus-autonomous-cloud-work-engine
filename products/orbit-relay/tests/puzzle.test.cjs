"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const G=require("../puzzle.js");
test("same seed and level produce identical puzzle state",()=>{
 const a=G.createPuzzle(4,123456),b=G.createPuzzle(4,123456);
 assert.equal(a.size,b.size);assert.equal(a.pathLength,b.pathLength);
 assert.deepEqual(a.board,b.board);assert.deepEqual(a.source,b.source);assert.deepEqual(a.target,b.target);
});
test("generated target rotations always solve the puzzle",()=>{
 for(let level=1;level<=12;level++){
  const p=G.createPuzzle(level,level*9871);
  for(const row of p.board)for(const t of row)if(t)t.rot=t.targetRot;
  assert.equal(G.solved(p),true,"level "+level+" should be solvable");
 }
});
test("generated starting puzzle is not already solved",()=>{
 for(let seed=1;seed<=50;seed++)assert.equal(G.solved(G.createPuzzle(3,seed)),false,"seed "+seed);
});
test("rotating a tile advances orientation and wraps",()=>{
 const p=G.createPuzzle(1,42),pos=G.nextHint(p),tile=p.board[pos.y][pos.x],before=tile.rot;
 assert.equal(G.rotateTile(p,pos.x,pos.y),true);assert.equal(tile.rot,G.mod4(before+1));
 tile.rot=3;G.rotateTile(p,pos.x,pos.y);assert.equal(tile.rot,0);
});
test("hint aligns one tile and reduces misaligned count",()=>{
 const p=G.createPuzzle(2,2026),before=G.countMisaligned(p),hint=G.applyHint(p);
 assert.ok(hint);assert.equal(G.countMisaligned(p),before-1);
});
test("level size scales but stays within the seven by seven limit",()=>{
 assert.equal(G.createPuzzle(1,1).size,5);
 assert.equal(G.createPuzzle(4,1).size,6);
 assert.equal(G.createPuzzle(7,1).size,7);
 assert.equal(G.createPuzzle(99,1).size,7);
});
test("empty cells cannot be rotated",()=>{const p=G.createPuzzle(1,9);let empty=null;for(let y=0;y<p.size;y++)for(let x=0;x<p.size;x++)if(!p.board[y][x])empty={x,y};assert.ok(empty);assert.equal(G.rotateTile(p,empty.x,empty.y),false)});
