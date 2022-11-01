import { headingDistanceTo, headingTo, normalizeHeading } from "geolocation-utils";
import { LaneDepartureSnapshot } from "./LaneDepartureSnapshot";
import { Section, SectionRectangle, SectionType } from "./Section";
import { Snapshot } from "./Snapshot";

const EARTH_RADIUS = 6378137;

var dsp = require('digitalsignals');

export function AreSnapshotsOnSamePoint(a:Snapshot, b: Snapshot, useGooglePoints: boolean) : boolean {
	return useGooglePoints ?
				a.GoogleLatitude == b.GoogleLatitude && a.GoogleLongitude == b.GoogleLongitude :
				a.Latitude == b.Latitude && a.Longitude == b.Longitude;
}

export function CalculatePathAveragedHeading(section: Section, headings: number[], distances: number[], accumulativeDistances: number[]): number
{
	let sumOfHeadingMultiplyDistance: number[] = []
	sumOfHeadingMultiplyDistance.push(0);

	let j = 1;
	for (let i = section.StartIndex + 1; i <= section.EndIndex; i++)
	{
		sumOfHeadingMultiplyDistance[j] = sumOfHeadingMultiplyDistance[j - 1] + (headings[i] * distances[i]);
		j++;
	}

	let sectionLength = accumulativeDistances[section.EndIndex] - accumulativeDistances[section.StartIndex];
	let pathAveragedValue = sumOfHeadingMultiplyDistance[sumOfHeadingMultiplyDistance.length - 1] / sectionLength;

	return pathAveragedValue;
}

// TODO: combine CalculatePathAveragedDifferentialHeading and CalculatePathAveragedHeading
export function CalculatePathAveragedDifferentialHeading(section: Section, differentialHeadings: number[], distances: number[], accumulativeDistances: number[]): number
{
	let sumOfDifferentialHeadingMultiplyDistance: number[] = []
	sumOfDifferentialHeadingMultiplyDistance.push(0);

	let j = 1;
	for (let i = section.StartIndex + 1; i <= section.EndIndex; i++)
	{
		sumOfDifferentialHeadingMultiplyDistance[j] = sumOfDifferentialHeadingMultiplyDistance[j - 1] + (differentialHeadings[i] * distances[i]);
		j++;
	}

	let distanceInSection = accumulativeDistances[section.EndIndex] - accumulativeDistances[section.StartIndex];
	let pathAveragedDifferentialHeading = sumOfDifferentialHeadingMultiplyDistance[sumOfDifferentialHeadingMultiplyDistance.length - 1] / distanceInSection;

	return pathAveragedDifferentialHeading;
}

export function CalculatePathAveragedDifferentialHeadings(sections: Section[], differentialHeadings: number[], distances: number[], accumulativeDistances: number[]): number[]
{
	let pathAveragedDifferentialHeadings: number[] = [];

	sections.forEach(section => {
		let pathAveragedDifferentialHeading = CalculatePathAveragedDifferentialHeading(section, differentialHeadings, distances, accumulativeDistances);
		pathAveragedDifferentialHeadings.push(pathAveragedDifferentialHeading);
	});

	return pathAveragedDifferentialHeadings;
}

export function CalculatePathAveragedHeadings(sections: Section[], headings: number[], distances: number[], accumulativeDistances: number[]): number[]
{
	let pathAveragedHeadings: number[] = [];

	sections.forEach(section => {
		let pathAveragedHeading = CalculatePathAveragedHeading(section, headings, distances, accumulativeDistances);
		pathAveragedHeadings.push(pathAveragedHeading);
	});

	return pathAveragedHeadings;
}

export function PathAveragedDifferentialHeadingReselect(section: Section, differentialHeadings: number[], currentPathAveragedDifferentialHeading: number): Section {
	let sb: number[] = [];
	for (let i = section.StartIndex; i < section.EndIndex; i++) {
		if (Math.abs(differentialHeadings[i]) >= Math.abs(currentPathAveragedDifferentialHeading)) {
			sb.push(i)
		}
	}

	return new Section(sb[0], sb[sb.length - 1], SectionType.Unknown);
}

