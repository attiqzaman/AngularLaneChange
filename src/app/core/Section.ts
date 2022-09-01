export class Section {
	constructor(startIndex: number, endIndex: number, sectionType: SectionType) 
	{
		this.StartIndex = startIndex;
		this.EndIndex = endIndex;
		this.SectionType = sectionType;
		this.StartLatitude = NaN;
        this.StartLongitude = NaN;
		this.EndLatitude = NaN;
        this.EndLongitude = NaN;
		this.PathAveragedHeading = NaN;
		this.PathAvergaedSlope = NaN;
		this.InitialHeading = NaN;
		this.OptimizedPathAveragedHeading = NaN;
		this.OptimizedPathAvergaedSlope = NaN;
		this.OptimizedInitialHeading = NaN;
		this.MaxHeadingInSection = NaN;
		this.MinHeadingInSection = NaN;
		this.TotalSectionLength = NaN;
		this.AccumulativeDistanceAtStart = NaN;
	}

	getSectionLength()
	{
		return this.EndIndex - this.StartIndex;
	}

	StartIndex: number;
	EndIndex: number;
	StartLatitude: number;
    StartLongitude: number;
	EndLatitude: number;
    EndLongitude: number;
	SectionType: SectionType;
	PathAveragedHeading: number;
	PathAvergaedSlope: number;
	InitialHeading: number;

	OptimizedPathAveragedHeading: number;
	OptimizedPathAvergaedSlope: number;
	OptimizedInitialHeading: number;

	MaxHeadingInSection: number;
	MinHeadingInSection: number;

	TotalSectionLength: number;
	AccumulativeDistanceAtStart: number;
}

export enum SectionType {
	Straight = 'Straight',
	Curved = 'Curved',
	Transient = 'Transient',
	Unknown = 'Unknown'
}