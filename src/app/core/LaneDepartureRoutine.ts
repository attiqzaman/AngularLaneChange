import { distanceTo, headingDistanceTo } from "geolocation-utils";
import { LaneDepartureSnapshot } from "./LaneDepartureSnapshot";
import { Section, SectionType } from "./Section";
import { Snapshot } from "./Snapshot";


export class LaneDepartureRoutine {
	
	// TODO: The DataStructure probably should be a Queue since we only use latest `X` number of elements and we need a mechanism to 
	// remove the older items. For now I am using arrays since JS/TS doesn't have a built-in queue data structure and this work is throw-away anyway.
	DataSnapshots: LaneDepartureSnapshot[] = [];

	constructor() {
		let allSections = this.GetAllSections();
		const gpsSnapshots = this.GetCoordinates();
	
		gpsSnapshots.forEach(gpsSnapshot => {
			this.ProcessNewGpsSnapshot(gpsSnapshot, allSections);
			this.PredictLaneDeparture();
		});
	}

	// This will basically be the GPS event callback
	ProcessNewGpsSnapshot(gpsSnapshot: Snapshot, allSections: Section[]) {
		let currentDatasnapshot: LaneDepartureSnapshot = new LaneDepartureSnapshot(gpsSnapshot.Latitude, gpsSnapshot.Longitude);
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
		currentDatasnapshot.AccumulativeDistance = previousDataSnapshot.AccumulativeDistance + currentDatasnapshot.Distance;
		currentDatasnapshot.Heading = headingDistanceFromPreviousSnapshot.heading;

		if (this.DataSnapshots.length < 3) {
			this.DataSnapshots.push(currentDatasnapshot);
			return;
		}
		
		let previousToPreviousDataSnapshot = this.DataSnapshots[this.DataSnapshots.length - 2];
		currentDatasnapshot.AveragedHeading = (previousToPreviousDataSnapshot.Heading + previousDataSnapshot.Heading + currentDatasnapshot.Heading) / 3;
		
		const currentVahicleSection = this.GetSectionOfVehicle(currentDatasnapshot.Latitude, currentDatasnapshot.Longitude, allSections);
		if (currentVahicleSection === undefined) {
			return;
		}

		currentDatasnapshot.DistanceFromStartOfSection = distanceTo(
			{lat: currentVahicleSection.StartLatitude, lon: currentVahicleSection.StartLongitude },
			{lat: currentDatasnapshot.Latitude, lon: currentDatasnapshot.Longitude }
		);

		currentDatasnapshot.RefrenceHeading = currentVahicleSection.SectionType === SectionType.Straight 
			? currentVahicleSection.PathAveragedHeading
			: currentVahicleSection.PathAveragedHeading + (currentVahicleSection.PathAvergaedSlope * currentDatasnapshot.DistanceFromStartOfSection);
		
		// Lateral Distance and Accumulated Lateral Distance Calculation (we use these to decide if lane departure happened)
		currentDatasnapshot.Theta = currentDatasnapshot.RefrenceHeading - currentDatasnapshot.AveragedHeading;

		// We want to find Perpendicular field of a right triangle
		currentDatasnapshot.LateralDistance = currentDatasnapshot.Distance * Math.sin(currentDatasnapshot.Theta * Math.PI / 180) // Sin(Theta) = P / H
		currentDatasnapshot.AccumulativeLateralDistance = previousDataSnapshot.AccumulativeLateralDistance + currentDatasnapshot.LateralDistance;

		// Although we probably will only care about absolute value of lateral distances but to help debug stuff I will create separate properties
		// for Absolute lateral distances
		currentDatasnapshot.AbsoluteLateralDistance = Math.abs(currentDatasnapshot.AbsoluteLateralDistance)
		currentDatasnapshot.AbsoluteAccumulativeLateralDistance = Math.abs(currentDatasnapshot.AbsoluteAccumulativeLateralDistance)
		this.DataSnapshots.push(currentDatasnapshot);
	}

	GetAllSections(): Section[] {
		throw new Error("Function not implemented.");
	}
	GetCoordinates(): Snapshot[] {
		throw new Error("Function not implemented.");
	}

