class Player {
    constructor(display, x, y) {
        this.display = display;
        this.x = x;
        this.y = y;
    }

    draw() {
        this.display.draw(this.x, this.y, '@');
    }
};

class Map {
    constructor(display, tiles) {
        this.display = display;
        this.tiles = tiles;
    }

    draw(x, y) {
        if (typeof x !== "undefined" && typeof y !== "undefined") {
            if (this._inBounds(x, y)) {
                this.display.draw(x, y, this.tiles[y][x]);
            }
        } else {
            for (let y = 0; y < this.tiles.length; y++) {
                for (let x = 0; x < this.tiles[y].length; x++) {
                    this.display.draw(x, y, this.tiles[y][x]);
                }
            }
        }
    }

    walkable(x, y) {
        return this._inBounds(x, y) && this.tiles[y][x] === '.';
    }

    _inBounds(x, y) {
        return y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[y].length;
    }
};

class Monster {
    constructor(display, player, map, x, y) {
        this.display = display;
        this.player = player;
        this.map = map;
        this.x = x;
        this.y = y;
    }

    move() {
        const map = this.map;
        const astar = new ROT.Path.AStar(this.player.x, this.player.y, function(x, y) {
            return map.walkable(x, y);
        }, {topology:4});

        const path = [];
        astar.compute(this.x, this.y, function(x, y) {
            path.push({x:x, y:y});
        });
        path.shift();
        if (path.length > 1) {
            this.x = path[0].x;
            this.y = path[0].y;
        }
    }

    draw() {
        this.display.draw(this.x, this.y, "M", "red");
    }
}

/**
 * Initializes an array of strings representing map data.  Provides callback methods for rot map generator, inserting walkable areas into map structure
 */
class TileCollector {
    constructor(width, height) {
        this.mapGenHandler = this.mapGenHandler.bind(this);
        this.tiles = [];
        for (let y = 0; y < height; y++) {
            this.tiles.push("#".repeat(width));
        }
    }

    mapGenHandler(x, y, value) {
        if (value > 0) {
            let strArray = this.tiles[y].split('');
            strArray[x] = '.';
            this.tiles[y] = strArray.join("");
        }
    }
};

/**
 * Draws text to the bottom 2 rows of the display; the "message area"
 */
class MessageRenderer {
    constructor(display) {
        if (!display) throw "display is undefined";

        this.display = display;

        this.drawText.bind(this);
        this.draw.bind(this);
    }

    drawText(text) {
        this.text = text;
    }

    draw() {
        if (!this.text || 0 === this.text.length) return;

        const options = this.display.getOptions();
        const yIndex = options.height - 3;
        this.display.drawText(0, yIndex, "=".repeat(options.width));
        this.display.drawText(0, yIndex+1, this.text);
    }
}

class GameRenderer {
    constructor(display, map, player, fov, monster, messageRenderer) {
        this.display = display;
        this.map = map;
        this.player = player;
        this.fov = fov;
        this.monster = monster;
        this.messageRenderer = messageRenderer;
    }

    render() {
        this.display.clear();
        let map = this.map;
        let monster = this.monster;
        this.fov.compute(this.player.x, this.player.y, 10, function(x, y, r, visibility) {
            if (visibility > 0) {
                if (x == monster.x && y == monster.y) monster.draw();
                else map.draw(x, y);
            }
        });
        this.player.draw();
        this.messageRenderer.draw();
    }
};

/**
 * Initializes a TileCollector with map data populated via ROT.Map.Cellular
 * @display = ROT display object
 * @width = width of map
 * @height = height of map
 * @openPositions = array of {x:<int>, y:<int>} indication position(s) on the map which should be open/walkable
 */
function _initMap(display, width = 100, height = 40, openPositions = []) {
    if (!display) throw "display is undefined";

    const tileCollector = new TileCollector(width, height);
    const cellMap = new ROT.Map.Cellular(width, height, {connected: true});
    cellMap.randomize(0.5);

    for (let i = 0; i < 1; i++) cellMap.create();
    cellMap.create(tileCollector.mapGenHandler);
    openPositions.forEach(function(position) {
        cellMap.set(position.x, position.y, 1);
    });
    cellMap.connect(tileCollector.mapGenHandler, 1);

    return new Map(display, tileCollector.tiles);
}

function init() {
    const mapWidth = 100;
    const mapHeight = 40;

    const display = new ROT.Display({width:mapWidth, height:mapHeight});
    document.getElementById("gameContainer").appendChild(display.getContainer());

    const playerStart = {x:0, y:0};
    const monsterStart = {x:99, y:39};
    const map = _initMap(display, mapWidth, mapHeight, [playerStart, monsterStart]);

    const player = new Player(display, playerStart.x, playerStart.y);
    const fov = new ROT.FOV.PreciseShadowcasting(function(x, y) {
        return map.walkable(x,y);
    });

    const monster = new Monster(display, player, map, monsterStart.x, monsterStart.y);

    const messageRenderer = new MessageRenderer(display);
    messageRenderer.drawText("hello world!");

    const render = new GameRenderer(display, map, player, fov, monster, messageRenderer);
    render.render();

    window.addEventListener("keydown", function(e) {
        monster.move();

        let code = e.keyCode;
        let newX = player.x;
        let newY = player.y;

        if (code == ROT.VK_RIGHT) newX++;
        if (code == ROT.VK_LEFT) newX--;
        if (code == ROT.VK_UP) newY--;
        if (code == ROT.VK_DOWN) newY++;

        if (map.walkable(newX, newY)) {
            player.x = newX;
            player.y = newY;
        }

        render.render();
    });
}
