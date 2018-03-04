
//SHOW(display.getContainer());
var Maps = {
  "map1":
  [
    "########################################################################",
    "#..............#..................#....................................#",
    "#..............#....#.............#....................................#",
    "#..............#....#...........###....................................#",
    "###########.####....#...##.............................................#",
    "#...................#.............#....................................#",
    "#...................###############....................................#",
    "########################################################################"
  ]
};

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

  getPlayerCoords() {
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        if (this.tiles[y][x] === ".") return {x:x, y:y};
      }
    }
  }

  getMonsterCoords() {
    for (let y = this.tiles.length - 1; y >= 0; y--) {
      for (let x = this.tiles[y].length - 1; x >= 0; x--) {
        if (this.tiles[y][x] === ".") return {x:x, y:y};
      }
    }
  }

};

class GameRender {
  constructor(display, map, player, fov, monster) {
    this.display = display;
    this.map = map;
    this.player = player;
    this.fov = fov;
    this.monster = monster;
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
  }
};

function init() {
  let display = new ROT.Display({width:100, height:40});
  document.getElementById("gameContainer").appendChild(display.getContainer());

  const tileCollector = new TileCollector(100, 40);
  const cellMap = new ROT.Map.Cellular(100, 40, {connected: true});
  cellMap.randomize(0.5);
  for (let i = 0; i < 1; i++) cellMap.create();
  cellMap.create(tileCollector.mapGenHandler);
  cellMap.connect(tileCollector.mapGenHandler, 1);
  const playerStart = tileCollector.getPlayerCoords();
  //let map = new Map(display, Maps["map1"]);
  let map = new Map(display, tileCollector.tiles);
  let player = new Player(display, playerStart.x, playerStart.y);
  let fov = new ROT.FOV.PreciseShadowcasting(function(x, y) {
    return map.walkable(x,y);
  });

  const monsterStart = tileCollector.getMonsterCoords();
  const monster = new Monster(display, player, map, monsterStart.x, monsterStart.y);

  let render = new GameRender(display, map, player, fov, monster);
  render.render();
  //map.draw();

  window.addEventListener("keydown", function(e) {
      monster.move();

      let code = e.keyCode;
      let newX = player.x;
      let newY = player.y;

      if (code == ROT.VK_RIGHT) newX++;
      if (code == ROT.VK_LEFT) newX--;
      if (code == ROT.VK_UP) newY--;
      if (code == ROT.VK_DOWN) newY++;

      if (newX == player.x && newY == player.y) return;

      if (map.walkable(newX, newY)) {
        player.x = newX;
        player.y = newY;
        render.render();
      }
  });

  //display.draw(50, 20, '@');

  //display.draw(110, 5, "t");
}