export function CalculatePathAveragedSlope(section: Section, Slopes: number[], distances: number[], accumulativeDistances: number[]): number
{
	let distanceInSection = accumulativeDistances[section.EndIndex] - accumulativeDistances[section.StartIndex];
	let sumOfSlopeMultiplyDistance: number[] = []
	sumOfSlopeMultiplyDistance.push(0);

	let j = 1;
	for (let i = section.StartIndex + 1; i <= section.EndIndex; i++)
	{
		sumOfSlopeMultiplyDistance[j] = sumOfSlopeMultiplyDistance[j - 1] + (Slopes[i] * distances[i]);
		j++;
	}

	let pathAveragedDifferentialHeading = sumOfSlopeMultiplyDistance[sumOfSlopeMultiplyDistance.length - 1] / distanceInSection;

	return pathAveragedDifferentialHeading;
}

export function CalculatePathAveragedSlopeOfTransitionSection(section: Section, SmoothedHeadings: number[], distances: number[], accumulativeDistances: number[]): number
{
	let distanceInSection = accumulativeDistances[section.EndIndex] - accumulativeDistances[section.StartIndex];
	let pathAveragedSlopeOfTransientSection = (SmoothedHeadings[section.EndIndex] - SmoothedHeadings[section.StartIndex])/ distanceInSection;
	return pathAveragedSlopeOfTransientSection;
}

export function drawPointWithColorAndData(snapshot: LaneDepartureSnapshot, color: string, map: google.maps.Map<Element>) {

	let pt = new google.maps.LatLng(snapshot.Latitude, snapshot.Longitude);
	var infowindow = new google.maps.InfoWindow({
		content: pt.lat() + ` ` + pt.lng() + ` ` + snapshot.SecondsFromStart
	});

	var marker = new google.maps.Marker({
		position: pt,
		icon: {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: color,
			fillOpacity: 0.6,
			strokeColor: color,
			strokeOpacity: 0.9,
			strokeWeight: 1,
			scale: 3
		}
	});

	marker.addListener("click", () => {
		infowindow.open(map, marker);
	  });

	marker.setMap(map);
}

export function drawSections(sections: Section[], map: google.maps.Map<Element>) {
	sections.forEach(section => {
		let line = [
			{ lat: section.StartLatitude, lng: section.StartLongitude },
			{ lat: section.EndLatitude, lng: section.EndLongitude },
		];

		drawLine(section, line, map);
	});
}

function drawLine(section: Section, drawLine: { lat: number; lng: number; }[], map: google.maps.Map<Element>) {
	let strokeColor = '';
	switch (section.SectionType) {
		case SectionType.Straight:
			strokeColor = 'red';
			break;
		case SectionType.Curved:
			strokeColor = 'blue';
			break;
		case SectionType.Transient:
			strokeColor = 'green';
			break;
		default:
			strokeColor = 'white';
			break;
	}

	var path = new google.maps.Polyline({
		path: drawLine,
		geodesic: true,
		strokeColor: strokeColor,
		strokeOpacity: 1.0,
		strokeWeight: 8,
	});

	const accuracyOfHeading = 4;
	var html: string;
	if (section.SectionType === SectionType.Straight) {
		html = "<p>" 
			+ "sectionType: "  + section.SectionType + "<br />"
			+ "sectionLength: " + Math.round(section.TotalSectionLength) + "<br />"
			+ "accumulativeDistance: " + Math.round(section.AccumulativeDistanceAtStart) + "<br />"
			+ "pah: "  + section.PathAveragedHeading.toFixed(accuracyOfHeading) + "<br />"
			+ "oPah: " + section.OptimizedPathAveragedHeading.toFixed(accuracyOfHeading)
			"</p>"
	} else {
		html = "<p>" 
			+ "sectionType: "  + section.SectionType + "<br />"
			+ "sectionLength: " + Math.round(section.TotalSectionLength) + "<br />"
			+ "accumulativeDistance: " + Math.round(section.AccumulativeDistanceAtStart) + "<br />"
			+ "initialHeading: "  + section.InitialHeading.toFixed(accuracyOfHeading) + "<br />"
			+ "oInitialHeading: " + section.OptimizedInitialHeading.toFixed(accuracyOfHeading) + "<br />"
			+ "pahs: "  + section.PathAvergaedSlope.toFixed(accuracyOfHeading) + "<br />"
			+ "opahs: "  + section.OptimizedPathAvergaedSlope.toFixed(accuracyOfHeading)
			"</p>"
	}

	var infowindow = new google.maps.InfoWindow({
		content: html,
		position: drawLine[0]
	});

	path.addListener("click", () => {
		// infowindow.setPosition(event.latLng);
		infowindow.open(map);
	});

	// directionsRenderer.setMap(null);
	path.setMap(map);
}

