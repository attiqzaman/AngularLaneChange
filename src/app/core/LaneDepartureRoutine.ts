import { BoundingBox, distanceTo, headingDistanceTo, insideBoundingBox } from "geolocation-utils";
import { PrintLdwSnapshots, PrintLdwSnapshotsAsCsv } from "./FileSaver";
import { LaneDepartureSnapshot } from "./LaneDepartureSnapshot";
import { MapService } from "./map.service";
import { Section, SectionType } from "./Section";
import { Snapshot } from "./Snapshot";
import { drawPointWithColorAndData, drawSections } from "./Util";


export class LaneDepartureRoutine {
	
	// TODO: The DataStructure probably should be a Queue since we only use latest `X` number of elements and we need a mechanism to 
	// remove the older items. For now I am using arrays since JS/TS doesn't have a built-in queue data structure and this work is throw-away anyway.
	DataSnapshots: LaneDepartureSnapshot[] = [];
	Counter: number = 0;

	constructor(allSections: Section[], gpsSnapshots: Snapshot[], mapService: MapService) {

		mapService.initMap();
		mapService.setMap(gpsSnapshots[0].Latitude, gpsSnapshots[1].Longitude);		
		gpsSnapshots.forEach(gpsSnapshot => {
			// This lambda basically represents the mobile new GPS point callback.
			this.ProcessNewGpsSnapshot(gpsSnapshot, allSections);

			// we are done gathering data, lets try to predict if lane departure occured.
			this.PredictLaneDeparture();
		});
		
		// code below was added for debugging and shouldn't be ported to mobile.
		drawSections(allSections, mapService.map);
		this.DataSnapshots.forEach(laneDepartureSnapshot => {
			if (laneDepartureSnapshot.Alarm) {
				drawPointWithColorAndData(laneDepartureSnapshot, 'black', mapService.map);
			}
		});


		PrintLdwSnapshotsAsCsv(this.DataSnapshots);
	}


