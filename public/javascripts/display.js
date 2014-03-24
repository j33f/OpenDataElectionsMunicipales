/*jslint browser: true, devel: true, todo: true, laxcomma: true */
var map;
var tilesLayer;
var geoJsonLayer = null;
var colors = [];
var count = -1;
var dataStore = {};

$(function() {
	resizeAndPosition();
	createMap('map');
	$(window).on('resize', resizeAndPosition);

	$('#showMap').click(function(){
		if(!$(this).parent().hasClass('active')) {
			$(this).parent().addClass('active');
			$('#showData').parent().removeClass('active');
			$('#showAbout').parent().removeClass('active');
			$('#map').css({
				'top': $('nav.navbar').outerHeight()
				, 'z-index': 500
			});
			$('#data, #about').css({
				'top': $(window).height()
				, 'z-index': 0
			});		

		}
		return false;
	});
	$('#showData').click(function(){
		if(!$(this).parent().hasClass('active')) {
			$(this).parent().addClass('active');
			$('#showMap').parent().removeClass('active');
			$('#showAbout').parent().removeClass('active');
			$('#data').css({
				'top': $('nav.navbar').outerHeight()
				, 'z-index': 500
			});
			$('#map').css({
				'top': $(window).height()
				, 'z-index': 0
			});		
			$('#about').css({
				'top': $(window).height()
				, 'z-index': 0
			});		
		}
		return false;
	});
	$('#showAbout').click(function(){
		if(!$(this).parent().hasClass('active')) {
			$(this).parent().addClass('active');
			$('#showMap').parent().removeClass('active');
			$('#showData').parent().removeClass('active');
			$('#about').css({
				'top': $('nav.navbar').outerHeight()
				, 'z-index': 500
			});
			$('#map, #data').css({
				'top': $(window).height()
				, 'z-index': 0
			});
		}
		return false;
	});	
});

// set sizes #map and #data divs
function resizeAndPosition(e) {
	$('#map, #data, #about').css({
		'width': '100%'
		, 'height': $(window).height() - $('nav.navbar').outerHeight()
		, 'top': $(window).height()
	});
	if($('#showMap').parent().hasClass('active')) {
		$('#map').css({
			'top': $('nav.navbar').outerHeight()
			, 'z-index': 500
		});
		$('#data, #about').css({
			'top': $(window).height()
			, 'z-index': 0
		});		
	} else if($('#showData').parent().hasClass('active')) {
		$('#data').css({
			'top': $('nav.navbar').outerHeight()
			, 'z-index': 500
		});
		$('#map, #about').css({
			'top': $(window).height()
			, 'z-index': 0
		});		
	} else {
		$('#about').css({
			'top': $('nav.navbar').outerHeight()
			, 'z-index': 500
		});
		$('#map, #data').css({
			'top': $(window).height()
			, 'z-index': 0
		});		
	}

	// needed to avoid some strange behaviours
	window.setTimeout(resizeAndPosition,200);
}

// createthe map with the given mapId
function createMap(mapId) {
	map = L.map(mapId).setView(ville.mapCenter, ville.zoom);
	tilesLayer = L.tileLayer(
		'http://{s}.tile.cloudmade.com/74e074c478d74fc29d8af4e440b3680e/58557/256/{z}/{x}/{y}.png'
		, {
			attribution: 'Données cartographiques &copy; contributeurs <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tuiles © <a href="http://cloudmade.com">CloudMade</a>, Design by <a href="http://modulaweb.fr">Modulaweb</a>'
			, maxZoom: 16
			, minZoom: 10
		}
	).addTo(map);
	// we have a tiles layer, lets load the data
	loadData();
}

