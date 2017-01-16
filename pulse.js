//----------global defaults
const backgroundColor = "rgba(0, 0, 0, 0)";
const nodeSize = 3;
const emptyVector = [0,0];
const rows = 10;
const columns = 10;
const depthRows = 10;
const depthRange = 1000;
const pulseForceConstant = 500;
const pulseForceExponent = 1.2;
const attractionToHome = 0.1;
const attractionExponent = 1;
const terminalVelocity = 10;
const dragStrength = 0.1;
const recurringPulseFrequency = 1;
const modes = ["grid", "space"];
const pulseFrequency = 50;
const pulseBubbleRadius = 20;
const pulseBubbleColor = 'rgba(255, 11, 140, 0.7)';
const recurringPulseBubbleColor = 'rgba(0, 0, 0, 0.7)';
const nodeColor = 'rgba(0, 0, 255, 0.5)';
const pulseTypes = {
    singlePulse : "singlePulse",
    recurringPulse : "recurringPulse"
};

var pulseBubbles = [];
var recurringBubbles = [];
var activeModeIndex = 0;
var grid;
var recurringPulses = [];
var frameCount = 0;



//--------Todo
//--add pulse charging on mouse hold
//--new mode: nodes go into swarm mode towards the mouse
//--new mode: floating in space mode, with boundaries


//=========================
//Setup & draw functions
//=========================
function setup() {
    makeCanvas();
    makeGrid();
    respaceNodes();
}

function makeCanvas(){
    var canvas = createCanvas(($(window).width()), $(window).height(), WEBGL);
    canvas.parent('canvas-background');
};

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
    respaceNodes();
}

function respaceNodes(){
    //space nodes evenly across screen
    for (var col = 0; col < columns; col++){
        for (var row = 0; row < rows; row++){
            for (var depthRow = 0; depthRow < depthRows; depthRow++){
                grid[col][row][depthRow].homeX = $(window).width() / columns * col + $(window).width() / columns * 0.5 - $(window).width() / 2;
                grid[col][row][depthRow].homeY = $(window).height() / rows * row + $(window).height() / rows * 0.5  - $(window).height() / 2;
                grid[col][row][depthRow].homeZ = depthRange / depthRows * depthRow + depthRange / depthRows * 0.5 - depthRange;

                grid[col][row].x = grid[col][row][depthRow].homeX;
                grid[col][row].y = grid[col][row][depthRow].homeY;
                grid[col][row].z = grid[col][row][depthRow].homeZ;
            };
        };
    };
};

function makeGrid(){
    //draw grid of nodes
    grid = new Array(columns);
    for (var col = 0; col < columns; col++){
        grid[col] = new Array(columns);
        for (var row = 0; row < rows; row++){
            grid[col][row] = new Array(depthRows);
            for (var depthRow = 0; depthRow < depthRows; depthRow++){
                grid[col][row][depthRow] = new Node(col, row, depthRow);
            };
        };
    };
};

function draw() {
    frameCount += 1;
    clear();
    // background(backgroundColor);
    noStroke();

    // updatePulseBubbles();
    // if (frameCount % pulseFrequency == 0) {
    //     executeRecurringPulses();
    // };
    drawNodes();
};


