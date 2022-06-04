import { distanceTo, headingDistanceTo } from "geolocation-utils";
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
			this.ProcessNewGpsSnapshot(gpsSnapshot, allSections);
			this.PredictLaneDeparture();
		});
		
		drawSections(allSections, mapService.map);
		this.DataSnapshots.forEach(laneDepartureSnapshot => {
			if (laneDepartureSnapshot.Alarm) {
				drawPointWithColorAndData(laneDepartureSnapshot, 'black', mapService.map);
			}
		});


		PrintLdwSnapshotsAsCsv(this.DataSnapshots);
	}

	// This will basically be the GPS event callback
	ProcessNewGpsSnapshot(gpsSnapshot: Snapshot, allSections: Section[]) {
		let startDate: Date = this.DataSnapshots.length > 0 ? this.DataSnapshots[0].TimeStamp : new Date(gpsSnapshot.TimeStampAsString);
		let currentDatasnapshot: LaneDepartureSnapshot = new LaneDepartureSnapshot(
			gpsSnapshot.Latitude,
			gpsSnapshot.Longitude,
			gpsSnapshot.SnapshotNumber,
			gpsSnapshot.TimeStampAsString,
			startDate);


		if (this.DataSnapshots.length < 2) {
			this.DataSnapshots.push(currentDatasnapshot);
			return;
		}

		let previousDataSnapshot = this.DataSnapshots[this.DataSnapshots.length - 1];
		let headingDistanceFromPreviousSnapshot = headingDistanceTo(
			{lat: previousDataSnapshot.Latitude, lon: previousDataSnapshot.Longitude },
			{lat: gpsSnapshot.Latitude, lon: gpsSnapshot.Longitude }
		)

		currentDatasnapshot.Distance = headingDistanceFromPreviousSnapshot.distance;
		currentDatasnapshot.AccumulativeDistance = previousDataSnapshot.AccumulativeDistance + currentDatasnapshot.Distance; // not really used?
		currentDatasnapshot.Heading = headingDistanceFromPreviousSnapshot.heading + 360;

		if (this.DataSnapshots.length < 5) {
			this.DataSnapshots.push(currentDatasnapshot);
			return;
		}
		
		let previousToPreviousDataSnapshot = this.DataSnapshots[this.DataSnapshots.length - 2];
		currentDatasnapshot.AveragedHeading = (previousToPreviousDataSnapshot.Heading + previousDataSnapshot.Heading + currentDatasnapshot.Heading) / 3;
		
		const currentVahicleSection = this.GetSectionOfVehicle(currentDatasnapshot.Latitude, currentDatasnapshot.Longitude, allSections);
		if (currentVahicleSection === undefined) {
			this.Counter++;
			return;
		}

		currentDatasnapshot.SectionStartIndex = currentVahicleSection.StartIndex; 
		// We need to figure out if this is the first point in a 'new section. (this should check SectionId in final version)
		if (currentDatasnapshot.SectionStartIndex === previousDataSnapshot.SectionStartIndex) {
			currentDatasnapshot.DistanceFromStartOfSection = previousDataSnapshot.DistanceFromStartOfSection + currentDatasnapshot.Distance;
		} else {
			currentDatasnapshot.IsFirstPointInSection = true;
			currentDatasnapshot.DistanceFromStartOfSection = distanceTo(
				{lat: currentVahicleSection.StartLatitude, lon: currentVahicleSection.StartLongitude },
				{lat: currentDatasnapshot.Latitude, lon: currentDatasnapshot.Longitude }
			);
		}

		// Confirm DistanceFromStartOfSection 
		currentDatasnapshot.RefrenceHeading = currentVahicleSection.SectionType === SectionType.Straight 
			? currentVahicleSection.OptimizedPathAveragedHeading
			: currentVahicleSection.OptimizedInitialHeading + (currentVahicleSection.OptimizedPathAvergaedSlope * currentDatasnapshot.DistanceFromStartOfSection);
		
		// Lateral Distance and Accumulated Lateral Distance Calculation (we use these to decide if lane departure happened)
		currentDatasnapshot.Theta = currentDatasnapshot.RefrenceHeading - currentDatasnapshot.AveragedHeading; // rename to currentAveragedHeading

		// We want to find Perpendicular field of a right triangle
		currentDatasnapshot.LateralDistance = currentDatasnapshot.Distance * Math.sin(currentDatasnapshot.Theta * Math.PI / 180) // Sin(Theta) = P / H
		currentDatasnapshot.AccumulativeLateralDistance = previousDataSnapshot.AccumulativeLateralDistance + currentDatasnapshot.LateralDistance;

		// Although we probably will only care about absolute value of lateral distances but to help debug stuff I will create separate properties
		// for Absolute lateral distances
		currentDatasnapshot.AbsoluteLateralDistance = Math.abs(currentDatasnapshot.LateralDistance)
		currentDatasnapshot.AbsoluteAccumulativeLateralDistance = Math.abs(currentDatasnapshot.AccumulativeLateralDistance)
		this.DataSnapshots.push(currentDatasnapshot);
	}

	GetAllSections(): Section[] {
		throw new Error("Function not implemented.");
	}
	GetCoordinates(): Snapshot[] {
		throw new Error("Function not implemented.");
	}

	PredictLaneDeparture() {
		if (this.DataSnapshots.length < 5) {
			return;
		}

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

	GetSectionOfVehicle(latitude: number, longitude: number, allSections: Section[]): Section | undefined
	{
		const change: number = 0.00005;
		for (var section of allSections)
		{
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

			if (section.EndLongitude >= section.StartLongitude) {
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

			if (latitude <= maxLatitude && latitude >= minLatitude && longitude <= maxLongitude && longitude >= minLongitude)
			{
				return section;
			}
		}

		return undefined;
	}
}