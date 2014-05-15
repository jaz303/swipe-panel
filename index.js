module.exports = swipe;

var util    = require('util'),
    events  = require('events'),
    rattrap = require('rattrap');

// TODO: polyfill
var raf     = window.requestAnimationFrame.bind(window),
    caf     = window.cancelAnimationFrame.bind(window);

var EPSILON = 0.0000001;

// TODO: threshold
function Swipe(el, opts) {

    opts = opts || {};

    var self        = this,
        axis        = opts.axis || 'both',
        inertia     = opts.inertia || false,
        friction    = opts.friction || 0.8,
        scale       = opts.scale || 1,
        debug       = !!opts.debug,
        touch       = opts.forceTouch ? true : ('ontouchstart' in window);

    if (debug) {
        console.log("swipe-panel:touch", touch);
    }

    var EVT_DOWN, EVT_UP, EVT_MOVE;
    if (touch) {
        EVT_DOWN    = 'touchstart';
        EVT_UP      = 'touchend';
        EVT_MOVE    = 'touchmove';
    } else {
        EVT_DOWN    = 'mousedown';
        EVT_UP      = 'mouseup';
        EVT_MOVE    = 'mousemove';
    }

    var afId        = null;

    el.addEventListener(EVT_DOWN, function(evt) {

        if (debug) {
            console.log("swipe-panel:down", evt);    
        }

        if (touch) {
            var touchId = evt.changedTouches[0].identifier;
        }

        // cancel inertia
        if (afId) {
            caf(afId);
            afId = null;
        }

        self.emit('touchstart');

        var startX  = evt.pageX,
            startY  = evt.pageY,
            startT  = Date.now(),
            lastX   = startX,
            lastY   = startY,
            lastT   = startT,
            vx      = 0,
            vy      = 0;

        function handleMove(now, x, y) {

            var oe = {
                adx : x - startX,
                ady : y - startY,
                adt : now - startT,
                dx  : x - lastX,
                dy  : y - lastY,
                dt  : now - lastT,
            };

            lastX = x;
            lastY = y;
            lastT = now;

            oe.vx = vx = oe.dx / oe.dt;
            oe.vy = vy = oe.dy / oe.dt;

            self.emit('motion', oe);    
        
        }

        function setupInertia() {

            self.emit('inertiastart', {
                vx  : vx,
                vy  : vy
            });

            afId = raf(function tick() {

                var now = Date.now(),
                    dt  = now - lastT,
                    x   = lastX + (vx * dt),
                    y   = lastY + (vy * dt);

                handleMove(now, x, y);

                vx *= friction;
                vy *= friction;

                var vel = Math.sqrt(vx*vx + vy*vy);
                if (vel < EPSILON) {
                    vx = vy = 0;
                } else {
                    afId = raf(tick);
                }

            });
        }

        function gestureOver() {
            self.emit('touchend');
            var moving = Math.sqrt(vx*vx + vy*vy) > EPSILON;
            if (inertia && moving) {
                setupInertia();
            }
        }

        if (touch) {

            // var styleBefore = document.body.style.pointerEvents;
            // document.body.style.pointerEvents = 'none !important';

            function touchMove(evt) {
                
                var touch = evt.changedTouches.identifiedTouch(touchId);
                if (!touch) return;

                if (debug) {
                    console.log("swipe-panel:move", evt);
                }

                evt.stopPropagation();
                evt.preventDefault();

                handleMove(
                    Date.now(),
                    axis === 'y' ? startX : touch.pageX,
                    axis === 'x' ? startY : touch.pageY
                );

            }

            function touchEnd(evt) {

                var touch = evt.changedTouches.identifiedTouch(touchId);
                if (!touch) return;

                if (debug) {
                    console.log("swipe-panel:up", evt);
                }

                evt.stopPropagation();
                evt.preventDefault();

                gestureOver();

                // document.body.style.pointerEvents = styleBefore;

                document.body.removeEventListener('touchmove', touchMove, true);
                document.body.removeEventListener('touchend', touchEnd, true);
            
            }

            document.body.addEventListener('touchmove', touchMove, true);
            document.body.addEventListener('touchend', touchEnd, true);

        } else {

            var hnd = {};
            
            hnd[EVT_MOVE] = function(evt) {

                if (debug) {
                    console.log("swipe-panel:move", evt);
                }

                handleMove(
                    Date.now(),
                    axis === 'y' ? startX : evt.pageX,
                    axis === 'x' ? startY : evt.pageY
                );

            };

            hnd[EVT_UP] = function(evt) {

                if (debug) {
                    console.log("swipe-panel:up", evt);
                }

                gestureOver();
                cancel();

            }

            var cancel = rattrap.startCapture(document, hnd);

        }

    });

}

util.inherits(Swipe, events.EventEmitter);

function swipe(el, options) {
    return new Swipe(el, options);
}