//=========================
//Classes
//=========================
var Node = function(column, row, depthRow) {
    this.column = column;
    this.row = row;
    this.depthRow = depthRow;
    this.radius = nodeSize;
    this.homeX = null;
    this.homeY = null;
    this.homeZ = null;
    this.x = null;
    this.y = null;
    this.z = null;
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 0.5;
    this.vector = new Vector(0, -1, 0, 0);
    this.acceleration = 0;
    this.count = 0;

    this.update = function() {
        //move node according to motion vector, draw
        this.accelerate(this.homeX, this.homeY, this.homeZ);
        // this.checkForBoundaries();
        this.x += this.vector.x * this.vector.magnitude;
        this.y += this.vector.y * this.vector.magnitude;
        this.z += this.vector.z * this.vector.magnitude;

        // this.homeX *= 0.999;
        // this.homeY *= 0.999;
        // this.homeZ *= 0.999;

        var translateX = this.x;
        var translateY = this.y;
        var translateZ = this.z;

        translate(translateX ,translateY ,translateZ);
        sphere(this.radius);
        translate(-1 * translateX, -1 * translateY, -1 * translateZ);
        this.count += 1;
    };

    this.accelerate = function(attractionSourceX, attractionSourceY, attractionSourceZ) {
        if (modes[activeModeIndex] == "grid") {
            this.vector = this.findAttractionToHome(attractionSourceX, attractionSourceY, attractionSourceZ);
            this.applyDrag();
        };

        if (this.vector.magnitude < 0.1) {
            this.vector.magnitude = 0;
        } else if (this.vector.magnitude > terminalVelocity) {
            this.vector.magnitude = terminalVelocity;
        };
    };

    this.applyDrag = function() {
        var draggedMagnitude = 0;
        //   if (this.vector.magnitude < 0 && this.vector.magnitude + dragStrength < 0) {
        //       draggedMagnitude = this.vector.magnitude + dragStrength;
        //   } else if (this.vector.magnitude > 0 && this.vector.magnitude - dragStrength > 0) {
        //       draggedMagnitude = this.vector.magnitude - dragStrength;
        //   }

        this.vector.magnitude *= (1 - dragStrength);
            return draggedMagnitude;
    };

    this.findAttractionToHome = function(attractionSourceX, attractionSourceY, attractionSourceZ ) {
        distanceFromHome = findDistance(attractionSourceX, attractionSourceY, attractionSourceZ, this.x, this.y, this.z);
        // if (distanceFromHome < 0.1) {
        //     distanceFromHome = 0.1;
        // };

        var sumVector = this.vector;
        var force = attractionToHome * Math.pow(distanceFromHome, attractionExponent);

        var homeAttractionUnitVector = findUnitVector(this.x, this.y, this.z, attractionSourceX, attractionSourceY, attractionSourceZ);
        var homeAttractionNormalVector = convertUnitToNormalVector(homeAttractionUnitVector, force);

        var nodeUnitVector = findUnitVector(0, 0, 0, this.vector.x, this.vector.y, this.vector.z);
        var nodeNormalVector = convertUnitToNormalVector(nodeUnitVector, this.vector.magnitude);

        sumVector = findUnitVector(
            0,
            0,
            0,
            nodeNormalVector.x + homeAttractionNormalVector.x,
            nodeNormalVector.y + homeAttractionNormalVector.y,
            nodeNormalVector.z + homeAttractionNormalVector.z
        );

        sumVector.magnitude = findDistance(
            0,
            0,
            0,
            nodeNormalVector.x + homeAttractionNormalVector.x,
            nodeNormalVector.y + homeAttractionNormalVector.y,
            nodeNormalVector.z + homeAttractionNormalVector.z
        );

        return sumVector;
    };
};

var RecurringPulse = function(x, y, strength) {
    this.x = x;
    this.y = y;
    this.strength = strength;
    this.execute = function(){
        pulse(this.x, this.y, this.strength);
    };
};

var PulseBubble = function(x, y, radius, type, color) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.type = type;
    this.update = function(){
        ellipse(this.x, this.y, this.radius, this.radius);
        if (this.type == pulseTypes.singlePulse) {
            this.radius -= 1;
            if (this.radius < 1) {
                this.alive = false;
            }
        } else if (this.type == pulseTypes.recurringPulse) {
            if (this.radius > 10) {
                this.radius -= 1;
            };
        };
    };
};

//=========================
//Motion functions
//=========================


function drawNodes(){
    fill(nodeColor);
    for (var col = 0; col < columns; col++){
        for (var row = 0; row < rows; row++){
            for (var depthRow = 0; depthRow < depthRows; depthRow++){
                grid[col][row][depthRow].update();
            };
        };
    };
}

function executeRecurringPulses(){
    for (var i = 0; i < recurringPulses.length; i++) {
        recurringPulses[i].execute();
    }
}

function updatePulseBubbles(){
    for (var i = 0; i < pulseBubbles.length; i++) {
        fill(pulseBubbles[i].color);
        pulseBubbles[i].update();
        if (!pulseBubbles[i].alive) {
            pulseBubbles.splice(i, 1);
        };
    };
};