export function OptimizeStraightSection(straightSection: Section, headings: number[], distances: number[]) {
	// we will try to find the optimum PAH value between 0.9PAH to 1.1PAH. PAH which produces the min ALS
	// is the optimum PAH value.
	let headingsInSection = headings.slice(straightSection.StartIndex, straightSection.EndIndex + 1);
	const pathAveragedHeadingMaxValue = Math.max.apply(null, headingsInSection);
	const pathAveragedHeadingMinValue = Math.min.apply(null, headingsInSection);
	straightSection.MaxHeadingInSection = pathAveragedHeadingMaxValue;
	straightSection.MinHeadingInSection = pathAveragedHeadingMinValue;
	const delataPathAveragedHeading = (pathAveragedHeadingMaxValue - pathAveragedHeadingMinValue) / 100;

	let currentOptimimPathAveragedHeadingValue = straightSection.PathAveragedHeading;
	let currentMinimumAlsValue = Number.MAX_VALUE;
	
	let potentialPathAveragedHeading = pathAveragedHeadingMinValue;
	while (potentialPathAveragedHeading <= pathAveragedHeadingMaxValue) {
		let als = 0;
		for (let index = straightSection.StartIndex + 1; index <= straightSection.EndIndex; index++) {
			let headingAtPoint = headings[index];

			// WARN: there is a sign difference between the doc and code implementation
			let theta = headingAtPoint - potentialPathAveragedHeading; // whats the unit here? degrees?
			let thetaInRadians = theta * Math.PI / 180;
			als = als + distances[index] * Math.sin(thetaInRadians);
		}

		if (Math.abs(als) < Math.abs(currentMinimumAlsValue)) {
			currentMinimumAlsValue = als;
			currentOptimimPathAveragedHeadingValue = potentialPathAveragedHeading;
		}

		potentialPathAveragedHeading = potentialPathAveragedHeading + delataPathAveragedHeading;
	}

	// straightSection.PathAveragedHeading = currentOptimimPathAveragedHeadingValue;
	straightSection.OptimizedPathAveragedHeading = currentOptimimPathAveragedHeadingValue;
}

