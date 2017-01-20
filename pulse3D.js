//----------global defaults
const backgroundColor = "rgba(0, 0, 0, 1)";
const nodeSize = 3;
const emptyVector = [0,0];
const rows = 10;
const columns = 10;
const depthRows = 10;
const depthRange = 1000;
const pulseForceConstant = 2000;
const pulseForceExponent = 1;
const attractionToHome = 0.05;
const attractionExponent = 1.2;
const terminalVelocity = 20;
const dragStrength = 0.1;
const recurringPulseFrequency = 1;
const modes = ["grid", "space"];
const pulseFrequency = 50;
const defaultDepth = 0;
const pulseBubbleRadius = 10;
const pulseBubbleColor = 'rgba(255, 11, 140, 0.7)';
const recurringPulseBubbleColor = 'rgba(0, 0, 0, 0.7)';
const nodeColor = 'rgba(255, 20, 100, 0.9)';
const pulseTypes = {
    singlePulse : "singlePulse",
    recurringPulse : "recurringPulse"
};

var pulseBubbles = [];
var activePulseBubble = null;
var pulseBubblePreviews = [];
var recurringBubbles = [];
var activeModeIndex = 0;
var grid;
var recurringPulses = [];
var frameCount = 0;
var lightZ = 1000;



//--------Todo
//--new mode: nodes go into swarm mode towards the mouse


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
    //space nodes evenly in cube
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
    //draw 3D grid of nodes
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
    background(backgroundColor);
    noStroke();
    ambientLight(100);
    pointLight(250, 100, 100, 1500, 600, lightZ - 500);
    pointLight(250, 100, 250, -1000, -600, lightZ);

    updatePulseBubbles();
    if (frameCount % pulseFrequency == 0) {
        executeRecurringPulses();
    };
    if (activePulseBubble) {

    };
    specularMaterial(250, 100, 250);
    drawNodes();
};


//=========================
//Classes
//=========================
var Node = function(column, row, depthRow) {
    //sphere in grid
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
    this.vector = new Vector(0, -1, 0, 0);

    this.update = function() {
        //move node according to motion vector, draw
        this.accelerate(this.homeX, this.homeY, this.homeZ);
        this.x += this.vector.x * this.vector.magnitude;
        this.y += this.vector.y * this.vector.magnitude;
        this.z += this.vector.z * this.vector.magnitude;

        var translateX = this.x;
        var translateY = this.y;
        var translateZ = this.z;

        translate(translateX ,translateY ,translateZ);
        sphere(this.radius);
        translate(-1 * translateX, -1 * translateY, -1 * translateZ);
    };

    this.accelerate = function(attractionSourceX, attractionSourceY, attractionSourceZ) {
        if (modes[activeModeIndex] == "grid") {
            //slow down nodes so that they eventually stop oscillating
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
        this.vector.magnitude *= (1 - dragStrength);
    };

    this.findAttractionToHome = function(attractionSourceX, attractionSourceY, attractionSourceZ ) {
        //calculate force towards home point in 3D grid
        distanceFromHome = findDistance(attractionSourceX, attractionSourceY, attractionSourceZ, this.x, this.y, this.z);

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

var RecurringPulse = function(x, y, z, strength, bubble) {
    //define recurring pulse location and strength
    this.x = x;
    this.y = y;
    this.z = z;
    this.bubble = bubble;
    this.strength = strength;
    this.execute = function(){
        pulse(this.x, this.y, this.z, this.strength);
        this.bubble.radius = 20;
    };
};

var PulseBubble = function(x, y, z, radius, type) {
    //preview of pulse
    this.alive = true;
    this.released = false;
    this.dying = false;
    this.x = x;
    this.y = y;
    this.z = z;
    this.opacity = 0.7;
    this.radius = radius;
    this.type = type;
    this.update = function(){
        var translateX = this.x;
        var translateY = this.y;
        var translateZ = this.z;
        if (this.type == pulseTypes.singlePulse) {
            specularMaterial(100, 250, 250);
        } else {
            specularMaterial(250, 250, 100);
        }
        translate(translateX, translateY, translateZ);
        sphere(this.radius);
        translate(-1 * translateX, -1 * translateY, -1 * translateZ);

        if (!this.released) {
            //allow for choice of depth while touch is held
            this.z -= 10;
        } else {
            //single pulses expand once and then fade
            //recurring pulses expand and then fade back to default size
            if (this.type == pulseTypes.singlePulse) {
                if (!this.dying) {
                    this.radius = 20;
                };
                this.dying = true;
                this.radius -= 1;
                if (this.radius < 1) {
                    this.alive = false;
                }
            } else if (this.type == pulseTypes.recurringPulse) {
                if (this.radius > pulseBubbleRadius) {
                    this.radius -= 1;
                }
            };
        };
    };
};

//=========================
//Motion/update functions
//=========================
function drawNodes(){
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
        pulseBubbles[i].update();
        if (!pulseBubbles[i].alive) {
            pulseBubbles.splice(i, 1);
        };
    };
};

function pulse(x, y, z, strength) {
    //push all nodes away from pulse location
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
    //begin pulse preview
    var canvasX = (mouseX - $(window).width() / 2) * 0.8;
    var canvasY = (mouseY - $(window).height() / 2) * 0.8;
    var depth = defaultDepth;
    var type = null;
    if (keyIsPressed && keyCode == 16) {
        type = pulseTypes.recurringPulse;
    } else {
        type = pulseTypes.singlePulse;
    };
    activePulseBubble = new PulseBubble(canvasX, canvasY, depth, pulseBubbleRadius, type);
    pulseBubbles.push(activePulseBubble);
};

function touchEnded() {
    //define pulse
    var canvasX = activePulseBubble.x;
    var canvasY = activePulseBubble.y;
    var canvasZ = activePulseBubble.z;

    activePulseBubble.released = true;
    //set pulse away from mouse click
    if (activePulseBubble.type == pulseTypes.recurringPulse) {
        recurringPulses.push(new RecurringPulse(canvasX, canvasY, canvasZ, pulseForceConstant, activePulseBubble));
    } else {
        pulse(canvasX, canvasY, canvasZ, pulseForceConstant);
    };
    activePulseBubble = null;

};

function keyPressed() {
    //mode switching, recurring pulse reset
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