	ProcessNewGpsSnapshot(gpsSnapshot: Snapshot, allSections: Section[]) {
		let startDate: Date = this.DataSnapshots.length > 0 ? this.DataSnapshots[0].TimeStamp : new Date(gpsSnapshot.TimeStampAsString);
		
		// create a new data object which will be used from now on for LaneDeaparture Routine.
		let currentDatasnapshot: LaneDepartureSnapshot = new LaneDepartureSnapshot(
			gpsSnapshot.Latitude,
			gpsSnapshot.Longitude,
			gpsSnapshot.SnapshotNumber,
			gpsSnapshot.TimeStampAsString,
			startDate);


		// We need atleast 2 snapshots to calculate heading.
		if (this.DataSnapshots.length < 2) {
			this.DataSnapshots.push(currentDatasnapshot);
			return;
		}

		// calculate heading, distance anc accumulative distance wrt previous point.
		let previousDataSnapshot = this.DataSnapshots[this.DataSnapshots.length - 1];
		let headingDistanceFromPreviousSnapshot = headingDistanceTo(
			{lat: previousDataSnapshot.Latitude, lon: previousDataSnapshot.Longitude },
			{lat: gpsSnapshot.Latitude, lon: gpsSnapshot.Longitude }
		)

		currentDatasnapshot.Distance = headingDistanceFromPreviousSnapshot.distance;
		currentDatasnapshot.AccumulativeDistance = previousDataSnapshot.AccumulativeDistance + currentDatasnapshot.Distance; // not really used?
		currentDatasnapshot.Heading = headingDistanceFromPreviousSnapshot.heading + 360;

		// we need atleast 5 snapshots for rest of the logic to work.
		if (this.DataSnapshots.length < 5) {
			this.DataSnapshots.push(currentDatasnapshot);
			return;
		}
		
		// Average heading is calcualted between 3 snapshots (current and previous 2 snapshots)
		let previousToPreviousDataSnapshot = this.DataSnapshots[this.DataSnapshots.length - 2];
		currentDatasnapshot.AveragedHeading = (previousToPreviousDataSnapshot.Heading + previousDataSnapshot.Heading + currentDatasnapshot.Heading) / 3;
		
		// find the section ehicle is in.
		const [currentVahicleSection, sectionInfo] = this.GetSectionOfVehicle(currentDatasnapshot.Latitude, currentDatasnapshot.Longitude, allSections);
		currentDatasnapshot.SectionInfo = sectionInfo; 
		if (currentVahicleSection === undefined) {
			// what to do when we cant find point in any section?
			this.Counter++;
			return;
		}

		// update snapshot data object with section attributes (some fields were added just for debugging purposes)
		currentDatasnapshot.SectionStartIndex = currentVahicleSection.StartIndex;
		currentDatasnapshot.PerpendicularDistanceToMidPoint = currentVahicleSection.PerpendicularDistanceToMidPoint;
		currentDatasnapshot.PathAvergaedSlope = currentVahicleSection.PathAvergaedSlope;
		currentDatasnapshot.OptimizedPathAvergaedSlope = currentVahicleSection.OptimizedPathAvergaedSlope;
		currentDatasnapshot.InitialHeading = currentVahicleSection.InitialHeading;
		currentDatasnapshot.OptimizedInitialHeading = currentVahicleSection.OptimizedInitialHeading;
		
		// We need to figure out if this is the first point in a 'new section`. (this should check SectionId in final version)
		if (currentDatasnapshot.SectionStartIndex === previousDataSnapshot.SectionStartIndex) {
			currentDatasnapshot.DistanceFromStartOfSection = previousDataSnapshot.DistanceFromStartOfSection + currentDatasnapshot.Distance;
		} else {
			currentDatasnapshot.IsFirstPointInSection = true;
			currentDatasnapshot.DistanceFromStartOfSection = distanceTo(
				{lat: currentVahicleSection.StartLatitude, lon: currentVahicleSection.StartLongitude },
				{lat: currentDatasnapshot.Latitude, lon: currentDatasnapshot.Longitude }
			);
		}

		// calculate reference heading (in final version we will use either optimized or non-optimized value not both)
		currentDatasnapshot.OptimizedRefrenceHeading = currentVahicleSection.SectionType === SectionType.Straight 
			? currentVahicleSection.OptimizedPathAveragedHeading
			: currentVahicleSection.OptimizedInitialHeading + (currentVahicleSection.OptimizedPathAvergaedSlope * currentDatasnapshot.DistanceFromStartOfSection);

		currentDatasnapshot.RefrenceHeading = currentVahicleSection.SectionType === SectionType.Straight 
			? currentVahicleSection.PathAveragedHeading
			: currentVahicleSection.InitialHeading + (currentVahicleSection.PathAvergaedSlope * currentDatasnapshot.DistanceFromStartOfSection);
		
		// Lateral Distance and Accumulated Lateral Distance Calculation (we use these to decide if lane departure happened)
		currentDatasnapshot.Theta = currentDatasnapshot.OptimizedRefrenceHeading - currentDatasnapshot.AveragedHeading; // rename to currentAveragedHeading

		// LateralDistance is distance traveled in the perpendicular direction to the road.
		currentDatasnapshot.LateralDistance = currentDatasnapshot.Distance * Math.sin(currentDatasnapshot.Theta * Math.PI / 180) // Sin(Theta) = P / H
		currentDatasnapshot.AccumulativeLateralDistance = previousDataSnapshot.AccumulativeLateralDistance + currentDatasnapshot.LateralDistance;

		// Although we probably will only care about absolute value of lateral distances but to help debug stuff I will create separate properties
		// for Absolute lateral distances
		currentDatasnapshot.AbsoluteLateralDistance = Math.abs(currentDatasnapshot.LateralDistance)
		currentDatasnapshot.AbsoluteAccumulativeLateralDistance = Math.abs(currentDatasnapshot.AccumulativeLateralDistance)
		this.DataSnapshots.push(currentDatasnapshot);
	}

