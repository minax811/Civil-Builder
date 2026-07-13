# Civil-Builder
A game where you make a bridge for your truck to go over without the bridge collapsing, also you have a limited budget for materials
The game runs on a single render loop (frame()) driven by requestAnimationFrame, redrawing the entire canvas ~60 times a second. All game logic works in meters and is converted to pixels at draw time via px()/py(), so the world scales to any screen size.

# Game Objective
Make it across the lake by building a bridge uisng roads and struts, The distance between the 2 platforms in level 1 is 5 metres and in level 2 is 10 metres, the max length a road or a strut can go is 2.5 m so you have to join together multiple roads and struts to connect the bridge and then your struts should be positioned such that they disturbute the load weight of the vehicle that passes over them

# Game Features
* Load-bearing structures
* Breakable beams and struts
* real time stress displayer(turns green when low to 0 stress, turns yellow when medium stress, turns red at high stress)
* 2 Materials road and strut both costing different
* Beams snap into place
* Budget system, player gets limited money for each level
* Undo tool, undos last thing done
* clear tool, clears the whole canvas
* Test drive, puts you in no build mode and drives a car across your bridge
* Pixel to metres converter

# How to edit file
1. Download the github repository and unzip it
2. Load it into vs code
3. install the live server extensions to see the realtime changes you make to the code

# How to play the game
* A) Download the github repository and double click to open the file
* B) just press this demo link  https://minax811.github.io/Civil-Builder/

# Author
-Minax811
