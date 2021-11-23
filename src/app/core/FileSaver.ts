import { ProcessedRouteWrapper } from "./ProcessedRouteWrapper";
import { saveAs } from 'file-saver';
import {formatDate} from '@angular/common';

export function PrintRoute(route: ProcessedRouteWrapper)
{
	var fileName = `${route.UserId}_Google_${route.SortedSnapshots}.csv`;
	let currentTime = formatDate(new Date, '"MM_dd__hh_mm', 'en-US');

	fileName = `${route.UserId}_${route.cutOffFrequency1}_${route.cutOffFrequency2}_${currentTime}.csv`;

	let allRows: string[] = [];
	allRows.push(`Lat, long, distance, accumulated distance, heading, lowPass heading, heading_9`);
	for (let index = 1; index < route.Distances.length; index++) {
		allRows.push(`${route.Latitudes[index]}, ${route.Longitudes[index]},` +
		`${route.Distances[index]}, ${route.AccumulativeDistances[index]},` +
		`${route.OutHeadings[index]}, ${route.SmoothedHeading[index]}, ${route.AverageHeadings[index]}`)
	}

	const data: Blob = new Blob([allRows.join('\n')],  {type: 'text/csv'});
    saveAs(data, fileName);
}
