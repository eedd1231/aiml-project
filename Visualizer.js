import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useEffect } from "react";
import "../App.css";

export const Visualizer = () => {
  useEffect(() => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const N = 10; // NxN board size
    const ani = true; // enable / disable animations
    const paintTrail = true; // enable / disable paint trails for rolling finder block

    let l = -(N / 2) + 0.5; // lower bound ; Things are offset by 0.5
    let u = N / 2 - 0.5; // upper bound ; Things are offset by 0.5

    // Priority Queue implentation for A* Search
    class QElement {
      // Each element in this has and element and it's priority in the queue
      // Priority is generally the cost it took to get to that node OR cost it took to get to the node PLUS the heuristic (distance from current node to the end node)
      constructor(element, priority) {
        this.element = element;
        this.priority = priority;
      }
    }

    class PriorityQueue {
      // A list of items
      constructor() {
        this.items = [];
      }

      // Add an item given the element and its priority
      enqueue(element, priority) {
        var qElement = new QElement(element, priority);
        var contain = false;
        for (var i = 0; i < this.items.length; i++) {
          if (this.items[i].priority > qElement.priority) {
            this.items.splice(i, 0, qElement);
            contain = true;
            break;
          }
        }
        if (!contain) {
          this.items.push(qElement);
        }
      }

      dequeue() {
        if (this.isEmpty()) return "Underflow";
        return this.items.shift();
      }

      isEmpty() {
        return this.items.length == 0;
      }
    }

    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const orbit = new OrbitControls(camera, renderer.domElement);

    camera.position.set(10, 15, -22);

    orbit.update();

    scene.background = new THREE.Color(`rgb(135, 206, 235)`);

    // plane is the board that the board sits on
    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(N, N),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        visible: true,
        color: 0x000000
      })
    );
    planeMesh.rotateX(-Math.PI / 2);
    planeMesh.position.y -= 0.1;
    planeMesh.name = "PLANE";
    scene.add(planeMesh);
    //

    // Grid is the visual checkerboard that you see
    const grid = new THREE.GridHelper(N, N);
    grid.name = "GRID";
    grid.position.y -= 0.05;
    scene.add(grid);
    // -- End Grid

    // Axis helper for testing
    // X axis is red; Y axis is green; Z axis is blue.
    // const axesHelper = new THREE.AxesHelper(5);
    // scene.add(axesHelper);

    // This is the starting indicator on the board
    const highlightMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true
      })
    );

    highlightMesh.rotateX(-Math.PI / 2);
    highlightMesh.position.set(0.5, 0, 0.5);
    scene.add(highlightMesh);
    // -- End starting indicator

    // 1 x 1 Square
    const Mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true
      })
    );
    Mesh.rotateX(-Math.PI / 2);

    // Handles the location of the highlight mesh based on the location of the mouse
    const mousePosition = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let intersects;

    window.addEventListener("mousemove", function (e) {
      mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mousePosition, camera);
      intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const highlightPos = new THREE.Vector3()
          .copy(intersect.point)
          .floor()
          .addScalar(0.5);

        highlightMesh.position.set(highlightPos.x, -0.07, highlightPos.z);

        // Checking if an object is present at that location already
        const objectExist = objects.find(function (object) {
          return (
            object.position.x === highlightMesh.position.x &&
            object.position.z === highlightMesh.position.z
          );
        });

        if (
          !objectExist &&
          highlightPos.x >= l &&
          highlightPos.x <= u &&
          highlightPos.z >= l &&
          highlightPos.z <= u
        )
          highlightMesh.material.color.setHex(0x808080);
        else highlightMesh.material.color.setHex(0x000000);
      }
    });

    // Defining the different type of boxes

    // The starting box
    const startBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    // Giving the box a wireframe outline
    startBox.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(startBox.geometry),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      )
    );
    // End box with Color Red
    const endBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    // Wall box that are white
    const wallBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75
      })
    );

    //Purple box / Rotates
    const finderBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.751, 0.751, 0.751),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );

    //
    const solutionBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );

    // used to hide the animations under the grid
    const hideBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );

    const cornerHideBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );

    // The darker gray box around the green waveBoxes
    const fringeBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );

    // The darker gray box around the green waveBoxes
    const fringeBox2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x11ff11 })
    );

    // The green boxes that do the wave
    // As the wave goes out, the wave opacity will decrease
    const waveBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.7),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        opacity: 1,
        transparent: true
      })
    );
    waveBox.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(waveBox.geometry),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      )
    );

    // Adding border, via the hide boxes, around the board to hide animations
    if (N < 21) {
      let l2 = l;
      let hideId = 0;
      for (let i = 0; i < 3; i++) {
        l2 = l;
        while (l2 <= u) {
          let hide = hideBox.clone();
          let hide2 = hideBox.clone();
          hide.position.set(l2, -0.6 - i, l - 1);
          hide2.position.set(l - 1, -0.6 - i, l2);
          hide.name = "HIDE" + ++hideId;
          hide2.name = "HIDE" + ++hideId;
          scene.add(hide);
          scene.add(hide2);
          l2++;
        }
      }
      let u2 = u;
      for (let i = 0; i < 3; i++) {
        u2 = u;
        while (u2 >= l) {
          let hide = hideBox.clone();
          let hide2 = hideBox.clone();
          hide.position.set(u2, -0.6 - i, u + 1);
          hide2.position.set(u + 1, -0.6 - i, u2);
          hide.name = "HIDE" + ++hideId;
          hide2.name = "HIDE" + ++hideId;
          scene.add(hide);
          scene.add(hide2);
          u2--;
        }
      }
      for (let i = 0; i < 3; i++) {
        let c1 = cornerHideBox.clone();
        c1.name = "HIDE" + ++hideId;
        c1.position.set(u + 1, -0.6 - i, u + 1);
        let c2 = cornerHideBox.clone();
        c2.name = "HIDE" + ++hideId;
        c2.position.set(u + 1, -0.6 - i, l - 1);
        let c3 = cornerHideBox.clone();
        c3.name = "HIDE" + ++hideId;
        c3.position.set(l - 1, -0.6 - i, l - 1);
        let c4 = cornerHideBox.clone();
        c4.name = "HIDE" + ++hideId;
        c4.position.set(l - 1, -0.6 - i, u + 1);
        scene.add(c1);
        scene.add(c2);
        scene.add(c3);
        scene.add(c4);
      }
    }
    // -- End adding the black borders

    // Intialization
    let objects = []; // Given to us in the tutorial
    let boxes = []; // All the boxes on the grid (e.x. start, end, walls, the green boxes, the fringe boxes, the purple boxes, etc.)
    let paths = null; // Keeps track of the solution path. coords to get from start to end
    let startBoxPosition = null; // coords
    let endBoxPosition = null; // coords
    let wallId = 0; // wall -> F
    let solId = 0; // solution
    let fringeId = 0; // fringe
    let solutionDrawn = false; // informs if solution is drawn

    // Creates a box when a tile is clicked. Start and End boxes have priority
    window.addEventListener("click", async function () {
      //console.log(scene);

      // Check if a box exists at a specific coordinates; Highlight mesh is where the cursor is highlighting on the grid
      // bs = list of all the boxes on the grid
      // mesh_x = highlight mesh's x
      // mesh_z = highlight mesh's z
      function boxExists(bs, mesh_x, mesh_z) {
        if (boxes.length == 0) {
          return false;
        }
        for (let i = 0; i < bs.length; i++) {
          if (bs[i].position.x == mesh_x && bs[i].position.z == mesh_z) {
            return true;
          }
        }
        return false;
      }

      // Get the box index so we can remove it from the "boxes" list if needed
      function boxIndex(bs, mesh_x, mesh_z) {
        for (let i = 0; i < bs.length; i++) {
          if (bs[i].position.x == mesh_x && bs[i].position.z == mesh_z) {
            return i;
          }
        }
        return -1;
      }

      // Tells if highlight mesh is at start box
      function isStart(mesh_x, mesh_z) {
        return mesh_x === startBoxPosition[0] && mesh_z === startBoxPosition[1];
      }

      // Tells if highlight mesh is at end box
      function isEnd(mesh_x, mesh_z) {
        return mesh_x == endBoxPosition[0] && mesh_z == endBoxPosition[1];
      }

      function removeBox(mesh_x, mesh_z) {
        boxes.forEach((box) => {
          if (box.position.x == mesh_x && box.position.z == mesh_z) {
            scene.remove(box);
            boxes = boxes.splice(boxes.indexOf(box), 1);
            return box.name;
          }
        });
      }

      if (intersects.length > 0) {
        if (
          highlightMesh.position.x >= l &&
          highlightMesh.position.x <= u &&
          highlightMesh.position.z >= l &&
          highlightMesh.position.z <= u
        ) {
          // If there is not a box there on the highlight mesh
          if (
            !boxExists(
              boxes,
              highlightMesh.position.x,
              highlightMesh.position.z
            )
          ) {
            let boxClone = null;
            if (startBoxPosition == null) {
              // must add startBox
              boxClone = startBox.clone();
              boxClone.position.copy(highlightMesh.position);
              boxClone.position.y -= 0.5; // Might not need to do this
              boxClone.name = "START";
              boxClone.add(
                new THREE.LineSegments(
                  new THREE.EdgesGeometry(boxClone.geometry),
                  new THREE.LineBasicMaterial({ color: 0x000000 })
                )
              );
              boxes.push(boxClone);
              scene.add(boxClone);
              if (startBoxPosition == null) {
                startBoxPosition = [boxClone.position.x, boxClone.position.z];
              }
            } else if (endBoxPosition == null) {
              boxClone = endBox.clone();
              boxClone.position.copy(highlightMesh.position);
              boxClone.position.y -= 0.5;
              boxClone.name = "END";
              boxClone.add(
                new THREE.LineSegments(
                  new THREE.EdgesGeometry(boxClone.geometry),
                  new THREE.LineBasicMaterial({ color: 0x000000 })
                )
              );
              boxes.push(boxClone);
              scene.add(boxClone);
              if (endBoxPosition == null) {
                endBoxPosition = [boxClone.position.x, boxClone.position.z];
              }
            } else {
              boxClone = wallBox.clone();
              boxClone.position.copy(highlightMesh.position);
              boxClone.position.y -= 0.5;
              boxClone.name = "WALL" + wallId;
              boxClone.add(
                new THREE.LineSegments(
                  new THREE.EdgesGeometry(boxClone.geometry),
                  new THREE.LineBasicMaterial({ color: 0x000000 })
                )
              );
              boxes.push(boxClone);
              scene.add(boxClone);
              wallId++;
            }
            // If animation is enabled
            if (ani) {
              // This gives the look of the box rising up when placing it
              for (let i = 0; i < 50; i++) {
                await sleep(1);
                scene.getObjectByName(boxClone.name).position.y += 0.02;
              }
            }
            scene.getObjectByName(boxClone.name).position.y = 0.45;

            // Not if the box does exist
          } else {
            // removing a block
            let index = boxIndex(
              boxes,
              highlightMesh.position.x,
              highlightMesh.position.z
            );
            let boxToDelete = boxes[index];
            if (index != -1) {
              boxes.splice(index, 1);
              // animate the box by lowering it
              if (ani) {
                for (let i = 0; i < 51; i++) {
                  await sleep(1);
                  scene.getObjectByName(boxToDelete.name).position.y -= 0.02;
                }
              }
              scene.remove(boxToDelete);
            } else {
              //console.log("Tried to get a box that doesn't exist . . .");
            }
            if (
              startBoxPosition != null &&
              isStart(highlightMesh.position.x, highlightMesh.position.z)
            ) {
              startBoxPosition = null;
            }
            if (
              endBoxPosition != null &&
              isEnd(highlightMesh.position.x, highlightMesh.position.z)
            ) {
              endBoxPosition = null;
            }
          }
        }
      }
    });

    // Animate the highlight mesh
    // Constantly renders the page
    function animate(time) {
      highlightMesh.material.opacity = 1 + Math.sin(time / 120);
      objects.forEach(function (object) {
        object.rotation.x = time / 1;
        object.rotation.z = time / 1;
        object.position.y = 0.5 + 0.5 * Math.abs(Math.sin(time / 1000));
      });
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    // Register window resizing
    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard controls
    window.addEventListener("keypress", (event) => {
      let code = event.code;
      if (code == "KeyA") {
        // A*
        solve("A");
      } else if (code == "KeyD") {
        // DFS
        solve("D");
      } else if (code == "KeyB") {
        // BFS
        solve("B");
      } else if (code == "KeyR") {
        // Reset grid
        reset();
      } else if (code == "KeyC") {
        // Clear Solution
        clearSolution();
      } else if (code == "KeyW") {
        if (ani) {
          if (startBoxPosition != null) {
            wave(startBoxPosition[0], startBoxPosition[1], "RAND");
          } else {
            flash("RED");
          }
        } else {
          flash("RED");
        }
      }
    });

    // Solve the maze
    async function solve(key) {
      // Getting the walls since path can't go through wall
      function getWalls() {
        let wallCords = [];
        for (let i = 0; i < boxes.length; i++) {
          if (boxes[i].name.substring(0, 4) == "WALL") {
            wallCords.push([boxes[i].position.x, boxes[i].position.z]);
          }
        }
        return wallCords;
      }

      // Given coords will tell you if it is a wall or not
      function isWall(cord) {
        let cords = getWalls();
        for (let i = 0; i < cords.length; i++) {
          if (cord[0] == cords[i][0] && cord[1] == cords[i][1]) {
            return true;
          }
        }
        return false;
      }

      // If the coordinate (x,z) is within the coords list
      function isIn(cords, cord) {
        for (let i = 0; i < cords.length; i++) {
          if (cord[0] == cords[i][0] && cord[1] == cords[i][1]) {
            return true;
          }
        }
        return false;
      }

      // Returns the manhattan distance between two coordinate pairs
      // c1 = Endbox location
      // c2 = Current location
      // abs(x1 - x2) + abs(z1 - z2)
      // LOWER return value equals CLOSER
      function manhattan(c1, c2) {
        return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]);
      }

      async function dfs() {
        const visited = [];
        var stack = [];
        stack.push([[startBoxPosition[0], startBoxPosition[1]], []]);
        while (stack.Length != 0) {
          let tmp = stack.pop();
          let state = tmp[0];
          let actions = tmp[1];
          if (!isIn(visited, state) && !isWall(state)) {
            visited.push(state);
            if (
              state[0] == endBoxPosition[0] &&
              state[1] == endBoxPosition[1]
            ) {
              return actions;
            } else {
              let x = state[0];
              let z = state[1];
              let x1 = state[0] + 1;
              let z1 = state[1] + 1;
              let x2 = state[0] - 1;
              let z2 = state[1] - 1;
              if (x1 <= u && x1 >= l) {
                let updatedActions = actions.concat([[x1, z]]);
                stack.push([[x1, z], updatedActions]);
              }
              if (z1 <= u && z1 >= l) {
                let updatedActions = actions.concat([[x, z1]]);
                stack.push([[x, z1], updatedActions]);
              }
              if (x2 <= u && x2 >= l) {
                let updatedActions = actions.concat([[x2, z]]);
                stack.push([[x2, z], updatedActions]);
              }
              if (z2 <= u && z2 >= l) {
                let updatedActions = actions.concat([[x, z2]]);
                stack.push([[x, z2], updatedActions]);
              }
              let fringe = fringeBox.clone();
              let fringe2 = fringeBox2.clone();
              fringe.name = "FRINGE" + ++fringeId;
              fringe2.name = "FRINGE" + ++fringeId;
              //console.log(fringe.name + " " + fringe2.name);
              fringe.position.set(x, -0.5, z);
              fringe2.position.set(x, -0.5, z);
              scene.add(fringe);
              scene.add(fringe2);
              boxes.push(fringe);
              boxes.push(fringe2);
              for (let j = 0; j < 6; j++) {
                scene.getObjectByName(fringe.name).position.y += 0.01;
                await sleep(1);
              }
              for (let j = 0; j < 13; j++) {
                scene.getObjectByName(fringe2.name).position.y += 0.015;
                await sleep(1);
              }
            }
          }
        }
        return -1;
      }

      async function bfs() {
        const visited = [];
        var stack = [];
        stack.push([[startBoxPosition[0], startBoxPosition[1]], []]);
        while (stack.Length != 0) {
          let tmp = stack.shift();
          let state = tmp[0];
          let actions = tmp[1];
          if (!isIn(visited, state) && !isWall(state)) {
            visited.push(state);
            if (
              state[0] == endBoxPosition[0] &&
              state[1] == endBoxPosition[1]
            ) {
              return actions;
            } else {
              let x = state[0];
              let z = state[1];
              let x1 = state[0] + 1;
              let z1 = state[1] + 1;
              let x2 = state[0] - 1;
              let z2 = state[1] - 1;
              if (x1 <= u && x1 >= l) {
                let updatedActions = actions.concat([[x1, z]]);
                stack.push([[x1, z], updatedActions]);
              }
              if (z1 <= u && z1 >= l) {
                let updatedActions = actions.concat([[x, z1]]);
                stack.push([[x, z1], updatedActions]);
              }
              if (x2 <= u && x2 >= l) {
                let updatedActions = actions.concat([[x2, z]]);
                stack.push([[x2, z], updatedActions]);
              }
              if (z2 <= u && z2 >= l) {
                let updatedActions = actions.concat([[x, z2]]);
                stack.push([[x, z2], updatedActions]);
              }
              let fringe = fringeBox.clone();
              let fringe2 = fringeBox2.clone();
              fringe.name = "FRINGE" + ++fringeId;
              fringe2.name = "FRINGE" + ++fringeId;
              //console.log(fringe.name + " " + fringe2.name);
              fringe.position.set(x, -0.5, z);
              fringe2.position.set(x, -0.5, z);
              scene.add(fringe);
              scene.add(fringe2);
              boxes.push(fringe);
              boxes.push(fringe2);
              for (let j = 0; j < 6; j++) {
                scene.getObjectByName(fringe.name).position.y += 0.01;
                await sleep(1);
              }
              for (let j = 0; j < 13; j++) {
                scene.getObjectByName(fringe2.name).position.y += 0.015;
                await sleep(1);
              }
              //console.log(fringe.position.x + ", " + fringe.position.z + ", " + fringe.position.y + " : " + fringe2.position.x + ", " + fringe2.position.z + ", " + fringe2.position.y);
            }
          }
        }
        return -1;
      }

      async function aStar() {
        const visited = []; // Stores visited sets
        const Q = new PriorityQueue();
        // startBoxPosition[0] -> Starting x; Part of the 'state' list
        // startBoxPosition[1] -> Starting z; Part of the 'state list
        // [] -> List of actions that led to current state/position; aka the solution path
        // 0 = Cost
        // 0 = No priority because of first element
        Q.enqueue([[startBoxPosition[0], startBoxPosition[1]], [], 0], 0);

        // Continously dequeue and element from the PQ until it's empty
        // If PQ becomes empty then we know there is no solution
        while (!Q.isEmpty()) {
          let tmp = Q.dequeue().element;

          let state = tmp[0]; // [x, z]
          let actions = tmp[1]; // List of actions that led to current state/position
          let cost = tmp[2]; //

          // As long as the currest state/position is not visited AND the current state/position is not a wall
          if (!isIn(visited, state) && !isWall(state)) {
            visited.push(state); // Add current state to visited list

            // If at the end box, then return the actions
            if (
              state[0] === endBoxPosition[0] &&
              state[1] === endBoxPosition[1]
            ) {
              return actions;
              // If not at the end box location
            } else {
              // Get x and z of current position from state
              let x = state[0]; // current x position
              let z = state[1]; // current z position
              let x1 = state[0] + 1; // current x position + 1
              let z1 = state[1] + 1; // current z position + 1
              let x2 = state[0] - 1; // current x position - 1
              let z2 = state[1] - 1; // current z position - 1

              // These below are the FOUR possible moves that can happen Up, Down, Left, Right
              // they are added to the PQ with their element and priority
              // 4 different action lists. Branches out and possibilies expand as more blocks are explored
              // Like adding 4 new Nodes to the tree we are traversing

              // If (x+1, z) is within the limits of the grid
              // if x+1 <= upperlimit AND x+1 >= lowerlimit
              if (x1 <= u && x1 >= l) {
                let heuristicCost = manhattan(endBoxPosition, [x1, z]); // get the manhatten distance from the new position to the end box position; lower is closer
                let updatedActions = actions.concat([[x1, z]]); // Add the new move/position to list of actions at the end
                Q.enqueue(
                  [[x1, z], updatedActions, cost + 1],
                  cost + 1 + heuristicCost
                ); // add this new element to the queue
                // QElement.Element: list
                //  --> State = [x1, z]
                //  --> Actions = the updated actions
                //  --> Cost = cost+1; Cost increases as you go from the start and branch out; Cost +1 to move one over one block because no weights
                // QElement.Priority: int
                //  --> Priority = cost+1 + the heuristicCost (how close is it to the endpoint based on manhatten distance; Lower gets priority)
              }

              // If (x, z+1) is within the limits of the grid
              // if z+1 <= upperlimit AND z+1 >= lowerlimit
              if (z1 <= u && z1 >= l) {
                let heuristicCost = manhattan(endBoxPosition, [x, z1]);
                let updatedActions = actions.concat([[x, z1]]);
                Q.enqueue(
                  [[x, z1], updatedActions, cost + 1],
                  cost + 1 + heuristicCost
                );
              }

              // If (x-1, z) is within the limits of the grid
              // if x-1 <= upperlimit AND x-1 >= lowerlimit
              if (x2 <= u && x2 >= l) {
                let heuristicCost = manhattan(endBoxPosition, [x2, z]);
                let updatedActions = actions.concat([[x2, z]]);
                Q.enqueue(
                  [[x2, z], updatedActions, cost + 1],
                  cost + 1 + heuristicCost
                );
              }

              // If (x, z-1) is within the limits of the grid
              // if z-1 <= upperlimit AND z-1 >= lowerlimit
              if (z2 <= u && z2 >= l) {
                let heuristicCost = manhattan(endBoxPosition, [x, z2]);
                let updatedActions = actions.concat([[x, z2]]);
                Q.enqueue(
                  [[x, z2], updatedActions, cost + 1],
                  cost + 1 + heuristicCost
                );
              }

              // Addes fringe boxes to the grid based on current position and animate it
              let fringe = fringeBox.clone();
              let fringe2 = fringeBox2.clone();
              fringe.name = "FRINGE" + ++fringeId;
              fringe2.name = "FRINGE" + ++fringeId;
              //console.log(fringe.name + " " + fringe2.name);
              fringe.position.set(x, -0.5, z);
              fringe2.position.set(x, -0.5, z);
              scene.add(fringe);
              scene.add(fringe2);
              boxes.push(fringe);
              boxes.push(fringe2);
              for (let j = 0; j < 6; j++) {
                scene.getObjectByName(fringe.name).position.y += 0.01;
                await sleep(1);
              }
              for (let j = 0; j < 13; j++) {
                scene.getObjectByName(fringe2.name).position.y += 0.015;
                await sleep(1);
              }
            }
          }
        }
        // If this is reached it means after running through everything, we didn't find a solution
        return -1;
      }

      // Given two coords pairs. returns the direction you are about to go
      // This is done for the box animations
      function getDirection(c1, c2) {
        let dx = c1[0] - c2[0];
        let dz = c1[1] - c2[1];
        if (dx == 1) {
          return "E";
        } else if (dx == -1) {
          return "W";
        } else if (dz == 1) {
          return "S";
        } else if (dz == -1) {
          return "N";
        }
      }

      // After solving, draw the path returned by astar
      if (
        startBoxPosition != null &&
        endBoxPosition != null &&
        !solutionDrawn
      ) {
        if (key == "A") {
          paths = await aStar();
        } else if (key == "D") {
          paths = await dfs();
        } else if (key == "B") {
          paths = await bfs();
        }
        if (paths != -1) {
          // Uses finder box (Purple) to traverse along path as visualization;
          let finder = finderBox.clone();
          finder.name = "FINDER";
          finder.position.y -= 0.55;
          finder.position.x = startBoxPosition[0];
          finder.position.z = startBoxPosition[1];
          finder.add(
            new THREE.LineSegments(
              new THREE.EdgesGeometry(finder.geometry),
              new THREE.LineBasicMaterial({ color: 0x000000 })
            )
          );
          boxes.push(finder);
          scene.add(finder);

          await sleep(100);
          // purple box animates up
          for (let j = 0; j < 26; j++) {
            scene.getObjectByName(finder.name).position.y += 0.04;
            await sleep(10);
          }
          await sleep(100);
          for (let i = -1; i < paths.length - 1; i++) {
            if (i == -1) {
              // Rotate the purple cube based on the direction it needs to go
              await rotateCube(
                getDirection(startBoxPosition, paths[0]),
                finder
              );
            } else {
              await rotateCube(getDirection(paths[i], paths[i + 1]), finder);
              if (paintTrail) {
                // If enabled draw a paint trail
                let solution = solutionBox.clone();
                solution.name = "SOL" + ++solId;
                //console.log(paths[i]);
                solution.position.x = paths[i][0];
                solution.position.z = paths[i][1];
                solution.position.y -= 0.5;
                solution.add(
                  new THREE.LineSegments(
                    new THREE.EdgesGeometry(solution.geometry),
                    new THREE.LineBasicMaterial({ color: 0x000000 })
                  )
                );
                boxes.push(solution);
                scene.add(solution);
                if (ani) {
                  for (let j = 0; j < 7; j++) {
                    scene.getObjectByName(solution.name).position.y += 0.15;
                    await sleep(1);
                  }
                  scene.getObjectByName(solution.name).position.y = 0.45;
                }
              }
            }
          }
          solutionDrawn = true;
          if (!ani) {
            flash("GREEN");
          }
        } else {
          flash("RED");
        }
      } else {
        flash("RED");
      }
    }

    // Function to clear board
    async function reset() {
      if (ani) {
        async function recurse(i) {
          if (i != boxes.length) {
            recurse(i + 1);
            const name = boxes[i].name;
            for (let j = 0; j < 210; j++) {
              scene.getObjectByName(name).position.y -= 0.0075;
              await sleep(1);
            }
            scene.remove(scene.getObjectByName(name));
          }
        }

        await recurse(0);
      }
      for (let i = 0; i < boxes.length; i++) {
        scene.remove(scene.getObjectByName(boxes[i].name));
      }
      objects = [];
      boxes = [];
      paths = null;
      startBoxPosition = null;
      endBoxPosition = null;
      wallId = 0;
      solId = 0;
      solutionDrawn = false;
    }

    // Function to clear a solution-state if it is present
    async function clearSolution() {
      //console.log(paths);
      if ((paths != null) & (paths != -1)) {
        if (ani) {
          for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].name.substring(0, 3) == "SOL") {
              scene.remove(scene.getObjectByName(boxes[i].name));
            }
          }
          boxes = boxes.filter(function (box) {
            return box.name.substring(0, 3) !== "SOL";
          });

          for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].name == "FINDER") {
              scene.remove(scene.getObjectByName(boxes[i].name));
              await sleep(1);
            }
          }
          boxes = boxes.filter(function (box) {
            return box.name !== "FINDER";
          });
          for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].name.substring(0, 3) == "FRI") {
              scene.remove(scene.getObjectByName(boxes[i].name));
              await sleep(1);
            }
          }
          boxes = boxes.filter(function (box) {
            return box.name.substring(0, 3) !== "FRI";
          });
          solutionDrawn = false;
          paths = null;
          //wave(endBoxPosition[0], endBoxPosition[1], "G");
        } else {
          for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].name.substring(0, 3) == "SOL") {
              scene.remove(scene.getObjectByName(boxes[i].name));
            }
          }
          boxes = boxes.filter(function (box) {
            return box.name.substring(0, 3) !== "SOL";
          });

          solutionDrawn = false;
          paths = null;
        }
      } else {
        flash("RED");
      }
    }

    // Given a color (RED / GREEN), the board will flash this color
    async function flash(color) {
      let grid_error = scene.getObjectByName("GRID");
      let plane_error = scene.getObjectByName("PLANE");
      if (color == "RED") {
        grid_error.material.color.setHex(0x000000);
        for (let j = 0; j < 4; j++) {
          for (let i = 1; i < 17; i++) {
            await sleep(1000 / 150);
            plane_error.material.color = new THREE.Color(
              `rgb(${0 + i * 16 - 1}, 0, 0)`
            );
          }
          for (let i = 1; i < 17; i++) {
            await sleep(1000 / 150);
            plane_error.material.color = new THREE.Color(
              `rgb(${256 - i * 16}, 0, 0)`
            );
          }
        }
        grid_error.material.color.setHex(0xffffff);
      } else if (color == "GREEN") {
        grid_error.material.color.setHex(0x000000);
        for (let j = 0; j < 4; j++) {
          for (let i = 1; i < 17; i++) {
            await sleep(1000 / 150);
            plane_error.material.color = new THREE.Color(
              `rgb(0, ${0 + i * 16 - 1}, 0)`
            );
          }
          for (let i = 1; i < 17; i++) {
            await sleep(1000 / 150);
            plane_error.material.color = new THREE.Color(
              `rgb(0, ${256 - i * 16}, 0)`
            );
          }
        }
        grid_error.material.color.setHex(0xffffff);
      }
    }

    // Will produce a wave visual given a x, z coordinate, type can be GREEN or RANDOM
    async function wave(x, z, type) {
      let waveId = 0;
      let visited = [];
      function inVisited(vs, x, z) {
        for (let i = 0; i < vs.length; i++) {
          if (vs[i][0] == x && vs[i][1] == z) {
            return true;
          }
        }
        return false;
      }

      function getWalls() {
        let wallCords = [];
        for (let i = 0; i < boxes.length; i++) {
          if (boxes[i].name.substring(0, 4) == "WALL") {
            wallCords.push([boxes[i].position.x, boxes[i].position.z]);
          }
        }
        return wallCords;
      }

      function isWall(cord) {
        let cords = getWalls();
        for (let i = 0; i < cords.length; i++) {
          if (cord[0] == cords[i][0] && cord[1] == cords[i][1]) {
            return true;
          }
        }
        return false;
      }
      async function dfs(x, z, opacity) {
        if (
          x >= l &&
          x <= u &&
          z >= l &&
          z <= u &&
          opacity > 0 &&
          !inVisited(visited, x, z) &&
          !isWall([x, z])
        ) {
          waveId++;
          const mesh = waveBox.clone();
          mesh.name = "WAVE" + waveId;
          mesh.position.x = x;
          mesh.position.y = -0.5;
          mesh.position.z = z;
          mesh.material.opacity = opacity;
          if (type == "G") {
            mesh.material.color.setHex(0x10ff10);
            scene.add(mesh);
          } else if (type == "RAND") {
            mesh.material.color = new THREE.Color(
              `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(
                Math.random() * 256
              )} ,${Math.floor(Math.random() * 256)})`
            );
            scene.add(mesh);
          }
          waveId++;
          visited.push([x, z]);
          for (let i = 0; i < 5; i++) {
            mesh.position.y += 0.3;
            await sleep(10);
          }
          dfs(x + 1, z, opacity - 0.03);
          dfs(x, z + 1, opacity - 0.03);
          dfs(x - 1, z, opacity - 0.03);
          dfs(x, z - 1, opacity - 0.03);
          for (let i = 0; i < 25; i++) {
            mesh.position.y -= 0.06;
            await sleep(10);
          }
          scene.remove(mesh);
        }
      }
      dfs(x, z, 1);
    }

    // Given a box, and a direction, the function will rotate the box about its edge to the next tile
    // Will also update the boxes location. If a box already exists in the area, board will flash red
    async function rotateCube(direction, box) {
      function inVisited(vs, x, z) {
        for (let i = 0; i < vs.length; i++) {
          if (vs[i][0] == x && vs[i][1] == z) {
            return true;
          }
        }
        return false;
      }

      function getWalls() {
        let wallCords = [];
        for (let i = 0; i < boxes.length; i++) {
          if (boxes[i].name.substring(0, 4) == "WALL") {
            wallCords.push([boxes[i].position.x, boxes[i].position.z]);
          }
        }
        return wallCords;
      }

      function isWall(cord) {
        let cords = getWalls();
        for (let i = 0; i < cords.length; i++) {
          if (cord[0] == cords[i][0] && cord[1] == cords[i][1]) {
            return true;
          }
        }
        return false;
      }
      if (direction == "N") {
        let z = scene.getObjectByName(box.name).position.z + 1;
        if (
          !isWall([scene.getObjectByName(box.name).position.x, z]) &&
          z >= l &&
          z <= u
        ) {
          for (let i = 0; i < 51; i++) {
            scene
              .getObjectByName(box.name)
              .rotateX((90 * (Math.PI / 180)) / 51);
            scene.getObjectByName(box.name).position.z += 1 / 51;
            scene.getObjectByName(box.name).position.y =
              Math.sin(i * (Math.PI / 51)) / 2 + 0.45;
            await sleep(2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45));
            // console.log(
            //   (2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45)) * 1000
            // );
          }
          scene.getObjectByName(box.name).position.z =
            Math.ceil(scene.getObjectByName(box.name).position.z) - 0.5;
          scene.getObjectByName(box.name).position.y = 0.45;
          scene.getObjectByName(box.name).rotation.set(0, 0, 0);
          //console.log(`X: ${scene.getObjectByName(box.name).position.x} Y: ${scene.getObjectByName(box.name).position.y} Z: ${scene.getObjectByName(box.name).position.z}`)
        } else {
          flash("RED");
        }
      } else if (direction == "E") {
        // Z + 1
        let x = scene.getObjectByName(box.name).position.x - 1;
        if (!isWall([x, scene.getObjectByName(box.name).position.z])) {
          for (let i = 0; i < 51; i++) {
            scene
              .getObjectByName(box.name)
              .rotateZ((90 * (Math.PI / 180)) / 51);
            scene.getObjectByName(box.name).position.x -= 1 / 51;
            scene.getObjectByName(box.name).position.y =
              Math.sin(i * (Math.PI / 51)) / 2 + 0.45;
            await sleep(2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45));
            // console.log(
            //   (2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45)) * 1000
            // );
          }
          scene.getObjectByName(box.name).position.x =
            Math.ceil(scene.getObjectByName(box.name).position.x) - 0.5;
          scene.getObjectByName(box.name).position.y = 0.45;
          scene.getObjectByName(box.name).rotation.set(0, 0, 0);
          //console.log(`X: ${scene.getObjectByName(box.name).position.x} Y: ${scene.getObjectByName(box.name).position.y} Z: ${scene.getObjectByName(box.name).position.z}`);
        } else {
          flash("RED");
        }
      } else if (direction == "S") {
        let z = scene.getObjectByName(box.name).position.z - 1;
        if (
          !isWall([scene.getObjectByName(box.name).position.x, z]) &&
          z >= l &&
          z <= u
        ) {
          for (let i = 0; i < 51; i++) {
            scene
              .getObjectByName(box.name)
              .rotateX(-(90 * (Math.PI / 180)) / 51);
            scene.getObjectByName(box.name).position.z -= 1 / 51;
            scene.getObjectByName(box.name).position.y =
              Math.sin(i * (Math.PI / 51)) / 2 + 0.45;
            await sleep(2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45));
            // console.log(
            //   (2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45)) * 1000
            // );
          }
          scene.getObjectByName(box.name).position.z =
            Math.ceil(scene.getObjectByName(box.name).position.z) - 0.5;
          scene.getObjectByName(box.name).position.y = 0.45;
          scene.getObjectByName(box.name).rotation.set(0, 0, 0);
          //console.log(`X: ${scene.getObjectByName(box.name).position.x} Y: ${scene.getObjectByName(box.name).position.y} Z: ${scene.getObjectByName(box.name).position.z}`)
        } else {
          flash("RED");
        }
      } else if (direction == "W") {
        let x = scene.getObjectByName(box.name).position.x + 1;
        if (!isWall([x, scene.getObjectByName(box.name).position.z])) {
          for (let i = 0; i < 51; i++) {
            scene
              .getObjectByName(box.name)
              .rotateZ(-(90 * (Math.PI / 180)) / 51);
            scene.getObjectByName(box.name).position.x += 1 / 51;
            scene.getObjectByName(box.name).position.y =
              Math.sin(i * (Math.PI / 51)) / 2 + 0.45;
            await sleep(2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45));
            // console.log(
            //   (2 / (1 / (Math.sin(i * (Math.PI / 51)) / 2) + 0.45)) * 1000
            // );
          }
          scene.getObjectByName(box.name).position.x =
            Math.ceil(scene.getObjectByName(box.name).position.x) - 0.5;
          scene.getObjectByName(box.name).position.y = 0.45;
          scene.getObjectByName(box.name).rotation.set(0, 0, 0);
          //console.log(`X: ${scene.getObjectByName(box.name).position.x} Y: ${scene.getObjectByName(box.name).position.y} Z: ${scene.getObjectByName(box.name).position.z}`);
        } else {
          flash("RED");
        }
      }
    }
  }, []);

  const handleAStar = () => {
    window.dispatchEvent(new KeyboardEvent("keypress", { code: "KeyA" }));
  };

  const handleBFS = () => {
    window.dispatchEvent(new KeyboardEvent("keypress", { code: "KeyB" }));
  };

  const handleClear = () => {
    window.dispatchEvent(new KeyboardEvent("keypress", { code: "KeyC" }));
  };

  return (
    <>
      <button onClick={handleAStar} className="button first-button">
        A*
      </button>
      <button onClick={handleBFS} className="button first-button">
        BFS
      </button>
      <button onClick={handleClear} className="button">
        Clear
      </button>
    </>
  );
};
