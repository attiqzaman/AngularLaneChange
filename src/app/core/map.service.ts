/// <reference types="@types/googlemaps" />
import { Injectable } from '@angular/core';
import { headingDistanceTo } from 'geolocation-utils'
import { ProcessedRouteWrapper } from './ProcessedRouteWrapper';
import { ConvertLatLngToSnapshots, drawSections } from './Util';
import { PrintRoute, PrintSections } from './FileSaver';
import { Section, SectionType } from './Section';
import { NumberSymbol } from '@angular/common';
import { Snapshot } from './Snapshot';

@Injectable({
  providedIn: 'root'
})
export class MapService {

	map!: google.maps.Map;

	constructor() { }

	setMap(lat: NumberSymbol, lng: number): void {
		this.map = new google.maps.Map(
			document.getElementById("map") as HTMLElement,
			{
				zoom: 8,
				center: { lat: lat, lng: lng },
			}
		);
	}

	initMap(): void {		
		var mark = null;
		var latLng: google.maps.LatLng;
		let startLatLng = new google.maps.LatLng(46.6997675, -92.418003);
		let endLatLng = new google.maps.LatLng(46.5396788,-92.6232759);
		let pointOfInterestLatLng = new google.maps.LatLng(46.72623549, -92.21377368);

		const directionsService = new google.maps.DirectionsService();
		const directionsRenderer = new google.maps.DirectionsRenderer();
		this.map = new google.maps.Map(
			document.getElementById("map") as HTMLElement,
			{
				zoom: 6,
				center: { lat: 46.6997675, lng: -92.418003 },
			}
		);
		directionsRenderer.setMap(this.map);

		this.map.addListener('click', (event: any) => {
			latLng = event.latLng;
			addMarker(event.latLng, this.map);
		});

		function addMarker(location: google.maps.LatLngLiteral,  map: google.maps.Map<Element>) {
			mark = new google.maps.Marker({
				position: location,
				map: map,
			});
		}

		const drawRouteListener = () => {
			this.calculateAndDisplayRoute(directionsService, directionsRenderer, this.map, startLatLng, endLatLng, "None");
		};
		document.getElementById("drawRoute")?.addEventListener(
			"click",
			drawRouteListener
		);

		const drawPointsListener = () => {
			this.calculateAndDisplayRoute(directionsService, directionsRenderer, this.map, startLatLng, endLatLng, "All");
		};
		document.getElementById("drawPoints")?.addEventListener(
			"click",
			drawPointsListener
		);

		const drawPointsOfInterestListener = () => {
			let rawLatLong = (document.getElementById("pointOfInterest") as HTMLInputElement).value;
			let latLongArray = rawLatLong.split(',');
			pointOfInterestLatLng = new google.maps.LatLng(Number(latLongArray[0].trim()), Number(latLongArray[1].trim()));
			// (document.getElementById("firstDir") as HTMLInputElement).value = JSON.stringify(startLatLng.toJSON(), null, 2);
			console.log(pointOfInterestLatLng);
			this.calculateAndDisplayRoute(directionsService, directionsRenderer, this.map, startLatLng, endLatLng, "PointsOfInterest", pointOfInterestLatLng);
		};
		document.getElementById("drawSomePoints")?.addEventListener(
			"click",
			drawPointsOfInterestListener
		);

		const on1stBtnClickHandler = () => {
			startLatLng = latLng;
			startLatLng = new google.maps.LatLng(45.6295804815298, -92.99210591089904);
			(document.getElementById("firstDir") as HTMLInputElement).value = JSON.stringify(startLatLng.toJSON(), null, 2);
		};
		document.getElementById("firstButton")?.addEventListener(
			"click",
			on1stBtnClickHandler
		);

		const on2ndBtnClickHandler = () => {
			endLatLng = latLng;
			endLatLng = new google.maps.LatLng(45.836993698299956, -92.98058775694528);

			(document.getElementById("secondDir") as HTMLInputElement).value = JSON.stringify(endLatLng.toJSON(), null, 2);
		};
		document.getElementById("secondButton")?.addEventListener(
			"click",
			on2ndBtnClickHandler
		);

		const onDownloadProcessedFileHandler = () => {
			let rawParameters = (document.getElementById("LowPassFilterParameters") as HTMLInputElement).value.split(',');
			let cutOffFrequency1 = Number(rawParameters[0].trim());
			let cutOffFrequency2 = Number(rawParameters[1].trim());

			this.calculateAndDisplayRoute(directionsService, directionsRenderer, this.map, startLatLng, endLatLng, "downloadProcessedFile", undefined, cutOffFrequency1, cutOffFrequency2);
		};
		document.getElementById("downloadProcessedFile")?.addEventListener(
			"click",
			onDownloadProcessedFileHandler
		);

		const onChangeHandler = () => {
			// calculateAndDisplayRoute(directionsService, directionsRenderer, map);
		};
		(document.getElementById("start") as HTMLElement)?.addEventListener(
			"change",
			onChangeHandler
		);
		(document.getElementById("end") as HTMLElement)?.addEventListener(
			"change",
			onChangeHandler
		);
	}

