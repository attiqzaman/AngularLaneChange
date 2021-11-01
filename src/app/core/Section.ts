export class Section {
    constructor(startIndex: number, endIndex: number, sectionType: string) 
    {
        this.StartIndex = startIndex;
        this.EndIndex = endIndex;
        this.SectionType = sectionType;
    }

    StartIndex: number;

    EndIndex: number;

    SectionType: string;
}