export function OptimizeCurveSection(curveSection: Section, headings: number[], distances: number[], accumulativeDistances: number[]) {
	// we will try to find the optimum PAS value between 0.9PAS to 1.1PAS. PAS which produces the min ALS
	// is the optimum PAH value.

	const pathAveragedSlopeMaxValue = curveSection.PathAvergaedSlope + Math.abs(0.3 * curveSection.PathAvergaedSlope);
	const pathAveragedSlopeMinValue = curveSection.PathAvergaedSlope - Math.abs(0.3 * curveSection.PathAvergaedSlope);
	const deltaPathAveragedSlope = Math.abs((pathAveragedSlopeMaxValue - pathAveragedSlopeMinValue) / 100);

	const initialHeadingsRange = headings.slice(curveSection.StartIndex - 5, curveSection.StartIndex + 5); // 2 points on each side of original IH
	const initialHeadingMaxValue = Math.max.apply(null, initialHeadingsRange);
	const initialHeadingMinValue = Math.min.apply(null, initialHeadingsRange);
	const deltaInitialHeading = (initialHeadingMaxValue - initialHeadingMinValue) / 100;

	let currentOptimimInitialHeadingValue = curveSection.InitialHeading;
	let currentOptimimPathAveragedSlopeValue = curveSection.PathAvergaedSlope;

	let currentMinimumAlsValue = Number.MAX_VALUE;
	let allAlsValues: number[] = [];
	let potentialPathAveragedSlope = pathAveragedSlopeMinValue;
	while (potentialPathAveragedSlope <= pathAveragedSlopeMaxValue) {
		
		let potentialInitialHeadingValue = initialHeadingMinValue;
		while (potentialInitialHeadingValue <= initialHeadingMaxValue) {
			let als = 0;
			for (let index = curveSection.StartIndex + 1; index <= curveSection.EndIndex; index++) {
				let headingAtPoint = headings[index];
	
				// WARN: there is a sign difference between the doc and code implementation
				let distanceTillCurrentPoints = accumulativeDistances[index] - accumulativeDistances[curveSection.StartIndex];
				let href_k = potentialInitialHeadingValue +  distanceTillCurrentPoints*potentialPathAveragedSlope; 
				// let href_k = potentialInitialHeadingValue +  distances[index]*potentialPathAveragedSlope; 
				let theta = headingAtPoint - href_k;
				let thetaInRadians = theta * Math.PI / 180;
				//als = als + distances[index] * Math.sin(thetaInRadians);
				if (als==0)
                {als = als + distances[index] * Math.cos(thetaInRadians);
                } else
                {als = als + distances[index] * Math.sin(thetaInRadians);}

			}
	
			if (Math.abs(als) < Math.abs(currentMinimumAlsValue)) {
				currentMinimumAlsValue = als;
				currentOptimimPathAveragedSlopeValue = potentialPathAveragedSlope;
				currentOptimimInitialHeadingValue = potentialInitialHeadingValue;
			}

			allAlsValues.push(als);
			potentialInitialHeadingValue = potentialInitialHeadingValue + deltaInitialHeading;
		}		

		potentialPathAveragedSlope = potentialPathAveragedSlope + deltaPathAveragedSlope;
	}


	curveSection.OptimizedInitialHeading = currentOptimimInitialHeadingValue;
	curveSection.OptimizedPathAvergaedSlope = currentOptimimPathAveragedSlopeValue;
}

export function OptimizeTransientSection(curveSection: Section) {
	// In transient sections there is no optimization done so the optimized parameters are equal to non-optimized parameter/

	curveSection.OptimizedInitialHeading = curveSection.InitialHeading;
	curveSection.OptimizedPathAvergaedSlope = curveSection.PathAvergaedSlope;
}

export function GetStraightSections(averagedHeadings: number[]): Section[] {
	let scanWindow = 3;
	let threshold = 0.002;

	let straightSectionHelperArray: number[] = [];
	for (let i = 1; i < averagedHeadings.length - 1 - scanWindow; i++) {
		// if all points in our scanWindow are above threshold then 
		let currentWindow = averagedHeadings.slice(i, i + scanWindow);

		if (currentWindow.every(val => val > threshold)) {
			straightSectionHelperArray.push(100);
		} 
		else if (currentWindow.every(val => val < -threshold)) {
			straightSectionHelperArray.push(-100);
		} else {
			straightSectionHelperArray.push(0);
		}
	}
	
	let sections: Section[] = [];

	// now all consecutive '0' points in our helper array are straight sections.
	for (let i = 0; i < straightSectionHelperArray.length; i++) {
		if (straightSectionHelperArray[i] === 0) {
			let startStraightSectionIndex = i;
			let endStraightSectionIndex = -1;
			for (let j = i; j < straightSectionHelperArray.length; j++) {
				if (straightSectionHelperArray[j] !== 0 || j === straightSectionHelperArray.length - 1) {
					endStraightSectionIndex = j;

					sections.push(new Section(startStraightSectionIndex, endStraightSectionIndex, SectionType.Straight));
					i = j + 1;
					break;
				}
			}
		}		
	}

	return sections;
}

export function GetAllNonStraightSections(straightSections: Section[]): Section[]
{
	let nonStraightSections: Section[] = [];
	// Assume our path starts and ends at a straight section for now.
	for (let i = 1; i < straightSections.length; i++) {
		const currentSection = straightSections[i];
		const previousSection = straightSections[i - 1];
		
		let nonStraightSection = new Section(previousSection.EndIndex, currentSection.StartIndex - 1, SectionType.Unknown);
		nonStraightSections.push(nonStraightSection);
	}

	return nonStraightSections;
}