// load the data from the geojson file at geoJsonUrl and create a layer with them
function loadData() {
	$.get(
		ville.geoJson
		, function(data) {
			// delete the current layer if any
			if (geoJsonLayer !== null) {
				map.removeLayer(geoJsonLayer);
			}
			// store the data
			dataStore = data.features;
			// create the layer
			geoJsonLayer = L.geoJson(
				data
				, {
					style: setStyle
					, onEachFeature: onEachFeature
				}
			).addTo(map);
			// add attributions for the data
			map.attributionControl.addAttribution('Données électorales <a href="'+ville.attributions.url+'">'+ville.attributions.nom+'</a>');
			// set the map viewport to the data bounds and fix the zoom
			// setTimeout is needed as leaflet adds some effects, we need to stand by those effects to finish before to change things
			window.setTimeout(function(){
				map.fitBounds(geoJsonLayer.getBounds());
				window.setTimeout(function(){
					map._layersMinZoom = map.getZoom();
				}, 500);
			}, 500);

			// reload the data in 1 minute
			window.setTimeout(loadData, 60*1000);

			// create the data table based on datastore
			displayData();
		}
		, 'json'
	);
}

// create the styles for features
function setStyle(feature) {
	if (!feature.properties[ville.dataMap.candidats]) {
		// no results for this feature : paint it into gray
		return {
			color: '#666'
			, weight: 1
		};
	} else {
		// we have results for this feature : paint it into green
		return {
			color: '#3a3'
			, weight: 1
			, fillOpacity: 0.5
		};
	}
}

// adds behaviours to events
function onEachFeature(feature, layer) {
	// adds the popup
	layer.bindPopup(setPopupContent(feature), {maxWidth: 600});
	// on mouse events, change the style
	layer.on({
		mouseover: highlightFeature
		, mouseout: resetHighlight
	});
}

// create the popup content for the given feature
function setPopupContent(feature) {
	if (!feature.properties[ville.dataMap.candidats]) {
		// no results, only display the poll number and a message
		return '<h4>Bureau n°'+feature.properties[ville.dataMap.Bureau]+'</h4><p>'+feature.properties[ville.dataMap.NomBureau]+'</p><p>Les résultats de ce bureau n\'ont pas encore été publiés.</p>';
	} else {
		// we have results !

		// store the current results
		var results = {
			inscrits: feature.properties[ville.dataMap.inscrits]
			, votants: feature.properties[ville.dataMap.votants]
			, blancsNuls: feature.properties[ville.dataMap.blancsNuls]
			, candidats: []
		};
		for (var i in feature.properties[ville.dataMap.candidats]) {
			results.candidats.push({
				votes: feature.properties[ville.dataMap.candidats][i][ville.dataMap.voix]
				, nom: feature.properties[ville.dataMap.candidats][i][ville.dataMap.nom]
			});
		}

		// compute the abstention %
		results.abstention = Math.round((parseInt(results.inscrits) - parseInt(results.votants)) * 100 / parseInt(results.inscrits));

		// initialize candidates vars, see further…
		var candidates = {};
		var candidatesVotes = [];

		// store candidates depending on their votes
		for(var i in results.candidats) {
			// candidates var is an object where keys are votes
			candidates[results.candidats[i].votes] = results.candidats[i];
			// compute votes %
			candidates[results.candidats[i].votes].pc = Math.round((parseInt(results.candidats[i].votes) * 100 / parseInt(results.votants))*100)/100;
			// candidatesVotes stores the votes
			candidatesVotes.push(results.candidats[i].votes);
		}
		// we sort the votes, so that, looping candidatesVotes, we can display candidates depending on votes
		candidatesVotes.sort(function(a,b){return(b-a);});

		// create the content
		content = '<h4>Bureau n°'+feature.properties.Bureau+'</h4>';
		content += '<p>';
		content += '<strong class="glyphicon glyphicon-pencil"></strong> <strong>Inscrits:</strong> ' + results.inscrits + '<br>';
		content += '<strong class="glyphicon glyphicon-envelope"></strong> <strong>Votants:</strong> ' + results.votants + '<br>';
		content += '<strong class="glyphicon glyphicon-remove"></strong> <strong>Votes blancs ou nuls:</strong> ' + results.blancsNuls + '<br>';
		content += '<strong class="glyphicon glyphicon-unchecked"></strong> <strong>Abstention:</strong> ' + results.abstention + '%';
		content += '</p>';
		for (var n in candidatesVotes) {
			var i = candidatesVotes[n];
			content += '<div style="white-space:nowrap"><strong>' + candidates[i].nom + ' :</strong> ';
			content += candidates[i].votes + ' votes ';
			content += ' (' + candidates[i].pc + '%)</div>';
			content += '<div class="progress" style="margin-bottom: 2px;">';
			content += '<div class="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="' + results.votants + '" style="width: '+candidates[i].pc+'%; text-align:center!important; text-shadow: -1px -1px rgba(0,0,0,0.5)">';
			content += '</div>';
			content += '</div>';
		}
		return content;
	}
}