	calculateAndDisplayRoute(
		directionsService: google.maps.DirectionsService,
		// directionsService: any,
		directionsRenderer: google.maps.DirectionsRenderer,
		map: google.maps.Map,
		startLatLng: google.maps.LatLng,
		endLatLng: google.maps.LatLng,
		drawPointsType: string,
		pointOfInterestLatLng?: google.maps.LatLng,
		cutOffFrequency1?: number,
		cutOffFrequency2?: number
	) {
		directionsService
			.route({
				origin: startLatLng,
				destination: endLatLng,
				travelMode: google.maps.TravelMode.DRIVING,
			}, (response: google.maps.DirectionsResult) => {
				let points: google.maps.LatLng[] = [];
				console.log(`routes: ${response.routes.length}`);

				console.log("*** Route Data ***");
				console.log(response.routes.forEach((route: { legs: any[]; overview_path: any; overview_polyline: any; waypoint_order: any; }) => {
					console.log(`legs: ${route.legs.length}`);
					console.log(`overviewPath: ${route.overview_path}`);
					console.log(`overviewPolyline: ${route.overview_polyline}`);
					console.log(`waypointOrder: ${route.waypoint_order}`);

					console.log("*** Leg Data ***");
					route.legs.forEach((leg: { steps: any[]; distance: { text: any; }; start_location: any; end_location: any; }) => {
						console.log(`steps: ${leg.steps.length}`);
						console.log(`distance: ${leg.distance.text}`);
						console.log(`startLocation: ${leg.start_location}`);
						console.log(`endLocation: ${leg.end_location}`);

						console.log("*** Step Data ***");
						leg.steps.forEach((step: any) => {
							console.log(`path: ${step.path}`);
							console.log(`subSteps: ${step.steps?.length}`);
							console.log(`distance: ${step.distance.text}`);
							console.log(`startLocation: ${step.start_location}`);
							console.log(`endLocation: ${step.end_location}`);

							// Push to points array
							step.path.forEach((x: google.maps.LatLng) => points.push(x));
						});

					});
				}));

				console.log(`totalPoints: ${points.length}`);
				points = this.interpolatePoints(points);
				switch (drawPointsType) {
					case 'All':
						points.forEach(pt => {
							var marker = new google.maps.Marker({
								position: pt,
								icon: {
									path: google.maps.SymbolPath.CIRCLE,
									fillColor: '#F00',
									fillOpacity: 0.6,
									strokeColor: '#F00',
									strokeOpacity: 0.9,
									strokeWeight: 1,
									scale: 3
								}
							});
					
							// To add the marker to the map, call setMap();
							marker.setMap(map);
						});
						break;
					case 'PointsOfInterest':
						if (pointOfInterestLatLng === undefined) {
							throw new Error("latLong not found.")
						}

						const distanceFromPointOfInterest = 100
								
						for (let index = 0; index < points.length; index++) {
							const pt = points[index];
							let headingDistance = headingDistanceTo(
								{lat:pointOfInterestLatLng?.lat(), lng:pointOfInterestLatLng?.lng()},
								{lat:pt?.lat(), lng:pt?.lng()}
							)

							if (Math.abs(headingDistance.distance) < distanceFromPointOfInterest) {
								// this.drawPoint(pt, map);	
								var marker = new google.maps.Marker({
									position: pt,
									icon: {
										path: google.maps.SymbolPath.CIRCLE,
										fillColor: '#F00',
										fillOpacity: 0.6,
										strokeColor: '#F00',
										strokeOpacity: 0.9,
										strokeWeight: 1,
										scale: 3
									}
								});
						
								// To add the marker to the map, call setMap();
								marker.setMap(map);	
							}					
						}
						break;
					case 'downloadProcessedFile':
						if (cutOffFrequency1 === undefined || cutOffFrequency2 === undefined) {
							throw new Error("latLong not found.")
						}

						let snapshots = ConvertLatLngToSnapshots(points);
						let route = new ProcessedRouteWrapper("UI", "route", cutOffFrequency1, cutOffFrequency2, snapshots);
						
						drawSections(route.AllSections, map);
						PrintSections(route);
						break;
					default:
						directionsRenderer.setDirections(response);
				}
			});
			// .catch((e: any) => window.alert("Directions request failed due to " + status));
	}

