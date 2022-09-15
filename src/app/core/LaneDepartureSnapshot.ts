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
	AccumulativeLateralDistance: number = 0;
	AbsoluteLateralDistance: number = 0;
	AbsoluteAccumulativeLateralDistance: number = 0;
	Alarm: boolean = false;
	Mask: number = 0; // used for graphing where alarm occured.
	StartOfAlarm: boolean = false;
	SectionStartIndex: number = -1; // Should use SectionId instead.
	IsFirstPointInSection: boolean = false;
	SectionInfo: string = 'Undefined';


    constructor(Latitude: number, Longitude: number, snapshotNumber: number, timeStamp: string, startTime: Date) 
    {        
        this.Latitude = Latitude;
        this.Longitude = Longitude;
		this.SnapshotNumber = snapshotNumber;
		this.TimeStamp = new Date(timeStamp);
		this.SecondsFromStart = (this.TimeStamp.getTime() - startTime.getTime()) / 1000;
    }    
}
