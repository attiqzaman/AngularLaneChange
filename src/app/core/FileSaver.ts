import { ProcessedRouteWrapper } from "./ProcessedRouteWrapper";
import { saveAs } from 'file-saver';
import {formatDate} from '@angular/common';

export function PrintRoute(route: ProcessedRouteWrapper)
{
	var fileName = `${route.UserId}_Google_${route.SortedSnapshots}.csv`;
	// saveAs("test", "filename");
	let currentTime = formatDate(new Date, '"MM_dd__hh_mm', 'en-US');

	fileName = `${route.UserId}_${route.SampleRate}_${route.CutOffFrequency}_${currentTime}.csv`;

	let allRows: string[] = [];
	allRows.push(`Lat, long, distance, accumulated distance, heading, lowPass heading (${route.SampleRate}-${route.CutOffFrequency}), heading_9`);
	for (let index = 1; index < route.Distances.length; index++) {
		allRows.push(`${route.Latitudes[index]}, ${route.Longitudes[index]},` +
		`${route.Distances[index]}, ${route.AccumulativeDistances[index]},` +
		`${route.OutHeadings[index]}, ${route.SmoothedHeading[index]}, ${route.AverageHeadings[index]}`)
	}

	// var blob = new Blob(allRows, {type: 'text/csv' })
	// saveAs(blob, fileName);

	// var blob = new Blob([JSON.stringify(allRows)], {type: 'text/csv' })
	// saveAs(blob, fileName);

	// var blob = new Blob(allRows.join(), {type: 'text/csv' })
	// saveAs(blob, fileName);

	const data: Blob = new Blob([allRows.join('\n')],  {type: 'text/csv'});
    saveAs(data, fileName);
}


// function exportToCsv(rows: object[], fileName: string, columns?: string[]) {
//     if (!rows || !rows.length) {
//       return;
//     }

//     const separator = ',';
//     const keys = Object.keys(rows[0]).filter(k => {
//       if (columns?.length) {
//         return columns.includes(k);
//       } else {
//         return true;
//       }
//     });
//     const csvContent =
//       keys.join(separator) +
//       '\n' +
//       rows.map(row => {
//         return keys.map(k => {
//           let cell = row[k] === null || row[k] === undefined ? '' : row[k];
//           cell = cell instanceof Date
//             ? cell.toLocaleString()
//             : cell.toString().replace(/"/g, '""');
//           if (cell.search(/("|,|\n)/g) >= 0) {
//             cell = `"${cell}"`;
//           }
//           return cell;
//         }).join(separator);
//       }).join('\n');

//     saveAsFile(csvContent, `${fileName}`, 'text/csv');
//   }

//   function saveAsFile(buffer: any, fileName: string, fileType: string): void {
//     const data: Blob = new Blob([buffer], { type: fileType });
//     saveAs(data, fileName);
//   }
