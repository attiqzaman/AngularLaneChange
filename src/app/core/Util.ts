import { Section } from "./Section";
import { Snapshot } from "./Snapshot";
var dsp = require('digitalsignals');

export function AreSnapshotsOnSamePoint(a:Snapshot, b: Snapshot, useGooglePoints: boolean) : boolean {
    // return useGooglePoints ?
	// 			a.GoogleLatitude == b.GoogleLatitude && a.GoogleLongitude == b.GoogleLongitude :
	// 			a.Latitude == b.Latitude && a.Longitude == b.Longitude;

    return a.GoogleLatitude == b.GoogleLatitude && a.GoogleLongitude == b.GoogleLongitude;
    // a.Latitude == b.Latitude && a.Longitude == b.Longitude;
}


export function CalculatePathAveragedValue(
    start: number,
    end: number,
    sourceData: number[],
    distances: number[],
    accumulativeDistances: number[]): number
{
    let sumOfDifferenceOfSourceParameter: number[] = []
    sumOfDifferenceOfSourceParameter.push(0);

    let pathAveragedValue: number = 0;
    for (let i = start; i <= end; i++)
    {
        let currentValue = sourceData[i] * distances[i];
        sumOfDifferenceOfSourceParameter.push(currentValue + sumOfDifferenceOfSourceParameter[i - 1]);

        // This could just calculate pathAverageValue at the end but for now I am trying to keep
        // things somewhat similar to original until we know the code has been translated successfully.
        let currentAccumulativeDistanceFromStart = accumulativeDistances[i] - accumulativeDistances[start - 1];
        pathAveragedValue = sumOfDifferenceOfSourceParameter[i] / currentAccumulativeDistanceFromStart;
    }

    return pathAveragedValue;
}

// Not exactly sure what dh1 represents but its used in calculation of straight sections.
export function GetDH1 (differentialHeadings: number[]): number[]
{
    let limit1 = 0.08;
    let limit2 = 0.07;
    let limit3 = 0.09;
    let dh1: number[] = differentialHeadings;

    // We are updating array while looping over it?
    for (let i = 1; i < differentialHeadings.length; i++)
    {
        if (dh1[i] > limit1 && dh1[i + 1] < limit1 && dh1[i - 1] < limit1 )
        {
            dh1[i] = limit1;
        }
        else if (dh1[i] < -limit1 && dh1[i + 1] > -limit1 && dh1[i - 1] > -limit1)
        {
            dh1[i] = -limit1;
        }
        else if (dh1[i] < limit1 && dh1[i + 1] > limit1 && dh1[i - 1] > limit1)
        {
            dh1[i] = limit3;
        }
        else if ((dh1[i] > -limit1 && dh1[i + 1] < -limit1 && dh1[i - 1] < -limit1))
        {
            dh1[i] = -limit3;
        }
        else if (dh1[i] > limit1 && dh1[i + 1] > limit1 && dh1[i + 2] > limit1 && dh1[i + 3] < limit1 && dh1[i - 1] < limit1 && dh1[i - 2] < limit1)
        {
            dh1[i] = limit2;
            dh1[i + 1] = limit2;
            dh1[i + 2] = limit2;
        }
        else if (dh1[i] > limit1 && dh1[i + 1] > limit1 && dh1[i + 2] < limit1 && dh1[i + 3] < limit1 && dh1[i - 1] < limit1)
        {
            dh1[i] = limit2;
            dh1[i + 1] = limit2;
        }
        else if (dh1[i] < -limit1 && dh1[i + 1] < -limit1 && dh1[i + 2] < -limit1 && dh1[i + 3] < -limit1 && dh1[i + 4] > -limit1 && dh1[i - 1] > -limit1 && dh1[i - 2] > -limit1)
        {
            dh1[i] = -limit2;
            dh1[i + 1] = -limit2;
            dh1[i + 2] = -limit2;
        }
        //for N2_RL
        else if (dh1[i] < limit1 && dh1[i - 1] > limit1 && dh1[i - 2] > limit1 && dh1[i - 3] > limit1 && dh1[i - 4] > limit1 && dh1[i - 5] > limit1 && dh1[i - 6] > limit1 && dh1[i - 7] > limit1 && dh1[i - 8] < limit1 && dh1[i + 1] < limit1)
        {
            dh1[i - 1] = limit2;
            dh1[i - 2] = limit2;
            dh1[i - 3] = limit2;
            dh1[i - 4] = limit2;
        }
        else
        {
            dh1[i] = dh1[i]; // hopefully just an oversight.
        }
    }

    return dh1;
}