function pulse(x, y, strength) {
    //push all nodes away from pulse location
    var z = -500;
    for (var col = 0; col < columns; col++){
        for (var row = 0; row < rows; row++){
            for (var depthRow = 0; depthRow < depthRows; depthRow++){
                var node = grid[col][row][depthRow];
                var distance = findDistance(x, y, z, node.x, node.y, node.z);
                var force = strength / Math.pow(distance, pulseForceExponent);

                var pulseUnitVector = findUnitVector(x, y, z, node.x, node.y, node.z);
                var pulseNormalVector = convertUnitToNormalVector(pulseUnitVector, force);

                var nodeUnitVector = findUnitVector(0, 0, 0, node.vector.x, node.vector.y, node.vector.z);
                var nodeNormalVector = convertUnitToNormalVector(nodeUnitVector, node.vector.magnitude);

                var sumVector = findUnitVector(
                    0,
                    0,
                    0,
                    nodeNormalVector.x + pulseNormalVector.x,
                    nodeNormalVector.y + pulseNormalVector.y,
                    nodeNormalVector.z + pulseNormalVector.z
                );

                sumVector.magnitude = findDistance(
                    0,
                    0,
                    0,
                    nodeNormalVector.x + pulseNormalVector.x,
                    nodeNormalVector.y + pulseNormalVector.y,
                    nodeNormalVector.z + pulseNormalVector.z
                );

                node.vector = sumVector;
            };
        };
    };
};

function touchStarted() {
    //set pulse away from mouse click
    if (keyIsPressed && keyCode == 16) {
        pulseBubbles.push(new PulseBubble(mouseX, mouseY, pulseBubbleRadius, pulseTypes.recurringPulse, recurringPulseBubbleColor));
        recurringPulses.push(new RecurringPulse(mouseX, mouseY, pulseForceConstant));
    } else {
        pulseBubbles.push(new PulseBubble(mouseX, mouseY, pulseBubbleRadius, pulseTypes.singlePulse, pulseBubbleColor));
        pulse(mouseX, mouseY, pulseForceConstant);
    };
};

function keyPressed() {
    if (keyCode) {
        switch (keyCode) {
            case 32:
                if (activeModeIndex == modes.length - 1) {
                    activeModeIndex = 0;
                } else {
                    activeModeIndex += 1;
                };
                break;
            case 13:
                console.log("resetting pulses!");
                recurringPulses = [];
                for (var i = 0; i < pulseBubbles.length; i++) {
                    pulseBubbles[i].type = pulseTypes.singlePulse;
                };
                break;
        };
    };
};

//=========================
//Angle functions
//=========================

var Vector = function(x, y, z, magnitude) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.magnitude = magnitude;
};

function findAngle(vector1, vector2) {
    //finds smaller angle between two unit vectors
    var vector1Array = [vector1.x, vector1.y, vector1.z];
    var vector2Array = [vector2.x, vector2.y, vector2.z];

    var angle = math.atan2(
        math.sqrt(
            math.dot(
                math.cross(vector1Array, vector2Array), math.cross(vector1Array, vector2Array)
            )
        ),  math.dot(vector1Array, vector2Array)
    );

    return angle;
};

function findAnglesFromAxes(vector) {
    var xAxis = [1, 0, 0];
    var yAxis = [0, 1, 0];
    var zAxis = [0, 0, 1];

    var xAngle = findAngle(vector, xAxis);
    var yAngle = findAngle(vector, yAxis);
    var zAngle = findAngle(vector, zAxis);

    return [xAngle, yAngle, zAngle];
};

function findUnitVector(x1, y1, z1, x2, y2, z2) {
    //calculates normal vector between two points (in order), converts to unit vector
    var normalVector = new Vector(x2 - x1, y2 - y1, z2 - z1, null);
    var magnitude = sqrt((Math.pow(normalVector.x, 2)) + (Math.pow(normalVector.y, 2)) + (Math.pow(normalVector.z, 2)));
    if (magnitude == 0) {
        var unitVector = new Vector(0, 0, 0, 0);
    } else {
        var unitVector = new Vector(normalVector.x / magnitude, normalVector.y / magnitude, normalVector.z / magnitude, 1);
    };

    return unitVector;
};

function convertUnitToNormalVector(unitVector, magnitude) {
    normalVector = new Vector();
    normalVector.x = unitVector.x * magnitude;
    normalVector.y = unitVector.y * magnitude;
    normalVector.z = unitVector.z * magnitude;
    normalVector.magnitude = magnitude;
    return normalVector;
};

function findDistance(x1, y1, z1, x2, y2, z2) {
    distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
    return distance;
};