export function CalculateAveragedDifferentialHeadings(differentialHeadings: number[]): number[] {
	let numberOfHeadingsToAverage = 10; // 20 points ahead and 20 points behind
	let averagedHeadings: number[] = Array(differentialHeadings.length).fill(0);

	// We can't average start and of array on both sides so just copy over original values
	for (let i = 0; i < numberOfHeadingsToAverage; i++) {
		averagedHeadings[i] = differentialHeadings[i];

		let lastIndex = differentialHeadings.length - 1;
		averagedHeadings[lastIndex - i] = differentialHeadings[lastIndex - i];
	}

	for (let i = numberOfHeadingsToAverage; i < differentialHeadings.length - 1 - numberOfHeadingsToAverage; i++) {
		// slice the array into 20 points around current point.
		let startIndex = i - numberOfHeadingsToAverage;
		let endIndex = i + numberOfHeadingsToAverage + 1; // endIndex is excluded in slice.
		var slice =  differentialHeadings.slice(startIndex, endIndex);
		var sumHeading = slice.reduce((a, b) => a + b);
		let averagedHeading = sumHeading / (endIndex - startIndex)
		averagedHeadings[i] = averagedHeading;
	}

	return averagedHeadings;
}

export function ConvertLatLngToSnapshots(points: google.maps.LatLng[]): Snapshot[] {
	let allSnapshots: Snapshot[] = [];
	let snapshotNumber = 0;
	points.forEach(point => {
		allSnapshots.push(new Snapshot(point.lat(), point.lng(), snapshotNumber));
		snapshotNumber++;
	});


	return allSnapshots;
}

function GetNextPowerOfTwoNumber(input: number): number {
	let power = Math.ceil(Math.log2(input));
	return Math.pow(2, power);
}

export function ApplySmoothingfilter(input: number[], cutOffFrequency1: number, cutOffFrequency2: number): number[] {
	console.log(`input: ${input}`);
	
	var clonedInput  = [...input];

	const fs = GetNextPowerOfTwoNumber(clonedInput.length);
	for (let i = clonedInput.length + 1; i <= fs; i++) {
		clonedInput.push(0);       
	}

	var fft = new dsp.FFT(fs, fs); 
	fft.forward(clonedInput);
	var fftReal = fft.real;
	var fftImag = fft.imag;

	for (let i = cutOffFrequency2; i <= fs/2; i++) {
		fftReal[i] = 0;
		fftReal[fs - i + 1] = 0;

		fftImag[i] = 0;
		fftImag[fs - i + 1] = 0;
	}

	for (let i = cutOffFrequency1; i <= cutOffFrequency2 - 1; i++) {
		var f_f = (cutOffFrequency2-1-i)/(cutOffFrequency2-cutOffFrequency1+1);
		fftReal[i] = fftReal[i]*f_f;
		fftImag[i] = fftImag[i]*f_f;

		fftReal[fs-i+1] = fftReal[fs-i+1]*f_f;		
		fftImag[fs-i+1] = fftImag[fs-i+1]*f_f;
	}

	var smoothedData: number[] = fft.inverse(fftReal, fftImag);
	for (let index = 0; index < smoothedData.length; index++) {
		smoothedData[index] = Math.abs(smoothedData[index]);
	}

	return smoothedData.slice(0, input.length);
}

