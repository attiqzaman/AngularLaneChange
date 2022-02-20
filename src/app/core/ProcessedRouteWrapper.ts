
    /**A wrapper to keep all list of double arrays needed to generate road sections. */

import { Snapshot } from "./Snapshot";
import { ApplySmoothingfilter, AreSnapshotsOnSamePoint, CalculateAveragedDifferentialHeadings, CalculatePathAveragedDifferentialHeading, CalculatePathAveragedHeading, CalculatePathAveragedSlope, GetAllNonStraightSections, GetStraightSections, OptimizeCurveSection, OptimizeStraightSection, PathAveragedDifferentialHeadingReselect } from "./Util";
import { headingDistanceTo } from 'geolocation-utils'
import { Section, SectionType } from "./Section";

    // TODO: Clean this once we have finalized the implementation.


    export class ProcessedRouteWrapper {
		UserId: string;
		RouteId: string;
		SortedSnapshots: Snapshot[];

        Distances: number[] = [];
		Latitudes: number[] = [];
		Longitudes: number[] = [];
		SmoothedHeading: number[] = [];
		OutHeadings: number[] = [];
		Slopes: number[] = [];
		Accuracies: number[] = [];
		AccumulativeDistances: number[] = [];
		AverageHeadings: number[] = [];
		DifferentialHeadings: number[] = [];
		cutOffFrequency2: number;
		cutOffFrequency1: number;
		StraightSections: Section[] = [];
		AveragedDifferentialHeadings: number[] = [];
		PathAveragedHeadings: number[] = [];
		AllSections: Section[] = [];

		// We will most likely use Google points but foer now keeping the non-google provided GPS data too.
		// DistancesNotGoogle: number[];
		// LatitudesNotGoogle: number[];
		// LongitudesNotGoogle: number[];
		// OutHeadingsNotGoogle: number[];
		// SlopesNotGoogle: number[];
		// AccuraciesNotGoogle: number[];
		// AccumulativeDistancesNotGoogle: number[];
		// AverageHeadingsNotGoogle: number[];
		// DifferentialHeadingsNotGoogle: number[];

        constructor(userId: string, routeId: string, cutOffFrequency1: number, cutOffFrequency2: number, snapshots: Snapshot[]) {
            this.UserId = userId;
            this.RouteId = routeId;
			this.cutOffFrequency1 = cutOffFrequency1;
			this.cutOffFrequency2 = cutOffFrequency2;
            this.SortedSnapshots = snapshots;

			this.ProcessRoute(true);
        }

        ProcessRoute(useGooglePoints: boolean)
        {
			// we are looping way too many times, refactor this later.

			// clean data abit (remove duplicated points etc)
			let sortedCompleteRoute: Snapshot[] = [];
            for (let i = 1; i < this.SortedSnapshots.length; i++)
			{
				if (AreSnapshotsOnSamePoint(this.SortedSnapshots[i - 1], this.SortedSnapshots[i], useGooglePoints))
				{
					continue;
				}

				sortedCompleteRoute.push(this.SortedSnapshots[i]);
			}

			this.Distances.push(0);
			this.OutHeadings.push(0);
			this.Slopes.push(0);
			this.Accuracies.push(0);
			this.AccumulativeDistances.push(0);


			for (let index = 0; index < sortedCompleteRoute.length; index++)
			{
				// let index = i - 1;
				let currentSnapshot = sortedCompleteRoute[index];

				if (useGooglePoints)
				{
					this.Longitudes.push(currentSnapshot.GoogleLongitude);
					this.Latitudes.push(currentSnapshot.GoogleLatitude);
				}
				else
				{
					this.Longitudes.push(currentSnapshot.Longitude);
					this.Latitudes.push(currentSnapshot.Latitude);
				}

				if (this.Longitudes.length > 1) // Refactor later, basically make sure we have atleast 2 clean points before calculating rest of the data.
				{
					let headingDistance = headingDistanceTo(
						{lat: this.Latitudes[index - 1], lon: this.Longitudes[index - 1] },
						{lat: this.Latitudes[index], lon: this.Longitudes[index]}
					)

                    this.Distances.push(headingDistance.distance)
					this.OutHeadings.push(headingDistance.heading);
					// let slope = (this.OutHeadings[index] - this.OutHeadings[index - 1]) / this.Distances[index];
					// this.Slopes.push(slope);
					this.Accuracies.push(currentSnapshot.Accuracy);
					this.AccumulativeDistances.push(this.Distances[index] + this.AccumulativeDistances[index - 1]);
				}
			}

			// SmoothedHeading should replace AverageHeadings
			// this.AverageHeadings.push(0);

			// for (let i = 1; i < this.OutHeadings.length; i++)
			// {
			// 	if (i < 5 || i > this.OutHeadings.length - 6)
			// 	{
			// 		// They really want to see 0 in excel instead of just not showing the row or keeping the raw value.
			// 		this.AverageHeadings.push(0);
			// 	}
			// 	else
			// 	{
			// 		this.AverageHeadings.push((this.OutHeadings[i - 4] + this.OutHeadings[i - 3] + this.OutHeadings[i - 2] + this.OutHeadings[i - 1] +
			// 			this.OutHeadings[i] + this.OutHeadings[i + 1] + this.OutHeadings[i + 2] + this.OutHeadings[i + 3] + this.OutHeadings[i + 4]) / 9);
			// 	}
			// }

			this.SmoothedHeading = ApplySmoothingfilter(this.OutHeadings, this.cutOffFrequency1, this.cutOffFrequency2);
			for (let i = 1; i < this.SmoothedHeading.length; i++) {
				let slope = (this.SmoothedHeading[i] - this.SmoothedHeading[i - 1]) / this.Distances[i];
				this.Slopes.push(slope);	
			}

			// Now calculate differential headings array from smoothed headings
			this.DifferentialHeadings.push(0);
			for (let i = 1; i < this.SmoothedHeading.length; i++) {
				this.DifferentialHeadings.push((this.SmoothedHeading[i] - this.SmoothedHeading[i - 1])/3);
			}

			this.AveragedDifferentialHeadings = CalculateAveragedDifferentialHeadings(this.DifferentialHeadings);
			let straightSections = GetStraightSections(this.AveragedDifferentialHeadings);

			// TODO: post-process straight sections if needed e.g.
			// * any spot between straight sections which is less than 50 m (parameterised) then its single straight section
			// * if the spot between straight sections is alittle more than 50 meters then we compare the PAH of both straight
			// sections and if its less than a threhold (0.1 m/degree) then we consider that one single straight section
			const MinimumPointsBetweenStraightSections = 25;

			let previousStraightSectionPointer = 0;
			for (let i = 1; i < straightSections.length; i++) {
				const currentStraightSection = straightSections[i];
				const previousStraightSection = straightSections[previousStraightSectionPointer];

				if (currentStraightSection.StartIndex - previousStraightSection.EndIndex < MinimumPointsBetweenStraightSections) {
					previousStraightSection.EndIndex = currentStraightSection.EndIndex;
					// Remove last section from array
					delete straightSections[i];
				} else {
					// typescript deletes the object and sets the array[j] value with undefined object so we need to handle that.
					for (let j = previousStraightSectionPointer + 1; j < straightSections.length; j++) {
						if (straightSections[j] !== undefined) {
							previousStraightSectionPointer = j;
							break;
						}	
					}
				}
			}			
			
			straightSections.forEach(section => {
				let pathAveragedHeading = CalculatePathAveragedHeading(section, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				section.PathAveragedHeading = pathAveragedHeading;
				this.StraightSections.push(section);
			});

			this.AllSections.push(this.StraightSections[0])
			// Assume our path starts and ends at a straight section for now.
			for (let i = 1; i < this.StraightSections.length; i++) {
				const currentStraightSection = this.StraightSections[i];
				const previousStraightSection = this.StraightSections[i - 1];
				
				let rawNonStraightSection = new Section(previousStraightSection.EndIndex, currentStraightSection.StartIndex, SectionType.Unknown);
				
				// we need to process this section more to get the transient sections
				let pathAveragedDifferentialHeading1 = CalculatePathAveragedDifferentialHeading(rawNonStraightSection, this.AveragedDifferentialHeadings, this.Distances, this.AccumulativeDistances);
				let reSelectedSection1 = PathAveragedDifferentialHeadingReselect(rawNonStraightSection, this.AveragedDifferentialHeadings, pathAveragedDifferentialHeading1);

				// rerun the padh and reselect process.
				let pathAveragedDifferentialHeading2 = CalculatePathAveragedDifferentialHeading(reSelectedSection1, this.AveragedDifferentialHeadings, this.Distances, this.AccumulativeDistances);
				let trueCurveSection = PathAveragedDifferentialHeadingReselect(reSelectedSection1, this.AveragedDifferentialHeadings, pathAveragedDifferentialHeading2);
				trueCurveSection.SectionType = SectionType.Curved;

				let pathAveragedSlopeForCurveSection = CalculatePathAveragedSlope(trueCurveSection, this.Slopes, this.Distances, this.AccumulativeDistances);
				trueCurveSection.PathAvergaedSlope = pathAveragedSlopeForCurveSection;
				trueCurveSection.InitialHeading = this.SmoothedHeading[trueCurveSection.StartIndex + 1];

				// now we have curve section, the sections to the right and left are transient sections.
				let leftTransientSection = new Section(rawNonStraightSection.StartIndex, trueCurveSection.StartIndex, SectionType.Transient);
				let pathAveragedSlopeForLeftTransientSection = CalculatePathAveragedSlope(leftTransientSection, this.Slopes, this.Distances, this.AccumulativeDistances);
				leftTransientSection.PathAvergaedSlope = pathAveragedSlopeForLeftTransientSection;
				leftTransientSection.InitialHeading = this.SmoothedHeading[leftTransientSection.StartIndex + 1];

				let rightTransientSection = new Section(trueCurveSection.EndIndex, rawNonStraightSection.EndIndex, SectionType.Transient);
				let pathAveragedSlopeForRightTransientSection = CalculatePathAveragedSlope(rightTransientSection, this.Slopes, this.Distances, this.AccumulativeDistances);
				rightTransientSection.PathAvergaedSlope = pathAveragedSlopeForRightTransientSection;
				rightTransientSection.InitialHeading = this.SmoothedHeading[rightTransientSection.StartIndex + 1];

				this.AllSections.push(leftTransientSection);
				this.AllSections.push(trueCurveSection);
				this.AllSections.push(rightTransientSection);
				this.AllSections.push(currentStraightSection);
			}


			// Optimize straight sections
			this.AllSections.forEach(section => {
				if (section.SectionType === SectionType.Straight) {
					OptimizeStraightSection(section, this.SmoothedHeading, this.Distances);
				} else {
					OptimizeCurveSection(section, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				}

					section.StartLatitude = this.Latitudes[section.StartIndex];
					section.StartLongitude = this.Longitudes[section.StartIndex];
					section.EndLatitude = this.Latitudes[section.EndIndex];
					section.EndLongitude = this.Longitudes[section.EndIndex];
			});



			// const dh1 = GetDH1(this.DifferentialHeadings);
			// const straightSections = GetStraightSections(dh1);

			// return (this.Latitudes, longitudes, this.Accuracies, this.Distances, this.OutHeadings, this.Slopes, this.AccumulativeDistances, this.AverageHeadings, this.DifferentialHeadings);
		}
	}