// highlight the hovered feature
function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5
	});

	if (!L.Browser.ie && !L.Browser.opera) {
		layer.bringToFront();
	}
}

// reset the highlight on mouseout
function resetHighlight(e) {
	geoJsonLayer.resetStyle(e.target);
}

function displayData() {
	// preparing total
	var total = {
		inscrits: 0
		, votants: 0
		, blancsNuls: 0
		, candidats: []
	};
	// first, we need to know wich are the candidates
	var candidates = [];
	//sort polls
	var bureaux = [];

	for (var b in dataStore) {
		if (dataStore[b].properties) {
			var feature = dataStore[b];
			var results = {
				inscrits: feature.properties[ville.dataMap.inscrits]
				, votants: feature.properties[ville.dataMap.votants]
				, blancsNuls: feature.properties[ville.dataMap.blancsNuls]
				, candidats: []
				, bureau: feature.properties[ville.dataMap.Bureau]
			};
			// compute the abstention %
			results.abstention = Math.round((parseInt(results.inscrits) - parseInt(results.votants)) * 100 / parseInt(results.inscrits));
			for (var i in feature.properties[ville.dataMap.candidats]) {
				results.candidats.push({
					votes: feature.properties[ville.dataMap.candidats][i][ville.dataMap.voix]
					, nom: feature.properties[ville.dataMap.candidats][i][ville.dataMap.nom]
				});
				results.candidats[i].pc = Math.round((parseInt(results.candidats[i].votes) * 100 / parseInt(results.votants))*100)/100;
			}

			bureaux[results.bureau] = results;
			
			if (total.candidats.length === 0) {
				for (var c in results.candidats) {
					candidates.push(results.candidats[c].nom);
					total.candidats.push(0);
				}
			}
		}
	}
	if (candidates.length === 0) {
		// we have no data at all
		$('#table-body').html('<tr><td><h3>Aucune données</h3></td><tr>');
	}

	// reset the table body
	$('#table-body').html('');

	// lets add polls
	for (var b in bureaux) {
		var r = bureaux[b];
		var row = '<tr>';
		row += '<th>Bureau n°'+b+'</th>';
		row += '<td>'+r.inscrits+'</td>';
		row += '<td>'+r.votants+'</td>';
		row += '<td>'+r.blancsNuls+'</td>';
		row += '<td>'+r.abstention+'%</td>';
		for (var c in r.candidats) {
			var candidate = r.candidats[c];
			row += '<td>'+candidate.pc+'%</td>';// ('+candidate.votes+' voix)</td>';
			total.candidats[c] += candidate.votes;
		}
		row += '</tr>';
		$('#table-body').append(row);
		total.inscrits += r.inscrits;
		total.votants += r.votants;
		total.blancsNuls += r.blancsNuls;
	}

	// lets display the data/candidates as header
	var header = '<th>Bureaux</th><th>Inscrits<br><small>('+total.inscrits+')</small></th><th>Votants<br><small>('+total.votants+')</small></th><th>Blancs / Nuls<br><small>('+total.blancsNuls+')</small></th><th>Abstention<br><small>('+Math.round((total.inscrits - total.votants) * 100 / total.inscrits)+'%)</small></th>';
	for (var c in candidates) {
		header += '<th><div style="font-size:0.8em;">'+candidates[c]+'</div><br><small>'+total.candidats[c]+' voies ('+(Math.round((total.candidats[c] * 100 / total.votants)*100)/100)+'%)</small></th>';
	}

	$('#table-header').html(header);

	$('#data table').tablesorter(); 

}