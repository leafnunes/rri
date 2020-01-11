import { clamp, all as allDirections } from "./direction.js";
import { NONE } from "./edge.js";
import { get as getScore } from "./score.js";
import { BorderCell } from "./cell.js";
import CellRepo from "./cell-repo.js";
import * as html from "./html.js";
import { DOWN, UP } from "./event.js";
import { BOARD, TILE } from "./conf.js";
const HOLD = 400;
const DIFFS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
];
export default class Board {
    constructor() {
        this.node = html.node("table", { className: "board" });
        this.node.addEventListener(DOWN, this);
        this.node.addEventListener("contextmenu", this);
        this._cells = new CellRepo(this.node);
    }
    handleEvent(e) {
        switch (e.type) {
            case "contextmenu":
                e.preventDefault();
                break;
            case DOWN:
                let td = e.target.closest("td");
                if (!td) {
                    return;
                }
                let cell = this._cells.byNode(td);
                cell && this.onClick(cell);
                function removeEvents() {
                    td.removeEventListener(UP, cancelHold);
                    td.removeEventListener("pointerleave", cancelHold);
                }
                function cancelHold() {
                    clearTimeout(timeout);
                    removeEvents();
                }
                let timeout = setTimeout(() => {
                    this.onHold(cell);
                    removeEvents();
                }, HOLD);
                td.addEventListener(UP, cancelHold);
                td.addEventListener("pointerleave", cancelHold);
                break;
        }
    }
    onClick(cell) { console.log("click", cell); }
    onHold(cell) { console.log("hold", cell); }
    signalAvailable(tile) {
        this._cells.forEach(cell => {
            cell.signal = (tile ? this.wouldFit(tile, cell.x, cell.y) : false);
        });
    }
    cycleTransform(x, y) {
        let tile = this._cells.at(x, y).tile;
        if (!tile) {
            return;
        }
        let avail = this._getTransforms(tile, x, y);
        let index = avail.indexOf(tile.transform);
        if (index == -1 || avail.length <= 1) {
            return;
        }
        index = (index + 1) % avail.length;
        tile.transform = avail[index];
    }
    placeBest(tile, x, y, round) {
        let avail = this._getTransforms(tile, x, y);
        if (!avail.length) {
            return false;
        }
        tile.transform = avail[0];
        this.place(tile, x, y, round);
        return true;
    }
    place(tile, x, y, round) {
        let cell = this._cells.at(x, y);
        cell.tile = tile;
        cell.round = (tile ? round.toString() : "");
    }
    wouldFit(tile, x, y) {
        let cell = this._cells.at(x, y);
        if (cell instanceof BorderCell || cell.tile) {
            return false;
        }
        let transforms = this._getTransforms(tile, x, y);
        return (transforms.length > 0);
    }
    getScore() { return getScore(this._cells); }
    _getTransforms(tile, x, y) {
        let neighborEdges = allDirections.map(dir => {
            let diff = DIFFS[dir];
            let neighbor = this._cells.at(x + diff[0], y + diff[1]).tile;
            if (!neighbor) {
                return NONE;
            }
            return neighbor.getEdge(clamp(dir + 2)).type;
        });
        let clone = tile.clone();
        return tile.getTransforms().filter(t => {
            clone.transform = t;
            return clone.fitsNeighbors(neighborEdges);
        });
    }
}
const BCELL = TILE;
const BB = 3;
const BC = 1;
const DPR = devicePixelRatio;
/*
function pxToCell(px: number) {
    for (let i=0;i<BOARD+2;i++) {
        let cellPx = cellToPx(i);
        if (px >= cellPx && px < cellPx+TILE) { return i; }
    }
    return null;
}
*/
function cellToPx(cell) {
    if (cell == 0) {
        return 0;
    }
    let offset = BCELL + BB;
    if (cell <= BOARD) {
        return offset + (cell - 1) * (TILE + BC);
    }
    return offset + BOARD * TILE + (BOARD - 1) * BC + BB;
}
export class CanvasBoard {
    constructor() {
        this.node = html.node("div", { className: "board" });
        this._cells = new CellRepo(html.node("table"));
        let canvas = html.node("canvas");
        canvas.addEventListener(DOWN, this);
        canvas.addEventListener("contextmenu", this);
        this.node.appendChild(canvas);
        const SIZE = 2 * (BCELL + BB) + BOARD * TILE + (BOARD - 1) * BC;
        canvas.width = canvas.height = SIZE * DPR;
        canvas.style.width = canvas.style.height = `${SIZE}px`;
        const ctx = canvas.getContext("2d");
        ctx.scale(DPR, DPR);
        ctx.beginPath();
        let start = BCELL + BB;
        let length = BOARD * TILE + (BOARD - 1) * BC;
        for (let i = 0; i < BOARD - 1; i++) {
            let x = start + TILE + i * (TILE + BC);
            let y = start + TILE + i * (TILE + BC);
            x += (x % 2 ? .667 : .333);
            y += (y % 2 ? .667 : .333);
            ctx.moveTo(start, y);
            ctx.lineTo(start + length, y);
            ctx.moveTo(x, start);
            ctx.lineTo(x, start + length);
        }
        ``;
        ctx.lineWidth = BC / 1.5;
        ctx.stroke();
        ctx.lineWidth = BB;
        ctx.strokeRect(TILE + BB / 2, TILE + BB / 2, length + BB, length + BB);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.strokeRect(cellToPx(3) - BC / 2, cellToPx(3) - BC / 2, 3 * (TILE + BC), 3 * (TILE + BC));
        ctx.fillStyle = "lime";
        ctx.fillRect(cellToPx(1), cellToPx(1), TILE, TILE);
        ctx.fillRect(cellToPx(1), cellToPx(2), TILE, TILE);
        ctx.fillRect(cellToPx(2), cellToPx(1), TILE, TILE);
        ctx.fillRect(cellToPx(1), cellToPx(3), TILE, TILE);
        ctx.fillRect(cellToPx(1), cellToPx(4), TILE, TILE);
    }
    handleEvent(e) {
        switch (e.type) {
            case "contextmenu":
                e.preventDefault();
                break;
            case DOWN:
                let td = e.target.closest("td");
                if (!td) {
                    return;
                }
                let cell = this._cells.byNode(td);
                cell && this.onClick(cell);
                function removeEvents() {
                    td.removeEventListener(UP, cancelHold);
                }
                function cancelHold() {
                    clearTimeout(timeout);
                    removeEvents();
                }
                let timeout = setTimeout(() => {
                    this.onHold(cell);
                    removeEvents();
                }, HOLD);
                td.addEventListener(UP, cancelHold);
                break;
        }
    }
    onClick(cell) { console.log("click", cell); }
    onHold(cell) { console.log("hold", cell); }
    signalAvailable(tile) {
        this._cells.forEach(cell => {
            cell.signal = (tile ? this.wouldFit(tile, cell.x, cell.y) : false);
        });
    }
    cycleTransform(x, y) {
        let tile = this._cells.at(x, y).tile;
        if (!tile) {
            return;
        }
        let avail = this._getTransforms(tile, x, y);
        let index = avail.indexOf(tile.transform);
        if (index == -1 || avail.length <= 1) {
            return;
        }
        index = (index + 1) % avail.length;
        tile.transform = avail[index];
    }
    placeBest(tile, x, y, round) {
        let avail = this._getTransforms(tile, x, y);
        if (!avail.length) {
            return false;
        }
        tile.transform = avail[0];
        this.place(tile, x, y, round);
        return true;
    }
    place(tile, x, y, round) {
        let cell = this._cells.at(x, y);
        cell.tile = tile;
        cell.round = (tile ? round.toString() : "");
        if (!tile)
            return;
        let pxx = cellToPx(x);
        let pxy = cellToPx(y);
        let node = tile.node;
        this.node.appendChild(node);
        node.style.left = `${pxx}px`;
        node.style.top = `${pxy}px`;
    }
    wouldFit(tile, x, y) {
        let cell = this._cells.at(x, y);
        if (cell instanceof BorderCell || cell.tile) {
            return false;
        }
        let transforms = this._getTransforms(tile, x, y);
        return (transforms.length > 0);
    }
    getScore() { return getScore(this._cells); }
    _getTransforms(tile, x, y) {
        let neighborEdges = allDirections.map(dir => {
            let diff = DIFFS[dir];
            let neighbor = this._cells.at(x + diff[0], y + diff[1]).tile;
            if (!neighbor) {
                return NONE;
            }
            return neighbor.getEdge(clamp(dir + 2)).type;
        });
        let clone = tile.clone();
        return tile.getTransforms().filter(t => {
            clone.transform = t;
            return clone.fitsNeighbors(neighborEdges);
        });
    }
}
