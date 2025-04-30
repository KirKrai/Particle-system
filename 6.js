import SparkleVS from "./shaders/bengal/SparkleVS.js";
import SparkleFS from "./shaders/bengal/SparkleFS.js";
import TrackVS from "./shaders/bengal/TrackVS.js";
import TrackFS from "./shaders/bengal/TrackFS.js";

import FireColorVS from "./shaders/firework/FireColorVS.glsl";
import FireColorFS from "./shaders/firework/FireColorFS.glsl";

import SmokeVS from "./shaders/smoke/SmokeVS.glsl";
import SmokeFS from "./shaders/smoke/SmokeFS.glsl";


import fog from "./Image/fog.png";
import sparkle from "./Image/sparkle.png";

import snowFS from "./shaders/snow/snowFS.glsl";
import snowVS from './shaders/snow/snowVS.glsl';
import snow_texture from "./Image/snow.png";


import * as glm from "gl-matrix"

let gl; // глобальная переменная для контекста WebGL
let canvas;

let isBengal = 1, isSmoke = 0, isFirework = 0; //включение нач
let isSnow=0;

function initWebGL(canvas) {
    lgl = null;
    try { 
    gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {}
    if (!gl) { 
    alert("Не удалось инициализировать WebGL. Ваш браузер может не поддерживать это.");
    gl = null;
    }

    // gl.SRC_ALPHA - рисуемая искра умножается на прозрачный канал, чтобы убрать фон
    // изображения. gl.ONE - уже нарисованные искры остаются без изменений
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    return gl;
}

function start() {
    canvas = document.getElementById("glcanvas");

    gl = initWebGL(canvas);      // инициализация контекста GL

    // продолжать только если WebGL доступен и работает

    if (gl) {
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // установить в качестве цвета очистки буфера цвета зеленый, полная непрозрачность
        gl.enable(gl.DEPTH_TEST);                               // включает использование буфера глубины
        gl.depthFunc(gl.LEQUAL);                                // определяет работу буфера глубины: более ближние объекты перекрывают дальние
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // очистить буфер цвета и буфер глубины.
    }
}

function initShaderProgram(vsSource, fsSource) {

    let shaderProgram;

    const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('UНе удается инициализировать шейдерную программу: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(type, source) {
    const shader = gl.createShader(type);
    // Send the source to the shader object
    gl.shaderSource(shader, source);
    // Compile the shader program
    gl.compileShader(shader);
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('Произошла ошибка при компиляции шейдеров: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function Spark() {
    this.init();
}

// количество искр
Spark.sparksCount = 500;

function mainBengal(){
    initWebGL(canvas);
    Spark.prototype.init = function (){
        // время создания искры
        this.timeFromCreation = performance.now();

        // задаём направление полёта искры в градусах, от 0 до 360
        const angle = Math.random() * 360;
        // радиус - это расстояние, которое пролетит искра
        const radius = Math.random()*2;
        // отмеряем точки на окружности - максимальные координаты искры
        this.xMax = Math.cos(angle) * radius;
        this.yMax = Math.sin(angle) * radius;

        // dx и dy - приращение искры за вызов отрисовки, то есть её скорость,
        // у каждой искры своя скорость. multiplier подобран экспериментально
        const multiplier = 125 + Math.random() * 125;
        this.dx = this.xMax / multiplier;
        this.dy = this.yMax / multiplier;

        // Для того, чтобы не все искры начинали движение из начала координат,
        // делаем каждой искре свой отступ, но не более максимальных значений.
        this.x = (this.dx * 1000) % this.xMax;
        this.y = (this.dy * 1000) % this.yMax;
    }

    Spark.prototype.move = function (time) {
        // находим разницу между вызовами отрисовки, чтобы анимация работала
        // одинаково на компьютерах разной мощности
        const timeShift = time - this.timeFromCreation;
        this.timeFromCreation = time;

        // приращение зависит от времени между отрисовками
        const speed = timeShift*0.2;
        this.x += this.dx * speed;
        this.y += this.dy * speed;

        // если искра достигла конечной точки, запускаем её заново из начала координат
        if (Math.abs(this.x) > Math.abs(this.xMax) || Math.abs(this.y) > Math.abs(this.yMax)) {
            this.init();
        }
    };

    // инициализация программы следов искр
    let programTrack = initShaderProgram(TrackVS, TrackFS);

    const positionAttributeLocationTrack = gl.getAttribLocation(programTrack, "a_position");
    const colorAttributeLocationTrack = gl.getAttribLocation(programTrack, "a_color");
    const pMatrixUniformLocationTrack = gl.getUniformLocation(programTrack, "u_pMatrix");
    const mvMatrixUniformLocationTrack = gl.getUniformLocation(programTrack, "u_mvMatrix");

    // инициализация программы искр
    let programSpark = initShaderProgram(SparkleVS, SparkleFS);

    const positionAttributeLocationSpark = gl.getAttribLocation(programSpark, "a_position");
    const textureLocationSpark = gl.getUniformLocation(programSpark, "u_texture");
    const pMatrixUniformLocationSpark = gl.getUniformLocation(programSpark, "u_pMatrix");
    const mvMatrixUniformLocationSpark = gl.getUniformLocation(programSpark, "u_mvMatrix");

    const texture = gl.createTexture();

    const image = new Image();
    image.src = sparkle;
    image.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(drawScene);
    });

    const mvMatrix = glm.mat4.create();
    const pMatrix = glm.mat4.create();

    function drawTracks(positions) {
        const colors = [];
        const positionsFromCenter = [];
        for (let i = 0; i < positions.length; i += 3) {
            // для каждой координаты добавляем точку начала координат, чтобы получить след искры
            positionsFromCenter.push(0, 0, 0);
            positionsFromCenter.push(positions[i], positions[i + 1], positions[i + 2]);

            // цвет в начале координат будет белый (горячий), а дальше будет приближаться к оранжевому
            colors.push(0, 0, 0, 0.47, 0.31, 0.24);
        }

        gl.useProgram(programTrack);

        gl.uniformMatrix4fv(pMatrixUniformLocationTrack, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationTrack, false, mvMatrix);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionsFromCenter), gl.STATIC_DRAW);

        gl.vertexAttribPointer(positionAttributeLocationTrack, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttributeLocationTrack);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        gl.vertexAttribPointer(colorAttributeLocationTrack, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorAttributeLocationTrack);

        gl.drawArrays(gl.LINES, 0, positionsFromCenter.length / 3);
    }

    function drawSparks(positions) {
        gl.useProgram(programSpark);

        gl.uniformMatrix4fv(pMatrixUniformLocationSpark, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationSpark, false, mvMatrix);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocationSpark, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.vertexAttribPointer(positionAttributeLocationSpark, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(positionAttributeLocationSpark);

        gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    }

    const sparks = [];
    for (let i = 0; i < Spark.sparksCount; i++) {
        sparks.push(new Spark());
    }

    function drawScene(now) {

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glm.mat4.perspective(pMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
        glm.mat4.identity(mvMatrix);
        glm.mat4.translate(mvMatrix, mvMatrix, [0, 0, -3.5]);

        for (let i = 0; i < sparks.length; i++) {
            sparks[i].move(now);
        }

        const positions = [];
        sparks.forEach(function(item, i, arr) {
            positions.push(item.x);
            positions.push(item.y);
            // искры двигаются только в одной плоскости xy
            positions.push(0);
        });

        drawTracks(positions);
        drawSparks(positions);

        if (isBengal === 1) requestAnimationFrame(drawScene);
    }
}

function Smoke() {
    this.init();
}

// количество частиц дыма
//Smoke.sparksCount = 500;
Smoke.sparksCount = 50;

function mainSmoke() {
    initWebGL(canvas);
    Smoke.prototype.init = function() {
        // время создания искры
        this.timeFromCreation = performance.now();

        // радиус - это расстояние, которое пролетит искра
        const radius = Math.random();
        // отмеряем точки на окружности - максимальные координаты искры
        this.xMax = radius * 2;
        this.yMax = radius * 5;

        this.direct = Math.random() * 2 - 1;

        // dx и dy - приращение искры за вызов отрисовки, то есть её скорость,
        // у каждой искры своя скорость. multiplier подобран экспериментально
        const multiplier = 6000 + Math.random() * 6000;
        this.dx = this.xMax / multiplier;
        this.dy = this.yMax / multiplier;

        // Для того, чтобы не все искры начинали движение из начала координат,
        // делаем каждой искре свой отступ, но не более максимальных значений.
        this.x = (this.dx * 20) % this.xMax;
        this.y = (this.dy * 20) % this.yMax;
    };

    Smoke.prototype.move = function(time) {
        const timeShift = time - this.timeFromCreation;
        this.timeFromCreation = time;
        if(this.direct < 0)
        {
            this.x += this.dx * timeShift;
            this.y = Math.pow(Math.abs(this.direct) * 0.8, this.x) - 0.5;
        }
        else {
            this.x -= this.dx * timeShift;
            this.y = Math.pow(this.direct * 6, this.x) - 0.5;
        }
        // приращение зависит от времени между отрисовками

        // если искра достигла конечной точки, запускаем её заново из начала координат
        if (Math.abs(this.x) > Math.abs(this.xMax) || Math.abs(this.y) > Math.abs(this.yMax)) {
            this.init();
        }
    };

    let programSmoke = initShaderProgram(SmokeVS, SmokeFS);

    const positionAttributeLocationSpark = gl.getAttribLocation(programSmoke, "a_position");
    const textureLocationSpark = gl.getUniformLocation(programSmoke, "u_texture");
    const pMatrixUniformLocationSpark = gl.getUniformLocation(programSmoke, "u_pMatrix");
    const mvMatrixUniformLocationSpark = gl.getUniformLocation(programSmoke, "u_mvMatrix");

    const texture = gl.createTexture();

    const image = new Image();
    image.src = fog;
    image.addEventListener('load', function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(drawScene);
    });

    const mvMatrix = glm.mat4.create();
    const pMatrix = glm.mat4.create();

    function drawSmoke(positions) {
        gl.useProgram(programSmoke);

        gl.uniformMatrix4fv(pMatrixUniformLocationSpark, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationSpark, false, mvMatrix);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocationSpark, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.vertexAttribPointer(positionAttributeLocationSpark, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(positionAttributeLocationSpark);

        gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    }

    const smokes = [];
    for (let i = 0; i < Smoke.sparksCount; i++) {
        smokes.push(new Smoke());
    }

    function drawScene(now) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glm.mat4.perspective(pMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
        glm.mat4.identity(mvMatrix);
        glm.mat4.translate(mvMatrix, mvMatrix, [0, 0, -3.5]);

        for (let i = 0; i < smokes.length; i++) {
            smokes[i].move(now);
        }

        const positions = [];
        smokes.forEach(function (item, i, arr) {
            positions.push(item.x);
            positions.push(item.y);
            // искры двигаются только в одной плоскости xy
            positions.push(0);
        });

        drawSmoke(positions);

        if (isSmoke === 1) requestAnimationFrame(drawScene);
    }
}

function Firework() {
    Firework.prototype.init = function (rad = 1, xAlign = 0, yAlign = 0, isAlive = 1) {
        // время создания искры
        this.timeFromCreation = performance.now();

        this.Alive = isAlive;

        this.xStart = xAlign;
        this.yStart = yAlign;

        // задаём направление полёта искры в градусах, от 0 до 360
        const angle = Math.random() * 2 * Math.PI;
        // радиус - это расстояние, которое пролетит искра
        //const radius = Math.floor(Math.random() * 2) + 1;
        const radius = (Math.random() * 0.5 + 1) * rad;
        // отмеряем точки на окружности - максимальные координаты искры
        this.xMax = Math.cos(angle) * radius;
        this.yMax = Math.sin(angle) * radius;

        this.color=[Math.random(),Math.random(),Math.random(),1];

        // dx и dy - приращение искры за вызов отрисовки, то есть её скорость,
        // у каждой искры своя скорость. multiplier подобран экспериментально
        const multiplier = (500 + Math.random() * 125) * isAlive * rad;
        this.dx = this.xMax / multiplier;
        this.dy = this.yMax / multiplier;

        // Для того, чтобы не все искры начинали движение из начала координат,
        // делаем каждой искре свой отступ, но не более максимальных значений.
        this.x = (this.dx * 10) % this.xMax + this.xStart;
        this.y = (this.dy * 10) % this.yMax + this.yStart;
    };
    Firework.prototype.move = function (time) {
        // находим разницу между вызовами отрисовки, чтобы анимация работала
        // одинаково на компьютерах разной мощности
        const timeShift = time - this.timeFromCreation;
        this.timeFromCreation = time;

        // приращение зависит от времени между отрисовками
        const speed = timeShift*0.5;
        this.x += this.dx * speed;
        this.y += this.dy * speed;

        // если искра достигла конечной точки, запускаем её заново из начала координат
        if (Math.abs(this.x - this.xStart) > Math.abs(this.xMax) || Math.abs(this.y - this.yStart) > Math.abs(this.yMax)) {
            this.init( 0,0,0, 0);
        }
    };
    this.init();
}

function FireworkCircle(){
    FireworkCircle.prototype.init = function(){
        this.pos = [Math.random() * 2 - 1, Math.random() * 2 - 1];
        this.radius = Math.random() * 0.7 + 0.5;
        this.Fireworks = [];
        for(let i = 0; i < Firework.sparksCount; ++i){
            this.Fireworks.push(new Firework());
        }
        this.Fireworks.forEach(elem =>{
            elem.init(this.radius, this.pos[0], this.pos[1]);
        })
    };

    FireworkCircle.prototype.move = function(now){
        let isWorking = 0;
        this.Fireworks.forEach(item => {
            item.move(now);
            if(item.Alive === 1){
                isWorking = 1;
            }
        })
        if(isWorking === 0){
            this.init();
        }
    };

    this.init();
}

// количество искр
Firework.sparksCount = 150;
FireworkCircle.count = 3;

function mainFire() {

    initWebGL(canvas);

    let programTrack = initShaderProgram(TrackVS, TrackFS);

    // инициализация программы следов искр

    const positionAttributeLocationTrack = gl.getAttribLocation(programTrack, "a_position");
    const colorAttributeLocationTrack = gl.getAttribLocation(programTrack, "a_color");
    const pMatrixUniformLocationTrack = gl.getUniformLocation(programTrack, "u_pMatrix");
    const mvMatrixUniformLocationTrack = gl.getUniformLocation(programTrack, "u_mvMatrix");

    let programColorFirework = initShaderProgram(FireColorVS, FireColorFS);

    // инициализация программы следов для цветных фейерверков

    const positionAttributeLocationFirework = gl.getAttribLocation(programColorFirework, "a_position");
    const colorAttributeLocationFirework = gl.getAttribLocation(programColorFirework, "a_color");
    const pMatrixUniformLocationFirework = gl.getUniformLocation(programColorFirework, "u_pMatrix");
    const mvMatrixUniformLocationFirework = gl.getUniformLocation(programColorFirework, "u_mvMatrix");
    const textureLocationSpark = gl.getUniformLocation(programColorFirework, "u_texture");
    const SizeFirework = gl.getUniformLocation(programColorFirework, "aVertexSize");

    const texture = gl.createTexture();

    const image = new Image();
    image.src = sparkle;
    image.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(drawScene);
    });

    const mvMatrix = glm.mat4.create();
    const pMatrix = glm.mat4.create();

    function drawColorFire(positions,color) {
        gl.useProgram(programColorFirework);
        const particleVertexPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexPosBuffer);
        gl.vertexAttribPointer(positionAttributeLocationFirework, 3, gl.FLOAT, false, 0, 0);

        const particleVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexColorBuffer);
        gl.vertexAttribPointer(colorAttributeLocationFirework, 4, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(pMatrixUniformLocationFirework, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationFirework, false, mvMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocationSpark, 0);

        gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    }
    function drawTracks(pos, positions, color) {
        const colors = [];
        const positionsFromCenter = [];
        for (let i = 0; i < positions.length; i += 3) {
            // для каждой координаты добавляем точку начала координат, чтобы получить след искры
            positionsFromCenter.push(pos[0], pos[1], 0);
            positionsFromCenter.push(positions[i], positions[i + 1], positions[i + 2]);

            // цвет в начале координат будет белый (горячий), а дальше будет приближаться к оранжевому
            colors.push(0, 0, 0, color[i], color[i + 1], color[i + 2]);
        }

        gl.useProgram(programTrack);

        gl.uniformMatrix4fv(pMatrixUniformLocationTrack, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationTrack, false, mvMatrix);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionsFromCenter), gl.STATIC_DRAW);

        gl.vertexAttribPointer(positionAttributeLocationTrack, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttributeLocationTrack);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        gl.vertexAttribPointer(colorAttributeLocationTrack, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorAttributeLocationTrack);

        gl.drawArrays(gl.LINES, 0, positionsFromCenter.length / 3);
    }

    const fires = [];
    for(let i = 0; i < FireworkCircle.count; ++i){
        fires.push(new FireworkCircle());
    }

    function drawScene(now) {

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glm.mat4.perspective(pMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
        glm.mat4.identity(mvMatrix);
        glm.mat4.translate(mvMatrix, mvMatrix, [0, 0, -3.5]);

        fires.forEach(function (item, i, arr){

            item.Fireworks.forEach(function(item2, i, arr) {
                item.move(now);
            });

            const positions = [];
            item.Fireworks.forEach(function(item2, i, arr) {
                positions.push(item2.x);
                positions.push(item2.y);
                // искры двигаются только в одной плоскости xy
                positions.push(0);
            });

            const color = [];
            item.Fireworks.forEach(function(item2, i, arr) {
                color.push(item2.color[0]);
                color.push(item2.color[1]);
                color.push(item2.color[2]);
                color.push(item2.color[3]);
            });

            const positionCenter = [];
            item.Fireworks.forEach(function(item2, i, arr) {
                positionCenter.push(item.pos[0]);
                positionCenter.push(item.pos[1]);
            });

            drawTracks(positionCenter, positions, color);
            drawColorFire(positions, color);
        })

        if (isFirework === 1) requestAnimationFrame(drawScene);
    }
}

