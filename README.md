# Civil-Builder
A game where you make a bridge for your truck to go over without the bridge collapsing, also you have a limited budget for materials

The game runs on a single render loop (frame()) driven by requestAnimationFrame, redrawing the entire canvas ~60 times a second. All game logic works in meters and is converted to pixels at draw time via px()/py(), so the world scales to any screen size.
