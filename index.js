module.exports = swipe;

var util    = require('util'),
    events  = require('events'),
    rattrap = require('rattrap');

// TODO: polyfill
var raf     = window.requestAnimationFrame,
    caf     = window.cancelAnimationFrame;

var EPSILON = 0.0000001;

// TODO: threshold
function Swipe(el, opts) {

    opts = opts || {};

    var self        = this,
        axis        = opts.axis || 'both',
        inertia     = opts.inertia || false,
        friction    = opts.friction || 0.8;

    var afId        = null;

    el.addEventListener('mousedown', function(evt) {

        // cancel inertia
        if (afId) {
            caf(afId);
            afId = null;
        }

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
            afId = raf(function tick() {

                var now = Date.now();

                var x = lastX + (vx * (now - lastT)),
                    y = lastY + (vy * (now - lastT));

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

        var cancel = rattrap.startCapture({
            mousemove: function(evt) {
                handleMove(
                    Date.now(),
                    axis === 'y' ? startX : evt.pageX,
                    axis === 'x' ? startY : evt.pageY
                );
            },
            mouseup: function() {
                if (inertia && (vx || vy)) {
                    setupInertia();
                }
                cancel();
            }
        });

    });

}

util.inherits(Swipe, events.EventEmitter);

function swipe(el, options) {
    return new Swipe(el, options);
}