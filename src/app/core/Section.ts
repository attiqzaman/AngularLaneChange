export class Section {
	constructor(startIndex: number, endIndex: number, sectionType: SectionType) 
	{
		this.StartIndex = startIndex;
		this.EndIndex = endIndex;
		this.SectionType = sectionType;
		this.PathAveragedHeading = NaN;
		this.PathAvergaedSlope = NaN;
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
}

export enum SectionType {
	Straight = 'Straight',
	Curved = 'Curved',
	Transient = 'Transient',
	Unknown = 'Unknown'
}