	PredictLaneDeparture() {
		let lastDataSnaphotIndex = this.DataSnapshots.length - 1;

		if (this.DataSnapshots[lastDataSnaphotIndex].AbsoluteAccumulativeLateralDistance >= 1) {
			
			// Alarm here. For debugging/testing I will update a field in the object. 
			this.DataSnapshots[lastDataSnaphotIndex].Alarm = true;

			// We now need to calculate if Accmulative Lateral Distance needs to be reset or not. Once a vehicle completes
			// a lane departure we need to set the Accumulative lateral distance to 0 so we can catch the next lane departure.
			if (this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex], this.DataSnapshots[lastDataSnaphotIndex - 1]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 1], this.DataSnapshots[lastDataSnaphotIndex - 2]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 2], this.DataSnapshots[lastDataSnaphotIndex - 3]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 3], this.DataSnapshots[lastDataSnaphotIndex - 4]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 4], this.DataSnapshots[lastDataSnaphotIndex - 5]))
			{
				this.DataSnapshots[lastDataSnaphotIndex].AbsoluteAccumulativeLateralDistance = 0;
				this.DataSnapshots[lastDataSnaphotIndex].LateralDistance = 0;
				// This is where we will stop alarming.
			}

		} else {
			// This is probably the case when car moved abit but didnt leave the lane and stabalized after few points.
			if (this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex], this.DataSnapshots[lastDataSnaphotIndex - 1]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 1], this.DataSnapshots[lastDataSnaphotIndex - 2]) &&
				this.IsCurrentLateralDistanceLessThanPreviousSnapshot(this.DataSnapshots[lastDataSnaphotIndex - 2], this.DataSnapshots[lastDataSnaphotIndex - 3]))
			{
				this.DataSnapshots[lastDataSnaphotIndex].AbsoluteAccumulativeLateralDistance = 0;
				this.DataSnapshots[lastDataSnaphotIndex].LateralDistance = 0;
			}
		}
	}

	IsCurrentLateralDistanceLessThanPreviousSnapshot(currentDataSnapshot: LaneDepartureSnapshot, previousDataSnapshots: LaneDepartureSnapshot) {
		
		// TODO: Do we need to check check lateral and accumulateLateral both? 
		return currentDataSnapshot.AbsoluteLateralDistance < previousDataSnapshots.AbsoluteLateralDistance ||
			currentDataSnapshot.AbsoluteAccumulativeLateralDistance < previousDataSnapshots.AbsoluteAccumulativeLateralDistance;
	}

	GetSectionOfVehicle(latitude: number, longitude: number, allSections: Section[]): Section | undefined
	{
		const change: number = 0.0005;
		var sectionsFound = this.FindSections(latitude, longitude, allSections, change);
		
		if (sectionsFound.length > 1)
		{
			let i = 0;
			while (sectionsFound.length > 1)
			{
				i = i + 0.0001;
				sectionsFound = this.FindSections(latitude, longitude, allSections, change);
				if (sectionsFound.length == 0)
				{
					i = i - 0.0001;
					sectionsFound = this.FindSections(latitude, longitude, allSections, change);
					break;
				}
			}
		}

		return sectionsFound.length > 0 ? sectionsFound[0] : undefined;
	}

	FindSections(latitude: number, longitude: number, allSections: Section[], change: number): Section[]
	{
		var sectionsFound: Section[] = [];
		for (var section of allSections)
		{
			var minLatitude = section.EndLatitude >= section.StartLatitude ? section.StartLatitude : section.EndLatitude;
			var maxLatitude = minLatitude == section.StartLatitude ? section.EndLatitude : section.StartLatitude;

			var minLongitude = section.EndLongitude >= section.StartLongitude ? section.StartLongitude : section.EndLongitude;
			var maxLongitude = minLongitude == section.StartLongitude ? section.EndLongitude : section.StartLongitude;

			minLatitude = minLatitude - change;
			maxLatitude = maxLatitude + change;
			minLongitude = minLongitude - change;
			maxLongitude = maxLongitude + change;

			if (latitude <= maxLatitude && latitude >= minLatitude && longitude <= maxLongitude && longitude >= minLongitude)
			{
				sectionsFound.push(section);
			}
		}

		return sectionsFound;
	}
}






