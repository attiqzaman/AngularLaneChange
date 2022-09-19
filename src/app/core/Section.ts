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
		this.RectangleStartLatitude = NaN;
		this.RectangleStartLongitude = NaN;
		this.RectangleEndLatitude = NaN;
		this.RectangleEndLongitude = NaN;
		this.MidLatitude = NaN;
		this.MidLongitude = NaN;
		this.PerpendicularDistanceToMidPoint = NaN;
	}

	getSectionLength()
	{
		return this.EndIndex - this.StartIndex;
	}

	StartIndex: number;
	EndIndex: number;
	StartLatitude: number;
    StartLongitude: number;
	MidLatitude: number;
    MidLongitude: number;
	RectangleStartLatitude: number;
    RectangleStartLongitude: number;
	EndLatitude: number;
    EndLongitude: number;
	RectangleEndLatitude: number;
    RectangleEndLongitude: number;
	SectionType: SectionType;
	PathAveragedHeading: number;
	PathAvergaedSlope: number;
	InitialHeading: number;
	PerpendicularDistanceToMidPoint: number;

	OptimizedPathAveragedHeading: number;
	OptimizedPathAvergaedSlope: number;
	OptimizedInitialHeading: number;

	MaxHeadingInSection: number;
	MinHeadingInSection: number;

	TotalSectionLength: number;
	AccumulativeDistanceAtStart: number;
	SectionRectangle?: SectionRectangle;
}

export interface SectionRectangle {
	StartMaxLatitude: number;
	StartMaxLongitude: number;
	
	StartMinLatitude: number;
	StartMinLongitude: number;

	EndMaxLatitude: number;
	EndMaxLongitude: number;
	
	EndMinLatitude: number;
	EndMinLongitude: number;
}

export enum SectionType {
	Straight = 'Straight',
	Curved = 'Curved',
	Transient = 'Transient',
	Unknown = 'Unknown'
}