
    /**A wrapper to keep all list of double arrays needed to generate road sections. */

import { Snapshot } from "./Snapshot";
import { ApplySmoothingfilter, AreSnapshotsOnSamePoint, CalculateAveragedDifferentialHeadings, CalculatePathAveragedDifferentialHeading, CalculatePathAveragedHeading, CalculatePathAveragedSlope, CalculatePathAveragedSlopeOfTransitionSection, CalculateRectangleOfSection, GetAllNonStraightSections, GetStraightSections, OptimizeCurveSection, OptimizeStraightSection, OptimizeTransientSection, PathAveragedDifferentialHeadingReselect } from "./Util";
import { headingDistanceTo } from 'geolocation-utils'
import { Section, SectionType } from "./Section";
import { MapService } from "./map.service";
import { CurrencyPipe } from "@angular/common";
    // TODO: Clean this once we have finalized the implementation.


    export class ProcessedRouteWrapper {
		UserId: string;
		RouteId: string;
		SortedSnapshots: Snapshot[];

        Distances: number[] = [];
		AverageDistances: number[] = [];
		Latitudes: number[] = [];
		Longitudes: number[] = [];
		SmoothedHeading: number[] = [];
		OutHeadings: number[] = [];
		Slopes: number[] = [];
		Accuracies: number[] = [];
		AccumulativeDistances: number[] = [];
		AverageAccumulativeDistances: number[] = [];
		AverageHeadings: number[] = [];
		DifferentialHeadings: number[] = [];
		cutOffFrequency2: number;
		cutOffFrequency1: number;
		StraightSections: Section[] = [];
		StraightSectionsTH2: Section[] = [];
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

        constructor(userId: string, routeId: string, cutOffFrequency1: number, cutOffFrequency2: number, snapshots: Snapshot[], useGooglePoints: boolean = true) {
            this.UserId = userId;
            this.RouteId = routeId;
			this.cutOffFrequency1 = cutOffFrequency1;
			this.cutOffFrequency2 = cutOffFrequency2;
            this.SortedSnapshots = snapshots;

			this.ProcessRoute(useGooglePoints);
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


					//this.Distances.push(headingDistance.distance)
					this.OutHeadings.push(headingDistance.heading + 360);
					this.Distances.push(headingDistance.distance)
					this.Accuracies.push(currentSnapshot.Accuracy);
					this.AccumulativeDistances.push(headingDistance.distance + this.AccumulativeDistances[index - 1]);
				}
			}

			// We want to use averaged distance, for now we will keep the Distances array, once this decision is final
			// we should get rid of the Distances array and use a single averageDistanceBetweenPoints variable everywhere.

			const averageDistanceBetweenPoints = this.AccumulativeDistances[this.AccumulativeDistances.length - 1] / (this.AccumulativeDistances.length - 2);
			for (let i = 0; i < this.AccumulativeDistances.length; i++) {
				this.AverageDistances.push(averageDistanceBetweenPoints);
				this.AverageAccumulativeDistances.push(averageDistanceBetweenPoints + this.AccumulativeDistances[i - 1]);
			}
			this.Distances=this.AverageDistances;
			this.AccumulativeDistances = this.AverageAccumulativeDistances;
			// for Google route (needs to be commented for actual trajectories)
			//this.SmoothedHeading = ApplySmoothingfilter(this.OutHeadings, this.cutOffFrequency1, this.cutOffFrequency2);
			// for actual route
			for (let i = 0; i < this.OutHeadings.length; i++) {
				if (i < 4) {
					this.SmoothedHeading.push(this.OutHeadings[i]); // smoothed heading isn't averaged for first 4 points.
				} else {
					this.SmoothedHeading.push((this.OutHeadings[i - 4] + this.OutHeadings[i - 3] + this.OutHeadings[i - 2] + this.OutHeadings[i - 1] + this.OutHeadings[i] + this.OutHeadings[i + 1] + this.OutHeadings[i + 2] + this.OutHeadings[i + 3] + this.OutHeadings[i + 4]) / 9 );
				}				
			}

			for (let i = 1; i < this.SmoothedHeading.length; i++) {
				let slope = (this.SmoothedHeading[i] - this.SmoothedHeading[i - 1]) / this.Distances[i];
				this.Slopes.push(slope);	
			}
			
			

			// Now calculate differential headings array from smoothed headings
			this.DifferentialHeadings.push(0);
			for (let i = 1; i < this.SmoothedHeading.length; i++) {
				this.DifferentialHeadings.push((this.SmoothedHeading[i] - this.SmoothedHeading[i - 1])/ this.Distances[i]);
			}

			this.AveragedDifferentialHeadings = CalculateAveragedDifferentialHeadings(this.DifferentialHeadings);
			let threshold1 = 0.002;
			
			let straightSections = GetStraightSections(this.AveragedDifferentialHeadings,threshold1);
			
			let threshold2 = 0.01;
			let straightSectionsth2 = GetStraightSections(this.AveragedDifferentialHeadings,threshold2);
			

			// TODO: post-process straight sections if needed e.g.
			// * any spot between straight sections which is less than 50 m (parameterised) then its single straight section
			// * if the spot between straight sections is alittle more than 50 meters then we compare the PAH of both straight
			// sections and if its less than a threhold (0.1 m/degree) then we consider that one single straight section
			const MinimumPointsBetweenStraightSections = 75;

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
				OptimizeStraightSection(section, this.SmoothedHeading, this.Distances); // optimize straight sections
				this.AddSectionMetaData(section);
				this.StraightSections.push(section);
			});
			straightSectionsth2.forEach(section => {
				this.StraightSectionsTH2.push(section);
			});
			this.AllSections.push(this.StraightSections[0])

			for (let i = 1; i < this.StraightSectionsTH2.length; i++) {
			console.log("prev start th2 " + this.StraightSectionsTH2[i-1].StartIndex)
                console.log("previous end th2 " + this.StraightSectionsTH2[i-1].EndIndex)
                console.log("current start th2 " + this.StraightSectionsTH2[i].StartIndex)
                console.log("current end th2 " + this.StraightSectionsTH2[i].EndIndex)
			}
			// Assume our path starts and ends at a straight section for now.
			for (let i = 1; i < this.StraightSections.length; i++) {
				var currentStraightSection = this.StraightSections[i];
				var previousStraightSection = this.StraightSections[i - 1];
				console.log("previous start " + previousStraightSection.StartIndex)
                console.log("previous end " + previousStraightSection.EndIndex)
                console.log("current start " + currentStraightSection.StartIndex)
                console.log("current end " + currentStraightSection.EndIndex)
				
				let rawNonStraightSection = new Section(previousStraightSection.EndIndex, currentStraightSection.StartIndex, SectionType.Unknown);
				
				// we need to process this section more to get the transient sections
				let pathAveragedDifferentialHeading1 = CalculatePathAveragedDifferentialHeading(rawNonStraightSection, this.AveragedDifferentialHeadings, this.Distances, this.AccumulativeDistances);
				let reSelectedSection1 = PathAveragedDifferentialHeadingReselect(rawNonStraightSection, this.AveragedDifferentialHeadings, pathAveragedDifferentialHeading1);
				let trueCurveSection= reSelectedSection1
				
				//commented following three lines below and added one line above to get rid of the 2nd iteration
				// rerun the padh and reselect process.
				//let pathAveragedDifferentialHeading2 = CalculatePathAveragedDifferentialHeading(reSelectedSection1, this.AveragedDifferentialHeadings, this.Distances, this.AccumulativeDistances);
				//let trueCurveSection = PathAveragedDifferentialHeadingReselect(reSelectedSection1, this.AveragedDifferentialHeadings, pathAveragedDifferentialHeading2);
				trueCurveSection.SectionType = SectionType.Curved;

				let pathAveragedSlopeForCurveSection = CalculatePathAveragedSlope(trueCurveSection, this.Slopes, this.Distances, this.AccumulativeDistances);
				trueCurveSection.PathAvergaedSlope = pathAveragedSlopeForCurveSection;
				trueCurveSection.InitialHeading = this.SmoothedHeading[trueCurveSection.StartIndex]; // may be average in future?
				this.AddSectionMetaData(trueCurveSection); //added later
				//OptimizeCurveSection(trueCurveSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances); //optimize curve section
				//this.AddSectionMetaData(trueCurveSection); //added later

				//changing threshold of straight sections depending on slope of curve
                if (Math.abs(trueCurveSection.PathAvergaedSlope) > 0.02){                                
                 for(let j = 1; j < this.StraightSectionsTH2.length; j++) {
                     let countend=0; 
                     let countstart=0;   
                                            
                     if(this.StraightSectionsTH2[j].EndIndex >= previousStraightSection.EndIndex) {
                          previousStraightSection.EndIndex=this.StraightSectionsTH2[j].EndIndex;
                          currentStraightSection.StartIndex=this.StraightSectionsTH2[j+1].StartIndex;
                          countend++;
                          if (countend==1){
                                
                              {break;}
                             }
                            
                          }
                     }
                        
                 }
			    console.log("previous start modified " + previousStraightSection.StartIndex)
                console.log("previous end modified " + previousStraightSection.EndIndex)
                console.log("current start modified " + currentStraightSection.StartIndex)
                console.log("current end modified " + currentStraightSection.EndIndex)

				

				//combining straight sections if curve length is less than 75m
				// let takeTrueCurveSection = true
                if (trueCurveSection.TotalSectionLength <= 0.8*MinimumPointsBetweenStraightSections|| Math.abs((currentStraightSection.OptimizedPathAveragedHeading- previousStraightSection.OptimizedPathAveragedHeading)/(currentStraightSection.StartIndex-previousStraightSection.EndIndex)) < threshold1){
					//|| Math.abs((currentStraightSection.PathAveragedHeading- previousStraightSection.PathAveragedHeading)/(currentStraightSection.StartIndex-previousStraightSection.EndIndex)) < threshold1){
					//this.AllSections[this.AllSections.length- 1].EndIndex = currentStraightSection.EndIndex;
                 	previousStraightSection.EndIndex = currentStraightSection.EndIndex;
					this.StraightSections[i] = previousStraightSection;
					this.AddSectionMetaData(this.StraightSections[i]);
					
					continue;
					
			
                 	// currentStraightSection.StartIndex=this.StraightSections[i+1].StartIndex
					// currentStraightSection.EndIndex=this.StraightSections[i+1].EndIndex;
					//currentStraightSection=this.StraightSections[i+1];
					//takeTrueCurveSection  = false
                }
			
				OptimizeCurveSection(trueCurveSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances); //optimize curve section
				this.AddSectionMetaData(trueCurveSection); //added later

				//this.AddSectionMetaData(trueCurveSection);
				
				let pathAveragedHeadingP = CalculatePathAveragedHeading(previousStraightSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				previousStraightSection.PathAveragedHeading = pathAveragedHeadingP;
				OptimizeStraightSection(previousStraightSection, this.SmoothedHeading, this.Distances); // optimize straight sections
				this.AddSectionMetaData(previousStraightSection);
				this.AllSections.pop();
				this.AllSections.push(previousStraightSection);

				let pathAveragedHeading = CalculatePathAveragedHeading(currentStraightSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				currentStraightSection.PathAveragedHeading = pathAveragedHeading;
				OptimizeStraightSection(currentStraightSection, this.SmoothedHeading, this.Distances); // optimize straight sections
				this.AddSectionMetaData(currentStraightSection);

			
				// now we have curve section, the sections to the right and left are transient sections.
				let leftTransientSection = new Section(previousStraightSection.EndIndex, trueCurveSection.StartIndex, SectionType.Transient);
				//let pathAveragedSlopeForLeftTransientSection = CalculatePathAveragedSlopeOfTransitionSection(leftTransientSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				//leftTransientSection.PathAvergaedSlope = pathAveragedSlopeForLeftTransientSection;
				leftTransientSection.InitialHeading = previousStraightSection.PathAveragedHeading;
                var sectionLengthLeftTransient = this.AccumulativeDistances[leftTransientSection.EndIndex] - this.AccumulativeDistances[leftTransientSection.StartIndex];
                let pathAveragedSlopeForLeftTransientSection = (trueCurveSection.InitialHeading-leftTransientSection.InitialHeading)/sectionLengthLeftTransient;
                leftTransientSection.PathAvergaedSlope = pathAveragedSlopeForLeftTransientSection;
                leftTransientSection.OptimizedInitialHeading = previousStraightSection.OptimizedPathAveragedHeading;
                let OptimizedpathAveragedSlopeForLeftTransientSection = (trueCurveSection.OptimizedInitialHeading-leftTransientSection.OptimizedInitialHeading)/sectionLengthLeftTransient;
                leftTransientSection.OptimizedPathAvergaedSlope = OptimizedpathAveragedSlopeForLeftTransientSection;

				//leftTransientSection.InitialHeading = currentStraightSection.OptimizedPathAveragedHeading;
				//OptimizeTransientSection(leftTransientSection);
				this.AddSectionMetaData(leftTransientSection);

				let rightTransientSection = new Section(trueCurveSection.EndIndex, currentStraightSection.StartIndex, SectionType.Transient);
				//let pathAveragedSlopeForRightTransientSection = CalculatePathAveragedSlopeOfTransitionSection(rightTransientSection, this.SmoothedHeading, this.Distances, this.AccumulativeDistances);
				//rightTransientSection.PathAvergaedSlope = pathAveragedSlopeForRightTransientSection;

				var sectionLength = this.AccumulativeDistances[trueCurveSection.EndIndex] - this.AccumulativeDistances[trueCurveSection.StartIndex];
				//rightTransientSection.InitialHeading = trueCurveSection.OptimizedInitialHeading + (trueCurveSection.OptimizedPathAvergaedSlope * sectionLength);
				rightTransientSection.InitialHeading = trueCurveSection.InitialHeading + (trueCurveSection.PathAvergaedSlope * sectionLength);
                var sectionLengthRightTransient = this.AccumulativeDistances[rightTransientSection.EndIndex] - this.AccumulativeDistances[rightTransientSection.StartIndex];
                let pathAveragedSlopeForRightTransientSection = (currentStraightSection.PathAveragedHeading-rightTransientSection.InitialHeading)/sectionLengthRightTransient;
                rightTransientSection.PathAvergaedSlope = pathAveragedSlopeForRightTransientSection;
				rightTransientSection.OptimizedInitialHeading = trueCurveSection.OptimizedInitialHeading + (trueCurveSection.OptimizedPathAvergaedSlope * sectionLength);
                let OptimizedpathAveragedSlopeForRightTransientSection = (currentStraightSection.OptimizedPathAveragedHeading-rightTransientSection.OptimizedInitialHeading)/sectionLengthRightTransient;
                rightTransientSection.OptimizedPathAvergaedSlope = OptimizedpathAveragedSlopeForRightTransientSection;
				
				//OptimizeTransientSection(rightTransientSection);
				this.AddSectionMetaData(rightTransientSection);
				// let sameSign: Boolean;
				// if( sameSign= (rightTransientSection.PathAvergaedSlope * leftTransientSection.PathAvergaedSlope) < 0){
				// 	previousStraightSection.EndIndex = currentStraightSection.EndIndex;
				// 	this.StraightSections[i] = previousStraightSection;
				// 	this.AddSectionMetaData(this.StraightSections[i]);
					
				// 	continue;
				// }

				
				this.AllSections.push(leftTransientSection);
				//if(takeTrueCurveSection){
					this.AllSections.push(trueCurveSection);//}
				this.AllSections.push(rightTransientSection);
				this.AllSections.push(currentStraightSection);
				//this.StraightSections[i] = currentStraightSection;
				
			}
			
			

			// create section meta data of bounding boxes.
			this.AllSections.forEach(section => {
				try {
					CalculateRectangleOfSection(section);
				}
				catch(e)
				{
					var s=10
				}
				
			});
		}

		private AddSectionMetaData(section : Section) 
		{
			section.StartLatitude = this.Latitudes[section.StartIndex];
			section.StartLongitude = this.Longitudes[section.StartIndex];
			section.EndLatitude = this.Latitudes[section.EndIndex];
			section.EndLongitude = this.Longitudes[section.EndIndex];

			// Also calculate the total length (accumulative distance) of section
			section.TotalSectionLength = this.AccumulativeDistances[section.EndIndex] - this.AccumulativeDistances[section.StartIndex];
			section.AccumulativeDistanceAtStart = this.AccumulativeDistances[section.StartIndex];

			// rectangles start 1 point after the actual section starts and end 1 point before the actual section ends
			section.RectangleStartLatitude = this.Latitudes[section.StartIndex + 1];
			section.RectangleStartLongitude = this.Longitudes[section.StartIndex + 1];
			section.RectangleEndLatitude = this.Latitudes[section.EndIndex - 1];
			section.RectangleEndLongitude = this.Longitudes[section.EndIndex - 1];

			// if we have a curved or transient section then we need the mid-point of the section too but for now we will calculate the midpoint for all sections
			var midpoint = section.StartIndex + Math.floor((section.EndIndex - section.StartIndex)/2);
			section.MidLatitude = this.Latitudes[midpoint];
			section.MidLongitude = this.Longitudes[midpoint];
		}
	}