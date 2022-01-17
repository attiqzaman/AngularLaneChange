export class Section {
	constructor(startIndex: number, endIndex: number, sectionType: SectionType) 
	{
		this.StartIndex = startIndex;
		this.EndIndex = endIndex;
		this.SectionType = sectionType;
		this.PathAveragedHeading = NaN;
		this.PathAvergaedSlope = NaN;
		this.InitialHeading = NaN;
		this.OptimizedPathAveragedHeading = NaN;
		this.OptimizedPathAvergaedSlope = NaN;
		this.OptimizedInitialHeading = NaN;
	}

	getSectionLength()
	{
		return this.EndIndex - this.StartIndex;
	}

	StartIndex: number;
	EndIndex: number;
	SectionType: SectionType;
	PathAveragedHeading: number;
	PathAvergaedSlope: number;
	InitialHeading: number;

	OptimizedPathAveragedHeading: number;
	OptimizedPathAvergaedSlope: number;
	OptimizedInitialHeading: number;
}

export enum SectionType {
	Straight = 'Straight',
	Curved = 'Curved',
	Transient = 'Transient',
	Unknown = 'Unknown'
}