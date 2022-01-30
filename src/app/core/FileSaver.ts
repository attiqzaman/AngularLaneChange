import { ProcessedRouteWrapper } from "./ProcessedRouteWrapper";
import { saveAs } from 'file-saver';
import { formatDate } from '@angular/common';
import { Section, SectionType } from "./Section";

export function PrintRoute(route: ProcessedRouteWrapper)
{
	var fileName = `${route.UserId}_Google_${route.SortedSnapshots}.csv`;
	let currentTime = formatDate(new Date, '"MM_dd__hh_mm', 'en-US');

	fileName = `${route.UserId}_${route.cutOffFrequency1}_${route.cutOffFrequency2}_${currentTime}.csv`;

	let allRows: string[] = [];
	allRows.push(`lat, long, distance, accumulated distance, raw heading, smoothed heading, 3*slope + prev_heading, opt 3*slope + prev_heading, section type, PAH/IH, optimized PAH/IH, PAHS, optimized PAHS`);
	for (let index = 1; index < route.Distances.length; index++) {
		
		let sectionDetails = getSectionDetailsInCsvFormat(index, route.AllSections, route.SmoothedHeading);

		allRows.push(`${route.Latitudes[index]}, ${route.Longitudes[index]},` +
		`${route.Distances[index]}, ${route.AccumulativeDistances[index]},` +
		`${route.OutHeadings[index]}, ${route.SmoothedHeading[index]}, ${sectionDetails}`)
	}

	const data: Blob = new Blob([allRows.join('\n')],  {type: 'text/csv'});
    saveAs(data, fileName);
}

function getSectionDetailsInCsvFormat(index: number, sections: Section[], headings: number[]): string {
	let section = getSection(sections, index);

	if (section === null) {
		return `NA, NA, NA, NA, NA, NA, NA`
	}

	if (section.SectionType === SectionType.Straight) {
		return `NA, NA, ${section.SectionType}, ${section.PathAveragedHeading}, ${section.OptimizedPathAveragedHeading}, NA, NA`
	}

	if (index === section.StartIndex) {
		let three_slope = headings[index - 1];
		let opt_three_slope = headings[index - 1];
		return `${three_slope}, ${opt_three_slope}, ${section.SectionType}, ${section.InitialHeading}, ${section.OptimizedInitialHeading}, ${section.PathAvergaedSlope}, ${section.OptimizedPathAvergaedSlope}`
	}

	let three_slope = 3*section.PathAvergaedSlope + headings[index - 1];
	let opt_three_slope = 3*section.OptimizedPathAvergaedSlope + headings[index - 1];
	return `${three_slope}, ${opt_three_slope}, ${section.SectionType}, ${section.InitialHeading}, ${section.OptimizedInitialHeading}, ${section.PathAvergaedSlope}, ${section.OptimizedPathAvergaedSlope}`
}

function getSection(allSections: Section[], index: number): Section|null {

	for (let i = 0; i < allSections.length; i++) {
		const section = allSections[i];
		
		if (index >= section.StartIndex && index < section.EndIndex) {
			return section;
		}
	}

	return null;
}