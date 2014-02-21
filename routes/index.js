
exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

var villes = require('../villes.json');
exports.display = function(req, res){
	if (villes[req.params.ville]) {
		var villesRefined = [];
		for(var key in villes) {
			if (key != req.params.ville) {
				var ville = villes[key];
				ville.slug = key;
				villesRefined.push(ville);
			}
		}

		var ville = villes[req.params.ville];
		ville.slug = req.params.ville;
		res.render('display', {
			villes: villesRefined
			, ville: ville
			, nbVilles: villesRefined.length
		});
	} else {
		res.send(404);
	}
};