//
function Snow() {
    this.init();
}

// количество частиц дыма
Snow.sparksCount = 100; //было 50 , 100

function mainSnow() {
    initWebGL(canvas);
    Snow.prototype.init = function() {
        // время создания снежинки
        this.timeFromCreation = performance.now();


        // задаем начальные координаты
        const startX = Math.random() * 8 - 4;// генерируем случайное значение по ширине окна
        const startY = Math.random() * (4 - 2) + 2; // снежинка падает сверху, поэтому стартовое значение по y должно быть отрицательным


        // отмеряем точки на окружности - максимальные координаты искры
        const yMax = -5; //-2 , -5, -10, положительные не писать

        // скорость падения снежинки
        const speed = -0.001 - Math.random() * 0.001; //можно поиграться

        // максимальное смещение по оси x
        const xMaxOffset = 0.001 + Math.random() * 0.00001; //можно сменить на целые цисла

        // скорость изменения смещения по оси x
        const xChangeSpeed = Math.random() * -0.000002;

        this.size = Math.floor(Math.random() * (8 - 4 + 1)) + 4; //окргул в меньшую сторону . можно и целое вписать, но будет одинк размер 
        // начальное смещение по оси x
        this.xOffset = 0;

        // сохраняем стартовые координаты
        this.x = startX;
        this.y = startY;

        // сохраняем максимальное значение по y
        this.yMax = yMax;

        // сохраняем скорость
        this.speed = speed;

        // сохраняем максимальное смещение по оси x
        this.xMaxOffset = xMaxOffset;
        
        // сохраняем скорость изменения смещения по оси x
        this.xChangeSpeed = xChangeSpeed;


        ///////
    };

    Snow.prototype.move = function(time) {
        // находим разницу между вызовами отрисовки, чтобы анимация работала
        // одинаково на компьютерах разной мощности
        const timeShift = time - this.timeFromCreation;
        this.timeFromCreation = time;

        // приращение по y зависит от времени между отрисовками и скорости снежинки
        const ySpeed = this.speed;
        this.y += ySpeed;

        if (Math.abs(this.xOffset) > this.xMaxOffset) {
            this.xOffset = -this.xOffset;
        }

        const x = this.x + this.xOffset;
    
        // если снежинка достигла конечной точки по y, начинаем падать вновь
        if (this.y < this.yMax) {
            this.init();
        }
    
        // сохраняем новые координаты
        this.x = x;
        this.y = this.y;

        
    };

    let programSnow = initShaderProgram(snowVS, snowFS);

    const positionAttributeLocationSnow = gl.getAttribLocation(programSnow, "a_position");
    const textureLocationSnow = gl.getUniformLocation(programSnow, "u_texture");
    const pMatrixUniformLocationSnow = gl.getUniformLocation(programSnow, "u_pMatrix");
    const mvMatrixUniformLocationSnow = gl.getUniformLocation(programSnow, "u_mvMatrix");
    const spriteSize = gl.getUniformLocation(programSnow, "u_pSize");

    const texture = gl.createTexture();

    const image = new Image();
    image.src = snow_texture;
    image.addEventListener('load', function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(drawScene);
    });

    const mvMatrix = glm.mat4.create();
    const pMatrix = glm.mat4.create();

    function drawSnow(positions, size) {
        gl.useProgram(programSnow);

        gl.uniformMatrix4fv(pMatrixUniformLocationSnow, false, pMatrix);
        gl.uniformMatrix4fv(mvMatrixUniformLocationSnow, false, mvMatrix);
        gl.uniform1f(spriteSize, size);


        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocationSnow, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.vertexAttribPointer(positionAttributeLocationSnow, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(positionAttributeLocationSnow);

        gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    }

    const snows = [];
    for (let i = 0; i < Snow.sparksCount; i++) {
        snows.push(new Snow());
    }

    function drawScene(now) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glm.mat4.perspective(pMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
        glm.mat4.identity(mvMatrix);
        glm.mat4.translate(mvMatrix, mvMatrix, [0, 0, -3.5]);// -3.5

        for (var i = 0; i < snows.length; i++) {
            snows[i].move(now);
        }

        const positions = [];
        snows.forEach(function (item, i, arr) {
            positions.push(item.x);
            positions.push(item.y);
            // искры двигаются только в одной плоскости xy
            positions.push(item.size);
        });

        drawSnow(positions,4.0);

        if (isSnow === 1) requestAnimationFrame(drawScene);
    }
}


document.getElementById('Bengal').onclick = () => {
        isBengal = 1;
        isSmoke = 0;
        isFirework = 0;
        isSnow=0;
       
        mainBengal();
        console.log("isBengal=", isBengal, " isSmoke=", isSmoke, " isFire=", isFirework);
}

document.getElementById('Fire').onclick = () => {
    isBengal = 0;
    isSmoke = 0;
    isFirework = 1;
    isSnow=0;
    
    mainFire();
    console.log("isBengal=",isBengal," isSmoke=",isSmoke," isFire=",isFirework);
}

document.getElementById('Smoke').onclick = () => {
    isBengal = 0;
    isSmoke = 1;
    isFirework = 0;
    isSnow=0;
    
    mainSmoke();
    console.log("isBengal=",isBengal," isSmoke=",isSmoke," isFire=",isFirework);
}

document.getElementById('Snow').onclick = () => {
    isBengal = 0;
    isSmoke = 0;
    isFirework = 0;
    isSnow=1;
    
    mainSnow();
    //console.log("isBengal=",isBengal," isSmoke=",isSmoke," isFire=",isFirework);
}

function main() {
    start();
}

main();