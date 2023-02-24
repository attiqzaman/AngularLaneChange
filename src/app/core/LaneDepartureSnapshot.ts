export class LaneDepartureSnapshot {
	Latitude: number;
    Longitude: number;
	SnapshotNumber: number;
	TimeStamp: Date;
	SecondsFromStart: number;
    Distance: number = 0;
	Heading: number = 0;
	AveragedHeading: number = 0;
	AccumulativeDistance: number = 0;

	// section: LaneDepartureSnapshot | undefined = undefined;
	RefrenceHeading: number = 0;
    OptimizedRefrenceHeading: number = 0;
	DistanceFromStartOfSection: number = 0;
	Theta: number = 0;
	LateralDistance: number = 0;
	AverageLateralDistance: number = 0;
	AccumulativeLateralDistance: number = 0;
	AccumulativeAverageLateralDistance: number = 0;
	AbsoluteLateralDistance: number = 0;
	AbsoluteAccumulativeLateralDistance: number = 0;
	Alarm: boolean = false;
	Mask: number = 0; // used for graphing where alarm occured.
	StartOfAlarm: boolean = false;
	SectionStartIndex: number = -1; // Should use SectionId instead.
	IsFirstPointInSection: boolean = false;
	SectionInfo: string = 'Undefined';
	SectionType: string ='Undefined';

	// The following shouldn't be here since they are part of a section object, but added here for now for easy debugging.
	PerpendicularDistanceToMidPoint: number = NaN; 
	PathAvergaedSlope: number = NaN;
	OptimizedPathAvergaedSlope: number = NaN;
	InitialHeading: number = NaN;
	OptimizedInitialHeading: number = NaN;
	PathAveragedHeading: number = NaN;
	OptimizedPathAveragedHeading: number = NaN;
	closestStart: number=NaN;
	closestEnd: number=NaN;
	dist2StartofAllsections: number = NaN;
	dist2EndofAllsections: number = NaN;
	dist: number = NaN;
	point: number = NaN;
	section: number = NaN;
	sum: number = NaN;
	firstSnapshotIndex: number = NaN;
	secondSnapshotIndex: number = NaN;
	firstSectionIndex: number = NaN;
	secondSectionIndex: number =  NaN;
	


    constructor(Latitude: number, Longitude: number, snapshotNumber: number, timeStamp: string, startTime: Date) 
    {        
        this.Latitude = Latitude;
        this.Longitude = Longitude;
		this.SnapshotNumber = snapshotNumber;
		this.TimeStamp = new Date(timeStamp);
		this.SecondsFromStart = (this.TimeStamp.getTime() - startTime.getTime()) / 1000;
    }    
}
