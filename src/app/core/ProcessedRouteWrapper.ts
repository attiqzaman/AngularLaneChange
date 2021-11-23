
    /**A wrapper to keep all list of double arrays needed to generate road sections. */

import { Snapshot } from "./Snapshot";
import { ApplySmoothingfilter, AreSnapshotsOnSamePoint, GetDH1, GetStraightSections } from "./Util";
import { headingDistanceTo } from 'geolocation-utils'

    // TODO: Clean this once we have finalized the implementation.


    export class ProcessedRouteWrapper {
		UserId: string;
		RouteId: string;
		SortedSnapshots: Snapshot[];

        Distances: number[] = [];
		Latitudes: number[] = [];
		Longitudes: number[] = [];
		SmoothedHeading: number[] = [];
		// SmoothedLongitudes: number[] = [];
		OutHeadings: number[] = [];
		Slopes: number[] = [];
		Accuracies: number[] = [];
		AccumulativeDistances: number[] = [];
		AverageHeadings: number[] = [];
		DifferentialHeadings: number[] = [];
		cutOffFrequency2: number;
		cutOffFrequency1: number;

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
					let slope = (this.OutHeadings[index] - this.OutHeadings[index - 1]) / this.Distances[index];
					this.Slopes.push(slope);
					this.Accuracies.push(currentSnapshot.Accuracy);
					this.AccumulativeDistances.push(this.Distances[index] + this.AccumulativeDistances[index - 1]);
				}
			}

			this.AverageHeadings.push(0);
			this.DifferentialHeadings.push(0);
			// var averageHeading5: number[]; this.AverageHeadings.push(0);
			// var differentialHeading5: number[]; this.AverageHeadings.push(0);
			// var averageHeading3: number[]; this.AverageHeadings.push(0);
			// var differentialHeading3: number[]; this.AverageHeadings.push(0);

			for (let i = 1; i < this.OutHeadings.length; i++)
			{
				if (i < 5 || i > this.OutHeadings.length - 6)
				{
					// They really want to see 0 instead in excel instead of just not showing the row or keeping the raw value.
					this.AverageHeadings.push(0);
				}
				else
				{
					this.AverageHeadings.push((this.OutHeadings[i - 4] + this.OutHeadings[i - 3] + this.OutHeadings[i - 2] + this.OutHeadings[i - 1] +
						this.OutHeadings[i] + this.OutHeadings[i + 1] + this.OutHeadings[i + 2] + this.OutHeadings[i + 3] + this.OutHeadings[i + 4]) / 9);
				}

				this.DifferentialHeadings.push(this.AverageHeadings[i] - this.AverageHeadings[i - 1]);

				// if (i < 3 || i > this.OutHeadings.Count - 4)
				// {
				// 	averageHeading5.Add(0);
				// }
				// else
				// {
				// 	averageHeading5.Add((this.OutHeadings[i - 2] + this.OutHeadings[i - 1] +
				// 		this.OutHeadings[i] + this.OutHeadings[i + 1] + this.OutHeadings[i + 2]) / 5);
				// }

				// differentialHeading5.Add(averageHeading5[i] - averageHeading5[i - 1]);

				// if (i < 2 || i > this.OutHeadings.Count - 3)
				// {
				// 	averageHeading3.Add(0);
				// }
				// else
				// {
				// 	averageHeading3.Add((this.OutHeadings[i - 1] + this.OutHeadings[i] + this.OutHeadings[i + 1]) / 3);
				// }

				// differentialHeading3.Add(averageHeading3[i] - averageHeading3[i - 1]);
			}

			this.SmoothedHeading = ApplySmoothingfilter(this.OutHeadings, this.cutOffFrequency1, this.cutOffFrequency2);

			// const dh1 = GetDH1(this.DifferentialHeadings);
			// const straightSections = GetStraightSections(dh1);

			// return (this.Latitudes, longitudes, this.Accuracies, this.Distances, this.OutHeadings, this.Slopes, this.AccumulativeDistances, this.AverageHeadings, this.DifferentialHeadings);
		}
	}