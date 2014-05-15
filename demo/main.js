var swipe = require('../');

window.init = function() {

	var panel = swipe(document.getElementById('target-1'), {
		debug: true,
		inertia: true,
		axis: 'y'
	});

	panel.on('motion', function(evt) {
		console.log(evt);
	});

}