	PredictLaneDeparture() {
		// we can't predict lane departure if we have less than 5 snapshots
		if (this.DataSnapshots.length < 5) {
			return;
		}

		// Most of the logic here is simple addition/subtraction, we are still waiting for final calculations around this.
		let lastDataSnaphotIndex = this.DataSnapshots.length - 1;

		this.DataSnapshots[lastDataSnaphotIndex].Alarm = this.DataSnapshots[lastDataSnaphotIndex - 1].Alarm;
		if (Math.abs(this.DataSnapshots[lastDataSnaphotIndex].AccumulativeLateralDistance) == 0 ||
		    Math.abs(this.DataSnapshots[lastDataSnaphotIndex - 1].AccumulativeLateralDistance) == 0 ||
			Math.abs(this.DataSnapshots[lastDataSnaphotIndex - 2].AccumulativeLateralDistance) == 0 ) {
				return;
		}
		
		if (Math.abs(this.DataSnapshots[lastDataSnaphotIndex].AccumulativeLateralDistance) >= 1) {
			
			// Alarm here. For debugging/testing I will update a field in the object. 
			this.DataSnapshots[lastDataSnaphotIndex].Alarm = true;
			// If previous state was in alarm then this isn't start of alarm.
			this.DataSnapshots[lastDataSnaphotIndex].StartOfAlarm = this.DataSnapshots[lastDataSnaphotIndex - 1].Alarm == true ? false: true;

			// We now need to calculate if Accmulative Lateral Distance needs to be reset or not. Once a vehicle completes
			// a lane departure we need to set the Accumulative lateral distance to 0 so we can catch the next lane departure.
			if (this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex], this.DataSnapshots[lastDataSnaphotIndex - 1]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 1], this.DataSnapshots[lastDataSnaphotIndex - 2]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 2], this.DataSnapshots[lastDataSnaphotIndex - 3]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 3], this.DataSnapshots[lastDataSnaphotIndex - 4]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 4], this.DataSnapshots[lastDataSnaphotIndex - 5]))
			{
				this.DataSnapshots[lastDataSnaphotIndex].AbsoluteAccumulativeLateralDistance = 0;
				this.DataSnapshots[lastDataSnaphotIndex].AccumulativeLateralDistance = 0;
				this.DataSnapshots[lastDataSnaphotIndex].Alarm = false;
				this.DataSnapshots[lastDataSnaphotIndex].StartOfAlarm = false;
				// this.DataSnapshots[lastDataSnaphotIndex].LateralDistance = 0;
				// This is where we will stop alarming.
			}

		} else {
			// This is probably the case when car moved abit but didnt leave the lane and stabalized after few points.
			if (this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex], this.DataSnapshots[lastDataSnaphotIndex - 1]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 1], this.DataSnapshots[lastDataSnaphotIndex - 2]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 2], this.DataSnapshots[lastDataSnaphotIndex - 3]))
			{
				this.DataSnapshots[lastDataSnaphotIndex].AbsoluteAccumulativeLateralDistance = 0;
				this.DataSnapshots[lastDataSnaphotIndex].AccumulativeLateralDistance = 0;
				// this.DataSnapshots[lastDataSnaphotIndex].LateralDistance = 0;
			}
		}
	}

	IsCurrentLateralDistanceLessThanPreviousSnapshot(currentDataSnapshot: LaneDepartureSnapshot, previousDataSnapshot: LaneDepartureSnapshot) {
		
		// TODO: Do we need to check check lateral and accumulateLateral both? 
		// return currentDataSnapshot.AbsoluteLateralDistance < previousDataSnapshots.AbsoluteLateralDistance ||
		// 	currentDataSnapshot.AbsoluteAccumulativeLateralDistance < previousDataSnapshots.AbsoluteAccumulativeLateralDistance;

		return currentDataSnapshot.LateralDistance < previousDataSnapshot.LateralDistance ||
			currentDataSnapshot.AccumulativeLateralDistance < previousDataSnapshot.AccumulativeLateralDistance;
	}


	// returns the section vehicle is in and a string indicating how section was determined (used for debugging).
	GetSectionOfVehicle(latitude: number, longitude: number, allSections: Section[]): [Section | undefined, string]
	{
		for (let index = 0; index < allSections.length; index++) {
			// TODO: currentSection should start from the previous point's section instead of starting from beginning of all sections.
			const currentSection = allSections[index];
			var pointIsInCurrentSection = this.IsLocationInSection(latitude, longitude, currentSection);

			if (pointIsInCurrentSection)
			{
				// At this point we also want to find out if this point is `owned` by multiple sections. So, we will also check the next section.
				const isLastSection = index === allSections.length - 1;
				if (isLastSection)
				{
					// We are in the last section so no point in checking the next section since there is none.
					return [currentSection, 'Single'];
				}

				const nextSection = allSections[index + 1];
				var pointIsInNextSection = this.IsLocationInSection(latitude, longitude, nextSection);

				if (pointIsInNextSection)
				{
					// We have a point that exists in 2 sections so we will have to figure out which section is closer to the point.
					let distanceFromEndOfCurrentSection = Math.abs(distanceTo(
						{lat: currentSection.RectangleEndLatitude, lon: currentSection.RectangleEndLongitude },
						{lat: latitude, lon: longitude }
					));

					let distanceFromStartOfNextSection = Math.abs(distanceTo(
						{lat: nextSection.RectangleStartLatitude, lon: nextSection.RectangleStartLongitude },
						{lat: latitude, lon: longitude }
					));

					return distanceFromEndOfCurrentSection <= distanceFromStartOfNextSection ? [currentSection, 'Double'] : [nextSection, 'Double']
				}

				return [currentSection, 'Single-DistanceBased'];
			}
		}

		// We haven't been able to find point in any section, we will now check distances to all sections and assinging this point to the section with min distance.
		let indexOfSectionWithMinDistance: number = 0;
		let currentMinDistance = Number.MAX_VALUE;
		for (let index = 0; index < allSections.length; index++) 
		{
			const currentSection = allSections[index];
			let distanceFromStartOfCurrentSection = Math.abs(distanceTo(
				{lat: currentSection.RectangleStartLatitude, lon: currentSection.RectangleStartLongitude },
				{lat: latitude, lon: longitude }
			));

			if (distanceFromStartOfCurrentSection < currentMinDistance)
			{
				currentMinDistance = distanceFromStartOfCurrentSection;
				indexOfSectionWithMinDistance = index;
			}
		}

		// we have the section with Min distance, now we should check if point should be assigned to section before the selected section or not.
		var selectedSection = allSections[indexOfSectionWithMinDistance]
		if (indexOfSectionWithMinDistance === 0)
		{
			// first section, we will start assigning sections when car reaches atleast the first section.
			return [undefined, 'PointBeforeFirstSection'];
		}

		var previousSection = allSections[indexOfSectionWithMinDistance - 1];

		let distanceFromEndOfPreviousSection = Math.abs(distanceTo(
			{lat: previousSection.RectangleEndLatitude, lon: previousSection.RectangleEndLongitude },
			{lat: latitude, lon: longitude }
		));

		return distanceFromEndOfPreviousSection <= currentMinDistance ? [previousSection, 'Double-DistanceBased'] : [selectedSection, 'Double-DistanceBased']
	}

	IsLocationInSection(latitude: number, longitude: number, currentSection: Section): boolean
	{
		var sectionRectangle = currentSection.SectionRectangle;
		if (sectionRectangle != undefined) {
			var boundingBox: BoundingBox = {
				topLeft:     {latitude: sectionRectangle.StartMinLatitude, longitude: sectionRectangle.StartMinLongitude}, 
				bottomRight: {latitude: sectionRectangle.EndMaxLatitude, longitude: sectionRectangle.EndMaxLongitude}
			}
			  
			return insideBoundingBox({latitude: latitude, longitude: longitude}, boundingBox)
		}
		
		throw new Error("no bounding rectangle defined for section.");
	}
}