export function CalculateRectangleOfSection(section: Section)
{
	var width = 10;
	let rectangle: SectionRectangle;

	if (section.SectionType === SectionType.Straight) 
	{
		let headingFromStartToEndOfRectangle = normalizeHeading(headingTo( // normalizeHeading makes heading to be in 0 : 360 range
			{lat: section.RectangleStartLatitude, lon: section.RectangleStartLongitude },
			{lat: section.RectangleEndLatitude, lon: section.RectangleEndLongitude }
		));

		// we need angle wrt east so we need to add 90 degrees to the above answer
		var headingWrtEast = headingFromStartToEndOfRectangle + 90;

		var distanceRatio = (width / 2) / EARTH_RADIUS
		rectangle = {
			StartMaxLatitude: section.RectangleStartLatitude + (distanceRatio * Math.cos(headingWrtEast)),
			StartMaxLongitude: section.RectangleStartLongitude + (distanceRatio * Math.sin(headingWrtEast)),
	
			StartMinLatitude: section.RectangleStartLatitude - (distanceRatio * Math.cos(headingWrtEast)),
			StartMinLongitude: section.RectangleStartLongitude - (distanceRatio * Math.sin(headingWrtEast)),
	
			EndMaxLatitude: section.RectangleEndLatitude + (distanceRatio * Math.cos(headingWrtEast)),
			EndMaxLongitude: section.RectangleEndLongitude + (distanceRatio * Math.sin(headingWrtEast)),
	
			EndMinLatitude: section.RectangleEndLatitude - (distanceRatio * Math.cos(headingWrtEast)),
			EndMinLongitude: section.RectangleEndLongitude - (distanceRatio * Math.sin(headingWrtEast))
		}
	} else 
	{
		// curve or transient section
		let headingDistanceFromStartToMidOfRectangle = headingDistanceTo( 
			{lat: section.RectangleStartLatitude, lon: section.RectangleStartLongitude },
			{lat: section.MidLatitude, lon: section.MidLongitude }
		);

		// we need angle wrt east so we need to add 90 degrees to the above answer
		var headingWrtEast = normalizeHeading(headingDistanceFromStartToMidOfRectangle.heading) + 90; // normalizeHeading makes heading to be in 0 : 360 range
		var minDistanceToMidPoint = headingDistanceFromStartToMidOfRectangle.distance; // min distance from P1 to Pm
		section.PerpendicularDistanceToMidPoint = minDistanceToMidPoint * Math.sin(headingWrtEast); // d

		// now our width of ractangle will be d + w
		var distanceRatio = (Math.abs(section.PerpendicularDistanceToMidPoint) + width) / EARTH_RADIUS;
		var distanceRatio2 = (width - section.PerpendicularDistanceToMidPoint) / EARTH_RADIUS;
		var coefficient = section.PathAvergaedSlope >= 0 ? 1 : -1;

		rectangle = {
			StartMaxLatitude: section.RectangleStartLatitude + (coefficient * (distanceRatio * Math.cos(headingWrtEast))),
			StartMaxLongitude: section.RectangleStartLongitude + (coefficient * (distanceRatio * Math.sin(headingWrtEast))),
	
			StartMinLatitude: section.RectangleStartLatitude,
			StartMinLongitude: section.RectangleStartLongitude,
	
			EndMaxLatitude: section.RectangleEndLatitude + (coefficient * (distanceRatio * Math.cos(headingWrtEast))),
			EndMaxLongitude: section.RectangleEndLongitude + (coefficient * (distanceRatio * Math.sin(headingWrtEast))),
	
			EndMinLatitude: section.RectangleEndLatitude,
			EndMinLongitude: section.RectangleEndLongitude
		}
		//overwriting the minimum lat and long according to the condition
        if (section.PerpendicularDistanceToMidPoint < width)
        {
            rectangle.StartMinLatitude = section.RectangleStartLatitude - (coefficient * (distanceRatio2 * Math.cos(headingWrtEast)));
            rectangle.StartMinLongitude = section.RectangleStartLongitude - (coefficient * (distanceRatio2 * Math.sin(headingWrtEast)));

            rectangle.EndMinLatitude = section.RectangleEndLatitude - (coefficient * (distanceRatio2 * Math.cos(headingWrtEast)));
            rectangle.EndMinLongitude = section.RectangleEndLongitude - (coefficient * (distanceRatio2 * Math.sin(headingWrtEast)))
            
        } else
        {
            rectangle.StartMinLatitude = section.RectangleStartLatitude;
            rectangle.StartMinLongitude = section.RectangleStartLongitude;

            rectangle.EndMinLatitude = section.RectangleEndLatitude;
            rectangle.EndMinLongitude = section.RectangleEndLongitude

        }

	}

	section.SectionRectangle = rectangle;
}