	drawPoint(pt: google.maps.LatLng, map: google.maps.Map<Element>) {
		var marker = new google.maps.Marker({
			position: pt,
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				fillColor: '#F00',
				fillOpacity: 0.6,
				strokeColor: '#F00',
				strokeOpacity: 0.9,
				strokeWeight: 1,
				scale: 3
			}
		});

		// To add the marker to the map, call setMap();
		marker.setMap(map);
	}

	// drawPointWithColor(pt: google.maps.LatLng, color: string) {

	// 	var infowindow = new google.maps.InfoWindow({
	// 		content: pt.lat() + ` ` + pt.lng()
	// 	});

	// 	var marker = new google.maps.Marker({
	// 		position: pt,
	// 		icon: {
	// 			path: google.maps.SymbolPath.CIRCLE,
	// 			fillColor: color,
	// 			fillOpacity: 0.6,
	// 			strokeColor: color,
	// 			strokeOpacity: 0.9,
	// 			strokeWeight: 1,
	// 			scale: 3
	// 		}
	// 	});

	// 	marker.addListener("click", () => {
	// 		infowindow.open(this.map, marker);
	// 	  });

	// 	// To add the marker to the map, call setMap();
	// 	marker.setMap(this.map);
	// }

	drawPolygonsColor(section: Section, color: string) {

		const change: number = 0.0005;
		let minLatitude: number;
			let maxLatitude: number;
			let minLongitude: number;
			let maxLongitude: number;
			
			if (section.EndLatitude >= section.StartLatitude) {
				minLatitude = section.StartLatitude;
				maxLatitude = section.EndLatitude; 
			} else {
				minLatitude = section.EndLatitude;
				maxLatitude = section.StartLatitude; 
			}

			if (section.EndLongitude >= section.EndLongitude) {
				minLongitude = section.StartLongitude;
				maxLongitude = section.EndLongitude; 
			} else {
				minLongitude = section.EndLongitude;
				maxLongitude = section.StartLongitude; 
			}

			minLatitude = minLatitude - change;
			maxLatitude = maxLatitude + change;
			minLongitude = minLongitude - change;
			maxLongitude = maxLongitude + change;
		const triangleCoords = [
			{ lat: minLatitude, lng: minLongitude },
			{ lat: maxLatitude, lng: minLongitude },
			{ lat: maxLatitude, lng: maxLongitude },
			{ lat: minLatitude, lng: maxLongitude },
		  ];
		
		  // Construct the polygon.
		  const marker = new google.maps.Polygon({
			paths: triangleCoords,
			strokeColor: color,
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: color,
			fillOpacity: 0.35,
		  });

		// To add the marker to the map, call setMap();
		marker.setMap(this.map);
	}


	interpolatePoints(pointsList: google.maps.LatLng[]): google.maps.LatLng[] {
		let newList: google.maps.LatLng[] = [];
		let interpolatedPointsDiffMs = 3;

		for (var i = 0; i <= pointsList.length - 2; i++) {
			var firstPoint = pointsList[i];
			var secondPoint = pointsList[i + 1];

			newList.push(firstPoint);

			let diffInMeters = google.maps.geometry.spherical.computeDistanceBetween(firstPoint, secondPoint);

			let pointsCount = Math.floor(diffInMeters / interpolatedPointsDiffMs);

			let delLatitude =
				Math.abs(secondPoint.lat()) - Math.abs(firstPoint.lat());
			let delLongitude =
				Math.abs(secondPoint.lng()) - Math.abs(firstPoint.lng());

			let point = new google.maps.LatLng(firstPoint.lat(), firstPoint.lng());

			for (var j = 1; j < pointsCount; j++) {
				let newLatitude: number;
				let newLongitude: number;

				if (point.lat() > 0) {
					newLatitude = point.lat() +
						(delLatitude / diffInMeters * interpolatedPointsDiffMs);
				} else {
					newLatitude = point.lat() -
						(delLatitude / diffInMeters * interpolatedPointsDiffMs);
				}

				if (point.lng() > 0) {
					newLongitude = point.lng() +
						(delLongitude / diffInMeters * interpolatedPointsDiffMs);
				} else {
					newLongitude = point.lng() -
						(delLongitude / diffInMeters * interpolatedPointsDiffMs);
				}

				let newPoint = new google.maps.LatLng(newLatitude, newLongitude);

				newList.push(newPoint);
				point = newPoint;
			}
		}

		return newList;
	}


}