// This returns a dictionary where each kvp represent a straight section, values are indices of the differential heading array. 
export function GetStraightSections(dh1: number[]): {}
{
    let sections: Section[] = [];
    // let sections: { [startPoint: string]: number } = {};
    // let startSections: number[];
    // let endSections: number[];

    // We don't know if we started in a curve (meaning we will hit start point of a section first) or we
    // already started in a straight section (meaning we will first hit end of straight section) so we need to
    // first determine that, we will loop through the differential headings looking for both start and end of straight section, 
    // depending on what we find first we will process the rest of the array accordingly.
    let i = 6;
    let startIndex: number;
    let endIndex: number;
    while (i < dh1.length)
    {
        if (IsStartOfStraightSection(i, dh1))
        {
            // We started in a curver.
            startIndex = i;
            endIndex = FindEndOfStraightSection(i, dh1);
            sections.push(CreateStraightSection(startIndex, endIndex));
            // endSections.push(endIndex);
            // sections.Add(startIndex, endIndex);
            i = endIndex; // should this be endIndex + 1?
        }
        else if (IsEndOfStraightSection(i, dh1))
        {
            // We started in a straight section, so assume start of straight section was the first data point.
            startIndex = 0;
            endIndex = i;
            sections.push(CreateStraightSection(startIndex, endIndex));
            // startSections.push(startIndex);
            // endSections.push(endIndex);
            i = endIndex; // should this be endIndex + 1?
        }
        else
        {
            i++;
        }
    }

    if (sections.length > 0)
    {
        while (i < dh1.length)
        {
            startIndex = FindStartOfStraightSection(i, dh1);
            if (startIndex != -1)
            {
                endIndex = FindEndOfStraightSection(i, dh1);
                sections.push(CreateStraightSection(startIndex, endIndex));
                // startSections.push(startIndex);
                // endSections.push(endIndex);
                i = endIndex; // should this be endIndex + 1?
            }
        }

    }
    else
    {
        // we just were in a curve throughout the route.
        // TODO: Handle the curve
    }

    return sections;
}

export function ConvertLatLngToSnapshots(points: google.maps.LatLng[]): Snapshot[] {
    let allSnapshots: Snapshot[] = [];
    points.forEach(point => {
        allSnapshots.push(new Snapshot(point.lat(), point.lng()));
    });


    return allSnapshots;
}

export function ApplySmoothingfilter(input: number[]): number[] {
    var clonedInput  = [...input];
    console.log(`input: ${input}`);

    // low-pass-filter
    const lowPassFilter = require('low-pass-filter').lowPassFilter;
    lowPassFilter(clonedInput, 200, 44100, 1);
    console.log(`low-pass-filter: ${clonedInput}`);
    
    var clonedInput  = [...input];

    // dsp.js
    var filter = new dsp.IIRFilter(dsp.LOWPASS, 200, 1, 44100);
    filter.process(clonedInput);
    console.log(`dsp.js: ${clonedInput}`);

    return clonedInput;
}

function FindStartOfStraightSection(start: number, dh1: number[])
{
    for (let i = start; i < dh1.length - 6; i++)
    {
        if (IsStartOfStraightSection(i, dh1))
        {
            return i;
        }
    }

    return -1;
}

function FindEndOfStraightSection(start: number, dh1: number[])
{
    for (let i = start; i < dh1.length - 6; i++)
    {
        if (IsEndOfStraightSection(i, dh1))
        {
            return i;
        }
    }

    return dh1.length - 1;
}

function IsStartOfStraightSection(index: number, dh1: number[]): boolean
{
    var limit1 = 0.08;
    // This kind of things can be made simpler/faster by applying a matrix filter
    if ((Math.abs(dh1[index - 6]) > limit1) && (Math.abs(dh1[index - 5]) > limit1) && (Math.abs(dh1[index - 4]) > limit1) &&
        (Math.abs(dh1[index - 3]) > limit1) && (Math.abs(dh1[index - 2]) > limit1) && (Math.abs(dh1[index - 1]) > limit1) &&
        (Math.abs(dh1[index]) <= limit1) &&
        (Math.abs(dh1[index + 1]) <= limit1) && (Math.abs(dh1[index + 2]) <= limit1) &&
        (Math.abs(dh1[index + 3]) <= limit1) && (Math.abs(dh1[index + 4]) <= limit1) && (Math.abs(dh1[index + 5]) <= limit1) &&
        (Math.abs(dh1[index + 6]) <= limit1))

    {
        return true;
    }

    return false;
}

function IsEndOfStraightSection(index: number, dh1: number[]): boolean
{
    var limit1 = 0.08;
    // This kind of things can be made simpler/faster by applying a matrix filter
    if ((Math.abs(dh1[index - 6]) <= limit1) && (Math.abs(dh1[index - 5]) <= limit1) && (Math.abs(dh1[index - 4]) <= limit1) && (Math.abs(dh1[index - 3]) <= limit1) &&
            (Math.abs(dh1[index - 2]) <= limit1) && (Math.abs(dh1[index - 1]) <= limit1) &&
            (Math.abs(dh1[index]) >= limit1) && (Math.abs(dh1[index + 1]) > limit1) && (Math.abs(dh1[index + 2]) > limit1) &&
            (Math.abs(dh1[index + 3]) > limit1) && (Math.abs(dh1[index + 4]) > limit1) && (Math.abs(dh1[index + 5]) > limit1) && (Math.abs(dh1[index + 6]) > limit1))

    {
        return true;
    }

    return false;
}

function CreateStraightSection(startIndex: number, endIndex: number): Section
{
    return new Section(startIndex, endIndex, "Straight");
}
