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

    var EVT_DOWN, EVT_UP, EVT_MOVE;
    if ('ontouchstart' in el) {
        EVT_DOWN    = 'touchstart';
        EVT_UP      = 'touchend';
        EVT_MOVE    = 'touchmove';
    } else {
        EVT_DOWN    = 'mousedown';
        EVT_UP      = 'mouseup';
        EVT_MOVE    = 'mousemove';
    }

    var self        = this,
        axis        = opts.axis || 'both',
        inertia     = opts.inertia || false,
        friction    = opts.friction || 0.8,
        scale       = opts.scale || 1;

    var afId        = null;

    el.addEventListener(EVT_DOWN, function(evt) {

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

        var hnd = {};
        
        hnd[EVT_MOVE] = function(evt) {
            handleMove(
                Date.now(),
                axis === 'y' ? startX : evt.pageX,
                axis === 'x' ? startY : evt.pageY
            );
        };

        hnd[EVT_UP] = function() {
            self.emit('touchend');
            var moving = Math.sqrt(vx*vx + vy*vy) > EPSILON;
            if (inertia && moving) {
                setupInertia();
            }
            cancel();
        }

        var cancel = rattrap.startCapture(document, hnd);

    });

}

util.inherits(Swipe, events.EventEmitter);

function swipe(el, options) {
    return new Swipe(el, options);
}